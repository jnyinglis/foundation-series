# The Salon of Fortunes in the Warlord's Palace on Kalgan: red velvet, gold,
# black marble, chandeliers, gaming tables, and tall windows on the night city.
import bpy, math, os, sys, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import reset, material, box, cyl, area_light, finish, three, colliders_three, fig, COLLIDERS

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else 'public/scenes'
FAST = '--fast' in argv
random.seed(71)
scene = reset(FAST)
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.02, 0.008, 0.01, 1)

# Blender axes: X right, Y depth (windows at +Y, door at -Y), Z up.
W, D, H = 20.0, 18.0, 7.0
M_FLOOR = material('Marble', (0.07, 0.065, 0.075), rough=0.12, metal=0.25, grime=0.25, scale=1.2, brick=(0.5, 0.006))
M_VELVET = material('Velvet', (0.4, 0.06, 0.08), rough=0.95, grime=0.3, scale=3.0)
M_GOLD = material('Gold', (0.9, 0.68, 0.32), rough=0.28, metal=0.95, grime=0.12, scale=8.0)
M_CEIL = material('DarkCeiling', (0.12, 0.07, 0.07), rough=0.8, grime=0.25, scale=4.0)
M_FELT = material('Felt', (0.05, 0.3, 0.14), rough=0.95, grime=0.2, scale=10.0)
M_WOOD = material('DarkWood', (0.15, 0.08, 0.05), rough=0.45, grime=0.3, scale=8.0)
M_LEATHER = material('RedLeather', (0.32, 0.08, 0.08), rough=0.75, grime=0.25, scale=10.0)
M_LAMP = material('Lamp', (1.0, 0.8, 0.5), emit=(1.0, 0.78, 0.48), emit_strength=2.0)
M_CANDLE = material('Candle', (1.0, 0.7, 0.4), emit=(1.0, 0.66, 0.36), emit_strength=2.5)

# windows: the night city of Kalgan, pink and gold at the horizon, violet above
M_WINDOW = bpy.data.materials.new('CityWindow')
M_WINDOW.use_nodes = True
nt = M_WINDOW.node_tree
nt.nodes.clear()
wout = nt.nodes.new('ShaderNodeOutputMaterial')
wem = nt.nodes.new('ShaderNodeEmission')
wem.inputs['Strength'].default_value = 0.8
wtex = nt.nodes.new('ShaderNodeTexCoord')
wgrad = nt.nodes.new('ShaderNodeTexGradient')
wmap = nt.nodes.new('ShaderNodeMapping')
wmap.inputs['Rotation'].default_value = (0, 0, math.radians(90))
nt.links.new(wtex.outputs['UV'], wmap.inputs['Vector'])
nt.links.new(wmap.outputs['Vector'], wgrad.inputs['Vector'])
wramp = nt.nodes.new('ShaderNodeValToRGB')
wramp.color_ramp.elements[0].color = (1.0, 0.45, 0.35, 1)
wramp.color_ramp.elements[1].color = (0.18, 0.08, 0.35, 1)
e = wramp.color_ramp.elements.new(0.45)
e.color = (0.85, 0.3, 0.5, 1)
nt.links.new(wgrad.outputs['Fac'], wramp.inputs['Fac'])
nt.links.new(wramp.outputs['Color'], wem.inputs['Color'])
nt.links.new(wem.outputs[0], wout.inputs[0])

# ---------------------------------------------------------------- the room
box('Floor', (W, D, 0.3), (0, 0, -0.15), M_FLOOR, bevel=0)
box('Ceiling', (W, D, 0.3), (0, 0, H + 0.15), M_CEIL, bevel=0)
box('WallWest', (0.5, D, H), (-W / 2, 0, H / 2), M_VELVET, bevel=0.03)
box('WallEast', (0.5, D, H), (W / 2, 0, H / 2), M_VELVET, bevel=0.03)
box('WallFrontL', (W / 2 - 1.5, 0.5, H), (-W / 4 - 0.75, -D / 2, H / 2), M_VELVET, bevel=0.03)
box('WallFrontR', (W / 2 - 1.5, 0.5, H), (W / 4 + 0.75, -D / 2, H / 2), M_VELVET, bevel=0.03)
box('DoorHead', (3.0, 0.5, H - 4.2), (0, -D / 2, H - (H - 4.2) / 2), M_VELVET, bevel=0.03)
box('DoorPostL', (0.25, 0.6, 4.2), (-1.5, -D / 2, 2.1), M_GOLD)
box('DoorPostR', (0.25, 0.6, 4.2), (1.5, -D / 2, 2.1), M_GOLD)
box('DoorLintel', (3.3, 0.6, 0.3), (0, -D / 2, 4.3), M_GOLD)
# back wall: piers with tall windows between
box('WallBackSill', (W, 0.5, 0.9), (0, D / 2, 0.45), M_VELVET, bevel=0.03)
box('WallBackHead', (W, 0.5, 1.1), (0, D / 2, H - 0.55), M_VELVET, bevel=0.03)
for x in (-8.0, -4.0, 0.0, 4.0, 8.0):
    box(f'PierBack{x}', (1.2, 0.5, H), (x, D / 2, H / 2), M_VELVET, bevel=0.03)
    box(f'PilasterBack{x}', (0.5, 0.2, H - 0.6), (x, D / 2 - 0.3, (H - 0.6) / 2), M_GOLD, bevel=0.02)
