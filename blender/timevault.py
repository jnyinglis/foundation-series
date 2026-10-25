# The Time Vault on Terminus: a plain hall of seats facing a glass cubicle with
# an empty chair, under cool white light.
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(1)
scene = reset(FAST)
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.15, 0.16, 0.18, 1)

# Blender axes: X right, Y depth (cubicle at +Y, door at -Y), Z up.
W, D, H = 16.0, 20.0, 6.0
M_FLOOR = material('GreyFloor', (0.5, 0.5, 0.52), rough=0.3, metal=0.05, grime=0.15, scale=1.0, brick=(0.6, 0.006))
M_WALL = material('WallPanel', (0.78, 0.78, 0.76), rough=0.6, grime=0.08, scale=2.0, brick=(0.25, 0.01))
M_CEIL = material('WhiteCeiling', (0.85, 0.85, 0.84), rough=0.8, grime=0.05, scale=3.0)
M_BAND = material('BlueBand', (0.25, 0.35, 0.5), rough=0.5, grime=0.1, scale=6.0)
M_SEAT = material('Seat', (0.2, 0.22, 0.28), rough=0.85, grime=0.2, scale=10.0)
M_STEEL = material('Steel', (0.6, 0.62, 0.65), rough=0.3, metal=0.9, grime=0.1, scale=8.0)
M_CHAIR = material('OldChair', (0.3, 0.26, 0.22), rough=0.7, grime=0.25, scale=10.0)
M_STRIP = material('CoolStrip', (0.85, 0.9, 1.0), emit=(0.8, 0.88, 1.0), emit_strength=1.2)
M_SEAL = material('Seal', (0.85, 0.68, 0.32), rough=0.3, metal=0.9, grime=0.1, scale=8.0)
M_GLASS = material('CubicleGlass', (0.72, 0.82, 0.92), rough=0.15, metal=0.05, grime=0.05, scale=2.0)

box('Floor', (W, D, 0.3), (0, 0, -0.15), M_FLOOR, bevel=0)
box('Ceiling', (W, D, 0.3), (0, 0, H + 0.15), M_CEIL, bevel=0)
box('WallWest', (0.5, D, H), (-W / 2, 0, H / 2), M_WALL, bevel=0.02)
box('WallEast', (0.5, D, H), (W / 2, 0, H / 2), M_WALL, bevel=0.02)
box('WallBack', (W, 0.5, H), (0, D / 2, H / 2), M_WALL, bevel=0.02)
box('WallFrontL', (W / 2 - 1.2, 0.5, H), (-W / 4 - 0.6, -D / 2, H / 2), M_WALL, bevel=0.02)
box('WallFrontR', (W / 2 - 1.2, 0.5, H), (W / 4 + 0.6, -D / 2, H / 2), M_WALL, bevel=0.02)
box('DoorHead', (2.4, 0.5, H - 2.6), (0, -D / 2, 2.6 + (H - 2.6) / 2), M_WALL, bevel=0.02)
box('BandWest', (0.12, D, 0.25), (-W / 2 + 0.3, 0, 2.2), M_BAND, bevel=0)
box('BandEast', (0.12, D, 0.25), (W / 2 - 0.3, 0, 2.2), M_BAND, bevel=0)
box('BandBack', (W, 0.12, 0.25), (0, D / 2 - 0.3, 2.2), M_BAND, bevel=0)
# ceiling light strips
for y in (-6.0, -2.0, 2.0, 6.0):
    box(f'Strip{y}', (W - 4.0, 0.3, 0.05), (0, y, H - 0.05), M_STRIP, bevel=0, static=False)
    area_light((0, y, H - 0.3), 55, color=(0.9, 0.94, 1.0), size=3.0)
# seats: two blocks with a centre aisle
for r in range(6):
    y = -7.0 + r * 2.2
    for side in (-1, 1):
        x = side * 3.6
        box(f'SeatRow{r}{side}', (5.4, 0.55, 0.1), (x, y, 0.47), M_SEAT, bevel=0.02, collide=True, pad=0.25)
        box(f'SeatBack{r}{side}', (5.4, 0.08, 0.5), (x, y + 0.3, 0.75), M_SEAT, bevel=0.02)
        box(f'SeatRail{r}{side}', (5.4, 0.6, 0.06), (x, y, 0.2), M_STEEL, bevel=0.01)
        for k in range(5):
            cyl(f'SeatLeg{r}{side}{k}', 0.03, 0.42, (x - 2.4 + k * 1.2, y, 0.21), M_STEEL, verts=8)
