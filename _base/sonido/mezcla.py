"""Mezcla de sonido del mundo base GM.  Uso:  python _base/sonido/mezcla.py <carpeta del clip> [--grafico ruta.png]

Lee <carpeta>/golpes.json (lista corta de eventos) y escribe <carpeta>/render/mezcla.wav:
48 kHz, estereo, 16 bit, duracion EXACTA (duracion + 6.6 si "final"), loudnorm de dos pasadas a -14 LUFS, pico real <= -1 dBTP.
Con "musica" en clip.json (ver LEEME.md) la cama sintetizada se sustituye por una pista real (archivo de audio) con ducking bajo los efectos.
Determinista: misma entrada, mismos bytes.  Identidad: la de Nudos 1 / v4.1 (mismos SFX de la casa, misma cama a 110 BPM en Do mayor,
mismo final de logo, que se reutiliza tal cual desde recursos/final-6.6s.wav).  Ver LEEME.md para la tabla de eventos."""
import json, os, re, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pulso

AQUI = os.path.dirname(os.path.abspath(__file__))
REC = os.path.join(AQUI, 'recursos')
SR = 48000
FINAL_DUR = 6.6
NIVEL_CAMA = 10 ** (2.5 / 20)   # la cama del kit (RMS medido en Nudos 1) +2.5 dB: una historia nueva tiene menos efectos que Nudos y la cama quedaba corta
TIPOS = ['corte', 'lapiz', 'entra-hilo', 'burbuja', 'tarjeta', 'naranja', 'resolver', 'subida', 'golpe', 'tic']


# ------------------------------------------------------------------ utilidades de señal (las del kit)
def cargar(ruta):
    d, sr = sf.read(ruta, dtype='float64')
    if d.ndim > 1: d = d.mean(axis=1)
    if sr != SR: d = signal.resample_poly(d, SR, sr)
    return d


def pitch(x, f):
    n = int(len(x) / f); return np.interp(np.arange(n) * f, np.arange(len(x)), x)


def fade(x, fi=0.003, fo=0.01):
    x = x.copy(); a = min(int(fi * SR), len(x) // 2); b = min(int(fo * SR), len(x) // 2)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x


def trim(x, dur, fo=0.01): return fade(x[: int(dur * SR)], 0.001, fo)


def loop_to(x, dur, xf=0.08):
    n = int(dur * SR); k = int(xf * SR); out = x.copy()
    while len(out) < n + k:
        out = np.concatenate([out[:-k], out[-k:] * np.linspace(1, 0, k) + x[:k] * np.linspace(0, 1, k), x[k:]])
    return out[:n]


def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], btype='band', fs=SR, output='sos'), x)
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, btype='low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, btype='high', fs=SR, output='sos'), x)
def norm(x, peak=1.0): return x / (np.abs(x).max() + 1e-9) * peak
def swell(n, power=1.0): return np.sin(np.pi * np.linspace(0, 1, n)) ** power


def pen(rng, dur, rate=(7, 13), bright=1.0, low=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = bp(rng.standard_normal(n), 1600 * bright, 6000 * bright)
    f = 0.5 * (rate[0] + rate[1]) + 0.5 * (rate[1] - rate[0]) * np.sin(2 * np.pi * 0.9 * t + rng.uniform(0, 6)) + 1.2 * np.sin(2 * np.pi * 2.3 * t)
    mod = 0.35 + 0.65 * np.abs(np.sin(np.pi * np.cumsum(f) / SR))
    return norm(fade(nz * mod + low * bp(rng.standard_normal(n), 250, 900) * mod, 0.03, 0.05))


def mallet(f, d=1.2, tau=0.45):
    t = np.arange(int(d * SR)) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / tau) + 0.35 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / (tau * 0.45)) + 0.1 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.05)
    return fade(x * np.minimum(1, t / 0.003), 0.001, 0.15)


