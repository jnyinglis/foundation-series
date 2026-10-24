# A café terrace above Sayshell City at dusk: planters in flower, string lights,
# a balustrade over the drop, and the city lights below.
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS, STATIC

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(21)
scene = reset(FAST)
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.18, 0.12, 0.16, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0

W, D = 20.0, 14.0   # terrace; balustrade at +Y over the drop, café wall at -Y

M_TILE = material('Tile', (0.62, 0.52, 0.42), rough=0.6, grime=0.3, scale=1.5, brick=(1.2, 0.015))
M_PLASTER = material('Plaster', (0.78, 0.68, 0.55), rough=0.9, grime=0.3, scale=1.0)
M_STONE = material('PaleStone', (0.7, 0.66, 0.6), rough=0.8, grime=0.25, scale=2.0)
M_IRON = material('Iron', (0.1, 0.1, 0.11), rough=0.6, metal=0.7, grime=0.4, scale=8.0)
M_WOOD = material('Teak', (0.4, 0.26, 0.14), rough=0.6, grime=0.3, scale=8.0)
M_LEAF = material('Leaf', (0.12, 0.3, 0.1), rough=0.9, grime=0.3, scale=14.0)
M_SOIL = material('Soil', (0.18, 0.12, 0.08), rough=1.0, grime=0.4, scale=10.0)
M_BULB = material('Bulb', (1.0, 0.8, 0.5), emit=(1.0, 0.78, 0.45), emit_strength=8.0)
M_WINDOW = material('CafeWindow', (1.0, 0.75, 0.45), emit=(1.0, 0.72, 0.4), emit_strength=1.2)
M_CITY = material('CityLights', (1.0, 0.8, 0.6), emit=(1.0, 0.8, 0.6), emit_strength=1.5)
FLOWERS = [material(f'Flower{i}', c, rough=0.7, grime=0.1, scale=30.0) for i, c in enumerate([(0.9, 0.2, 0.3), (0.95, 0.6, 0.15), (0.8, 0.3, 0.8), (0.95, 0.9, 0.4)])]

box('Floor', (W, D, 0.3), (0, 0, -0.15), M_TILE, bevel=0)
# café wall with lit windows and a door at -Y
box('CafeWall', (W, 0.6, 6.0), (0, -D / 2, 3.0), M_PLASTER, bevel=0.03)
for i, x in enumerate((-7, -3.5, 3.5, 7)):
    box(f'CafeWindow{i}', (2.2, 0.1, 1.8), (x, -D / 2 + 0.33, 2.2), M_WINDOW, bevel=0, static=False)
    area_light((x, -D / 2 + 0.8, 2.2), 22, color=(1.0, 0.75, 0.45), size=1.6, rot=(math.radians(90), 0, 0))
box('CafeDoor', (1.6, 0.1, 2.6), (0, -D / 2 + 0.33, 1.3), M_WOOD)
box('Awning', (W, 2.4, 0.1), (0, -D / 2 + 1.2, 4.2), M_WOOD, bevel=0.02)
# side walls, low, with the balustrade over the drop at +Y
box('WallWest', (0.5, D, 1.2), (-W / 2, 0, 0.6), M_STONE, bevel=0.03)
box('WallEast', (0.5, D, 1.2), (W / 2, 0, 0.6), M_STONE, bevel=0.03)
box('Balustrade', (W, 0.4, 1.1), (0, D / 2, 0.55), M_STONE, bevel=0.03, collide=True, pad=0.2)
for i in range(21):
    cyl(f'Baluster{i}', 0.06, 0.9, (-W / 2 + i * 1.0, D / 2, 0.55), M_STONE, verts=10)
box('BalustradeRail', (W, 0.5, 0.1), (0, D / 2, 1.15), M_STONE, bevel=0.02)
# the city below and beyond: a wide emissive ring of windows far off, and a dark ground plane
box('CityGround', (200, 120, 0.2), (0, 60, -30), M_IRON, bevel=0)
for i in range(60):
    x = -90 + random.random() * 180
    y = 25 + random.random() * 70
    h = 4 + random.random() * 30
    box(f'Tower{i}', (3 + random.random() * 6, 3 + random.random() * 6, h), (x, y, -30 + h / 2), M_IRON, bevel=0)
    box(f'TowerLights{i}', (1.5, 1.5, h * 0.9), (x, y, -30 + h / 2), M_CITY, bevel=0, static=False)
