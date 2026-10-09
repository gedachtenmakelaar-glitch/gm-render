// GM personajes: esqueleto 3D de maniqui (jerarquia de articulaciones, manos de manopla con pulgar, agarres, ancla de objetos).
// Todo en metros, y arriba, pies en y = 0 tras settle(), la persona mira a +z. El lado R del personaje esta en -x.
// Convenciones de angulos (grados): brazo/pierna {f: adelante, a: separar del cuerpo, t: giro}; codo/rodilla = flexion;
// columna/cuello/cabeza [x: inclinar adelante, y: girar, z: ladear].
import { THREE, mat, ink, TONE, inkLine } from '../motor/gm3d.js';
export const D = Math.PI / 180;

const _g = new Map();
const geo = (k, f) => { if (!_g.has(k)) _g.set(k, f()); return _g.get(k); };
// ---- silueta (casco invertido): copia negra un poco mas grande que solo se ve por detras, da el contorno dibujado como en el v4.1.
// Como motor/gm3d.js silueta(), pero con grosor uniforme en elipsoides y tubos (infla por la normal). userData.hull = true.
let HT = 0.0125; export const setHull = (t) => { HT = t; };
const HULLM = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
export function hullOf(m, t = HT) {
  const g = m.geometry.clone(), p = g.attributes.position, n = g.attributes.normal; if (!n) return m;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * t, p.getY(i) + n.getY(i) * t, p.getZ(i) + n.getZ(i) * t);
  const h = new THREE.Mesh(g, HULLM); h.userData.hull = true; h.castShadow = false; h.receiveShadow = false; m.add(h); return m;
}
function hullEll(m, rx, ry, rz, t = HT) { const h = new THREE.Mesh(m.geometry, HULLM); h.scale.set(1 + t / rx, 1 + t / ry, 1 + t / rz); h.userData.hull = true; h.castShadow = false; h.receiveShadow = false; m.add(h); return m; }
// ---- contornos de tinta dibujados a mano (las superficies lisas no dan aristas): anillos, laterales, meridianos.
// Se cuelgan de la malla (heredan su escala) y sirven a drawOn() del motor: el hilo dibuja el trazo y luego entra el relleno.
const circ = (pl, n = 30) => { const p = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); const k = 1.008; p.push(pl === 0 ? [c * k, s * k, 0] : pl === 1 ? [c * k, 0, s * k] : [0, c * k, s * k]); } return p; };
export function strokes(m, pts) { const l = inkLine(pts); l.userData.stroke = true; m.add(l); return m; }
function ringsOf(m) { for (let i = 0; i < 3; i++) strokes(m, circ(i)); return m; }
function sidesOf(m, r0, r1, y0, y1) { r0 *= 1.01; r1 *= 1.01; for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) strokes(m, [[ax * r0, y0, az * r0], [ax * (r0 + r1) / 2, (y0 + y1) / 2, az * (r0 + r1) / 2], [ax * r1, y1, az * r1]]); return m; }
// malla con material gris; o.line = contorno de tinta; o.accent = naranja
export function M(g, tone, o = {}) {
  const m = new THREE.Mesh(g, mat(tone, o)); m.castShadow = o.shadow !== false; m.receiveShadow = true;
  if (o.line) ink(m, o.edge ?? 40); return m;
}
export const ell = (rx, ry, rz, tone, o = {}) => { const m = M(geo('sph', () => new THREE.SphereGeometry(1, 22, 15)), tone, o); m.scale.set(rx, ry, rz); if (o.rings !== false) ringsOf(m); if (o.hull) hullEll(m, rx, ry, rz, o.hull === true ? HT : o.hull); return m; };
export const box = (w, h, d, tone, o = {}) => M(new THREE.BoxGeometry(w, h, d), tone, { line: true, edge: 30, ...o });
// cilindro; con contorno por defecto (los aros de punos y dobladillos se dibujan)
export const cylm = (rt, rb, h, tone, o = {}) => M(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 20, 1, !!o.open), tone, { line: true, edge: 50, ...o });
export const torus = (R, r, tone, o = {}) => M(new THREE.TorusGeometry(R, r, 8, o.seg ?? 24, o.arc ?? Math.PI * 2), tone, o);
export function lathe(pts, tone, o = {}) { return M(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), o.seg ?? 26), tone, { line: true, edge: 60, ...o }); }
// tubo ahusado colgando desde y=0 hasta y=-len (r0 arriba, r1 abajo) con bola de articulacion arriba
export function tube(r0, r1, len, tone, o = {}) {
  const g = new THREE.Group();
  const c = M(new THREE.CylinderGeometry(r0, r1, len, 18, 1), tone, { line: false, ...o }); c.position.y = -len / 2; g.add(c);
  sidesOf(c, r0, r1, len / 2, -len / 2); if (o.hull !== false) hullOf(c);
  g.add(ell(r0, r0, r0, tone, { hull: o.hull !== false, ...o })); return g;
}
export function between(a, b, w, t, tone, o = {}) { // tira plana entre dos puntos (correas, asas)
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const m = box(w, t, L, tone, o); m.position.copy(A).add(B).multiplyScalar(0.5); m.lookAt(B); return m;
}
const lerp = (a, b, t) => a + (b - a) * t;
export function profR(pts, y) { for (let i = 1; i < pts.length; i++) { const [r0, y0] = pts[i - 1], [r1, y1] = pts[i]; if (y >= y0 && y <= y1 && y1 > y0) return lerp(r0, r1, (y - y0) / (y1 - y0)); } return y < pts[0][1] ? pts[1][0] : pts[pts.length - 2][0]; }

