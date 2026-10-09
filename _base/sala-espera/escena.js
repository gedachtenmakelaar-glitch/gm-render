// Sala de espera (dueño: agente Sala). Entrada: build(scene, opts) + update(t, scene, built). Mira CATALOGO.md para todas las opciones, anclas y cámaras.
import { THREE, tag, rng } from '../motor/gm3d.js';
import { person } from '../motor/personas.js';
import { salaPublica, consultorio, MODELOS } from './sala.js';
export { MODELOS };
export { LOOP } from './objetos.js';

const IDS = ['vecina', 'chico', 'abuelo', 'abuela', 'nina', 'pareja', 'estudiante'];
const FRAC = { vacia: 0, pocas: 0.3, media: 0.6, llena: 1 };

// opts: variante 'publica'|'consultorio' · disposicion 'v41'|'enfrentadas'|'pared'|'pocas' · mood 'dia'|'tarde'|'noche' · recepcion true|false
//       gente 'vacia'|'pocas'|'media'|'llena'|0..1 · ids [..] · ocupar {indiceAsiento: id} (manda sobre gente) · de_pie true | [[ancla, id],..]
//       recepcionista true|false · semilla n · asientoCam [i, j] (los dos asientos de los primeros planos)
export function build(scene, opts = {}) {
  const root = tag(new THREE.Group(), 'sala-espera'); scene.add(root);
  const o = { mood: 'dia', ...opts };
  const sala = (o.variante === 'consultorio' ? consultorio : salaPublica)(root, o);
  const gente = tag(new THREE.Group(), 'gente'); root.add(gente);
  const seats = sala.seats, ids = o.ids || IDS, r = rng(o.semilla ?? 7), ocupados = {};
  if (o.ocupar) Object.entries(o.ocupar).forEach(([i, id]) => { ocupados[i] = id; });
  else {
    const f = typeof o.gente === 'number' ? o.gente : FRAC[o.gente ?? 'vacia'] ?? 0;
    const orden = seats.map((s, i) => [r(), i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    orden.slice(0, Math.round(seats.length * f)).forEach((i, k) => { ocupados[i] = ids[k % ids.length]; });
  }
  Object.entries(ocupados).forEach(([i, id]) => { const s = seats[+i]; if (!s) return; const p = person(id, 'sit'); p.position.set(...s.pos); p.rotation.y = s.rotY; gente.add(p); s.ocupado = id; });
  const deP = o.de_pie === true ? (o.variante === 'consultorio' ? [] : [['cliente_mostrador', 'pareja'], ['enfriador', 'abuela']]) : (o.de_pie || []);
  deP.forEach(([a, id]) => { const an = sala.anclas[a]; if (!an) return; const p = person(id, 'stand'); p.position.set(...an.pos); p.rotation.y = an.rotY; gente.add(p); });
  if (o.recepcionista !== false && sala.anclas.recepcionista) { const an = sala.anclas.recepcionista, p = person('recepcionista', 'sit'); p.position.set(...an.pos); p.rotation.y = an.rotY; gente.add(p); }
  // cámaras de asiento (primeros planos)
  const cams = { ...sala.cams };
  const [a, b] = o.asientoCam || [Math.min(5, seats.length - 1), Math.min(1, seats.length - 1)];
  [[a, 'asiento-1'], [b, 'asiento-2']].forEach(([i, nombre]) => {
    const s = seats[i]; if (!s) return; const fx = Math.sin(s.rotY), fz = Math.cos(s.rotY), px = Math.cos(s.rotY), pz = -Math.sin(s.rotY), lado = nombre === 'asiento-1' ? 1 : -1;
    cams[nombre] = { pos: [s.pos[0] + fx * 2.4 + px * 1.0 * lado, 1.0, s.pos[2] + fz * 2.4 + pz * 1.0 * lado], look: [s.pos[0] + fx * 0.1, 0.7, s.pos[2] + fz * 0.1], fov: 36 };
    cams[nombre + '-v'] = { pos: [s.pos[0] + fx * 2.3 + px * 0.9 * lado, 1.0, s.pos[2] + fz * 2.3 + pz * 0.9 * lado], look: [s.pos[0], 0.7, s.pos[2]], fov: 52 };
  });
  const moviles = []; root.traverse((x) => { if (x.userData && x.userData.upd) moviles.push(x); });
  return { cameras: cams, seats, anclas: sala.anclas, anim: sala.anim, moviles, root, tipo: sala.tipo, dimensiones: [sala.W, sala.D, sala.H] };
}
export function update(t, scene, built) { built.anim.forEach((f) => f(t)); built.moviles.forEach((m) => m.userData.upd(t)); }
