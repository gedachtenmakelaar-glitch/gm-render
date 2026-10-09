// GM personajes: hojas de personaje. build(scene, opts) -> { cameras }. Se renderiza con motor/still.py (ver personajes/jobs/*.json).
//   opts.layout = 'personaje' (por defecto; opts.id = un id del elenco) | 'elenco' (todos en fila a la misma escala) | 'mascotas' | 'prueba' (cuatro personas, rapido)
//   opts.bg = 'luz' (fondo claro, por defecto) | 'oscuro' (para comprobar el contraste con fondos oscuros)
// Hoja de personaje (10 x 6,67 m = 3600 x 2400 px a 360 px/m): fila 1 giro en 5 vistas; fila 2 ocho poses clave (una con el movil bien cogido);
// fila 3 escala de emocion (garabato 0 a 5 y resuelto) + objetos en mano + primer plano del rasgo.
import { THREE, TONE, plane, tag, inkLine, flat } from '../motor/gm3d.js';
import { person, pet, CAST_IDS, duo, leadLine, POSE_NAMES, easel, table } from './elenco.js';
import { pram } from './props.js';
import { box } from './rig.js';
import { petAnchor } from './mascotas.js';

const W = 10, ROW = 20 / 9, FLOOR = [4.44 + .26, 2.22 + .26, .26];
const BASE = ['walk-0', 'sit-chair', 'phone-look', 'point', 'arms-crossed', 'hands-on-head', 'laugh', 'sad'];
const SWAP = {
  chico: { 3: ['drum', { hold: { R: 'sticks', L: 'sticks' } }], 4: ['knock'] }, vecina: { 3: ['wave'], 4: ['phone-call', { hold: { R: 'phone' } }] },
  portero: { 3: ['knock'], 4: ['carry-box'] }, nina: { 0: ['run'], 3: ['wave'], 4: ['crouch'] }, abuelo: { 0: ['walk-0', { hold: { R: 'cane' } }], 3: ['lean-wall'], 4: ['sit-sofa'] },
  abuela: { 3: ['drink', { hold: { R: 'mug' } }], 4: ['read', { hold: { R: 'book' } }] }, 'pareja-a': { 3: ['wave'], 4: ['umbrella', { hold: { R: 'umbrella' } }] },
  'pareja-b': { 3: ['point'], 4: ['drink', { hold: { R: 'mug' } }] }, estudiante: { 3: ['read', { hold: { R: 'book' } }], 4: ['sit-floor'] },
  teletrabajo: { 3: ['drink', { hold: { R: 'mug' } }], 4: ['shrug'] }, 'familia-bebe': { 0: ['push-pram'], 3: ['wave'], 4: ['kneel'] },
  recepcionista: { 1: ['phone-call', { hold: { R: 'phone' } }], 3: ['talk'], 4: ['point'] }, profesional: { 3: ['talk'], 4: ['read', { hold: { R: 'book' } }] },
};
const PROPS3 = { _: ['phone', 'mug', 'keys'], chico: ['sticks', 'phone', 'bag'], abuelo: ['cane', 'letter', 'mug'], abuela: ['bag', 'book', 'mug'], nina: ['umbrella', 'letter', 'book'], 'familia-bebe': ['phone', 'bag', 'mug'], portero: ['keys', 'mug', 'letter'], estudiante: ['book', 'phone', 'mug'] };

const heightOf = (g) => { g.updateMatrixWorld(true); return new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()).y; };
function place(root, g, x, floor, s = 1, ry = 0) { g.scale.setScalar(s); g.rotation.y = ry; g.position.set(x, floor, 0); root.add(g); return g; }
function disc(root, x, y, r = .34) { const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .004, 28), flat(.84)); d.position.set(x, y + .002, -.05); root.add(d); }
function chair(root, g, x, floor, s, kind = 'chair') {
  const sy = g.userData.seatY * s; const W2 = kind === 'sofa' ? .9 : .46, t = 0.5;
  const seat = box(W2, .05, .46, t); seat.position.set(x, floor + sy - .025, .03 * s); root.add(seat);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = box(.04, sy - .05, .04, .3); l.position.set(x + dx * (W2 / 2 - .04), floor + (sy - .05) / 2, dz * .18 + .03 * s); root.add(l); }
  const back = box(W2, .4, .04, t); back.position.set(x, floor + sy + .2, -.21 * s); root.add(back);
}
function props(root, g, x, floor, s, pose) {
  if (pose === 'sit-chair') chair(root, g, x, floor, s); else if (pose === 'sit-sofa') chair(root, g, x, floor, s, 'sofa');
  if (pose === 'lean-wall') { const wl = box(.12, 2.0, 1.2, TONE.light); wl.position.set(x + .46 * s, floor + 1, 0); root.add(wl); }
  if (pose === 'lie') { const m = box(.7, .04, 1.9, TONE.mid); m.position.set(x, floor - .02, 0); root.add(m); }
  if (pose.startsWith('stairs')) for (const i of [0, 1]) { const st = box(.9, .18 * (i + 1), .3, TONE.mid); st.position.set(x, floor + .09 * (i + 1), .32 * s + i * .3); root.add(st); }
}
function bust(g, arms = true, squash = false) { const rig = g.userData.rig; for (const c of [...rig.body.children]) if (c !== rig.J.spine) rig.body.remove(c); if (!arms) for (const S of ['R', 'L']) rig.J['sh' + S].visible = false;
  if (squash) { rig.J.spine.children.forEach((o) => { if (o.userData.back) o.visible = false; }); rig.J.spine.scale.y = .5; rig.J.neck.scale.y = 2; rig.J.spine.updateMatrixWorld(true); } return g; }
