# GM base world: automatic checks on a rendered video (owner: main chat). The in-picture checks (heads, bubbles, chip, card
# text) run in the instant preview with `await gmQC()`; this one checks the finished mp4.
#
#   python _base/motor/qc.py <clip folder> [video.mp4]      -> <clip>/qc/informe.txt + <clip>/qc/hoja-mp4.jpg (2 frames/s)
#
# With "bucle": true (and no ending): first/last frame PSNR >= 45 dB and audio join (RMS first/last 50 ms < 3 dB, no big sample step).
# Checks: length (story + 6.6 s ending), blank frames, dots crawling between camera steps, the seam into the logo,
# loudness (-14 LUFS, true peak <= -1) when there is sound. Prints OK / AVISO lines; exit code 1 if any AVISO.
import json, os, sys, subprocess, glob, re
import numpy as np
from PIL import Image

def frames(mp4, fps_out, w=270):
    """decode to grey numpy frames at fps_out (None = all), width w"""
    vf = (f'fps={fps_out},' if fps_out else '') + f'scale={w}:-2,format=gray'
    p = subprocess.run(f'ffmpeg -loglevel error -i "{mp4}" -vf {vf} -f rawvideo -', shell=True, capture_output=True)
    h = int(round(w * 1920 / 1080)); h += h % 2
    a = np.frombuffer(p.stdout, np.uint8); n = a.size // (w * h)
    return a[:n * w * h].reshape(n, h, w)


