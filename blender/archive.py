# The Imperial archive on Siwenna: a dark stone hall of shelves, one lamp at the
# keeper's desk, and a cold shaft of light from a broken skylight.
# Run headless:  npm run scene:archive   (add -- --fast for a quick preview bake)
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(11)
scene = reset(FAST)

W, D, H = 16.0, 32.0, 9.0   # x, y (door at -Y, desk at +Y), z

M_STONE = material('Stone', (0.42, 0.40, 0.37), rough=0.95, grime=0.5, scale=1.6, brick=(0.6, 0.015))
M_FLOOR = material('FloorStone', (0.30, 0.29, 0.27), rough=0.85, grime=0.55, scale=2.0, brick=(0.8, 0.012))
M_WOOD = material('DarkWood', (0.22, 0.14, 0.09), rough=0.75, grime=0.45, scale=9.0)
M_BRASS = material('Brass', (0.55, 0.42, 0.22), rough=0.4, metal=0.9, grime=0.4, scale=10.0)
M_IRON = material('Iron', (0.12, 0.12, 0.13), rough=0.6, metal=0.7, grime=0.4, scale=8.0)
M_PAPER = material('Paper', (0.65, 0.58, 0.45), rough=0.95, grime=0.5, scale=12.0)
M_LAMP = material('Lamp', (1.0, 0.7, 0.4), emit=(1.0, 0.68, 0.36), emit_strength=6.0)
M_SKY = material('Skylight', (0.6, 0.75, 1.0), emit=(0.55, 0.7, 1.0), emit_strength=3.0)
M_SCREEN = material('Screen', (0.3, 0.8, 1.0), emit=(0.25, 0.8, 1.0), emit_strength=4.0)
BOOKS = [material(f'Book{i}', c, rough=0.9, grime=0.4, scale=20.0) for i, c in enumerate([(0.35, 0.12, 0.10), (0.12, 0.16, 0.30), (0.30, 0.26, 0.14), (0.14, 0.26, 0.18), (0.40, 0.36, 0.30), (0.20, 0.10, 0.22)])]

# shell
box('Floor', (W, D, 0.3), (0, 0, -0.15), M_FLOOR, bevel=0)
box('Ceiling', (W, D, 0.4), (0, 0, H + 0.2), M_STONE, bevel=0)
box('WallWest', (0.6, D, H), (-W / 2, 0, H / 2), M_STONE, bevel=0.06)
box('WallEast', (0.6, D, H), (W / 2, 0, H / 2), M_STONE, bevel=0.06)
box('WallBack', (W, 0.6, H), (0, D / 2, H / 2), M_STONE, bevel=0.06)
box('WallFrontL', (W / 2 - 1.6, 0.6, H), (-W / 4 - 0.8, -D / 2, H / 2), M_STONE, bevel=0.06)
box('WallFrontR', (W / 2 - 1.6, 0.6, H), (W / 4 + 0.8, -D / 2, H / 2), M_STONE, bevel=0.06)
box('DoorArch', (3.2, 0.6, H - 4.6), (0, -D / 2, H - (H - 4.6) / 2), M_STONE, bevel=0.06)
box('DoorFrameL', (0.3, 0.8, 4.6), (-1.6, -D / 2, 2.3), M_IRON)
box('DoorFrameR', (0.3, 0.8, 4.6), (1.6, -D / 2, 2.3), M_IRON)
# pillars and vaulting beams
for i, y in enumerate(range(-12, 13, 6)):
    for x in (-W / 2 + 1.2, W / 2 - 1.2):
        cyl(f'Pillar{i}{x}', 0.45, H, (x, y, H / 2), M_STONE, verts=14)
        box(f'Capital{i}{x}', (1.2, 1.2, 0.35), (x, y, H - 0.4), M_STONE)
    box(f'Beam{i}', (W, 0.8, 0.6), (0, y, H - 0.3), M_STONE, bevel=0.04)
# the broken skylight: a long slot of cold light down the middle of the ceiling
box('SkyFrameL', (0.3, 14, 0.5), (-1.3, 4, H + 0.05), M_IRON)
box('SkyFrameR', (0.3, 14, 0.5), (1.3, 4, H + 0.05), M_IRON)
sky = box('SkyGlass', (2.3, 14, 0.05), (0, 4, H - 0.05), M_SKY, bevel=0, static=False)
area_light((0, 4, H - 0.3), 900, color=(0.6, 0.72, 1.0), size=2.0, rot=(0, 0, 0))
# shelving: two outer rows against the walls and two inner rows, with an aisle down the middle
SHELF_H, SHELF_D, SHELF_W = 5.2, 0.9, 4.0
def shelf_unit(k, x, y):
    box(f'ShelfBack{k}', (0.08, SHELF_W, SHELF_H), (x, y, SHELF_H / 2), M_WOOD, collide=True, pad=0.55)
    for side in (-1, 1):
        box(f'ShelfSide{k}{side}', (SHELF_D, 0.08, SHELF_H), (x, y + side * SHELF_W / 2, SHELF_H / 2), M_WOOD)
    for s in range(6):
        z = 0.3 + s * 0.85
        box(f'ShelfBoard{k}{s}', (SHELF_D, SHELF_W, 0.06), (x, y, z), M_WOOD)
        if s < 5:
            n = random.randint(9, 16)
            for b in range(n):
                w = 0.12 + random.random() * 0.14
                h = 0.4 + random.random() * 0.3
                by = y - SHELF_W / 2 + 0.2 + b * (SHELF_W - 0.4) / n
                if random.random() < 0.12:
                    continue
                box(f'Book{k}{s}{b}', (SHELF_D * 0.7, w, h), (x, by, z + 0.03 + h / 2), BOOKS[random.randrange(len(BOOKS))], bevel=0)