NOTE = {'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'G4': 392.0, 'A4': 440.0, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99}


class Bus:
    """Bus estereo con reparto de panorama de potencia constante (el `place` del kit)."""
    def __init__(self, n, off=0.0): self.b = np.zeros((2, n)); self.off = off   # off: segundos de colchon antes de t=0 (modo bucle)

    def place(self, x, t, gain=1.0, pan=0.0):
        i = int(round((t + self.off) * SR))
        if len(x) == 0 or i >= self.b.shape[1]: return
        if i < 0: x = x[-i:]; i = 0
        x = x[: self.b.shape[1] - i] * gain
        ang = (pan + 1) * np.pi / 4
        self.b[0, i:i + len(x)] += x * np.cos(ang) * np.sqrt(2)
        self.b[1, i:i + len(x)] += x * np.sin(ang) * np.sqrt(2)


# ------------------------------------------------------------------ recursos
_cache = {}
def A(carpeta, nombre):
    k = (carpeta, nombre)
    if k not in _cache: _cache[k] = cargar(os.path.join(REC, carpeta, nombre + '.wav'))
    return _cache[k]


def casa(n): return A('sfx-casa', n)
def kit(n): return A('sfx-kit', n)


# ------------------------------------------------------------------ eventos.  Cada uno: f(ctx, ev, k) coloca sonido en ctx.bus
# ctx.rng(k) da un generador propio por evento (cambiar un evento no altera el resto).  Ganancias = las del kit (unidades de premezcla).
def _g(ev): return float(ev.get('g', 1.0))
def _p(ev, d=0.0): return float(ev.get('pan', d))


def ev_corte(c, ev, k):          # whoosh que arranca 0.15 s ANTES del corte
    w = [casa('whoosh'), casa('whoosh_b'), casa('whoosh_c')]
    c.bus.place(w[c.n['corte'] % 3], ev['t'] - 0.15, 0.4 * _g(ev), _p(ev))


def ev_lapiz(c, ev, k):          # lapiz bajo el hilo durante todo t0-t1 (cama de garabato en bucle, como en el kit)
    t0, t1 = ev['t0'], ev['t1']
    s = [casa('scribble'), casa('scribble_b'), casa('scribble_c')][c.n['lapiz'] % 3]
    c.bus.place(fade(loop_to(s, t1 - t0), 0.05, 0.12), t0, 0.25 * _g(ev), _p(ev, 0.1))


def ev_entra_hilo(c, ev, k):     # el hilo entra: golpe grave suave + barrido de pluma
    t = ev['t']; r = c.rng(k)
    c.bus.place(kit('low_thump'), t, 0.28 * _g(ev), _p(ev))
    c.bus.place(pen(r, 0.32, rate=(12, 20), bright=0.9) * swell(int(0.32 * SR), 0.6), t + 0.02, 0.2 * _g(ev), _p(ev, 0.1))


def ev_burbuja(c, ev, k):        # pop suave de burbuja (tono ligeramente distinto cada vez)
    rate = [1.0, 1.08, 0.94][c.n['burbuja'] % 3]
    c.bus.place(pitch(kit('pared_bubble_pop'), rate), ev['t'], 0.3 * _g(ev), _p(ev, 0.15 * (1 if c.n['burbuja'] % 2 else -1)))


def ev_tarjeta(c, ev, k):        # la tarjeta se arma y se levanta: papel que se despliega + aterrizaje suave
    t = ev['t']
    c.bus.place(trim(kit('pared_paper_unfold'), 0.4, 0.08), t - 0.05, 0.4 * _g(ev), _p(ev))
    c.bus.place(casa('stamp'), t + 0.1, 0.3 * _g(ev), _p(ev))


def ev_naranja(c, ev, k):        # el campo naranja se abre: oleaje suave + pad Do-Sol-Mi que florece
    t = ev['t']; r = c.rng(k)
    n = int(0.9 * SR); fl = lp(bp(r.standard_normal(n), 60, 900), 500) * swell(n, 0.8)
    c.bus.place(norm(fl), t - 0.1, 0.2 * _g(ev), _p(ev))
    m = int(1.2 * SR); tt = np.arange(m) / SR; padx = np.zeros(m)
    for f in (130.81, 196.0, 329.63):
        for det in (-0.8, 0.8): padx += np.sin(2 * np.pi * (f + det) * tt)
    env = np.minimum(1, tt / 0.35) * np.exp(-np.maximum(0, tt - 0.35) / 0.4)
    c.bus.place(lp(norm(padx * env), 1800), t, 10 ** (-24 / 20) * _g(ev), _p(ev))
    c.bus.place(trim(casa('whoosh_b'), 0.5, 0.1), t, 0.12 * _g(ev), _p(ev))


def ev_resolver(c, ev, k):       # la cabeza se desenreda: pluma que se aquieta, dos notas que bajan a la tonica y acorde de Do
    t = ev['t']; r = c.rng(k)
    c.bus.place(pen(r, 0.35, rate=(10, 16)) * np.linspace(1, 0.2, int(0.35 * SR)), t - 0.3, 0.12 * _g(ev), _p(ev, 0.1))
    c.bus.place(mallet(NOTE['D5'], 0.9, 0.35), t, 0.15 * _g(ev), _p(ev, 0.2))
    c.bus.place(mallet(NOTE['C5'], 1.1, 0.4), t + 0.18, 0.16 * _g(ev), _p(ev, 0.0))
    m = int(1.6 * SR); tt = np.arange(m) / SR; ch = np.zeros(m)
    for nm in ('C4', 'E4', 'G4'):
        for det in (-0.6, 0.6): ch += np.sin(2 * np.pi * (NOTE[nm] + det) * tt) + 0.22 * np.sin(4 * np.pi * (NOTE[nm] + det) * tt)
    env = np.minimum(1, tt / 0.03) * np.exp(-np.maximum(0, tt - 0.25) / 0.6)
    c.bus.place(norm(fade(ch * env, 0.001, 0.3)), t + 0.18, 0.12 * _g(ev), _p(ev))


def ev_subida(c, ev, k):         # el hilo sube hacia el final: ruido que se abre + tono que sube + riser de la casa aterrizando al final
    t = ev['t']; r = c.rng(k)
    if 'hasta' in ev: L = ev['hasta'] - t
    elif c.final: L = c.dur - t
    else: L = 1.2
    L = float(np.clip(L, 0.3, 4.0)); n = int(L * SR); tt = np.arange(n) / SR; u = tt / L
    rs = r.standard_normal(n); out = np.zeros(n); cut = 300 * (1 + 20 * u ** 2)
    for i in range(0, n, 2048):
        seg = rs[i:i + 2048]; fc = float(min(cut[i], 9000))
        out[i:i + 2048] = signal.sosfilt(signal.butter(2, fc, 'low', fs=SR, output='sos'), seg)
    tn = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (u * 2)) / SR) * 0.4
    rise = norm(fade((out / (np.abs(out).max() + 1e-9) + tn) * u ** 1.6, 0.05, 0.02))
    c.bus.place(rise, t, 0.12 * _g(ev), _p(ev))
    c.bus.place(pitch(casa('riser'), 0.9), t + L - 0.30, 0.5 * _g(ev), _p(ev))


def ev_golpe(c, ev, k):          # golpe suave generico
    c.bus.place(kit('low_thump'), ev['t'], 0.4 * _g(ev), _p(ev))
    c.bus.place(casa('click'), ev['t'], 0.15 * _g(ev), _p(ev))


