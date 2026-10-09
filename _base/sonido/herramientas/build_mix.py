# Nudos 1 "Auriculares" final mix: SFX (work/audio-events.md, times from timeline.json + cues.json) + music.wav
# (ducked under SFX, near-silence at 15.1-16.6) + the logo ending (same sound identity as v4.1).
# Output composition/assets/audio/mix.wav: 48 kHz stereo 16-bit, exact length, two-pass loudnorm -14 LUFS, TP <= -1 dBFS.
# Also writes work/audio/mix-plot.png (energy + spectrogram with the event times).
import numpy as np, soundfile as sf, subprocess, json, os, re, tempfile
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SFX = os.path.join(ROOT, 'composition', 'assets', 'audio', 'sfx') + os.sep
HOUSE = os.path.abspath(os.path.join(ROOT, '..', 'gm-hook-test', 'composition', 'assets', 'sfx-hook')) + os.sep
TL = json.load(open(os.path.join(ROOT, 'timeline.json')))
CUES = json.load(open(os.path.join(ROOT, 'composition', 'assets', 'logo12', 'cues.json')))
SH = TL['shots']
SR = 48000
DUR = TL['total']
N = int(round(SR * DUR))
OUT = os.path.join(ROOT, 'composition', 'assets', 'audio', 'mix.wav')
WORK = os.path.join(ROOT, 'work', 'audio'); os.makedirs(WORK, exist_ok=True)
TMP = os.path.join(tempfile.gettempdir(), 'gm_nudos1_premix.wav')
rng = np.random.default_rng(21)
E0 = SH['s09']          # ending start (L = 0)
EVENTS = []             # (time, label) for the plot


def load(path, name):
    d, sr = sf.read(path + name + '.wav', dtype='float64')
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
    """loop x (crossfading the seam) until it is dur long"""
    n = int(dur * SR); k = int(xf * SR); out = x.copy()
    while len(out) < n + k:
        out = np.concatenate([out[:-k], out[-k:] * np.linspace(1, 0, k) + x[:k] * np.linspace(0, 1, k), x[k:]])
    return out[:n]


bus = np.zeros((2, N))


def place(x, t, gain=1.0, pan=0.0, label=None, target=None):
    tb = bus if target is None else target
    if label: EVENTS.append((t, label))
    i = int(round(t * SR))
    if i < 0 or i >= tb.shape[1] or len(x) == 0: return
    x = x[: tb.shape[1] - i] * gain
    p = np.asarray(pan, dtype=float)
    if p.ndim: p = p[: len(x)]
    ang = (p + 1) * np.pi / 4
    tb[0, i:i + len(x)] += x * np.cos(ang) * np.sqrt(2)
    tb[1, i:i + len(x)] += x * np.sin(ang) * np.sqrt(2)


def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], btype='band', fs=SR, output='sos'), x)
def lp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, btype='low', fs=SR, output='sos'), x)
def hp(x, fc, o=2): return signal.sosfilt(signal.butter(o, fc, btype='high', fs=SR, output='sos'), x)
def noise(n): return rng.standard_normal(n)
def norm(x, peak=1.0): return x / (np.abs(x).max() + 1e-9) * peak
def swell(n, power=1.0): return np.sin(np.pi * np.linspace(0, 1, n)) ** power


def tone(f, dur, decay=None, harm=(1.0,), attack=0.004, fo=0.01):
    n = int(dur * SR)
    f = np.full(n, f, dtype=float) if np.isscalar(f) else np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(f)), f)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(a * np.sin(ph * (k + 1)) for k, a in enumerate(harm))
    t = np.arange(n) / SR
    env = np.ones(n) if decay is None else np.exp(-t / decay)
    env *= np.minimum(1, t / max(attack, 1e-4))
    return fade(x * env, 0.001, fo)


def pen(dur, rate=(7, 13), bright=1.0, low=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = bp(noise(n), 1600 * bright, 6000 * bright)
    f = 0.5 * (rate[0] + rate[1]) + 0.5 * (rate[1] - rate[0]) * np.sin(2 * np.pi * 0.9 * t + rng.uniform(0, 6)) + 1.2 * np.sin(2 * np.pi * 2.3 * t)
    mod = 0.35 + 0.65 * np.abs(np.sin(np.pi * np.cumsum(f) / SR))
    return norm(fade(nz * mod + low * bp(noise(n), 250, 900) * mod, 0.03, 0.05))


def mallet(f, d=1.2, tau=0.45):
    t = np.arange(int(d * SR)) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / tau) + 0.35 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / (tau * 0.45)) + 0.1 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.05)
    return fade(x * np.minimum(1, t / 0.003), 0.001, 0.15)


