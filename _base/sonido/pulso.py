"""Pulso de una pista de musica: BPM, primer pulso (tiempo del primer 1 del compas) y el mejor `desde` para que los cortes caigan en pulso.

Uso:
  python pulso.py <audio>                                   -> BPM y primer pulso
  python pulso.py <audio> --cortes 6.5,41.1,46.5 --dur 54   -> ademas, el mejor `desde` (el inicio en la pista) para esos tiempos de video
  python pulso.py <audio> --clip <carpeta del clip>         -> lo mismo, leyendo los `corte` y la duracion de <carpeta>/golpes.json
  opciones: --cerca X (elegir el `desde` mas cercano a X s), --bpm N (no estimar, usar este BPM y buscar solo la fase)

Sin librosa (no esta instalada): flujo espectral con scipy + autocorrelacion para el tempo, y un peine de pulsos (BPM fino y fase) para ajustar.
El primer 1 del compas se decide por la energia grave (bombo y bajo) en cada una de las 4 posiciones: es una heuristica, puede equivocarse
de pulso (no de BPM ni de fase) en musica sin bombo claro; `primer_pulso` en clip.json manda sobre ella.
Como biblioteca: analizar(ruta) -> {'bpm','primer_pulso','pulsos_por_compas','duracion'}; mejor_desde(info, cortes, dur, cerca=None) -> (desde, error_medio_ms)."""
import json, os, subprocess, sys
import numpy as np
from scipy import signal
from scipy.ndimage import gaussian_filter1d

SR_A = 22050
NFFT, HOP = 512, 128          # ventana 23 ms, salto 5.8 ms
FPS = SR_A / HOP
AQUI = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(AQUI, 'musica', '_pulso-cache.json')


def cargar_mono(ruta, max_s=600):
    """Decodifica con ffmpeg (mp3/wav/ogg/lo que sea) a mono 22.05 kHz float."""
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', ruta, '-t', str(max_s), '-ac', '1', '-ar', str(SR_A), '-f', 'f32le', '-'], capture_output=True)
    if p.returncode != 0 or not p.stdout: raise RuntimeError(f'ffmpeg no pudo leer {ruta}: {p.stderr.decode(errors="ignore")[:200]}')
    return np.frombuffer(p.stdout, dtype='<f4').astype(np.float64)


def _onsets(x):
    f, t, S = signal.stft(x, SR_A, nperseg=NFFT, noverlap=NFFT - HOP, boundary=None, padded=False)
    M = np.log1p(30 * np.abs(S))
    d = np.maximum(0, np.diff(M, axis=1, prepend=M[:, :1]))
    total = d.sum(axis=0)
    grave = d[f < 160].sum(axis=0)
    def limpiar(v):
        v = v - gaussian_filter1d(v, 0.6 * FPS)   # quitar la media local (1 s)
        v = np.maximum(v, 0); return v / (v.std() + 1e-9)
    # el tiempo del fotograma k es el centro de su ventana: k*HOP + NFFT/2 muestras
    return limpiar(total), limpiar(grave), NFFT / 2 / SR_A


def _tempo_grueso(env):
    n = len(env); e = env - env.mean()
    ac = np.fft.irfft(np.abs(np.fft.rfft(e, 2 * n)) ** 2)[:n]
    bpms = np.arange(70.0, 181.0, 0.5); lags = 60 * FPS / bpms
    val = np.interp(lags, np.arange(n), ac)
    # el pulso suele reforzarse tambien en 2x y 4x su periodo
    val = val + 0.5 * np.interp(2 * lags, np.arange(n), ac) + 0.25 * np.interp(4 * lags, np.arange(n), ac)
    prior = np.exp(-0.5 * (np.log2(bpms / 120.0) / 0.8) ** 2)
    return float(bpms[np.argmax(val * prior)])


def _peine(env, bpm, fases=None):
    """Puntuacion del peine de pulsos a `bpm` para cada fase (en s) de `fases`. Devuelve array."""
    dur = len(env) / FPS; per = 60.0 / bpm
    if fases is None: fases = np.arange(0, per, 0.004)
    k = np.arange(int(dur / per) + 1)
    tt = fases[:, None] + k[None, :] * per
    ok = tt < dur - 0.05
    v = np.interp(tt * FPS, np.arange(len(env)), env)
    return (v * ok).sum(axis=1) / np.maximum(ok.sum(axis=1), 1), fases