const AGES = {
  adult: { headR: .086, torso: .28, ua: .175, fa: .15, th: .25, sh: .24, ank: .045, neck: .03, shW: .100, hipHalf: .05, chest: .088, waist: .072, hip: .088, limb: 1, hand: 1, depth: .64 },
  teen: { headR: .088, torso: .28, ua: .175, fa: .15, th: .25, sh: .24, ank: .045, neck: .03, shW: .092, hipHalf: .047, chest: .080, waist: .064, hip: .080, limb: .92, hand: 1.05, depth: .6 },
  child: { headR: .112, torso: .29, ua: .165, fa: .135, th: .21, sh: .2, ank: .04, neck: .022, shW: .088, hipHalf: .048, chest: .086, waist: .08, hip: .086, limb: 1.05, hand: 1.1, depth: .68 },
  old: { headR: .083, torso: .272, ua: .172, fa: .148, th: .245, sh: .235, ank: .044, neck: .028, shW: .092, hipHalf: .05, chest: .086, waist: .08, hip: .088, limb: .95, hand: 1, depth: .66 },
};
export function dims(b) {
  const A = AGES[b.age || 'adult'], H = (b.h ?? 1.7) * .955, bu = b.build ?? 1;
  const f = b.sex === 'f', m = b.sex === 'm';
  const d = { h: H, headR: A.headR * H, neck: A.neck * H, torso: A.torso * H, ua: A.ua * H, fa: A.fa * H, th: A.th * H, sh: A.sh * H, ank: A.ank * H,
    shW: A.shW * H * (f ? .92 : m ? 1.05 : 1) * (0.5 + 0.5 * bu), hipHalf: A.hipHalf * H * (f ? 1.1 : 1),
    chest: A.chest * H * (f ? .95 : m ? 1.06 : 1) * bu, waist: A.waist * H * (f ? .86 : m ? 1.04 : 1) * bu, hip: A.hip * H * (f ? 1.1 : m ? .94 : 1) * (0.4 + 0.6 * bu),
    limb: A.limb * (0.6 + 0.4 * bu), hs: H / 1.7 * A.hand * 1.2, depth: A.depth, age: b.age || 'adult', sex: b.sex || 'n' };
  d.hipDrop = .025 * H; d.legLen = d.th + d.sh + d.ank; d.hipY = d.legLen + d.hipDrop;
  return d;
}

