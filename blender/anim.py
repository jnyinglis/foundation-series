# Retargets Mixamo clips (FBX, downloaded "without skin") onto the MPFB character rig and
# exports them as one animation-only glTF: public/characters/anim.glb.
#
#   /Applications/Blender.app/Contents/MacOS/Blender -b --python blender/anim.py -- [reference.glb]
#
# The Mixamo rig rests in a T-pose and ours rests in an A-pose with different bone rolls, so the
# clips cannot be copied bone for bone. For each bone we take the Mixamo world-space rotation
# delta from its rest, pre-rotate our rest bone so it points the way the Mixamo bone does, and
# apply the delta on top. Hips translation is scaled by the ratio of hip heights so idles bob and
# sitting clips lower the body the right amount.
import bpy, os, sys, glob, re
from mathutils import Matrix, Quaternion, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANIM_DIR = os.path.join(ROOT, 'blender', 'anim')
OUT = os.path.join(ROOT, 'public', 'characters', 'anim.glb')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
REF = argv[0] if argv else os.path.join(ROOT, 'public', 'characters', 'ilen.glb')
STEP = 2  # keep every second frame: 15 fps is plenty for idles and halves the file
MAX_FRAMES = 420  # the long talking clips loop well enough after 14 s

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30

# ---------------------------------------------------------------- our rig
bpy.ops.import_scene.gltf(filepath=REF)
ours = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
ours.name = 'Rig'
for o in list(bpy.data.objects):
    if o.type == 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
ours.animation_data_clear()
for pb in ours.pose.bones:
    pb.matrix_basis = Matrix.Identity(4)
    pb.rotation_mode = 'QUATERNION'
bpy.context.view_layer.update()

def slug(name):
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')

def bone_dir(arm, b):
    """World-space unit vector along a rest bone."""
    return ((arm.matrix_world @ b.tail_local) - (arm.matrix_world @ b.head_local)).normalized()

def rest_world(arm, b):
    m = arm.matrix_world @ b.matrix_local
    return m

our_rest = {b.name: rest_world(ours, b) for b in ours.data.bones}
our_hip_h = (ours.matrix_world @ ours.data.bones['mixamorig:Hips'].head_local).z

def retarget(fbx_path, track_name):
    bpy.ops.import_scene.fbx(filepath=fbx_path, ignore_leaf_bones=True, automatic_bone_orientation=False)
    mix = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o is not ours)
    action = mix.animation_data.action
    f0, f1 = int(action.frame_range[0]), min(int(action.frame_range[1]), int(action.frame_range[0]) + MAX_FRAMES)
    mix_rest = {b.name: rest_world(mix, b) for b in mix.data.bones}
    mix_hip_h = (mix.matrix_world @ mix.data.bones['mixamorig:Hips'].head_local).z
    scale = our_hip_h / mix_hip_h if mix_hip_h else 1.0
    # per-bone alignment: rotate our rest bone direction onto the Mixamo rest bone direction
    align = {}
    for b in ours.data.bones:
        mb = mix.data.bones.get(b.name)
        if not mb:
            continue
        align[b.name] = bone_dir(ours, b).rotation_difference(bone_dir(mix, mb))
    new = bpy.data.actions.new(track_name)
    ours.animation_data_create()
    ours.animation_data.action = new
    order = [b for b in ours.data.bones]  # data.bones is parent-first
    for f in range(f0, f1 + 1, STEP):
        scene.frame_set(f)
        bpy.context.view_layer.update()
        pose_world = {}
        for b in order:
            pb = ours.pose.bones[b.name]
            mb = mix.pose.bones.get(b.name)
            if mb is None:
                target = (pose_world[b.parent.name] @ (our_rest[b.parent.name].inverted() @ our_rest[b.name])) if b.parent else our_rest[b.name]
            else:
                mix_now = (mix.matrix_world @ mb.matrix)
                delta = mix_now.to_quaternion() @ mix_rest[b.name].to_quaternion().inverted()
                rot = delta @ align[b.name] @ our_rest[b.name].to_quaternion()
                target = rot.to_matrix().to_4x4()
                if b.parent:
                    # keep our bone lengths: the head sits where the parent's pose puts it
                    head = pose_world[b.parent.name] @ (our_rest[b.parent.name].inverted() @ our_rest[b.name]).to_translation()
                else:
                    head = our_rest[b.name].to_translation() + (mix_now.to_translation() - mix_rest[b.name].to_translation()) * scale
                target.translation = head
            pose_world[b.name] = target
            # basis = (parent_pose @ parent_rest^-1 @ rest)^-1 @ target, all in armature space
            arm_target = ours.matrix_world.inverted() @ target
            if b.parent:
                parent_arm = ours.matrix_world.inverted() @ pose_world[b.parent.name]
                local_rest = ours.data.bones[b.parent.name].matrix_local.inverted() @ b.matrix_local
                basis = (parent_arm @ local_rest).inverted() @ arm_target
            else:
                basis = b.matrix_local.inverted() @ arm_target
            pb.rotation_quaternion = basis.to_quaternion()
            pb.keyframe_insert('rotation_quaternion', frame=f)
            if not b.parent:
                pb.location = basis.to_translation()
                pb.keyframe_insert('location', frame=f)
    # push to an NLA track so every clip exports as its own animation
    track = ours.animation_data.nla_tracks.new()
    track.name = track_name
    strip = track.strips.new(track_name, f0, new)
    strip.name = track_name
    ours.animation_data.action = None
    bpy.data.objects.remove(mix, do_unlink=True)
    for a in list(bpy.data.actions):
        if a is not new and a.users == 0:
            bpy.data.actions.remove(a)
    print(f'retargeted {track_name}: frames {f0}-{f1}, scale {scale:.3f}')

for path in sorted(glob.glob(os.path.join(ANIM_DIR, '*.fbx'))):
    retarget(path, slug(os.path.splitext(os.path.basename(path))[0]))

bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS',
    export_force_sampling=True, export_frame_step=STEP, export_optimize_animation_size=True,
    export_skins=False, export_materials='NONE', export_apply=False, export_yup=True,
)
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
