// PROVISIONAL mannequin (owner: main chat) so the building and the waiting room can place people before
// personajes/elenco.js exists. Same signature as the real one: person(id, pose, opts) -> THREE.Group, feet at y=0, facing +z.
// When personajes/elenco.js is ready, swap the import; nothing else changes.
import { THREE, capsule, sphere, TONE, tag } from './gm3d.js';

export function person(id = 'x', pose = 'stand', opts = {}) {
  const h = opts.h ?? 1.7, s = h / 1.7, t = opts.tone ?? TONE.light;
  const g = new THREE.Group();
  const part = (m, x, y, z, rx = 0, rz = 0) => { m.position.set(x * s, y * s, z * s); m.rotation.set(rx, 0, rz); g.add(m); return m; };
  const sit = pose === 'sit';
  part(capsule(0.16 * s, 0.42 * s, t), 0, sit ? 0.78 : 1.18, 0);                   // torso
  part(sphere(0.13 * s, TONE.dark), 0, sit ? 1.17 : 1.57, 0);                       // head (the real one is a scribble ball)
  for (const sx of [-1, 1]) {
    part(capsule(0.05 * s, 0.5 * s, t), sx * 0.22, sit ? 0.74 : 1.14, 0, 0, sx * 0.12); // arms
    if (sit) { part(capsule(0.065 * s, 0.38 * s, t), sx * 0.09, 0.47, 0.2, Math.PI / 2); part(capsule(0.06 * s, 0.36 * s, t), sx * 0.09, 0.22, 0.4); }
    else { const k = pose === 'walk' ? sx * 0.3 : 0; part(capsule(0.07 * s, 0.68 * s, t), sx * 0.09, 0.45, 0, k); }
  }
  return tag(g, 'persona:' + id);
}
