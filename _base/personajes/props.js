// GM personajes: objetos para la mano (y el cochecito). Cada objeto es un THREE.Group con userData.holds[agarre] = {p, r, order}
// en el marco de la mano DERECHA (x = palma, -y = dedos, +z = pulgar); la izquierda sale reflejada sola. Usar con rig.attach(obj, 'handR', 'grip-phone').
// Agarres: grip-phone (movil en la palma, dedos rodeando el borde, pulgar sobre la pantalla), grip-handle (puno alrededor de un asa o eje),
// grip-cup (taza cogida por el cuerpo), grip-stick (palillo), grip-pinch (pinza pulgar-indice), grip-book (canto del libro).
import { THREE, TONE, inkLine } from '../motor/gm3d.js';
import { M, ell, box, cylm, torus, lathe, D } from './rig.js';
import { scribble } from './cabeza.js';

const P = Math.PI;
const grp = (name) => { const g = new THREE.Group(); g.name = 'parte:objeto'; g.userData.prop = true; g.userData.kind = name; return g; };
const put = (g, o, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
const BAR = [.026, -.058, 0]; // donde cae el eje de un puno cerrado

export function phone(o = {}) {
  // 10/10/2026: a bit bigger (k) and with a LIGHT back + orange lens, so a phone in a dark sleeve still reads as a phone from any side
  const g = grp('phone'), k = 1.3;
  put(g, box(.068 * k, .14 * k, .009 * k, o.tone ?? TONE.light, { edge: 20 }));
  put(g, box(.06 * k, .128 * k, .002, TONE.paper, { edge: 20 }), 0, 0, .0052 * k);
  put(g, box(.05 * k, .05 * k, .0015, TONE.mid, { edge: 20 }), 0, .02 * k, .0066 * k);                       // tarjeta en pantalla
  put(g, box(.05 * k, .012 * k, .0015, TONE.light, { accent: true, edge: 20 }), 0, -.03 * k, .0066 * k);     // boton naranja
  put(g, box(.016 * k, .016 * k, .0015, TONE.light, { accent: true, edge: 20 }), -.018 * k, .052 * k, -.0052 * k);   // the lens on the back
  g.userData.holds = { 'grip-phone': { p: [.0245 * k, -.041 * k, .012 * k], r: [0, P / 2, P / 2] } };
  return g;
}
export function mug(o = {}) {
  const g = grp('mug'), t = o.tone ?? TONE.pale;
  put(g, lathe([[0, -.045], [.034, -.045], [.037, -.04], [.037, .045], [.034, .045]], t, { lines: false, seg: 24 }));
  put(g, cylm(.034, .034, .002, o.drink ?? TONE.dark, { seg: 24 }), 0, .036, 0);
  put(g, torus(.027, .0065, t, { arc: P, line: true, edge: 40 }), .045, 0, 0, 0, 0, -P / 2);
  if (o.band) put(g, cylm(.0375, .0375, .018, o.band, { seg: 24 }), 0, .01, 0);
  g.userData.holds = { 'grip-handle': { p: [.026, .014, 0], r: [P / 2, 0, -P / 2], order: 'ZYX' }, 'grip-cup': { p: [.0535, -.045, 0], r: [P / 2, 0, 0] } };
  return g;
}
export function book(o = {}) {
  const g = grp('book'), t = o.tone ?? TONE.dark;
  put(g, box(.15, .22, .028, TONE.paper, { edge: 20 }), .075, 0, 0);
  put(g, box(.152, .224, .004, t, { edge: 20 }), .075, 0, .014); put(g, box(.152, .224, .004, t, { edge: 20 }), .075, 0, -.014);
  put(g, box(.008, .224, .032, t, { edge: 20 }), 0, 0, 0);
  if (o.accent) put(g, box(.02, .06, .002, TONE.light, { accent: true, edge: 20 }), .13, .07, .0165);
  g.userData.holds = { 'grip-book': { p: [...BAR], r: [P / 2, 0, 0] }, _: { p: [...BAR], r: [P / 2, 0, 0] } };
  return g;
}
export function bag(o = {}) {
  const g = grp('bag'), t = o.tone ?? TONE.mid, w = o.w ?? .3, h = o.h ?? .22, dp = o.d ?? .1;
  put(g, torus(.07, .006, TONE.ink, { arc: P, line: false }), 0, -.07, 0);
  put(g, box(w, h, dp, t, { edge: 20 }), 0, -.07 - h / 2, 0);
  put(g, box(w * 1.02, h * .35, dp * 1.02, o.flap ?? TONE.dark, { edge: 20 }), 0, -.07 - h * .17, 0);
  put(g, ell(.014, .014, .01, TONE.light, { rings: false }), 0, -.07 - h * .38, dp / 2 + .004);
  g.userData.holds = { 'grip-handle': { p: [...BAR], r: [0, -P / 2, 0] }, _: { p: [...BAR], r: [0, -P / 2, 0] } };
  return g;
}
export function keys(o = {}) {
  const g = grp('keys'); put(g, torus(.016, .0025, TONE.light, { line: false }));
  for (let i = 0; i < 3; i++) { const a = (i - 1) * .35; const k = new THREE.Group(); put(k, box(.011, .052, .003, TONE.pale, { edge: 20 }), 0, -.03, 0); put(k, ell(.012, .012, .003, TONE.pale, { rings: false }), 0, -.006, 0); k.rotation.z = a; k.position.y = -.014; g.add(k); }
  if (o.accent) put(g, box(.016, .022, .004, TONE.light, { accent: true, edge: 20 }), 0, -.075, .002);
  g.userData.holds = { 'grip-pinch': { p: [.06, -.1, .04], r: [0, 0, 0] }, _: { p: [.06, -.1, .04], r: [0, 0, 0] } };
  return g;
}
export function letter(o = {}) {
  const g = grp('letter');
  put(g, box(.11, .075, .003, TONE.paper, { edge: 20 }));
  put(g, cylm(.0001, .0001, .0001, TONE.ink, { line: false }));
  const fl = M(new THREE.ConeGeometry(.055, .035, 4), TONE.pale, { line: true, edge: 20 }); put(g, fl, 0, .018, .002, 0, P / 4, P); fl.scale.set(1, 1, .06);
  if (o.accent) put(g, ell(.009, .009, .003, TONE.light, { accent: true, rings: false }), 0, .0, .003);
  g.userData.holds = { 'grip-pinch': { p: [.056, -.1, .04], r: [0, P / 2, 0] }, _: { p: [.056, -.1, .04], r: [0, P / 2, 0] } };
  return g;
}
export function umbrella(o = {}) {
  const g = grp('umbrella'), t = o.tone ?? TONE.dark, L = .9;
  put(g, cylm(.006, .006, L, TONE.ink, { line: false, seg: 8 }), 0, L / 2 - .12, 0);
  put(g, torus(.035, .008, TONE.ink, { arc: P, line: false }), .035, -.12, 0, 0, 0, P);
  put(g, M(new THREE.ConeGeometry(.42, .18, 10, 1, true), t, { line: true, edge: 20, double: true }), 0, L - .22, 0);
  put(g, ell(.012, .02, .012, TONE.light, { accent: true, rings: false }), 0, L - .1, 0);
  g.userData.holds = { 'grip-handle': { p: [...BAR], r: [P / 2, 0, 0] }, _: { p: [...BAR], r: [P / 2, 0, 0] } };
  return g;
}
export function sticks(o = {}) { // un palillo de bateria; coger uno en cada mano
  const g = grp('stick');
  put(g, M(new THREE.CylinderGeometry(.005, .0085, .4, 10), TONE.pale, { line: false }), 0, .11, 0);
  put(g, ell(.0085, .0095, .0085, TONE.pale, { rings: false }), 0, .312, 0);
  g.userData.holds = { 'grip-stick': { p: [...BAR], r: [P * .75, 0, 0] }, _: { p: [...BAR], r: [P * .75, 0, 0] } };
  return g;
}
export function cane(o = {}) { // o.len = distancia de la mano al suelo (la pone elenco.js tras colocar el pie)
  const g = grp('cane'), L = o.len ?? .86, t = o.tone ?? TONE.dark;
  put(g, M(new THREE.CylinderGeometry(.009, .0095, L + .02, 10), t, { line: false }), 0, -L / 2 + .01, 0);
  put(g, torus(.035, .011, t, { arc: P, line: false }), .035, .03, 0, 0, 0, 0);
  put(g, ell(.011, .006, .011, TONE.ink, { rings: false }), 0, -L, 0);
  g.userData.holds = { 'grip-handle': { p: [...BAR], r: [P / 2, 0, 0] }, _: { p: [...BAR], r: [P / 2, 0, 0] } };
  return g;
}
export function lead(o = {}) { // asa de correa; la linea hasta el collar la pone leadLine()
  const g = grp('lead');
  put(g, torus(.034, .004, TONE.ink, { line: false }));
  g.userData.holds = { 'grip-handle': { p: [...BAR], r: [0, 0, 0] }, _: { p: [...BAR], r: [0, 0, 0] } };
  return g;
}
// linea de correa entre dos puntos del mismo espacio (cuelga con una curva suave); devuelve una linea de tinta
export function leadLine(a, b, sag = .12) {
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * P) * sag, a[2] + (b[2] - a[2]) * t]); }
  const l = inkLine(pts); l.name = 'parte:objeto'; return l;
}
// cochecito de bebe: el asa queda en (0, 0.95, 0) y el cuerpo se extiende hacia +z; bebe asomando
export function pram(o = {}) {
  const g = grp('pram'), t = o.tone ?? TONE.mid;
  put(g, cylm(.012, .012, .52, TONE.ink, { seg: 10 }), 0, .95, 0, 0, 0, P / 2);
  for (const sx of [-1, 1]) { put(g, cylm(.01, .01, .55, TONE.ink, { seg: 8 }), sx * .24, .68, .1, -.4, 0, 0); }
  const bowl = ell(.29, .15, .5, t, { line: false }); put(g, bowl, 0, .62, .75);
  put(g, M(new THREE.SphereGeometry(.31, 20, 12, 0, P * 2, 0, P * .42), o.hood ?? TONE.dark, { line: true, edge: 40 }), 0, .66, .53, .55, 0, 0);
  put(g, box(.5, .03, 1.05, TONE.dark, { edge: 20 }), 0, .4, .6);
  for (const [x, z] of [[-.25, .22], [.25, .22], [-.25, 1.0], [.25, 1.0]]) put(g, cylm(.1, .1, .04, TONE.ink, { seg: 18 }), x, .1, z, 0, 0, P / 2);
  for (const sx of [-1, 1]) { put(g, cylm(.01, .01, .8, TONE.ink, { seg: 8 }), sx * .25, .28, .22, 0, 0, 0); put(g, cylm(.01, .01, .85, TONE.ink, { seg: 8 }), sx * .25, .25, .72, P / 2, 0, 0); }
  const baby = new THREE.Group(); baby.add(ell(.06, .06, .06, .92, { rings: false })); baby.add(scribble(.06, 0, 77)); put(g, baby, 0, .72, .93);
  put(g, ell(.07, .035, .09, TONE.light, { rings: false }), 0, .69, 1.02);
  return g;
}
// ---- ampliacion 09/10 ----
// regadera: cuerpo de lata + asa trasera + pitorro largo con alcachofa. Origen en el asa; el pitorro sale hacia +x.. (se orienta con holds)
export function wateringCan(o = {}) {
  const g = grp('wateringCan'), t = o.tone ?? .62;
  put(g, cylm(.07, .07, .13, t, { seg: 22 }), .02, -.03, 0);
  put(g, cylm(.066, .066, .004, TONE.dark, { seg: 22 }), .02, .036, 0);
  put(g, torus(.06, .008, TONE.dark, { arc: P * 1.1, line: false }), -.05, .0, 0, 0, 0, -P * .05 - 0.4);
  put(g, M(new THREE.CylinderGeometry(.012, .02, .24, 12), t, { line: true, edge: 30 }), .17, .01, 0, 0, 0, -P / 2 + .55 - .0).position.set(.19, .0, 0);
  const ro = put(g, M(new THREE.CylinderGeometry(.04, .012, .05, 14), TONE.dark, { line: true, edge: 30 }), .3, .08, 0); ro.rotation.z = -P / 2 + .55 - .0; ro.position.set(.305, .075, 0);
  const inner = new THREE.Group(); g.children.slice().forEach((c) => inner.add(c)); inner.scale.setScalar(1.45); g.add(inner);
  g.userData.holds = { 'grip-handle': { p: [...BAR], r: [P / 2, 0, 0] }, _: { p: [...BAR], r: [P / 2, 0, 0] } };
  return g;
}
// pincel largo (para pintar en caballete); se coge como un palillo
export function brush(o = {}) {
  const g = grp('brush');
  put(g, M(new THREE.CylinderGeometry(.005, .007, .26, 10), TONE.dark, { line: false }), 0, .06, 0);
  put(g, M(new THREE.CylinderGeometry(.008, .008, .05, 10), TONE.pale, { line: false }), 0, .205, 0);
  put(g, M(new THREE.ConeGeometry(.01, .045, 8), o.paint ?? TONE.light, { line: false, accent: !!o.accent }), 0, .25, 0);
  g.userData.holds = { 'grip-stick': { p: [...BAR], r: [P * .75, 0, 0] }, _: { p: [...BAR], r: [P * .75, 0, 0] } };
  return g;
}
// aguja de punto: 0,34 m, gruesa (r ~0,009), tono claro con contorno de tinta y bolita en la punta; una por mano (grip-stick)
export function needle(o = {}) {
  const g = grp('needle'), t = o.tone ?? TONE.paper;
  put(g, M(new THREE.CylinderGeometry(.0085, .0105, .34, 12), t, { line: true, edge: 30 }), 0, .11, 0);
  put(g, ell(.0135, .0135, .0135, t, { hull: true, rings: false }), 0, .285, 0);
  put(g, ell(.012, .012, .012, t, { hull: true, rings: false }), 0, -.06, 0);
  g.userData.holds = { 'grip-stick': { p: [...BAR], r: [P * .75, 0, 0] }, _: { p: [...BAR], r: [P * .75, 0, 0] } };
  return g;
}
// ovillo pequeno (naranja) con hilo: la pose knit lo cuelga delante de las agujas. k = altura/1.7
export function yarnBall(k = 1) {
  const g = grp('yarn'); g.name = 'parte:objeto'; g.userData.prop = true;
  put(g, ell(.065 * k, .065 * k, .065 * k, TONE.light, { accent: true, hull: true, rings: true }), 0, 0, 0);
  for (let i = 0; i < 3; i++) strokes3(g, k, i);
  return g;
}
function strokes3(g, k, i) { const pts = []; for (let n = 0; n <= 16; n++) { const a = n / 16 * Math.PI * 2; pts.push([Math.cos(a) * .067 * k, Math.sin(a) * .067 * k * Math.cos(i * .8), Math.sin(a) * .067 * k * Math.sin(i * .8) + .0]); } const l = inkLine(pts); g.add(l); }
// caballete con lienzo (mira hacia +z, el lienzo en la cara +z); suelo y = 0. Para escenas y hojas.
export function easel(o = {}) {
  const g = new THREE.Group(); g.name = 'parte:objeto'; g.userData.kind = 'easel'; g.userData.noGround = true;
  for (const [x, z, rz, rx] of [[-.32, -.18, .12, -.16], [.32, -.18, -.12, -.16], [0, -.48, 0, .16]]) put(g, cylm(.014, .014, 1.7, TONE.dark, { seg: 8 }), x, .85, z, rx, 0, rz);
  put(g, box(.62, .46, .02, TONE.paper, { edge: 20 }), 0, 1.22, .02);
  put(g, box(.66, .5, .014, TONE.pale, { edge: 20 }), 0, 1.22, .008);
  put(g, box(.5, .03, .06, TONE.dark, { edge: 20 }), 0, .92, .05);
  put(g, ell(.07, .05, .004, TONE.light, { accent: true, rings: false }), -.12, 1.28, .036);
  put(g, ell(.05, .07, .004, TONE.mid, { rings: false }), .1, 1.18, .036);
  return g;
}
// mesa sencilla: tablero de w x d a altura h (centrada en x,z = 0), 4 patas
export function table(o = {}) {
  const g = new THREE.Group(); g.name = 'parte:objeto'; g.userData.kind = 'table'; g.userData.noGround = true; const w = o.w ?? 1.1, d = o.d ?? .6, h = o.h ?? .86;
  put(g, box(w, .04, d, o.tone ?? TONE.pale, { edge: 20 }), 0, h - .02, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(g, box(.05, h - .04, .05, TONE.mid, { edge: 20 }), sx * (w / 2 - .05), (h - .04) / 2, sz * (d / 2 - .05));
  return g;
}
// bebe en brazos (bulto envuelto con cabecita de garabato): se coloca con la pose rock. k = altura/1.7
export function babyBundle(k = 1) {
  const g = grp('baby'); g.name = 'parte:objeto';
  const body = new THREE.Group(); body.rotation.z = .3; g.add(body);
  put(body, ell(.27 * k, .1 * k, .11 * k, .84, { hull: true, rings: true }), -.02 * k, 0, 0);
  put(body, box(.2 * k, .035 * k, .12 * k, TONE.pale, { edge: 20 }), -.06 * k, .03 * k, .005 * k).rotation.z = .15;
  const hd = new THREE.Group(); hd.add(ell(.1 * k, .1 * k, .1 * k, TONE.paper, { hull: true, rings: false })); hd.add(scribble(.1 * k, 1, 91));
  put(body, hd, .27 * k, .17 * k, 0);
  return g;
}
export const PROPS = { phone, mug, cup: mug, book, bag, keys, letter, umbrella, sticks, cane, lead, wateringCan, brush, needle };
export const PROP_NAMES = ['phone', 'mug', 'book', 'bag', 'keys', 'letter', 'umbrella', 'sticks', 'cane', 'lead', 'wateringCan', 'brush', 'needle'];
