# Test harness for tarjeta.js (logo face): renders CLEAN stills (no dither) of cards via hyperframes snapshot. Uses still.py's lock. Run from videos/.
import os, sys, shutil, subprocess, glob, time
HERE = os.path.dirname(os.path.abspath(__file__)); MOTOR = os.path.dirname(HERE); BASE = os.path.dirname(MOTOR)
sys.path.insert(0, MOTOR)
import still
W, H = 1080, 900
work = os.path.join(BASE, '_work', 'tarjeta-prueba-' + str(os.getpid()))
if os.path.exists(work): shutil.rmtree(work)
os.makedirs(os.path.join(work, 'motor'))
for f in os.listdir(MOTOR):
    p = os.path.join(MOTOR, f)
    if f.endswith('.js') and os.path.isfile(p): shutil.copy2(p, os.path.join(work, 'motor', f))
for d in ('vendor', 'recursos'): shutil.copytree(os.path.join(MOTOR, d), os.path.join(work, 'motor', d))
html = open(os.path.join(HERE, 'prueba.html'), encoding='utf-8').read().replace('__W__', str(W)).replace('__H__', str(H))
open(os.path.join(work, 'index.html'), 'w', encoding='utf-8').write(html)
snap = os.path.join(work, 'snaps'); ats = '0.5,1.5,2.5,3.5,4.5'
still.lock()
try:
    HF = still.HF
    p = subprocess.run(f'{HF} snapshot "{work}" --at {ats} --no-end -o "{snap}" --describe false --timeout 60000', shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=400)
    print(p.returncode, (p.stdout[-400:] + p.stderr[-400:]).encode('ascii','replace').decode())
finally:
    still.unlock()
out = os.path.join(HERE, 'salida'); os.makedirs(out, exist_ok=True)
pngs = sorted(glob.glob(os.path.join(snap, '*.png')), key=lambda q: float(''.join(c for c in os.path.basename(q).split('at-')[-1].split('s')[0] if c in '0123456789.') or 0))
names = ['warm', 'logo-final', 'logo-mitad', 'tarjeta-nueva', 'tarjeta-vieja']
for n, q in zip(names, pngs): shutil.copy2(q, os.path.join(out, n + '.png'))
print(len(pngs), 'pngs ->', out)
shutil.rmtree(work, ignore_errors=True)
