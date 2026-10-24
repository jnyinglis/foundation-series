# Builds the Twilight City cantina in Blender, bakes the lighting, and exports
# public/scenes/cantina.glb plus cantina.json (colliders and placements).
# Run headless:  npm run scene:cantina        (add -- --fast for a quick preview bake)
import bpy, bmesh, math, json, os, sys, random

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24 if FAST else 96
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

# Blender axes: X right, Y depth (window at +Y, door at -Y), Z up.
W, H, D = 22.0, 5.5, 16.0

# ---------------------------------------------------------------- materials
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
        # mortar lines are rougher and not metallic
        nt.links.new(b.outputs['Fac'], p.inputs['Roughness']) if False else None
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

M_FLOOR = material('Floor', (0.16, 0.17, 0.2), rough=0.5, metal=0.6, grime=0.5, scale=3.0, brick=(0.9, 0.02))
M_WALL = material('Wall', (0.36, 0.3, 0.26), rough=0.95, grime=0.45, scale=2.0, brick=(0.35, 0.03))
M_CEIL = material('Ceiling', (0.08, 0.085, 0.1), rough=0.8, metal=0.3, grime=0.3, scale=4.0)
M_STEEL = material('Steel', (0.42, 0.44, 0.48), rough=0.35, metal=0.9, grime=0.3, scale=8.0)
M_DARK = material('DarkMetal', (0.08, 0.085, 0.1), rough=0.6, metal=0.6, grime=0.3, scale=8.0)
M_WOOD = material('Wood', (0.32, 0.2, 0.12), rough=0.7, grime=0.4, scale=10.0)
M_LEATHER = material('Leather', (0.3, 0.14, 0.09), rough=0.8, grime=0.3, scale=12.0)
M_PIPE = material('Pipe', (0.2, 0.17, 0.14), rough=0.5, metal=0.8, grime=0.5, scale=14.0)
M_LAMP = material('Lamp', (1.0, 0.72, 0.4), emit=(1.0, 0.68, 0.38), emit_strength=8.0)
M_CYAN = material('CyanStrip', (0.3, 0.8, 1.0), emit=(0.25, 0.8, 1.0), emit_strength=6.0)
M_BOTTLES = [material(f'Bottle{i}', c, emit=c, emit_strength=2.5) for i, c in enumerate([(0.25, 0.8, 1.0), (1.0, 0.75, 0.3), (0.5, 1.0, 0.7), (1.0, 0.4, 0.4)])]

# window: twilight gradient, emits light into the room
M_WINDOW = bpy.data.materials.new('Window')
M_WINDOW.use_nodes = True
nt = M_WINDOW.node_tree
nt.nodes.clear()
wout = nt.nodes.new('ShaderNodeOutputMaterial')
wem = nt.nodes.new('ShaderNodeEmission')
wem.inputs['Strength'].default_value = 2.5
wtex = nt.nodes.new('ShaderNodeTexCoord')
wgrad = nt.nodes.new('ShaderNodeTexGradient')
wmap = nt.nodes.new('ShaderNodeMapping')
nt.links.new(wtex.outputs['UV'], wmap.inputs['Vector'])
nt.links.new(wmap.outputs['Vector'], wgrad.inputs['Vector'])
wramp = nt.nodes.new('ShaderNodeValToRGB')
wramp.color_ramp.elements[0].color = (0.35, 0.55, 0.85, 1)
wramp.color_ramp.elements[1].color = (1.0, 0.5, 0.2, 1)
e = wramp.color_ramp.elements.new(0.5)
e.color = (0.7, 0.55, 0.5, 1)
nt.links.new(wgrad.outputs['Fac'], wramp.inputs['Fac'])
nt.links.new(wramp.outputs['Color'], wem.inputs['Color'])
nt.links.new(wem.outputs[0], wout.inputs[0])

# ---------------------------------------------------------------- geometry helpers
STATIC = []   # baked, lit
GLOW = []     # exported with emission, not baked
COLLIDERS = []

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

