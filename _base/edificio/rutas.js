// Walking routes through the GM building (stairs, landings, roof). Pure functions, world metres, y = height of the FEET.
// Geometry comes from medidas.js and from edificio.js flight(): 13 steps per storey; the flights alternate direction and are
// stacked in plan (a "scissor" stair): flight s climbs from Y(s) to Y(s+1) along x, direction +x when (s+1) is even.
// Tread i of flight s: centre x = xa + d*run*(i+0.5), top y = Y(s) + rise*(i+1). The slab holes leave the whole strip open,
// so one steps off the top tread towards -z onto the landing slab (z < STAIR.z0). The railing is on the +z side (z1).
// Door of a home onto the landing: core wall at x = +-2.5, gap z -6.3..-5.4 (viviendas.js wallAt gap [-D+0.7, -D+1.6]).
import { D, H, Y, ROOF, CORE, STAIR } from './medidas.js';

const N = 13, RUN = (STAIR.x1 - STAIR.x0) / N, RISE = H / N;       // same numbers as edificio.js flight()
const ZC = -1.1;                                                     // walking lane on the flights (0.65 from the open edge, 0.61 from the railing)
const ZL = -2.1;                                                     // first row of the landing slab behind the stair void (void edge z = -1.75)
const HUB_Z = -4.4;                                                  // common landing in front of the lift doors (lift occupies x 1.0..2.4, z -3.7..-2.0)
const DOOR_Z = -D + 1.15;                                            // middle of the door gap in the core wall (-6.3..-5.4)
const DOOR_X = CORE.x1 - 0.45;                                       // standing spot on the landing, 0.45 m from the core wall
// Homes with a door onto the landing: [id, storey, coreX] copied from viviendas.js HOMES (p3-vecina has coreX null: no door). viviendas.js imports three, so it is not imported here.
const DOORS = [['p1-abuela', 1, -2.5], ['p1-abuelo', 1, 2.5], ['p2-pareja', 2, -2.5], ['p2-estudiante', 2, 2.5], ['p3-nina', 3, -2.5], ['p3-chico', 3, 2.5],
  ['p4-teletrabajo', 4, -2.5], ['p4-bebe', 4, 2.5], ['p5-viajera', 5, -2.5], ['p5-plantera', 5, 2.5]];
const dirOf = (s) => (((s + 1) % 2) === 0 ? 1 : -1);                 // edificio.js flight(): dir
const xaOf = (s) => (dirOf(s) > 0 ? STAIR.x0 : STAIR.x1);
const xbOf = (s) => (dirOf(s) > 0 ? STAIR.x1 : STAIR.x0);
const bottom = (s) => ({ p: [xaOf(s) + dirOf(s) * RUN * 0.5, Y(s) + RISE, ZC], fl: s });   // centre of tread 0
const top = (s) => ({ p: [xbOf(s) - dirOf(s) * RUN * 0.5, Y(s + 1), ZC], fl: s });         // centre of tread 12
const nd = (x, y, z) => ({ p: [x, y, z], fl: null });
const mouthX = (f) => { const s = f - 1; return xbOf(s) - dirOf(s) * RUN * 0.5; };         // x where flight f-1 ends / flight f starts

const ROOF_E = [1.5, ROOF, -1.1];   // terrace just past the stair void, east side (flight 5 ends at x = 0.9)
const SPOTS = (() => {
  const S = { portal: { p: [3.0, Y(0), -0.7], level: 0 } };           // just inside the street door (facade door at x = 3.0)
  for (let f = 1; f <= 5; f++) S['rellano-' + f] = { p: [0, Y(f), HUB_Z], level: f };
  for (const [id, st, cx] of DOORS) S['puerta-' + id] = { p: [Math.sign(cx) * DOOR_X, Y(st), DOOR_Z], level: st };
  S['puerta-azotea'] = { p: ROOF_E, level: 6 };
  S.azotea = { p: [3.5, ROOF, -1.0], level: 6 };
  S.atico = { p: [3.5, ROOF, -3.2], level: 6 };   // drying attic, east of the lift. NOTE: the knee wall at z = -2 has no door yet
  return S;
})();

export function puntos() { const o = {}; for (const k in SPOTS) o[k] = SPOTS[k].p.slice(); return o; }