# the platform and the glass cubicle
box('Platform', (6.0, 3.6, 0.35), (0, 7.0, 0.175), M_FLOOR, bevel=0.02, collide=True, pad=0.3)
box('PlatformEdge', (6.1, 3.7, 0.04), (0, 7.0, 0.36), M_STEEL, bevel=0)
CX, CY = 0.0, 7.4
for (x, y) in ((-1.4, CY - 1.4), (1.4, CY - 1.4), (-1.4, CY + 1.4), (1.4, CY + 1.4)):
    cyl(f'CubPost{x}{y}', 0.05, 2.8, (x, y, 0.35 + 1.4), M_STEEL, verts=10)
for (x, y, w, d) in ((0, CY - 1.4, 2.9, 0.06), (0, CY + 1.4, 2.9, 0.06), (-1.4, CY, 0.06, 2.9), (1.4, CY, 0.06, 2.9)):
    box(f'CubRail{x}{y}', (w, d, 0.06), (x, y, 3.15), M_STEEL, bevel=0)
    box(f'CubBase{x}{y}', (w, d, 0.06), (x, y, 0.38), M_STEEL, bevel=0)
box('CubGlassBack', (2.8, 0.03, 2.7), (0, CY + 1.4, 0.35 + 1.4), M_GLASS, bevel=0)
box('CubGlassL', (0.03, 2.8, 2.7), (-1.4, CY, 0.35 + 1.4), M_GLASS, bevel=0)
box('CubGlassR', (0.03, 2.8, 2.7), (1.4, CY, 0.35 + 1.4), M_GLASS, bevel=0)
box('CubRoof', (2.9, 2.9, 0.08), (0, CY, 3.2), M_STEEL, bevel=0.01)
box('CubLight', (2.4, 2.4, 0.03), (0, CY, 3.14), M_STRIP, bevel=0, static=False)
area_light((0, CY, 3.0), 20, color=(0.7, 0.85, 1.0), size=1.6)
# Seldon's chair
box('ChairSeat', (0.8, 0.8, 0.12), (CX, CY, 0.35 + 0.5), M_CHAIR, bevel=0.03)
box('ChairBack', (0.8, 0.12, 0.9), (CX, CY + 0.35, 0.35 + 0.95), M_CHAIR, bevel=0.03)
for side in (-1, 1):
    box(f'ChairArm{side}', (0.1, 0.8, 0.08), (CX + side * 0.4, CY, 0.35 + 0.75), M_CHAIR, bevel=0.02)
    cyl(f'ChairWheel{side}', 0.3, 0.05, (CX + side * 0.46, CY + 0.1, 0.35 + 0.3), M_STEEL, verts=20, rot=(0, math.radians(90), 0))
cyl('ChairWheelF', 0.12, 0.05, (CX, CY - 0.35, 0.35 + 0.12), M_STEEL, verts=14, rot=(0, math.radians(90), 0))
# the Foundation seal on the back wall, and the keeper's console
cyl('SealRing', 1.1, 0.05, (0, D / 2 - 0.26, 4.2), M_SEAL, verts=48, rot=(math.radians(90), 0, 0))
cyl('SealDisc', 0.9, 0.04, (0, D / 2 - 0.26, 4.2), M_BAND, verts=48, rot=(math.radians(90), 0, 0))
box('SealBar', (1.6, 0.05, 0.12), (0, D / 2 - 0.3, 4.2), M_SEAL, bevel=0)
box('Console', (1.4, 0.7, 1.0), (-5.5, 5.5, 0.5), M_STEEL, bevel=0.02, collide=True, pad=0.25)
box('ConsoleTop', (1.4, 0.7, 0.05), (-5.5, 5.5, 1.02), M_BAND, bevel=0.01)
box('ConsoleScreen', (0.8, 0.04, 0.4), (-5.5, 5.3, 1.3), M_STRIP, bevel=0, static=False, rot=(0.35, 0, 0))

finish(scene, OUT, 'timevault', ('Floor', 'Ceiling', 'Wall', 'Door', 'Band', 'Platform', 'Cub', 'Console', 'Seal'), 1024 if FAST else 2048, 1024 if FAST else 2048)
meta = {
    'colliders': colliders_three(),
    'bounds': {'x': W / 2 - 0.9, 'z': D / 2 - 0.9},
    'spawn': {'pos': three(0.0, -8.6, 1.62), 'yaw': 0.0},
    'figures': [
        fig('KEEPER DORNE', -1.6, 4.6, 20),
        fig('CHAIR AMMEL', 0.9, 4.9, 345),
        fig('STUDENT', 4.2, -7.1, 0, seated=True, face=(4.2, 7.0), seat=0.52),
        fig('ILEN SARVO', -1.4, -4.2, 160),
        fig('CORIN PELLIS', 1.4, -4.0, 200),
    ],
    'tables': [],
}
with open(os.path.join(os.path.abspath(OUT), 'timevault.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
