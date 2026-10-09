"""Everyday-life foley / ambience set ("vida"): deterministic synthesis, 48 kHz mono 16-bit, peak -3 dBFS.
Run (from any cwd): python sfx_vida.py
Writes only the names below into ../recursos/sfx-foley/ (other wavs there are never touched).
Loops are exactly periodic by construction (spectrally shaped periodic noise, periodic modulators,
events placed with wrap-around), so the file concatenated with itself has no seam and needs no fades."""
import os, zlib
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "recursos", "sfx-foley"))
PEAK = 10 ** (-3 / 20)


def R(name): return np.random.default_rng(zlib.crc32(name.encode()))
def tt(d): return np.arange(int(round(d * SR))) / SR
def noise(r, n): return r.standard_normal(n)
def sos(x, f, kind, o=2): return signal.sosfilt(signal.butter(o, f, kind, fs=SR, output="sos"), x)
def lp(x, f, o=2): return sos(x, f, "lp", o)
def hp(x, f, o=2): return sos(x, f, "hp", o)
def bp(x, f1, f2, o=2): return sos(x, [f1, f2], "bp", o)
def ex(t, tau): return np.exp(-t / tau)
def att(t, a): return np.minimum(t / a, 1.0)
def sil(d): return np.zeros(int(round(d * SR)))
def hann_bump(t, a, b):
    u = np.clip((t - a) / (b - a), 0, 1); return np.sin(np.pi * u) ** 2


def place(buf, sig, at, g=1.0):
    i = int(round(at * SR)); e = min(len(buf), i + len(sig))
    if 0 <= i < len(buf): buf[i:e] += sig[: e - i] * g
    return buf


def placec(buf, sig, at, g=1.0):
    """Wrap-around placement (for loops)."""
    n = len(buf); idx = (int(round(at * SR)) + np.arange(len(sig))) % n
    buf[idx] += sig * g
    return buf


def modal(t, freqs, amps, taus, r=None, jit=0.0):
    s = np.zeros_like(t)
    for f, a, tau in zip(freqs, amps, taus):
        if r is not None and jit: f = f * (1 + jit * r.uniform(-1, 1))
        s += a * np.sin(2 * np.pi * f * t + (r.uniform(0, 6.28) if r is not None else 0)) * ex(t, tau)
    return s


def burst(r, d, tau, f1, f2, a=0.002):
    t = tt(d); return att(t, a) * ex(t, tau) * bp(noise(r, len(t)), f1, f2)


def rev(x, r, tau=0.25, wet=0.3, tail=0.3, damp=3500, circular=False):
    """Small synthetic room: decaying filtered-noise impulse response."""
    m = int(tail * SR)
    ir = lp(noise(r, m), damp, 1) * ex(np.arange(m) / SR, tau)
    ir[0] = 0; ir = ir / np.sqrt(np.sum(ir ** 2)) * 0.9
    n = len(x)
    if circular:
        y = np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(ir, n), n)
    else:
        y = signal.fftconvolve(x, ir)[:n]
    return x + wet * y


