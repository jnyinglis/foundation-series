# The Elders' longhouse on Rossem: logs, fur, a fire pit, snow light at the door.
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(79)
scene = reset(FAST)
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.01, 0.012, 0.02, 1)

# Blender axes: X right, Y depth (Elder's seat at +Y, door at -Y), Z up.
W, D, H = 9.0, 18.0, 3.2
M_LOG = material('Log', (0.3, 0.19, 0.1), rough=0.95, grime=0.4, scale=3.0, brick=(0.22, 0.03))
M_EARTH = material('Earth', (0.16, 0.12, 0.08), rough=1.0, grime=0.4, scale=4.0)
M_ROOF = material('Thatch', (0.22, 0.16, 0.08), rough=1.0, grime=0.45, scale=5.0)
M_POST = material('Post', (0.24, 0.15, 0.08), rough=0.9, grime=0.4, scale=6.0)
M_FUR = material('Fur', (0.5, 0.42, 0.32), rough=1.0, grime=0.3, scale=14.0)
M_BEAR = material('Bearskin', (0.14, 0.1, 0.07), rough=1.0, grime=0.3, scale=14.0)
M_STONE = material('FireStone', (0.3, 0.3, 0.3), rough=0.9, grime=0.4, scale=8.0)
M_IRON = material('Iron', (0.16, 0.15, 0.14), rough=0.6, metal=0.7, grime=0.4, scale=8.0)
M_SACK = material('Sack', (0.45, 0.38, 0.26), rough=1.0, grime=0.35, scale=10.0)
M_FIRE = material('Fire', (1.0, 0.5, 0.15), emit=(1.0, 0.45, 0.12), emit_strength=3.0)
M_LANTERN = material('Lantern', (1.0, 0.75, 0.4), emit=(1.0, 0.7, 0.35), emit_strength=2.5)
M_SNOW = material('SnowDoor', (0.4, 0.5, 0.65), emit=(0.38, 0.48, 0.62), emit_strength=1.0)

box('Floor', (W, D, 0.3), (0, 0, -0.15), M_EARTH, bevel=0)
box('WallWest', (0.5, D, H), (-W / 2, 0, H / 2), M_LOG, bevel=0.04)
box('WallEast', (0.5, D, H), (W / 2, 0, H / 2), M_LOG, bevel=0.04)
box('WallBack', (W, 0.5, H + 1.6), (0, D / 2, (H + 1.6) / 2), M_LOG, bevel=0.04)
box('WallFrontL', (W / 2 - 0.9, 0.5, H + 1.6), (-W / 4 - 0.45, -D / 2, (H + 1.6) / 2), M_LOG, bevel=0.04)
box('WallFrontR', (W / 2 - 0.9, 0.5, H + 1.6), (W / 4 + 0.45, -D / 2, (H + 1.6) / 2), M_LOG, bevel=0.04)
box('DoorHead', (1.8, 0.5, H + 1.6 - 2.3), (0, -D / 2, 2.3 + (H + 1.6 - 2.3) / 2), M_LOG, bevel=0.04)
box('DoorSnow', (1.7, 0.1, 2.3), (0, -D / 2 - 0.2, 1.15), M_SNOW, bevel=0, static=False)
area_light((0, -D / 2 + 0.8, 1.4), 30, color=(0.6, 0.72, 1.0), size=1.6, rot=(math.radians(90), 0, 0))
# pitched roof: two slabs meeting at a ridge
pitch = math.atan2(1.8, W / 2)
slab = math.hypot(1.8, W / 2) + 0.3
for side in (-1, 1):
    box(f'Roof{side}', (slab, D + 0.6, 0.25), (side * W / 4, 0, H + 0.9), M_ROOF, bevel=0, rot=(0, -side * pitch, 0))
box('Ridge', (0.3, D + 0.6, 0.3), (0, 0, H + 1.8), M_POST, bevel=0.02)
# posts and rafters
for i, y in enumerate(range(-7, 8, 3)):
    for x in (-W / 2 + 0.6, W / 2 - 0.6):
        cyl(f'Post{i}{x}', 0.14, H + 0.6, (x, y, (H + 0.6) / 2), M_POST, verts=10)
    box(f'Rafter{i}', (W - 0.6, 0.2, 0.2), (0, y, H + 0.4), M_POST, bevel=0.02)
# the fire pit at the centre
cyl('FireRing', 1.2, 0.35, (0, 0, 0.17), M_STONE, verts=20)
cyl('FireBed', 0.9, 0.38, (0, 0, 0.19), M_STONE, verts=20)
cyl('Embers', 0.7, 0.08, (0, 0, 0.4), M_FIRE, static=False, verts=20)
for k in range(5):
    a = k * 1.26
    cyl(f'FireLog{k}', 0.09, 1.0, (math.cos(a) * 0.25, math.sin(a) * 0.25, 0.5), M_POST, verts=8, rot=(math.radians(80), 0, a))