# ---------------------------------------------------------------- assets
NAMES = ['alarm_short', 'bag_rustle', 'button_click', 'cabin_move', 'cabin_shake', 'cabin_stop', 'cable_stretch', 'cable_tug_1',
         'cable_tug_2', 'cable_tug_3', 'cable_wrap', 'ding', 'ding_call', 'doors_close', 'doors_open', 'earbud_in', 'keys_jingle_1',
         'keys_jingle_2', 'low_thump', 'nod_tick', 'pop_open', 'scooter_click', 'silence_air', 'step_soft_1', 'step_soft_2',
         'step_soft_3', 'sweep_up', 'tension_bip', 'tonk']
A = {k: load(SFX, k) for k in NAMES}
H = {k: load(HOUSE, k) for k in ['whoosh', 'whoosh_b', 'whoosh_c', 'riser', 'scribble', 'stroke', 'stroke_b', 'stroke_c', 'typing2']}
whooshes = [H['whoosh'], H['whoosh_b'], H['whoosh_c']]; strokes = [H['stroke'], H['stroke_b'], H['stroke_c']]
steps = [A['step_soft_1'], A['step_soft_2'], A['step_soft_3']]


def sfx(name, t, g, pan=0.0, rate=1.0):
    x = A[name] if rate == 1.0 else pitch(A[name], rate)
    place(x, t, g, pan, label=name)


def walk(times, g, rate, pan=0.0):
    for i, t in enumerate(times):
        place(pitch(steps[i % 3], rate * (1 + 0.03 * ((i * 7) % 3 - 1))), t, g * (0.9 + 0.1 * (i % 2)), pan, label='step')


def cabin(t0, t1, g=0.22):
    x = trim(A['cabin_move'], t1 - t0, 0.12)
    place(x, t0, g, label='cabin_move')
    place(A['cabin_stop'], t1, 0.45, label='cabin_stop')


def scribble_bed(t0, t1, g):
    place(fade(loop_to(H['scribble'], t1 - t0), 0.05, 0.12), t0, g, pan=0.1, label='pen')


# ---------------------------------------------------------------- whooshes 0.15 s before every cut
CUTS = [SH['s02'], SH['s03'], 6.718, 7.118, SH['s04'], SH['s05'], 12.455, SH['s06'], 15.736, 16.586, SH['s07'], SH['s08']]
for i, c in enumerate(CUTS): place(whooshes[i % 3], c - 0.15, 0.4, label='whoosh')
place(whooshes[0], E0 - 0.15, 0.25, label='whoosh')

# ---------------------------------------------------------------- s01
sfx('low_thump', 0.0, 0.28)
sfx('cable_tug_1', 0.12, 0.35)

# ---------------------------------------------------------------- s02 (lobby, boy fights the cable)
scribble_bed(0.69, 2.30, 0.25)
sfx('button_click', 2.795, 0.45)
sfx('ding_call', 2.82, 0.22)
sfx('doors_close', 3.095, 0.75)
sfx('cable_tug_3', 1.0, 0.3, pan=-0.2); sfx('cable_tug_3', 1.9, 0.3, pan=-0.2, rate=0.94)

# ---------------------------------------------------------------- s03 (lady's floor)
cabin(SH['s03'], 4.62)
sfx('ding', 4.67, 0.45)
sfx('doors_open', 4.72, 0.5)
walk([5.02, 5.10, 5.18, 5.27], 0.28, 1.0, pan=0.1)
place(A['bag_rustle'], 5.05, 0.7, pan=0.2, label='bag_rustle')
sfx('cable_tug_2', 5.87, 0.4)
sfx('cable_stretch', 5.95, 0.3)
sfx('tension_bip', 6.30, 0.14); sfx('tension_bip', 6.55, 0.14, rate=1.06)
place(A['button_click'], 6.71, 0.4, label='click')
sfx('doors_close', 7.27, 0.75)

# ---------------------------------------------------------------- s04 (janitor, heavier steps)
cabin(SH['s04'], 8.44)
sfx('ding', 8.49, 0.45)
sfx('doors_open', 8.54, 0.5)
walk([8.84, 8.92, 9.00, 9.09], 0.5, 0.82, pan=-0.1)
sfx('keys_jingle_1', 8.90, 0.32, pan=0.15); sfx('keys_jingle_2', 9.55, 0.32, pan=0.15)
sfx('tonk', 9.75, 0.45)
sfx('cable_wrap', 9.75, 0.45)
sfx('cable_stretch', 10.0, 0.3)
sfx('tension_bip', 10.2, 0.14, rate=0.95)
sfx('doors_close', 11.04, 0.75)

