# Pieza A v2 «La llave de la terraza»: the new couple climbs the building; on every floor the pen draws a 2D doodle of the
# neighbour they notice; at the roof door the doodles prove they already belong; then the doodles fly back as invitations.
# python hacer_clip.py  ->  clip.json  (routes from edificio/rutas.js, copied here as numbers)
import json, math, os

Y = lambda s: 0.25 + 3.1 * s
H_FRAME = 13.0                      # metres seen top to bottom in the climb
CZ = 30.0                           # climb camera z (outside the open front)
FOV = 2 * math.degrees(math.atan(H_FRAME / 2 / (CZ + 3)))

def fix_uturns(r):
    """the stair route steps back at each half-landing and comes forward again: make it a small loop instead"""
    out = [r[0]]
    for i in range(1, len(r) - 1):
        a, b, c = out[-1], r[i], r[i + 1]
        if abs(a[0] - c[0]) < 0.01 and abs(a[2] - c[2]) < 0.01 and abs(b[1] - a[1]) < 0.01:
            d = 1 if a[0] > out[-2][0] else -1
            out.append([a[0] + 0.35 * d, a[1], a[2] - 0.45])
        else: out.append(b)
    out.append(r[-1]); return out

def lens(r): return [math.dist(r[i], r[i + 1]) for i in range(len(r) - 1)]
def at(r, k):
    L = lens(r); s = k * sum(L)
    for i, l in enumerate(L):
        if s <= l or i == len(L) - 1: u = min(1, s / l); return [r[i][j] + (r[i + 1][j] - r[i][j]) * u for j in range(3)]
        s -= l
def reach(r, t0, dur, y):   # first time the route gets to height y
    for i in range(0, 1001):
        k = i / 1000
        if at(r, k)[1] >= y - 0.02: return t0 + k * dur
    return t0 + dur

R1 = fix_uturns([[3, 0.25, -0.7], [1.4, 0.25, -1.1], [0.8, 0.49, -1.1], [-1.6, 3.35, -1.1], [-1.6, 3.35, -2.1], [-1.6, 3.59, -1.1], [0.8, 6.45, -1.1], [0.8, 6.45, -2.1], [0.5, 6.45, -2.7], [0, 6.45, -4.4], [-2.05, 6.45, -5.85]])
R2 = fix_uturns([[-2.05, 6.45, -5.85], [0, 6.45, -4.4], [0.5, 6.45, -2.7], [0.8, 6.45, -2.1], [0.8, 6.69, -1.1], [-1.6, 9.55, -1.1], [-1.6, 9.55, -2.1], [-1.6, 9.79, -1.1], [0.8, 12.65, -1.1], [0.8, 12.65, -2.1], [0.8, 12.89, -1.1], [-1.6, 15.75, -1.1], [-1.6, 15.75, -2.1], [-1.6, 15.99, -1.1], [0.8, 18.85, -1.1], [1.5, 18.85, -1.1]])
NXS = {'nina': 5.7, 'chico': 5.2, 'teletrabajo': 4.8, 'familia-bebe': 4.9, 'viajera': 4.1, 'plantera': 5.5}   # |x| of each neighbour
LAG = 0.8                            # pareja-a follows pareja-b this far behind

P = []
def add(t, jugada, **k): P.append({'t': round(t, 3), 'jugada': jugada, **k})

# ---------------- life in the homes (loops play only when seen)
VIDA = {'abuela': ('knit-sit', 1.2, None), 'estudiante': ('type', 0.5, None), 'chico': ('drum', 0.6, {'R': 'sticks', 'L': 'sticks'}),
        'teletrabajo': ('type', 0.55, None), 'familia-bebe': ('rock', 1.6, None), 'viajera': ('read', 3.0, None),
        'plantera': ('water', 1.5, {'R': 'wateringCan'}), 'artista': ('paint', 1.2, {'R': 'brush'})}
for who, (pose, per, hold) in VIDA.items():
    add(0, 'vida', quien=who, pose=pose, periodo=per, **({'hold': hold} if hold else {}))

