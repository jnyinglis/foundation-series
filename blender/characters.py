# Builds the story characters with MPFB (MakeHuman Plugin For Blender) and
# exports one glTF per character with a Mixamo-named skeleton and a jaw shape key.
# Run headless:  npm run characters   (optionally: -- ilen corin)
import bpy, os, sys, glob, math

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath('public/characters')
ONLY = [a for a in argv if not a.startswith('-')]

from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.assetservice import AssetService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService
from bl_ext.blender_org.mpfb.services.locationservice import LocationService
from bl_ext.blender_org.mpfb.services.exportservice import ExportService

def asset(subdir, name, kind='mhclo'):
    items = AssetService.list_mhmat_assets(subdir) if kind == 'mhmat' else AssetService.list_mhclo_assets(subdir)
    for p in items:
        if str(p).endswith('/' + name):
            return str(p)
    raise FileNotFoundError(f'{subdir}/{name}')

def race(cau, asi, afr):
    return {'caucasian': cau, 'asian': asi, 'african': afr}

CHARACTERS = {
    'ilen': dict(
        macro=dict(gender=0.08, age=0.46, muscle=0.45, weight=0.42, proportions=0.6, height=0.55, cupsize=0.5, firmness=0.6, race=race(0.7, 0.2, 0.1)),
        skin='middleage_caucasian_female.mhmat', hair='rehmanpolanski_hair_bun_brown.mhclo', eyebrows='mindfront_eyebrows_10.mhclo', eyelashes='mindfront_eyelashes_01.mhclo',
        clothes=['female_elegantsuit01.mhclo', 'toigo_ankle_boots_female.mhclo'],
    ),
    'corin': dict(
        macro=dict(gender=0.1, age=0.4, muscle=0.6, weight=0.45, proportions=0.55, height=0.58, cupsize=0.45, firmness=0.7, race=race(0.85, 0.05, 0.1)),
        skin='toigo_light_skin_female_freckles.mhmat', hair='cortu_short_messy_hair.mhclo', eyebrows='mindfront_eyebrows_11.mhclo', eyelashes='mindfront_eyelashes_02.mhclo',
        clothes=['joepal_crude_t-shirt_female.mhclo', 'cortu_cargo_pants.mhclo', 'culturalibre_heroine_boots_2.mhclo'],
    ),
    'taren': dict(
        macro=dict(gender=0.92, age=0.5, muscle=0.55, weight=0.48, proportions=0.7, height=0.62, cupsize=0.5, firmness=0.5, race=race(0.75, 0.15, 0.1)),
        skin='middleage_caucasian_male.mhmat', hair='short01.mhclo', eyebrows='eyebrow010.mhclo', eyelashes='eyelashes01.mhclo',
        clothes=['male_worksuit01.mhclo', 'culturalibre_male_boots.mhclo'],
    ),
    'greycoat': dict(
        macro=dict(gender=0.95, age=0.55, muscle=0.5, weight=0.5, proportions=0.55, height=0.6, cupsize=0.5, firmness=0.5, race=race(0.6, 0.3, 0.1)),
        skin='young_caucasian_male2.mhmat', hair='short04.mhclo', eyebrows='eyebrow003.mhclo', eyelashes='eyelashes01.mhclo',
        clothes=['male_elegantsuit01.mhclo', 'shoes01.mhclo'],
    ),
    'bartender': dict(
        macro=dict(gender=0.9, age=0.52, muscle=0.6, weight=0.6, proportions=0.5, height=0.55, cupsize=0.5, firmness=0.5, race=race(0.3, 0.1, 0.6)),
        skin='middleage_african_male.mhmat', hair='short03.mhclo', eyebrows='eyebrow004.mhclo', eyelashes='eyelashes01.mhclo',
        clothes=['male_casualsuit03.mhclo', 'shoes02.mhclo', 'wdg_scruffy_beard.mhclo'],
    ),
    'sennet': dict(
        macro=dict(gender=0.08, age=0.93, muscle=0.35, weight=0.38, proportions=0.5, height=0.42, cupsize=0.4, firmness=0.3, race=race(0.75, 0.2, 0.05)),
        skin='old_caucasian_female.mhmat', hair='rehmanpolanski_hair_bun_brown.mhclo', eyebrows='eyebrow004.mhclo', eyelashes='eyelashes01.mhclo',
        clothes=['donitz_monk_robe.mhclo', 'shoes03.mhclo'],
    ),
    'dira': dict(
        macro=dict(gender=0.1, age=0.5, muscle=0.45, weight=0.45, proportions=0.55, height=0.5, cupsize=0.5, firmness=0.5, race=race(0.25, 0.7, 0.05)),
        skin='middleage_asian_female.mhmat', hair='toigo_blunt_bob.mhclo', eyebrows='eyebrow011.mhclo', eyelashes='mindfront_eyelashes_01.mhclo',
        clothes=['female_elegantsuit01.mhclo', 'toigo_flats.mhclo'],
    ),
    'sunmaster': dict(
        macro=dict(gender=0.95, age=0.85, muscle=0.4, weight=0.42, proportions=0.5, height=0.6, cupsize=0.5, firmness=0.5, race=race(0.8, 0.15, 0.05)),
        skin='old_caucasian_male.mhmat', hair=None, eyebrows=None, eyelashes='eyelashes01.mhclo',
        clothes=['donitz_monk_robe_hood_down.mhclo'],
    ),
    'statue': dict(
        macro=dict(gender=0.9, age=0.45, muscle=0.6, weight=0.5, proportions=0.7, height=0.7, cupsize=0.5, firmness=0.5, race=race(0.34, 0.33, 0.33)),
        skin='young_caucasian_male2.mhmat', hair=None, eyebrows=None, eyelashes=None,
        clothes=['matcreator_mc-skinsuit_2022.mhclo'],
    ),
    'vask': dict(
        macro=dict(gender=0.98, age=0.5, muscle=0.85, weight=0.7, proportions=0.4, height=0.75, cupsize=0.5, firmness=0.5, race=race(0.3, 0.1, 0.6)),
        skin='middleage_african_male.mhmat', hair=None, eyebrows='eyebrow003.mhclo', eyelashes='eyelashes01.mhclo',
        clothes=['male_casualsuit04.mhclo', 'culturalibre_male_boots.mhclo'],
    ),
    'quintesetz': dict(
        macro=dict(gender=0.95, age=0.8, muscle=0.4, weight=0.55, proportions=0.5, height=0.45, cupsize=0.5, firmness=0.5, race=race(0.2, 0.75, 0.05)),
        skin='old_asian_male.mhmat', hair='short02.mhclo', eyebrows='eyebrow010.mhclo', eyelashes='eyelashes01.mhclo',
        clothes=['male_casualsuit06.mhclo', 'shoes02.mhclo'],
    ),
    'deniador': dict(
        macro=dict(gender=0.95, age=0.62, muscle=0.35, weight=0.35, proportions=0.6, height=0.6, cupsize=0.5, firmness=0.5, race=race(0.9, 0.05, 0.05)),
        skin='old_caucasian_male.mhmat', hair='short04.mhclo', eyebrows='eyebrow004.mhclo', eyelashes='eyelashes01.mhclo',
        clothes=['male_elegantsuit01.mhclo', 'shoes01.mhclo'],
    ),
    'vos': dict(
        macro=dict(gender=0.1, age=0.48, muscle=0.65, weight=0.45, proportions=0.6, height=0.6, cupsize=0.4, firmness=0.7, race=race(0.6, 0.3, 0.1)),
        skin='young_caucasian_female2.mhmat', hair='ponytail01.mhclo', eyebrows='mindfront_eyebrows_11.mhclo', eyelashes='mindfront_eyelashes_02.mhclo',
        clothes=['thegreatengineer_galactic_warrior_uniform.mhclo', 'culturalibre_heroine_boots_2.mhclo'],
    ),
    'bander': dict(
        macro=dict(gender=0.5, age=0.45, muscle=0.35, weight=0.38, proportions=0.7, height=0.7, cupsize=0.3, firmness=0.6, race=race(0.9, 0.05, 0.05)),
        skin='young_caucasian_female2.mhmat', hair=None, eyebrows=None, eyelashes='eyelashes01.mhclo',
        clothes=['matcreator_mc-skinsuit_2022.mhclo'],
    ),
    'sanya': dict(
        macro=dict(gender=0.1, age=0.75, muscle=0.5, weight=0.6, proportions=0.45, height=0.45, cupsize=0.6, firmness=0.3, race=race(0.1, 0.5, 0.4)),
        skin='callharvey3d_midtoned_female.mhmat', hair='long01.mhclo', eyebrows='eyebrow004.mhclo', eyelashes='eyelashes01.mhclo',
        clothes=['skalldyrssuppe_tube_top_funky_colors.mhclo', 'toigo_harem_pants.mhclo'],
    ),
    'daneel': dict(
        macro=dict(gender=0.95, age=0.42, muscle=0.55, weight=0.45, proportions=0.85, height=0.7, cupsize=0.5, firmness=0.5, race=race(0.8, 0.15, 0.05)),
        skin='young_caucasian_male2.mhmat', hair='short01.mhclo', eyebrows='eyebrow010.mhclo', eyelashes='eyelashes01.mhclo',
        clothes=['male_elegantsuit01.mhclo', 'shoes01.mhclo'],
    ),
    'patron_a': dict(
        macro=dict(gender=0.15, age=0.35, muscle=0.5, weight=0.5, proportions=0.5, height=0.5, cupsize=0.5, firmness=0.5, race=race(0.2, 0.7, 0.1)),
        skin='young_asian_female.mhmat', hair='bob01.mhclo', eyebrows='eyebrow011.mhclo', eyelashes='mindfront_eyelashes_05.mhclo',
        clothes=['female_casualsuit02.mhclo', 'shoes03.mhclo'],
    ),
    'patron_b': dict(
        macro=dict(gender=0.9, age=0.6, muscle=0.45, weight=0.62, proportions=0.45, height=0.5, cupsize=0.5, firmness=0.5, race=race(0.8, 0.1, 0.1)),
        skin='old_caucasian_male.mhmat', hair='short02.mhclo', eyebrows='eyebrow003.mhclo', eyelashes='eyelashes01.mhclo',
        clothes=['male_casualsuit01.mhclo', 'shoes04.mhclo'],
    ),
}

