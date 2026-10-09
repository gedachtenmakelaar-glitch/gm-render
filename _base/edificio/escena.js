// GM base world, building + environment: entry point (owner: edificio agent).
// build(scene, opts) -> { cameras, anchors, homes, cast, ... };  update(t, scene, built) moves cars, cyclists, walkers, boat, birds, clouds, windmill, the lift and the hoisted armchair.
// opts: { cutaway: true | false | [homeIds]   (default true: the dollhouse, front walls removed),
//         street: true, neighbours: true, skyline: true, farHouses: false, residents: true, homes: [ids] (interiors to build, default all), mood: 'dia'|'tarde'|'noche' }
import { THREE, TONE as T, tag, block, lamp } from '../motor/gm3d.js';
import { buildBuilding } from './edificio.js';
import { buildEntorno } from './entorno.js';
import { buildMovers } from './movimiento.js';
import { HOMES, SPACES, ALL, CAST, MODELOS as MOD_HOMES } from './viviendas.js';
import { Y, ROOF, D, LIFT } from './medidas.js';

const K = 'modelos/kenney/';
export const MODELOS = [...MOD_HOMES, ...['sedan', 'hatchback-sports', 'suv', 'taxi', 'van', 'sedan-sports', 'suv-luxury'].map((n) => K + 'car-kit/' + n + '.glb')];
const SKY = { dia: 0.57, tarde: 0.42, noche: 0.05 };       // linear grey of the sky background (dither: pale dotted / denser / dark)

export function cameraSet(anchors) {
  const C = {};
  const cx = (LIFT.x0 + LIFT.x1) / 2;
  // ---- wide / structural ----
  C.entorno = { pos: [-17, 10, 52], look: [0, 9, 0], fov: 42 };
  C.ciudad = { pos: [48, 72, 125], look: [0, 10, -10], fov: 34 };
  C.calle = { pos: [-14, 2.2, 36], look: [0, 7, 0], fov: 40 };
  C.calleLarga = { pos: [-62, 3.2, 9], look: [30, 4, 4], fov: 30 };
  C.edificio = { pos: [0, 11.5, 84], look: [0, 10.8, 0], fov: 30 };
  C.edificioContrapicado = { pos: [10, 1.2, 22], look: [-1, 12, 0], fov: 55 };
  C.casaMunecas = { pos: [0, 32, 100], look: [0, 10.5, 0], ortho: 15.5 };
  C.casaMunecasVertical = { pos: [0, 32, 100], look: [0, 10.5, 0], ortho: 22 };
  C.fachadaCerrada = C.edificio;
  C.azotea = { pos: [-6, ROOF + 1.7, 12], look: [-3, ROOF + 1.1, -1], fov: 40 };
  C.azoteaVista = { pos: [-2, ROOF + 1.8, -1.2], look: [-2, ROOF + 1.0, 45], fov: 50 };
  C.escalera = { pos: [-0.4, Y(2) + 3, 16], look: [-0.4, Y(2) + 3, 0], fov: 34 };
  C.escaleraSubiendo = { pos: [-2.3, Y(1) + 1.2, -0.9], look: [0.4, Y(2) - 0.2, -1.1], fov: 70 };
  C.escaleraTresCuartos = { pos: [5.5, Y(2) + 2.2, 9], look: [-0.4, Y(2) + 1.8, -1.0], fov: 38 };
  C.escaleraBajando = { pos: [0.7, Y(3) + 1.7, -1.1], look: [-1.7, Y(2) + 0.6, -1.1], fov: 58 };
  C.recibidor = { pos: [-1.0, 1.7, -6.5], look: [1.2, 1.3, -1.0], fov: 62 };
  C.ascensorDentro = { pos: [cx + 0.05, Y(3) + 1.45, -1.55], look: [cx - 0.02, Y(3) + 1.12, -3.5], fov: 64 };
  C.ascensorDentroTresCuartos = { pos: [cx - 0.45, Y(3) + 1.5, -2.0], look: [cx + 0.45, Y(3) + 1.0, -3.3], fov: 76 };
  C.ascensorFuera = { pos: [-1.2, Y(3) + 1.6, -6.4], look: [cx, Y(3) + 1.2, -3.7], fov: 62 };
  C.ascensorCorte = { pos: [cx - 0.4, Y(3) + 1.6, 12], look: [cx - 0.4, Y(3) + 1.2, 0], fov: 30 };
  C.sotanoBicis = { pos: [-10.2, Y(-1) + 1.5, -0.7], look: [-3.5, Y(-1) + 0.9, -5], fov: 72 };
  C.sotanoLavanderia = { pos: [10.2, Y(-1) + 1.5, -0.7], look: [3.5, Y(-1) + 0.9, -5], fov: 72 };
  C.entornoAlto = { pos: [-22, 15, 45], look: [0, 8, 0], fov: 44 };
  C.calleMov = { pos: [-24, 5.5, 26], look: [4, 2.6, 5], fov: 40 };
  // ---- zoom chain: city -> street -> building -> floor -> room ----
  C['zoom-1-ciudad'] = C.ciudad; C['zoom-2-calle'] = C.calle; C['zoom-3-edificio'] = C.edificio;
  C['zoom-4-planta'] = { pos: [-6.5, Y(3) + 3, 44], look: [-6.5, Y(3) + 2.5, 0], fov: 22 };
  C['zoom-5-sala'] = { pos: [-4.85, Y(3) + 1.7, 15], look: [-4.85, Y(3) + 1.4, -3], fov: 29 };
  // ---- per home: three cameras INSIDE the main room at eye height (cutaway must include the home, or use roomLight for closed facades) ----
  Object.values(anchors).forEach((a) => {
    const y0 = a.y, id = a.home, w = a.w, x0 = a.x - w / 2, x1 = a.x + w / 2, eye = y0 + 1.5, wide = w > 6;
    const vf = wide ? 74 : 66;
    C[id + '-frente'] = { pos: [a.x, eye, -0.55], look: [a.x, y0 + 1.15, -7], fov: vf };                                       // from the open front, looking into the room
    C[id + '-tresCuartos'] = { pos: [x0 + 0.5, eye + 0.1, -0.7], look: [x1 - (wide ? 2.5 : 0.7), y0 + 0.95, -5.6], fov: vf + 4 }; // from a front corner across the room
    const L = a.coreX != null && a.coreX < a.x && Math.abs(a.coreX - x0) < 0.6, Rr = a.coreX != null && a.coreX > a.x && Math.abs(a.coreX - x1) < 0.6;
    if (L) C[id + '-puerta'] = { pos: [x0 + 0.3, eye + 0.05, -5.85], look: [x1 - 0.3, y0 + 1.0, -2.2], fov: vf };               // standing in the doorway, looking in
    else if (Rr) C[id + '-puerta'] = { pos: [x1 - 0.3, eye + 0.05, -5.85], look: [x0 + 0.3, y0 + 1.0, -2.2], fov: vf };
    else C[id + '-puerta'] = { pos: [x1 - 0.5, eye + 0.05, -6.5], look: [x0 + 0.5, y0 + 1.0, -2.2], fov: vf };
  });
  C['zoom-5-sala'] = C['p3-nina-frente'];
  return C;
}

