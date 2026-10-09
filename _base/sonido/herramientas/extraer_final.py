"""Extrae el SONIDO del final aprobado (6,6 s) de la mezcla de Nudos 1, una sola vez.
Ejecuta la copia de build_mix.py (herramientas/build_mix.py, la del kit) con el cronograma de Nudos 1
(herramientas/timeline-nudos1.json) y la musica music-45-short.wav, y se detiene justo antes de la normalizacion.
Guarda recursos/final-6.6s.wav (estereo 48 kHz, float32, sin normalizar: mismas unidades que los SFX de mezcla.py)
y recursos/final-ref.json (nivel de la cama de la historia en esas mismas unidades).
Uso: python herramientas/extraer_final.py   (necesita ../../archivo/_kit)"""
import os, json, re
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
SON = os.path.abspath(os.path.join(HERE, '..'))
KIT = os.path.abspath(os.path.join(SON, '..', '..', 'archivo', '_kit'))
src = open(os.path.join(HERE, 'build_mix.py'), encoding='utf-8').read()
src = src.replace("ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))", f"ROOT = {KIT!r}")
src = src.replace("json.load(open(os.path.join(ROOT, 'timeline.json')))", f"json.load(open({os.path.join(HERE,'timeline-nudos1.json')!r}))")
src = src.replace("DUR = TL['total']", "DUR = TL['shots']['s09'] + 6.6")
src = src.replace("'audio', 'music.wav'", "'audio', 'music-45-short.wav'")
src = src.replace("WORK = os.path.join(ROOT, 'work', 'audio'); os.makedirs(WORK, exist_ok=True)", "WORK = os.environ.get('TEMP', '.')")
cut = src.index("mix = bus + mus")
src = src[:cut]
ns = {'__file__': os.path.join(HERE, 'build_mix.py'), '__name__': 'x'}
exec(compile(src, 'build_mix_patched', 'exec'), ns)
SR = ns['SR']; E0 = ns['E0']; bus = ns['bus']; mus = ns['mus']; i0 = int(round(E0 * SR))
end = (bus + mus)[:, i0:i0 + int(round(6.6 * SR))]
sf.write(os.path.join(SON, 'recursos', 'final-6.6s.wav'), end.T.astype(np.float32), SR, subtype='FLOAT')
a, b = int(ns['SH']['s02'] * SR), i0
rms = lambda x: float(np.sqrt(np.mean(x ** 2)))
ref = {'E0_nudos1': E0, 'fin_muestras': end.shape[1], 'rms_cama_historia': rms(mus[:, a:b]), 'rms_sfx_historia': rms(bus[:, a:b]),
       'pico_final': float(np.abs(end).max()), 'rms_final': rms(end), 'rms_sfx_final': rms(bus[:, i0:])}
json.dump(ref, open(os.path.join(SON, 'recursos', 'final-ref.json'), 'w'), indent=1)
print(ref, end.shape)
