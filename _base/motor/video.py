# GM base world: make a VIDEO from a clip module (owner: main chat). Same idea as still.py, for moving pictures.
#
#   python _base/motor/video.py <clip folder> snap [t1,t2,...]   contact sheet of frames -> <clip>/hoja.jpg (+ single frames in <clip>/fotogramas/)
#   python _base/motor/video.py <clip folder> render              the mp4 (60 fps) -> <clip>/<name>.mp4 (+ the logo ending if "ending": true)
#
# <clip folder> (under _base/videos/) holds:
#   clip.json  {"name": "prueba-3d-2d", "size": [1080, 1920], "cell": 6, "duration": 10.0, "ending": true, "module": "clip.js"}
#   clip.js    export async function build(ctx) + export function frame(t, ctx) (+ optional MODELOS). See videos/LEEME.md.
# The standard logo ending (final/logo.html, 6.6 s, approved) is appended after "duration" when "ending" is true; the clip must
# hand over with hilo2d.SEAM (clean beige + the thread at x 540) in its last 0.436 s.
# One snapshot / render at a time on this machine: shares still.py's lock.
import json, os, sys, time, shutil, subprocess, glob, math
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import still  # noqa: E402  (lock, unlock, BASE)

BASE = still.BASE
HF = still.HF
ENDING = 6.6


def prepare(clip_dir, work=None, desde=0.0, hasta=None):
    cfg = json.load(open(os.path.join(clip_dir, 'clip.json'), encoding='utf-8'))
    name = cfg['name']; W, H = cfg.get('size', [1080, 1920]); dur = float(cfg['duration'])
    work = work or os.path.join(BASE, '_work', 'video-' + name)
    if os.path.exists(work):   # empty it but keep the folder (the preview server lives inside it)
        for e in os.listdir(work): q = os.path.join(work, e); shutil.rmtree(q, ignore_errors=True) if os.path.isdir(q) else os.remove(q)
    os.makedirs(work, exist_ok=True)
    for root, dirs, files in os.walk(BASE):
        dirs[:] = [d for d in dirs if d not in ('_work', 'hojas', '_referencias', 'fotogramas', 'render') and not d.startswith('.')]
        for f in files:
            code = f.endswith(('.js', '.json', '.mjs', '.html'))
            asset = f.endswith(('.glb', '.gltf', '.bin', '.png', '.jpg', '.woff2')) and any((os.sep + k + os.sep) in (root + os.sep) for k in ('modelos', 'recursos'))
            if code or asset:
                src = os.path.join(root, f); dst = os.path.join(work, os.path.relpath(src, BASE))
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                try: os.link(src, dst)
                except OSError: shutil.copy2(src, dst)
    hasta = dur if hasta is None else min(float(hasta), dur); pl = round(hasta - float(desde), 6)   # a part: story time desde..hasta
    con_final = bool(cfg.get('ending')) and hasta >= dur - 1e-6                                      # the logo goes with the last part
    total = pl + (ENDING if con_final else 0)
    ending = ''
    if con_final:
        os.makedirs(os.path.join(work, 'compositions'), exist_ok=True)
        shutil.copy2(os.path.join(BASE, 'final', 'logo.html'), os.path.join(work, 'compositions', 'logo.html'))
        ending = (f'<div id="slot-logo" class="lay" data-composition-id="s12-logo" data-composition-src="compositions/logo.html" '
                  f'data-start="{pl}" data-duration="{ENDING}" data-track-index="2" data-width="{W}" data-height="{H}"></div>')
    mod = './' + (os.path.relpath(os.path.join(clip_dir, cfg['module']), BASE).replace('\\', '/') if cfg.get('module') else 'motor/jugadas.js')   # no module = the playbook plays clip.json
    html = open(os.path.join(BASE, 'motor', 'video.html'), encoding='utf-8').read()
    for k, v in {'__W__': W, '__H__': H, '__DUR__': dur, '__TOTAL__': round(total, 3), '__CELL__': cfg.get('cell', 4), '__CAMSTEP__': cfg.get('camStep', 12),
                 '__MODULE__': mod, '__TITLE__': 'GM ' + name, '__T0__': float(desde), '__PL__': pl, '__CFG__': json.dumps(cfg, ensure_ascii=False), '__ENDING__': ending}.items():
        html = html.replace(k, str(v))
    open(os.path.join(work, 'index.html'), 'w', encoding='utf-8').write(html)
    return cfg, work, total


