# Builds the delivery sheets in _base/hojas/ from each area's renders (owner: main chat).
#   python _base/motor/hojas_finales.py      (after motor/rehacer-todo.sh)
import json, os, shutil
import numpy as np
from PIL import Image

B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(B, 'hojas'); os.makedirs(OUT, exist_ok=True)
PAPER = (249, 248, 245)


def names(job):
    return [s['name'] for s in json.load(open(os.path.join(B, job), encoding='utf-8'))['shots'] if s['name'] != 'warm']


def grid(folder, ns, cols, gap=24):
    ims = [Image.open(os.path.join(B, folder, n + '.png')) for n in ns]
    w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
    g = Image.new('RGB', (cols * w + (cols + 1) * gap, rows * h + (rows + 1) * gap), PAPER)
    for i, im in enumerate(ims): g.paste(im, (gap + (i % cols) * (w + gap), gap + (i // cols) * (h + gap)))
    return g


def check(path):
    a = np.asarray(Image.open(path).convert('L').resize((300, 300)))
    assert a.min() < 150, f'{path} looks blank'


def save(im, name):
    p = os.path.join(OUT, name); im.save(p, optimize=True); check(p); print('ok', name, im.size)


# 1. the whole building, dollhouse cut
save(Image.open(os.path.join(B, 'edificio/hojas/edificio-completo.png')), '01-edificio-completo.png')
# 2. building + surroundings, with the street movement strip under it (4 moments of the same street camera)
ent = Image.open(os.path.join(B, 'edificio/hojas/edificio-entorno.png'))
mov = grid('edificio/hojas/_mov', names('edificio/jobs/movimiento.json'), cols=4)
mov = mov.resize((ent.width, round(mov.height * ent.width / mov.width)))
both = Image.new('RGB', (ent.width, ent.height + mov.height), PAPER); both.paste(ent, (0, 0)); both.paste(mov, (0, ent.height))
save(both, '02-edificio-entorno-movimiento.png')
# 3. the building from inside: zoom chain, homes from 3 angles, stairs, lift, roof, basement, night
save(grid('edificio/hojas/_angulos', names('edificio/jobs/angulosA.json') + names('edificio/jobs/angulosB.json'), cols=7), '03-edificio-angulos.png')
# 4-5. waiting room
save(Image.open(os.path.join(B, 'sala-espera/hojas/_tmp/sala.png')), '04-sala-espera.png')
save(grid('sala-espera/hojas/_tmp-ang', names('sala-espera/jobs/sala-espera-angulos.json'), cols=6), '05-sala-espera-angulos.png')
# 6+. characters: line-up, pets, one sheet each
save(Image.open(os.path.join(B, 'personajes/hojas/elenco.png')), '06-elenco.png')
save(Image.open(os.path.join(B, 'personajes/hojas/mascotas.png')), '07-mascotas.png')
cast = names('personajes/jobs/hojas-1.json') + names('personajes/jobs/hojas-2.json') + names('personajes/jobs/hojas-3.json')
for i, n in enumerate(cast):
    save(Image.open(os.path.join(B, 'personajes/hojas', n + '.png')), f'{8 + i:02d}-personaje-{n}.png')