def ev_tic(c, ev, k):            # tic de reloj, alterna dos alturas
    c.bus.place(pitch(casa('tick'), [1.0, 0.9][c.n['tic'] % 2]), ev['t'], 0.5 * _g(ev), _p(ev))


EVENTOS = {'corte': ev_corte, 'lapiz': ev_lapiz, 'entra-hilo': ev_entra_hilo, 'burbuja': ev_burbuja, 'tarjeta': ev_tarjeta,
           'naranja': ev_naranja, 'resolver': ev_resolver, 'subida': ev_subida, 'golpe': ev_golpe, 'tic': ev_tic}
assert sorted(EVENTOS) == sorted(TIPOS)


# ------------------------------------------------------------------ la cama (110 BPM, Do mayor, C - Am - F - G; instrumentos de synth_music_45.py)
def cama(t_ini, t_fin, bpm, semilla=11, bucle=False):
    """Cama de la casa entre t_ini y t_fin (s). Devuelve (L, R) de longitud int(t_fin*SR) (cae a cero en t_fin). Sin normalizar."""
    rng = np.random.default_rng(semilla)
    N = int(round(t_fin * SR)); Lc = np.zeros(N); Rc = np.zeros(N); beat = 60.0 / bpm
    mid = lambda m: 440.0 * 2 ** ((m - 69) / 12)
    NT = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    n = lambda nm, o: 12 * (o + 1) + NT[nm]
    pn = lambda s: n(s[0], int(s[1]))

    def add(sig, start, pan=0.0, gain=1.0):
        i = int(round(start * SR))
        if i >= N or i < 0: return
        seg = sig[: N - i] * gain
        Lc[i:i + len(seg)] += seg * np.cos((pan + 1) * np.pi / 4); Rc[i:i + len(seg)] += seg * np.sin((pan + 1) * np.pi / 4)

    def rel(s, r=0.04):
        k = min(int(r * SR), len(s)); s[-k:] *= np.linspace(1, 0, k); return s

    def rhodes(f, dur, tau=1.4, idx=1.0):
        x = np.arange(int(dur * SR)) / SR; env = np.minimum(x / 0.006, 1) * np.exp(-x / tau); I = idx * np.exp(-x / 0.35)
        return rel((np.sin(2 * np.pi * f * x + I * np.sin(2 * np.pi * f * x)) + 0.12 * np.sin(2 * np.pi * f * 6 * x) * np.exp(-x / 0.04)) * env)

    def padn(f, dur):
        x = np.arange(int(dur * SR)) / SR; s = 0
        for dt in (-0.12, 0.0, 0.12):
            ff = f * 2 ** (dt / 12); s = s + np.sin(2 * np.pi * ff * x) + 0.3 * np.sin(4 * np.pi * ff * x) + 0.08 * np.sin(6 * np.pi * ff * x)
        return s * np.minimum(x / 0.5, 1) * np.minimum((dur - x) / 0.7, 1).clip(0, 1) / 3

    def mal(f, dur=1.0, tau=0.28):
        x = np.arange(int(dur * SR)) / SR
        return rel((np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 4 * x) * np.exp(-x / 0.05)) * np.minimum(x / 0.002, 1) * np.exp(-x / tau))

    def pluck(f, dur=0.6, tau=0.13):
        x = np.arange(int(dur * SR)) / SR
        s = np.sin(2 * np.pi * f * x) + 0.5 * np.sin(4 * np.pi * f * x) * np.exp(-x / 0.03) + 0.25 * np.sin(6 * np.pi * f * x) * np.exp(-x / 0.015)
        return rel(s * np.minimum(x / 0.001, 1) * np.exp(-x / tau))

    def noise_hit(dur, lo, hi, tau, attack=0.002):
        x = np.arange(int(dur * SR)) / SR
        return bp(rng.standard_normal(len(x)), lo, hi) * np.minimum(x / attack, 1) * np.exp(-x / tau)

    def bass(f, dur, tau=0.6):
        x = np.arange(int(dur * SR)) / SR
        return rel(np.sin(2 * np.pi * f * x) * np.minimum(x / 0.01, 1) * np.exp(-x / tau))

    CH = {'C': ([n('C', 3), n('G', 3), n('B', 3), n('E', 4)], [n('C', 3), n('E', 3), n('G', 3), n('B', 3)], n('C', 2)),
          'Am': ([n('A', 2), n('E', 3), n('G', 3), n('C', 4)], [n('A', 2), n('E', 3), n('G', 3), n('C', 4)], n('A', 1)),
          'F': ([n('F', 2), n('C', 3), n('E', 3), n('A', 3)], [n('F', 2), n('C', 3), n('A', 3), n('E', 4)], n('F', 1)),
          'G': ([n('G', 2), n('D', 3), n('G', 3), n('B', 3)], [n('G', 2), n('D', 3), n('B', 3), n('D', 4)], n('G', 1))}
    PROG = ['C', 'Am', 'F', 'G']
    ARP = {'C': ['C5', 'E5', 'G5', 'E5'], 'Am': ['A4', 'C5', 'E5', 'C5'], 'F': ['A4', 'C5', 'F5', 'C5'], 'G': ['B4', 'D5', 'G5', 'D5']}
    LIFT = {'C': 'G5', 'Am': 'A5', 'F': 'C6', 'G': 'D6'}

    b_ini, END_B = t_ini / beat, t_fin / beat
    # intensidad: entra suave (0.45), crece cada compas hasta 1.0 en 8 pulsos y se mantiene; el ultimo compas es el dulce (como s07 en Nudos)
    lvl = (lambda b: 1.0) if bucle else (lambda b: float(np.interp(b, [b_ini, b_ini + 8, END_B], [0.45, 1.0, 0.95])))   # bucle: nivel fijo, sin entrada suave
    bar = int(np.floor(b_ini / 4))
    while bar * 4 < END_B:
        b0 = bar * 4; name = PROG[bar % 4]
        rn, pd, bs = CH[name]
        t0 = b0 * beat; blen = (min(b0 + 4, END_B) - b0) * beat
        ts = max(t0, t_ini); lv = lvl(max(b0, b_ini) + 1)
        for i, m in enumerate(rn): add(rhodes(mid(m), blen + 0.5, tau=1.5), ts + i * 0.028, pan=-0.55 + 0.2 * i, gain=0.18 * lv)
        for m in pd: add(padn(mid(m), blen + 0.6), ts, gain=0.09 * min(lv, 1.0))
        if b0 + 4 > b_ini + 4:                                        # bajo en 1 y 3 desde el segundo compas de la cama
            for kk in (0, 2):
                if b0 + kk < END_B and b0 + kk >= b_ini: add(bass(mid(bs), 1.0), t0 + kk * beat, gain=0.26 * min(lv, 1.1))
        if b0 + 4 > b_ini + 2:                                        # arpegio de pizzicato
            dens = [(0.5, 0), (1.5, 1), (2.5, 2), (3.5, 3)] if lv < 0.95 else [(0, 0), (0.5, 1), (1, 2), (1.5, 3), (2, 2), (2.5, 1), (3, 2), (3.5, 3)]
            for st, kk in dens:
                tt = t0 + st * beat
                if tt < t_ini + 2 * beat or b0 + st >= END_B: continue
                add(pluck(mid(pn(ARP[name][kk]))), tt, pan=-0.35 if kk % 2 else 0.35, gain=0.13 * lv)
        if not bucle and b0 + 4 >= END_B and b0 + 4 - 1e-9 <= END_B + 4 and END_B - b0 >= 2 and b0 >= b_ini + 4:   # compas dulce justo antes del final
            for i, m in enumerate(rn): add(rhodes(mid(m + 12), 1.8, tau=1.0), t0 + 0.03 + i * 0.045, pan=0.1 + 0.15 * i, gain=0.08)
            add(mal(mid(pn(LIFT[name])), 1.4, 0.45), t0 + 0.02, pan=0.3, gain=0.14)
        bar += 1
    if END_B - b_ini > 8:                                              # escobillas y shaker desde el tercer compas
        for b in np.arange(max(b_ini + 8, np.ceil(b_ini * 2) / 2), END_B, 0.5):
            acc = 1.0 if (b * 2) % 2 == 1 else 0.6
            add(noise_hit(0.07, 6000, 11000, 0.02), b * beat, pan=0.25 if (b * 2) % 2 else -0.15, gain=0.08 * acc * lvl(b))
        for b in np.arange(np.ceil(b_ini + 4), END_B, 1.0):
            if int(round(b)) % 2 == 1: add(noise_hit(0.22, 2500, 7000, 0.07, attack=0.03), b * beat, gain=0.10 * lvl(b))

    def reverb(x):
        ir_len = int(1.8 * SR); xx = np.arange(ir_len) / SR
        ir = np.random.default_rng(3).standard_normal(ir_len) * np.exp(-xx / 0.45)
        ir = signal.sosfilt(signal.butter(1, 4500, fs=SR, output='sos'), ir)
        ir[: int(0.012 * SR)] *= 0.2; ir /= np.sqrt(np.sum(ir ** 2))
        return signal.fftconvolve(x, ir)[: len(x)]

    gate = np.ones(N); k = min(144, N)
    if not bucle: gate[N - k:] = np.linspace(1, 0, k, endpoint=False)   # cae a cero EXACTO en t_fin (3 ms de rampa)
    return (Lc + 0.35 * reverb(Lc)) * gate, (Rc + 0.35 * reverb(Rc)) * gate