# ---------------- 0 to 6.5: the street. The pen draws it; the couple walks in with their bags; a tram goes by
add(0, 'colocar', quien='pareja-b', pos=[-9.5, 0, 1.3], giro=90, pose='walk', hold={'L': 'bag'})
add(0, 'colocar', quien='pareja-a', pos=[-10.2, 0, 1.9], giro=90, pose='walk', hold={'R': 'bag'})
add(0, 'colocar', quien='portero', pos=[3.7, 0, 0.9], giro=-60, pose='stand', hold={'R': 'keys'})
add(0, 'camara', pos=[-6.5, 3.2, 5.6], look=[-2.0, 0.9, 1.0], fov=58, dur=6.5, empuje=0.08, deriva=6)
add(0, 'dibujar-sitio', dur=2.4, quien=['portero', 'pareja-a', 'pareja-b'])
add(0.6, 'caminar', quien='pareja-b', de=[-9.5, 0, 1.3], a=[2.1, 0, 1.3], dur=5.6, hold={'L': 'bag'}, fin='stand', giro=60)
add(0.6, 'caminar', quien='pareja-a', de=[-10.2, 0, 1.9], a=[1.5, 0, 1.9], dur=5.6, hold={'R': 'bag'}, fin='stand', giro=60)

# ---------------- 6.5 to 10.6: the portal. Welcome, and the rule of the roof (the only card)
add(6.5, 'camara', pos=[2.3, 1.75, 7.2], look=[2.7, 1.45, 1.0], fov=44, dur=4.1, deriva=-3)
add(6.6, 'burbuja', quien='portero', cara='happy', texto='Welcome!', dur=1.4)
add(8.0, 'pose', quien='portero', pose='point', mira=[3.0, 14.0, -2.0], hold={'R': 'keys'}, dur=0.4)
add(8.1, 'tarjeta-en-sala', quien='portero', tarjeta='terraza', donde=[-0.7, 0.55, 0.4], dur=2.4, camara=False)
add(8.3, 'pose', quien='pareja-b', pose='stand', mira=[3.0, 14.0, -2.0], hold={'L': 'bag'}, dur=0.5)

# ---------------- 10.6 to 21: up to their flat (floor 2); floor 1: grandma knitting, grandpa and his dog
T1, D1 = 10.6, 10.4
add(T1, 'caminar', quien='pareja-b', ruta=R1, de=False, dur=D1, hold={'L': 'bag'}, fin='stand', giro=-90)
add(T1 + LAG, 'caminar', quien='pareja-a', ruta=R1[:-1] + [[-1.4, 6.45, -5.3]], de=False, dur=D1, hold={'R': 'bag'}, fin='stand', giro=-120)
add(T1, 'colocar', quien='portero', pos=[3.4, 18.85, -1.3], giro=-90, pose='stand', hold={'R': 'keys'})   # off screen: he takes the lift up

def climb_cams(route, t0, dur, until, sides):
    """camera points following pareja-b up the stairs; sides = [(t_from, t_to, cx)] pans towards a neighbour"""
    pts, t = [], t0
    while t <= until + 1e-6:
        k = min(1, max(0, (t - t0) / dur)); p = at(route, k); cx = 0.0
        for a, b, x in sides:
            w = min(1, max(0, (t - (a - 0.5)) / 0.5)) * min(1, max(0, ((b + 0.4) - t) / 0.5)); cx += x * w
        z = 0.0
        for a, b, x in sides: z = max(z, min(1, max(0, (t - (a - 0.5)) / 0.5)) * min(1, max(0, ((b + 0.4) - t) / 0.5)))
        cy = p[1] + 0.6 - 0.3 * z; h = H_FRAME + (8.0 - H_FRAME) * z
        fov = 2 * math.degrees(math.atan(h / 2 / (CZ + 3)))
        pts.append({'t': round(t - t0, 3), 'pos': [round(cx, 3), round(cy, 3), CZ], 'look': [round(cx, 3), round(cy, 3), -3.0], 'fov': round(fov, 3)})
        t += 0.5
    return pts

HOME = {'abuela': 'p1-abuela', 'abuelo': 'p1-abuelo', 'estudiante': 'p2-estudiante', 'nina': 'p3-nina', 'chico': 'p3-chico',
        'teletrabajo': 'p4-teletrabajo', 'familia-bebe': 'p4-bebe', 'viajera': 'p5-viajera', 'plantera': 'p5-plantera', 'artista': 'atico-artista'}
def climb(route, t0, dur, until, cuts):
    """the stair camera follows the couple; for each doodle it CUTS to the neighbour in their home while the pen draws them,
    then back to the stairs (where the doodle flies to the couple's collection). cuts = [(t, who)]"""
    start = t0
    for tt, who in sorted(cuts):
        if tt - 0.15 - start > 0.3:
            add(start, 'recorrido', puntos=[{**q, 't': round(q['t'] - (start - t0), 3)} for q in climb_cams(route, t0, dur, tt - 0.15, []) if q['t'] >= start - t0 - 1e-6], cerca=3.05)
        add(tt - 0.15, 'camara', nombre=HOME[who] + '-tresCuartos', dur=1.4, deriva=3)
        start = tt + 1.25
    if until - start > 0.3: add(start, 'recorrido', puntos=[{**q, 't': round(q['t'] - (start - t0), 3)} for q in climb_cams(route, t0, dur, until, []) if q['t'] >= start - t0 - 1e-6], cerca=3.05)