# ---------------------------------------------------------------- s05 (chaos)
cabin(SH['s05'], 12.45, 0.24)
sfx('cabin_shake', 11.455, 0.35); sfx('cabin_shake', 11.95, 0.35, rate=0.95)
sfx('alarm_short', 11.65, 0.2); sfx('alarm_short', 12.6, 0.2)
sfx('cable_stretch', 11.9, 0.35)
sfx('low_thump', 12.455, 0.5)
# riser rising into the 13.636 cut: synthetic rising noise sweep + the house riser landing on the cut
r0, r1 = 12.0, SH['s06']
n = int((r1 - r0) * SR); t = np.arange(n) / SR; u = t / (r1 - r0)
rs = noise(n); out = np.zeros(n)
cut = 300 * (1 + 20 * u ** 2)
for i in range(0, n, 2048):
    seg = rs[i:i + 2048]; fc = float(min(cut[i], 9000))
    out[i:i + 2048] = lp(seg, fc, 1) if i == 0 else signal.sosfilt(signal.butter(2, fc, 'low', fs=SR, output='sos'), seg)
tn = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (u * 2)) / SR) * 0.4
rise = norm(fade((out / (np.abs(out).max() + 1e-9) + tn) * u ** 1.6, 0.05, 0.02))
place(rise, r0, 0.12, label='riser')
place(pitch(H['riser'], 0.9), r1 - 0.30, 0.5, label='riser(house)')

# ---------------------------------------------------------------- s06 (girl, near-silence)
sfx('ding', 13.74, 0.45)
sfx('doors_open', 13.84, 0.5)
walk([14.14, 14.22, 14.30, 14.39], 0.20, 1.15, pan=0.1)
sfx('scooter_click', 14.45, 0.5)
place(loop_to(A['silence_air'], 1.6), 15.0, 0.03, label='silence_air')
sfx('nod_tick', 15.44, 0.5)
sfx('button_click', 15.99, 0.4)
sfx('cable_tug_1', 16.1, 0.28, rate=0.9)
sfx('pop_open', 16.636, 0.5)
sfx('sweep_up', 16.64, 0.3)

# ---------------------------------------------------------------- s07 (calm)
sfx('earbud_in', 18.55, 0.6)
sfx('nod_tick', 18.85, 0.5)
sfx('bag_rustle', 18.5, 0.6); sfx('bag_rustle', 18.9, 0.6, rate=1.05)
sfx('keys_jingle_1', 18.62, 0.3); sfx('keys_jingle_1', 19.1, 0.26, rate=1.1)
walk([19.25, 19.33, 19.42, 19.50], 0.30, 1.05, pan=0.1)
sfx('button_click', 19.72, 0.45)
sfx('doors_close', 20.3, 0.75)

# ---------------------------------------------------------------- s08 (exit)
cabin(SH['s08'], 22.2, 0.22)
sfx('sweep_up', 21.3, 0.3)
scribble_bed(21.42, 22.9, 0.25)

