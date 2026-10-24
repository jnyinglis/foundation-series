# The ruins of a Spacer estate on Aurora: a broken colonnade in long grass, a dry
# fountain, fallen roof slabs, dead trees, under a warm afternoon sun.
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS, STATIC

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(41)
scene = reset(FAST)
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.5, 0.62, 0.85, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5

W, D = 30.0, 30.0
M_GRASS = material('Grass', (0.32, 0.36, 0.14), rough=1.0, grime=0.5, scale=4.0)
M_STONE = material('PaleStone', (0.72, 0.68, 0.6), rough=0.8, grime=0.45, scale=2.0, brick=(0.4, 0.012))
M_MARBLE = material('OldMarble', (0.8, 0.78, 0.72), rough=0.6, grime=0.5, scale=1.5)
M_MOSS = material('Moss', (0.2, 0.3, 0.1), rough=1.0, grime=0.4, scale=10.0)
M_BARK = material('Bark', (0.25, 0.18, 0.12), rough=1.0, grime=0.5, scale=8.0)
M_RUST = material('Rust', (0.4, 0.22, 0.12), rough=0.9, metal=0.3, grime=0.5, scale=10.0)

box('Ground', (W, D, 0.3), (0, 0, -0.15), M_GRASS, bevel=0)
# grass tufts: low flattened spheres
for i in range(140):
    x, y = (random.random() - 0.5) * (W - 2), (random.random() - 0.5) * (D - 2)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3 + random.random() * 0.4, location=(x, y, 0.05), segments=8, ring_count=5)
    g = bpy.context.active_object; g.name = f'Tuft{i}'; g.scale = (1, 1, 0.45); bpy.ops.object.transform_apply(scale=True)
    g.data.materials.append(M_MOSS if random.random() < 0.3 else M_GRASS); STATIC.append(g)
# the colonnade: a ring of pillars, some broken, around a paved court
R = 8.5
cyl('Court', R - 1.2, 0.2, (0, 0, 0.1), M_STONE, verts=48)
for i in range(16):
    a = i / 16 * 2 * math.pi
    x, y = math.cos(a) * R, math.sin(a) * R
    h = 5.0 if random.random() > 0.35 else 1.2 + random.random() * 2.5
    cyl(f'Pillar{i}', 0.45, h, (x, y, h / 2), M_MARBLE, verts=14)
    cyl(f'PillarBase{i}', 0.6, 0.3, (x, y, 0.15), M_STONE, verts=14)
    COLLIDERS.append({'min': [x - 0.8, y - 0.8], 'max': [x + 0.8, y + 0.8]})
    if h >= 5.0 and random.random() > 0.3:
        box(f'Lintel{i}', (2 * math.pi * R / 16 + 0.4, 0.9, 0.5), (math.cos(a + math.pi / 16) * R, math.sin(a + math.pi / 16) * R, 5.25), M_MARBLE, bevel=0.03, rot=(0, 0, a + math.pi / 16 + math.pi / 2))
# fallen roof slabs and rubble
for i in range(9):
    a = random.random() * 2 * math.pi; r = 2 + random.random() * 9
    box(f'Slab{i}', (1.5 + random.random() * 2.5, 1.0 + random.random() * 1.5, 0.3), (math.cos(a) * r, math.sin(a) * r, 0.2), M_MARBLE, bevel=0.03, rot=(random.random() * 0.3, random.random() * 0.3, random.random() * 3), collide=True, pad=0.3)
for i in range(30):
    a = random.random() * 2 * math.pi; r = 1 + random.random() * 13
    box(f'Rubble{i}', (0.3 + random.random() * 0.5, 0.3 + random.random() * 0.5, 0.2 + random.random() * 0.3), (math.cos(a) * r, math.sin(a) * r, 0.1), M_STONE, rot=(0, 0, random.random() * 3))
# dry fountain at the centre
cyl('FountainRim', 2.4, 0.6, (0, 0, 0.3), M_STONE, verts=32)
cyl('FountainBowl', 2.0, 0.65, (0, 0, 0.33), M_MOSS, verts=32)
cyl('FountainPost', 0.3, 1.8, (0, 0, 1.2), M_MARBLE, verts=12)
COLLIDERS.append({'min': [-2.7, -2.7], 'max': [2.7, 2.7]})
# a broken house wall at the far side, with a doorway
box('HouseWallL', (5.0, 0.6, 4.0), (-4.0, 12.5, 2.0), M_STONE, bevel=0.04, collide=True)
box('HouseWallR', (6.0, 0.6, 3.0), (4.5, 12.5, 1.5), M_STONE, bevel=0.04, collide=True)
box('HousePlaque', (1.2, 0.1, 0.6), (-4.0, 12.15, 1.6), M_RUST, bevel=0.01)
# dead trees
for i, (x, y) in enumerate([(-12, -9), (11, -11), (-13, 6), (12, 9), (-6, -13)]):
    cyl(f'Trunk{i}', 0.3, 6.0, (x, y, 3.0), M_BARK, verts=10, r2=0.12)
    for b in range(4):
        a = random.random() * 6.28; z = 3.5 + random.random() * 2.2
        box(f'Branch{i}{b}', (2.2, 0.12, 0.12), (x + math.cos(a) * 1.0, y + math.sin(a) * 1.0, z), M_BARK, rot=(0, random.random() * 0.6 - 0.8, a))
    COLLIDERS.append({'min': [x - 0.6, y - 0.6], 'max': [x + 0.6, y + 0.6]})
# sun and sky
area_light((8, -6, 18), 900, color=(1.0, 0.9, 0.75), size=4.0, rot=(math.radians(25), math.radians(20), 0))
area_light((0, 0, 24), 550, color=(0.6, 0.7, 1.0), size=40.0)

finish(scene, OUT, 'ruins', ('Ground', 'Tuft', 'Court', 'House'), 1024 if FAST else 2048, 1024 if FAST else 2048)
meta = {
    'colliders': colliders_three(),
    'bounds': {'x': W / 2 - 1.0, 'z': D / 2 - 1.0},
    'spawn': {'pos': three(0.0, -11.0, 1.62), 'yaw': 0.0},
    'figures': [
        {'name': 'WRECK', 'pos': three(3.2, 1.0, 0.0), 'yaw': 2.1, 'seated': False},
        fig('ILEN SARVO', -2.6, 9.8, 160),
        fig('CORIN PELLIS', 2.4, -3.0, 20),
    ],
}
with open(os.path.join(os.path.abspath(OUT), 'ruins.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
