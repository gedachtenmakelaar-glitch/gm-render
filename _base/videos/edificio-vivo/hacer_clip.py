# Pieza B v2 «Un día en el barrio» (~118 s + logo): one day, morning to night, showing the whole world and cast.
# Chapters (each one its own place/light; the pen erases between them and draws the next):
#   1 morning in the building and its street (0-52)   2 the waiting room (52-66)   3 the consulting room (66-78)
#   4 afternoon: home, and everyone on the roof (78-101)   5 night: the professional walks home (101-118) + logo
# python hacer_clip.py  ->  clip.json   (v1, the 60 s loop: hacer_clip-v1.py / clip-v1.json)
import json, math, os

Y = lambda s: 0.25 + 3.1 * s
H_FRAME, CZ = 13.0, 30.0
FOV = round(2 * math.degrees(math.atan(H_FRAME / 2 / (CZ + 3))), 3)

def beats():
    L = []
    def add(t, jugada, **k): L.append({'t': round(t, 3), 'jugada': jugada, **k})
    return L, add

def facade_cam(cx, cy):   # outside the open front, looking in; cerca clips the street in front
    return {'pos': [round(cx, 3), round(cy, 3), CZ], 'look': [round(cx, 3), round(cy, 3), -3.0], 'fov': FOV}

HOMES_ALL = ['pb-portero', 'pb-panaderia', 'p1-abuela', 'p1-abuelo', 'p2-pareja', 'p2-estudiante', 'p3-nina', 'p3-chico', 'p3-vecina',
             'p4-teletrabajo', 'p4-bebe', 'p5-viajera', 'p5-plantera', 'atico-artista', 'atico-secadero']
BALCONES = ['balcon:' + h for h in HOMES_ALL if h.startswith('p') and not h.startswith('pb')]
RESID = ['abuela', 'abuelo', 'estudiante', 'chico', 'vecina', 'nina', 'madre', 'teletrabajo', 'familia-bebe', 'viajera', 'plantera', 'artista', 'portero', 'panadera']
def building(mood, cutaway=True, culling=True):
    return {'tipo': 'edificio', 'mood': mood, 'culling': culling, 'ocultar': BALCONES if cutaway else [],
            'opts': {'cutaway': cutaway, 'street': True, 'neighbours': True, 'skyline': True, 'residents': True, 'bikeLaneAccent': True}}
def residents(extra=None):
    r = {'pareja-a': {'existente': 'pareja'}, 'pareja-b': {'existente': 'pareja#2'}, **{i: {'existente': True, 'emocion': 1} for i in RESID}}
    r.update(extra or {}); return r
VIDA = {'abuela': ('knit-sit', 1.2, None), 'estudiante': ('type', 0.5, None), 'chico': ('drum', 0.6, {'R': 'sticks', 'L': 'sticks'}),
        'teletrabajo': ('type', 0.55, None), 'familia-bebe': ('rock', 1.6, None), 'plantera': ('water', 1.5, {'R': 'wateringCan'}),
        'artista': ('paint', 1.2, {'R': 'brush'}), 'panadera': ('knead', 1.0, None)}

# =============================================================== 1. morning: the street, then the building floor by floor
P1, add = beats()
for who, (pose, per, hold) in VIDA.items(): add(0, 'vida', quien=who, pose=pose, periodo=per, **({'hold': hold} if hold else {}))
add(0, 'pose', quien='pareja-b', pose='carry-box', dur=0.1)
add(0, 'pose', quien='madre', pose='phone-look', hold={'R': 'phone'}, dur=0.1)
add(0, 'pose', quien='viajera', pose='phone-call', hold={'R': 'phone'}, dur=0.1)
add(0, 'emocion', quien='vecina', nivel=4)
add(0, 'colocar', quien='portero', pos=[3.8, 0, 0.9], giro=-40, pose='stand', hold={'R': 'keys'})
add(0, 'colocar', quien='profesional', pos=[-13, 0, 2.2], giro=90, pose='walk')
add(0, 'camara', pos=[-22, 15, 45], look=[0, 8, 0], fov=44, dur=3.3, empuje=0.05)
add(0, 'dibujar-sitio', dur=2.6, quien=['profesional'])
add(2.75, 'chip', texto='CITY')
add(3.3, 'recorrido', puntos=[
    {'t': 0, 'pos': [-26, 4.5, 22], 'look': [-8, 2.0, 2], 'fov': 40},
    {'t': 3.5, 'pos': [-16, 2.4, 15], 'look': [-6, 1.6, 1.5], 'fov': 42},
    {'t': 7.0, 'pos': [-2, 1.9, 10], 'look': [5.5, 1.6, 0], 'fov': 46},
    {'t': 11.7, 'pos': [4.2, 1.8, 7.5], 'look': [3.5, 1.4, 0.5], 'fov': 44}])
