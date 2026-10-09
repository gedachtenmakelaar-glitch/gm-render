// GM personajes: mascotas. pet('perro'|'gato', pose, opts) -> THREE.Group con las patas en y = 0, mirando a +z. opts: {phase 0..1, h escala}
// perro: pequeno y desgrenado: pecho mas hondo que el vientre, patas delanteras con codo y traseras con corva, hocico, orejas caidas,
//   cola curva, mechones y trazos de pelo; collar y lengua naranja. gato: esbelto, cola en S, orejas de punta.
// poses perro: sit stand walk run lie beg play (reverencia) sniff scratch. gato: sit stand walk lie (hogaza) stretch perch.
// Todo con silueta de tinta (casco invertido). petAnchor(g,'collar') da el punto de la correa (espacio del grupo).
import { THREE, rng, inkLine } from '../motor/gm3d.js';
import { M, ell, tube, torus, D, setHull } from './rig.js';

const SP = {
  perro: { tone: .7, dark: .4, chest: [.092, .112, .15], belly: [.078, .082, .15], rump: [.083, .092, .1], zS: .15, zH: -.17, fl: [.12, .12], hl: [.11, .1, .09], legR: .029, hd: .074, ear: 'floppy', tail: [.07, .07, .06, .05], tailR: .02, fur: 26, strokes: 16 },
  gato: { tone: .3, dark: .14, chest: [.062, .078, .12], belly: [.052, .062, .15], rump: [.062, .072, .09], zS: .14, zH: -.18, fl: [.11, .11], hl: [.1, .1, .09], legR: .02, hd: .056, ear: 'point', tail: [.1, .1, .09, .08], tailR: .014, fur: 0, strokes: 0 },
};
export const PET_NAMES = Object.keys(SP);
export const PET_POSES = { perro: ['sit', 'stand', 'walk', 'run', 'lie', 'beg', 'play', 'sniff', 'scratch'], gato: ['sit', 'stand', 'walk', 'lie', 'stretch', 'perch'] };

