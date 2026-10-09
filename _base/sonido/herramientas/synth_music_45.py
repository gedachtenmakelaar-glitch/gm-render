"""[45-beat grid copy of synth_music.py: drop exactly at the ending start E0, sample-accurate] Nudos 1 music: 110 bpm, C major, C - Am - F - G, playful (light mallet, pizzicato pluck, brushes).
Quiet entry at s02, builds per floor, peak under s05 (chaos), sweetest bar at s07 (18.0), drops at the ending scribble,
returns only as the final chord (wordmark_done). Deterministic. Writes composition/assets/audio/music.wav (48 kHz stereo)."""
import json, os
import numpy as np
from scipy import signal
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
TL = json.load(open(os.path.join(ROOT, "timeline.json")))
CUES = json.load(open(os.path.join(ROOT, "composition", "assets", "logo12", "cues.json")))
SR = 48000
BEAT = TL["beat"]
TOTAL = TL["total"]
N = int(round(TOTAL * SR))
E0 = TL["shots"]["s09"]                      # ending start (L=0)
bt = lambda b: b * BEAT
B = {k: v / BEAT for k, v in TL["shots"].items()}   # shot starts in beats
rng = np.random.default_rng(11)
L = np.zeros(N); R = np.zeros(N)


def mid(m): return 440.0 * 2 ** ((m - 69) / 12)
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def n(name, o): return 12 * (o + 1) + NOTE[name]
def pn(s): return n(s[0], int(s[1]))


def add(sig, start, pan=0.0, gain=1.0, bus=None):
    i = int(round(start * SR))
    if i >= N or i < 0: return
    a, b = bus if bus else (L, R)
    seg = sig[: N - i] * gain
    a[i:i + len(seg)] += seg * np.cos((pan + 1) * np.pi / 4)
    b[i:i + len(seg)] += seg * np.sin((pan + 1) * np.pi / 4)


def rel(sig, r=0.04):
    k = min(int(r * SR), len(sig)); sig[-k:] *= np.linspace(1, 0, k); return sig


def rhodes(f, dur, tau=1.4, idx=1.0):
    x = np.arange(int(dur * SR)) / SR
    env = np.minimum(x / 0.006, 1) * np.exp(-x / tau)
    I = idx * np.exp(-x / 0.35)
    s = np.sin(2 * np.pi * f * x + I * np.sin(2 * np.pi * f * x)) + 0.12 * np.sin(2 * np.pi * f * 6 * x) * np.exp(-x / 0.04)
    return rel(s * env)


def pad(f, dur):
    x = np.arange(int(dur * SR)) / SR; s = 0
    for dt in (-0.12, 0.0, 0.12):
        ff = f * 2 ** (dt / 12)
        s = s + np.sin(2 * np.pi * ff * x) + 0.3 * np.sin(4 * np.pi * ff * x) + 0.08 * np.sin(6 * np.pi * ff * x)
    env = np.minimum(x / 0.5, 1) * np.minimum((dur - x) / 0.7, 1).clip(0, 1)
    return s * env / 3


def mallet(f, dur=1.0, tau=0.28):
    x = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 4 * x) * np.exp(-x / 0.05)
    return rel(s * np.minimum(x / 0.002, 1) * np.exp(-x / tau))


def pluck(f, dur=0.6, tau=0.13):   # pizzicato: short, slightly woody
    x = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * x) + 0.5 * np.sin(4 * np.pi * f * x) * np.exp(-x / 0.03) + 0.25 * np.sin(6 * np.pi * f * x) * np.exp(-x / 0.015)
    return rel(s * np.minimum(x / 0.001, 1) * np.exp(-x / tau))


def noise_hit(dur, lo, hi, tau, attack=0.002):
    x = np.arange(int(dur * SR)) / SR
    s = signal.sosfilt(signal.butter(2, [lo, hi], btype="band", fs=SR, output="sos"), rng.standard_normal(len(x)))
    return s * np.minimum(x / attack, 1) * np.exp(-x / tau)


def bass(f, dur, tau=0.6):
    x = np.arange(int(dur * SR)) / SR
    return rel(np.sin(2 * np.pi * f * x) * np.minimum(x / 0.01, 1) * np.exp(-x / tau))


