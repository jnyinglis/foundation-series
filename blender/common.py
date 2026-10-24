# Shared helpers for the headless Blender scene builders.
import bpy, math, os, random

STATIC = []    # baked, lit
GLOW = []      # exported with emission, not baked
COLLIDERS = [] # 2D boxes in Blender XY

def reset(fast):
    STATIC.clear(); GLOW.clear(); COLLIDERS.clear()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24 if fast else 96
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 6
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = 'GPU'
        print('bake device: GPU (Metal)')
    except Exception as e:  # noqa: BLE001
        print('GPU not available, using CPU:', e)
    scene.world = bpy.data.worlds.new('World')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.005, 0.01, 1)
    return scene

def material(name, color, rough=0.8, metal=0.0, grime=0.35, scale=6.0, brick=None, emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    if emit is not None:
        e = nt.nodes.new('ShaderNodeEmission')
        e.inputs['Color'].default_value = (*emit, 1)
        e.inputs['Strength'].default_value = emit_strength
        nt.links.new(e.outputs[0], out.inputs[0])
        return m
    p = nt.nodes.new('ShaderNodeBsdfPrincipled')
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    nt.links.new(p.outputs[0], out.inputs[0])
    tex = nt.nodes.new('ShaderNodeTexCoord')
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = scale
    noise.inputs['Detail'].default_value = 6.0
    nt.links.new(tex.outputs['Object'], noise.inputs['Vector'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (color[0] * (1 - grime), color[1] * (1 - grime), color[2] * (1 - grime), 1)
    ramp.color_ramp.elements[1].color = (*color, 1)
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    base = ramp.outputs['Color']
    if brick:
        b = nt.nodes.new('ShaderNodeTexBrick')
        b.inputs['Scale'].default_value = brick[0]
        b.inputs['Mortar Size'].default_value = brick[1]
        b.inputs['Color1'].default_value = (1, 1, 1, 1)
        b.inputs['Color2'].default_value = (0.85, 0.85, 0.85, 1)
        b.inputs['Mortar'].default_value = (0.15, 0.15, 0.15, 1)
        b.offset = 0.5
        nt.links.new(tex.outputs['Object'], b.inputs['Vector'])
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        nt.links.new(base, mix.inputs[6])
        nt.links.new(b.outputs['Color'], mix.inputs[7])
        base = mix.outputs[2]
    nt.links.new(base, p.inputs['Base Color'])
    rn = nt.nodes.new('ShaderNodeTexNoise')
    rn.inputs['Scale'].default_value = scale * 2.5
    nt.links.new(tex.outputs['Object'], rn.inputs['Vector'])
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = 0.3
    mr.inputs['From Max'].default_value = 0.7
    mr.inputs['To Min'].default_value = max(0.0, rough - 0.25)
    mr.inputs['To Max'].default_value = min(1.0, rough + 0.15)
    nt.links.new(rn.outputs['Fac'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], p.inputs['Roughness'])
    return m

def box(name, size, loc, mat, bevel=0.02, static=True, collide=False, pad=0.3, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = (size[0], size[1], size[2])
    o.rotation_euler = rot
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    if bevel > 0:
        b = o.modifiers.new('Bevel', 'BEVEL')
        b.width = bevel
        b.segments = 2
        b.limit_method = 'ANGLE'
    o.data.materials.append(mat)
    (STATIC if static else GLOW).append(o)
    if collide:
        COLLIDERS.append({'min': [loc[0] - size[0] / 2 - pad, loc[1] - size[1] / 2 - pad], 'max': [loc[0] + size[0] / 2 + pad, loc[1] + size[1] / 2 + pad]})
    return o

def cyl(name, r, h, loc, mat, static=True, verts=24, r2=None, rot=(0, 0, 0)):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    (STATIC if static else GLOW).append(o)
    return o

def area_light(loc, power, color=(1.0, 0.72, 0.45), size=0.7, rot=(0, 0, 0)):
    bpy.ops.object.light_add(type='AREA', location=loc)
    l = bpy.context.active_object
    l.data.energy = power
    l.data.color = color
    l.data.size = size
    l.rotation_euler = rot
    return l

def join(objs, name):
    for o in objs:
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    j = bpy.context.active_object
    j.name = name
    return j

def bake_object(scene, obj, size, filename, out):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')
    img = bpy.data.images.new(filename, size, size, float_buffer=False)
    for slot in obj.material_slots:
        nt = slot.material.node_tree
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = img
        nt.nodes.active = node
    scene.render.bake.use_pass_direct = True
    scene.render.bake.use_pass_indirect = True
    scene.render.bake.use_pass_color = True
    bpy.ops.object.bake(type='COMBINED', margin=6, use_clear=True)
    img.filepath_raw = os.path.join(os.path.abspath(out), f'{filename}.png')
    img.file_format = 'PNG'
    img.save()
    baked = bpy.data.materials.new(f'{filename}Baked')
    baked.use_nodes = True
    bt = baked.node_tree
    bt.nodes.clear()
    o = bt.nodes.new('ShaderNodeOutputMaterial')
    p = bt.nodes.new('ShaderNodeBsdfPrincipled')
    p.inputs['Roughness'].default_value = 1.0
    t = bt.nodes.new('ShaderNodeTexImage')
    t.image = img
    bt.links.new(t.outputs['Color'], p.inputs['Base Color'])
    bt.links.new(p.outputs[0], o.inputs[0])
    obj.data.materials.clear()
    obj.data.materials.append(baked)

def finish(scene, out, name, shell_prefixes, size_shell, size_furniture):
    """Joins, bakes and exports the scene. Returns nothing; writes <name>.glb."""
    shell_objs = [o for o in STATIC if o.name.startswith(shell_prefixes)]
    furn_objs = [o for o in STATIC if o not in shell_objs]
    shell = join(shell_objs, 'Shell')
    furniture = join(furn_objs, 'Furniture')
    bake_object(scene, shell, size_shell, f'{name}_shell', out)
    bake_object(scene, furniture, size_furniture, f'{name}_furniture', out)
    for l in [o for o in scene.objects if o.type == 'LIGHT']:
        bpy.data.objects.remove(l)
    os.makedirs(out, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(os.path.abspath(out), f'{name}.glb'), export_format='GLB', export_apply=True,
                              export_image_format='JPEG', export_jpeg_quality=88, export_yup=True)

def three(x, y, z):
    """Blender (x, y, z) -> Three (x, z, -y)."""
    return [round(x, 3), round(z, 3), round(-y, 3)]

def colliders_three():
    return [{'min': [round(c['min'][0], 3), 0, round(-c['max'][1], 3)], 'max': [round(c['max'][0], 3), 2.0, round(-c['min'][1], 3)]} for c in COLLIDERS]

def fig(name, bx, by, yaw_deg=0, seated=False, face=None):
    if face is not None:
        tx, ty = face
        yaw = math.atan2(tx - bx, -(ty - by))
    else:
        yaw = math.radians(yaw_deg)
    return {'name': name, 'pos': three(bx, by, 0.12 if seated else 0.0), 'yaw': round(yaw, 4), 'seated': seated}