function frame(root, y0, y1) { for (const y of [y0, y1]) root.add(inkLine([[.1, y, -.4], [W - .1, y, -.4]])); }

function backdrop(root, mood, cx, cy, w, h) { if (mood !== 'oscuro') return; const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), flat(.18)); p.position.set(cx, cy, -2); root.add(p); }

function hojaPersonaje(root, id) {
  const top = 3 * ROW; backdrop(root, root.userData.bg, W / 2, top / 2, W, top);
  const g0 = person(id, 'stand'); const s = Math.min(1, 1.78 / heightOf(g0)); const hh = heightOf(g0);
  // fila 1: giro
  [0, 45, 90, 135, 180].forEach((a, i) => { const x = 1 + 2 * i; disc(root, x, FLOOR[0], .4 * s); place(root, person(id, 'stand'), x, FLOOR[0], s, a * Math.PI / 180); });
  // fila 2: ocho poses
  const sw = SWAP[id] || {};
  BASE.forEach((p0, i) => {
    let [pose, o] = sw[i] || [p0, {}]; o = { ...o }; if (i === 2) o.hold = { R: 'phone' };
    const x = .625 + 1.25 * i + (pose === 'push-pram' ? .5 : 0), g = person(id, pose, { phase: pose.startsWith('walk') ? 0 : .3, ...o }); disc(root, x, FLOOR[1], .38 * s);
    place(root, g, x, FLOOR[1], s * (pose === 'run' ? 1 : 1), -.35); props(root, g, x, FLOOR[1], s, pose);
  });
  // fila 3: emocion 0..5 + resuelto (medios cuerpos), objetos en mano (3) y primer plano del rasgo
  const wy = person(id, 'stand').userData.rig.anchor('waist').y; let x = .62; const bs = 1.75;
  for (let e = 0; e < 7; e++) { const g = bust(person(id, 'stand', { emotion: Math.min(e, 5), resolved: e === 6, variant: e }), false, true); place(root, g, x, FLOOR[2] - (wy + .02) * bs + .55, bs); x += .8; }
  const ps = PROPS3[id] || PROPS3._; x = 6.25;
  ps.forEach((pn) => { const g = bust(person(id, 'stand', { hold: { R: pn }, emotion: 2 }), true); place(root, g, x + .05, FLOOR[2] - (wy - .02) * 1.0 + .9, 1.0); x += .85; });
  const gt = bust(person(id, 'stand', { emotion: 3 }), false, true); place(root, gt, 9.0, FLOOR[2] - (wy + .02) * 2.4 + .5, 2.4, -.3);
  
  frame(root, ROW, 2 * ROW);
  return { cameras: { hoja: { pos: [W / 2, top / 2, 40], look: [W / 2, top / 2, 0], ortho: top / 2 } } };
}