def cyl(name, r, h, loc, mat, static=True, verts=24, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(mat)
    (STATIC if static else GLOW).append(o)
    return o

def area_light(loc, power, color=(1.0, 0.72, 0.45), size=0.7):
    bpy.ops.object.light_add(type='AREA', location=loc)
    l = bpy.context.active_object
    l.data.energy = power
    l.data.color = color
    l.data.size = size
    l.rotation_euler = (0, 0, 0)
    return l

# ---------------------------------------------------------------- the room
box('Floor', (W, D, 0.2), (0, 0, -0.1), M_FLOOR, bevel=0)
box('Ceiling', (W, D, 0.3), (0, 0, H + 0.15), M_CEIL, bevel=0)
box('WallWest', (0.4, D, H), (-W / 2, 0, H / 2), M_WALL, bevel=0.05)
box('WallEast', (0.4, D, H), (W / 2, 0, H / 2), M_WALL, bevel=0.05)
# front wall with door gap (door at -Y)
box('WallFrontL', (W / 2 - 1.3, 0.4, H), (-W / 4 - 0.65, -D / 2, H / 2), M_WALL, bevel=0.05)
box('WallFrontR', (W / 2 - 1.3, 0.4, H), (W / 4 + 0.65, -D / 2, H / 2), M_WALL, bevel=0.05)
box('DoorLintel', (2.6, 0.4, 1.3), (0, -D / 2, H - 0.65), M_WALL, bevel=0.05)
box('DoorPostL', (0.18, 0.5, 4.2), (-1.3, -D / 2, 2.1), M_STEEL)
box('DoorPostR', (0.18, 0.5, 4.2), (1.3, -D / 2, 2.1), M_STEEL)
# back wall: a frame around the big window at +Y
box('WindowSill', (W, 0.5, 1.0), (0, D / 2, 0.5), M_WALL, bevel=0.05)
box('WindowHead', (W, 0.5, 0.7), (0, D / 2, H - 0.35), M_WALL, bevel=0.05)
box('WindowPostL', (1.2, 0.5, H), (-W / 2 + 0.6, D / 2, H / 2), M_WALL, bevel=0.05)
box('WindowPostR', (1.2, 0.5, H), (W / 2 - 0.6, D / 2, H / 2), M_WALL, bevel=0.05)
for x in (-7.0, 0.0, 7.0):
    box(f'Mullion{x}', (0.16, 0.3, H - 1.7), (x, D / 2 - 0.05, 1.0 + (H - 1.7) / 2), M_STEEL)
box('WindowRail', (W - 2.4, 0.3, 0.12), (0, D / 2 - 0.05, 2.6), M_STEEL)
win = box('WindowGlass', (W - 2.4, 0.05, H - 1.7), (0, D / 2 + 0.1, 1.0 + (H - 1.7) / 2), M_WINDOW, bevel=0, static=False)
# wall panels and skirting
for i in range(-4, 5):
    box(f'PanelW{i}', (0.08, 1.6, 2.2), (-W / 2 + 0.24, i * 1.75, 1.4), M_DARK)
    box(f'PanelE{i}', (0.08, 1.6, 2.2), (W / 2 - 0.24, i * 1.75, 1.4), M_DARK) if i < -1 or i > 3 else None
box('SkirtW', (0.12, D, 0.3), (-W / 2 + 0.26, 0, 0.15), M_STEEL)
box('SkirtE', (0.12, D, 0.3), (W / 2 - 0.26, 0, 0.15), M_STEEL)
# ceiling beams, pipes, lamps and their lights
for i in range(-2, 3):
    y = i * 3.2
    box(f'Beam{i}', (W, 0.45, 0.4), (0, y, H - 0.25), M_STEEL, bevel=0.03)
    for x in (-6.5, 0.0, 6.5):
        box(f'LampHousing{i}{x}', (0.9, 0.9, 0.16), (x, y, H - 0.55), M_DARK)
        box(f'Lamp{i}{x}', (0.7, 0.7, 0.06), (x, y, H - 0.64), M_LAMP, bevel=0, static=False)
        area_light((x, y, H - 0.7), 110)
for k, x in enumerate((-9.5, -3.2, 3.2, 9.5)):
    cyl(f'Pipe{k}', 0.14, D, (x, 0, H - 0.6), M_PIPE, verts=16)
    cyl(f'Pipe{k}b', 0.08, D, (x + 0.35, 0, H - 0.75), M_PIPE, verts=12)
for k in range(4):
    cyl(f'PipeDrop{k}', 0.1, 2.2, (-W / 2 + 0.6, -6 + k * 4, H - 1.1), M_PIPE, verts=12)
# bar along the east wall
bx = W / 2 - 2.4
box('BarBody', (0.9, 10.0, 1.05), (bx, 1.0, 0.525), M_WOOD, bevel=0.03, collide=True)
box('BarTop', (1.15, 10.3, 0.07), (bx, 1.0, 1.085), M_STEEL, bevel=0.02)
box('BarKick', (0.06, 10.0, 0.08), (bx - 0.5, 1.0, 0.25), M_STEEL)
box('BarStrip', (0.03, 10.0, 0.03), (bx - 0.47, 1.0, 1.0), M_CYAN, bevel=0, static=False)
box('BackBar', (0.5, 10.2, 3.4), (W / 2 - 0.5, 1.0, 1.7), M_DARK, bevel=0.03, collide=True)
for s in range(3):
    box(f'Shelf{s}', (0.45, 9.8, 0.05), (W / 2 - 0.55, 1.0, 1.35 + s * 0.75), M_STEEL)
    box(f'ShelfLight{s}', (0.03, 9.6, 0.03), (W / 2 - 0.75, 1.0, 1.33 + s * 0.75), M_CYAN, bevel=0, static=False)
    for b in range(11):
        r = 0.045 + random.random() * 0.03
        cyl(f'Bottle{s}{b}', r, 0.28 + random.random() * 0.22, (W / 2 - 0.56, -3.6 + b * 0.9 + random.random() * 0.3, 1.38 + s * 0.75 + 0.2), M_BOTTLES[(s + b) % 4], static=False, verts=12)
for s in range(6):
    y = -3.5 + s * 1.8
    cyl(f'BarStoolSeat{s}', 0.26, 0.09, (bx - 1.2, y, 0.72), M_LEATHER)
    cyl(f'BarStoolLeg{s}', 0.05, 0.7, (bx - 1.2, y, 0.35), M_STEEL, verts=12)
    cyl(f'BarStoolFoot{s}', 0.22, 0.03, (bx - 1.2, y, 0.03), M_STEEL, verts=16)
# tables with stools and lamps
TABLES = [(-6.5, 3.0), (-6.5, -3.0), (-1.0, 4.0), (-1.0, -2.0), (4.0, -4.0)]
for t, (x, y) in enumerate(TABLES):
    cyl(f'TableTop{t}', 0.8, 0.07, (x, y, 0.96), M_STEEL, verts=32)
    cyl(f'TableRim{t}', 0.82, 0.03, (x, y, 0.95), M_DARK, verts=32)
    cyl(f'TableLeg{t}', 0.09, 0.9, (x, y, 0.47), M_DARK, verts=12, r2=0.32)
    box(f'TableLamp{t}', (0.26, 0.26, 0.06), (x, y, 1.03), M_LAMP, bevel=0, static=False)
    area_light((x, y, 1.2), 9, size=0.3)
    COLLIDERS.append({'min': [x - 1.1, y - 1.1], 'max': [x + 1.1, y + 1.1]})
    for a in (0.0, 2.1, 4.2):
        sx, sy = x + math.cos(a) * 1.3, y + math.sin(a) * 1.3
        cyl(f'Stool{t}{a}', 0.27, 0.09, (sx, sy, 0.62), M_LEATHER)
        cyl(f'StoolLeg{t}{a}', 0.05, 0.6, (sx, sy, 0.3), M_STEEL, verts=12)
# dockmaster desk by the door
box('Desk', (2.6, 0.9, 1.0), (-7.0, -6.2, 0.5), M_DARK, bevel=0.03, collide=True)
box('DeskTop', (2.8, 1.0, 0.06), (-7.0, -6.2, 1.03), M_STEEL)
box('DeskScreen', (0.6, 0.05, 0.4), (-7.0, -6.0, 1.35), M_CYAN, bevel=0, static=False, rot=(0.3, 0, 0))
# signage over the bar and the door
box('SignBar', (0.04, 3.0, 0.3), (W / 2 - 0.72, -4.2, 3.9), M_LAMP, bevel=0, static=False)
box('SignDoor', (2.0, 0.05, 0.25), (0, -D / 2 + 0.25, H - 1.5), M_CYAN, bevel=0, static=False)

# world: near black
scene.world = bpy.data.worlds.new('World')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.005, 0.01, 1)