# ------------------------------------------------------------------ musica real (clip.json -> "musica"): pista de audio en lugar de la cama sintetizada
DUCK = {'corte': (0.15, 0.55, 3.0), 'entra-hilo': (0.0, 0.5, 3.0), 'burbuja': (0.0, 0.3, 3.0), 'tarjeta': (0.05, 0.55, 3.5), 'naranja': (0.1, 1.3, 3.0),
        'resolver': (0.3, 1.4, 3.0), 'golpe': (0.0, 0.35, 4.0), 'tic': (0.0, 0.12, 2.0)}   # tipo: (antes, despues, dB de bajada); lapiz y subida van aparte
DUCK_LAPIZ, DUCK_SUBIDA = 2.0, 2.0
DUCK_ATAQUE, DUCK_SUELTA, DUCK_ADELANTO = 0.06, 0.12, 0.05   # constantes de tiempo (s) y cuanto se anticipa la bajada para que ya este abajo cuando suena el efecto
MUSICA_LUFS = -17.0       # sonoridad de la musica sola dentro de la mezcla final (ya normalizada a -14); gain_db la mueve
FADE_IN, FADE_OUT = 0.15, 1.5
_ULTIMO = {}              # datos de la ultima mezcla con musica (para pruebas): 'duck_db', 'fs_duck', 'info'


def _archivo_musica(a, carpeta):
    if os.path.isabs(a) and os.path.isfile(a): return a
    for base in (os.path.dirname(AQUI), carpeta, AQUI, os.getcwd()):   # relativo a _base/ (donde vive sonido/), al clip, a sonido/ o a donde se ejecuta
        p = os.path.join(base, a)
        if os.path.isfile(p): return p
    sys.exit(f'ERROR: musica: no existe el archivo {a!r} (probado en _base/, en la carpeta del clip y en sonido/)')