for x in (-6.0, -2.0, 2.0, 6.0):
    box(f'Window{x}', (2.8, 0.1, 5.0), (x, D / 2 + 0.1, 3.4), M_WINDOW, bevel=0, static=False)
    box(f'SillGold{x}', (3.0, 0.4, 0.12), (x, D / 2 - 0.1, 0.96), M_GOLD)
    box(f'HeadGold{x}', (3.0, 0.4, 0.15), (x, D / 2 - 0.1, 5.95), M_GOLD)
    area_light((x, D / 2 - 0.7, 3.4), 14, color=(1.0, 0.5, 0.55), size=2.4, rot=(-math.radians(90), 0, 0))
# side walls: gold pilasters and panel mouldings
for i, y in enumerate(range(-7, 8, 3)):
    for x in (-W / 2 + 0.3, W / 2 - 0.3):
        box(f'PilasterSide{i}{x}', (0.3, 0.5, H - 0.4), (x, y, (H - 0.4) / 2), M_GOLD, bevel=0.02)
        if y < 7:
            box(f'Moulding{i}{x}', (0.06, 2.2, 0.06), (x, y + 1.5, 4.6), M_GOLD, bevel=0)
            box(f'MouldingLow{i}{x}', (0.06, 2.2, 0.06), (x, y + 1.5, 1.2), M_GOLD, bevel=0)
box('Skirt', (W - 0.6, 0.12, 0.3), (0, -D / 2 + 0.3, 0.15), M_GOLD)
box('Cornice', (W, D, 0.25), (0, 0, H - 0.1), M_GOLD, bevel=0) if False else None
# ceiling coffers and chandeliers
for (cx, cy) in ((-5.0, 2.0), (5.0, 2.0), (0.0, -4.0)):
    box(f'Coffer{cx}{cy}', (6.0, 6.0, 0.2), (cx, cy, H - 0.1), M_VELVET, bevel=0.02)
    box(f'CofferTrim{cx}{cy}', (6.3, 6.3, 0.08), (cx, cy, H - 0.22), M_GOLD, bevel=0.01)
    cyl(f'ChandRod{cx}{cy}', 0.05, 1.3, (cx, cy, H - 0.65), M_GOLD, verts=12)
    cyl(f'ChandRing{cx}{cy}', 1.05, 0.12, (cx, cy, H - 1.3), M_GOLD, verts=32)
    cyl(f'ChandRingIn{cx}{cy}', 0.55, 0.1, (cx, cy, H - 1.1), M_GOLD, verts=24)
    cyl(f'ChandLamp{cx}{cy}', 0.45, 0.06, (cx, cy, H - 1.38), M_LAMP, static=False, verts=32)
    for k in range(8):
        a = k * math.pi / 4
        cyl(f'Candle{cx}{cy}{k}', 0.05, 0.3, (cx + math.cos(a) * 0.95, cy + math.sin(a) * 0.95, H - 1.1), M_CANDLE, static=False, verts=8)
    area_light((cx, cy, H - 1.5), 80, color=(1.0, 0.8, 0.55), size=1.4)