add(3.4, 'caminar', quien='profesional', de=[-13, 0, 2.2], a=[10.5, 0, 2.2], dur=12.5)
add(4.2, 'chip', texto='STREET')
add(8.4, 'dibujar-vivienda', viviendas=['pb-panaderia'], dur=1.0)
add(9.7, 'chip', texto='BAKERY')
add(11.4, 'burbuja', quien='profesional', cara='happy', texto='Morning!', dur=1.4)
add(11.9, 'pose', quien='panadera', pose='wave', dur=0.4)
add(12.4, 'dibujar-vivienda', viviendas=['pb-portero', 'sotano-bicis', 'sotano-lavanderia'], sin=['portero'], dur=1.2)
add(13.2, 'pose', quien='portero', pose='wave', hold={'R': 'keys'}, dur=0.4)
add(14.6, 'vida', quien='panadera', pose='knead', periodo=1.0)

# the tour: one level every 3.5 s, the camera sweeps the floor (left to right, then right to left above), the pen draws the next level
LEVELS = [(-1, 'BASEMENT', []), (0, 'GROUND FLOOR', ['p1-abuela', 'p1-abuelo']), (1, 'FLOOR 1', ['p2-pareja', 'p2-estudiante']),
          (2, 'FLOOR 2', ['p3-nina', 'p3-chico', 'p3-vecina']), (3, 'FLOOR 3', ['p4-teletrabajo', 'p4-bebe']), (4, 'FLOOR 4', ['p5-viajera', 'p5-plantera']),
          (5, 'FLOOR 5', ['atico-artista', 'atico-secadero']), (6, 'ATTIC', []), (6.6, 'ROOF', [])]
T0, DT, pts = 15.4, 3.5, []
add(13.9, 'pose', quien='portero', pose='stand', hold={'R': 'keys'}, dur=0.3)
for k, (lv, name, nxt) in enumerate(LEVELS):
    tl, d = T0 + k * DT, 1 if k % 2 == 0 else -1
    cy = Y(lv) + 1.3 if -1 < lv < 6.5 else (Y(6) + 1.6 if lv > 6.5 else Y(-1) + 3.2)
    # dwell on one home, swing to the other, dwell (the homes sit at about x = +-6)
    pts += [{'t': round(tl - T0, 3), **facade_cam(-5.6 * d, cy)}, {'t': round(tl - T0 + 1.25, 3), **facade_cam(-5.3 * d, cy)},
            {'t': round(tl - T0 + 2.05, 3), **facade_cam(5.3 * d, cy)}, {'t': round(tl - T0 + 3.1, 3), **facade_cam(5.6 * d, cy)}]
    if nxt: add(tl - 0.25, 'dibujar-vivienda', viviendas=nxt, dur=1.0)
    add(tl + 0.95, 'chip', texto=name)
add(T0, 'recorrido', puntos=pts, cerca=3.05)
add(T0 + 4 * DT + 1.5, 'pose', quien='nina', pose='wave', dur=0.4)
add(T0 + 4 * DT + 1.6, 'burbuja', quien='nina', cara='happy', texto='Hi!', dur=1.2)
add(T0 + 3 * DT + 1.6, 'burbuja', quien='pareja-b', cara='surprised', texto='So many boxes!', dur=1.5)
T_END = T0 + len(LEVELS) * DT          # 46.9
# noon: the worried neighbour goes out
add(T_END, 'colocar', quien='vecina', pos=[3.4, 0, 2.1], giro=90, pose='stand', hold={})
add(T_END, 'camara', pos=[2.0, 1.9, 9.5], look=[7.0, 1.2, 2.2], fov=48, dur=3.8, deriva=4)
add(T_END + 0.3, 'caminar', quien='vecina', de=[3.4, 0, 2.1], a=[12.5, 0, 2.2], dur=3.6)
add(T_END + 0.2, 'chip', texto='NOON')
add(T_END + 1.0, 'burbuja', quien='vecina', cara='worried', dur=1.4)
add(50.6, 'borrar-sitio', dur=1.4)
CH1 = {'desde': 0, 'sitio': building('dia'), 'reparto': residents({'profesional': {'pos': [-13, 0, 1.5], 'rotY': 1.5708, 'emocion': 0}}),
       'foco': 'profesional', 'pulsos': P1}