# sound events from the beat table (each playbook move has its sounds). Extra/manual ones: clip.json "golpes_extra".
def golpes(clip_dir, cfg):
    G = []
    for p in cfg.get('pulsos', []) + [q for c in cfg.get('capitulos', []) for q in c.get('pulsos', [])]:   # chapters: their beats too
        t, d, j = p['t'], p.get('dur', 0), p['jugada']
        if j == 'dibujar-sitio': G += [{'t': t, 'tipo': 'entra-hilo'}, {'t0': t + 0.05 * (d or 2.7), 't1': t + 0.98 * (d or 2.7), 'tipo': 'lapiz'}]
        elif j in ('abrir-3d', 'camara') and p.get('corte', True): G.append({'t': t, 'tipo': 'corte'})
        elif j == 'burbuja': G += [{'t': t + 0.45, 'tipo': 'burbuja'}, {'t0': t, 't1': t + 1.0, 'tipo': 'lapiz'}]
        elif j == 'tarjeta-en-sala': G += [{'t0': t + 0.25, 't1': t + 0.85, 'tipo': 'lapiz'}, {'t': t + 0.85, 'tipo': 'tarjeta'}, {'t0': t + 1.05, 't1': t + 1.8, 'tipo': 'lapiz'}]
        elif j == 'tarjeta-pantalla': G.append({'t': t + 0.3, 'tipo': 'naranja'})
        elif j == 'resolver': G += [{'t': t, 'tipo': 'resolver'}, {'t0': t, 't1': t + p.get('dur', 0.9), 'tipo': 'lapiz'}]
        elif j == 'subir-al-logo': G.append({'t': t, 'tipo': 'subida'})
        elif j in ('dibujar-vivienda', 'borrar-sitio'): G.append({'t0': t + 0.05, 't1': t + 0.95 * (d or 1.4), 'tipo': 'lapiz'})
        elif j == 'chip': G.append({'t0': t, 't1': t + 0.5, 'tipo': 'lapiz'})
        elif j == 'garabato': G.append({'t0': t + 0.1, 't1': t + (d or 1.0), 'tipo': 'lapiz'})
        elif j in ('abanico', 'repartir'): G.append({'t': t, 'tipo': 'burbuja'})
    G += cfg.get('golpes_extra', [])
    G = sorted({json.dumps(g, sort_keys=True): g for g in G}.values(), key=lambda g: g.get('t', g.get('t0', 0)))   # one cut sound per instant
    out = {'duracion': float(cfg['duration']), 'final': bool(cfg.get('ending')), 'bpm': cfg.get('bpm', 110), 'musica_desde': cfg.get('musica_desde', 0.0), 'bucle': bool(cfg.get('bucle')), 'golpes': G}
    json.dump(out, open(os.path.join(clip_dir, 'golpes.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return out


def run(cmd, limit, log_path=None):
    """Runs cmd; with log_path the output goes to that file LIVE (tail it to watch progress). Kills the tree after limit s."""
    env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'FORCE_COLOR': '0'}
    lf = open(log_path, 'w', encoding='utf-8') if log_path else subprocess.PIPE
    p = subprocess.Popen(cmd, shell=True, stdout=lf, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace', env=env)
    try: out, _ = p.communicate(timeout=limit)
    except subprocess.TimeoutExpired:
        subprocess.run(f'taskkill /PID {p.pid} /T /F' if os.name == 'nt' else f'pkill -TERM -P {p.pid}; kill {p.pid}', shell=True, capture_output=True); sys.exit(f'hung for {limit} s: killed (lock released). See {log_path}')
    if log_path: lf.close(); out = open(log_path, encoding='utf-8', errors='replace').read()
    return p.returncode, out


def snap(clip_dir, ats):
    import carga; carga.prioridad_baja()   # yields to Dil's other work
    cfg, work, total = prepare(clip_dir)
    if not ats: ats = [round(x * 0.5 + 0.25, 2) for x in range(int(total * 2))]
    ats = [ats[0]] + ats   # warm-up: the first capture can be blank
    out = os.path.join(work, 'snaps')
    still.lock()
    try:
        t0 = time.time()
        rc, log = run(f'{HF} snapshot "{work}" --at {",".join(str(a) for a in ats)} --no-end -o "{out}" --describe false --timeout 90000', 300 + 20 * len(ats))
        print(f'snapshot {len(ats)} frames in {time.time() - t0:.0f} s')
        if rc != 0: print(log[-3000:]); sys.exit('snapshot failed')
    finally:
        still.unlock()
    pngs = sorted(glob.glob(os.path.join(out, '*.png')), key=lambda p: float(''.join(c for c in os.path.basename(p).split('at-')[-1].split('s')[0] if c in '0123456789.') or 0))
    if len(pngs) != len(ats): print(log[-2000:]); sys.exit(f'expected {len(ats)} frames, got {len(pngs)}')
    fdir = os.path.join(clip_dir, 'fotogramas'); os.makedirs(fdir, exist_ok=True)
    for f in glob.glob(os.path.join(fdir, '*.png')): os.remove(f)
    ims = []
    for a, p in list(zip(ats, pngs))[1:]:
        dst = os.path.join(fdir, f't{a:06.2f}.png'); shutil.copy2(p, dst); ims.append((a, Image.open(dst).convert('RGB')))
    # contact sheet: 6 per row, 360 px wide thumbnails with the time
    tw = 360; th = round(tw * ims[0][1].height / ims[0][1].width); cols = min(6, len(ims)); rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (tw + 12) + 12, rows * (th + 44) + 12), (249, 248, 245)); dr = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype('arial.ttf', 22)
    except OSError: font = ImageFont.load_default()
    for i, (a, im) in enumerate(ims):
        x, y = 12 + (i % cols) * (tw + 12), 12 + (i // cols) * (th + 44)
        sheet.paste(im.resize((tw, th)), (x, y + 32)); dr.text((x, y + 4), f'{a:.2f} s', fill=(26, 56, 84), font=font)
    sheet.save(os.path.join(clip_dir, 'hoja.jpg'), quality=88)
    print('ok', os.path.join(clip_dir, 'hoja.jpg'), len(ims), 'frames')
    shutil.rmtree(work, ignore_errors=True)


def render(clip_dir, workers=None, borrador=False):
    # never make Dil's computer slow (09/10/2026): measure CPU and RAM first, take only what is free, run below normal priority
    import carga
    carga.prioridad_baja(); r = carga.medir()
    workers = workers or int(os.environ.get('GM_WORKERS') or carga.workers_sugeridos(r))
    print(f"carga: CPU {r['cpu']} % de {r['cores']} hilos, RAM libre {r['ram_libre']} de {r['ram_total']} GB -> {workers} workers, prioridad baja")
    cfg, work, total = prepare(clip_dir)
    rdir = os.path.join(clip_dir, 'render'); os.makedirs(rdir, exist_ok=True)
    fps = 24 if borrador else 60   # drafts at 24: the world moves at 12 drawings/s, so 24 shows every drawing evenly (30 did not divide)
    raw = os.path.join(rdir, f'raw-{fps}.mp4'); log_path = os.path.join(rdir, 'render.log')
    still.lock()
    try:
        for attempt in (1, 2):
            t0 = time.time()
            rc, log = run(f'{HF} render "{work}" --fps {fps} --quality {"draft" if borrador else "high"} --workers {workers} -o "{raw}"', 1200 + 240 * total, log_path)
            bad = log.count('media_load_failed') + log.count('ERR_NETWORK_CHANGED')
            print(f'render try {attempt}: rc {rc}, load/network errors {bad}, {time.time() - t0:.0f} s')
            if rc == 0 and bad == 0: break
        else: sys.exit('render failed twice: see ' + log_path)
    finally:
        still.unlock()
    mix = None
    if (cfg.get('pulsos') or cfg.get('capitulos')) and os.path.exists(os.path.join(BASE, 'sonido', 'mezcla.py')):
        golpes(clip_dir, cfg)
        r = subprocess.run(f'python "{os.path.join(BASE, "sonido", "mezcla.py")}" "{clip_dir}"', shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
        print(r.stdout[-600:]); mix = os.path.join(rdir, 'mezcla.wav') if r.returncode == 0 and os.path.exists(os.path.join(rdir, 'mezcla.wav')) else None
        if not mix: print('WARNING sound mix failed:', r.stderr[-800:])
    final = os.path.join(clip_dir, cfg['name'] + ('-borrador' if borrador else '') + (os.environ.get('GM_SUFIJO') or '') + '.mp4')
    ins = f'-i "{raw}"' + (f' -i "{mix}" -map 0:v -map 1:a -c:a aac -b:a 192k -shortest' if mix else ' -an')
    subprocess.run(f'ffmpeg -y -loglevel error {ins} -c:v libx264 -preset {"veryfast" if borrador else "slow"} -crf {23 if borrador else 16} -pix_fmt yuv420p -movflags +faststart "{final}"', shell=True, check=True)
    print('ok', final)
    shutil.rmtree(work, ignore_errors=True)


def parte(clip_dir, desde, hasta, borrador=False):
    """one time range of the video (story seconds desde..hasta; the part that reaches the end carries the logo) ->
    <clip>/render/partes/parte-<desde>.mp4, no sound. Several machines can render different ranges at once (GitHub Actions)."""
    import carga
    carga.prioridad_baja(); r = carga.medir()
    workers = int(os.environ.get('GM_WORKERS') or carga.workers_sugeridos(r))
    fps = 24 if borrador else 60
    cfg, work, total = prepare(clip_dir, desde=desde, hasta=hasta)
    pdir = os.path.join(clip_dir, 'render', 'partes'); os.makedirs(pdir, exist_ok=True)
    out = os.path.join(pdir, f'parte-{float(desde):08.3f}.mp4'); log_path = os.path.join(pdir, f'parte-{float(desde):08.3f}.log')
    print(f"parte {desde}-{hasta}: CPU {r['cpu']} %, RAM libre {r['ram_libre']} GB -> {workers} workers")
    t0 = time.time()
    rc, log = run(f'{HF} render "{work}" --fps {fps} --quality {"draft" if borrador else "high"} --workers {workers} -o "{out}"', 1200 + 240 * total, log_path)
    print(f'parte rc {rc}, {time.time() - t0:.0f} s'); print(log[-700:])
    if rc != 0 or not os.path.exists(out): sys.exit('parte failed')
    shutil.rmtree(work, ignore_errors=True)


def unir(clip_dir, borrador=False):
    """the parts (in time order) -> the same mp4 that render() makes, with the sound mix"""
    cfg = json.load(open(os.path.join(clip_dir, 'clip.json'), encoding='utf-8'))
    rdir = os.path.join(clip_dir, 'render'); pdir = os.path.join(rdir, 'partes')
    partes = sorted(glob.glob(os.path.join(pdir, '**', 'parte-*.mp4'), recursive=True), key=lambda q: float(os.path.basename(q)[6:-4]))
    if not partes: sys.exit('no parts in ' + pdir)
    lst = os.path.join(pdir, 'lista.txt'); open(lst, 'w', encoding='utf-8').write(''.join(f"file '{os.path.abspath(q)}'\n" for q in partes))
    raw = os.path.join(rdir, f'raw-{24 if borrador else 60}.mp4')
    subprocess.run(f'ffmpeg -y -loglevel error -f concat -safe 0 -i "{lst}" -c copy "{raw}"', shell=True, check=True)
    mix = None
    if (cfg.get('pulsos') or cfg.get('capitulos')) and os.path.exists(os.path.join(BASE, 'sonido', 'mezcla.py')):
        golpes(clip_dir, cfg)
        r = subprocess.run(f'python "{os.path.join(BASE, "sonido", "mezcla.py")}" "{clip_dir}"', shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
        print(r.stdout[-600:]); mix = os.path.join(rdir, 'mezcla.wav') if r.returncode == 0 and os.path.exists(os.path.join(rdir, 'mezcla.wav')) else None
        if not mix: print('WARNING sound mix failed:', r.stderr[-800:])
    final = os.path.join(clip_dir, cfg['name'] + ('-borrador' if borrador else '') + (os.environ.get('GM_SUFIJO') or '') + '.mp4')
    ins = f'-i "{raw}"' + (f' -i "{mix}" -map 0:v -map 1:a -c:a aac -b:a 192k -shortest' if mix else ' -an')
    subprocess.run(f'ffmpeg -y -loglevel error {ins} -c:v libx264 -preset {"veryfast" if borrador else "slow"} -crf {23 if borrador else 16} -pix_fmt yuv420p -movflags +faststart "{final}"', shell=True, check=True)
    print('ok', final, len(partes), 'partes')


def tramos(clip_dir, n, desde=None, hasta=None):
    """how to split the video (or only desde..hasta) into n parts (whole seconds; the last part of the video also carries the
    logo): JSON for a GitHub matrix"""
    cfg = json.load(open(os.path.join(clip_dir, 'clip.json'), encoding='utf-8')); dur = float(cfg['duration'])
    a = float(desde or 0); b = min(dur, float(hasta)) if hasta not in (None, '', '0') else dur
    n = max(1, min(int(n), int(b - a) or 1)); step = math.ceil((b - a) / n); cuts = [a + k * step for k in range(n) if a + k * step < b] + [b]
    return [{'desde': cuts[i], 'hasta': cuts[i + 1]} for i in range(len(cuts) - 1)]


def vista(clip_dir):
    """Instant preview: the clip in _work/vista (served by .claude/launch.json "gm-vista" on port 8767). In the browser:
    window.gmVer(t) draws the frame at t (seconds) in a few ms. No logo ending here (it needs the HyperFrames runtime)."""
    cfg, work, total = prepare(clip_dir, os.path.join(BASE, '_work', 'vista'))
    print('ok vista ->', work, '| http://localhost:8767/index.html?vista=0.3  (window.gmVer(t))')


if __name__ == '__main__':
    d = os.path.abspath(sys.argv[1]); what = sys.argv[2] if len(sys.argv) > 2 else 'snap'
    if what == 'snap': snap(d, [float(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else None)
    elif what == 'vista': vista(d)
    elif what == 'render': render(d, borrador='--borrador' in sys.argv)
    elif what == 'parte': parte(d, float(sys.argv[3]), float(sys.argv[4]), borrador='--borrador' in sys.argv)
    elif what == 'unir': unir(d, borrador='--borrador' in sys.argv)
    elif what == 'tramos': print(json.dumps(tramos(d, *(sys.argv[3:6] or [10]))))
    else: sys.exit('use: video.py <clip folder> snap [t1,t2,...] | vista | render [--borrador]')