function build(kind) {
  setHull(.0065);
  const K = SP[kind], root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const J = { body }, rg = rng(kind === 'perro' ? 5 : 9), hd = K.hd, TT = K.tone, DK = K.dark;
  const put = (m, x, y, z, parent = body) => { m.position.set(x, y, z); parent.add(m); return m; };
  put(ell(...K.chest, TT, { hull: true, rings: false }), 0, .005, .12);                       // pecho: lo mas hondo
  put(ell(...K.belly, TT, { hull: true, rings: false }), 0, .018, -.05);                      // vientre recogido
  put(ell(...K.rump, TT, { hull: true, rings: false }), 0, .012, -.19);                       // anca
  const neck = new THREE.Group(); neck.position.set(0, .05, K.zS + .07); body.add(neck); J.neck = neck;
  const nk = ell(hd * .62, hd * .7, hd * .8, TT, { hull: true, rings: false }); nk.position.set(0, .015, .03); neck.add(nk);
  const head = new THREE.Group(); head.position.set(0, .035, .085); neck.add(head); J.head = head;
  put(ell(hd, hd * .96, hd * 1.02, TT, { hull: true, rings: false }), 0, 0, 0, head);
  put(ell(hd * .5, hd * .42, hd * .85, kind === 'gato' ? .55 : .86, { hull: true, rings: false }), 0, -hd * .3, hd * .95, head);   // hocico
  put(ell(hd * .2, hd * .15, hd * .15, .08, { rings: false }), 0, -hd * .12, hd * 1.78, head);                                       // nariz
  for (const sx of [-1, 1]) put(ell(hd * .12, hd * .14, hd * .08, .08, { rings: false }), sx * hd * .46, hd * .22, hd * .86, head);   // ojitos
  const tongue = ell(hd * .22, hd * .05, hd * .45, .74, { accent: true, rings: false }); put(tongue, 0, -hd * .6, hd * 1.35, head); tongue.rotation.x = .55; tongue.visible = false; J.tongue = tongue;
  const ears = [];
  for (const sx of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(sx * hd * (K.ear === 'floppy' ? .72 : .5), hd * (K.ear === 'floppy' ? .62 : .8), -hd * .1); head.add(hinge); ears.push(hinge);
    if (K.ear === 'floppy') { const e = ell(hd * .17, hd * .72, hd * .46, DK, { hull: true, rings: false }); e.position.y = -hd * .55; hinge.add(e); hinge.userData.base = sx * .5; }
    else { const e = M(new THREE.ConeGeometry(hd * .42, hd * .95, 4), TT, { line: true, edge: 25 }); e.position.y = hd * .35; hinge.add(e); const ei = M(new THREE.ConeGeometry(hd * .22, hd * .6, 4), .8, { line: false }); ei.position.set(0, hd * .3, hd * .08); hinge.add(ei); hinge.userData.base = -sx * .18; }
  }
  J.ears = ears;
  if (kind === 'perro') {   // barbas, cejas y mechon: desgrenado
    for (const [x, y, z, a] of [[0, -hd * .75, hd * 1.2, 0], [-hd * .25, -hd * .7, hd * 1.1, .3], [hd * .25, -hd * .7, hd * 1.1, -.3]]) { const c = M(new THREE.ConeGeometry(hd * .12, hd * .5, 5), DK, { line: false }); put(c, x, y, z, head); c.rotation.z = a; c.rotation.x = Math.PI; }
    for (const sx of [-1, 1]) { const c = M(new THREE.ConeGeometry(hd * .13, hd * .45, 5), DK, { line: false }); put(c, sx * hd * .4, hd * .5, hd * .8, head); c.rotation.set(-1.1, 0, sx * .4); }
    const tuft = M(new THREE.ConeGeometry(hd * .25, hd * .6, 5), DK, { line: false }); put(tuft, 0, hd * 1.0, hd * .1, head);
  }
  const col = torus(hd * .72, .0085, .78, { accent: true, line: false }); col.rotation.x = Math.PI / 2 - .25; col.position.set(0, .02, .02); neck.add(col);
  // pelo: mechones (conos) y trazos de tinta
  for (let i = 0; i < K.fur; i++) { const a = rg() * Math.PI * 1.5 - .25, z = -.26 + rg() * .5, bs = z > .02 ? K.chest : K.belly;
    const x = Math.cos(a) * bs[0] * .98, y = Math.sin(a) * bs[1] * .98 + .01; const c = M(new THREE.ConeGeometry(.012, .045, 5), TT + (rg() - .5) * .14, { line: false });
    c.position.set(x, y, z); c.lookAt(new THREE.Vector3(x * 3, y * 2.5 + .03, z - .1)); c.rotateX(Math.PI / 2); body.add(c); }
  for (let i = 0; i < K.strokes; i++) { const a = rg() * Math.PI * 1.4 - .2, z = -.24 + rg() * .5, bs = z > .02 ? K.chest : K.belly, x = Math.cos(a) * bs[0] * 1.02, y = Math.sin(a) * bs[1] * 1.02 + .01;
    body.add(inkLine([[x, y, z], [x * 1.05, y - .014, z - .016], [x * 1.08, y - .03, z - .022]])); }
  // cola: cadena de segmentos que se curva hacia arriba (angulos acumulados)
  const tail = new THREE.Group(); tail.position.set(0, .075, -.255); body.add(tail); J.tail = tail; J.tailSeg = [];
  let par = tail; K.tail.forEach((len, i) => { const sj = new THREE.Group(); if (i) sj.position.z = -K.tail[i - 1]; par.add(sj); const rr = K.tailR * (1 - i * .12);
    put(ell(rr, rr, len * .62, i > 1 && kind === 'perro' ? TT : DK, { hull: true, rings: false }), 0, 0, -len * .5, sj); J.tailSeg.push(sj); par = sj; });
  // patas
  const front = (name, x) => { const sh = new THREE.Group(); sh.position.set(x, -.035, K.zS); body.add(sh); J[name] = sh;
    sh.add(tube(K.legR * 1.35, K.legR * .95, K.fl[0], TT)); const el = new THREE.Group(); el.position.y = -K.fl[0]; sh.add(el); J[name + 'e'] = el;
    el.add(tube(K.legR * .95, K.legR * .7, K.fl[1], TT)); const pw = new THREE.Group(); pw.position.y = -K.fl[1]; el.add(pw); J[name + 'p'] = pw;
    put(ell(.024, .015, .04, kind === 'gato' ? .6 : .9, { hull: true, rings: false }), 0, -.008, .012, pw); };
  const hind = (name, x) => { const hp = new THREE.Group(); hp.position.set(x, .0, K.zH); body.add(hp); J[name] = hp;
    hp.add(tube(K.legR * 1.8, K.legR * 1.0, K.hl[0], TT)); const st = new THREE.Group(); st.position.y = -K.hl[0]; hp.add(st); J[name + 's'] = st;
    st.add(tube(K.legR * 1.0, K.legR * .7, K.hl[1], TT)); const hk = new THREE.Group(); hk.position.y = -K.hl[1]; st.add(hk); J[name + 'h'] = hk;
    hk.add(tube(K.legR * .7, K.legR * .55, K.hl[2], TT)); const pw = new THREE.Group(); pw.position.y = -K.hl[2]; hk.add(pw); J[name + 'p'] = pw;
    put(ell(.024, .015, .04, kind === 'gato' ? .6 : .9, { hull: true, rings: false }), 0, -.008, .014, pw); };
  front('FR', -.058); front('FL', .058); hind('RR', -.052); hind('RL', .052);
  const pet = { root, J, K };
  const rot = (j, x, y = 0, z = 0) => j.rotation.set(x * D, y * D, z * D);
  pet.pose = (p) => {
    body.position.set(0, .4, 0); body.rotation.set((p.rx || 0) * D, (p.ry || 0) * D, 0);
    for (const n of ['FR', 'FL']) { const a = p.F?.[n[1]] || [0, 0]; rot(J[n], -a[0]); rot(J[n + 'e'], -a[1]); rot(J[n + 'p'], -(a[2] || 0)); }
    for (const n of ['RR', 'RL']) { const a = p.H?.[n[1]] || [35, 70, 35]; rot(J[n], -a[0]); rot(J[n + 's'], a[1]); rot(J[n + 'h'], -a[2]); J[n + 'p'].rotation.x = 0; }
    rot(J.neck, p.neck ?? 10); rot(J.head, p.head?.[0] ?? 0, p.head?.[1] ?? 0, p.head?.[2] ?? 0);
    J.ears.forEach((e, i) => { e.rotation.z = (e.userData.base || 0) + (p.ear || 0) * (i ? 1 : -1) * .5; });
    const t = p.tail || [50, 30, 20, 0]; J.tailSeg.forEach((s, i) => rot(s, t[i] || 0, i === 0 ? p.wag || 0 : 0));
    tongue.visible = !!p.tongue;
    root.updateMatrixWorld(true); let lo = Infinity; const v = new THREE.Vector3();
    root.traverse((o) => { if (!o.isMesh || o.userData.hull) return; for (let q = o; q; q = q.parent) if (q === J.tail) return; const a = o.geometry.attributes.position; for (let i = 0; i < a.count; i += 2) { v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); if (v.y < lo) lo = v.y; } });
    if (isFinite(lo)) body.position.y -= lo; root.updateMatrixWorld(true);
  };
  return pet;
}
const sinc = (ph) => { const t = ph * Math.PI * 2; return [Math.sin(t), Math.cos(t), t]; };
const mx = Math.max;
// angulos: F[R|L] = [hombro adelante, codo (antebrazo adelante), -]; H[R|L] = [cadera adelante, babilla (pierna atras), corva (pie adelante)]
const POSES = {
  perro: {
    stand: () => ({ F: { R: [0, 6], L: [0, 6] }, H: { R: [35, 70, 35], L: [35, 70, 35] }, neck: 12, head: [4, 0, 0], tail: [55, 35, 25, 10] }),
    sit: () => ({ rx: -42, F: { R: [-42, 0], L: [-42, 0] }, H: { R: [38, 100, 110], L: [38, 100, 110] }, neck: 40, head: [-4, 0, 0], tail: [15, 10, 15, 10] }),
    walk: (ph) => { const [s, c, t] = sinc(ph); return { F: { R: [28 * s, 10 + 32 * mx(0, c)], L: [-28 * s, 10 + 32 * mx(0, -c)] }, H: { L: [35 + 22 * s, 70 + 35 * mx(0, c), 35], R: [35 - 22 * s, 70 + 35 * mx(0, -c), 35] }, neck: 14, head: [-4, 0, 0], tail: [60, 30, 20, 10], wag: 18 * Math.sin(t * 2) }; },
    run: (ph) => { const [s, c, t] = sinc(ph); return { rx: -10 * s, F: { R: [48 * s, 25 + 50 * mx(0, c)], L: [48 * s, 25 + 50 * mx(0, c)] }, H: { R: [35 - 40 * s, 80 + 40 * mx(0, -c), 40], L: [35 - 40 * s, 80 + 40 * mx(0, -c), 40] }, neck: 16, head: [-6, 0, 0], tail: [40, 20, 10, 5], tongue: true, ear: 25, wag: 10 * Math.sin(t) }; },
    lie: () => ({ F: { R: [88, 4], L: [88, 4] }, H: { R: [60, 130, 90], L: [60, 130, 90] }, neck: 8, head: [-6, 0, 0], tail: [8, 4, 4, 4] }),
    beg: () => ({ rx: -62, F: { R: [-62, 112], L: [-62, 112] }, H: { R: [23, 105, 110], L: [23, 105, 110] }, neck: 56, head: [-8, 0, 6], tail: [25, 15, 15, 5], tongue: true }),
    play: () => ({ rx: 22, F: { R: [0, 107], L: [0, 107] }, H: { R: [30, 45, 37], L: [30, 45, 37] }, neck: -10, head: [-6, 0, 6], tail: [85, 10, -5, -10], tongue: true, wag: 22 }),
    sniff: () => ({ rx: 12, F: { R: [14, 20], L: [-6, 12] }, H: { R: [35, 70, 47], L: [30, 70, 47] }, neck: 62, head: [30, 0, 0], tail: [80, 10, 0, -5], wag: 10 }),
    scratch: () => ({ rx: -42, F: { R: [-42, 0], L: [-42, 0] }, H: { R: [38, 100, 110], L: [112, 95, -25] }, neck: 36, head: [0, 14, 22], tail: [15, 10, 15, 10], ear: 30 }),
  },
  gato: {
    stand: () => ({ F: { R: [0, 6], L: [0, 6] }, H: { R: [35, 70, 35], L: [35, 70, 35] }, neck: 14, head: [-4, 0, 0], tail: [70, -45, 55, -35] }),
    sit: () => ({ rx: -38, F: { R: [-38, 0], L: [-38, 0] }, H: { R: [34, 100, 110], L: [34, 100, 110] }, neck: 34, head: [-4, 0, 0], tail: [-20, 10, 40, 40] }),
    walk: (ph) => { const [s, c] = sinc(ph); return { F: { R: [26 * s, 10 + 30 * mx(0, c)], L: [-26 * s, 10 + 30 * mx(0, -c)] }, H: { L: [35 + 20 * s, 70 + 30 * mx(0, c), 35], R: [35 - 20 * s, 70 + 30 * mx(0, -c), 35] }, neck: 16, head: [-6, 0, 0], tail: [60, -30, 40, -20] }; },
    lie: () => ({ F: { R: [80, 140], L: [80, 140] }, H: { R: [70, 140, 110], L: [70, 140, 110] }, neck: 10, head: [-4, 0, 0], tail: [-5, 0, 50, 60], wag: 40 }),
    stretch: () => ({ rx: 26, F: { R: [96, 8], L: [96, 8] }, H: { R: [30, 45, 41], L: [30, 45, 41] }, neck: -12, head: [-10, 0, 0], tail: [75, 10, -10, -20] }),
    perch: () => ({ rx: -38, F: { R: [-38, 0], L: [-38, 0] }, H: { R: [34, 100, 110], L: [34, 100, 110] }, neck: 34, head: [-4, 0, 0], tail: [-70, -25, -10, 0] }),
  },
};
export function pet(id = 'perro', pose = 'sit', opts = {}) {
  const kind = SP[id] ? id : 'perro', P = build(kind), tab = POSES[kind];
  P.pose((tab[pose] || tab.sit)(opts.phase ?? 0));
  tag3(P.root, 'mascota:' + id); P.root.userData.pet = P; if (opts.h) P.root.scale.setScalar(opts.h);
  P.root.userData.anchor = () => { P.root.updateMatrixWorld(true); const hd = P.K.hd; return P.root.worldToLocal(P.J.head.localToWorld(new THREE.Vector3(0, -hd * .9, -hd * .1))); };
  return P.root;
}
function tag3(o, n) { o.name = n; }
export const petAnchor = (g) => g.userData.anchor();
