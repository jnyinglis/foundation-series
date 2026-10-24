# Daneel's chamber inside the Moon: a vast dim dome of dark glass, a ring of
# consoles, and a great window with Earth hanging in it.
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS, STATIC, GLOW

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(71)
scene = reset(FAST)

R, H = 16.0, 10.0
M_GLASS = material('DarkGlass', (0.06, 0.07, 0.09), rough=0.12, metal=0.3, grime=0.1, scale=1.0)
M_WALL = material('MoonWall', (0.18, 0.19, 0.22), rough=0.6, metal=0.4, grime=0.2, scale=1.0)
M_STEEL = material('OldSteel', (0.3, 0.32, 0.36), rough=0.45, metal=0.85, grime=0.3, scale=6.0)
M_SCREEN = material('ConsoleScreen', (0.3, 0.7, 1.0), emit=(0.3, 0.7, 1.0), emit_strength=2.0)
M_EARTH = material('EarthDisc', (0.4, 0.6, 1.0), emit=(0.55, 0.7, 1.0), emit_strength=1.3)
M_STRIP = material('Strip', (0.6, 0.75, 1.0), emit=(0.6, 0.75, 1.0), emit_strength=2.5)
M_WARM = material('WarmLamp', (1.0, 0.8, 0.55), emit=(1.0, 0.78, 0.5), emit_strength=4.0)

cyl('Floor', R + 1, 0.3, (0, 0, -0.15), M_GLASS, verts=64)
N = 32
for i in range(N):
    a = (i + 0.5) / N * 2 * math.pi
    seg = 2 * math.pi * R / N
    x, y = math.cos(a) * R, math.sin(a) * R
    if abs(a - math.pi / 2) < 0.5:
        continue  # the window at +Y
    box(f'Wall{i}', (seg + 0.3, 0.8, H), (x, y, H / 2), M_WALL, bevel=0.03, rot=(0, 0, a + math.pi / 2))
    if i % 2 == 0:
        box(f'WallStrip{i}', (seg - 0.6, 0.1, 0.06), (math.cos(a) * (R - 0.45), math.sin(a) * (R - 0.45), 2.0), M_STRIP, bevel=0, static=False, rot=(0, 0, a + math.pi / 2))
# the window frame and Earth
box('WindowFrameL', (0.6, 0.8, H), (math.cos(math.pi / 2 - 0.55) * R, math.sin(math.pi / 2 - 0.55) * R, H / 2), M_STEEL, rot=(0, 0, math.pi / 2 - 0.55 + math.pi / 2))
box('WindowFrameR', (0.6, 0.8, H), (math.cos(math.pi / 2 + 0.55) * R, math.sin(math.pi / 2 + 0.55) * R, H / 2), M_STEEL, rot=(0, 0, math.pi / 2 + 0.55 + math.pi / 2))
box('WindowHead', (2 * R * math.sin(0.55) + 1, 0.8, 1.0), (0, R, H - 0.5), M_STEEL)
box('WindowSill', (2 * R * math.sin(0.55) + 1, 0.8, 1.0), (0, R, 0.5), M_STEEL)
cyl('Earth', 3.2, 0.1, (0, R + 6, 5.5), M_EARTH, static=False, verts=48, rot=(math.radians(90), 0, 0))
area_light((0, R + 2, 5.5), 220, color=(0.55, 0.7, 1.0), size=6.0, rot=(math.radians(-90), 0, 0))
# dome: upper half sphere
bpy.ops.mesh.primitive_uv_sphere_add(radius=R + 0.4, location=(0, 0, H), segments=48, ring_count=24)
dome = bpy.context.active_object; dome.name = 'Dome'
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.bisect(plane_co=(0, 0, H), plane_no=(0, 0, -1), clear_outer=True); bpy.ops.object.mode_set(mode='OBJECT')
dome.data.materials.append(M_WALL); STATIC.append(dome)
# ring of consoles
for i in range(12):
    a = i / 12 * 2 * math.pi
    if abs(a - math.pi / 2) < 0.6:
        continue
    x, y = math.cos(a) * 9.0, math.sin(a) * 9.0
    box(f'Console{i}', (2.2, 0.9, 1.0), (x, y, 0.5), M_STEEL, bevel=0.02, rot=(0, 0, a + math.pi / 2), collide=True, pad=0.4)
    box(f'ConsoleScreen{i}', (1.8, 0.05, 0.6), (math.cos(a) * 8.55, math.sin(a) * 8.55, 1.25), M_SCREEN, bevel=0, static=False, rot=(0.3, 0, a + math.pi / 2))
    area_light((math.cos(a) * 8.0, math.sin(a) * 8.0, 1.4), 12, color=(0.3, 0.7, 1.0), size=0.8)
# the dais and the old chair
cyl('Dais', 3.0, 0.4, (0, 7.0, 0.2), M_STEEL, verts=40)
COLLIDERS.append({'min': [-3.2, 3.8], 'max': [3.2, 10.2]})
box('Chair', (0.9, 0.9, 0.1), (0, 8.2, 0.9), M_STEEL, bevel=0.02)
box('ChairBack', (0.9, 0.1, 1.2), (0, 8.6, 1.5), M_STEEL, bevel=0.02)
box('DaisLamp', (0.3, 0.3, 0.1), (1.6, 6.0, 1.0), M_WARM, bevel=0, static=False)
area_light((1.6, 6.0, 1.3), 25, size=0.4)
# a few relics: a case with a metal arm in it, a plinth
box('RelicCase', (1.2, 0.6, 1.1), (-5.5, -3.0, 0.55), M_STEEL, bevel=0.02, collide=True)
box('RelicGlass', (1.1, 0.5, 0.5), (-5.5, -3.0, 1.35), M_SCREEN, bevel=0, static=False)
cyl('Plinth', 0.5, 1.2, (5.5, -3.0, 0.6), M_STEEL, verts=16)
COLLIDERS.append({'min': [5.0, -3.5], 'max': [6.0, -2.5]})

finish(scene, OUT, 'moon', ('Floor', 'Wall', 'Window', 'Dome', 'Dais'), 1024 if FAST else 2048, 1024 if FAST else 2048)
meta = {
    'colliders': colliders_three(),
    'bounds': {'x': R - 1.5, 'z': R - 1.5},
    'spawn': {'pos': three(0.0, -8.0, 1.62), 'yaw': 0.0},
    'figures': [
        fig('DANEEL', 0.0, 6.2, 180),
        fig('GREY COAT', 2.6, 4.6, 200),
        fig('ILEN SARVO', -1.8, -1.0, 170),
        fig('CORIN PELLIS', 1.8, -1.4, 190),
    ],
}
with open(os.path.join(os.path.abspath(OUT), 'moon.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
