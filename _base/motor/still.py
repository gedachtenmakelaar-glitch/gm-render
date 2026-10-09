# GM base world: render retro stills from a 3D scene module (owner: main chat).
#
#   python _base/motor/still.py <job.json>
#
# job.json:
# {
#   "module": "edificio/escena.js",          path under _base/ of an ES module that exports build(scene, opts) (see CONTRATO.md)
#   "size": [1080, 1920],                     output size in px (one shot; any size, big ones are tiled automatically)
#   "cell": 4,                                dither cell in px (4 = the retro look at 1080 wide; 3 = finer; 6 = chunky like the ad cards)
#   "out": "edificio/hojas/prueba",           output folder under _base/
#   "opts": {...},                            passed to build() (e.g. which rooms, residents on/off)
#   "live": false,                            true = use the GPU retro pass of motor/retro.js (the video path) instead of the Python dither
#   "shots": [ {"name": "fachada", "cam": {"pos":[0,12,60], "look":[0,12,0], "fov":28}, "mood": "dia", "light": 1, "t": 0, "layer": null}, ... ]
#   "light": key-light factor (interiors look better at 0.6-0.8: pale tones stop burning to white)
# }
# A shot's "cam" may also be a string: the name of a camera the module returns from build() (cameras: {name: spec}).
# "t" = seconds for moving things (cars, walkers, birds): the module's update(t) is called before rendering.
# Output per shot: <name>.png (final dithered, navy + orange on beige) and <name>-gris.png (the grey render, for checks).
#
# Only ONE snapshot runs at a time on this machine (videos/CLAUDE.md): this script takes a lock file and waits for it.
import json, os, sys, time, shutil, subprocess, glob
import numpy as np
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# HyperFrames FIXED inside videos/ (package.json): never npx (it once spent 32 min downloading a new version mid-render)
HF = '"' + os.path.join(os.path.dirname(BASE), 'node_modules', '.bin', 'hyperframes.cmd' if os.name == 'nt' else 'hyperframes') + '"'
LOCK = os.path.join(BASE, 'motor', '.snapshot.lock')
NAVY = np.array([26, 56, 84], np.uint8); ORANGE = np.array([255, 164, 98], np.uint8); PAPER = np.array([249, 248, 245], np.uint8)
BAY = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], float) + 0.5) / 16


def holder_alive():
    try: pid = int(open(LOCK).read().strip() or 0)
    except (OSError, ValueError): return True
    if not pid: return True
    out = subprocess.run(f'tasklist /FI "PID eq {pid}" /NH', shell=True, capture_output=True, text=True, errors='replace').stdout
    return str(pid) in out


def lock():
    t0 = time.time()
    while True:
        try:
            fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY); os.write(fd, str(os.getpid()).encode()); os.close(fd); return
        except FileExistsError:
            if time.time() - os.path.getmtime(LOCK) > 25 * 60 or not holder_alive(): os.remove(LOCK); continue  # stale
            if time.time() - t0 > 60 * 60: sys.exit('still.py: waited 60 min for the snapshot lock')
            time.sleep(3)


def unlock():
    try: os.remove(LOCK)
    except FileNotFoundError: pass