def find_jaw_target():
    root = os.path.join(LocationService.get_mpfb_data(), 'targets', 'expression', 'units')
    for pattern in ('*JawDrop*', '*jaw*open*', '*MouthOpen*', '*mouth*open*', '*JawOpen*'):
        hits = glob.glob(os.path.join(root, '**', pattern), recursive=True)
        if hits:
            return sorted(hits)[0]
    return None

def build(key, spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    human = HumanService.create_human(macro_detail_dict=spec['macro'])
    print(f'[{key}] human {len(human.data.vertices)} verts, dims {[round(v, 2) for v in human.dimensions]}')
    HumanService.set_character_skin(asset('skins', spec['skin'], 'mhmat'), human, skin_type='MAKESKIN')
    # flatten the body sliders into the mesh, then add one shape key for the jaw
    TargetService.bake_targets(human)
    jaw = find_jaw_target()
    if jaw:
        try:
            TargetService.load_target(human, jaw, weight=0.0, name='jaw_open')
            print(f'[{key}] jaw target {os.path.basename(jaw)} keys {[k.name for k in human.data.shape_keys.key_blocks]}')
        except Exception as e:  # noqa: BLE001
            print(f'[{key}] jaw target failed: {e}')
    # the rig goes on before the assets, so hair and clothes get armature weights interpolated from the body
    rig = HumanService.add_builtin_rig(human, 'mixamo', import_weights=True)
    print(f'[{key}] rig {rig.name if rig else None} bones {len(rig.data.bones) if rig else 0}')
    for subdir, name, kind in [('eyes', 'low-poly.mhclo', 'Eyes'), ('eyebrows', spec['eyebrows'], 'Eyebrows'), ('eyelashes', spec['eyelashes'], 'Eyelashes'), ('teeth', 'teeth_shape02.mhclo', 'Teeth'), ('hair', spec['hair'], 'Hair')]:
        if not name:
            continue
        try:
            HumanService.add_mhclo_asset(asset(subdir, name), human, asset_type=kind, subdiv_levels=0, material_type='MAKESKIN', set_up_rigging=True, interpolate_weights=True)
        except Exception as e:  # noqa: BLE001
            print(f'[{key}] bodypart {kind} {name} failed: {e}')
    for c in spec['clothes']:
        try:
            HumanService.add_mhclo_asset(asset('clothes', c), human, asset_type='Clothes', subdiv_levels=0, material_type='MAKESKIN', set_up_rigging=True, interpolate_weights=True)
        except Exception as e:  # noqa: BLE001
            print(f'[{key}] clothes {c} failed: {e}')
    # remove helper geometry and bake the mask while keeping the jaw shape key
    ExportService.bake_modifiers_remove_helpers(human, bake_masks=True, bake_subdiv=True, remove_helpers=True, also_proxy=True)
    print(f'[{key}] body after helpers removed: {len(human.data.vertices)} verts, mods {[m.type for m in human.modifiers]}')
    # smaller textures: skin at 2048, everything else at 1024
    for img in bpy.data.images:
        if img.size[0] == 0:
            continue
        cap = 2048 if 'skin' in img.name.lower() else 1024
        if max(img.size) > cap:
            f = cap / max(img.size)
            img.scale(max(1, int(img.size[0] * f)), max(1, int(img.size[1] * f)))
    # select the rig, the body and everything parented to it
    bpy.ops.object.select_all(action='DESELECT')
    objs = [human] + list(human.children_recursive)
    if rig:
        objs.append(rig)
        objs += [o for o in rig.children_recursive if o not in objs]
    for o in objs:
        o.select_set(True)
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, f'{key}.glb'), export_format='GLB', use_selection=True, export_apply=False,
                              export_image_format='WEBP', export_image_quality=78, export_skins=True, export_morph=True, export_morph_normal=False,
                              export_animations=False, export_yup=True)
    print(f'[{key}] exported {os.path.getsize(os.path.join(OUT, key + ".glb")) // 1024} KB')

for key, spec in CHARACTERS.items():
    if ONLY and key not in ONLY:
        continue
    try:
        build(key, spec)
    except Exception as e:  # noqa: BLE001
        import traceback; traceback.print_exc()
        print(f'[{key}] FAILED: {e}')
