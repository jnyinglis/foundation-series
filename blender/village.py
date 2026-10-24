# New Earth on Alpha: a beach village at night. Sand, a fire, huts with cone
# roofs, palms, and the sea as a dark glimmering plane.
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS, STATIC, GLOW

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(61)
scene = reset(FAST)
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.03, 0.04, 0.09, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0

W, D = 34.0, 30.0   # sea at +Y
M_SAND = material('Sand', (0.72, 0.62, 0.45), rough=1.0, grime=0.3, scale=5.0)
M_SEA = material('Sea', (0.05, 0.1, 0.18), rough=0.15, metal=0.2, grime=0.2, scale=2.0)
M_THATCH = material('Thatch', (0.45, 0.33, 0.16), rough=1.0, grime=0.4, scale=12.0)
M_WOOD = material('PalmWood', (0.35, 0.25, 0.14), rough=0.9, grime=0.4, scale=8.0)
M_LEAF = material('PalmLeaf', (0.15, 0.3, 0.12), rough=0.9, grime=0.3, scale=10.0)
M_STONE = material('FireStone', (0.3, 0.3, 0.3), rough=0.9, grime=0.4, scale=8.0)
M_FIRE = material('Fire', (1.0, 0.5, 0.15), emit=(1.0, 0.45, 0.12), emit_strength=12.0)
M_LANTERN = material('Lantern', (1.0, 0.7, 0.35), emit=(1.0, 0.65, 0.3), emit_strength=5.0)
M_CLOTH = material('Cloth', (0.6, 0.2, 0.2), rough=1.0, grime=0.3, scale=6.0)

box('Sand', (W, D, 0.3), (0, -4, -0.15), M_SAND, bevel=0)
box('Sea', (W + 40, 40, 0.1), (0, D / 2 + 14, -0.12), M_SEA, bevel=0)
# dunes
for i in range(18):
    x, y = (random.random() - 0.5) * W, -4 + (random.random() - 0.5) * (D - 6)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.5 + random.random() * 2.5, location=(x, y, -1.2), segments=10, ring_count=6)
    d = bpy.context.active_object; d.name = f'Dune{i}'; d.scale = (1.4, 1.0, 0.35); bpy.ops.object.transform_apply(scale=True); d.data.materials.append(M_SAND); STATIC.append(d)
# the fire
cyl('FireRing', 1.3, 0.4, (0, -2, 0.2), M_STONE, verts=20)
cyl('FireBed', 1.0, 0.45, (0, -2, 0.22), M_STONE, verts=20)
for i in range(5):
    a = i / 5 * 6.28
    box(f'Log{i}', (1.4, 0.2, 0.2), (math.cos(a) * 0.35, -2 + math.sin(a) * 0.35, 0.55), M_WOOD, rot=(0, 0.3, a))
bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.6, radius2=0.05, depth=1.4, location=(0, -2, 1.2))
fl = bpy.context.active_object; fl.name = 'Flame'; fl.data.materials.append(M_FIRE); GLOW.append(fl)
area_light((0, -2, 1.6), 260, color=(1.0, 0.5, 0.2), size=1.0)
COLLIDERS.append({'min': [-1.6, -3.6], 'max': [1.6, -0.4]})
# log benches around the fire
for a in (0.9, 2.3, 3.9, 5.4):
    x, y = math.cos(a) * 3.2, -2 + math.sin(a) * 3.2
    box(f'Bench{a}', (2.0, 0.45, 0.45), (x, y, 0.22), M_WOOD, bevel=0.05, rot=(0, 0, a + math.pi / 2), collide=True, pad=0.25)
# huts
for k, (x, y, r) in enumerate([(-9, -8, 2.6), (9, -9, 2.4), (-11, 2, 2.2), (11, 1, 2.5), (0, -12, 2.8)]):
    cyl(f'HutWall{k}', r, 2.4, (x, y, 1.2), M_WOOD, verts=18)
    bpy.ops.mesh.primitive_cone_add(vertices=18, radius1=r + 0.8, radius2=0.1, depth=2.2, location=(x, y, 3.5))
    roof = bpy.context.active_object; roof.name = f'HutRoof{k}'; roof.data.materials.append(M_THATCH); STATIC.append(roof)
    box(f'HutDoor{k}', (0.9, 0.3, 1.8), (x + r * math.cos(math.atan2(-2 - y, -x)), y + r * math.sin(math.atan2(-2 - y, -x)), 0.9), M_CLOTH, bevel=0, rot=(0, 0, math.atan2(-2 - y, -x) + math.pi / 2))
    box(f'HutLantern{k}', (0.25, 0.25, 0.3), (x + (r + 0.4) * math.cos(math.atan2(-2 - y, -x)), y + (r + 0.4) * math.sin(math.atan2(-2 - y, -x)), 2.2), M_LANTERN, bevel=0, static=False)
    area_light((x + (r + 0.8) * math.cos(math.atan2(-2 - y, -x)), y + (r + 0.8) * math.sin(math.atan2(-2 - y, -x)), 2.0), 30, size=0.3)
    COLLIDERS.append({'min': [x - r, y - r], 'max': [x + r, y + r]})
# palms
for k, (x, y) in enumerate([(-14, -3), (-6, 8), (6, 9), (14, -4), (-3, -14), (12, 7), (-13, 8)]):
    h = 6 + random.random() * 3
    cyl(f'Palm{k}', 0.25, h, (x, y, h / 2), M_WOOD, verts=10, r2=0.15, rot=(random.random() * 0.2, random.random() * 0.2, 0))
    for b in range(7):
        a = b / 7 * 6.28
        box(f'Frond{k}{b}', (3.0, 0.5, 0.06), (x + math.cos(a) * 1.4, y + math.sin(a) * 1.4, h - 0.2), M_LEAF, bevel=0, rot=(0, 0.55, a))
    COLLIDERS.append({'min': [x - 0.5, y - 0.5], 'max': [x + 0.5, y + 0.5]})
# moonlight from the sea side
area_light((0, 14, 16), 420, color=(0.5, 0.6, 0.9), size=30.0)

finish(scene, OUT, 'village', ('Sand', 'Sea', 'Dune'), 1024 if FAST else 2048, 1024 if FAST else 2048)
meta = {
    'colliders': colliders_three(),
    'bounds': {'x': W / 2 - 2.0, 'z': D / 2 - 1.0},
    'spawn': {'pos': three(0.0, -9.0, 1.62), 'yaw': 0.0},
    'figures': [
        fig('SANYA', 0.0 + math.cos(2.3) * 3.2, -2 + math.sin(2.3) * 3.2, 0, seated=True, face=(0.0, -2.0)),
        fig('ILEN SARVO', math.cos(5.4) * 3.2, -2 + math.sin(5.4) * 3.2, 0, seated=True, face=(0.0, -2.0)),
        fig('CORIN PELLIS', math.cos(3.9) * 3.2, -2 + math.sin(3.9) * 3.2, 0, seated=True, face=(0.0, -2.0)),
    ],
}
with open(os.path.join(os.path.abspath(OUT), 'village.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