CH = {
    "C": ([n("C", 3), n("G", 3), n("B", 3), n("E", 4)], [n("C", 3), n("E", 3), n("G", 3), n("B", 3)], n("C", 2)),
    "Am": ([n("A", 2), n("E", 3), n("G", 3), n("C", 4)], [n("A", 2), n("E", 3), n("G", 3), n("C", 4)], n("A", 1)),
    "F": ([n("F", 2), n("C", 3), n("E", 3), n("A", 3)], [n("F", 2), n("C", 3), n("A", 3), n("E", 4)], n("F", 1)),
    "G": ([n("G", 2), n("D", 3), n("G", 3), n("B", 3)], [n("G", 2), n("D", 3), n("B", 3), n("D", 4)], n("G", 1)),
}
PROG = ["C", "Am", "F", "G"]
ARP = {"C": ["C5", "E5", "G5", "E5"], "Am": ["A4", "C5", "E5", "C5"], "F": ["A4", "C5", "F5", "C5"], "G": ["B4", "D5", "G5", "D5"]}
LIFT = {"C": "G5", "Am": "A5", "F": "C6", "G": "D6"}

# musical intensity per beat: quiet entry s02, a bit more each floor, peak s05 (chaos), s06 held back,
# sweet s07, soft s08
bp_ = [(0, 0.0), (B["s02"] - 0.01, 0.0), (B["s02"], 0.45), (B["s03"], 0.6), (B["s04"], 0.8), (B["s05"], 1.0), (B["s05"] + 2, 1.25),
       (B["s06"], 0.8), (B["s07"] - 0.01, 0.8), (B["s07"], 1.05), (B["s08"], 0.95), (B["s09"], 0.8)]
def lvl(b): return float(np.interp(b, [p[0] for p in bp_], [p[1] for p in bp_]))


END_B = B["s09"]
S2 = bt(B["s02"])
bar = 0
while bar * 4 < END_B:
    b0 = bar * 4; name = PROG[bar % 4]
    if b0 + 4 <= B["s02"]:
        bar += 1; continue
    rn, pd, bs = CH[name]
    t0 = bt(b0); blen = (min(b0 + 4, END_B) - b0) * BEAT
    lv = lvl(max(b0, B["s02"]) + 1)
    ts = max(t0, S2)
    for i, m in enumerate(rn):
        add(rhodes(mid(m), blen + 0.5, tau=1.5), ts + i * 0.028, pan=-0.55 + 0.2 * i, gain=0.18 * lv)
    for m in pd:
        add(pad(mid(m), blen + 0.6), ts - 0.05 if ts > 0.05 else ts, gain=0.09 * min(lv, 1.0))
    if b0 >= 4:   # soft bass on 1 and 3
        for k in (0, 2):
            if b0 + k < END_B: add(bass(mid(bs), 1.0), t0 + k * BEAT, gain=0.26 * min(lv, 1.1))
    # pizzicato arpeggio from the lady's floor on, denser as floors go up
    if b0 + 4 > B["s03"]:
        notes = ARP[name]
        steps = [(0.5, 0), (1.5, 1), (2.5, 2), (3.5, 3)] if lv < 0.95 else [(0, 0), (0.5, 1), (1, 2), (1.5, 3), (2, 2), (2.5, 1), (3, 2), (3.5, 3)]
        for st, k in steps:
            tt = t0 + st * BEAT
            if tt < bt(B["s03"]) or b0 + st >= END_B: continue
            add(pluck(mid(pn(notes[k]))), tt, pan=-0.35 if k % 2 else 0.35, gain=0.13 * lv)
    # mallet motif in the chaos floor
    if B["s05"] <= b0 + 2 and b0 < B["s06"]:
        for st, k in [(0.5, 0), (1.5, 2), (2.5, 1), (3.0, 3)]:
            if b0 + st >= END_B: continue
            add(mallet(mid(pn(ARP[name][k]) + 12), 0.7, 0.2), t0 + st * BEAT, pan=0.4 if k % 2 else -0.4, gain=0.10)
    # warm lift at s07: high rhodes, high mallet, the sweetest bar
    if b0 + 4 > B["s07"] and b0 < B["s08"]:
        tl = max(t0, bt(B["s07"]))
        for i, m in enumerate(rn):
            add(rhodes(mid(m + 12), 1.8, tau=1.0), tl + 0.03 + i * 0.045, pan=0.1 + 0.15 * i, gain=0.08)
        add(mallet(mid(pn(LIFT[name])), 1.4, 0.45), tl + 0.02, pan=0.3, gain=0.14)
        add(mallet(mid(pn(ARP[name][2]) + 12), 1.0, 0.35), tl + 2 * BEAT, pan=-0.3, gain=0.10)
    bar += 1