def main(clip_dir, mp4=None):
    cfg = json.load(open(os.path.join(clip_dir, 'clip.json'), encoding='utf-8'))
    mp4 = mp4 or max(glob.glob(os.path.join(clip_dir, '*.mp4')), key=os.path.getmtime)
    qd = os.path.join(clip_dir, 'qc'); os.makedirs(qd, exist_ok=True)
    rep, bad = [], 0
    def say(ok, msg):
        nonlocal bad; rep.append(('OK     ' if ok else 'AVISO  ') + msg); bad += (not ok)
    info = json.loads(subprocess.run(f'ffprobe -v error -show_entries format=duration:stream=codec_type,r_frame_rate,width,height -of json "{mp4}"', shell=True, capture_output=True, text=True).stdout)
    dur = float(info['format']['duration']); want = float(cfg['duration']) + (6.6 if cfg.get('ending') else 0)
    say(abs(dur - want) < 0.05, f'duración {dur:.3f} s (esperada {want:.3f})')
    v = [s for s in info['streams'] if s['codec_type'] == 'video'][0]; fps = eval(v['r_frame_rate'])
    say(v['width'] == cfg['size'][0] and v['height'] == cfg['size'][1], f"tamaño {v['width']}x{v['height']}, {fps:g} fps")
    F = frames(mp4, None).astype(np.int16); story = int(float(cfg['duration']) * fps)
    sd = F.reshape(len(F), -1).std(axis=1)
    blank = [i / fps for i in range(1, min(story, len(F))) if sd[i] < 0.8]   # frame 0 may be the empty page the thread starts on
    say(not blank, 'sin fotogramas en blanco' if not blank else f'{len(blank)} fotogramas en blanco desde {blank[0]:.2f} s')
    # dots crawling: change between consecutive frames that are NOT a camera step
    step = cfg.get('camStep', 12)
    ch = (np.abs(np.diff(F[:story], axis=0)) > 60).mean(axis=(1, 2))
    if step:
        isstep = np.array([int((i + 1) / fps * step + 1e-6) != int(i / fps * step + 1e-6) for i in range(len(ch))])
        calm = ch[~isstep]; say(np.percentile(calm, 90) < 0.04 * 60 / fps, f'trama quieta entre saltos de cámara (90 % de los fotogramas cambian < {np.percentile(calm, 90) * 100:.1f} %)')
    else: say(np.percentile(ch, 90) < 0.04 * 60 / fps, f'cambio entre fotogramas: p90 {np.percentile(ch, 90) * 100:.1f} %')
    if cfg.get('ending'):   # the seam: last story frame vs first logo frame, around the thread
        i = story; a, b = F[i - 1], F[min(i, len(F) - 1)]
        d = np.abs(a.astype(int) - b.astype(int)) > 40; say(d.mean() < 0.01, f'empalme con el logo: {d.mean() * 100:.2f} % de píxeles cambian en el corte')
    if cfg.get('bucle') and not cfg.get('ending'):   # loop video: it repeats with no cut, so last frame -> first frame must be seamless (no logo seam to look for)
        a, b = F[0].astype(float), F[-1].astype(float); mse = ((a - b) ** 2).mean()
        psnr = 99.0 if mse < 1e-9 else 10 * np.log10(255 ** 2 / mse)
        say(psnr >= 45, f'bucle imagen: primer y último fotograma, PSNR {psnr:.1f} dB (mínimo 45)')
    aud = [s for s in info['streams'] if s['codec_type'] == 'audio']
    if aud:
        out = subprocess.run(f'ffmpeg -hide_banner -nostats -i "{mp4}" -af ebur128=peak=true -f null -', shell=True, capture_output=True, text=True, errors='replace').stderr
        I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', out)[-1]); TP = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', out)[-1])
        say(abs(I + 14) < 1.0 and TP <= -0.9, f'sonido {I:.1f} LUFS, pico {TP:.1f} dBTP')
        if cfg.get('bucle') and not cfg.get('ending'):   # audio seam: last 50 ms vs first 50 ms (RMS), and the biggest sample step across the join
            raw = subprocess.run(f'ffmpeg -loglevel error -i "{mp4}" -vn -f f32le -ac 1 -ar 48000 -', shell=True, capture_output=True).stdout
            x = np.frombuffer(raw, np.float32).astype(float); k = 2400
            if len(x) > 4 * k:
                rms = lambda y: np.sqrt(np.mean(y ** 2) + 1e-12)
                dl = abs(20 * np.log10(rms(x[-k:]) / rms(x[:k])))
                join = abs(x[0] - x[-1]); typ = np.percentile(np.abs(np.diff(x)), 99.9) + 1e-9   # typical big step inside the track
                say(dl < 3 and join < 4 * typ, f'bucle sonido: nivel último/primer 50 ms difiere {dl:.1f} dB (máx 3); salto en el empalme {join:.4f} (hasta {typ:.4f} es normal dentro de la pista)')
    else: rep.append('-      sin sonido')
    # contact sheet, 2 frames/s
    S = frames(mp4, 2, 216); n = len(S); cols = 9; rows = (n + cols - 1) // cols; h, w = S.shape[1:]
    sheet = np.full((rows * (h + 6) + 6, cols * (w + 6) + 6), 255, np.uint8)
    for k in range(n): r, c = divmod(k, cols); sheet[6 + r * (h + 6):6 + r * (h + 6) + h, 6 + c * (w + 6):6 + c * (w + 6) + w] = S[k]
    Image.fromarray(sheet).save(os.path.join(qd, 'hoja-mp4.jpg'), quality=85)
    # blind-test sheet: one frame in the middle of each beat (story only), numbered, nothing else -> a fresh Sonnet says what happens
    # the moments that tell (bubbles, cards, chip, untangle, poses, cuts), spread over the WHOLE story: ~1 every 3.5 s, at least 9
    #   (it used to take the first 9 beats: on a 54 s story the sheet showed only the first 10 s)
    tell = ('burbuja', 'tarjeta-en-sala', 'tarjeta-pantalla', 'chip', 'resolver', 'pose', 'camara', 'dibujar-vivienda', 'coger-movil', 'abrir-3d', 'garabato', 'abanico', 'repartir', 'caminar')
    todos = cfg.get('pulsos', []) + [q for c in cfg.get('capitulos', []) for q in c.get('pulsos', [])]   # chapters: their beats too
    ts = sorted({round(p['t'] + max(p.get('dur', 0), 0.4) * 0.6, 2) for p in todos if p['jugada'] in tell})
    ts = [t for i, t in enumerate(ts) if i == 0 or t - ts[i - 1] > 0.5]
    n = min(len(ts), max(9, round(float(cfg['duration']) / 3.5)))
    if len(ts) > n: ts = [ts[round(i * (len(ts) - 1) / (n - 1))] for i in range(n)]
    if ts:
        ims = []
        for t in ts:
            r = subprocess.run(f'ffmpeg -loglevel error -ss {t} -i "{mp4}" -frames:v 1 -vf scale=360:-2 -f rawvideo -pix_fmt rgb24 -', shell=True, capture_output=True).stdout
            hh = len(r) // (360 * 3); ims.append(Image.frombytes('RGB', (360, hh), r[:360 * 3 * hh]))
        hh = ims[0].height; cs = min(len(ims), 5); rs = (len(ims) + cs - 1) // cs
        bl = Image.new('RGB', (cs * 372 + 12, rs * (hh + 12) + 12), (255, 255, 255))
        for k, im in enumerate(ims): bl.paste(im, (12 + (k % cs) * 372, 12 + (k // cs) * (hh + 12)))
        bl.save(os.path.join(qd, 'ciegas.jpg'), quality=88); rep.append(f'-      hoja para la prueba a ciegas: qc/ciegas.jpg ({len(ims)} momentos, en orden)')
    txt = f'QC {os.path.basename(mp4)}\n' + '\n'.join(rep) + f'\n{"TODO BIEN" if not bad else str(bad) + " AVISO(S)"}\n'
    open(os.path.join(qd, 'informe.txt'), 'w', encoding='utf-8').write(txt); print(txt)
    return bad


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(1 if main(os.path.abspath(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else None) else 0)