def curva_duck(golpes, dur, fs=1000):
    """Bajada de la musica (dB, <= 0) cada 1/fs s bajo los efectos: maximo (no suma) de las bajadas activas, suavizada con ataque/suelta."""
    n = int(np.ceil((dur + 8.0) * fs)); tgt = np.zeros(n)
    for e in golpes:
        tp = e['tipo']
        if tp == 'lapiz': a, b, d = e['t0'], e['t1'], DUCK_LAPIZ
        elif tp == 'subida':
            t = e['t']; L = (e['hasta'] - t) if 'hasta' in e else (dur - t)
            a, b, d = t, t + float(np.clip(L, 0.3, 4.0)), DUCK_SUBIDA
        else:
            pre, post, d = DUCK[tp]; a, b = e['t'] - pre, e['t'] + post
        a = int(max(0, (a - DUCK_ADELANTO)) * fs); b = int(max(0, b) * fs) + 1
        tgt[a:b] = np.minimum(tgt[a:b], -d)
    ka, kr = np.exp(-1 / (DUCK_ATAQUE * fs)), np.exp(-1 / (DUCK_SUELTA * fs)); out = np.zeros(n); cur = 0.0
    for i in range(n):
        c = ka if tgt[i] < cur else kr; cur = c * cur + (1 - c) * tgt[i]; out[i] = cur
    return out, fs