def dither(rgb, mask, cell):
    a = rgb.astype(float) / 255
    Y = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    Y = np.clip(1.6 * (Y - 0.55) + 0.6, 0, 1)   # contrast curve (08/10): mid greys spread apart so people read against furniture
    g = np.clip(1.22 * Y - 0.05, 0, 1)
    H, W = g.shape
    ch, cw = H // cell, W // cell
    gc = g[:ch * cell, :cw * cell].reshape(ch, cell, cw, cell)
    centre = gc[:, cell // 2, :, cell // 2]
    darkest = gc.min(axis=(1, 3))
    samp = np.where(darkest < 0.16, darkest, centre)  # ink lines survive as whole cells
    yy, xx = np.meshgrid(np.arange(ch), np.arange(cw), indexing='ij')
    inkc = samp < 1 - BAY[yy % 4, xx % 4]
    m = mask[:ch * cell, :cw * cell].astype(float).reshape(ch, cell, cw, cell).mean(axis=(1, 3)) / 255 > 0.5
    line = darkest < 0.16
    col = np.where((m & ~line)[..., None], ORANGE, NAVY)
    out = np.where(inkc[..., None], col, PAPER).astype(np.uint8)
    out = out.repeat(cell, 0).repeat(cell, 1)
    full = np.empty((H, W, 3), np.uint8); full[:] = PAPER; full[:out.shape[0], :out.shape[1]] = out
    return full


def main(job_path):
    job = json.load(open(job_path, encoding='utf-8'))
    FW, FH = job.get('size', [1080, 1920]); cell = job.get('cell', 4)
    # big outputs are rendered in tiles (the canvas holds 2 x width and WebGL stops at 4096 px): camera view offsets,
    # tile origins on the 4-cell Bayer grid so the dither joins without seams. Tiling is automatic and invisible.
    q = 4 * cell
    W = min(FW, (1800 // q) * q); H = min(FH, (3600 // q) * q)
    tiles = [(x, y) for y in range(0, FH, H) for x in range(0, FW, W)]
    shots = []
    for sh in job['shots']:
        for (x, y) in tiles:
            shots.append({**sh, 'view': [FW, FH, x, y, W, H] if len(tiles) > 1 else None, '_tile': (x, y)})
    shots = [{**shots[0], 'name': '__warm__'}] + shots   # warm-up: the first capture of a batch can be blank; dropped below
    n = len(shots)
    out = os.path.join(BASE, job['out']); os.makedirs(out, exist_ok=True)
    work = os.path.join(BASE, '_work', os.path.basename(os.path.normpath(job['out'])) + '-' + str(os.getpid()))
    if os.path.exists(work): shutil.rmtree(work)
    os.makedirs(work)
    # copy every js/json under _base (not _work, not hojas, not images) so the module and its imports resolve
    for root, dirs, files in os.walk(BASE):
        dirs[:] = [d for d in dirs if d not in ('_work', 'hojas', '_referencias') and not d.startswith('.')]
        for f in files:
            code = f.endswith(('.js', '.json', '.mjs'))
            model = f.endswith(('.glb', '.gltf', '.bin', '.png', '.jpg')) and (os.sep + 'modelos' + os.sep) in (root + os.sep)
            if code or model:
                src = os.path.join(root, f); dst = os.path.join(work, os.path.relpath(src, BASE))
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                try: os.link(src, dst)        # hard link: instant and no extra space; deleting the work copy never touches the source
                except OSError: shutil.copy2(src, dst)
    html = open(os.path.join(BASE, 'motor', 'still.html'), encoding='utf-8').read()
    html = (html.replace('__W2__', str(2 * W)).replace('__W__', str(W)).replace('__H__', str(H)).replace('__N__', str(n))
            .replace('__MODULE__', './' + job['module'].replace('\\', '/')).replace('__JOB__', json.dumps({'shots': shots, 'opts': job.get('opts', {}), 'W': W, 'H': H, 'live': bool(job.get('live')), 'cell': cell})))
    open(os.path.join(work, 'index.html'), 'w', encoding='utf-8').write(html)
    snap = os.path.join(work, 'snaps')
    ats = ','.join(f'{i + 0.5:.1f}' for i in range(n))
    lock()
    try:
        t0 = time.time()
        env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'FORCE_COLOR': '0'}
        limit = 300 + 25 * n   # seconds: generous, but a hung capture can never hold the lock for an hour again
        p = subprocess.Popen(f'{HF} snapshot "{work}" --at {ats} --no-end -o "{snap}" --describe false --timeout 60000',
                             shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='replace', env=env)
        try:
            so, se = p.communicate(timeout=limit)
        except subprocess.TimeoutExpired:
            subprocess.run(f'taskkill /PID {p.pid} /T /F', shell=True, capture_output=True)
            sys.exit(f'snapshot hung for {limit} s: killed (lock released). Run the job again.')
        class R: pass
        r = R(); r.returncode, r.stdout, r.stderr = p.returncode, so, se
        print(f'snapshot {n} shot(s) in {time.time() - t0:.0f} s')
        if r.returncode != 0: print(r.stdout[-2000:], r.stderr[-2000:]); sys.exit('snapshot failed')
    finally:
        unlock()
    pngs = sorted(glob.glob(os.path.join(snap, '*.png')), key=os.path.getmtime)
    pngs = sorted(pngs, key=lambda p: float(''.join(c for c in os.path.basename(p).split('at-')[-1].split('s')[0] if c in '0123456789.') or 0))
    if len(pngs) != n: sys.exit(f'expected {n} snapshots, got {len(pngs)} in {snap}')
    canv = {}
    for s, p in zip(shots, pngs):
        if s['name'] == '__warm__': continue
        im = np.asarray(Image.open(p).convert('RGB'))
        rgb, mask = im[:, :W], im[:, W:2 * W, 0]
        if rgb.mean() > 250: print(f'WARNING {s["name"]} tile {s["_tile"]}: blank render (scene failed to load?)')
        fin = rgb if job.get('live') else dither(rgb, mask, cell)  # live = already retro from the GPU pass (motor/retro.js)
        if s['name'] not in canv: canv[s['name']] = (Image.new('RGB', (FW, FH)), Image.new('RGB', (FW, FH)))
        canv[s['name']][0].paste(Image.fromarray(fin), s['_tile']); canv[s['name']][1].paste(Image.fromarray(rgb), s['_tile'])
    for name, (fin, grey) in canv.items():
        fin.save(os.path.join(out, name + '.png'))
        if not job.get('live'): grey.save(os.path.join(out, name + '-gris.png'))
        print('ok', os.path.join(job['out'], name + '.png'), f'({FW}x{FH})')
    shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    main(sys.argv[1])
