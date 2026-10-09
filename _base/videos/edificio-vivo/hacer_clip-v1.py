# Builds clip.json for "El edificio vivo" (60 s loop, no ending). The tour is a list of stops; each stop sets the camera,
# the chip, what the pen draws (one pass per home), and at most one bubble / one card. Run: python hacer_clip.py
import json, os
Y = lambda s: 0.25 + 3.1 * s
H = {  # home: (x, floor)
    'pb-portero': (-5.9, 0), 'pb-panaderia': (7.5, 0), 'p1-abuela': (-4.85, 1), 'p1-abuelo': (4.85, 1), 'p2-pareja': (-4.85, 2),
    'p2-estudiante': (4.85, 2), 'p3-nina': (-4.85, 3), 'p3-chico': (4.63, 3), 'p3-vecina': (8.88, 3), 'p4-teletrabajo': (-4.85, 4),
    'p4-bebe': (4.85, 4), 'p5-viajera': (-4.85, 5), 'p5-plantera': (4.85, 5), 'atico-artista': (-6, 6), 'atico-secadero': (5, 6)}
WHO = {  # who lives where (only the people the clip moves or makes speak)
    'pb-panaderia': ['panadera'], 'pb-portero': ['portero'], 'p1-abuela': ['abuela'], 'p1-abuelo': ['abuelo'], 'p2-pareja': ['pareja-a', 'pareja-b'],
    'p2-estudiante': ['estudiante'], 'p3-nina': ['nina', 'madre'], 'p3-chico': ['chico'], 'p3-vecina': ['vecina'], 'p4-teletrabajo': ['teletrabajo'],
    'p4-bebe': ['familia-bebe'], 'p5-viajera': ['viajera'], 'p5-plantera': ['plantera'], 'atico-artista': ['artista']}
def at(x, s, d=7.2, dx=0.0, fov=46):   # a view of a home from the open front
    y = Y(s); return {'pos': [x + dx, y + 1.9, -3.5 + d], 'look': [x, y + 1.15, -3.8], 'fov': fov}
P0 = {'jugada': 'camara-plano', 'centro': [0, 11.0, -3.5], 'alto': 40}
pulsos, chips = [], []
def add(**k): pulsos.append(k)
def draw(t, dur, homes, objetos=None):
    q = [w for h in homes for w in WHO.get(h, [])]
    add(t=t, dur=dur, jugada='dibujar-vivienda', viviendas=homes, quien=q, **({'objetos': objetos} if objetos else {}))
def chip(t, txt): add(t=t, jugada='chip', texto=txt)
def tour(t0, pts):   # pts: [(t from t0, view dict)]
    add(t=t0, jugada='recorrido', puntos=[{'t': dt, **v} for dt, v in pts])

# S0 the whole building, flat (the loop's first and last picture)
add(t=0, dur=2.7, jugada='dibujar-sitio', quien=[]); add(t=0, **P0)
# S1 into 3D, down to the street
add(t=2.7, dur=1.4, jugada='abrir-3d', centro=[-9.0, 1.4, 2.2], giro=22, alto=5.0, alza=6)
# S2 the street: the coach walks to work and says good morning (the pen draws her)
chip(4.1, 'STREET')
tour(4.1, [(0, {'pos': [-15.5, 1.9, 9.0], 'look': [-11.0, 1.3, 2.2], 'fov': 50}), (2.1, {'pos': [-11.0, 1.9, 9.0], 'look': [-7.0, 1.4, 2.0], 'fov': 50}),
           (4.2, {'pos': [-7.0, 2.2, 9.5], 'look': [-3.5, 1.6, 1.0], 'fov': 50})])