# soft brushes + shaker: from s04 through s08
for b in np.arange(B["s04"], END_B, 0.5):
    acc = 1.0 if (b * 2) % 2 == 1 else 0.6
    add(noise_hit(0.07, 6000, 11000, 0.02), bt(b), pan=0.25 if (b * 2) % 2 else -0.15, gain=0.08 * acc * lvl(b))
for b in np.arange(round(B["s03"]), END_B, 1.0):
    if int(round(b)) % 2 == 1:
        add(noise_hit(0.22, 2500, 7000, 0.07, attack=0.03), bt(b), gain=0.10 * lvl(b))


def reverb(x):
    ir_len = int(1.8 * SR); xx = np.arange(ir_len) / SR
    ir = np.random.default_rng(3).standard_normal(ir_len) * np.exp(-xx / 0.45)
    ir = signal.sosfilt(signal.butter(1, 4500, fs=SR, output="sos"), ir)
    ir[: int(0.012 * SR)] *= 0.2; ir /= np.sqrt(np.sum(ir ** 2))
    return signal.fftconvolve(x, ir)[: len(x)]


# final chord on its own bus (logo identity: C-major chord on wordmark_done)
FL = np.zeros(N); FR = np.zeros(N)
tc = E0 + CUES["wordmark_done"]
for i, m in enumerate([n("C", 2), n("G", 2), n("C", 3), n("E", 3), n("G", 3), n("C", 4), n("E", 4), n("D", 5)]):
    add(rhodes(mid(m), 2.4, tau=1.0, idx=0.9), tc + i * 0.022, pan=-0.5 + 0.14 * i, gain=0.22 if i > 1 else 0.28, bus=(FL, FR))
for m in [n("C", 3), n("E", 3), n("G", 3), n("C", 4), n("G", 4)]:
    add(pad(mid(m), 1.9), tc - 0.02, gain=0.11, bus=(FL, FR))
for m, dl in [("C6", 0.05), ("E6", 0.12), ("G6", 0.2)]:
    add(mallet(mid(pn(m)), 1.2, tau=0.4), tc + dl, pan=0.3, gain=0.10, bus=(FL, FR))

# drop-out at the ending scribble's flood
tg = E0 + CUES["flood_start"]
# 45-beat grid: the bed (and its reverb tail) drops exactly at the ending start E0, sample-accurate:
# full level up to sample i0 - 144 (3 ms de-click ramp ending AT i0), zero from i0 on.
i0 = int(round(E0 * SR)); DROP_I0 = i0
gate = np.ones(N); gate[i0 - 144:i0] = np.linspace(1, 0, 144, endpoint=False); gate[i0:] = 0
ML = (L + 0.35 * reverb(L)) * gate
MR = (R + 0.35 * reverb(R)) * gate
FL2, FR2 = FL + 0.4 * reverb(FL), FR + 0.4 * reverb(FR)
tail = np.ones(N)
s0, s1 = int((tc + 0.35) * SR), int((TOTAL - 0.12) * SR)
tail[s0:s1] = np.linspace(1, 0, s1 - s0) ** 1.5
tail[s1:] = 0
FL2 *= tail; FR2 *= tail
FL2[: int((tc - 0.01) * SR)] = 0; FR2[: int((tc - 0.01) * SR)] = 0

# drone under flood/icon, dry, up to just before the chord
x = np.arange(N) / SR
d0, d1 = E0 + CUES['tim']['FL1'], tc - 0.05   # drone from the end of the flood (short ending)
env = np.zeros(N); m_ = (x >= d0) & (x < d1); u = (x[m_] - d0) / (d1 - d0)
env[m_] = np.sin(np.pi * u) ** 1.5 * 0.9 + 0.1 * u
env[m_] *= np.minimum((d1 - x[m_]) / 0.15, 1)
dr = (np.sin(2 * np.pi * mid(n("C", 2)) * x) + 0.5 * np.sin(2 * np.pi * mid(n("G", 2)) * x * 1.002)) * env * 0.06

y = np.stack([ML + FL2 + dr, MR + FR2 + dr], 1)
y *= 10 ** (-6 / 20) / np.max(np.abs(y))
y[:48] *= np.linspace(0, 1, 48)[:, None]
out = os.path.join(ROOT, "composition", "assets", "audio", "music.wav")
wavfile.write(out, SR, (y * 32767).astype(np.int16))
print("drop sample", DROP_I0, "t", DROP_I0 / SR); print("len s", N / SR, "peak", np.max(np.abs(y)))
for s in range(0, int(TOTAL) + 1, 2):
    seg = y[s * SR:(s + 2) * SR]
    print(s, round(20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9), 1))