function hojaElenco(root) {
  const order = ['nina', 'abuela', 'abuelo', 'chico', 'estudiante', 'recepcionista', 'vecina', 'familia-bebe', 'teletrabajo', 'profesional', 'portero', 'pareja-b', 'pareja-a'];
  const WW = 16.4, H = 2.9; backdrop(root, root.userData.bg, WW / 2, H / 2, WW + 2, H);
  let x = 1.0; const fl = .28;
  order.forEach((id, i) => {
    const o = id === 'abuelo' ? { hold: { R: 'cane' } } : id === 'nina' ? {} : {};
    const g = person(id, 'stand', { emotion: 2, ...o }); disc(root, x, fl, .36); place(root, g, x, fl, 1, 0);
    if (id === 'abuelo') { const d = pet('perro', 'sit'); d.position.set(x + .62, fl, .15); d.rotation.y = -.5; root.add(d); }
    if (id === 'familia-bebe') { const pr = pram(); pr.scale.setScalar(.85); pr.rotation.y = -Math.PI / 2; pr.position.set(x + .5, fl, 0); root.add(pr); x += .75; }
    if (id === 'abuela') { const c = pet('gato', 'sit'); c.position.set(x + .5, fl, .2); c.rotation.y = -.3; root.add(c); x += .35; }
    x += id === 'pareja-b' ? .75 : id === 'abuelo' ? 1.55 : id === 'familia-bebe' ? 1.1 : 1.08;
  });
  root.add(inkLine([[.2, fl, -.4], [WW - .2, fl, -.4]]));
  return { cameras: { elenco: { pos: [WW / 2 + .2, H / 2, 40], look: [WW / 2 + .2, H / 2, 0], ortho: H / 2 } } };
}

function hojaMascotas(root) {
  const top = 3 * ROW; backdrop(root, root.userData.bg, W / 2, top / 2, W, top);
  const dogs = ['sit', 'walk', 'run', 'lie', 'beg', 'play', 'sniff', 'scratch'], cats = ['sit', 'stand', 'walk', 'lie', 'stretch', 'perch'];
  dogs.forEach((p, i) => { const g = pet('perro', p, { phase: p === 'run' ? .15 : .1, h: 1.9 }); const x = .8 + 1.2 * i; disc(root, x, FLOOR[0], .45); g.position.set(x, FLOOR[0], 0); g.rotation.y = -.7; root.add(g); });
  cats.forEach((p, i) => { const g = pet('gato', p, { phase: .1, h: 2.0 }); const x = .9 + 1.6 * i; disc(root, x, FLOOR[1], .45); let y = FLOOR[1];
    if (p === 'perch') { const b = box(.7, .75, .5, TONE.mid); b.position.set(x, y + .375, 0); root.add(b); y += .75; } g.position.set(x, y, 0); g.rotation.y = -.7; root.add(g); });
  const ab = person('abuelo', 'walk', { phase: .25, hold: { L: 'lead' } }), pr = pet('perro', 'walk', { phase: .6, h: 1.5 });
  place(root, ab, 2.0, FLOOR[2], 1.0, -.9); pr.position.set(3.9, FLOOR[2], .1); pr.rotation.y = -1.4; root.add(pr); root.updateMatrixWorld(true);
  const hp = ab.userData.rig.anchor('handL'); const a = ab.localToWorld(hp.clone()), cb = pr.localToWorld(petAnchor(pr).clone()); root.add(leadLine([a.x, a.y, a.z], [cb.x, cb.y, cb.z], .16));
  const ab2 = person('abuela', 'sit-chair'); place(root, ab2, 6.2, FLOOR[2], 1, -.5); chair(root, ab2, 6.2, FLOOR[2], 1);
  const cat = pet('gato', 'sit', { h: 1.4 }); cat.position.set(7.35, FLOOR[2], .2); cat.rotation.y = -.5; root.add(cat);
  const hb = pet('perro', 'play', { h: 1.6 }); const kid = person('nina', 'crouch'); place(root, kid, 8.3, FLOOR[2], 1, .9); hb.position.set(9.3, FLOOR[2], .1); hb.rotation.y = -1.2; root.add(hb);
  frame(root, ROW, 2 * ROW);
  return { cameras: { hoja: { pos: [W / 2, top / 2, 40], look: [W / 2, top / 2, 0], ortho: top / 2 } } };
}

function hojaPrueba(root, o) {
  const ids = o.ids || ['chico', 'vecina', 'portero', 'nina']; const pose = o.pose || 'stand';
  backdrop(root, root.userData.bg, ids.length * .9, 1.3, ids.length * 1.8, 2.6);
  ids.forEach((id, i) => { const g = person(id, pose, { hold: o.hold, emotion: 2, phase: o.phase ?? .3 }); place(root, g, .9 + 1.8 * i / 1, .1, 1, o.ry ?? -.35); });
  return { cameras: { prueba: { pos: [ids.length * .9, 1.0, 40], look: [ids.length * .9, 1.0, 0], ortho: 1.3 } } };
}