add(t=4.1, jugada='caminar', quien='profesional', de=[-13.0, 0.0, 2.2], a=[-5.0, 0.0, 2.2], dur=4.0)
draw(4.6, 0.6, [], None); pulsos[-1]['quien'] = ['profesional']
add(t=5.3, dur=1.6, jugada='burbuja', quien='profesional', cara='happy', texto='Morning!')
# S3 ground floor, the bakery (bread card)
chip(8.3, 'GROUND')
tour(8.3, [(0, at(7.5, 0, 8.0, -1.0)), (3.8, at(7.0, 0, 8.4, -0.4))])
draw(8.8, 0.9, ['pb-panaderia'])
add(t=9.7, dur=1.5, jugada='burbuja', quien='panadera', cara='happy', texto='Fresh!')
add(t=11.2, dur=1.9, jugada='tarjeta-en-sala', quien='panadera', tarjeta='bread', donde=[-1.0, 0.35, 0.6], camara=False)
# S4 the caretaker's flat (hidden cut), keys
tour(12.9, [(0, at(-5.9, 0, 7.0, 0.6)), (1.6, at(-5.9, 0, 6.6, -0.2))])
draw(13.0, 0.9, ['pb-portero'])
# S5 basement: bikes and the laundry (one wide view; the pen draws both rooms)
chip(14.5, 'BASEMENT')
add(t=14.5, dur=2.1, jugada='camara', pos=[0.0, Y(-1) + 2.3, 9.0], look=[0.0, Y(-1) + 1.0, -3.6], fov=60)
draw(15.0, 1.2, ['sotano-bicis', 'sotano-lavanderia'])
# S6-S10 floors 1 to 5: the camera reaches the home of who speaks, the pen draws it, they speak, then the camera slides to
# the other home of the floor while the pen draws it (zig-zag up the building)
def floor(t, c, a, b, who, txt, face):
    xa, sa = H[a]; xb, sb = H[b]
    chip(t, c); tour(t, [(0, at(xa, sa, 7.2)), (2.7, at(xa, sa, 7.0)), (3.3, at(xb, sb, 7.0)), (3.6, at(xb, sb, 7.2))])
    draw(t + 0.5, 0.8, [a]); add(t=round(t + 1.3, 2), dur=1.5, jugada='burbuja', quien=who, cara=face, texto=txt); draw(t + 3.0, 0.6, [b])
floor(16.6, 'FLOOR 1', 'p1-abuelo', 'p1-abuela', 'abuelo', 'Check!', 'happy')
floor(20.2, 'FLOOR 2', 'p2-estudiante', 'p2-pareja', 'estudiante', 'Exam!', 'worried')
# floor 3: Nina, then the drummer and the knitter with their thin wall (wall card)
chip(23.8, 'FLOOR 3')
tour(23.8, [(0, at(-4.85, 3, 7.2)), (2.8, at(-4.85, 3, 7.0)), (3.5, at(6.75, 3, 9.0, 0, 60)), (6.6, at(6.75, 3, 9.4, 0, 60))])
draw(24.3, 0.8, ['p3-nina'])
add(t=25.1, dur=1.5, jugada='burbuja', quien='nina', cara='happy', texto='Mom!')
draw(27.3, 1.0, ['p3-chico', 'p3-vecina'])
add(t=28.3, dur=1.9, jugada='tarjeta-en-sala', quien='chico', tarjeta='wall', donde=[1.0, 0.9, 0.5], camara=False)
floor(30.4, 'FLOOR 4', 'p4-teletrabajo', 'p4-bebe', 'teletrabajo', 'Mute!', 'surprised')
floor(34.0, 'FLOOR 5', 'p5-viajera', 'p5-plantera', 'viajera', 'Next?', 'curious')
# attic: the sheet that waves (right), then the painter and the sun too big for the canvas (sun card)
chip(37.6, 'ATTIC')
tour(37.6, [(0, at(5.0, 6, 8.0)), (0.7, at(5.0, 6, 7.9)), (1.0, at(-6.0, 6, 8.0)), (6.2, at(-6.0, 6, 8.3))])
draw(37.75, 0.55, ['atico-secadero']); draw(38.7, 0.8, ['atico-artista'])
add(t=39.5, dur=1.5, jugada='burbuja', quien='artista', cara='curious', texto='Almost')
add(t=41.0, dur=1.9, jugada='tarjeta-en-sala', quien='artista', tarjeta='sun', donde=[1.0, 0.4, 0.6], camara=False)
# roof terrace (hidden cut): the receptionist and the coach, cheers
chip(43.8, 'ROOF')
add(t=43.8, jugada='colocar', quien='profesional', pos=[-3.2, Y(6), -0.9], giro=-25, pose='stand')
add(t=43.8, dur=3.4, jugada='camara', pos=[-4.0, Y(6) + 5.0, 6.5], look=[-4.0, Y(6) + 1.3, -1.0], fov=46)
draw(44.3, 0.9, [], ['terraza']); pulsos[-1]['quien'] = ['recepcionista', 'profesional']
add(t=45.3, dur=1.5, jugada='burbuja', quien='recepcionista', cara='happy', texto='Cheers!')
# the city and the canal: the pen draws the skyline
chip(47.2, 'CITY')
tour(47.2, [(0, {'pos': [-2.0, 21.5, -1.0], 'look': [-8.0, 18.0, 40.0], 'fov': 50}), (3.4, {'pos': [-2.0, 21.5, -1.0], 'look': [8.0, 17.0, 40.0], 'fov': 50})])
draw(47.7, 1.5, [], ['fondo:ciudad'])
# down the front to the street, and back to the first picture
chip(50.6, 'STREET')
tour(50.6, [(0, {'pos': [0.0, 23.0, 16.0], 'look': [0.0, 19.0, -2.0], 'fov': 50}), (2.5, {'pos': [0.0, 10.0, 15.0], 'look': [0.0, 8.0, -2.0], 'fov': 50}),
            (4.6, {'pos': [-4.0, 2.4, 14.0], 'look': [-2.0, 2.2, -1.0], 'fov': 50})])