def analizar(ruta, bpm=None, usar_cache=True):
    ruta = os.path.abspath(ruta); st = os.stat(ruta)
    clave = f'{ruta}|{st.st_size}|{int(st.st_mtime)}|{bpm}'
    cache = {}
    if usar_cache and os.path.isfile(CACHE):
        try: cache = json.load(open(CACHE, encoding='utf-8'))
        except Exception: cache = {}
        if clave in cache: return cache[clave]
    x = cargar_mono(ruta); dur = len(x) / SR_A
    env, grave, sesgo = _onsets(x)
    env = gaussian_filter1d(env, 1.0)   # ~6 ms de tolerancia
    g = gaussian_filter1d(grave, 1.0)
    b0 = float(bpm) if bpm else _tempo_grueso(env)
    # BPM fino: +-3 % alrededor del grueso, paso 0.02, maxima puntuacion del peine sobre todas las fases
    mejor = (-1, b0, 0.0)
    for b in ([b0] if bpm else np.arange(b0 * 0.97, b0 * 1.03, 0.02)):
        sc, fs = _peine(env, b)
        i = int(np.argmax(sc))
        if sc[i] > mejor[0]: mejor = (sc[i], float(b), float(fs[i]))
    _, b, fase = mejor
    per = 60.0 / b
    # afinar la fase con paso fino alrededor
    fs = np.arange(fase - 0.01, fase + 0.01, 0.001); sc, fs = _peine(env, b, fs); fase = float(fs[np.argmax(sc)])
    fase = fase % per   # sin correccion de ventana: medido con la pista de prueba (primer pulso real 0.200 s) el flujo ya cae en el centro del fotograma, a ~10 ms
    # primer 1 del compas: de las 4 posiciones, la de mas grave
    k = np.arange(int(dur / per) - 1); tt = fase + k * per
    v = np.interp(tt * FPS, np.arange(len(g)), g)
    cuatro = [v[j::4].mean() for j in range(4)]
    j = int(np.argmax(cuatro))
    primer = fase + j * per
    res = {'bpm': round(b, 3), 'primer_pulso': round(primer, 4), 'pulsos_por_compas': 4, 'duracion': round(dur, 3), 'fase_pulso': round(fase, 4),
           'grave_por_posicion': [round(float(c), 3) for c in cuatro]}
    if usar_cache:
        cache[clave] = res
        try: json.dump(cache, open(CACHE, 'w', encoding='utf-8'), indent=1)
        except OSError: pass
    return res


def mejor_desde(info, cortes, dur, cerca=None):
    """`desde` (s dentro de la pista) que acerca los `cortes` (tiempos de video) a los pulsos. La puntuacion es periodica con el pulso,
    asi que se elige la fase buena y, entre sus repeticiones, la mas cercana a `cerca` (por defecto, la primera >= 0).
    Devuelve (desde, error medio en ms)."""
    per = 60.0 / info['bpm']; ref = info['fase_pulso']
    cortes = np.asarray([c for c in cortes if 0 < c < dur], dtype=float)
    if len(cortes) == 0: return (cerca if cerca is not None else info['primer_pulso']) , 0.0
    # un corte en video t cae en pista d + t; error = distancia de (d + t - ref) al multiplo de per mas cercano
    def err(d):
        r = (d + cortes - ref) % per; r = np.minimum(r, per - r); return float(np.mean(np.minimum(r, 0.12) ** 2))
    cand = np.arange(0, per, 0.002)
    e = np.array([err(d) for d in cand]); d0 = float(cand[int(np.argmin(e))])
    hi = info['duracion'] - dur
    if cerca is None: cerca = 0.0
    k = round((cerca - d0) / per); d = d0 + k * per
    while d < 0: d += per
    while d > hi and d - per >= 0: d -= per
    r = (d + cortes - ref) % per; r = np.minimum(r, per - r)
    return round(d, 3), float(np.mean(r) * 1000)


def main(a):
    if not a or a[0] in ('-h', '--help'): sys.exit(__doc__)
    ruta = a[0]; opt = {}
    i = 1
    while i < len(a):
        if a[i].startswith('--'): opt[a[i][2:]] = a[i + 1]; i += 2
        else: i += 1
    info = analizar(ruta, bpm=float(opt['bpm']) if 'bpm' in opt else None)
    print(f'{os.path.basename(ruta)}: {info["duracion"]:.1f} s  BPM {info["bpm"]:.2f}  primer pulso (primer 1 del compas) {info["primer_pulso"]:.3f} s  '
          f'(fase de pulso {info["fase_pulso"]:.3f} s, grave por posicion {info["grave_por_posicion"]})')
    cortes = None; dur = float(opt['dur']) if 'dur' in opt else None
    if 'cortes' in opt: cortes = [float(x) for x in opt['cortes'].split(',') if x]
    if 'clip' in opt:
        g = json.load(open(os.path.join(opt['clip'], 'golpes.json'), encoding='utf-8'))
        cortes = [e['t'] for e in g['golpes'] if e['tipo'] == 'corte']; dur = dur or float(g['duracion'])
    if cortes:
        if dur is None: sys.exit('Falta --dur (duracion de la historia en s)')
        d, e = mejor_desde(info, cortes, dur, float(opt['cerca']) if 'cerca' in opt else None)
        print(f'mejor desde = {d:.3f} s  (error medio de los {len(cortes)} cortes al pulso: {e:.0f} ms)')


if __name__ == '__main__':
    main(sys.argv[1:])