# =============================================================== 2. the waiting room
P2, add = beats()
add(52.0, 'camara', nombre='v41-v', dur=3.5, deriva=3)
add(52.0, 'dibujar-sitio', dur=2.6, quien=['abuela', 'estudiante', 'nina', 'madre', 'vecina'])
add(52.0, 'vida', quien='abuela', pose='knit-sit', periodo=1.2)
add(54.8, 'chip', texto='WAITING ROOM')
add(55.5, 'camara', nombre='reloj-v', dur=1.6)
add(57.1, 'camara', nombre='asiento-1-v', dur=2.0, deriva=-3)
add(57.3, 'burbuja', quien='vecina', cara='worried', dur=1.4)
add(59.1, 'colocar', quien='profesional', pos=[-4.0, 0, -1.4], giro=90, pose='wave')
add(59.1, 'camara', nombre='ancho-puerta-v', dur=3.0, deriva=3)
add(59.4, 'burbuja', quien='profesional', cara='happy', texto='Come in!', dur=1.4)
add(61.0, 'pose', quien='vecina', pose='stand', dur=0.5)
add(61.6, 'caminar', quien='vecina', a=[-3.4, 0, -1.4], dur=1.6, fin='stand', giro=-90)
add(62.1, 'camara', nombre='v41-v', dur=2.3, deriva=-3)
add(64.4, 'borrar-sitio', dur=1.4)
CH2 = {'desde': 52.0, 'sitio': {'tipo': 'sala-espera', 'opts': {'disposicion': 'v41'}},
       'reparto': {'abuela': {'asiento': 4, 'pose': 'knit-sit', 'emocion': 1}, 'vecina': {'asiento': 6, 'emocion': 4},
                   'estudiante': {'asiento': 1, 'emocion': 2}, 'nina': {'asiento': 9, 'emocion': 1}, 'madre': {'asiento': 10, 'hold': {'R': 'phone'}, 'emocion': 2},
                   'profesional': {'pos': [-30, 0, -30], 'emocion': 0}},
       'foco': 'vecina', 'pulsos': P2}

# =============================================================== 3. the consulting room: talking untangles her head
P3, add = beats()
add(66.0, 'camara', nombre='v41-v', dur=3.0, deriva=3)
add(66.0, 'dibujar-sitio', dur=2.4, quien=['profesional', 'vecina'])
add(68.6, 'camara', nombre='asiento-2-v', dur=2.6, deriva=-3)
add(68.9, 'burbuja', quien='vecina', cara='worried', dur=1.3)
add(70.5, 'camara', de='profesional', lado=30, alza=-4, dist=2.2, dur=1.6)
add(70.7, 'burbuja', quien='profesional', cara='curious', dur=1.2)
add(72.1, 'camara', nombre='asiento-2-v', dur=4.2, deriva=3)
add(72.4, 'resolver', quien='vecina', dur=1.0)
add(73.8, 'burbuja', quien='vecina', cara='happy', texto='Thanks!', dur=1.5)
add(76.4, 'borrar-sitio', dur=1.4)
CH3 = {'desde': 66.0, 'sitio': {'tipo': 'sala-espera', 'opts': {'variante': 'consultorio'}},
       'reparto': {'vecina': {'asiento': 0, 'emocion': 4}, 'profesional': {'asiento': 3, 'emocion': 0}},
       'foco': 'vecina', 'pulsos': P3}

# =============================================================== 4. afternoon: home again, and everyone on the roof
P4, add = beats()
for who, (pose, per, hold) in VIDA.items(): add(78.0, 'vida', quien=who, pose=pose, periodo=per, **({'hold': hold} if hold else {}))
add(78.0, 'colocar', quien='vecina', pos=[14, 0, 2.2], giro=-90, pose='walk', hold={})
add(78.0, 'emocion', quien='vecina', nivel=0)
add(78.0, 'camara', pos=[-6, 2.8, 22], look=[4, 2.4, 0.5], fov=42, dur=3.6, empuje=0.08)
add(78.0, 'dibujar-sitio', dur=2.6, quien=['vecina'])
add(78.3, 'caminar', quien='vecina', de=[14, 0, 2.2], a=[6.0, 0, 2.2], dur=5.6, fin='stand', giro=-60)
add(80.75, 'chip', texto='AFTERNOON')
add(81.8, 'camara', pos=[3.6, 1.8, 8.6], look=[6.2, 1.4, 0.5], fov=46, dur=3.0, deriva=-3)
add(82.0, 'pose', quien='panadera', pose='wave', dur=0.4)
add(82.2, 'burbuja', quien='panadera', cara='happy', texto='Bread?', dur=1.3)
add(83.6, 'burbuja', quien='vecina', cara='happy', texto='Yes!', dur=1.2)
add(84.8, 'camara', pos=[0, 10.6, 62], look=[0, 10.6, -3.5], fov=23.5, dur=3.8, cerca=3.6, empuje=0.04, deriva=0)
ROOF = [('vecina', -0.4, -0.7, 10), ('pareja-b', -1.2, -1.2, 25), ('pareja-a', -1.9, -0.6, 25), ('portero', 0.4, -1.3, -15), ('abuela', -2.6, -1.3, 20),
        ('abuelo', -3.3, -0.7, 30), ('estudiante', 1.2, -0.7, -10), ('chico', 2.0, -1.3, -20), ('nina', -1.0, -0.2, 5), ('madre', -4.0, -1.4, 20),
        ('teletrabajo', 2.8, -0.8, -25), ('familia-bebe', 3.6, -1.4, -30), ('viajera', -4.6, -0.7, 35), ('plantera', 4.3, -0.7, -30), ('artista', 1.0, -1.7, -5), ('panadera', -2.9, -0.2, 15)]