f1 = reach(R1, T1, D1, Y(1))
DOO1 = [(f1 - 0.9, 'abuela', 'ovillo', -4.6), (f1 + 0.3, 'abuelo', 'hueso', 3.3)]
add(T1 - 0.2, 'dibujar-vivienda', viviendas=['p1-abuela', 'p1-abuelo'], dur=1.1)
add(T1 + 1.2, 'dibujar-vivienda', viviendas=['p2-pareja', 'p2-estudiante'], dur=1.1, sin=['pareja-a', 'pareja-b'])
for tt, who, ic, cx in DOO1: add(tt, 'garabato', quien=who, icono=ic, dur=0.95)
climb(R1, T1, D1, T1 + D1 + 3.0, [(tt, who) for tt, who, _, _ in DOO1] + [(T1 + D1 + 0.7, 'estudiante')])

# ---------------- 21 to 24: their door. Bags down; the student next door; they look up: the roof?
T2 = T1 + D1 + 0.3
add(T2, 'pose', quien='pareja-b', pose='stand', hold={}, dur=0.4)
add(T2 + 0.2, 'pose', quien='pareja-a', pose='stand', hold={}, dur=0.4)
add(T1 + D1 + 0.7, 'garabato', quien='estudiante', icono='auriculares', dur=0.95)
add(T2 + 1.6, 'pose', quien='pareja-b', pose='point', mira=[0.5, 20.0, -1.5], dur=0.4)
add(T2 + 1.6, 'burbuja', quien='pareja-b', cara='curious', texto='Roof?', dur=1.6)

# ---------------- 24 to 41: up and up. One doodle per neighbour; each floor drawn just above them before they get there
T3, D3 = T2 + 3.2, 16.6
add(T3, 'caminar', quien='pareja-b', ruta=R2, de=False, dur=D3, fin='stand', giro=90)
add(T3 + LAG, 'caminar', quien='pareja-a', ruta=R2 + [[2.2, 18.85, -0.6]], de=False, dur=D3 + 0.6, fin='stand', giro=90)
FLOORS = [(3, 'p3-nina', 'p3-chico', ('nina', 'osito'), ('chico', 'baquetas')),
          (4, 'p4-teletrabajo', 'p4-bebe', ('teletrabajo', 'zapatilla'), ('familia-bebe', 'bebe')),
          (5, 'p5-viajera', 'p5-plantera', ('viajera', 'mapa'), ('plantera', 'regadera'))]
sides, doos, CUTS = [], [], []
add(T2 + 1.5 - 1.4, 'dibujar-vivienda', viviendas=['p3-nina', 'p3-chico', 'p3-vecina'], dur=1.1)   # floor 3 drawn while they stand on 2
for i, (f, hl, hr, (wl, il), (wr, ir)) in enumerate(FLOORS):
    tf = reach(R2, T3, D3, Y(f))
    if f < 5: add(tf - 1.25, 'dibujar-vivienda', viviendas=[FLOORS[i + 1][1], FLOORS[i + 1][2]], dur=1.0)
    else: add(tf - 1.25, 'dibujar-vivienda', viviendas=['atico-artista', 'atico-secadero'], dur=1.0)
    for tt, who, ic, cx in ((tf - 0.2, wl, il, -0.85 * NXS[wl]), (tf + 0.85, wr, ir, 0.85 * NXS[wr])):
        add(tt, 'garabato', quien=who, icono=ic, dur=0.9); CUTS.append((tt, who))
ta = reach(R2, T3, D3, Y(6))
add(ta - 0.6, 'garabato', quien='artista', icono='pincel', dur=0.9); CUTS.append((ta - 0.6, 'artista'))
climb(R2, T3, D3, T3 + D3 - 0.2, CUTS)

