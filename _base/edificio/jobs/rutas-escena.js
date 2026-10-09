// Test scene for rutas.js: the building plus a few people placed on the route portal -> puerta-azotea (feet on the treads).
import { build as b0, update as u0 } from '../escena.js';
import { person } from '../../motor/personas.js';
import { subir, posicion, largo } from '../rutas.js';
export * from '../escena.js';
export function build(scene, opts = {}) {
  const built = b0(scene, { ...opts, residents: false });
  const r = subir('portal', 'puerta-azotea'), L = largo(r), ids = ['chico', 'abuela', 'nina', 'vecina', 'estudiante', 'viajera', 'abuelo', 'pareja'];
  const extra = [...(opts.extraRoutes || [])];
  let k = 0;
  for (let d = 0.6; d < L; d += L / 15, k++) {
    const q = posicion(r, d), p = person(ids[k % ids.length], q.escalera ? 'stairs-up' : 'walk', { phase: (k % 2) * 0.5 + 0.1, step: 0.238 });
    p.position.set(...q.p); p.rotation.y = q.yaw; scene.add(p);
  }
  return built;
}
export const update = u0;
