# The Galactic Library on Trantor: a reading rotunda under a dome, with a
# catalogue console at the centre, galleries, and shelves around the wall.
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(5)
scene = reset(FAST)

R, H = 13.0, 11.0   # rotunda radius and wall height; door at -Y

M_MARBLE = material('Marble', (0.72, 0.70, 0.66), rough=0.35, grime=0.2, scale=1.2, brick=(0.5, 0.01))
M_FLOOR = material('FloorMarble', (0.55, 0.52, 0.48), rough=0.3, grime=0.3, scale=1.5, brick=(0.7, 0.01))
M_WOOD = material('Walnut', (0.30, 0.19, 0.11), rough=0.6, grime=0.3, scale=8.0)
M_BRASS = material('Brass', (0.6, 0.47, 0.25), rough=0.35, metal=0.9, grime=0.3, scale=10.0)
M_DARK = material('DarkSteel', (0.1, 0.11, 0.13), rough=0.5, metal=0.7, grime=0.3, scale=8.0)
M_LAMP = material('Lamp', (1.0, 0.85, 0.6), emit=(1.0, 0.85, 0.6), emit_strength=5.0)
M_SCREEN = material('Screen', (0.3, 0.8, 1.0), emit=(0.3, 0.8, 1.0), emit_strength=4.0)
M_OCULUS = material('Oculus', (0.9, 0.92, 1.0), emit=(0.85, 0.9, 1.0), emit_strength=6.0)
BOOKS = [material(f'Book{i}', c, rough=0.9, grime=0.3, scale=20.0) for i, c in enumerate([(0.45, 0.15, 0.12), (0.15, 0.2, 0.4), (0.4, 0.33, 0.18), (0.18, 0.32, 0.22), (0.5, 0.45, 0.38), (0.25, 0.12, 0.28)])]

N = 28
# floor, wall segments, pillars, galleries
cyl('Floor', R + 1, 0.3, (0, 0, -0.15), M_FLOOR, verts=64)
for i in range(N):
    a = (i + 0.5) / N * 2 * math.pi
    x, y = math.cos(a) * R, math.sin(a) * R
    seg = 2 * math.pi * R / N
    if abs(a - 1.5 * math.pi) < 0.25:  # door gap at -Y
        box(f'DoorLintel{i}', (seg + 0.3, 0.8, H - 4.5), (x, y, H - (H - 4.5) / 2), M_MARBLE, bevel=0.05, rot=(0, 0, a + math.pi / 2))
        continue
    box(f'Wall{i}', (seg + 0.3, 0.8, H), (x, y, H / 2), M_MARBLE, bevel=0.05, rot=(0, 0, a + math.pi / 2))
    # shelves on the lower wall and the gallery wall
    for z0 in (0.2, 5.0):
        sx, sy = math.cos(a) * (R - 0.75), math.sin(a) * (R - 0.75)
        box(f'ShelfBack{i}{z0}', (seg - 0.5, 0.1, 3.4), (sx, sy, z0 + 1.7), M_WOOD, rot=(0, 0, a + math.pi / 2))
        for s in range(4):
            z = z0 + 0.3 + s * 0.8
            bx, by = math.cos(a) * (R - 1.05), math.sin(a) * (R - 1.05)
            box(f'Board{i}{z0}{s}', (seg - 0.5, 0.6, 0.05), (bx, by, z), M_WOOD, rot=(0, 0, a + math.pi / 2))
            n = random.randint(7, 11)
            for b in range(n):
                t = (b + 0.5) / n - 0.5
                w = 0.14 + random.random() * 0.1
                h = 0.4 + random.random() * 0.25
                px = bx - math.sin(a) * t * (seg - 0.6)
                py = by + math.cos(a) * t * (seg - 0.6)
                if random.random() < 0.1:
                    continue
                box(f'Book{i}{z0}{s}{b}', (w, 0.42, h), (px, py, z + 0.03 + h / 2), BOOKS[random.randrange(6)], bevel=0, rot=(0, 0, a + math.pi / 2))
    if i % 2 == 0:
        px, py = math.cos(a) * (R - 2.3), math.sin(a) * (R - 2.3)
        cyl(f'Pillar{i}', 0.35, H, (px, py, H / 2), M_MARBLE, verts=16)
        cyl(f'PillarCap{i}', 0.55, 0.3, (px, py, H - 0.15), M_BRASS, verts=16)
        box(f'Sconce{i}', (0.3, 0.3, 0.12), (px, py, 4.6), M_LAMP, bevel=0, static=False)
        area_light((px, py, 4.4), 40, size=0.4)
