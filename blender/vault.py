# The Ministry archive vault on Comporellon: cold, grey, institutional. Rows of
# steel cabinets, white strip lights, a reading desk, and one heavy door.
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(31)
scene = reset(FAST)

W, D, H = 14.0, 22.0, 4.2

M_WALL = material('ColdWall', (0.55, 0.58, 0.6), rough=0.7, grime=0.2, scale=1.0, brick=(0.3, 0.01))
M_FLOOR = material('ColdFloor', (0.35, 0.37, 0.4), rough=0.4, metal=0.2, grime=0.25, scale=1.2, brick=(0.6, 0.008))
M_CEIL = material('ColdCeiling', (0.5, 0.52, 0.55), rough=0.8, grime=0.2, scale=1.0)
M_STEEL = material('CabinetSteel', (0.5, 0.53, 0.56), rough=0.45, metal=0.8, grime=0.2, scale=6.0)
M_DARK = material('DarkSteel', (0.12, 0.13, 0.15), rough=0.5, metal=0.7, grime=0.3, scale=6.0)
M_STRIP = material('Strip', (0.9, 0.95, 1.0), emit=(0.85, 0.92, 1.0), emit_strength=4.0)
M_SCREEN = material('Screen', (0.6, 0.9, 1.0), emit=(0.5, 0.85, 1.0), emit_strength=3.0)
M_RED = material('RedLamp', (1.0, 0.2, 0.15), emit=(1.0, 0.15, 0.1), emit_strength=5.0)

box('Floor', (W, D, 0.3), (0, 0, -0.15), M_FLOOR, bevel=0)
box('Ceiling', (W, D, 0.3), (0, 0, H + 0.15), M_CEIL, bevel=0)
box('WallWest', (0.4, D, H), (-W / 2, 0, H / 2), M_WALL, bevel=0.03)
box('WallEast', (0.4, D, H), (W / 2, 0, H / 2), M_WALL, bevel=0.03)
box('WallBack', (W, 0.4, H), (0, D / 2, H / 2), M_WALL, bevel=0.03)
box('WallFrontL', (W / 2 - 1.2, 0.4, H), (-W / 4 - 0.6, -D / 2, H / 2), M_WALL, bevel=0.03)
box('WallFrontR', (W / 2 - 1.2, 0.4, H), (W / 4 + 0.6, -D / 2, H / 2), M_WALL, bevel=0.03)
box('DoorHead', (2.4, 0.4, H - 2.8), (0, -D / 2, H - (H - 2.8) / 2), M_WALL, bevel=0.03)
box('DoorFrame', (2.6, 0.6, 0.15), (0, -D / 2, 2.85), M_DARK)
box('DoorLeaf', (2.2, 0.2, 2.8), (0, -D / 2 - 0.3, 1.4), M_DARK, bevel=0.02)
box('DoorLamp', (0.3, 0.1, 0.1), (0, -D / 2 + 0.25, 3.1), M_RED, bevel=0, static=False)
area_light((0, -D / 2 + 0.6, 3.0), 10, color=(1.0, 0.2, 0.15), size=0.3)
# strip lights along the ceiling
for r in range(5):
    y = -8 + r * 4
    for x in (-4.0, 0.0, 4.0):
        box(f'StripHousing{r}{x}', (1.6, 0.3, 0.08), (x, y, H - 0.05), M_DARK)
        box(f'Strip{r}{x}', (1.4, 0.2, 0.03), (x, y, H - 0.1), M_STRIP, bevel=0, static=False)
        area_light((x, y, H - 0.15), 55, color=(0.85, 0.92, 1.0), size=1.4)
# cabinet rows
k = 0
for y in range(-7, 8, 3):
    for x in (-5.2, -2.6, 2.6, 5.2):
        box(f'Cabinet{k}', (1.4, 2.2, 2.6), (x, y, 1.3), M_STEEL, bevel=0.02, collide=True, pad=0.4)
        for d in range(5):
            box(f'Drawer{k}{d}', (1.2, 0.04, 0.4), (x, y - 1.12, 0.35 + d * 0.5), M_DARK, bevel=0.01)
            box(f'Handle{k}{d}', (0.3, 0.04, 0.03), (x, y - 1.15, 0.35 + d * 0.5), M_STRIP if random.random() < 0.08 else M_STEEL, bevel=0, static=random.random() >= 0.08)
        k += 1
# reading desk at the back
box('Desk', (3.4, 1.2, 0.08), (0, 8.4, 0.9), M_STEEL, bevel=0.02, collide=True)
for dx in (-1.5, 1.5):
    box(f'DeskLeg{dx}', (0.1, 1.0, 0.86), (dx, 8.4, 0.43), M_DARK)
box('Terminal', (0.8, 0.4, 0.5), (0.6, 8.6, 1.2), M_DARK, bevel=0.02)
box('TerminalScreen', (0.7, 0.04, 0.4), (0.6, 8.38, 1.22), M_SCREEN, bevel=0, static=False, rot=(0.2, 0, 0))
box('Chair', (0.5, 0.5, 0.06), (0, 9.3, 0.48), M_DARK)
box('ChairBack', (0.5, 0.05, 0.5), (0, 9.55, 0.8), M_DARK)

finish(scene, OUT, 'vault', ('Floor', 'Ceiling', 'Wall', 'Door', 'StripHousing'), 1024 if FAST else 2048, 1024 if FAST else 2048)
meta = {
    'colliders': colliders_three(),
    'bounds': {'x': W / 2 - 0.8, 'z': D / 2 - 0.8},
    'spawn': {'pos': three(0.0, -6.5, 1.62), 'yaw': 0.0},
    'figures': [
        fig('ALDO DENIADOR', 0.9, 9.9, 180),
        fig('ILEN SARVO', -1.4, 6.9, 150),
        fig('CORIN PELLIS', 1.6, 4.0, 210),
        fig('GREY COAT', -0.9, -9.6, 10),
        fig('CAPTAIN VOS', 1.0, -9.8, -10),
    ],
}
with open(os.path.join(os.path.abspath(OUT), 'vault.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