# the long table of sevens
LX, LY = 0.0, 1.5
box('LongTableBody', (5.0, 2.2, 0.75), (LX, LY, 0.42), M_WOOD, bevel=0.03, collide=True, pad=0.35)
box('LongTableFelt', (4.7, 1.9, 0.08), (LX, LY, 0.83), M_FELT, bevel=0.02)
box('LongTableRim', (5.1, 2.3, 0.06), (LX, LY, 0.8), M_GOLD, bevel=0.02)
box('LongTableRail', (5.1, 0.08, 0.06), (LX, LY + 1.15, 0.88), M_LEATHER, bevel=0.02)
box('LongTableRail2', (5.1, 0.08, 0.06), (LX, LY - 1.15, 0.88), M_LEATHER, bevel=0.02)
box('LongTableLampArm', (0.08, 0.08, 1.2), (LX, LY, 1.4), M_GOLD)
box('LongTableLamp', (1.1, 0.28, 0.06), (LX, LY, 2.0), M_LAMP, bevel=0, static=False)
area_light((LX, LY, 1.9), 10, size=0.6)
# round tables
TABLES = [(-5.5, -2.5), (5.5, -2.5), (5.5, 4.5)]
for t, (x, y) in enumerate(TABLES):
    cyl(f'TableFelt{t}', 1.25, 0.08, (x, y, 0.85), M_FELT, verts=40)
    cyl(f'TableRim{t}', 1.35, 0.1, (x, y, 0.8), M_WOOD, verts=40)
    cyl(f'TableRimGold{t}', 1.37, 0.03, (x, y, 0.86), M_GOLD, verts=40)
    cyl(f'TableLeg{t}', 0.14, 0.78, (x, y, 0.39), M_WOOD, verts=16, r2=0.5)
    cyl(f'TableLampStem{t}', 0.04, 1.0, (x, y, 1.4), M_GOLD, verts=8)
    cyl(f'TableLamp{t}', 0.45, 0.06, (x, y, 1.92), M_LAMP, static=False, verts=24)
    area_light((x, y, 1.85), 7, size=0.4)
    COLLIDERS.append({'min': [x - 1.6, y - 1.6], 'max': [x + 1.6, y + 1.6]})
    for a in (0.5, 1.6, 2.7, 3.9, 5.1):
        sx, sy = x + math.cos(a) * 1.85, y + math.sin(a) * 1.85
        box(f'Chair{t}{a}', (0.5, 0.5, 0.1), (sx, sy, 0.5), M_LEATHER, bevel=0.02, rot=(0, 0, a))
        box(f'ChairBack{t}{a}', (0.5, 0.08, 0.6), (sx + math.cos(a) * 0.23, sy + math.sin(a) * 0.23, 0.85), M_LEATHER, bevel=0.02, rot=(0, 0, a))
        cyl(f'ChairLeg{t}{a}', 0.04, 0.5, (sx, sy, 0.25), M_GOLD, verts=8)
for a in (-1.2, 0.0, 1.2):  # chairs on the far side of the long table
    box(f'LongChair{a}', (0.5, 0.5, 0.1), (LX + a * 1.5, LY + 1.7, 0.5), M_LEATHER, bevel=0.02)
    box(f'LongChairBack{a}', (0.5, 0.08, 0.6), (LX + a * 1.5, LY + 1.95, 0.85), M_LEATHER, bevel=0.02)
    cyl(f'LongChairLeg{a}', 0.04, 0.5, (LX + a * 1.5, LY + 1.7, 0.25), M_GOLD, verts=8)
# the master's dais under a gold grille, west side
DX, DY = -7.5, 3.5
cyl('Dais', 2.8, 0.4, (DX, DY, 0.2), M_FLOOR, verts=40)
cyl('DaisTrim', 2.82, 0.04, (DX, DY, 0.4), M_GOLD, verts=40)
box('MasterDesk', (1.6, 0.8, 0.8), (DX + 0.8, DY - 0.4, 0.8), M_WOOD, bevel=0.03, rot=(0, 0, -0.5))
box('MasterDeskTop', (1.7, 0.9, 0.06), (DX + 0.8, DY - 0.4, 1.23), M_GOLD, bevel=0.02, rot=(0, 0, -0.5))
for k in range(9):
    cyl(f'Grille{k}', 0.025, 3.2, (DX - 1.8 + k * 0.45, DY + 1.6, 2.0), M_GOLD, verts=8)