// nodes from a spot to the stair mouth of its level
function toStairs(name) {
  const sp = SPOTS[name], f = sp.level, out = [nd(...sp.p)];
  if (f === 0) { out.push(nd(1.4, Y(0), ZC)); return out; }
  if (f === 6) {
    if (name === 'atico') out.push(nd(3.5, ROOF, -2.0), nd(3.5, ROOF, ZC));
    if (name === 'azotea' || name === 'atico') out.push(nd(ROOF_E[0], ROOF, ZC));
    return out;                                                      // puerta-azotea is already the mouth
  }
  if (name !== 'rellano-' + f) out.push(nd(0, Y(f), HUB_Z));
  const s = f - 1, xs = mouthX(f);
  out.push(nd(xs - dirOf(s) * 0.3, Y(f), -2.7), nd(xs, Y(f), ZL));
  return out;
}

function dedupe(list) {
  const o = [];
  for (const n of list) { const l = o[o.length - 1]; if (l && l.fl === n.fl && Math.hypot(l.p[0] - n.p[0], l.p[1] - n.p[1], l.p[2] - n.p[2]) < 1e-6) continue; o.push(n); }
  return o;
}

function nodesUp(a, b) {
  const la = SPOTS[a].level, lb = SPOTS[b].level, out = toStairs(a);
  for (let s = la; s < lb; s++) {
    out.push(bottom(s), top(s));
    if (s + 1 < lb) out.push(nd(mouthX(s + 1), Y(s + 1), ZL));       // turn on the landing between two flights
  }
  out.push(...toStairs(b).reverse());                                 // from the mouth of the last level to the spot
  return out;
}

export function subir(desde, hasta) {
  if (!SPOTS[desde]) throw new Error('rutas: unknown spot ' + desde);
  if (!SPOTS[hasta]) throw new Error('rutas: unknown spot ' + hasta);
  const la = SPOTS[desde].level, lb = SPOTS[hasta].level;
  let nodes;
  if (desde === hasta) nodes = [nd(...SPOTS[desde].p)];
  else if (la === lb) {
    const A = toStairs(desde), B = toStairs(hasta);
    if (la >= 1 && la <= 5) { const hubA = A.slice(0, desde === 'rellano-' + la ? 1 : 2), hubB = B.slice(0, hasta === 'rellano-' + la ? 1 : 2); nodes = [...hubA, ...hubB.reverse()]; }
    else nodes = [...A, ...B.reverse()];
  } else if (la < lb) nodes = nodesUp(desde, hasta);
  else nodes = nodesUp(hasta, desde).reverse();
  nodes = dedupe(nodes);
  const r = nodes.map((n) => n.p.map((v) => Math.round(v * 1e4) / 1e4));
  Object.defineProperty(r, 'vuelos', { value: nodes.map((n) => n.fl), enumerable: false });   // flight number per waypoint (null = flat)
  return r;
}

export function tramos(ruta) {
  const out = [];
  for (let i = 0; i + 1 < ruta.length; i++) {
    const fa = ruta.vuelos ? ruta.vuelos[i] : null, fb = ruta.vuelos ? ruta.vuelos[i + 1] : null;
    const esc = fa != null && fa === fb;
    const seg = { de: ruta[i], a: ruta[i + 1], escalera: esc };
    if (esc) seg.vuelo = fa;
    out.push(seg);
  }
  return out;
}

// Extras. largo(ruta): length in m. posicion(ruta, d): point at distance d from the start with the feet snapped to the treads
// -> { p:[x,y,z], yaw (rotation.y to face the walking direction), escalera, vuelo }
export function largo(ruta) { return tramos(ruta).reduce((s, t) => s + Math.hypot(t.a[0] - t.de[0], t.a[1] - t.de[1], t.a[2] - t.de[2]), 0); }
export function posicion(ruta, d) {
  const T = tramos(ruta); let acc = 0;
  if (!T.length) return { p: ruta[0].slice(), yaw: 0, escalera: false };
  for (let i = 0; i < T.length; i++) {
    const t = T[i], dx = t.a[0] - t.de[0], dy = t.a[1] - t.de[1], dz = t.a[2] - t.de[2], L = Math.hypot(dx, dy, dz);
    if (d <= acc + L || i === T.length - 1) {
      const k = L ? Math.min(1, Math.max(0, (d - acc) / L)) : 0;
      const p = [t.de[0] + dx * k, t.de[1] + dy * k, t.de[2] + dz * k];
      if (t.escalera) { const s = t.vuelo, i0 = Math.min(N - 1, Math.max(0, Math.floor(Math.abs(p[0] - xaOf(s)) / RUN))); p[1] = Y(s) + RISE * (i0 + 1); }
      return { p, yaw: Math.atan2(dx, dz), escalera: t.escalera, vuelo: t.vuelo };
    }
    acc += L;
  }
}