# ---------------------------------------------------------------- bake
def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.modifier_apply(modifier='Bevel') if False else None
    for o in objs:
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

def bake_object(obj, size, filename):
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
    img.filepath_raw = os.path.join(os.path.abspath(OUT), f'{filename}.png')
    img.file_format = 'PNG'
    img.save()
    # replace materials with one that shows the bake
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

shell_objs = [o for o in STATIC if o.name.startswith(('Floor', 'Ceiling', 'Wall', 'Window', 'Door', 'Mullion', 'Panel', 'Skirt', 'Beam', 'Pipe', 'LampHousing'))]
furn_objs = [o for o in STATIC if o not in shell_objs]
shell = join(shell_objs, 'Shell')
furniture = join(furn_objs, 'Furniture')
bake_object(shell, 1024 if FAST else 2048, 'cantina_shell')
bake_object(furniture, 1024 if FAST else 2048, 'cantina_furniture')

# lamps and lights are not exported; emissive meshes keep their emission
for l in [o for o in scene.objects if o.type == 'LIGHT']:
    bpy.data.objects.remove(l)

# ---------------------------------------------------------------- export
os.makedirs(OUT, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(os.path.abspath(OUT), 'cantina.glb'), export_format='GLB', export_apply=True,
                          export_image_format='JPEG', export_jpeg_quality=88, export_yup=True)

