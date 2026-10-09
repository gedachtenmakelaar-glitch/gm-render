// GM personajes: ropa y accesorios con volumen (cuellos, punos, dobladillos, faldas que vuelan, zapatos con suela, bolsillos, bufanda...).
// Todas las funciones reciben el rig (rig.js) y cuelgan piezas de sus articulaciones. Todo lleva name 'parte:ropa' (o 'parte:zapatoR/L').
import { THREE, TONE, inkLine } from '../motor/gm3d.js';
import { M, ell, box, cylm, torus, lathe, between, tube, strokes, profR, D } from './rig.js';

const cl = (o, n = 'parte:ropa') => { o.name = n; return o; };
const R = (rig, joint, o, x = 0, y = 0, z = 0) => rig.add(joint, cl(o), x, y, z);

// anillo horizontal alrededor del torso (dobladillo, cinturon, rayas). layer 'chest' (cuelga de la columna) o 'hips'
export function band(rig, layer, y, h, tone, k = 1.03) {
  const pts = layer === 'hips' ? rig.parts.hipsPts : rig.parts.chestPts, r = profR(pts, y) * k, dz = layer === 'hips' ? rig.d.depth * 1.05 : rig.d.depth;
  const m = cylm(r, r, h, tone, { seg: 28 }); m.scale.z = dz; return R(rig, layer === 'hips' ? 'body' : 'spine', m, 0, y, 0);
}
export function collar(rig, kind, tone, o = {}) {
  const H = rig.d.h, nR = (rig.def.neckR ?? .027) * H, y = rig.parts.clen + .006 * H;
  if (kind === 'round') { const t = torus(nR * 1.6, .015 * H, tone, { line: false }); t.rotation.x = Math.PI / 2 - .15; t.scale.set(1, 1, 1); R(rig, 'spine', t, 0, y, 0); }
  else if (kind === 'shirt') for (const sx of [-1, 1]) { const f = box(.05 * H, .035 * H, .007 * H, tone); f.rotation.set(-.25, 0, -sx * .65); R(rig, 'spine', f, sx * .028 * H, y - .012 * H, rig.surf('chest', sx * .028 * H, rig.parts.clen - .012 * H) + .004 * H); }
  else if (kind === 'turtle') R(rig, 'spine', cylm(nR * 1.35, nR * 1.45, .05 * H, tone, { seg: 18 }), 0, y + .012 * H, 0);
  else if (kind === 'high') { R(rig, 'spine', cylm(nR * 2.1, nR * 2.4, .075 * H, tone, { seg: 20 }), 0, y + .018 * H, 0); }
}
export function cuffs(rig, tone, h = .03, k = 1.2) { // puno acampanado: la manga se ensancha hacia la mano
  const H = rig.d.h, r0 = .0185 * H * rig.d.limb; for (const S of ['R', 'L']) R(rig, 'wr' + S, cylm(r0 * 1.08, r0 * k * 1.3, (h + .012) * H, tone, { seg: 16 }), 0, (h + .012) * H * .3, 0);
}
export function buttons(rig, n, y0, y1, tone = TONE.ink, layer = 'chest') {
  const H = rig.d.h; for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * (n === 1 ? .5 : i / (n - 1)) ; const b = ell(.0085 * H, .0085 * H, .005 * H, tone, { rings: false }); R(rig, layer === 'hips' ? 'body' : 'spine', b, 0, y, rig.surf(layer, 0, y) + .002 * H); }
}
export function zip(rig, yTop, yBot, layer = 'chest') {
  const H = rig.d.h, pts = []; for (let i = 0; i <= 6; i++) { const y = yTop + (yBot - yTop) * i / 6; pts.push([0, y, rig.surf(layer, 0, y) * 1.01 + .002 * H]); }
  const l = inkLine(pts); l.name = 'parte:ropa'; (layer === 'hips' ? rig.J.body : rig.J.spine).add(l);
}
export function pocket(rig, layer, x, y, w, h, tone, o = {}) {
  const H = rig.d.h, m = box(w * H, h * H, .009 * H, tone, o); const z = rig.surf(layer, x * H, y * H) + .004 * H; m.rotation.y = -Math.sign(x) * .25; m.rotation.x = o.tilt ?? 0;
  R(rig, layer === 'hips' ? 'body' : 'spine', m, x * H, y * H, z);
}
export function belt(rig, tone, buckle = TONE.light) { const H = rig.d.h; band(rig, 'hips', .06 * H, .02 * H, tone, 1.04); }
// falda / faldon que cuelga de la cintura y vuela. len, rTop, rBot en metros. pleats = nº de pliegues dibujados
// De pie (y andando): el cono de siempre en J.skirt (sin cambios). SENTADA (los dos muslos casi horizontales o mas): el cono se apaga (escala ~0) y entran
// piezas que siguen a las piernas: una nucleo en la cadera, por pierna un tubo sobre el muslo (algo mas ancho) y en la rodilla una bola + un faldon que cae
// en vertical (gravedad) unos centimetros. Todo cuelga de las articulaciones y se conmuta solo con ESCALA (continua), asi repose() y blendPose() lo
// interpolan sin saltos. Nombre 'parte:ropa'; contornos de tinta y casco como el resto.
const E0 = 1e-4, sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function skirt(rig, { len, rTop, rBot, tone, pleats = 0, depth = .95 }) {
  const pts = [[rTop, .01], [(rTop * .45 + rBot * .55), -len * .5], [rBot, -len]];
  const m = lathe(pts, tone, { double: true, lines: false, seg: 32 }); m.scale.z = depth;
  for (let i = 0; i < pleats; i++) { const a = i / pleats * Math.PI * 2; strokes(m, pts.map(([r, y]) => [r * 1.01 * Math.cos(a), y, r * 1.01 * Math.sin(a)])); }
  R(rig, 'skirt', m, 0, 0, 0);
  // ---- version sentada
  const H = rig.d.h, d = rig.d, lr = d.limb, flare = Math.max(0, rBot / rTop - 1), wide = Math.min(1, flare / .8);
  const rt0 = .052 * H * lr, rt1 = .034 * H * lr;                       // radios del muslo (rig.js)
  const Ld = Math.min(d.th, len * 1.04 + .01 * H);                      // hasta donde llega por el muslo
  const hang = len > d.th * .97 ? Math.max(.03 * H, Math.min(.105 * H, (len - d.th) + .075 * H * wide + .02 * H)) : 0; // lo que cuelga bajo la rodilla
  const rk = rt1 * (1.55 + .55 * wide), rtop = rt0 * (1.28 + .18 * wide), rh = rk * (1.1 + .5 * wide);
  const seat = []; // piezas que solo existen sentada
  const mk = (o) => { o.userData.seat = true; seat.push(o); return o; };
  // nucleo en la cadera (cubre la pelvis y une los dos tubos)
  const hp = rig.parts.hipsPts, rc = rTop * 1.02, rc2 = Math.max(rTop * 1.08, d.hip * 1.12);
  const core = mk(lathe([[rc * .98, .012 * H], [rc, -.01 * H], [rc2, -.05 * H], [rc2 * 1.02, -.095 * H], [0, -.095 * H]], tone, { double: true, lines: false, seg: 28 })); core.scale.z = d.depth * 1.12;
  R(rig, 'skirt', core, 0, 0, 0);
  const legs = [];
  for (const [S, sx] of [['R', -1], ['L', 1]]) {
    const tube = mk(M(new THREE.CylinderGeometry(rtop, rk, Ld, 22, 1, true), tone, { line: true, edge: 50, double: true }));
    tube.scale.set(1.12, 1, 1.0); // z local = arriba cuando el muslo esta horizontal
    const nt = pleats ? 4 : 2; for (let k = 0; k < nt; k++) { const a = Math.PI * .05 + (k + .5) / nt * Math.PI * .9 - Math.PI / 2 + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), rm = (rtop + rk) / 2; // pliegues por la cara de arriba
      strokes(tube, [[rtop * ca * 1.01, Ld / 2, rtop * sa * 1.01], [rm * ca * 1.015, 0, rm * sa * 1.015], [rk * ca * 1.01, -Ld / 2, rk * sa * 1.01]]); }
    const g = mk(new THREE.Group()); // en la rodilla: bola + faldon vertical
    if (hang > 0) { const ball = ell(rk * 1.02, rk * .98, rk * 1.02, tone, { hull: true, rings: false }); g.add(ball); }
    if (hang > 0) { const hem = M(new THREE.CylinderGeometry(rk * 1.0, rh, hang, 22, 1, true), tone, { line: true, edge: 50, double: true }); hem.position.y = -hang / 2; g.add(hem);
      const nf = pleats ? 7 : 4; for (let k = 0; k < nf; k++) { const a = k / nf * Math.PI * 2; strokes(hem, [[rk * Math.cos(a) * 1.01, hang / 2, rk * Math.sin(a) * 1.01], [rh * Math.cos(a) * 1.012, -hang / 2, rh * Math.sin(a) * 1.012]]); } }
    else { const cap = ell(rk * 1.0, .012 * H, rk * 1.0, tone, { hull: true, rings: false }); cap.position.y = -Ld / 2; tube.add(cap); } // falda corta: tapa plana en el borde del tubo
    g.name = tube.name = 'parte:ropa';
    tube.position.set(0, -Ld / 2, .008 * H); rig.J['hip' + S].add(tube); g.position.set(0, -Ld, .008 * H); rig.J['hip' + S].add(g);
    legs.push({ S, g, tube });
  }
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3();
  rig.skirtUpdate = (flex) => {
    const J = rig.J; rig.root.updateMatrixWorld(true);
    // cuanto de sentada: el menor angulo de los dos muslos respecto a la vertical (andar y correr dejan un muslo atras: queda 0)
    let ang = 9; for (const S of ['R', 'L']) { _v.set(0, -1, 0).transformDirection(J['hip' + S].matrixWorld); rig.root.getWorldQuaternion(_q); _v.applyQuaternion(_q.invert()); ang = Math.min(ang, Math.acos(Math.max(-1, Math.min(1, -_v.y)))); }
    const s = sstep(35 * D, 58 * D, ang);
    // de pie: el cono de siempre; sentada: apagado
    J.skirt.rotation.x = -flex * .88 * (1 - s); const sy = (1 - Math.min(.3, flex * .15)), sz = 1 + flex * .12;
    J.skirt.scale.set(1, 1 + (sy - 1) * (1 - s), 1 + (sz - 1) * (1 - s)); { const o = Math.max(E0, 1 - s); m.scale.set(o, o, depth * o); }
    const k = Math.max(E0, s); core.scale.set(k, k, d.depth * 1.12 * k);
    for (const l of legs) { l.tube.scale.set(1.12 * k, k, k); l.g.scale.setScalar(k);
      // el faldon cae en vertical (marco del personaje) aunque la rodilla gire
      rig.root.getWorldQuaternion(_q); J['hip' + l.S].getWorldQuaternion(_q2); l.g.quaternion.copy(_q2.invert().multiply(_q)); }
    return s;
  };
  return m;
}
export function shoes(rig, o = {}) {
  const H = rig.d.h, ank = rig.d.ank, kind = o.kind || 'sneaker', tone = o.tone ?? TONE.light, sole = .5, lr = rig.d.limb;
  for (const S of ['R', 'L']) {
    const g = new THREE.Group(); g.name = 'parte:zapato' + S;
    const sh = kind === 'work' ? .026 * H : .016 * H, sw = kind === 'slipper' ? .0 : 1;
    if (kind === 'slipper') {
      const f = ell(.046 * H, .036 * H, .105 * H, tone, { line: false }); f.position.set(0, -.012 * H, .05 * H); g.add(f);
      for (const sx of [-1, 1]) { const e = M(new THREE.ConeGeometry(.012 * H, .075 * H, 6), tone, { line: true, edge: 20 }); e.position.set(sx * .022 * H, .04 * H, .035 * H); e.rotation.x = -.25; g.add(e);
        const i = M(new THREE.ConeGeometry(.006 * H, .05 * H, 6), TONE.mid, { line: false }); i.position.set(sx * .022 * H, .036 * H, .043 * H); i.rotation.x = -.25; g.add(i); }
      const nose = ell(.012 * H, .012 * H, .012 * H, TONE.ink, { rings: false }); nose.position.set(0, -.012 * H, .153 * H); g.add(nose);
    } else {
      const flat = kind === 'flat';
      const up = ell(.034 * H, (flat ? .02 : .03) * H, .092 * H, tone, { line: false }); up.position.set(0, (flat ? -.026 : -.014) * H, .05 * H); g.add(up);
      const so = box(.074 * H, sh, .18 * H, sole, { edge: 20 }); so.position.set(0, -ank + sh / 2, .052 * H); g.add(so);
      if (kind !== 'flat') { const cap = ell(.031 * H, .022 * H, .042 * H, o.cap ?? TONE.pale, { line: false }); cap.position.set(0, -.024 * H, .108 * H); g.add(cap); }
      if (o.accent) { const a = box(.04 * H, .022 * H, .01 * H, TONE.light, { accent: true }); a.position.set(0, -.03 * H, -.04 * H); g.add(a); }
      if (kind === 'boot' || kind === 'work') { const b = cylm(.0345 * H * lr, .038 * H * lr, .105 * H, o.boot ?? tone, { seg: 18 }); b.position.set(0, .028 * H, 0); g.add(b); }
      if (kind === 'wellie') { const b = cylm(.037 * H * lr, .041 * H * lr, .17 * H, o.boot ?? tone, { seg: 18 }); b.position.set(0, .065 * H, 0); g.add(b); }
      if (kind === 'ankleboot') { const b = cylm(.032 * H * lr, .036 * H * lr, .07 * H, o.boot ?? tone, { seg: 18 }); b.position.set(0, .012 * H, 0); g.add(b); }
    }
    rig.J['an' + S].add(g);
  }
}
export function scarf(rig, tone = TONE.light, o = {}) {
  const H = rig.d.h, nR = (rig.def.neckR ?? .027) * H, cy = rig.parts.clen;
  const t = torus(nR * 1.9, .024 * H, tone, { accent: o.accent, line: false }); t.rotation.x = Math.PI / 2 - .2; t.scale.z = 1.2; R(rig, 'spine', t, 0, cy + .004 * H, .004 * H);
  const knot = ell(.028 * H, .03 * H, .022 * H, tone, { accent: o.accent }); R(rig, 'spine', knot, .03 * H, cy - .008 * H, rig.surf('chest', .03 * H, cy - .008 * H) + .01 * H);
  for (const [x, len, rz] of [[.034, .2, .12], [.05, .15, -.1]]) { const tl = box(.04 * H, len * H, .01 * H, tone, { accent: o.accent }); tl.rotation.z = rz; R(rig, 'spine', tl, x * H, cy - (len / 2 + .015) * H, rig.surf('chest', x * H, cy - .06 * H) + .012 * H); }
}
export function shawl(rig, tone, border = TONE.dark) {
  const H = rig.d.h, d = rig.d, cy = rig.parts.clen, nR = (rig.def.neckR ?? .027) * H, shR = d.shW * 1.14;
  const pts = [[nR * 1.9, cy + .008 * H], [shR * .75, cy - .008 * H], [shR * 1.04, cy - .045 * H], [d.chest * 1.3, cy - .12 * H], [d.chest * 1.25, cy - .2 * H]];
  const m = lathe(pts.reverse(), tone, { double: true, lines: false, seg: 30 }); m.scale.z = d.depth * 1.15; R(rig, 'spine', m, 0, 0, -.004 * H);
  const e = cylm(d.chest * 1.25, d.chest * 1.25, .012 * H, border, { seg: 30, open: true }); e.scale.z = d.depth * 1.15; R(rig, 'spine', e, 0, cy - .2 * H, 0);
}
export function backpack(rig, tone, o = {}) { // mochila redondeada con tapa, bolsillo y tirantes por encima del hombro
  const n0 = rig.J.spine.children.length, H = rig.d.h, cy = rig.parts.clen, zb = -(rig.surf('chest', 0, .13 * H) + .055 * H);
  R(rig, 'spine', ell(.098 * H, .125 * H, .06 * H, tone, { hull: true, rings: false }), 0, .1 * H, zb);
  R(rig, 'spine', ell(.09 * H, .05 * H, .064 * H, o.flap ?? TONE.dark, { hull: true, rings: false }), 0, .2 * H, zb + .004 * H);
  R(rig, 'spine', ell(.07 * H, .05 * H, .035 * H, o.pocket ?? TONE.dark, { hull: true, rings: false }), 0, .05 * H, zb - .05 * H);
  if (o.accent) R(rig, 'spine', ell(.012 * H, .018 * H, .008 * H, TONE.light, { accent: true, rings: false }), .035 * H, .17 * H, zb - .058 * H);
  for (const sx of [-1, 1]) { const x = sx * .052 * H;
    const P = [[x, .17 * H, zb + .03 * H], [x * 1.05, cy + .004 * H, -.03 * H], [x * 1.1, cy - .02 * H, .02 * H], [x * 1.03, .1 * H, rig.surf('chest', x, .1 * H) + .006 * H], [x, .02 * H, rig.surf('chest', x, .02 * H) + .006 * H], [x * .9, -.02 * H, -.01 * H]];
    const m = M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P.map((q) => new THREE.Vector3(...q))), 40, .0085 * H, 6, false), TONE.dark, { line: false }); R(rig, 'spine', m); }
  rig.J.spine.children.slice(n0).forEach((o2) => { o2.userData.back = true; });
}
export function braces(rig, tone = TONE.ink) {
  const H = rig.d.h, cy = rig.parts.clen;
  for (const sx of [-1, 1]) { const x = sx * .05 * H, P = [[x, -.02 * H, rig.surf('chest', x, 0) + .005 * H], [x, .1 * H, rig.surf('chest', x, .1 * H) + .005 * H], [x * 1.2, cy - .01 * H, 0.02 * H], [x * 1.25, cy - .02 * H, -.04 * H]];
    for (let i = 0; i < 3; i++) R(rig, 'spine', between(P[i], P[i + 1], .018 * H, .006 * H, tone, { edge: 20 })); }
}
export function lanyard(rig, tone = TONE.dark) {
  const H = rig.d.h, cy = rig.parts.clen, pts = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8, x = (t - .5) * .1 * H, y = cy - .01 * H - Math.sin(t * Math.PI) * .12 * H; pts.push([x * (1 + .2 * Math.sin(t * Math.PI)) , y, rig.surf('chest', x, y) * 1.01 + .003 * H]); }
  const l = inkLine(pts); l.name = 'parte:ropa'; rig.J.spine.add(l);
  R(rig, 'spine', box(.05 * H, .065 * H, .006 * H, TONE.paper, { edge: 20 }), 0, cy - .17 * H, rig.surf('chest', 0, cy - .17 * H) + .006 * H);
}
// bebe en canguro (pecho delantero): bolsa + cabecita de garabato suave + piernas colgando
export function carrier(rig, tone, scribbleFn) {
  const H = rig.d.h, cy = rig.parts.clen, zf = rig.surf('chest', 0, .08 * H);
  R(rig, 'spine', box(.2 * H, .15 * H, .085 * H, tone, { edge: 20 }), 0, .05 * H, zf + .043 * H);
  const head = new THREE.Group(); head.add(ell(.072 * H, .072 * H, .072 * H, .95, { rings: false })); if (scribbleFn) head.add(scribbleFn(.072 * H)); R(rig, 'spine', head, 0, .15 * H, zf + .07 * H);
  for (const sx of [-1, 1]) { const l = ell(.02 * H, .045 * H, .02 * H, TONE.light); l.rotation.z = sx * .45; R(rig, 'spine', l, sx * .06 * H, -.035 * H, zf + .075 * H); const f = ell(.019 * H, .014 * H, .028 * H, TONE.pale); R(rig, 'spine', f, sx * .08 * H, -.07 * H, zf + .085 * H); }
  for (const sx of [-1, 1]) { const x = sx * .06 * H; const P = [[x, .1 * H, zf + .03 * H], [x * 1.1, cy - .005 * H, .02 * H], [x * 1.1, cy - .03 * H, -.05 * H]]; for (let i = 0; i < 2; i++) R(rig, 'spine', between(P[i], P[i + 1], .035 * H, .01 * H, TONE.dark, { edge: 20 })); }
}
// rayas horizontales en un tubo (muslo, espinilla, cuerpo del jersey): n anillos
export function stripes(rig, part, tone, n = 4) {
  const H = rig.d.h; for (const S of ['R', 'L']) { const g = rig.parts[part + S]; if (!g) continue; const cyl = g.children[0]; const gp = cyl.geometry.parameters, len = gp.height;
    for (let i = 0; i < n; i++) { const t = (i + .5) / n, r = (gp.radiusTop + (gp.radiusBottom - gp.radiusTop) * t) * 1.03; const b = cylm(r, r, .012 * H, tone, { seg: 16 }); b.position.set(0, -t * len, 0); g.add(b); } }
}
export function stripesTorso(rig, tone, y0, y1, n = 4, layer = 'chest', k = 1.04) { const H = rig.d.h; for (let i = 0; i < n; i++) band(rig, layer, y0 + (y1 - y0) * i / (n - 1), .016 * H, tone, k); }
// jersey enorme: capa del torso hasta la cadera + mangas anchas que cuelgan sobre las manos
export function jumper(rig, tone, k = 1.38, o = {}) {
  const H = rig.d.h, d = rig.d, cp = rig.parts.chestPts, hemY = -.2 * H;
  const pts = [[0, hemY], [d.hip * 1.38, hemY], [d.waist * k * 1.02, -.06 * H], ...cp.slice(2, 8).map(([r, y]) => [r * (r > d.shW * .8 ? 1.2 : k), y]), [cp[8][0] * 1.4, cp[8][1]], [0, cp[8][1]]];
  const m = lathe(pts, tone, { lines: true, seg: 30, hull: true }); m.scale.z = d.depth * 1.18; R(rig, 'spine', m);
  const hem = cylm(d.hip * 1.38, d.hip * 1.38, .02 * H, o.band ?? TONE.mid, { seg: 30 }); hem.scale.z = d.depth * 1.12; R(rig, 'spine', hem, 0, hemY + .01 * H, 0);
  for (const S of ['R', 'L']) {
    const ua = tube(.03 * H * d.limb * 2.0, .0245 * H * d.limb * 2.1, d.ua * .96, tone); R(rig, 'sh' + S, ua);
    const fa = tube(.0245 * H * d.limb * 2.1, .0185 * H * d.limb * 2.5, d.fa * .98, tone); R(rig, 'el' + S, fa);
    R(rig, 'wr' + S, cylm(  .0185 * H * d.limb * 2.6, .0185 * H * d.limb * 2.7, .05 * H, o.band ?? TONE.mid, { seg: 16 }), 0, .012 * H, 0);
  }
}
export function vest(rig, tone, y0 = -.05) {
  const H = rig.d.h, d = rig.d, cp = rig.parts.chestPts.filter(([r, y]) => y >= y0 * H && r > 0).map(([r, y]) => [r * 1.05, y]);
  const m = lathe([[0, y0 * H], ...cp.filter((p, i) => i < cp.length - 3)], tone, { lines: true }); m.scale.z = d.depth * 1.03; R(rig, 'spine', m); band(rig, 'chest', y0 * H + .005 * H, .014 * H, TONE.dark, 1.07);
}
// rollo de tela en el cuello de los pantalones, vueltas en los tobillos
export function trouserCuffs(rig, tone) { // bajo del pantalon con un pequeno quiebro sobre el zapato
  const H = rig.d.h, lr = rig.d.limb; for (const S of ['R', 'L']) R(rig, 'kn' + S, cylm(.0235 * H * lr, .0335 * H * lr, .06 * H, tone, { seg: 16 }), 0, -rig.d.sh + .035 * H, .004 * H);
}
export function lapels(rig, tone, y0 = .15, y1 = .0) { // solapas en V (y0, y1 en fraccion de H)
  const H = rig.d.h; for (const sx of [-1, 1]) { const len = (y0 - y1) * H + .02 * H, f = box(.035 * H, len, .008 * H, tone, { edge: 20 }); f.rotation.set(0, -sx * .12, sx * .28);
    const y = (y0 + y1) / 2 * H + .01 * H; R(rig, 'spine', f, sx * .033 * H, y, rig.surf('chest', sx * .033 * H, y) + .006 * H); }
}

