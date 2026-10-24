# The Sacratorium of Mycogen on Trantor: a long dark hall, benches, candles,
# a dais at the end, and on the dais a robot statue in a shaft of light.
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(9)
scene = reset(FAST)

W, D, H = 12.0, 28.0, 8.0

M_STONE = material('GreyStone', (0.38, 0.38, 0.40), rough=0.9, grime=0.35, scale=1.4, brick=(0.5, 0.012))
M_FLOOR = material('FloorSlate', (0.22, 0.22, 0.24), rough=0.5, grime=0.4, scale=1.5, brick=(0.9, 0.01))
M_WOOD = material('OldWood', (0.26, 0.17, 0.10), rough=0.8, grime=0.4, scale=8.0)
M_IRON = material('Iron', (0.1, 0.1, 0.11), rough=0.6, metal=0.7, grime=0.4, scale=8.0)
M_CLOTH = material('GreyCloth', (0.5, 0.5, 0.48), rough=0.95, grime=0.3, scale=5.0)
M_CANDLE = material('Candle', (1.0, 0.75, 0.4), emit=(1.0, 0.7, 0.35), emit_strength=5.0)
M_SHAFT = material('Shaft', (0.8, 0.85, 1.0), emit=(0.8, 0.85, 1.0), emit_strength=4.0)

box('Floor', (W, D, 0.3), (0, 0, -0.15), M_FLOOR, bevel=0)
box('Ceiling', (W, D, 0.4), (0, 0, H + 0.2), M_STONE, bevel=0)
box('WallWest', (0.6, D, H), (-W / 2, 0, H / 2), M_STONE, bevel=0.05)
box('WallEast', (0.6, D, H), (W / 2, 0, H / 2), M_STONE, bevel=0.05)
box('WallBack', (W, 0.6, H), (0, D / 2, H / 2), M_STONE, bevel=0.05)
box('WallFrontL', (W / 2 - 1.3, 0.6, H), (-W / 4 - 0.65, -D / 2, H / 2), M_STONE, bevel=0.05)
box('WallFrontR', (W / 2 - 1.3, 0.6, H), (W / 4 + 0.65, -D / 2, H / 2), M_STONE, bevel=0.05)
box('DoorArch', (2.6, 0.6, H - 4.2), (0, -D / 2, H - (H - 4.2) / 2), M_STONE, bevel=0.05)
for i, y in enumerate(range(-10, 11, 5)):
    box(f'Beam{i}', (W, 0.6, 0.6), (0, y, H - 0.3), M_STONE, bevel=0.04)
    for x in (-W / 2 + 0.9, W / 2 - 0.9):
        box(f'Pilaster{i}{x}', (0.6, 0.9, H), (x, y, H / 2), M_STONE, bevel=0.04)
# benches
for r in range(7):
    y = -10 + r * 2.4
    for x in (-3.0, 3.0):
        box(f'Bench{r}{x}', (4.2, 0.5, 0.08), (x, y, 0.48), M_WOOD, collide=True, pad=0.35)
        box(f'BenchBack{r}{x}', (4.2, 0.06, 0.5), (x, y + 0.25, 0.8), M_WOOD)
        for s in (-1, 1):
            box(f'BenchLeg{r}{x}{s}', (0.1, 0.5, 0.45), (x + s * 1.9, y, 0.22), M_IRON)
# candle stands along the aisle
for r in range(6):
    y = -9 + r * 3.5
    for x in (-0.9, 0.9):
        cyl(f'Stand{r}{x}', 0.05, 1.2, (x, y, 0.6), M_IRON, verts=8)
        cyl(f'StandCup{r}{x}', 0.12, 0.06, (x, y, 1.2), M_IRON, verts=12)
        cyl(f'Candle{r}{x}', 0.05, 0.14, (x, y, 1.3), M_CANDLE, static=False, verts=8)
        area_light((x, y, 1.5), 9, color=(1.0, 0.7, 0.35), size=0.2)
# dais, lectern, and the statue's shaft of light
box('Dais', (W - 2.0, 5.0, 0.6), (0, 10.5, 0.3), M_STONE, bevel=0.04, collide=True, pad=0.2)
box('DaisStep', (W - 2.0, 0.8, 0.3), (0, 7.6, 0.15), M_STONE, bevel=0.03)
box('Lectern', (0.9, 0.5, 1.2), (-2.2, 9.0, 1.2), M_WOOD, bevel=0.02, collide=True)
box('LecternTop', (1.0, 0.6, 0.06), (-2.2, 9.0, 1.83), M_WOOD, rot=(0.3, 0, 0))
box('Banner', (3.0, 0.05, 5.0), (0, 13.6, 4.0), M_CLOTH)
box('ShaftGlass', (2.0, 2.0, 0.05), (0, 11.5, H - 0.05), M_SHAFT, bevel=0, static=False)
area_light((0, 11.5, H - 0.4), 600, color=(0.8, 0.85, 1.0), size=1.8)
cyl('StatuePlinth', 0.9, 0.5, (0, 11.5, 0.85), M_STONE, verts=24)
COLLIDERS.append({'min': [-1.2, 10.3], 'max': [1.2, 12.7]})

finish(scene, OUT, 'sacratorium', ('Floor', 'Ceiling', 'Wall', 'Door', 'Beam', 'Pilaster', 'Dais', 'Banner', 'Shaft'), 1024 if FAST else 2048, 1024 if FAST else 2048)
meta = {
    'colliders': colliders_three(),
    'bounds': {'x': W / 2 - 1.0, 'z': D / 2 - 1.0},
    'spawn': {'pos': three(0.0, 1.0, 1.62), 'yaw': 0.0},
    'figures': [
        {'name': 'STATUE', 'pos': three(0.0, 11.5, 1.1), 'yaw': round(math.pi, 4), 'seated': False},
        fig('SUNMASTER TWENTY-ONE', -0.9, 8.6, 180),
        fig('ILEN SARVO', 1.6, 5.4, 160),
        fig('CORIN PELLIS', -2.2, 4.2, 200),
    ],
}
with open(os.path.join(os.path.abspath(OUT), 'sacratorium.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