add(t=55.2, dur=2.1, **P0)
add(t=57.3, dur=2.7, jugada='borrar-sitio')

# life: everyone does their thing all the time (bucles closed in time; only people on screen move)
vida = {'panadera': ('knead', 1.6), 'abuela': ('knit-sit', 1.2), 'chico': ('drum', 0.6), 'vecina': ('knit-sit', 1.2), 'familia-bebe': ('rock', 2.0),
        'plantera': ('water', 2.0), 'artista': ('paint', 2.0), 'teletrabajo': ('type', 1.0), 'viajera': ('read', 2.4)}
for who, (pose, per) in vida.items(): pulsos.insert(0, {'t': 0, 'jugada': 'vida', 'quien': who, 'pose': pose, 'periodo': per, **({'hold': {'R': 'sticks', 'L': 'sticks'}} if pose == 'drum' else {})})

existentes = ['panadera', 'portero', 'abuela', 'abuelo', 'pareja-a', 'pareja-b', 'estudiante', 'nina', 'madre', 'chico', 'vecina', 'teletrabajo', 'familia-bebe', 'viajera', 'plantera', 'artista']
reparto = {k: {'existente': {'pareja-a': 'pareja', 'pareja-b': 'pareja#2'}.get(k, True), 'emocion': 1} for k in existentes}
reparto['recepcionista'] = {'pos': [-4.4, Y(6), -0.8], 'rotY': 0.4, 'pose': 'stand', 'emocion': 0}
reparto['profesional'] = {'pos': [-13.0, 0.0, 2.2], 'rotY': 1.57, 'pose': 'stand', 'emocion': 0}
clip = {
    'name': 'edificio-vivo', 'size': [1080, 1920], 'duration': 60.0, 'ending': False, 'bucle': True, 'bpm': 112,
    'sitio': {'tipo': 'edificio', 'mood': 'dia', 'frente': -0.3, 'culling': True, 'ocultar': ['balcon:' + h for h in ('p1-abuela', 'p2-pareja', 'p3-nina', 'p4-bebe', 'p5-viajera', 'p5-plantera', 'p2-estudiante')],
              'opts': {'cutaway': True, 'street': True, 'neighbours': True, 'skyline': True, 'residents': True, 'bikeLaneAccent': True}},
    'reparto': reparto, 'foco': 'profesional',
    'tarjetas': {'bread': {'label': 'bakery', 'num': '01', 'title': 'Fresh bread', 'sub': 'every morning', 'icon': 'heart'},
                 'wall': {'label': 'listen', 'num': '03', 'title': 'Thin wall', 'sub': 'say hello', 'icon': 'chat'},
                 'sun': {'label': 'attic', 'num': '06', 'title': 'Orange sun', 'sub': 'too big to frame', 'icon': 'hourglass'}},
    'pulsos': sorted(pulsos, key=lambda q: q['t']),
}
json.dump(clip, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'clip.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', len(clip['pulsos']), 'pulsos')