// Comprobacion de faldas sentadas (opts.layout 'falda'): 4 columnas (vecina, abuela, nina, recepcionista) x filas de vista (frente, perfil, 3/4) en sit-chair
// + ultima fila: vecina en sit-sofa 3/4, vecina de pie 3/4, vecina sit-floor 3/4, recepcionista de pie 3/4 (prueba de que de pie no cambia). opts.ids cambia las columnas.
function hojaFalda(root, o) {
  const ids = o.ids || ['vecina', 'abuela', 'nina', 'recepcionista']; const CW = 1.9, RH = 1.75, rows = 4, W2 = CW * ids.length;
  backdrop(root, root.userData.bg, W2 / 2, RH * rows / 2, W2, RH * rows);
  const cell = (c, r, id, pose, ry, kind) => { const fl = (rows - 1 - r) * RH + .1, x = CW * (c + .5), sub = new THREE.Group(); sub.position.set(x, fl, 0); sub.rotation.y = ry; root.add(sub);
    const g = person(id, pose, { emotion: 2 }); sub.add(g); disc(sub, 0, 0, .5);
    if (pose === 'sit-chair') chair(sub, g, 0, 0, 1); else if (pose === 'sit-sofa') chair(sub, g, 0, 0, 1, 'sofa'); };
  [0, Math.PI / 2, -.6].forEach((ry, r) => ids.forEach((id, c) => cell(c, r, id, 'sit-chair', ry)));
  cell(0, 3, 'vecina', 'sit-sofa', -.6); cell(1, 3, 'vecina', 'stand', -.6); cell(2, 3, 'vecina', 'sit-floor', -.6); cell(3, 3, 'recepcionista', 'stand', -.6);
  return { cameras: { falda: { pos: [W2 / 2, RH * rows / 2, 40], look: [W2 / 2, RH * rows / 2, 0], ortho: RH * rows / 2 } } };
}


// Hoja de lo nuevo (09/10): fila 1 los cinco personajes nuevos (de frente y de tres cuartos); filas 2 y 3 las poses de bucle en phase 0 y 0.5
// (knit sentado, knit de pie, knead, paint, rock, water, type). opts.ids cambia los personajes de la fila 1.
function hojaNuevos(root, o) {
  const ids = o.ids || ['panadera', 'madre', 'viajera', 'plantera', 'artista'], CW = 1.5, RH = 2.15, cols = 10, WW = CW * cols, HH = RH * 3; backdrop(root, root.userData.bg, WW / 2, HH / 2, WW, HH);
  const cell = (c, r, id, pose, ry, opts = {}, set = null) => { const fl = (2 - r) * RH + .12, x = CW * (c + .5), sub = new THREE.Group(); sub.position.set(x, fl, 0); sub.rotation.y = ry; root.add(sub);
    const g = person(id, pose, { emotion: 2, ...opts }); sub.add(g); disc(sub, 0, 0, .5); if (set) set(sub, g); return g; };
  ids.forEach((id, i) => { cell(i * 2, 0, id, 'stand', 0); cell(i * 2 + 1, 0, id, 'stand', -.6); });
  const seat = (sub, g) => chair(sub, g, 0, 0, 1);
  const withTable = (z, h) => (sub) => { const t = table({ h, w: 1.0, d: .6 }); t.position.set(0, 0, z); sub.add(t); };
  const withEasel = (sub) => { const e = easel(); e.position.set(0, 0, .72); sub.add(e); };
  const withDesk = (sub, g) => { chair(sub, g, 0, 0, 1); const t = table({ h: .72, w: 1.0, d: .55 }); t.position.set(0, 0, .5); sub.add(t); const kb = box(.34, .015, .12, TONE.dark); kb.position.set(0, .73, .42); sub.add(kb); const sc = box(.3, .2, .012, TONE.mid); sc.position.set(0, .86, .62); sub.add(sc); };
  const withPlant = (sub) => { const pot = new THREE.Mesh(new THREE.CylinderGeometry(.12, .09, .18, 14), flat(.5)); pot.position.set(.0, .09, .78); sub.add(pot);
    for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), flat(.7)); l.position.set(Math.cos(k * 1.05) * .12, .28 + (k % 2) * .08, .78 + Math.sin(k * 1.05) * .12); sub.add(l); } };
  const SPEC = [['knit', 'abuela', {}, seat, { sit: true }], ['knit', 'profesional', {}, null, {}], ['knead', 'panadera', {}, withTable(.62, .84), {}], ['paint', 'artista', {}, withEasel, {}], ['rock', 'madre', {}, null, {}], ['water', 'plantera', {}, withPlant, {}], ['type', 'estudiante', {}, withDesk, {}]];
  [0, .5].forEach((ph, r) => SPEC.forEach(([pose, id, , set, extra], c) => cell(c, r + 1, id, pose, -.5, { phase: ph, ...extra }, set)));
  const lab = ph => ph; void lab;
  return { cameras: { nuevos: { pos: [WW / 2, HH / 2, 40], look: [WW / 2, HH / 2, 0], ortho: HH / 2 } } };
}

