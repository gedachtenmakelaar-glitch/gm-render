"""Genera _prueba-112.wav: 3 min de drum and bass de juguete a 112 BPM (44.1 kHz estereo, 16 bit) para probar mezcla.py y pulso.py.
Bombo en 1 y 3 (+ medio pulso antes del 4), caja en 2 y 4, hi-hat a corcheas, bajo que cambia de nota cada compas. El primer pulso cae a 0.20 s
(a proposito, para comprobar que pulso.py encuentra el desfase).  Uso: python _generar-prueba.py"""
import os, numpy as np, soundfile as sf
from scipy import signal

SR = 44100; BPM = 112.0; DUR = 180.0; OFF = 0.20
beat = 60 / BPM; N = int(DUR * SR); rng = np.random.default_rng(5)
L = np.zeros(N); R = np.zeros(N)


def put(x, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N: return
    x = x[: N - i] * g; a = (pan + 1) * np.pi / 4
    L[i:i + len(x)] += x * np.cos(a); R[i:i + len(x)] += x * np.sin(a)


def bp(x, lo, hi): return signal.sosfilt(signal.butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def hp(x, f): return signal.sosfilt(signal.butter(2, f, 'high', fs=SR, output='sos'), x)


t = np.arange(int(0.3 * SR)) / SR
kick = np.sin(2 * np.pi * np.cumsum(45 + 90 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.11) * np.minimum(1, t / 0.001)
kick = np.tanh(kick * 1.6)
n = int(0.25 * SR); t2 = np.arange(n) / SR
snare = (bp(rng.standard_normal(n), 1500, 7000) * np.exp(-t2 / 0.06) + 0.7 * np.sin(2 * np.pi * 190 * t2) * np.exp(-t2 / 0.05)) * np.minimum(1, t2 / 0.001)
n = int(0.06 * SR); t3 = np.arange(n) / SR
hat = hp(rng.standard_normal(n), 7000) * np.exp(-t3 / 0.012); hat_o = hp(rng.standard_normal(int(0.16 * SR)), 6000) * np.exp(-np.arange(int(0.16 * SR)) / SR / 0.05)
NOTAS = [55.0, 55.0, 43.65, 49.0]   # A1 A1 F1 G1

for k in range(int((DUR - OFF) / beat)):
    tb = OFF + k * beat; pos = k % 4; bar = k // 4
    if pos in (0, 2): put(kick, tb, 0.9 if pos == 0 else 0.75)
    if pos == 3: put(kick, tb + beat * 0.5, 0.6)
    if pos in (1, 3): put(snare, tb, 0.7)
    put(hat, tb, 0.22, -0.3); put(hat_o if pos == 3 else hat, tb + beat * 0.5, 0.16, 0.3)
    if pos == 0 or (pos == 2 and bar % 2 == 1):   # bajo: nota nueva en el 1 de cada compas
        f = NOTAS[bar % 4]; m = int(beat * (4 if pos == 0 else 2) * SR); tt = np.arange(m) / SR
        b = np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt)
        put(b * np.minimum(1, tt / 0.005) * np.minimum(1, (tt[::-1] / 0.05)) * 0.55, tb, 1.0)

mix = np.stack([L, R], axis=1); mix *= 0.8 / np.abs(mix).max()
sf.write(os.path.join(os.path.dirname(os.path.abspath(__file__)), '_prueba-112.wav'), mix, SR, subtype='PCM_16')
print('listo: _prueba-112.wav', N / SR, 's')