// ---------- manos ----------
// Marco local de la mano derecha: x = normal de la palma (hacia dentro), -y = hacia los dedos, +z = lado del pulgar.
// La izquierda es el mismo marco reflejado (scale.x = -1). rp/rd = curvatura falange 1/2 de los dedos, ip/id = indice, th = pulgar.
export const GRIPS = {
  relaxed: { rp: .35, rd: .4, ip: .28, id: .3, th: [-.55, 0, .15], tt: .2 },
  fist: { rp: 1.5, rd: 1.35, ip: 1.5, id: 1.35, th: [-.5, 0, 1.0], tt: .5 },
  point: { rp: 1.5, rd: 1.35, ip: .0, id: .0, th: [-.4, 0, .9], tt: .4 },
  open: { rp: .04, rd: .04, ip: .02, id: .02, th: [-1.0, 0, -.2], tt: 0 },
  flat: { rp: .0, rd: .0, ip: .0, id: .0, th: [-.45, 0, .3], tt: 0 },
  wave: { rp: .14, rd: .14, ip: .1, id: .1, th: [-.9, 0, -.25], tt: .1 },
  'grip-phone': { rp: 1.2, rd: 1.0, ip: 1.15, id: .9, th: [-1.4, 0, 1.0], tt: .55 },
  'grip-cup': { rp: 1.15, rd: 1.05, ip: 1.1, id: 1.0, th: [-1.25, 0, .55], tt: .3 },
  'grip-handle': { rp: 1.45, rd: 1.25, ip: 1.4, id: 1.25, th: [-.7, 0, .9], tt: .45 },
  'grip-stick': { rp: 1.1, rd: 1.0, ip: 1.0, id: .9, th: [-.9, 0, .7], tt: .3 },
  'grip-pinch': { rp: 1.5, rd: 1.3, ip: .75, id: .7, th: [-1.0, 0, .75], tt: .5 },
  'grip-book': { rp: 1.0, rd: .9, ip: .9, id: .8, th: [-1.3, 0, .6], tt: .2 },
};
function buildHand(hs, tone) {
  const hand = new THREE.Group();
  const s = hs;
  const palm = ell(.017 * s, .044 * s, .037 * s, tone, { hull: HT * .4 }); palm.position.set(0, -.043 * s, 0); hand.add(palm);
  const seg = (len, wz, rad, z) => { const m = M(new THREE.CapsuleGeometry(rad * s, len * s, 6, 12), tone); m.scale.z = wz / rad; m.position.set(0, -len * s / 2, z * s); sidesOf(m, rad * s, rad * s, len * s / 2, -len * s / 2); hullOf(m, HT * .35); return m; };
  const mk = (len1, len2, wz, rad, z) => {
    const P = new THREE.Group(), Dd = new THREE.Group(); P.add(seg(len1, wz, rad, z)); Dd.position.set(0, -len1 * s, z * s); Dd.add(seg(len2, wz * .93, rad * .93, 0)); P.add(Dd); return { P, Dd };
  };
  const rest = mk(.04, .034, .0275, .0178, -.0095), idx = mk(.042, .035, .0105, .0105, 0);
  const kn = new THREE.Group(); kn.position.set(.002 * s, -.078 * s, 0); hand.add(kn);
  const restG = new THREE.Group(); restG.add(rest.P); kn.add(restG);
  const idxG = new THREE.Group(); idxG.position.z = .0275 * s; idxG.add(idx.P); kn.add(idxG);
  // pulgar
  const thB = new THREE.Group(); thB.position.set(.011 * s, -.03 * s, .031 * s); hand.add(thB);
  const t1 = M(new THREE.CapsuleGeometry(.0128 * s, .026 * s, 6, 12), tone); hullOf(t1, HT * .35); t1.position.y = -.019 * s; thB.add(t1);
  const thT = new THREE.Group(); thT.position.y = -.038 * s; thB.add(thT);
  const t2 = M(new THREE.CapsuleGeometry(.0118 * s, .02 * s, 6, 12), tone); hullOf(t2, HT * .35); t2.position.y = -.015 * s; thT.add(t2);
  const holder = new THREE.Group(); hand.add(holder);
  const tip = (parent, y, z = 0) => { const o = new THREE.Object3D(); o.position.set(0, y, z); parent.add(o); return o; };
  const tips = { idx: tip(idx.Dd, -.035 * s - .008 * s), rest: tip(rest.Dd, -.034 * s - .012 * s), thumb: tip(thT, -.03 * s) };
  const api = { hand, holder, tips, grip: 'relaxed', setGrip(name) {
    const g = GRIPS[name] || GRIPS.relaxed; api.grip = name;
    restG.rotation.z = g.rp; rest.Dd.rotation.z = g.rd; idxG.rotation.z = g.ip; idx.Dd.rotation.z = g.id;
    thB.rotation.set(g.th[0], g.th[1], g.th[2]); thT.rotation.z = g.tt; } };
  api.setGrip('relaxed'); return api;
}