k = 0
for y in range(-10, 11, 5):
    for x in (-W / 2 + 1.0 + 0.45, W / 2 - 1.0 - 0.45):
        shelf_unit(k, x, y); k += 1
    if abs(y) > 2:
        for x in (-3.6, 3.6):
            shelf_unit(k, x, y); k += 1
# the collapsed shelf and scattered index boxes near the back
box('FallenShelf', (SHELF_H, SHELF_W, 0.1), (-3.0, 12.5, 0.4), M_WOOD, rot=(0, 0.18, 0.3), collide=True)
for i in range(14):
    box(f'IndexBox{i}', (0.5, 0.35, 0.3), (-4.5 + random.random() * 4, 11 + random.random() * 3, 0.15), M_PAPER, rot=(0, 0, random.random() * 3))
# the keeper's desk, lamp and reader
box('Desk', (3.0, 1.2, 0.1), (0, 11.5, 0.95), M_WOOD, collide=True)
for dx, dy in ((-1.3, -0.45), (1.3, -0.45), (-1.3, 0.45), (1.3, 0.45)):
    box(f'DeskLeg{dx}{dy}', (0.12, 0.12, 0.9), (dx, 11.5 + dy, 0.45), M_IRON)
cyl('LampStem', 0.03, 0.6, (0.9, 11.7, 1.3), M_BRASS, verts=10)
box('LampShade', (0.5, 0.5, 0.16), (0.9, 11.7, 1.62), M_BRASS, bevel=0.03)
box('LampGlow', (0.42, 0.42, 0.04), (0.9, 11.7, 1.55), M_LAMP, bevel=0, static=False)
area_light((0.9, 11.7, 1.5), 60, size=0.4)
box('Reader', (0.7, 0.5, 0.4), (-0.6, 11.6, 1.2), M_IRON)
box('ReaderScreen', (0.5, 0.04, 0.3), (-0.6, 11.35, 1.3), M_SCREEN, bevel=0, static=False, rot=(0.25, 0, 0))
box('Chair', (0.5, 0.5, 0.08), (0, 12.4, 0.5), M_WOOD)
box('ChairBack', (0.5, 0.06, 0.6), (0, 12.65, 0.85), M_WOOD)
# wall sconces, mostly dead
for i, y in enumerate((-9, 3, 9)):
    for x in (-W / 2 + 0.4, W / 2 - 0.4):
        box(f'Sconce{i}{x}', (0.2, 0.3, 0.5), (x, y, 3.2), M_IRON)
        if i == 1:
            box(f'SconceGlow{i}{x}', (0.12, 0.2, 0.3), (x + (0.08 if x < 0 else -0.08), y, 3.2), M_LAMP, bevel=0, static=False)
            area_light((x + (0.5 if x < 0 else -0.5), y, 3.2), 25, size=0.3)
# rubble by the door
for i in range(10):
    box(f'Rubble{i}', (0.3 + random.random() * 0.5, 0.3 + random.random() * 0.4, 0.2 + random.random() * 0.3), (-5 + random.random() * 3, -13 + random.random() * 2, 0.15), M_STONE, rot=(0, 0, random.random() * 3))

finish(scene, OUT, 'archive', ('Floor', 'Ceiling', 'Wall', 'Door', 'Pillar', 'Capital', 'Beam', 'Sky', 'Sconce', 'Rubble'), 1024 if FAST else 2048, 1024 if FAST else 2048)

meta = {
    'colliders': colliders_three(),
    'bounds': {'x': W / 2 - 1.0, 'z': D / 2 - 1.0},
    'spawn': {'pos': three(0.0, -13.0, 1.62), 'yaw': 0.0},
    'figures': [
        fig('SENNET BARR', 0.0, 13.2, 180),
        fig('ILEN SARVO', 1.8, 10.2, 150),
        fig('GREY COAT', -2.2, -11.5, 20),
    ],
}
with open(os.path.join(os.path.abspath(OUT), 'archive.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