# string lights across the terrace
for r in range(3):
    y = -4 + r * 4
    cyl(f'Wire{r}', 0.015, W, (0, y, 3.4), M_IRON, verts=6, rot=(0, math.radians(90), 0))
    for i in range(9):
        x = -8 + i * 2.0
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(x, y, 3.25), segments=10, ring_count=8)
        b = bpy.context.active_object; b.name = f'Bulb{r}{i}'; b.data.materials.append(M_BULB)
        from common import GLOW; GLOW.append(b)
        if i % 2 == 0:
            area_light((x, y, 3.1), 12, size=0.3)
# planters with flowering shrubs
for i, (x, y) in enumerate([(-8, 2), (8, 2), (-8, -2.5), (8, -2.5), (0, 4.5), (-4, 5), (4, 5)]):
    box(f'Planter{i}', (1.6, 1.6, 0.7), (x, y, 0.35), M_STONE, bevel=0.03, collide=True, pad=0.3)
    box(f'Soil{i}', (1.4, 1.4, 0.05), (x, y, 0.72), M_SOIL, bevel=0)
    for k in range(9):
        r = 0.25 + random.random() * 0.25
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x + (random.random() - 0.5) * 1.0, y + (random.random() - 0.5) * 1.0, 0.75 + r * 0.8 + random.random() * 0.3), segments=10, ring_count=8)
        s_ = bpy.context.active_object; s_.name = f'Shrub{i}{k}'; s_.data.materials.append(M_LEAF); STATIC.append(s_)
    for k in range(14):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.06, location=(x + (random.random() - 0.5) * 1.3, y + (random.random() - 0.5) * 1.3, 1.0 + random.random() * 0.6), segments=6, ring_count=5)
        f_ = bpy.context.active_object; f_.name = f'Bloom{i}{k}'; f_.data.materials.append(FLOWERS[random.randrange(4)]); STATIC.append(f_)
# café tables and chairs
TABLES = [(-4.5, -1.0), (0.0, -0.5), (4.5, -1.0), (-2.5, 2.5), (3.0, 2.5)]
for t, (x, y) in enumerate(TABLES):
    cyl(f'Table{t}', 0.55, 0.05, (x, y, 0.75), M_WOOD, verts=24)
    cyl(f'TableLeg{t}', 0.05, 0.75, (x, y, 0.37), M_IRON, verts=10)
    cyl(f'TableFoot{t}', 0.3, 0.03, (x, y, 0.02), M_IRON, verts=16)
    COLLIDERS.append({'min': [x - 0.9, y - 0.9], 'max': [x + 0.9, y + 0.9]})
    for a in (0.6, 2.7, 4.8):
        cx, cy = x + math.cos(a) * 1.0, y + math.sin(a) * 1.0
        cyl(f'Chair{t}{a}', 0.22, 0.04, (cx, cy, 0.46), M_WOOD, verts=14)
        cyl(f'ChairLeg{t}{a}', 0.03, 0.46, (cx, cy, 0.23), M_IRON, verts=8)
# dusk sun, low and warm
area_light((0, -2, 6), 200, color=(1.0, 0.55, 0.35), size=8.0)
area_light((0, 10, 12), 320, color=(0.55, 0.5, 0.8), size=14.0)

finish(scene, OUT, 'terrace', ('Floor', 'Cafe', 'Awning', 'Wall', 'Balustrade', 'Baluster', 'City', 'Tower'), 1024 if FAST else 2048, 1024 if FAST else 2048)
meta = {
    'colliders': colliders_three(),
    'bounds': {'x': W / 2 - 0.8, 'z': D / 2 - 0.8},
    'spawn': {'pos': three(0.0, -4.5, 1.62), 'yaw': 0.0},
    'figures': [
        fig('VASK OREN', -6.5, -4.2, 120),
        fig('QUINTESETZ', 3.0 + math.cos(2.7) * 1.0, 2.5 + math.sin(2.7) * 1.0, 0, seated=True, face=(3.0, 2.5)),
        fig('ILEN SARVO', 1.2, 0.6, 200),
        fig('CORIN PELLIS', -2.4, -2.6, 60),
    ],
}
with open(os.path.join(os.path.abspath(OUT), 'terrace.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