// ---------- el rig ----------
// def: { body:{h,age,sex,build,stoop}, skin, top, bottom, hips, sleeve, forearm, thigh, shin, makeHead(R, opts, rig) }
export function buildRig(def) {
  const d = dims(def.body), H = d.h, skin = def.skin ?? TONE.light; setHull(.0125 * H / 1.62);
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const J = { body, pelvis: body };
  const rig = { root, body, J, d, def, hands: {}, parts: {}, skin, stoop: def.body.stoop || 0, state: {} };
  const R = (n, parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[n] = g; return g; };
  const tones = { top: def.top ?? TONE.mid, bottom: def.bottom ?? TONE.dark, hips: def.hips ?? def.bottom ?? TONE.dark, sleeve: def.sleeve ?? def.top ?? TONE.mid };
  tones.forearm = def.forearm ?? tones.sleeve; tones.thigh = def.thigh ?? tones.bottom; tones.shin = def.shin ?? tones.bottom;
  rig.tones = tones;
  // caderas
  const hipsPts = [[0, -.095 * H], [d.hip * .72, -.088 * H], [d.hip * .98, -.06 * H], [d.hip, -.02 * H], [(d.hip + d.waist) / 2, .04 * H], [d.waist, .088 * H]];
  rig.parts.hipsPts = hipsPts;
  const hips = lathe(hipsPts, tones.hips, { line: false, hull: true }); hips.scale.z = d.depth * 1.05; body.add(hips); rig.parts.hips = hips; hips.name = 'parte:caderas';
  // pecho (columna)
  const wy = .085 * H, clen = d.torso - wy;
  const shR = d.shW * .96, nR = (def.neckR ?? .027) * H;
  const chestPts = [[0, -.03 * H], [d.waist * .95, -.03 * H], [d.waist, 0], [lerp(d.waist, d.chest, .5) * 1.02, .05 * H], [d.chest, .11 * H], [d.chest * 1.03, .15 * H], [shR * .98, clen - .05 * H], [shR * .93, clen - .03 * H], [shR * .66, clen - .011 * H], [nR * 2.1, clen + .004 * H], [nR * 1.3, clen + .013 * H], [0, clen + .013 * H]];
  rig.parts.chestPts = chestPts; rig.parts.waistY = wy; rig.parts.clen = clen;
  const spine = R('spine', body, 0, wy, 0);
  const chest = lathe(chestPts, tones.top, { line: false, hull: true }); chest.scale.z = d.depth; spine.add(chest); rig.parts.chest = chest; chest.name = 'parte:torso';
  if (d.sex === 'f') for (const sx of [-1, 1]) { const b = ell(.044 * H, .04 * H, .042 * H, tones.top); b.position.set(sx * .042 * H, .108 * H, d.chest * d.depth * .72); spine.add(b); }
  // cuello y cabeza
  const neckLen = d.neck + .015 * H;
  const neck = R('neck', spine, 0, clen, 0);
  const nm = M(new THREE.CylinderGeometry(nR, nR * 1.08, neckLen + .02 * H, 14), skin); nm.name = 'parte:torso'; hullOf(nm, HT * .8); nm.position.y = (neckLen - .01 * H) / 2; neck.add(nm);
  const head = R('head', neck, 0, neckLen, 0);
  const skull = new THREE.Group(); skull.name = 'parte:cabeza'; skull.position.set(0, d.headR * .9, .004); head.add(skull); rig.skull = skull;
  // brazos y piernas
  const lr = d.limb;
  for (const [side, sx] of [['R', -1], ['L', 1]]) {
    const sh = R('sh' + side, spine, sx * d.shW, clen - .02 * H, 0);
    const ua = tube(.03 * H * lr, .0245 * H * lr, d.ua, tones.sleeve); sh.add(ua); ua.name = 'parte:brazo' + side; rig.parts['ua' + side] = ua;
    const el = R('el' + side, sh, 0, -d.ua, 0);
    const fa = tube(.0245 * H * lr, .0185 * H * lr, d.fa, tones.forearm); el.add(fa); fa.name = 'parte:brazo' + side; rig.parts['fa' + side] = fa;
    const wr = R('wr' + side, el, 0, -d.fa, 0);
    const wrap = new THREE.Group(); if (sx > 0) wrap.scale.x = -1; wr.add(wrap);
    const hd = buildHand(d.hs, skin); wrap.add(hd.hand); hd.hand.name = 'parte:mano' + side; rig.hands[side] = hd;
    const hp = R('hip' + side, body, sx * d.hipHalf, -d.hipDrop, 0);
    const th = tube(.052 * H * lr, .034 * H * lr, d.th, tones.thigh); hp.add(th); th.name = 'parte:pierna' + side; rig.parts['th' + side] = th;
    const kn = R('kn' + side, hp, 0, -d.th, 0);
    const sn = tube(.034 * H * lr, .0225 * H * lr, d.sh, tones.shin); kn.add(sn); sn.name = 'parte:pierna' + side; rig.parts['sn' + side] = sn;
    const an = R('an' + side, kn, 0, -d.sh, 0);
    rig.parts['foot' + side] = an;
  }
  // falda / faldon (cuelga de la cintura y se levanta al sentarse)
  R('skirt', body, 0, .05 * H, 0);
  rig.setHead = (o = {}) => { if (rig.headG) skull.remove(rig.headG); rig.headG = def.makeHead(d.headR, o, rig); skull.add(rig.headG); };
  rig.add = (joint, obj, x = 0, y = 0, z = 0) => { obj.position.set(x, y, z); (J[joint] || rig.parts[joint]).add(obj); return obj; };
  // z de la superficie delantera del torso a la altura y (relativa a cintura para 'chest', a pelvis para 'hips'), desplazada x
  rig.surf = (layer, x, y) => { const pts = layer === 'hips' ? rig.parts.hipsPts : rig.parts.chestPts, r = profR(pts, y); const dz = layer === 'hips' ? d.depth * 1.05 : d.depth; const k = Math.min(.999, Math.abs(x) / r); return r * dz * Math.sqrt(1 - k * k); };

  // ----- poses -----
  const V3 = THREE.Vector3, Q = THREE.Quaternion;
  const E = (j, a) => { j.rotation.set((a[0] || 0) * D, (a[1] || 0) * D, (a[2] || 0) * D, 'XYZ'); };
  const limb = (j, a, sg) => { a = a || {}; j.rotation.set(-(a.f || 0) * D, sg * (a.t || 0) * D, -sg * (a.a || 0) * D, 'XZY'); };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const toV = (v) => (v && v.isVector3 ? v.clone() : new V3(...v));
  // anclajes en el espacio de la persona (raiz): para apuntar manos y pies
  rig.anchor = (name) => {
    root.updateMatrixWorld(true);
    const L = { head: () => skull.localToWorld(new V3(0, 0, 0)), eyes: () => skull.localToWorld(new V3(0, .1 * d.headR, d.headR)), neck: () => J.neck.localToWorld(new V3()),
      chest: () => J.spine.localToWorld(new V3(0, .12 * H, 0)), backHigh: () => J.spine.localToWorld(new V3(0, .12 * H, -d.chest * d.depth)), backLow: () => J.spine.localToWorld(new V3(0, .02 * H, -d.waist * d.depth)),
      front: () => J.spine.localToWorld(new V3(0, .1 * H, d.chest * d.depth)), waist: () => J.spine.localToWorld(new V3()), hip: () => body.localToWorld(new V3()),
      shR: () => J.shR.localToWorld(new V3()), shL: () => J.shL.localToWorld(new V3()), earR: () => skull.localToWorld(new V3(-d.headR * 1.0, 0, 0)), earL: () => skull.localToWorld(new V3(d.headR * 1.0, 0, 0)),
      handR: () => J.wrR.localToWorld(new V3(.026, -.058, 0).multiplyScalar(d.hs)), handL: () => J.wrL.localToWorld(new V3(-.026, -.058, 0).multiplyScalar(d.hs)),
      footR: () => J.anR.localToWorld(new V3()), footL: () => J.anL.localToWorld(new V3()) };
    return root.worldToLocal(L[name]());
  };
  // IK de dos huesos: pone la articulacion S de modo que el extremo llegue a T (espacio raiz). pole = hacia donde apunta el codo/rodilla.
  function ik2(jS, jE, a, b, Tl, pole, bend, roll = 0) {
    root.updateMatrixWorld(true);
    const S = jS.getWorldPosition(new V3()), T = root.localToWorld(toV(Tl));
    const rq = root.getWorldQuaternion(new Q()); const P = toV(pole).applyQuaternion(rq);
    const dv = T.clone().sub(S); let dd = clamp(dv.length(), Math.abs(a - b) * 1.02 + 1e-3, (a + b) * .998); const u = dv.normalize();
    const x = (a * a - b * b + dd * dd) / (2 * dd), hgt = Math.sqrt(Math.max(0, a * a - x * x));
    let pp = P.clone().sub(u.clone().multiplyScalar(P.dot(u))); if (pp.lengthSq() < 1e-6) pp.set(0, -1, 0).sub(u.clone().multiplyScalar(-u.y)); pp.normalize();
    const Ept = S.clone().addScaledVector(u, x).addScaledVector(pp, hgt), W = S.clone().addScaledVector(u, dd);
    const upper = Ept.clone().sub(S).normalize(), fore = W.clone().sub(Ept).normalize();
    let bd = fore.clone().sub(upper.clone().multiplyScalar(fore.dot(upper))); if (bd.lengthSq() < 1e-6) bd = pp.clone().negate(); bd.normalize();
    const zf = bd.multiplyScalar(bend), yf = upper.clone().negate(), xf = new V3().crossVectors(yf, zf).normalize();
    const q = new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xf, yf, zf));
    const pq = jS.parent.getWorldQuaternion(new Q()); jS.quaternion.copy(pq.invert().multiply(q));
    const e = Math.PI - Math.acos(clamp((a * a + b * b - dd * dd) / (2 * a * b), -1, 1));
    jE.rotation.set(-bend * e, roll * D, 0, 'XYZ');
  }
  const val = (v, ctx) => (typeof v === 'function' ? v(ctx) : v);
  rig.pose = (p = {}, extra = {}) => {
    const ctx = { rig, d, H, k: H / 1.7, anchor: rig.anchor, v: (x, y, z) => new V3(x, y, z), ...extra };
    body.position.set(p.x || 0, d.hipY + (p.dy || 0), p.dz || 0);
    body.rotation.set((p.rot?.[0] || 0) * D, (p.rot?.[1] || 0) * D, (p.rot?.[2] || 0) * D, 'YXZ');
    const sp = p.spine || [0, 0, 0]; E(J.spine, [sp[0] + rig.stoop, sp[1], sp[2]]);
    const nk = p.neck || [0, 0, 0]; E(J.neck, [nk[0] - rig.stoop * .45, nk[1], nk[2]]);
    E(J.head, p.head || [0, 0, 0]);
    let ikFeet = false;
    for (const [S, sg] of [['R', 1], ['L', -1]]) {
      limb(J['hip' + S], p['leg' + S], sg);
      J['kn' + S].rotation.set((p['knee' + S] || 0) * D, 0, 0);
      J['an' + S].rotation.set(-(p['ank' + S] || 0) * D, (p['ankT' + S] || 0) * D, 0);
    }
    root.updateMatrixWorld(true);
    for (const S of ['R', 'L']) { const f = p['foot' + S]; if (!f) continue; ikFeet = true;
      const T = val(f.to, ctx); ik2(J['hip' + S], J['kn' + S], d.th, d.sh, T, f.pole || [0, 0, 1], -1);
      root.updateMatrixWorld(true); // pie plano respecto al suelo, con giro f.yaw
      const kq = J['kn' + S].getWorldQuaternion(new Q()), rq = root.getWorldQuaternion(new Q()).multiply(new Q().setFromAxisAngle(new V3(0, 1, 0), (f.yaw || 0) * D));
      J['an' + S].quaternion.copy(kq.invert().multiply(rq)); J['an' + S].rotation.x -= (f.pitch || 0) * D; }
    if (p.settle !== false && !ikFeet) rig.settle();
    if (p.lift) body.position.y += p.lift;
    for (const [S, sx] of [['R', -1], ['L', 1]]) J['sh' + S].position.y = rig.parts.clen - .02 * H + (p.shoulders || 0);
    root.updateMatrixWorld(true);
    for (const [S, sg] of [['R', 1], ['L', -1]]) {
      const r = p['reach' + S];
      if (r) { const want = toV(val(r.to, ctx)), tgt = want.clone(); // 'to' = donde queda el punto de agarre de la mano
        for (let it = 0; it < 3; it++) { ik2(J['sh' + S], J['el' + S], d.ua, d.fa, tgt, r.pole || [0, -1, -.4], 1, (r.roll ?? 0) * sg); if (r.wrist) J['wr' + S].rotation.set(-r.wrist[0] * D, 0, -sg * r.wrist[1] * D); root.updateMatrixWorld(true); tgt.add(want.clone().sub(rig.anchor('hand' + S))); } }
      else { limb(J['sh' + S], p['arm' + S], sg); J['el' + S].rotation.set(-(p['elb' + S] || 0) * D, sg * (p['elbT' + S] || 0) * D, 0); }
      const w = p['wr' + S] || (r && r.wrist) || [0, 0]; J['wr' + S].rotation.set(-w[0] * D, 0, -sg * w[1] * D);
      if (!rig.state['hand' + S]) rig.hands[S].setGrip(p['hand' + S] || 'relaxed');
    }
    const flex = Math.max(-J.hipR.rotation.x, -J.hipL.rotation.x, 0);
    if (rig.skirtUpdate) rig.skirtUpdate(flex); // faldas con caida sentada (ropa.js skirt)
    else { J.skirt.rotation.x = -flex * .88; J.skirt.scale.set(1, 1 - Math.min(.3, flex * .15), 1 + flex * .12); }
    return rig;
  };
  // pies en el suelo: el punto mas bajo de la persona queda en y = 0 (los objetos en mano no cuentan)
  rig.settle = () => {
    root.updateMatrixWorld(true); let lo = Infinity; const v = new THREE.Vector3();
    root.traverse((o) => {
      if (!o.isMesh || o.userData.hull) return; for (let p = o; p; p = p.parent) if (p.userData && (p.userData.prop || p.userData.noGround)) return;
      const a = o.geometry.attributes.position; for (let i = 0; i < a.count; i += 2) { v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); if (v.y < lo) lo = v.y; }
    });
    if (isFinite(lo)) body.position.y -= lo;
    root.updateMatrixWorld(true); return rig;
  };
  rig.seatY = () => { root.updateMatrixWorld(true); return body.localToWorld(new THREE.Vector3(0, -.095 * H, 0)).y; };
  // objeto en la mano: prop.userData.holds[grip] = {p:[x,y,z], r:[rx,ry,rz]} en el marco de la mano derecha
  rig.attach = (prop, side, grip) => {
    const S = side.replace('hand', ''); const hd = rig.hands[S];
    const h = prop.userData.holds && (prop.userData.holds[grip] || prop.userData.holds._); if (!h) throw new Error('objeto sin agarre ' + grip);
    const hs = rig.d.hs; prop.position.set(h.p[0] * hs, h.p[1] * hs, h.p[2] * hs); prop.scale.setScalar(Math.min(1.12, Math.max(1, hs * .92))); prop.rotation.set(...(h.r || [0, 0, 0]), h.order || 'XYZ'); prop.userData.prop = true;
    prop.name = 'parte:objeto'; hd.holder.add(prop); hd.setGrip(grip); rig.state['hand' + S] = grip; return prop;
  };
  rig.worldOf = (joint, local = [0, 0, 0]) => { root.updateMatrixWorld(true); return (J[joint] || rig.parts[joint]).localToWorld(new THREE.Vector3(...local)); };
  return rig;
}