area_light((0, 0, 1.4), 150, color=(1.0, 0.55, 0.25), size=1.0)
cyl('Tripod', 0.03, 2.4, (0.5, 0.0, 1.2), M_IRON, verts=6, rot=(0, math.radians(20), 0))
cyl('Tripod2', 0.03, 2.4, (-0.5, 0.3, 1.2), M_IRON, verts=6, rot=(0, math.radians(-20), 0.5))
cyl('Pot', 0.28, 0.3, (0, 0, 1.0), M_IRON, verts=14)
COLLIDERS.append({'min': [-1.5, -1.5], 'max': [1.5, 1.5]})
# benches with furs along both walls
for side in (-1, 1):
    x = side * (W / 2 - 1.1)
    box(f'Bench{side}', (0.9, 13.0, 0.45), (x, 0.5, 0.225), M_POST, bevel=0.02, collide=True, pad=0.2)
    for k in range(6):
        box(f'FurBench{side}{k}', (0.95, 1.7, 0.1), (x, -5.5 + k * 2.3 + random.random() * 0.2, 0.5), M_FUR if k % 2 else M_BEAR, bevel=0.03, rot=(0, 0, random.random() * 0.2 - 0.1))
# the Elder's seat at the far end
box('ElderDais', (3.6, 1.6, 0.25), (0, 7.4, 0.125), M_POST, bevel=0.02, collide=True, pad=0.2)
box('ElderSeat', (1.2, 0.8, 0.5), (0, 7.6, 0.5), M_POST, bevel=0.03)
box('ElderBack', (1.3, 0.15, 1.2), (0, 8.0, 1.1), M_POST, bevel=0.03)
box('ElderFur', (1.3, 0.9, 0.12), (0, 7.6, 0.8), M_BEAR, bevel=0.04)
box('ElderTable', (1.4, 0.7, 0.08), (0, 5.6, 0.74), M_POST, bevel=0.02, collide=True, pad=0.25)
for k in range(2):
    cyl(f'ElderTableLeg{k}', 0.06, 0.72, (-0.5 + k, 5.6, 0.36), M_POST, verts=8)
# stores: barrels and sacks by the back wall and the door
for k, (x, y) in enumerate(((-3.2, 8.0), (-2.4, 8.2), (3.2, 8.0), (2.5, 8.3), (3.4, -7.8))):
    cyl(f'Barrel{k}', 0.38, 0.9, (x, y, 0.45), M_POST, verts=14)
    cyl(f'BarrelHoop{k}', 0.4, 0.06, (x, y, 0.7), M_IRON, verts=14)
for k, (x, y) in enumerate(((-3.3, -7.9), (-2.7, -8.1), (-3.0, -7.3), (3.0, 7.0))):
    box(f'Sack{k}', (0.6, 0.45, 0.4), (x, y, 0.2 + (0.4 if k == 2 else 0)), M_SACK, bevel=0.06, rot=(0, 0, random.random()))
COLLIDERS.append({'min': [-4.0, 7.2], 'max': [-1.8, 9.0]})
COLLIDERS.append({'min': [1.8, 6.5], 'max': [4.0, 9.0]})
COLLIDERS.append({'min': [-4.0, -9.0], 'max': [-2.2, -6.8]})
COLLIDERS.append({'min': [2.6, -9.0], 'max': [4.0, -7.0]})
# lanterns on the posts
for y in (-6.0, 6.0):
    for x in (-W / 2 + 0.75, W / 2 - 0.75):
        box(f'LanternBox{x}{y}', (0.22, 0.22, 0.3), (x, y, 2.2), M_IRON, bevel=0.01)
        box(f'Lantern{x}{y}', (0.14, 0.14, 0.2), (x, y, 2.2), M_LANTERN, bevel=0, static=False)
        area_light((x, y, 2.1), 16, size=0.3)
# furs and tools on the walls
for k in range(4):
    box(f'WallFur{k}', (0.08, 1.4, 1.1), (-W / 2 + 0.3, -5 + k * 3.2, 1.9), M_BEAR if k % 2 else M_FUR, bevel=0.03)
    box(f'WallFurE{k}', (0.08, 1.2, 1.0), (W / 2 - 0.3, -4 + k * 3.2, 1.9), M_FUR if k % 2 else M_BEAR, bevel=0.03)

finish(scene, OUT, 'longhouse', ('Floor', 'Wall', 'Door', 'Roof', 'Ridge', 'Post', 'Rafter', 'Bench', 'Elder', 'LanternBox', 'WallFur'), 1024 if FAST else 2048, 1024 if FAST else 2048)
meta = {
    'colliders': colliders_three(),
    'bounds': {'x': W / 2 - 1.3, 'z': D / 2 - 0.9},
    'spawn': {'pos': three(0.0, -7.2, 1.62), 'yaw': 0.0},
    'figures': [
        fig('ELDER TOKHAN', 0.0, 7.5, 0, seated=True, face=(0.0, 0.0), seat=0.86),
        fig('GOVERNOR SARIN', -2.0, 2.6, 50),
        fig('ILEN SARVO', -1.7, -3.6, 160),
        fig('CORIN PELLIS', 1.7, -3.3, 200),
        fig('VILLAGER_A', W / 2 - 1.1, 1.5, 0, seated=True, face=(0.0, 1.5), seat=0.55),
        fig('VILLAGER_B', -W / 2 + 1.1, 4.0, 0, seated=True, face=(0.0, 4.0), seat=0.55),
    ],
    'tables': [three(0.0, 5.6, 0.74)],
}
with open(os.path.join(os.path.abspath(OUT), 'longhouse.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
