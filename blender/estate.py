# A Solarian estate hall: white, immaculate, silent. Tall windows, a long table,
# and robots standing in alcoves along both walls.
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(51)
scene = reset(FAST)
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.3, 0.33, 0.36, 1)

W, D, H = 14.0, 26.0, 6.0
M_WHITE = material('WhiteStone', (0.88, 0.88, 0.86), rough=0.35, grime=0.08, scale=1.0)
M_FLOOR = material('WhiteFloor', (0.8, 0.8, 0.78), rough=0.15, metal=0.1, grime=0.1, scale=1.5, brick=(0.4, 0.006))
M_IVORY = material('Ivory', (0.92, 0.9, 0.84), rough=0.4, grime=0.05, scale=4.0)
M_GOLD = material('PaleGold', (0.8, 0.7, 0.45), rough=0.3, metal=0.9, grime=0.1, scale=8.0)
M_GLASS = material('WindowLight', (0.9, 0.95, 1.0), emit=(0.85, 0.92, 1.0), emit_strength=1.6)
M_SCREEN = material('Panel', (0.6, 0.9, 1.0), emit=(0.5, 0.85, 1.0), emit_strength=2.0)

box('Floor', (W, D, 0.3), (0, 0, -0.15), M_FLOOR, bevel=0)
box('Ceiling', (W, D, 0.3), (0, 0, H + 0.15), M_WHITE, bevel=0)
box('WallBack', (W, 0.5, H), (0, D / 2, H / 2), M_WHITE, bevel=0.03)
box('WallFrontL', (W / 2 - 1.4, 0.5, H), (-W / 4 - 0.7, -D / 2, H / 2), M_WHITE, bevel=0.03)
box('WallFrontR', (W / 2 - 1.4, 0.5, H), (W / 4 + 0.7, -D / 2, H / 2), M_WHITE, bevel=0.03)
box('DoorHead', (2.8, 0.5, H - 3.4), (0, -D / 2, H - (H - 3.4) / 2), M_WHITE, bevel=0.03)
# side walls as piers with tall windows between, and alcoves for the robots
for i, y in enumerate(range(-11, 12, 2)):
    for side, x in ((-1, -W / 2), (1, W / 2)):
        if i % 2 == 0:
            box(f'Pier{i}{side}', (0.5, 1.0, H), (x, y, H / 2), M_WHITE, bevel=0.03)
            box(f'Alcove{i}{side}', (0.9, 1.0, 2.6), (x - side * 0.45, y, 1.3), M_IVORY, bevel=0.02)
        else:
            box(f'Window{i}{side}', (0.1, 1.0, H - 1.0), (x, y, H / 2 + 0.3), M_GLASS, bevel=0, static=False)
            area_light((x - side * 0.6, y, H / 2), 32, color=(0.85, 0.92, 1.0), size=1.4, rot=(0, math.radians(90) * -side, 0))
            box(f'Sill{i}{side}', (0.6, 1.1, 0.12), (x, y, 0.75), M_WHITE, bevel=0.02)
# ceiling coffers with light
for r in range(6):
    y = -10 + r * 4
    box(f'Coffer{r}', (W - 3, 2.6, 0.2), (0, y, H - 0.1), M_IVORY, bevel=0.02)
    box(f'CofferLight{r}', (W - 3.6, 0.3, 0.04), (0, y, H - 0.2), M_GLASS, bevel=0, static=False)
    area_light((0, y, H - 0.4), 24, color=(1.0, 0.97, 0.92), size=2.5)
# the long table and the Solarian's chair at the far end
box('Table', (2.0, 12.0, 0.08), (0, 1.0, 0.92), M_IVORY, bevel=0.02, collide=True, pad=0.4)
for y in (-4.5, 1.0, 6.5):
    box(f'TableLeg{y}', (1.6, 0.15, 0.88), (0, y, 0.44), M_GOLD)
for i in range(5):
    box(f'TablePanel{i}', (0.5, 0.35, 0.03), (0, -4 + i * 2.5, 0.98), M_SCREEN, bevel=0, static=False)
box('Chair', (0.9, 0.9, 0.1), (0, 9.2, 0.5), M_IVORY, bevel=0.02)
box('ChairBack', (0.9, 0.1, 1.2), (0, 9.6, 1.1), M_IVORY, bevel=0.02)
cyl('Dais', 3.0, 0.3, (0, 9.6, 0.15), M_FLOOR, verts=32)

finish(scene, OUT, 'estate', ('Floor', 'Ceiling', 'Wall', 'Door', 'Pier', 'Alcove', 'Sill', 'Coffer', 'Dais'), 1024 if FAST else 2048, 1024 if FAST else 2048)
alc = [(-W / 2 + 0.75, y) for y in (-11, -7, -3, 1, 5, 9)] + [(W / 2 - 0.75, y) for y in (-11, -7, -3, 1, 5, 9)]
robots = []
for k, (x, y) in enumerate(alc[:10]):
    robots.append({'name': f'ROBOT {k}', 'pos': three(x, y, 0.0), 'yaw': round(math.atan2(-x, 0.0001), 4), 'seated': False})
meta = {
    'colliders': colliders_three(),
    'bounds': {'x': W / 2 - 1.3, 'z': D / 2 - 0.8},
    'spawn': {'pos': three(0.0, -9.0, 1.62), 'yaw': 0.0},
    'figures': [fig('RYDEL BANDER', 0.0, 8.4, 180), fig('ILEN SARVO', -1.9, -4.0, 150), fig('CORIN PELLIS', 1.9, -5.0, 210)] + robots,
}
with open(os.path.join(os.path.abspath(OUT), 'estate.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