# ---------------- 41 to 46: the roof door. "Neighbours only." They open their collection: he sees they know everyone
T4 = T3 + D3
add(T4, 'camara', pos=[2.4, 22.4, 7.0], look=[2.4, 19.6, -1.0], fov=34, dur=5.0, deriva=3)
add(T4 + 0.1, 'burbuja', quien='portero', cara='neutral', texto='Neighbours only.', dur=1.8)
add(T4 + 1.9, 'abanico', centro='portero', dur=2.0)
add(T4 + 1.9, 'pose', quien='pareja-b', pose='point', mira=[3.4, 20.3, -1.3], dur=0.4)
add(T4 + 2.6, 'resolver', quien='portero', dur=0.8)
add(T4 + 3.0, 'burbuja', quien='portero', cara='happy', texto='You know everyone!', dur=1.7)
add(T4 + 4.4, 'pose', quien='portero', pose='stand', hold={}, dur=0.3)
add(T4 + 4.4, 'pose', quien='pareja-b', pose='stand', hold={'R': 'keys'}, dur=0.3)
add(T4 + 4.3, 'camara', de='pareja-b', lado=-30, alza=-6, dist=1.9, dur=1.9)
add(T4 + 4.8, 'burbuja', quien='pareja-b', cara='happy', texto='Come up, everyone!', dur=1.5)

# ---------------- 46.5 to 49.5: the whole building: every doodle flies back to its neighbour (the invitations)
T5 = T4 + 6.3
add(T5, 'camara', pos=[0, 10.6, 62], look=[0, 10.6, -3.5], fov=23.5, dur=3.0, cerca=3.6, empuje=0.03, deriva=0)
add(T5 + 0.1, 'repartir', dur=2.6)

# ---------------- 49.5 to 53.15: everyone on the roof at sunset
T6 = T5 + 3.0
ROOF = [('pareja-b', -0.6, -0.7, 10), ('pareja-a', -1.3, -1.2, 25), ('portero', 0.3, -1.3, -15), ('abuela', -2.3, -0.8, 20), ('abuelo', -3.1, -1.3, 30),
        ('estudiante', 1.2, -0.7, -10), ('chico', 2.0, -1.3, -20), ('vecina', 2.8, -0.8, -25), ('nina', -1.9, -0.3, 5), ('madre', -2.7, -1.6, 20),
        ('teletrabajo', 3.6, -1.4, -30), ('familia-bebe', -3.8, -0.6, 30), ('viajera', 4.3, -0.7, -30), ('plantera', -4.5, -1.4, 35), ('artista', 1.0, -1.7, -5)]
for who, x, z, g in ROOF: add(T6, 'colocar', quien=who, pos=[x, 18.85, z], giro=g, pose='wave' if who in ('nina', 'chico') else 'stand', hold={})
add(T6, 'camara', pos=[-0.6, 21.5, 5.6], look=[-0.6, 19.85, -1.0], fov=48, dur=2.8, deriva=3)
for i, who in enumerate(['pareja-a', 'chico', 'abuela', 'estudiante', 'teletrabajo']): add(T6 + 0.3 + 0.2 * i, 'resolver', quien=who, dur=0.9)
add(T6 + 1.2, 'burbuja', quien='vecina', cara='happy', dur=1.3)
add(53.15, 'subir-al-logo', quien='pareja-b')

homes = ['pb-portero', 'p1-abuela', 'p1-abuelo', 'p2-pareja', 'p2-estudiante', 'p3-nina', 'p3-chico', 'p3-vecina', 'p4-teletrabajo', 'p4-bebe', 'p5-viajera', 'p5-plantera', 'atico-artista', 'atico-secadero']
ids = ['abuela', 'abuelo', 'estudiante', 'chico', 'vecina', 'nina', 'madre', 'teletrabajo', 'familia-bebe', 'viajera', 'plantera', 'artista', 'portero']
clip = {
    'name': 'terraza', 'size': [1080, 1920], 'duration': 54.0, 'ending': True, 'bpm': 112,
    'sitio': {'tipo': 'edificio', 'mood': 'tarde', 'culling': True,
              'ocultar': ['balcon:' + h for h in homes if h.startswith('p')],
              'opts': {'cutaway': True, 'street': True, 'neighbours': True, 'skyline': True, 'residents': True, 'bikeLaneAccent': True}},
    'reparto': {'pareja-a': {'existente': 'pareja', 'emocion': 2}, 'pareja-b': {'existente': 'pareja#2', 'emocion': 2},
                **{i: {'existente': True, 'emocion': 1} for i in ids}},
    'foco': 'pareja-b',
    'coleccion': {'de': ['pareja-a', 'pareja-b']},
    'tarjetas': {'terraza': {'label': 'key', 'num': '01', 'title': 'Rooftop', 'sub': 'neighbours only', 'icon': 'heart'}},
    'pulsos': sorted(P, key=lambda p: p['t']),
}
json.dump(clip, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'clip.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', len(P), 'pulsos; T2', round(T2, 2), 'T3', round(T3, 2), 'T4', round(T4, 2), 'T5', round(T5, 2), 'T6', round(T6, 2))