def pn(r, n, f1, f2, slope=0.0, edge=0.15):
    """Exactly periodic noise (period n samples), power-law spectrum between f1 and f2 Hz, soft edges."""
    f = np.arange(n // 2 + 1) * SR / n
    a = np.zeros_like(f)
    m = (f > f1) & (f < f2)
    a[m] = (f[m] / max(f1, 1.0)) ** slope
    w = max(edge * (f2 - f1), 1.0)
    a *= np.clip((f - f1) / w, 0, 1) * np.clip((f2 - f) / w, 0, 1)
    sp = a * np.exp(1j * r.uniform(0, 2 * np.pi, len(f)))
    x = np.fft.irfft(sp, n)
    return x / (np.std(x) + 1e-12)


def slowmod(r, n, depth, f1=0.34, f2=1.4):
    """Periodic slow amplitude modulator around 1."""
    m = pn(r, n, f1, f2, edge=0.3)
    return np.clip(1 + depth * m, 0.05, None)


S = {}   # name -> (fn, is_loop, fade_in_ms, fade_out_ms, description)

# ---------------------------------------------------------------- knitting
def knit(i):
    r = R(f"knit_click_{i}")
    t = tt(0.08)
    f0 = r.uniform(900, 1500)
    body = modal(t, [f0, f0 * 2.31, f0 * 3.9], [0.7, 0.3, 0.12], [0.018, 0.011, 0.006], r, 0.02)
    tick = att(t, 0.0004) * ex(t, 0.0022) * bp(noise(r, len(t)), 2800, 8000)
    ring = modal(t, [r.uniform(4200, 5600)], [0.12], [0.012], r)
    return lp(body * 0.6 + tick * 1.2 + ring, 9000, 1)
for _i in (1, 2, 3):
    S[f"knit_click_{_i}"] = ((lambda i=_i: knit(i)), False, 0.5, 15, "Two knitting needles touching: bright tick + soft woody body")

# ---------------------------------------------------------------- shush
def shush(i):
    r = R(f"shush_{i}"); d = 0.9; t = tt(d)
    env = np.sin(np.pi * np.clip(t / (d * 0.95), 0, 1) ** (0.8 + 0.12 * i)) ** 1.4
    n = noise(r, len(t))
    s = bp(n, 2600 + 150 * i, 5800, 3) + 0.35 * bp(n, 1400, 2400, 2) + 0.25 * bp(noise(r, len(t)), 6000, 8500, 2)
    flutter = np.clip(1 + 0.18 * lp(noise(r, len(t)), 12, 1) / 0.05, 0.6, 1.4)
    return s * env * flutter
for _i in (1, 2):
    S[f"shush_{_i}"] = ((lambda i=_i: shush(i)), False, 30, 120, "Gentle breathy 'shhh' to calm a baby, soft swell and fade")

# ---------------------------------------------------------------- hum
def hum_lullaby():
    r = R("hum_lullaby"); d = 3.5; t = tt(d); n = len(t)
    notes = [(329.63, 0.55), (392.0, 0.55), (440.0, 0.85), (392.0, 0.55), (329.63, 0.85)]  # E4 G4 A4 G4 E4
    f = np.zeros(n); g = np.ones(n); tb = 0.0; bounds = []
    for fr, du in notes:
        f[int(tb * SR):int((tb + du) * SR)] = fr; tb += du; bounds.append(tb)
    f[int(tb * SR):] = notes[-1][0]
    f = signal.sosfiltfilt(signal.butter(1, 9, "lp", fs=SR, output="sos"), f)
    for b in bounds[:-1]:
        g -= 0.4 * np.exp(-((t - b) / 0.06) ** 2)
    env = g * np.sin(np.pi / 2 * np.clip(t / 0.4, 0, 1)) ** 2 * np.clip((tb + 0.1 - t) / 0.7, 0, 1) ** 1.5
    env *= 1 + 0.06 * np.sin(2 * np.pi * 5.0 * t)
    vib = 1 + 0.007 * np.clip((t - 0.35) / 0.5, 0, 1) * np.sin(2 * np.pi * 5.1 * t) + 0.0003 * lp(noise(r, n), 8, 1) / 0.05
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    gauss = lambda x, c, w: np.exp(-0.5 * ((x - c) / w) ** 2)
    s = np.zeros(n)
    for k in range(1, 22):
        fk = k * f * vib
        form = 1.0 * gauss(fk, 270, 130) + 0.22 * gauss(fk, 1150, 330) + 0.09 * gauss(fk, 2400, 450) + 0.18 / (1 + (fk / 700) ** 2)
        form = form / (1 + (fk / 3200) ** 4)
        s += (form / k ** 0.9) * np.sin(k * ph + 0.3 * k)
    s = (s + bp(noise(r, n), 600, 3200, 2) * 0.02) * env
    s = lp(s, 4200, 2)
    return rev(s, r, tau=0.45, wet=0.35, tail=0.6, damp=3000)
S["hum_lullaby"] = (hum_lullaby, False, 5, 250, "Soft closed-mouth hummed lullaby, pentatonic E G A G E, vibrato")

# ---------------------------------------------------------------- water
def water_pour():
    r = R("water_pour"); d = 1.6; t = tt(d); n = len(t)
    base = bp(noise(r, n), 1800, 6500, 2) * 0.5 * np.clip(1 + 0.6 * lp(noise(r, n), 25, 1) / 0.12, 0.2, 2)
    base += lp(noise(r, n), 900, 1) * 0.25
    out = base * 0.5
    k = 0.0
    while k < d - 0.05:
        k += r.exponential(0.035)
        f0 = r.uniform(500, 1800); du = r.uniform(0.012, 0.04)
        tb = tt(du)
        fr = f0 * (1 + 1.5 * tb / du)
        b = np.sin(2 * np.pi * np.cumsum(fr) / SR) * ex(tb, du * 0.4) * att(tb, 0.002)
        place(out, b, k, r.uniform(0.15, 0.6))
    for _ in range(18):    # plant/soil patter
        place(out, burst(r, 0.02, 0.005, 700, 3000), r.uniform(0.1, d - 0.2), r.uniform(0.3, 0.6))
    env = np.minimum(t / 0.2, 1) ** 1.5 * np.clip((d - t) / 0.35, 0, 1) ** 1.5
    return out * env
S["water_pour"] = (water_pour, False, 5, 30, "Watering can trickle onto soil: noise + random bubble blips")

# ---------------------------------------------------------------- brush
def brush(i):
    r = R(f"brush_stroke_{i}"); d = 0.45; t = tt(d); n = len(t)
    pk = 0.42 + 0.1 * i
    env = np.where(t < pk * d, (t / (pk * d)) ** 1.3, ((d - t) / (d * (1 - pk))) ** 1.1).clip(0, 1)
    low = bp(noise(r, n), 500 + 80 * i, 2400, 2)
    high = bp(noise(r, n), 3000, 8500, 2)
    tex = np.clip(1 + 0.8 * lp(noise(r, n), 220, 1) / 0.15, 0.1, 2.5)
    return (low + high * 0.45 * np.clip(env * 1.4, 0, 1) ** 2) * tex * env
for _i in (1, 2):
    S[f"brush_stroke_{_i}"] = ((lambda i=_i: brush(i)), False, 20, 60, "Paint brush swish on canvas, bristle texture")

# ---------------------------------------------------------------- dough
def dough(i):
    r = R(f"dough_knead_{i}"); d = 0.25; t = tt(d); n = len(t)
    f0 = r.uniform(70, 95)
    ph = 2 * np.pi * np.cumsum(f0 * 0.55 + f0 * 0.45 * ex(t, 0.04)) / SR
    thump = np.sin(ph) * att(t, 0.004) * ex(t, 0.06)
    musk = lp(noise(r, n), 380, 2) * att(t, 0.003) * ex(t, 0.035) * 1.2
    out = thump * 0.9 + musk * 0.8
    ts = r.uniform(0.07, 0.11); sl = tt(0.12)
    sweep = np.sin(2 * np.pi * np.cumsum(420 - 220 * sl / 0.12) / SR) * 0.15
    slap = (bp(noise(r, len(sl)), 700, 2600, 2) * 0.9 + sweep) * att(sl, 0.006) * ex(sl, 0.03)
    place(out, slap, ts, 0.35)
    return lp(out, 3000, 2)
for _i in (1, 2):
    S[f"dough_knead_{_i}"] = ((lambda i=_i: dough(i)), False, 3, 50, "Dough kneaded on wood: muffled thump + soft wet slap")

# ---------------------------------------------------------------- drums
def drum_kick():
    r = R("drum_kick"); d = 0.3; t = tt(d)
    ph = 2 * np.pi * np.cumsum(46 + 70 * ex(t, 0.035)) / SR
    body = np.sin(ph) * att(t, 0.002) * ex(t, 0.11)
    click = lp(noise(r, len(t)), 2500, 2) * ex(t, 0.004) * 0.25
    return rev(lp(body + click, 3500, 2), r, tau=0.18, wet=0.4, tail=0.25, damp=2500)
S["drum_kick"] = (drum_kick, False, 1, 60, "Soft roomy bass drum")

def drum_snare():
    r = R("drum_snare"); d = 0.25; t = tt(d)
    sh = modal(t, [185, 330, 410], [0.7, 0.3, 0.15], [0.05, 0.03, 0.025], r)
    wires = bp(noise(r, len(t)), 1500, 7500, 2) * att(t, 0.001) * ex(t, 0.06)
    return rev(lp(sh * 0.8 + wires * 0.9, 7000, 2), r, tau=0.2, wet=0.45, tail=0.25, damp=3500)
S["drum_snare"] = (drum_snare, False, 1, 50, "Soft roomy snare")

def drum_hat():
    r = R("drum_hat"); t = tt(0.08)
    s = bp(noise(r, len(t)), 5500, 13000, 2) * att(t, 0.0008) * ex(t, 0.016)
    s += modal(t, [6200, 8150, 10300], [0.05, 0.05, 0.04], [0.01] * 3, r) * 0.5
    return rev(s, r, tau=0.08, wet=0.2, tail=0.08, damp=8000)
S["drum_hat"] = (drum_hat, False, 0.5, 20, "Closed hi-hat, soft")

# ---------------------------------------------------------------- typing
def typing(i):
    r = R(f"type_burst_{i}"); d = 0.7; out = sil(d)
    n = int(r.integers(4, 8))
    gaps = r.lognormal(np.log(0.095), 0.4, n - 1).clip(0.045, 0.2)
    gaps *= min(1.0, 0.5 / gaps.sum())
    times = 0.03 + np.concatenate([[0], np.cumsum(gaps)])
    for tk in times:
        t = tt(0.05)
        f0 = r.uniform(240, 520)
        thunk = modal(t, [f0, f0 * 2.4], [0.8, 0.3], [0.012, 0.007], r) * att(t, 0.0008)
        click = bp(noise(r, len(t)), 1800, 6000, 2) * att(t, 0.0003) * ex(t, 0.0025)
        place(out, (thunk * 0.5 + click * 0.9) * r.uniform(0.45, 1.0), tk, 1.0)
        if r.random() < 0.5:
            place(out, bp(noise(r, 200), 2500, 7000) * ex(np.arange(200) / SR, 0.0015) * 0.25, tk + r.uniform(0.05, 0.08))
    return lp(out, 8000, 1)
for _i in (1, 2, 3):
    S[f"type_burst_{_i}"] = ((lambda i=_i: typing(i)), False, 1, 40, "Short burst of quiet laptop keyboard clicks, irregular timing")

# ---------------------------------------------------------------- page
def page_turn():
    r = R("page_turn"); d = 0.5; t = tt(d); n = len(t)
    slide = bp(noise(r, n), 900, 3800, 2) * hann_bump(t, 0.02, 0.36) ** 1.2 * 0.7
    body = bp(noise(r, n), 200, 700, 2) * hann_bump(t, 0.0, 0.32) * 0.5
    flut = np.zeros(n)
    for _ in range(9):
        a = r.uniform(0.03, 0.28); w = r.uniform(0.012, 0.04)
        flut += hann_bump(t, a, a + w) * r.uniform(0.3, 1.0)
    out = slide + body + bp(noise(r, n), 3000, 9500, 2) * flut * 0.6
    place(out, lp(noise(r, 1800), 1500, 1) * ex(np.arange(1800) / SR, 0.012) * 0.8, 0.37, 0.5)
    return out
S["page_turn"] = (page_turn, False, 10, 60, "Book page turn: slide, flutter, soft settle")

# ---------------------------------------------------------------- bike
def bike_tick():
    r = R("bike_tick"); d = 1.0; out = sil(d)
    tk = 0.02; dt = 0.016; k = 0
    while tk < 0.93:
        t = tt(0.04)
        f0 = r.uniform(2800, 3800)
        click = bp(noise(r, len(t)), 1800, 6500, 2) * att(t, 0.0003) * ex(t, 0.002)
        ring = modal(t, [f0, f0 * 1.52], [0.3, 0.15], [0.006, 0.004], r)
        pawl = modal(t, [650, 1300], [0.5, 0.15], [0.006, 0.004], r) * att(t, 0.0005)
        g = (0.985 ** k) * r.uniform(0.85, 1.0)
        place(out, click * 0.8 + ring + pawl * 0.5, tk, g * (1 - 0.35 * tk))
        tk += dt; dt *= 1.12; k += 1
    return lp(out, 8500, 1)
S["bike_tick"] = (bike_tick, False, 1, 80, "Bicycle freewheel ratchet, decelerating ticks")

# ---------------------------------------------------------------- loops
def washer_hum():
    r = R("washer_hum"); d = 3.0; n = int(d * SR); t = np.arange(n) / SR
    rot = 1 + 0.35 * np.sin(2 * np.pi * 1.0 * t + 0.4) + 0.12 * np.sin(2 * np.pi * 2.0 * t + 1.1)
    rumble = pn(r, n, 25, 160, slope=-0.5) * rot
    motor = (np.sin(2 * np.pi * 48 * t) + 0.5 * np.sin(2 * np.pi * 96 * t + 0.7) + 0.25 * np.sin(2 * np.pi * 144 * t + 1.3)) * (1 + 0.15 * np.sin(2 * np.pi * 1.0 * t))
    slosh = pn(r, n, 300, 1800, slope=-0.6) * (hann_bump(t % 1.0, 0.05, 0.85) ** 1.5 * 0.8 + 0.2)
    swish = pn(r, n, 1800, 4500, slope=-0.5) * (hann_bump((t - 0.35) % 1.0, 0.0, 0.5) ** 2) * 0.35
    drops = pn(r, n, 80, 400) * (1 + 0.5 * np.sin(2 * np.pi * 3.0 * t))
    return rumble * 0.7 + motor * 0.12 + slosh * 0.32 + swish * 0.3 + drops * 0.15
S["washer_hum"] = (washer_hum, True, 0, 0, "Basement washing machine: drum rumble, motor hum, slosh rhythm; exactly periodic")

def wind_soft():
    r = R("wind_soft"); n = 3 * SR
    out = np.zeros(n)
    for f1, f2, dep, g in ((120, 450, 0.55, 1.0), (450, 1300, 0.7, 0.8), (1300, 3200, 0.8, 0.45), (3200, 6000, 0.9, 0.12)):
        out += pn(r, n, f1, f2, slope=-0.3) * slowmod(r, n, dep) * g
    return out
S["wind_soft"] = (wind_soft, True, 0, 0, "Soft rooftop wind, slow gusting bands; exactly periodic")

def birds():
    r = R("birds"); n = 3 * SR
    out = pn(r, n, 300, 3500, slope=-1.0) * 0.004      # faint air under the birds

    def syl(f0, f1, du, curve=1.0, fm=0.0):
        tb = tt(du); u = tb / du
        fr = f0 + (f1 - f0) * u ** curve
        if fm: fr = fr * (1 + 0.04 * np.sin(2 * np.pi * fm * tb))
        ph = np.cumsum(fr) * 2 * np.pi / SR
        return (np.sin(ph) + 0.18 * np.sin(2 * ph)) * np.sin(np.pi * u) ** 1.5

    def phrase(kind):
        if kind == 0:   # tit: rapid descending "tsi-tsi-tsi"
            x = sil(0.5); at = 0.0
            for _ in range(int(r.integers(3, 5))):
                place(x, syl(r.uniform(5200, 5800), r.uniform(3600, 4200), 0.05), at); at += 0.085
            return x[: int(0.45 * SR)]
        if kind == 1:   # finch-like warble
            x = sil(0.55); at = 0.0
            for _ in range(int(r.integers(5, 8))):
                a = r.uniform(3000, 4800)
                place(x, syl(a, a * r.uniform(0.75, 1.35), r.uniform(0.04, 0.07), 1.0, 28), at); at += r.uniform(0.06, 0.09)
            return x
        x = sil(0.4)    # two-note whistle
        place(x, syl(2600, 3400, 0.14, 0.8), 0.0); place(x, syl(3400, 2400, 0.16, 1.2), 0.17)
        return x
    ev = np.zeros(n)
    for at, kind, g in ((0.35, 1, 0.55), (0.95, 0, 0.7), (1.55, 2, 0.5), (2.05, 1, 0.45), (2.45, 0, 0.6)):
        placec(ev, phrase(kind), at, g)
    ev = rev(lp(ev, 6500, 2), r, tau=0.5, wet=0.5, tail=0.7, damp=3000, circular=True)
    return out + ev * 0.5
S["birds"] = (birds, True, 0, 0, "Sparse light distant birds (3 species), quiet; exactly periodic")

def street_amb():
    r = R("street_amb"); n = 4 * SR; t = np.arange(n) / SR
    swells = 1 + 0.5 * np.sin(2 * np.pi * 0.25 * t + 0.8) + 0.25 * np.sin(2 * np.pi * 0.5 * t + 2.0) + 0.15 * (slowmod(r, n, 0.5) - 1)
    out = pn(r, n, 30, 330, slope=-0.8) * np.clip(swells, 0.3, 2) * 0.9
    out += pn(r, n, 1500, 7000, slope=-0.8) * np.clip(1 + 0.6 * np.sin(2 * np.pi * 0.25 * t + 1.1), 0.3, 2) * 0.1
    out += pn(r, n, 400, 1500, slope=-1) * slowmod(r, n, 0.6) * 0.12
    f0 = 3050; tb = tt(1.2)
    ding = (np.sin(2 * np.pi * f0 * tb) * ex(tb, 0.22) + 0.35 * np.sin(2 * np.pi * f0 * 2.74 * tb) * ex(tb, 0.08)) * att(tb, 0.002)
    bell = np.zeros(n); placec(bell, ding, 2.1, 1.0); placec(bell, ding, 2.34, 0.8)
    bell = rev(lp(bell, 6500, 2), r, tau=0.6, wet=0.7, tail=0.8, damp=2500, circular=True)
    return out + bell * 0.025
S["street_amb"] = (street_amb, True, 0, 0, "Calm city street: distant traffic, faint tyre hiss, one far bike bell; periodic")

def crickets():
    r = R("crickets"); d = 3.0; n = int(d * SR)
    out = pn(r, n, 800, 6000, slope=-1.2) * 0.006
    # (carrier Hz, chirp period s dividing 3.0, pulses per chirp, pulse rate Hz, gain, offset)
    for fc, per, npul, prate, g, off in ((4350, 0.375, 4, 38, 1.0, 0.05), (4900, 0.5, 3, 34, 0.7, 0.21),
                                         (4600, 0.3, 4, 42, 0.55, 0.11), (5200, 0.75, 5, 36, 0.4, 0.33)):
        for k in range(int(round(d / per))):
            tb = tt(npul / prate + 0.02)
            e = np.zeros_like(tb)
            for p in range(npul):
                a = p / prate
                e += hann_bump(tb, a, a + 0.65 / prate) * (0.75 + 0.25 * p / max(npul - 1, 1))
            s = (np.sin(2 * np.pi * fc * tb) + 0.1 * np.sin(4 * np.pi * fc * tb)) * e
            placec(out, s, off + k * per, g * (0.92 + 0.08 * ((k * 7) % 5) / 4))
    return rev(out, r, tau=0.35, wet=0.3, tail=0.4, damp=7000, circular=True)
S["crickets"] = (crickets, True, 0, 0, "Gentle night crickets, four voices; exactly periodic")

def room_tone():
    r = R("room_tone"); n = 3 * SR; t = np.arange(n) / SR
    out = pn(r, n, 60, 220, slope=-1.0) * slowmod(r, n, 0.12) * 0.6
    out += pn(r, n, 300, 6500, slope=-1.6) * slowmod(r, n, 0.1) * 0.45
    out += pn(r, n, 2500, 9000, slope=-1.0) * 0.07
    return out + 0.12 * np.sin(2 * np.pi * 120 * t + 0.5)    # faint HVAC hum
S["room_tone"] = (room_tone, True, 0, 0, "Indoor waiting-room tone, faint HVAC hiss; exactly periodic")


# ---------------------------------------------------------------- finalise / write
def finalise(x, loop, fi_ms, fo_ms):
    x = np.asarray(x, float)
    x = x - x.mean()
    if not loop:
        x = hp(x, 20, 1)
        k = int(fi_ms * SR / 1000)
        if k: x[:k] *= np.sin(np.linspace(0, np.pi / 2, k)) ** 2
        k = min(int(fo_ms * SR / 1000), len(x))
        if k: x[-k:] *= np.cos(np.linspace(0, np.pi / 2, k)) ** 2
    return x / np.max(np.abs(x)) * PEAK


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, (fn, loop, fi, fo, _) in S.items():
        y = finalise(fn(), loop, fi, fo)
        sf.write(os.path.join(OUT, name + ".wav"), y, SR, subtype="PCM_16")
        print(f"{name:16s} {len(y)/SR:5.2f}s  loop={loop}")


if __name__ == "__main__":
    main()