# gallery ring at mid height with a brass rail
for i in range(N):
    a = (i + 0.5) / N * 2 * math.pi
    rm = R - 1.4
    box(f'Gallery{i}', (2 * math.pi * rm / N + 0.1, 2.4, 0.25), (math.cos(a) * rm, math.sin(a) * rm, 4.7), M_MARBLE, bevel=0.02, rot=(0, 0, a + math.pi / 2))
for i in range(48):
    a = i / 48 * 2 * math.pi
    cyl(f'RailPost{i}', 0.03, 1.0, (math.cos(a) * (R - 2.6), math.sin(a) * (R - 2.6), 5.3), M_BRASS, verts=8)
cyl('RailTop', R - 2.6, 0.06, (0, 0, 5.8), M_BRASS, verts=64)
cyl('RailTopInner', R - 2.72, 0.07, (0, 0, 5.8), M_MARBLE, verts=64)
# dome and oculus
bpy.ops.mesh.primitive_uv_sphere_add(radius=R + 0.6, location=(0, 0, H), segments=48, ring_count=24)
dome = bpy.context.active_object
dome.name = 'Dome'
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.bisect(plane_co=(0, 0, H), plane_no=(0, 0, -1), clear_outer=True); bpy.ops.object.mode_set(mode='OBJECT')
dome.data.materials.append(M_MARBLE)
from common import STATIC
STATIC.append(dome)
cyl('OculusRing', 3.2, 0.4, (0, 0, H + R + 0.2), M_BRASS, verts=48)
oc = cyl('OculusGlass', 3.0, 0.05, (0, 0, H + R + 0.1), M_OCULUS, static=False, verts=48)
area_light((0, 0, H + R - 0.5), 2500, color=(0.9, 0.93, 1.0), size=5.0)
# the catalogue console at the centre
cyl('ConsoleBase', 2.2, 1.0, (0, 0, 0.5), M_DARK, verts=32)
COLLIDERS.append({'min': [-2.7, -2.7], 'max': [2.7, 2.7]})
cyl('ConsoleTop', 2.3, 0.1, (0, 0, 1.05), M_BRASS, verts=32)
cyl('ConsoleSpire', 0.35, 4.0, (0, 0, 3.0), M_DARK, verts=16)
for i in range(8):
    a = i / 8 * 2 * math.pi
    box(f'ConsoleScreen{i}', (0.7, 0.04, 0.4), (math.cos(a) * 1.9, math.sin(a) * 1.9, 1.35), M_SCREEN, bevel=0, static=False, rot=(0.35, 0, a + math.pi / 2))
    box(f'SpireLight{i}', (0.1, 0.1, 2.5), (math.cos(a) * 0.4, math.sin(a) * 0.4, 3.0), M_SCREEN, bevel=0, static=False)
area_light((0, 0, 2.5), 80, color=(0.4, 0.8, 1.0), size=1.5)
# radial reading tables
for i in range(8):
    a = i / 8 * 2 * math.pi + math.pi / 8
    x, y = math.cos(a) * 7.0, math.sin(a) * 7.0
    box(f'Table{i}', (3.2, 1.1, 0.08), (x, y, 0.92), M_WOOD, bevel=0.02, rot=(0, 0, a), collide=True, pad=0.5)
    for s in (-1, 1):
        box(f'TableLeg{i}{s}', (0.12, 0.9, 0.9), (x + math.cos(a) * s * 1.4, y + math.sin(a) * s * 1.4, 0.45), M_DARK, rot=(0, 0, a))
    box(f'TableLamp{i}', (0.5, 0.14, 0.1), (x, y, 1.1), M_LAMP, bevel=0, static=False, rot=(0, 0, a))
    area_light((x, y, 1.3), 14, size=0.4)
    for s in (-1, 1):
        cx, cy = x - math.sin(a) * s * 0.9, y + math.cos(a) * s * 0.9
        box(f'Chair{i}{s}', (0.5, 0.5, 0.08), (cx, cy, 0.5), M_WOOD)
        box(f'ChairBack{i}{s}', (0.5, 0.06, 0.6), (cx - math.sin(a) * s * 0.25, cy + math.cos(a) * s * 0.25, 0.85), M_WOOD, rot=(0, 0, a))

finish(scene, OUT, 'library', ('Floor', 'Wall', 'Door', 'Pillar', 'Dome', 'Oculus', 'Gallery', 'Rail'), 1024 if FAST else 2048, 1024 if FAST else 2048)
meta = {
    'colliders': colliders_three(),
    'bounds': {'x': R - 1.8, 'z': R - 1.8},
    'spawn': {'pos': three(0.0, -(R - 2.5), 1.62), 'yaw': 0.0},
    'figures': [
        fig('DIRA VELM', 1.6, 3.4, 200),
        fig('ILEN SARVO', -1.9, 3.2, 150),
        fig('CORIN PELLIS', 3.5, -4.5, 300),
    ],
}
with open(os.path.join(os.path.abspath(OUT), 'library.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