# ---------------------------------------------------------------- ending (as v4.1, from cues.json; L = abs - E0)
Lt = lambda x: E0 + x
G = 0.2
TIM = CUES['tim']   # short ending (07/10/2026): every ending time comes from the one TIM table in tools/logo/build_logo.py
place(pen(TIM['TSC'] - TIM['TS0'] + 0.05, rate=(12, 20), bright=0.9), Lt(CUES['scribble_start']), G * 0.9, label='end pen')
n = int((TIM['FL1'] - TIM['FL0'] + 0.2) * SR); fl = lp(bp(noise(n), 60, 900), 500) * swell(n, 0.8)
place(norm(fl), Lt(CUES['flood_start']), 0.2, label='flood swell')
hb = tone(np.linspace(80, 52, int(0.35 * SR)), 0.35, decay=0.09, harm=(1, 0.4), attack=0.003)
place(norm(lp(hb, 300)), Lt(CUES['tum']), 0.5, label='tum')
place(pen(TIM['SPI1'] - TIM['SEED0'] + 0.05, rate=(8, 14), bright=1.0), Lt(CUES['icon_start']), G * 0.85, label='icon pen')
place(trim(H['whoosh_b'], 0.5, 0.1), Lt(CUES['icon_open']), 0.15, label='whoosh_b')
NOTE = {'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'G4': 392.0, 'A4': 440.0, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99}
up = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5']
down = ['G5', 'E5', 'D5', 'C5', 'A4', 'G4', 'E4', 'D4']
for i, (t, nm) in enumerate(zip(CUES['line1_letter_start_list'], up)):
    place(mallet(NOTE[nm], 0.9, 0.35), Lt(t), 0.16, pan=-0.35 + 0.08 * i, label='letter note')
    place(trim(pitch(strokes[i % 3], rng.uniform(0.95, 1.1)), 0.1, 0.03), Lt(t), 0.08, pan=-0.35 + 0.08 * i)
place(pen(0.12, rate=(6, 9)), Lt(CUES['thread_to_M_start']), G * 0.5)
for i, (t, nm) in enumerate(zip(CUES['line2_letter_start_list'], down)):
    place(mallet(NOTE[nm], 0.9, 0.35), Lt(t), 0.15, pan=-0.3 + 0.08 * i, label='letter note')
    place(trim(pitch(strokes[(i + 1) % 3], rng.uniform(0.95, 1.1)), 0.1, 0.03), Lt(t), 0.08, pan=-0.3 + 0.08 * i)
place(trim(H['typing2'], 0.32, 0.08), Lt(CUES['url_start']), 0.12, label='typing2')
TC = Lt(CUES['wordmark_done'])
cd = 1.6; n = int(cd * SR); t = np.arange(n) / SR; chord = np.zeros(n)
for nm in ['C4', 'E4', 'G4', 'C5']:
    f = NOTE[nm]
    for det in (-0.6, 0.6): chord += np.sin(2 * np.pi * (f + det) * t) + 0.22 * np.sin(2 * np.pi * 2 * (f + det) * t)
env = np.minimum(1, t / 0.02) * np.exp(-np.maximum(0, t - 0.2) / 0.55)
place(norm(fade(chord * env, 0.001, 0.3)), TC, 0.22, label='CHORD')
# soft C-major pad under the icon's spiral and opening (spiral end to just before the opening ends), melting into the letter notes
p0, p1 = Lt(TIM['SPI1'] - 0.09), Lt(TIM['OPEN0'] + TIM['OPEN_DUR'] - 0.14); n = int((p1 - p0 + 0.6) * SR); t = np.arange(n) / SR; padx = np.zeros(n)
for f in (130.81, 196.0, 261.63, 329.63):
    for det in (-0.8, 0.8): padx += np.sin(2 * np.pi * (f + det) * t) * (1.0 if f < 300 else 0.6)
penv = np.minimum(1, t / 0.35) * np.where(t > p1 - p0, np.exp(-(t - (p1 - p0)) / 0.25), 1.0)
place(lp(norm(padx * penv), 1800) * 10 ** (-26 / 20), p0, 1.0, label='pad')
# opening flash of the icon: short low thump + paper snap, 0.2 s
n = int(0.2 * SR); t = np.arange(n) / SR
thump = np.sin(2 * np.pi * (70 - 30 * t / 0.2) * t) * np.exp(-t / 0.06)
snap = hp(noise(n), 2500) * np.exp(-t / 0.018)
place(norm(lp(thump, 400)) * 0.9 + norm(snap) * 0.35, Lt(CUES['icon_open']) + 0.02, 0.4, label='thump+snap')

# ---------------------------------------------------------------- music under the SFX, ducked
mus, msr = sf.read(os.path.join(ROOT, 'composition', 'assets', 'audio', 'music.wav'), dtype='float64')
mus = mus.T
if mus.shape[1] < N: mus = np.pad(mus, ((0, 0), (0, N - mus.shape[1])))
mus = mus[:, :N].copy()
a, b = int(SH['s02'] * SR), int(E0 * SR)
rs_ = np.sqrt(np.mean(bus[:, a:b] ** 2)); rm_ = np.sqrt(np.mean(mus[:, a:b] ** 2))
mus *= rs_ / rm_ * 10 ** (-2 / 20)
M = 24
env = np.abs(bus).max(axis=0)[: (N // M) * M].reshape(-1, M).max(axis=1)
fs_env = SR / M; att = np.exp(-1 / (0.04 * fs_env)); rel_ = np.exp(-1 / (0.2 * fs_env))
target = 1 - np.clip(env / 0.03, 0, 1) * (1 - 10 ** (-3 / 20))
g = np.ones_like(target); cur = 1.0
for i, tg in enumerate(target):
    c = att if tg < cur else rel_; cur = c * cur + (1 - c) * tg; g[i] = cur
mus *= np.interp(np.arange(N), (np.arange(len(g)) + 0.5) * M, g)
# the near-silence: music at -20 dB from 15.1 to 16.6, back by 16.7
tt = np.arange(N) / SR
sil = np.interp(tt, [14.98, 15.1, 16.6, 16.72], [0, -20, -20, 0])
mus *= 10 ** (sil / 20)

mix = bus + mus
endf = int(0.25 * SR); mix[:, -endf:] *= np.linspace(1, 0, endf) ** 1.5; mix[:, :48] *= np.linspace(0, 1, 48)
mix *= 0.7 / np.abs(mix).max()
sf.write(TMP, mix.T, SR, subtype='PCM_24')

# ---------------------------------------------------------------- two-pass loudnorm -14 LUFS, limiter, exact length
I, TP, LRA = -14, -1.5, 11
p1_ = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', TMP, '-af', f'loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
js = json.loads(re.findall(r'\{[^{}]*\}', p1_.stderr)[-1])
flt = (f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:"
       f"measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true,alimiter=limit=0.79:attack=2:release=40:level=disabled,"
       f"atrim=0:{DUR},apad=whole_dur={DUR},atrim=0:{DUR}")
subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', TMP, '-af', flt, '-ar', str(SR), '-ac', '2', '-c:a', 'pcm_s16le', OUT], check=True)
d, sr = sf.read(OUT)
if len(d) != N:
    d = np.pad(d, ((0, max(0, N - len(d))), (0, 0)))[:N]; sf.write(OUT, d, SR, subtype='PCM_16')
m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', OUT, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
summ = m[m.rfind('Summary'):]
print('samples', len(d), 'expected', N, 'dur', len(d) / sr, re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(0), '|', re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(0))

# ---------------------------------------------------------------- plot + per-event levels
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
mono = d.mean(axis=1)
hop = int(0.01 * SR)
rms = np.array([np.sqrt(np.mean(mono[i:i + 2 * hop] ** 2) + 1e-12) for i in range(0, len(mono) - 2 * hop, hop)])
rdb = 20 * np.log10(rms)
fig, ax = plt.subplots(2, 1, figsize=(26, 9), sharex=True)
ax[0].plot(np.arange(len(rdb)) * 0.01, rdb, lw=0.8, color='#1a3854'); ax[0].set_ylim(-70, -6); ax[0].set_ylabel('RMS dBFS (20 ms)')
f, tsp, Sxx = signal.spectrogram(mono, SR, nperseg=2048, noverlap=1536)
ax[1].pcolormesh(tsp, f, 10 * np.log10(Sxx + 1e-12), shading='auto', cmap='magma', vmin=-110, vmax=-40); ax[1].set_ylim(0, 8000); ax[1].set_ylabel('Hz')
for t, lab in EVENTS:
    c = 'red' if lab in ('CHORD',) else '#FFA462'
    for a_ in ax: a_.axvline(t, color=c, lw=0.6, alpha=0.7)
for t, lab in EVENTS:
    if lab not in ('whoosh', 'step', 'letter note'): ax[0].text(t, -8, lab, rotation=90, fontsize=5, va='top', ha='right', color='k')
for t_, lab in [(SH[k], k) for k in SH]: ax[0].text(t_ + 0.02, -66, lab, fontsize=8, color='#d05000')
ax[0].axvspan(15.1, 16.6, color='#88f', alpha=0.15); ax[0].set_xlim(0, DUR)
ax[0].set_title('Nudos 1 mix: event times (orange), near-silence 15.1-16.6 (blue), chord at %.3f (red)' % TC)
plt.tight_layout(); plt.savefig(os.path.join(WORK, 'mix-plot.png'), dpi=80)

# local level around each event: 100 ms RMS after the event vs the 300 ms before (in dB), plus absolute level
rows = []
for t, lab in sorted(EVENTS):
    i = int(t * SR)
    post = mono[i:i + int(0.12 * SR)]; pre = mono[max(0, i - int(0.3 * SR)):i]
    if len(post) < 100: continue
    rows.append('%7.3f  %-14s  abs %6.1f dB  vs-before %+5.1f dB  peak %6.1f dBFS' % (
        t, lab, 20 * np.log10(np.sqrt(np.mean(post ** 2)) + 1e-9), 20 * np.log10(np.sqrt(np.mean(post ** 2)) + 1e-9) - 20 * np.log10(np.sqrt(np.mean(pre ** 2)) + 1e-9) if len(pre) else 0, 20 * np.log10(np.abs(post).max() + 1e-9)))
open(os.path.join(WORK, 'mix-event-levels.txt'), 'w').write('\n'.join(rows))
print('event levels -> work/audio/mix-event-levels.txt; clip check, max abs', np.abs(d).max())