def three(x, y, z):  # Blender (x, y, z) -> Three (x, z, -y)
    return [round(x, 3), round(z, 3), round(-y, 3)]

def fig(name, bx, by, yaw_deg, seated=False, face=None):
    # yaw is a Three rotation about Y. A seated figure faces its table.
    if face is not None:
        tx, ty = face
        yaw = math.atan2(tx - bx, -(ty - by))
    else:
        yaw = math.radians(yaw_deg)
    return {'name': name, 'pos': three(bx, by, 0.12 if seated else 0.0), 'yaw': round(yaw, 4), 'seated': seated}

def stool_at(t, a):
    x, y = TABLES[t]
    return x + math.cos(a) * 1.3, y + math.sin(a) * 1.3

c0 = stool_at(3, 4.2)
p0 = stool_at(0, 0.0)
p1 = stool_at(4, 2.1)
meta = {
    'colliders': [{'min': three(c['min'][0], c['max'][1], 0)[0:1] + [0] + [-c['max'][1]], 'max': [c['max'][0], 2.0, -c['min'][1]]} for c in COLLIDERS],
    'bounds': {'x': W / 2 - 0.9, 'z': D / 2 - 0.9},
    'spawn': {'pos': three(0.0, -5.5, 1.62), 'yaw': 0.0},
    'figures': [
        fig('ILEN SARVO', 2.6, 6.0, 200),
        fig('CORIN PELLIS', c0[0], c0[1], 0, seated=True, face=TABLES[3]),
        fig('GREY COAT', -6.4, -7.0, 180),
        fig('BARTENDER', W / 2 - 1.3, 2.0, 90),
        fig('PATRON_A', p0[0], p0[1], 0, seated=True, face=TABLES[0]),
        fig('PATRON_B', p1[0], p1[1], 0, seated=True, face=TABLES[4]),
    ],
    'tables': [three(x, y, 0.96) for x, y in TABLES],
}
with open(os.path.join(os.path.abspath(OUT), 'cantina.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