// Hoja de comprobacion de knit (de pie y sentado, phase 0 / .25 / .5) y rock, en plano cercano (opts.layout 'knit-rock'). Cada celda mira 3/4.
function hojaKnitRock(root) {
  const CW = 1.6, RH = 2.15, cols = 4, rows = 3, WW = CW * cols, HH = RH * rows; backdrop(root, root.userData.bg, WW / 2, HH / 2, WW, HH);
  const cell = (c, r, id, pose, ph, opts = {}, ry = -.45) => { const fl = (rows - 1 - r) * RH + .05, x = CW * (c + .5), sub = new THREE.Group(); sub.position.set(x, fl, 0); sub.rotation.y = ry; sub.scale.setScalar(1); root.add(sub);
    const g = person(id, pose, { emotion: 2, phase: ph, ...opts }); sub.add(g); if (opts.sit) chair(sub, g, 0, 0, 1); return g; };
  [0, .25, .5].forEach((ph, r) => { cell(0, r, 'vecina', 'knit', ph, { sit: true }); cell(1, r, 'profesional', 'knit', ph); cell(2, r, 'madre', 'rock', ph); });
  cell(3, 0, 'profesional', 'knit', 0, {}, 0); cell(3, 1, 'vecina', 'knit', 0, { sit: true }, 0); cell(3, 2, 'madre', 'rock', .25, {}, 0);
  return { cameras: { knitrock: { pos: [WW / 2, HH / 2, 40], look: [WW / 2, HH / 2, 0], ortho: HH / 2 } } };
}

function hojaPoses(root, id, part = 0) {
  const names = POSE_NAMES.filter((n) => !['hug', 'give-object', 'hold-hands', 'talk'].includes(n)), per = 21, list = names.slice(part * per, part * per + per);
  const HO = { 'phone-look': 'phone', 'phone-call': 'phone', read: 'book', drink: 'mug', drum: 'sticks', umbrella: 'umbrella' }; const top = 3 * ROW;
  list.forEach((p, i) => { const c = i % 7, r = Math.floor(i / 7), x = .75 + 1.42 * c, fl = FLOOR[r]; const o = { phase: .3 }; if (HO[p]) o.hold = HO[p] === 'sticks' ? { R: 'sticks', L: 'sticks' } : { R: HO[p] };
    const g = person(id, p, o); disc(root, x, fl, .36); place(root, g, x, fl, .96, -.3); props(root, g, x, fl, .96, p); });
  return { cameras: { hoja: { pos: [W / 2, top / 2, 40], look: [W / 2, top / 2, 0], ortho: top / 2 } } };
}
function hojaDuos(root) {
  const top = 3 * ROW, P = [['pareja-a', 'pareja-b', 'hug'], ['abuela', 'nina', 'hug'], ['portero', 'chico', 'give-object'], ['vecina', 'nina', 'hold-hands'], ['pareja-a', 'pareja-b', 'hold-hands'], ['profesional', 'estudiante', 'talk']];
  P.forEach(([a, b, p], i) => { const c = i % 3, r = Math.floor(i / 3), x = 1.7 + 3.3 * c, fl = r ? FLOOR[2] + .3 : FLOOR[1] + .2 ; const g = duo(a, b, p, p === 'give-object' ? { A: { hold: { R: 'letter' } } } : {}); g.position.set(x, r ? FLOOR[1] - .8 : FLOOR[0] - .6, 0); g.rotation.y = -.5; root.add(g); void fl; });
  return { cameras: { hoja: { pos: [W / 2, top / 2, 40], look: [W / 2, top / 2, 0], ortho: top / 2 } } };
}

export function build(scene, opts = {}) {
  const root = tag(new THREE.Group(), 'hoja'); root.userData.bg = opts.bg; scene.add(root);
  const L = opts.layout || 'personaje';
  if (L === 'elenco') return hojaElenco(root);
  if (L === 'mascotas') return hojaMascotas(root);
  if (L === 'prueba') return hojaPrueba(root, opts);
  if (L === 'falda') return hojaFalda(root, opts);
  if (L === 'nuevos') return hojaNuevos(root, opts);
  if (L === 'knit-rock') return hojaKnitRock(root);
  if (L === 'poses') return hojaPoses(root, opts.id || 'chico', opts.part || 0);
  if (L === 'duos') return hojaDuos(root);
  return hojaPersonaje(root, opts.id || 'chico');
}