TR = 88.6
for who, x, z, g in ROOF:
    pose = {'nina': 'wave', 'chico': 'drum'}.get(who, 'stand')
    add(TR, 'colocar', quien=who, pos=[x, 18.85, z], giro=g, pose=pose, hold={'R': 'sticks', 'L': 'sticks'} if who == 'chico' else {})
add(TR, 'vida', quien='chico', pose='drum', periodo=0.6, hold={'R': 'sticks', 'L': 'sticks'})
add(TR, 'camara', pos=[0.0, 22.6, 8.5], look=[0.0, 19.9, -1.0], fov=50, dur=3.0, deriva=3)
add(TR + 0.2, 'chip', texto='ROOF')
add(TR + 0.9, 'burbuja', quien='pareja-b', cara='happy', texto='Welcome!', dur=1.4)
add(TR + 3.0, 'camara', pos=[-1.4, 20.9, 4.6], look=[-1.2, 19.7, -0.9], fov=46, dur=3.4, deriva=-4)
add(TR + 3.3, 'burbuja', quien='abuela', cara='happy', dur=1.2)
add(TR + 4.6, 'burbuja', quien='estudiante', cara='happy', dur=1.2)
add(TR + 6.4, 'camara', pos=[0, 27, 24], look=[0, 19.2, -2.0], fov=48, dur=4.6, empuje=0.08)
add(99.6, 'borrar-sitio', dur=1.4)
CH4 = {'desde': 78.0, 'sitio': building('tarde'), 'reparto': residents(), 'foco': 'vecina', 'pulsos': P4}

# =============================================================== 5. night: windows lit; the professional walks home; the logo
P5, add = beats()
add(101.0, 'camara', pos=[-22, 15, 45], look=[0, 8, 0], fov=44, dur=3.6, empuje=0.05)
add(101.0, 'dibujar-sitio', dur=2.6, quien=['profesional'])
add(101.0, 'caminar', quien='profesional', de=[12, 0, 2.2], a=[-12, 0, 2.2], dur=16.0)
add(103.75, 'chip', texto='NIGHT')
add(104.6, 'recorrido', puntos=[
    {'t': 0, 'pos': [-10, 6, 30], 'look': [0, 7, 0], 'fov': 44},
    {'t': 4.5, 'pos': [-6, 2.4, 14], 'look': [-1, 1.8, 1.5], 'fov': 46},
    {'t': 8.0, 'pos': [-9, 1.9, 9], 'look': [-5, 1.5, 1.5], 'fov': 46}])
add(113.2, 'camara', pos=[-12, 4.5, 34], look=[0, 9, 0], fov=44, dur=4.8, empuje=0.06)
add(117.15, 'subir-al-logo', quien='profesional')
CH5 = {'desde': 101.0, 'sitio': building('noche', cutaway=False, culling=False), 'reparto': {'profesional': {'pos': [12, 0, 1.5], 'rotY': -1.5708, 'emocion': 0}},
       'foco': 'profesional', 'pulsos': P5}

clip = {'name': 'edificio-vivo', 'size': [1080, 1920], 'duration': 118.0, 'ending': True, 'bpm': 112,
        'capitulos': [CH1, CH2, CH3, CH4, CH5]}
json.dump(clip, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'clip.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', sum(len(c['pulsos']) for c in clip['capitulos']), 'pulsos in', len(clip['capitulos']), 'chapters; tour ends', round(T_END, 2))