// ---- ampliacion 09/10: delantal, peto, mochila de viaje, manchas de pintura
// delantal de panadera: peto + falda recta delante, cinta a la cintura y tirantes al cuello. Tono claro (rasgo con el gorro alto).
export function apron(rig, tone, o = {}) {
  const H = rig.d.h, cy = rig.parts.clen, bw = rig.d.chest * 1.45;
  R(rig, 'spine', box(bw, (cy - .03 * H) + .0, .012 * H, tone, { edge: 20 }), 0, (cy - .03 * H) / 2 - .0 + .0, rig.surf('chest', 0, .05 * H) + .012 * H);
  const lowH = .27 * H; R(rig, 'body', box(rig.d.hip * 2.1, lowH, .014 * H, tone, { edge: 20 }), 0, -.02 * H - lowH / 2 + .09 * H, rig.surf('hips', 0, -.02 * H) + .016 * H);
  band(rig, 'chest', -.005 * H, .022 * H, o.tie ?? TONE.mid, 1.07);
  R(rig, 'spine', box(.1 * H, .06 * H, .012 * H, o.pocket ?? .7, { edge: 20 }), 0, -.0 * H - .04 * H, rig.surf('chest', 0, 0) + .026 * H);
  for (const sx of [-1, 1]) R(rig, 'spine', between([sx * bw * .38, cy - .04 * H, rig.surf('chest', sx * bw * .3, .1 * H) + .008 * H], [sx * .04 * H, cy + .004 * H, 0], .018 * H, .006 * H, tone, { edge: 20 }));
}
// peto de jardin: peto con bolsillo + tirantes sobre los hombros (los pantalones son el 'bottom' del personaje)
export function bibOveralls(rig, tone, o = {}) {
  const H = rig.d.h, cy = rig.parts.clen, bw = rig.d.chest * 1.2;
  R(rig, 'spine', box(bw, cy - .03 * H, .014 * H, tone, { edge: 20 }), 0, (cy - .03 * H) / 2 - .0, rig.surf('chest', 0, .05 * H) + .014 * H);
  band(rig, 'hips', .02 * H, .05 * H, tone, 1.045);
  R(rig, 'spine', box(.075 * H, .06 * H, .012 * H, o.pocket ?? TONE.mid, { edge: 20 }), 0, .045 * H, rig.surf('chest', 0, .05 * H) + .03 * H);
  for (const sx of [-1, 1]) {
    const x = sx * bw * .38, P = [[x, cy - .04 * H, rig.surf('chest', x, .1 * H) + .01 * H], [x * 1.2, cy + .002 * H, .01 * H], [x * 1.25, cy - .01 * H, -.05 * H], [x * .9, .06 * H, -rig.surf('chest', x * .9, .06 * H) - .006 * H]];
    for (let i = 0; i < 3; i++) R(rig, 'spine', between(P[i], P[i + 1], .024 * H, .008 * H, tone, { edge: 20 }));
    R(rig, 'spine', ell(.011 * H, .011 * H, .006 * H, TONE.pale, { rings: false }), x, cy - .045 * H, rig.surf('chest', x, .1 * H) + .02 * H);
  }
}
// mochila de viaje GRANDE: cuerpo alto que sobresale por encima del hombro, rollo de dormir encima, bolsillo lateral y cinta al pecho
export function travelPack(rig, tone, o = {}) {
  const n0 = rig.J.spine.children.length, H = rig.d.h, cy = rig.parts.clen, zb = -(rig.surf('chest', 0, .13 * H) + .085 * H);
  R(rig, 'spine', ell(.125 * H, .16 * H, .085 * H, tone, { hull: true, rings: false }), 0, .07 * H, zb);
  R(rig, 'spine', ell(.11 * H, .05 * H, .09 * H, o.flap ?? TONE.dark, { hull: true, rings: false }), 0, .2 * H, zb + .004 * H);
  const roll = cylm(.04 * H, .04 * H, .27 * H, o.roll ?? TONE.dark, { seg: 18 }); roll.rotation.z = Math.PI / 2; R(rig, 'spine', roll, 0, .275 * H, zb + .005 * H);
  for (const sx of [-1, 1]) R(rig, 'spine', ell(.04 * H, .08 * H, .05 * H, o.pocket ?? TONE.dark, { hull: true, rings: false }), sx * .115 * H, .02 * H, zb + .01 * H);
  R(rig, 'spine', ell(.012 * H, .018 * H, .008 * H, TONE.pale, { rings: false }), .0, .12 * H, zb - .088 * H);
  for (const sx of [-1, 1]) { const x = sx * .06 * H;
    const P = [[x, .26 * H, zb + .03 * H], [x * 1.05, cy + .004 * H, -.03 * H], [x * 1.1, cy - .02 * H, .02 * H], [x * 1.03, .1 * H, rig.surf('chest', x, .1 * H) + .006 * H], [x, .02 * H, rig.surf('chest', x, .02 * H) + .006 * H], [x * .9, -.02 * H, -.01 * H]];
    R(rig, 'spine', M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P.map((q) => new THREE.Vector3(...q))), 40, .0095 * H, 6, false), TONE.dark, { line: false })); }
  R(rig, 'spine', between([-.06 * H, .13 * H, rig.surf('chest', -.06 * H, .13 * H) + .01 * H], [.06 * H, .13 * H, rig.surf('chest', .06 * H, .13 * H) + .01 * H], .014 * H, .006 * H, TONE.pale, { edge: 20 }));
  rig.J.spine.children.slice(n0).forEach((o2) => { o2.userData.back = true; });
}
// mancha de pintura (accent = naranja): disco achatado pegado al cuerpo o a la manga
export function stain(rig, joint, x, y, z, r, accent = false, tone = TONE.dark) {
  const m = ell(r, r * .8, .004 * rig.d.h, accent ? TONE.light : tone, { accent, rings: false }); R(rig, joint, m, x, y, z); return m;
}
// bata larga abierta con bolsillos (falda hasta la rodilla y un panel que sigue al torso)
export function smockFront(rig, tone, o = {}) {
  const H = rig.d.h; for (const sx of [-1, 1]) pocket(rig, 'hips', sx * .06, -.03, .07, .075, o.pocket ?? TONE.mid, {});
  band(rig, 'hips', .06 * H, .02 * H, o.belt ?? TONE.mid, 1.06);
}
