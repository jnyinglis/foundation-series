# Makes a tinted copy of a MakeHuman clothes asset in the user asset folder.
# Usage: blender -b --python blender/tint_asset.py -- <source> <new name> r g b
import bpy, os, sys, shutil, re
import numpy as np
argv = sys.argv[sys.argv.index('--') + 1:]
src, dst = argv[0], argv[1]
tint = [float(v) for v in argv[2:5]]
base = os.path.expanduser('~/Library/Application Support/Blender/5.2/extensions/.user/blender_org/mpfb/data/clothes')
sd, dd = os.path.join(base, src), os.path.join(base, dst)
os.makedirs(dd, exist_ok=True)
for f in os.listdir(sd):
    if f.endswith(('.obj', '_ao.png', '_normal.png')):
        shutil.copy(os.path.join(sd, f), os.path.join(dd, f.replace(src, dst)))
mhclo = open(os.path.join(sd, src + '.mhclo')).read()
mhclo = re.sub(r'^name .*$', f'name {dst}', mhclo, flags=re.M)
mhclo = re.sub(r'^obj_file .*$', f'obj_file {dst}.obj', mhclo, flags=re.M)
mhclo = re.sub(r'^material .*$', f'material {dst}.mhmat', mhclo, flags=re.M)
mhclo = re.sub(r'^uuid .*$', f'uuid {dst}-tinted', mhclo, flags=re.M)
open(os.path.join(dd, dst + '.mhclo'), 'w').write(mhclo)
mhmat = open(os.path.join(sd, src + '.mhmat')).read().replace(src, dst)
open(os.path.join(dd, dst + '.mhmat'), 'w').write(mhmat)
img = bpy.data.images.load(os.path.join(sd, src + '_diffuse.png'))
px = np.empty(len(img.pixels), dtype=np.float32)
img.pixels.foreach_get(px)
px = px.reshape(-1, 4)
px[:, 0] = np.clip(px[:, 0] * tint[0], 0, 1); px[:, 1] = np.clip(px[:, 1] * tint[1], 0, 1); px[:, 2] = np.clip(px[:, 2] * tint[2], 0, 1)
img.pixels.foreach_set(px.ravel())
img.filepath_raw = os.path.join(dd, dst + '_diffuse.png'); img.file_format = 'PNG'; img.save()
print('tinted asset', dst)
