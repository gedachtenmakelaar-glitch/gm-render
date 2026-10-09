// Who builds people for scenes (owner: main chat). Scenes import person/pet from HERE, never from personajes/ directly.
// Since 08/10/2026: the real cast (personajes/elenco.js). Passers-by in the street stay the simple provisional figure
// (Dil: "personas muy simples caminando"), and ids a scene uses that the cast does not have yet are mapped to a stand-in.
import * as E from '../personajes/elenco.js';
import { person as simple } from './maniqui.js';
import { TONE } from './gm3d.js';
export { pet, duo, leadLine, CAST, CAST_IDS, POSE_NAMES, DRAW_ORDER } from '../personajes/elenco.js';

// stand-ins until the cast has them (personajes/ adds the real ones; then delete the line here)
const STAND_IN = {};   // panadera, madre, viajera, plantera and artista are real cast members since 09/10 (personajes/elenco.js)
// the provisional API used 'sit' / 'stand' / 'walk'; the cast has richer names
const POSE = { sit: 'sit-chair', stand: 'stand', walk: 'walk' };
let pairTurn = 0;

export function person(id = 'chico', pose = 'stand', opts = {}) {
  if (String(id).startsWith('paseante') || opts.simple) return simple(id, pose, { tone: TONE.dark, ...opts });
  let real = id;
  if (id === 'pareja') real = (pairTurn++ % 2) ? 'pareja-b' : 'pareja-a';
  if (STAND_IN[real]) real = STAND_IN[real];
  if (E.CAST_IDS && !E.CAST_IDS.includes(real)) return simple(id, pose, { tone: TONE.dark, ...opts });
  return E.person(real, POSE[pose] || pose, opts);
}

// Smooth change between two poses (video): blendPose(g, ['sit-chair', {hold:{}}], ['sit-chair', {hold:{R:'phone'}}], k).
// Both poses are solved ONCE with repose() and cached (every joint's position + rotation); each frame only interpolates
// them (no rebuild, a few ms). k is clamped 0..1 and eased by the caller. Pure function of k.
const _blends = new WeakMap();
function snap(g) { const s = []; g.traverse((o) => { s.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); }); return s; }
export function blendPose(g, A, B, k) {
  const key = JSON.stringify([A, B]);
  let c = _blends.get(g); if (!c || c.key !== key) {
    g.userData.repose(A[0], A[1] || {}); const a = snap(g);
    g.userData.repose(B[0], B[1] || {}); const b = snap(g);
    c = { key, a, b }; _blends.set(g, c);
  }
  k = Math.max(0, Math.min(1, k));
  for (let i = 0; i < c.a.length && i < c.b.length; i++) {
    const [o, pa, qa, sa] = c.a[i], [, pb, qb, sb] = c.b[i];
    o.position.lerpVectors(pa, pb, k); o.quaternion.slerpQuaternions(qa, qb, k); o.scale.lerpVectors(sa, sb, k);
  }
}