box('GrilleTop', (4.2, 0.08, 0.12), (DX, DY + 1.6, 3.6), M_GOLD, bevel=0.01)
box('GrilleBase', (4.2, 0.12, 0.12), (DX, DY + 1.6, 0.46), M_GOLD, bevel=0.01)
cyl('DaisLampStem', 0.04, 2.6, (DX - 1.6, DY + 0.8, 1.7), M_GOLD, verts=8)
cyl('DaisLamp', 0.35, 0.06, (DX - 1.6, DY + 0.8, 3.0), M_LAMP, static=False, verts=20)
area_light((DX - 1.4, DY + 0.6, 2.9), 8, size=0.4)
COLLIDERS.append({'min': [DX - 2.9, DY - 2.9], 'max': [DX + 2.9, DY + 2.9]})
# the croupier's counter, east wall
CX = W / 2 - 1.9
box('Counter', (0.9, 6.0, 1.05), (CX, -2.0, 0.525), M_WOOD, bevel=0.03, collide=True)
box('CounterTop', (1.1, 6.2, 0.07), (CX, -2.0, 1.085), M_GOLD, bevel=0.02)
box('CounterBack', (0.4, 6.2, 3.2), (W / 2 - 0.5, -2.0, 1.6), M_WOOD, bevel=0.03, collide=True)
for s in range(3):
    box(f'CounterShelf{s}', (0.35, 5.8, 0.05), (W / 2 - 0.55, -2.0, 1.4 + s * 0.7), M_GOLD)
    box(f'CounterLight{s}', (0.03, 5.6, 0.03), (W / 2 - 0.75, -2.0, 1.38 + s * 0.7), M_CANDLE, bevel=0, static=False)
    for b in range(7):
        cyl(f'Decanter{s}{b}', 0.07, 0.3 + random.random() * 0.15, (W / 2 - 0.56, -4.6 + b * 0.85, 1.6 + s * 0.7), M_GOLD, verts=10)
# booths along the west wall
for k, y in enumerate((-6.5, -2.5)):
    box(f'Bench{k}', (0.8, 2.6, 0.5), (-W / 2 + 0.95, y, 0.25), M_LEATHER, bevel=0.03, collide=True, pad=0.2)
    box(f'BenchBack{k}', (0.2, 2.6, 1.1), (-W / 2 + 0.65, y, 0.8), M_LEATHER, bevel=0.03)
    box(f'BoothTable{k}', (0.8, 1.2, 0.06), (-W / 2 + 2.1, y, 0.75), M_WOOD, bevel=0.02, collide=True, pad=0.2)
    cyl(f'BoothTableLeg{k}', 0.06, 0.72, (-W / 2 + 2.1, y, 0.36), M_GOLD, verts=10)
    cyl(f'BoothCandle{k}', 0.06, 0.2, (-W / 2 + 2.1, y, 0.88), M_CANDLE, static=False, verts=8)
    area_light((-W / 2 + 2.1, y, 1.2), 2.5, size=0.2)
# sign over the door
box('SignDoor', (2.2, 0.05, 0.3), (0, -D / 2 + 0.3, H - 1.2), M_LAMP, bevel=0, static=False)

finish(scene, OUT, 'salon', ('Floor', 'Ceiling', 'Wall', 'Door', 'Pier', 'Pilaster', 'Moulding', 'Sill', 'Head', 'Skirt', 'Coffer', 'Chand', 'Dais', 'Grille'), 1024 if FAST else 2048, 1024 if FAST else 2048)

def seat(t, a):
    x, y = TABLES[t]
    return x + math.cos(a) * 1.85, y + math.sin(a) * 1.85

pa = seat(1, 2.7)
pb = seat(0, 0.5)
meta = {
    'colliders': colliders_three(),
    'bounds': {'x': W / 2 - 0.9, 'z': D / 2 - 0.9},
    'spawn': {'pos': three(0.0, -6.8, 1.62), 'yaw': 0.0},
    'figures': [
        fig('NESSA TARRANT', -1.6, -0.3, 15),
        fig('DOM VELLORY', DX + 0.2, DY - 0.1, 60),
        fig('CROUPIER', W / 2 - 1.1, -2.0, -90),
        fig('LISTENER', LX + 1.5, LY + 1.7, 0, seated=True, face=(LX, LY), seat=0.55),
        fig('ILEN SARVO', -1.9, -4.6, 160),
        fig('CORIN PELLIS', 1.9, -4.4, 200),
        fig('PATRON_A', pa[0], pa[1], 0, seated=True, face=TABLES[1], seat=0.55),
        fig('PATRON_B', pb[0], pb[1], 0, seated=True, face=TABLES[0], seat=0.55),
    ],
    'tables': [three(x, y, 0.85) for x, y in TABLES] + [three(LX, LY, 0.83)],
}
with open(os.path.join(os.path.abspath(OUT), 'salon.json'), 'w') as f:
    json.dump(meta, f)
print('exported', OUT)
