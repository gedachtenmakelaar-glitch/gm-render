// Everything that moves in the GM street (owner: edificio agent). All motion is a pure function of t (seconds) and loops every 20 s.
// buildMovers(parent, opts) -> { group, update(t) }.  Moving things: cars (both directions), tram, cyclists, walkers, boat, gulls, pigeons, clouds, windmill, hoisted armchair, lift (in edificio.js).
import { THREE, TONE as T, mat, box, block, cyl, sphere, extrude, tag, inkLine, rng, modelo } from '../motor/gm3d.js';
import * as F from './muebles.js';
import { person } from '../motor/personas.js';
import { STREET as S } from './entorno.js';
import { TAU } from './medidas.js';

const add = (g, m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
const blk = (g, w, h, d, x, y0, z, t = T.mid, o) => add(g, box(w, h, d, t, o), x, y0 + h / 2, z);
const wrap01 = (u) => ((u % 1) + 1) % 1;
// edge(x, lo, hi, ramp): 0..1, shrinks a mover to nothing near the ends of its loop so it never pops into view
const edge = (x, lo, hi, ramp = 4) => Math.max(0.001, Math.min(1, (x - lo) / ramp, (hi - x) / ramp));
const TWO = Math.PI * 2;

// car({tone, night}) small hatchback, 4 m long, nose towards +x, origin on the ground at its centre
export function car(o = {}) {
  const g = tag(new THREE.Group(), 'calle:coche'), t = o.tone ?? T.mid;
  if (o.model) { try { const k = modelo('modelos/kenney/car-kit/' + o.model + '.glb', { l: 4.2, tone: t }); k.rotation.y = Math.PI / 2; g.add(k); if (o.night) { blk(g, 0.06, 0.2, 0.2, 2.1, 0.55, 0.55, T.pale, { accent: true }); blk(g, 0.06, 0.2, 0.2, 2.1, 0.55, -0.55, T.pale, { accent: true }); } return g; } catch (e) { /* fall back to the procedural car */ } }
  const body = extrude([[-2.0, 0.28], [2.0, 0.28], [2.05, 0.7], [1.45, 0.85], [0.85, 1.38], [-1.0, 1.38], [-1.7, 0.95], [-2.05, 0.8]], 1.7, t); body.position.z = -0.85; g.add(body);
  blk(g, 1.5, 0.42, 1.74, -0.05, 0.9, 0, T.pale, { line: false });                    // windows band
  blk(g, 0.08, 0.5, 1.78, 0.35, 0.88, 0, t); blk(g, 0.06, 0.2, 0.2, 2.0, 0.55, 0.55, T.pale, { accent: !!o.night }); blk(g, 0.06, 0.2, 0.2, 2.0, 0.55, -0.55, T.pale, { accent: !!o.night });
  for (const x of [-1.25, 1.25]) for (const z of [-0.78, 0.78]) { const w = cyl(0.3, 0.3, 0.22, T.ink, { seg: 16 }); add(g, w, x, 0.3, z).rotation.x = Math.PI / 2; const h = cyl(0.14, 0.14, 0.24, T.light, { seg: 10, line: false }); add(g, h, x, 0.3, z).rotation.x = Math.PI / 2; }
  return g;
}
// tram({tone}) 16 m low-floor tram with a pantograph; nose towards +x
export function tram() {
  const g = tag(new THREE.Group(), 'calle:tranvia');
  blk(g, 16, 2.5, 2.4, 0, 0.35, 0, T.pale); blk(g, 16.05, 0.5, 2.44, 0, 0.35, 0, T.dark); blk(g, 16.05, 0.12, 2.44, 0, 2.75, 0, T.dark);
  for (let i = 0; i < 9; i++) blk(g, 1.3, 1.0, 2.46, -7 + i * 1.75, 1.3, 0, T.ink, { line: false }); for (let i = 0; i < 9; i++) blk(g, 1.2, 0.9, 2.47, -7 + i * 1.75, 1.35, 0, T.mid, { line: false });
  blk(g, 0.3, 1.1, 2.0, 8.0, 1.2, 0, T.dark); F.tube(g, [-3, 2.8, 0], [-2, 3.5, 0], 0.03, T.ink); F.tube(g, [-2, 3.5, 0], [-4.2, 3.5, 0], 0.03, T.ink); F.tube(g, [-3.0, 3.5, 0], [-3.0, 4.2, 0], 0.02, T.ink);
  blk(g, 0.7, 0.2, 0.2, 7.95, 0.55, 0.9, T.pale, { accent: true });   // one orange headlight lens
  return g;
}
// cloud(size) flat cartoon cloud (ink outline)
export function cloud(size = 1, seed = 1) {
  const cs = [[-2.4, 0.9, 1.0], [-0.9, 1.5, 1.4], [1.0, 1.3, 1.3], [2.6, 0.8, 1.0]], pts = [[-4, 0]];
  for (let x = -3.9; x <= 3.9; x += 0.3) { let y = 0; cs.forEach(([cx, cy0, r]) => { const d = r * r - (x - cx) * (x - cx); if (d > 0) y = Math.max(y, cy0 + Math.sqrt(d) * 0.75 - 0.4); }); pts.push([x, Math.max(0.05, y)]); }
  pts.push([4, 0]); const m = extrude(pts, 0.4, T.paper); m.scale.set(size, size, size); return tag(m, 'cielo:nube');
}

const STRIDE = 1.4, WALK_STEPS = 8, SWING = 0.5; // SWING = oscilacion de pierna/brazo en rad (~29 grados)
export const CAR_MODELS = ['sedan', 'hatchback-sports', 'suv', 'taxi', 'van', 'sedan-sports', 'suv-luxury', 'sedan'];
export function buildMovers(parent, opts = {}) {
  const root = tag(new THREE.Group(), 'movimiento'); parent.add(root);
  const night = opts.mood === 'noche', ups = [], gnd = opts.street !== false;
  const lerpPos = (lo, L, ph, dir, t) => lo + wrap01(ph + dir * t / TAU) * L;
  // cars: near lane goes left, far lane goes right
  if (gnd) {
  [[0.30, -1, T.mid], [0.62, -1, T.dark], [0.46, -1, T.light], [0.90, -1, T.mid], [0.40, 1, T.light], [0.55, 1, T.dark], [0.70, 1, T.mid], [0.15, 1, T.light]].forEach(([ph, dir, tone], i) => {
    const c = car({ tone, night, model: CAR_MODELS[i % CAR_MODELS.length] }); c.position.set(0, 0, dir < 0 ? S.laneNear : S.laneFar); c.rotation.y = dir < 0 ? Math.PI : 0; root.add(c);
    ups.push((t) => { const x = lerpPos(-100, 200, ph, dir, t); c.position.x = x; c.scale.setScalar(edge(x, -100, 100, 6)); });
  });
  { const tr = tram(); tr.position.z = S.tram; root.add(tr); ups.push((t) => { const x = lerpPos(-110, 220, 0.30, 1, t); tr.position.x = x; tr.scale.setScalar(edge(x, -110, 110, 10)); }); }
  // cyclists on the red lane (both directions): bike + faceless rider; wheels turn
  [[0.30, 1, S.bikeA, 'ciclista-a'], [0.52, 1, S.bikeA, 'ciclista-b'], [0.74, 1, S.bikeA, 'ciclista-e'], [0.10, -1, S.bikeB, 'ciclista-c'], [0.36, -1, S.bikeB, 'ciclista-d'], [0.64, -1, S.bikeB, 'ciclista-f']].forEach(([ph, dir, z, id], i) => {
    const g = tag(new THREE.Group(), 'calle:ciclista'), b = F.bike({ tone: [T.dark, T.mid, T.ink, T.light][i] }); g.add(b);
    const p = person(id, 'sit', { h: 1.6 }); p.position.set(-0.22, 0.2, 0); p.rotation.y = Math.PI / 2; g.add(p);
    g.position.z = z; g.rotation.y = dir > 0 ? 0 : Math.PI; root.add(g); const wheels = []; b.traverse((o) => { if (o.name === 'rueda') wheels.push(o); });
    ups.push((t) => { const x = lerpPos(-60, 120, ph, dir, t); g.position.x = x; g.scale.setScalar(edge(x, -60, 60, 3)); wheels.forEach((w) => { w.rotation.z = -x * 3.0; }); g.position.y = 0; p.position.y = 0.2 + 0.015 * Math.sin(TWO * (t / TAU) * 40 + i); });
  });
  // walkers: faceless, small; on the sidewalk and along the quay (L=40 m in 20 s = 2 m/s)
  [[0.05, 1, 1.9, 1.7], [0.35, -1, 2.2, 1.6], [0.62, 1, 2.0, 1.75], [0.85, -1, 1.7, 1.55], [0.20, 1, 12.8, 1.7], [0.58, -1, 13.1, 1.65], [0.78, 1, 12.9, 1.6], [0.12, 1, 2.0, 1.8], [0.47, -1, 1.9, 1.5], [0.70, -1, 2.3, 1.7], [0.95, 1, 2.1, 1.65], [0.30, 1, 13.0, 1.7]].forEach(([ph, dir, z, h], i) => {
    const w = person('paseante' + i, 'walk', { h }); w.name = 'calle:paseante'; w.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; w.position.z = z; root.add(w);
    // El paseante es la figura simple de motor/maniqui.js (sin repose): se mueven sus piernas y brazos a mano.
    // Hijos: 0 torso, 1 cabeza, 2 brazo -1, 3 pierna -1, 4 brazo +1, 5 pierna +1. Cada miembro gira sobre su extremo superior.
    const limbs = []; [[3, -1, 0.5], [5, 1, 0.5]].forEach(([ci, sx]) => { const leg = w.children[ci], arm = w.children[ci - 1]; if (!leg || !arm) return;
      [[leg, 1], [arm, -1]].forEach(([m, k]) => { m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox, half = (bb.max.y - bb.min.y) / 2 * m.scale.y;
        limbs.push({ m, half, hy: m.position.y + half, hz: m.position.z, sw: sx * k, rz: m.rotation.z }); }); });
    let lastStep = -1, realCast = typeof w.userData.repose === 'function';
    ups.push((t) => { const x = lerpPos(-32, 64, ph, dir, t); w.position.x = x; const sc = edge(x, -32, 32, 3); w.scale.setScalar(sc);
      // fase de andar ligada a la distancia: 1 ciclo (dos pasos) = STRIDE m, asi los pies no patinan; solo depende de x (y por tanto de t)
      const cyc = wrap01(dir * (x + 32) / STRIDE + i * 0.173);
      if (realCast) { const step = Math.floor(cyc * WALK_STEPS) % WALK_STEPS; if (sc > 0.02 && step !== lastStep) { w.userData.repose('walk', { phase: step / WALK_STEPS, h }); lastStep = step; } }
      else { const sn = Math.sin(TWO * cyc); limbs.forEach((l) => { const a = l.sw * SWING * sn * (l.sw === 0 ? 0 : 1); l.m.rotation.x = a; l.m.position.y = l.hy - l.half * Math.cos(a); l.m.position.z = l.hz - l.half * Math.sin(a); }); }
      w.position.y = 0.012 * Math.abs(Math.cos(TWO * cyc)) * sc; });
  });
  // boat drifting on the canal (slow sway left-right, rocking with the water)
  { const bt = tag(new THREE.Group(), 'canal:barco'); const hull = extrude([[-3.5, 0.7], [-3.0, 0], [3.0, 0], [3.9, 0.7]], 1.9, T.dark); hull.position.z = -0.95; bt.add(hull);
    blk(bt, 3.4, 1.1, 1.5, -0.6, 0.7, 0, T.light); blk(bt, 3.0, 0.45, 1.54, -0.6, 1.0, 0, T.pale, { line: false }); blk(bt, 3.6, 0.12, 1.7, -0.6, 1.8, 0, T.dark);
    const pl = F.plant({ size: 0.9 }); pl.position.set(2.0, 0.7, 0); bt.add(pl); const ch = F.chair({ tone: T.light }); ch.position.set(1.2, 0.7, 0.4); ch.rotation.y = 1.57; bt.add(ch);
    F.tube(bt, [3.4, 0.7, 0], [3.4, 2.3, 0], 0.02, T.ink); { const fl = extrude([[0, 0], [0.6, -0.15], [0, -0.3]], 0.02, T.pale, { accent: true }); fl.position.set(3.4, 2.3, 0); bt.add(fl); }
    bt.position.set(0, -0.95, 17.2); root.add(bt); ups.push((t) => { bt.position.x = -12 + 12 * Math.sin(TWO * t / TAU); bt.position.y = -0.95 + 0.05 * Math.sin(TWO * 3 * t / TAU); bt.rotation.z = 0.02 * Math.sin(TWO * 2 * t / TAU); }); }
  }
  // gulls circling over the canal (one lap per 20 s, wings flapping), pigeons flying + walking
  [[0, 15, 0.0, 22], [0.5, 11, 0.4, 26], [0.25, 8, 0.7, 20]].forEach(([ph, r, ph2, y], i) => {
    const b = F.bird({ kind: 'gull', wing: 0.2 }); root.add(b); const wings = []; b.traverse((o) => { if (o.name === 'ala') wings.push(o); });
    ups.push((t) => { const a = TWO * (ph + t / TAU) * (i % 2 ? -1 : 1); b.position.set(-4 + Math.cos(a) * r * 1.8, y + Math.sin(TWO * 2 * t / TAU + i) * 1.0, 16 + Math.sin(a) * r * 0.6); b.rotation.y = -(a + (i % 2 ? -1 : 1) * Math.PI / 2) + Math.PI; wings.forEach((w) => { w.rotation.x = -w.userData.side * Math.sin(TWO * 30 * (t / TAU) + i) * 0.8; }); });
  });
  for (let i = 0; i < 3; i++) { const b = F.bird({ kind: 'pigeon', wing: 0 }); root.add(b); const wings = []; b.traverse((o) => { if (o.name === 'ala') wings.push(o); });
    ups.push((t) => { const a = TWO * (0.1 * i + t / TAU); b.position.set(6 + Math.cos(a) * 9 + i * 3, 11 + i * 1.5 + Math.sin(a * 2) * 0.6, 6 + Math.sin(a) * 4); b.rotation.y = -a - Math.PI / 2 + Math.PI; wings.forEach((w) => { w.rotation.x = -w.userData.side * Math.sin(TWO * 40 * (t / TAU) + i) * 0.9; }); }); }
  (gnd ? [[-2.2, 1.0], [-1.5, 1.4], [6.0, 2.0], [-18, 1.5]] : []).forEach(([x, z], i) => { const b = F.bird({ kind: 'pigeon' }); b.position.set(x, 0.08, z); b.rotation.y = i * 1.3; root.add(b); ups.push((t) => { b.position.x = x + 0.5 * Math.sin(TWO * t / TAU * 2 + i); b.rotation.y = (Math.cos(TWO * t / TAU * 2 + i) > 0 ? Math.PI / 2 : -Math.PI / 2); b.position.y = 0.08 + 0.02 * Math.abs(Math.sin(TWO * t / TAU * 12 + i)); }); });
  if (gnd) { const g = F.bird({ kind: 'gull' }); g.position.set(3.6, 1.0, 13.45); g.rotation.y = Math.PI / 2 + 0.3; root.add(g); const chip = box(0.05, 0.05, 0.12, T.pale, { accent: true }); chip.position.set(0.22, 0.04, 0.03); g.add(chip); }  // the gull with a (orange) chip
  // clouds drift across the sky ('fondo')
  { const cg = tag(new THREE.Group(), 'fondo:nubes', 'fondo'); root.add(cg); [[0.0, 24, 3.6], [0.28, 34, 4.8], [0.55, 19, 3.2], [0.8, 29, 4.2]].forEach(([ph, y, sz], i) => { const c = cloud(sz); c.position.set(0, y, -90 - i * 6); cg.add(c); ups.push((t) => { c.position.x = lerpPos(-100, 200, ph, 1, t) - 0; }); }); }
  return { group: root, update(t, extra = {}) { ups.forEach((f) => f(t)); if (extra.hoist) { extra.hoist.rotation.z = 0.16 * Math.sin(TWO * t / TAU); extra.hoist.rotation.x = 0.05 * Math.sin(TWO * 2 * t / TAU); } if (extra.windmill) extra.windmill.rotation.z = -TWO * t / TAU * 0.5; } };
}