def preparar_musica(m, carpeta, j, N):
    """Devuelve (mus0 (2,N) con fundidos y a un nivel de partida, duck lineal por muestra (N,), info)."""
    dur = float(j['duracion']); ruta = _archivo_musica(m['archivo'], carpeta)
    cortes = [e['t'] for e in j['golpes'] if e['tipo'] == 'corte']
    bpm, prim = m.get('bpm'), m.get('primer_pulso')
    if bpm is not None and prim is not None:
        pr = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', ruta], capture_output=True, text=True)
        info = {'bpm': float(bpm), 'primer_pulso': float(prim), 'fase_pulso': float(prim) % (60.0 / float(bpm)), 'duracion': float(pr.stdout.strip() or 1e9), 'origen': 'dado en clip.json'}
    else:
        info = dict(pulso.analizar(ruta, bpm=float(bpm) if bpm is not None else None)); info['origen'] = 'estimado por pulso.py'
        if prim is not None: info['primer_pulso'] = float(prim); info['fase_pulso'] = float(prim) % (60.0 / info['bpm']); info['origen'] += ' (primer_pulso dado)'
    per = 60.0 / info['bpm']; desde = float(m.get('desde', 0.0)); aviso = ''
    if m.get('alinear') and cortes:
        d2, err = pulso.mejor_desde(info, cortes, dur, cerca=desde)
        aviso = f'  alinear: desde {desde:.3f} -> {d2:.3f} (error medio de {len(cortes)} cortes al pulso {err:.0f} ms)'; desde = d2
    # decodificar desde `desde` hasta el final de la historia a 48 kHz estereo
    nst = int(round(dur * SR))
    p = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{desde:.4f}', '-t', f'{dur + 0.05:.4f}', '-i', ruta, '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'], capture_output=True)
    if p.returncode != 0 or not p.stdout: sys.exit(f'ERROR: musica: ffmpeg no pudo leer {ruta}: {p.stderr.decode(errors="ignore")[:200]}')
    x = np.frombuffer(p.stdout, dtype='<f4').astype(np.float64).reshape(-1, 2).T
    corta = ''
    if x.shape[1] < nst:
        corta = f'  AVISO: la pista se acaba a los {x.shape[1] / SR:.1f} s de la historia (faltan {dur - x.shape[1] / SR:.1f} s): se rellena con silencio'
        x = np.pad(x, ((0, 0), (0, nst - x.shape[1])))
    x = x[:, :nst].copy()
    # fundidos: entrada 0.15 s; salida musical de 1.5 s que termina EN un pulso (el ultimo pulso de la pista que cae en la historia)
    k0 = np.ceil((desde - info['primer_pulso']) / per - 1e-9)
    tb = info['primer_pulso'] + (k0 + np.arange(int(dur / per) + 3)) * per - desde   # pulsos en tiempo de video
    tb = tb[(tb > 0) & (tb <= dur + 1e-6)]
    te = float(tb[-1]) if len(tb) else dur
    if te - FADE_OUT < 0.5: te = dur
    g = np.ones(nst); a = int(FADE_IN * SR); g[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    ie = min(int(round(te * SR)), nst); ib = max(0, ie - int(FADE_OUT * SR))
    g[ib:ie] = 0.5 * (1 + np.cos(np.pi * np.linspace(0, 1, ie - ib, endpoint=False))); g[ie:] = 0.0
    x *= g
    ref = json.load(open(os.path.join(REC, 'final-ref.json')))
    x *= NIVEL_CAMA * ref['rms_cama_historia'] / np.sqrt(np.mean(x[:, : max(ie, 1)] ** 2))   # nivel de partida (el de la cama); el nivel final lo ajusta mezclar()
    mus0 = np.zeros((2, N)); mus0[:, :min(nst, N)] = x[:, :min(nst, N)]
    dk, fs = curva_duck(j['golpes'], dur)
    gd = 10 ** (np.interp(np.arange(N) / SR * fs, np.arange(len(dk)), dk) / 20)
    info.update(desde=desde, fin_musica=te, ruta=ruta, gain_db=float(m.get('gain_db', 0.0)), duck_min_db=float(dk.min()),
                duck_pct=float(np.mean(dk[: int(dur * fs)] < -0.5) * 100), aviso=aviso + corta)
    _ULTIMO.update(duck_db=dk, fs_duck=fs, info=info)
    return mus0, gd, info


def medir_musica(mus, tmp):
    r = os.path.join(tmp, 'mus.wav'); sf.write(r, mus.T, SR, subtype='PCM_24'); return _lufs_pico(r)[0]


# ------------------------------------------------------------------ mezcla
class Ctx: pass


def leer(carpeta):
    ruta = os.path.join(carpeta, 'golpes.json')
    if not os.path.isfile(ruta): sys.exit(f'ERROR: no existe {ruta}')
    try: j = json.load(open(ruta, encoding='utf-8'))
    except Exception as e: sys.exit(f'ERROR: golpes.json no es JSON valido ({e})')
    if 'duracion' not in j: sys.exit('ERROR: falta "duracion" en golpes.json')
    cj = os.path.join(carpeta, 'clip.json'); mus = None
    if os.path.isfile(cj):
        try: mus = json.load(open(cj, encoding='utf-8')).get('musica')
        except Exception as e: sys.exit(f'ERROR: clip.json no es JSON valido ({e})')
    if mus is None: mus = j.get('musica')
    if isinstance(mus, str): mus = {'archivo': mus}
    if mus is not None and (not isinstance(mus, dict) or not mus.get('archivo')): sys.exit('ERROR: "musica" necesita al menos {"archivo": "..."}')
    j['musica'] = mus or None
    j.setdefault('bucle', False)
    if j['musica'] and j['bucle']: sys.exit('ERROR: "musica" no se puede usar con "bucle": true (la pista real no empalma sola)')
    if j['bucle']: j['final'] = False
    j.setdefault('final', True); j.setdefault('bpm', 110); j.setdefault('musica_desde', 0.0); j.setdefault('golpes', [])
    dur = float(j['duracion'])
    for i, e in enumerate(j['golpes']):
        tipo = e.get('tipo')
        if tipo not in EVENTOS: sys.exit(f'ERROR: golpe {i}: tipo desconocido {tipo!r}. Tipos validos: {", ".join(TIPOS)}')
        if tipo == 'lapiz':
            if 't0' not in e or 't1' not in e: sys.exit(f'ERROR: golpe {i} (lapiz) necesita "t0" y "t1"')
            if not e['t1'] > e['t0']: sys.exit(f'ERROR: golpe {i} (lapiz): t1 debe ser mayor que t0')
        elif 't' not in e: sys.exit(f'ERROR: golpe {i} ({tipo}) necesita "t"')
        tt = e['t0'] if tipo == 'lapiz' else e['t']
        if tt < -0.2 or tt > dur + (FINAL_DUR if j['final'] else 0): sys.exit(f'ERROR: golpe {i} ({tipo}) en t={tt} esta fuera del clip (0 a {dur})')
    return j


def medir(ruta):
    m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', ruta, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = m[m.rfind('Summary'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1))


def _ff(*a): return subprocess.run(['ffmpeg', '-y', '-hide_banner', '-nostats', '-loglevel', 'error', *a], check=True)


def _lufs_pico(ruta, filtro=None):
    """Integrado (LUFS) y pico real (dBTP) de un archivo, con o sin filtro delante."""
    af = (filtro + ',' if filtro else '') + 'ebur128=peak=true'
    m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', ruta, '-af', af, '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = m[m.rfind('Summary'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1))


def normalizar(pre, tmp, total, out, I=-14.0, TP=-1.5, pad=0):
    """-14 LUFS integrados con pico real <= -1 dBTP, medido con ebur128 (el integrado de ITU BS.1770, el que se informa).
    Los efectos son muy picudos: un loudnorm lineal no cabe (ffmpeg cae al modo dinamico y ademas mide ~1 dB distinto en clips cortos).
    Por eso son dos pasadas hechas a mano: 1) medir; 2) subir la ganancia necesaria y pasar por un limitador de pico, repitiendo la
    medida hasta clavar -14 (el limitador resta algo de sonoridad), con largo exacto. El limitador retrasa 143 muestras (3 ms): se recortan para que todo caiga en su sitio."""
    lvl_lim = TP - 0.3
    mk = lambda: 'alimiter=limit=%.4f:attack=3:release=60:level=disabled' % (10 ** (lvl_lim / 20))
    lim = mk()
    # pad > 0 (bucle): `pre` lleva `pad` muestras de colchon circular a cada lado; se miden y se recortan solo las del medio
    cut = f',atrim=start_sample={pad + 143},asetpts=N/SR/TB,atrim=0:{total}' if pad else ''
    G = I - _lufs_pico(pre)[0]
    for _ in range(10 if pad else 6):
        li, _p = _lufs_pico(pre, f'volume={G:.4f}dB,{lim}{cut}')
        if pad and _p > -1.0:   # bucle (mucha densidad): el limitador deja pasar picos reales > -1 dBTP; bajar su techo y repetir
            lvl_lim -= (_p + 1.2); lim = mk(); continue
        if abs(I - li) < 0.02: break
        G += I - li
    flt = f"volume={G:.4f}dB,{lim},atrim=start_sample={pad + 143},asetpts=N/SR/TB,atrim=0:{total},apad=whole_dur={total},atrim=0:{total}"
    _ff('-bitexact', '-i', pre, '-af', flt, '-ar', str(SR), '-ac', '2', '-c:a', 'pcm_s16le', '-fflags', '+bitexact', out)
    return G


def mezclar(carpeta, grafico=None):
    j = leer(carpeta)
    dur = float(j['duracion']); final = bool(j['final']); total = dur + (FINAL_DUR if final else 0.0)
    N = int(round(total * SR)); i0 = int(round(dur * SR)); n_hist = i0 if final else N
    bucle = bool(j['bucle']); musica = j['musica']
    if bucle and abs(dur * float(j['bpm']) / 60 / 16 - round(dur * float(j['bpm']) / 60 / 16)) > 1e-6: print('AVISO: en bucle, duracion x bpm no es multiplo de 4 compases (16 pulsos): la armonia no empalmara')
    PRE, EXT = 1.0, 4.0   # bucle: colchon de efectos antes de 0 y cola despues del final (se doblan)
    ctx = Ctx(); ctx.bus = Bus(N + (int((PRE + EXT) * SR) if bucle else 0), PRE if bucle else 0.0); ctx.final = final; ctx.dur = dur
    ctx.n = {t: 0 for t in TIPOS}
    ctx.rng = lambda k: np.random.default_rng([21, k])
    marcas = []
    for k, e in enumerate(sorted(j['golpes'], key=lambda e: e.get('t0', e.get('t', 0)))):
        EVENTOS[e['tipo']](ctx, e, k)
        marcas.append((e.get('t0', e.get('t')), e['tipo'])); ctx.n[e['tipo']] += 1
    bus = ctx.bus.b
    if bucle:   # doblar: la cola pasada del final se suma al principio; el colchon anterior a 0 se suma al final
        P, E = int(PRE * SR), int(EXT * SR); full = bus; bus = full[:, P:P + N].copy()
        bus[:, :E] += full[:, P + N:P + N + E]; bus[:, N - P:] += full[:, :P]

    # cama: nivel fijo del kit, con ducking de 3 dB bajo los efectos (seguidor 40 ms ataque / 200 ms suelta)
    ref = json.load(open(os.path.join(REC, 'final-ref.json')))
    t_ini = j.get('musica_desde'); mus = np.zeros((2, N))
    if musica: pass   # musica real: se prepara mas abajo (preparar_musica), sin cama sintetizada ni su ducking
    elif bucle:   # la cama suena desde t=0 en regimen: se renderiza con 4 compases de arranque que se descartan (4 compases = una vuelta completa de C-Am-F-G,
        # asi lo que suena al empezar ES la cola del ultimo compas, sin doblar nada) y sin compas dulce, sin fade ni puerta final
        bpm = float(j['bpm']); pre_s = 16 * 60.0 / bpm; Lm, Rm = cama(0.0, pre_s + dur, bpm, bucle=True)
        a0 = int(round(pre_s * SR)); m = np.stack([Lm, Rm])[:, a0:a0 + N]; a = 0
        m *= NIVEL_CAMA * ref['rms_cama_historia'] / np.sqrt(np.mean(m ** 2)); mus[:, :m.shape[1]] = m
    elif t_ini is not None and t_ini < n_hist / SR - 1.0:
        Lm, Rm = cama(max(0.0, float(t_ini)), n_hist / SR, float(j['bpm']))
        m = np.stack([Lm, Rm]); a = int(max(0.0, t_ini) * SR)
        m *= NIVEL_CAMA * ref['rms_cama_historia'] / np.sqrt(np.mean(m[:, a:] ** 2))
        mus[:, :m.shape[1]] = m
    if mus.any() and not musica:   # ducking
        M = 24; env = np.abs(bus).max(axis=0)[: (N // M) * M].reshape(-1, M).max(axis=1)
        if bucle: env = np.concatenate([env, env])   # circular: el seguidor llega al principio con el estado del final
        fs_env = SR / M; att = np.exp(-1 / (0.04 * fs_env)); rel_ = np.exp(-1 / (0.2 * fs_env))
        target = 1 - np.clip(env / 0.03, 0, 1) * (1 - 10 ** (-3 / 20))
        g = np.ones_like(target); cur = 1.0
        for i, tg in enumerate(target):
            c = att if tg < cur else rel_; cur = c * cur + (1 - c) * tg; g[i] = cur
        if bucle: g = g[len(g) // 2:]
        mus *= np.interp(np.arange(N), (np.arange(len(g)) + 0.5) * M, g)
    fin = None
    if final:
        fin, fsr = sf.read(os.path.join(REC, 'final-6.6s.wav'), dtype='float64'); assert fsr == SR

    def construir(mus):
        mix = bus + mus
        if final:   # el final aprobado, tal cual (sus efectos y su musica ya vienen dentro), alineado en t = duracion
            mix[:, i0:] = fin.T[:, : N - i0] + 0.0
        if not bucle: endf = int(0.25 * SR); mix[:, -endf:] *= np.linspace(1, 0, endf) ** 1.5; mix[:, :48] *= np.linspace(0, 1, 48)   # bucle: sin fade in ni fade out
        esc = 0.7 / np.abs(mix).max(); mix *= esc
        return mix, esc

    tmp = tempfile.mkdtemp(prefix='gm_mezcla_'); pre = os.path.join(tmp, 'pre.wav')
    PADS = int(0.5 * SR) if bucle else 0   # bucle: colchon circular (final antes, principio despues) para que el limitador empalme
    out = os.path.join(carpeta, 'render', 'mezcla.wav'); os.makedirs(os.path.join(carpeta, 'render'), exist_ok=True)
    if musica:
        # musica real: el nivel se ajusta hasta que la musica SOLA, dentro de la mezcla ya normalizada a -14 LUFS, quede en MUSICA_LUFS + gain_db
        mus0, gd, minfo = preparar_musica(musica, carpeta, j, N)
        objetivo = MUSICA_LUFS + minfo['gain_db']; mg = 0.0; real = None; tp_techo = -1.5
        for it in range(10):
            musd = mus0 * gd * 10 ** (mg / 20); mix, esc = construir(musd)
            sf.write(pre, mix.T, SR, subtype='PCM_24')
            G = normalizar(pre, tmp, total, out, pad=PADS, TP=tp_techo)
            pico = medir(out)[1]
            if pico > -1.1 and it < 9: tp_techo -= (pico + 1.3); continue   # el limitador deja pasar picos entre muestras: bajar su techo y repetir
            real = medir_musica(musd[:, :i0 if final else N] * esc, tmp) + G
            if abs(real - objetivo) < 0.4: break
            mg += objetivo - real
        minfo.update(musica_lufs=real, objetivo=objetivo, ajuste_db=mg, iteraciones=it + 1)
    else:
        mix, esc = construir(mus)
        sf.write(pre, (np.concatenate([mix[:, -PADS:], mix, mix[:, :PADS]], axis=1) if bucle else mix).T, SR, subtype='PCM_24')
        G = normalizar(pre, tmp, total, out, pad=PADS)
    d, sr = sf.read(out)
    if len(d) != N: d = np.pad(d, ((0, max(0, N - len(d))), (0, 0)))[:N]; sf.write(out, d, SR, subtype='PCM_16')
    lufs, tp = medir(out)
    print(f'{out}\n  muestras {len(d)} (esperadas {N})  duracion {len(d) / sr:.3f} s (esperada {total:.3f})  {lufs:.1f} LUFS integrado  pico real {tp:.2f} dBTP  (ganancia aplicada {G:+.2f} dB)')
    if musica:
        linea = (f'  musica: {os.path.basename(minfo["ruta"])}  desde {minfo["desde"]:.3f} s  BPM {minfo["bpm"]:.2f} ({minfo["origen"]})  primer pulso {minfo["primer_pulso"]:.3f} s{minfo["aviso"]}\n'
                 f'  musica: fundido de salida de {FADE_OUT:.1f} s que termina en el pulso t = {minfo["fin_musica"]:.3f} s (el final entra en {dur:.3f} s); ducking hasta {minfo["duck_min_db"]:.1f} dB, '
                 f'{minfo["duck_pct"]:.0f} % del tiempo con bajada; musica sola {minfo["musica_lufs"]:.1f} LUFS (objetivo {minfo["objetivo"]:.1f}, {minfo["iteraciones"]} pasadas)')
        print(linea)
        try:
            with open(os.path.join(carpeta, 'render', 'render.log'), 'a', encoding='utf-8') as lf: lf.write('[mezcla]' + linea.strip().replace('\n', '\n[mezcla]') + '\n')
        except OSError: pass
    if grafico: dibujar(d, sr, marcas, dur, final, total, grafico, lufs, tp)
    try:
        if not os.environ.get("GM_KEEP_PRE"):
            os.remove(pre)
            if os.path.isfile(os.path.join(tmp, "mus.wav")): os.remove(os.path.join(tmp, "mus.wav"))
            os.rmdir(tmp)
        else: print("pre:", pre)
    except OSError: pass
    return out


def dibujar(d, sr, marcas, dur, final, total, ruta, lufs, tp):
    import matplotlib; matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    mono = d.mean(axis=1); t = np.arange(len(mono)) / sr
    col = {'corte': '#d05000', 'lapiz': '#1a3854', 'entra-hilo': '#2a7', 'burbuja': '#a3a', 'tarjeta': '#c80', 'naranja': '#f60', 'resolver': '#080', 'subida': '#c00', 'golpe': '#555', 'tic': '#888'}
    fig, ax = plt.subplots(2, 1, figsize=(16, 7), sharex=True, gridspec_kw={'height_ratios': [2, 1]})
    ax[0].plot(t, d[:, 0], lw=0.4, color='#1a3854'); ax[0].plot(t, d[:, 1], lw=0.4, color='#FFA462', alpha=0.7); ax[0].set_ylim(-1, 1)
    hop = int(0.01 * sr); rms = np.array([np.sqrt(np.mean(mono[i:i + 2 * hop] ** 2) + 1e-12) for i in range(0, len(mono) - 2 * hop, hop)])
    ax[1].plot(np.arange(len(rms)) * 0.01, 20 * np.log10(rms), lw=0.9, color='#1a3854'); ax[1].set_ylim(-70, -6); ax[1].set_ylabel('RMS dBFS')
    for tt, tipo in marcas:
        for a_ in ax: a_.axvline(tt, color=col[tipo], lw=0.8, alpha=0.8)
        ax[0].text(tt, 0.97, tipo, rotation=90, fontsize=8, va='top', ha='right', color=col[tipo])
    if final:
        for a_ in ax: a_.axvspan(dur, total, color='#FFA462', alpha=0.12)
        ax[0].text(dur + 0.05, -0.95, 'final aprobado (6.6 s)', fontsize=9, color='#a50')
    ax[0].set_xlim(0, total); ax[0].set_title(f'mezcla.wav  {total:.2f} s  {lufs:.1f} LUFS  {tp:.2f} dBTP'); ax[1].set_xlabel('s')
    plt.tight_layout(); plt.savefig(ruta, dpi=90); plt.close()


if __name__ == '__main__':
    args = [a for a in sys.argv[1:]]
    graf = None
    if '--grafico' in args:
        i = args.index('--grafico'); graf = args[i + 1]; del args[i:i + 2]
    if len(args) != 1: sys.exit('Uso: python mezcla.py <carpeta del clip> [--grafico ruta.png]')
    mezclar(args[0], graf)