export function build(scene, opts = {}) {
  const o = { cutaway: true, street: true, neighbours: true, skyline: true, residents: true, ...opts };
  const root = tag(new THREE.Group(), 'mundo-edificio'); scene.add(root);
  scene.background = new THREE.Color(...Array(3).fill(SKY[o.mood] ?? SKY.dia));
  const b = buildBuilding(root, o);
  const e = buildEntorno(root, o);
  const m = buildMovers(root, o);
  if (!o.street && !o.cutaway) { block(0, -0.12, 2.0, 160, 0.12, 4.0, T.light); }
  if (o.cutaway) { const fl = new THREE.DirectionalLight(0xffffff, { dia: 1.0, tarde: 0.8, noche: 0.12 }[o.mood || 'dia']); fl.position.set(2, 14, 60); root.add(fl); }
  (o.roomLight || []).forEach((id) => { const a = b.anchors[id]; if (a) root.add(lamp(a.x, a.y + 2.5, -3.2, 16, 14)); });
  if (o.mood === 'noche') { b.anchorsLit = true; root.add(lamp(0, 2.2, -4.5, 7, 9)); root.add(lamp(-6, 10, -3, 5, 8)); }
  const cameras = cameraSet(b.anchors);
  return { cameras, anchors: b.anchors, homes: HOMES.map((h) => h.id), spaces: SPACES.map((h) => h.id), cast: CAST, edificio: b, entorno: e, mov: m, root };
}

export function update(t, scene, built) {
  built.edificio.update(t);
  built.mov.update(t, { hoist: built.entorno.hoist, windmill: built.entorno.windmill });
}
