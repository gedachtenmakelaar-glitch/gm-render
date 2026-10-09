// Street, canal, neighbours and skyline around the GM building (owner: edificio agent). All Dutch: brick paving, red bike lane (orange accent),
// parked bikes, tram line, canal with railing and boat, a narrow canal house with a bell gable + hoist beam, an old crooked step-gable house, a skyline on the 'fondo' layer.
// buildEntorno(parent, opts) -> { group, hoist, windmill, lamps }.  opts: {mood, farHouses:false, street:true, neighbours:true, skyline:true}
import { THREE, TONE as T, silueta, mat, box, block, cyl, sphere, plane, extrude, lathe, tag, inkLine, lamp, rng } from '../motor/gm3d.js';
import * as F from './muebles.js';
import { person } from '../motor/personas.js';

const add = (g, m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
const cy = (g, r, h, x, y0, z, t = T.mid, o) => add(g, cyl(r, r, h, t, { seg: 16, ...o }), x, y0 + h / 2, z);
const blk = (g, w, h, d, x, y0, z, t = T.mid, o) => add(g, box(w, h, d, t, o), x, y0 + h / 2, z);
export const STREET = { walk: [0, 2.6], bike: [2.6, 4.4], road: [4.4, 12], quay: [12, 13.6], canal: [13.6, 21], far: [21, 24], rail: [7.9, 8.5], laneNear: 5.7, laneFar: 10.9, tram: 8.2, bikeA: 3.1, bikeB: 3.9, water: -0.75 };

// gable outlines: half-profile [dx, y] from the base corner to the top centre, for a house 5 m wide (x scaled to the real width)
const HALF = {
  bell: [[2.5, 0], [2.5, 0.35], [2.15, 0.75], [1.8, 1.0], [1.75, 1.4], [1.95, 1.8], [1.8, 2.2], [1.45, 2.6], [1.0, 2.9], [0.5, 3.1], [0, 3.15]],
  step: [[2.5, 0], [2.5, 0.8], [2.0, 0.8], [2.0, 1.4], [1.5, 1.4], [1.5, 2.0], [1.0, 2.0], [1.0, 2.6], [0, 2.6]],
  neck: [[2.5, 0], [2.5, 0.6], [1.6, 1.0], [1.0, 1.3], [1.0, 2.8], [0.6, 3.0], [0, 3.0]],
  spout: [[2.5, 0], [2.5, 0.4], [0, 2.4]],
  flat: [[2.5, 0], [2.5, 0.5], [0, 0.5]],
};
export function gablePoly(kind, w) { const k = w / 5, R = HALF[kind].map(([dx, y]) => [dx * k, y * Math.min(1.1, k)]); return [...R, ...R.slice(0, -1).reverse().map(([dx, y]) => [-dx, y])]; }

// casa({x0, w, floors, depth, gable, tone, seed, detail, shop}) a brick house with windows, door, gable and a pitched roof body behind. Facade at z = 0.
export function casa(parent, o) {
  const g = tag(new THREE.Group(), o.name || 'casa'); parent.add(g);
  const w = o.w, x0 = o.x0, fl = o.floors, SH = 3.2, hh = fl * SH + 0.3, cx = x0 + w / 2, r = rng(o.seed ?? 1), tone = o.tone ?? T.mid, depth = o.depth ?? 12;
  const holes = [], wins = [];
  for (let f = 0; f < fl; f++) {
    const n = Math.max(1, Math.round(w / 2.5)), y = f * SH + (f === 0 ? 1.0 : 0.9) + 0.3;
    for (let i = 0; i < n; i++) { const x = x0 + (i + 0.5) * w / n; if (f === 0 && i === 0 && !o.noDoor) { wins.push({ x, y: 0.3, w: 1.0, h: 2.3, door: true }); continue; } wins.push({ x, y, w: 0.95, h: 1.7 + (f === fl - 1 ? 0 : 0.1) }); }
  }
  wins.forEach((q) => holes.push([[q.x - q.w / 2, q.y], [q.x + q.w / 2, q.y], [q.x + q.w / 2, q.y + q.h], [q.x - q.w / 2, q.y + q.h]]));
  const body = extrude([[x0, 0], [x0 + w, 0], [x0 + w, hh], [x0, hh]], 0.4, tone, { holes }); body.position.z = -0.4; g.add(body);
  const gp = gablePoly(o.gable ?? 'flat', w), gb = extrude(gp, 0.4, tone); gb.position.set(cx, hh, -0.4); g.add(gb);
  blk(g, w + 0.2, 0.18, 0.5, cx, hh - 0.2, 0.05, T.dark);                                                  // cornice
  blk(g, w - 0.04, hh + 1.2, depth, cx, 0, -depth / 2 - 0.4, T.light);                                   // house body (side walls show tone light)
  { const rr = extrude([[-w / 2 + 0.05, 0], [w / 2 - 0.05, 0], [0, w * 0.35]], depth - 0.4, T.dark); rr.position.set(cx, hh + 1.2, -depth - 0.4 + 0.0); rr.rotation.y = 0; g.add(rr); }
  if (o.detail !== false) {
    wins.forEach((q) => {
      if (q.door) { blk(g, q.w, q.h, 0.1, q.x, q.y, -0.1, T.ink); blk(g, q.w + 0.3, 0.12, 0.3, q.x, q.y + q.h, 0.0, T.paper); blk(g, q.w + 0.5, 0.15, 0.7, q.x, 0, 0.35, T.light); return; }
      blk(g, q.w, 0.06, 0.14, q.x, q.y, -0.1, T.paper); blk(g, q.w, 0.06, 0.14, q.x, q.y + q.h - 0.06, -0.1, T.paper); blk(g, 0.06, q.h, 0.14, q.x - q.w / 2 + 0.03, q.y, -0.1, T.paper); blk(g, 0.06, q.h, 0.14, q.x + q.w / 2 - 0.03, q.y, -0.1, T.paper);
      blk(g, 0.04, q.h, 0.08, q.x, q.y, -0.1, T.paper); blk(g, q.w, 0.04, 0.08, q.x, q.y + q.h * 0.62, -0.1, T.paper); blk(g, q.w + 0.2, 0.06, 0.22, q.x, q.y - 0.06, 0.04, T.light); blk(g, q.w + 0.2, 0.12, 0.16, q.x, q.y + q.h + 0.02, 0.0, T.dark);
      if (r() < 0.5) { const c = F.curtain({ w: q.w - 0.1, h: q.h - 0.2, tone: [T.light, T.pale, T.dark][Math.floor(r() * 3)], open: true }); c.position.set(q.x, q.y + q.h, -0.2); g.add(c); }
      else if (r() < 0.3) { blk(g, q.w, 0.14, 0.2, q.x, q.y, 0.14, T.mid); for (let k = 0; k < 3; k++) add(g, sphere(0.08, T.dark, { seg: 8 }), q.x - 0.3 + k * 0.3, q.y + 0.2, 0.14); }
    });
  }
  return g;
}

// paving lines (brick pattern): serpentine ink line over a rectangle [x0,x1] x [z0,z1] at height y
function pave(g, x0, x1, z0, z1, y, step = 0.55) {
  const p = []; let dir = 1; for (let z = z0; z <= z1 + 0.001; z += step) { p.push(dir > 0 ? [x0, y, z] : [x1, y, z], dir > 0 ? [x1, y, z] : [x0, y, z]); dir = -dir; } g.add(inkLine(p));
  const q = []; dir = 1; for (let x = x0; x <= x1; x += step * 1.8) { q.push(dir > 0 ? [x, y, z0] : [x, y, z1], dir > 0 ? [x, y, z1] : [x, y, z0]); dir = -dir; } g.add(inkLine(q));
}

// tree({size, seed}) simple Dutch street tree: planter, trunk and a layered canopy (three flattened lobes, outlined)
export function tree(o = {}) {
  const s = o.size ?? 1, g = tag(new THREE.Group(), 'calle:arbol'), r = rng(o.seed ?? 3);
  blk(g, 0.9, 0.12, 0.9, 0, 0, 0, T.dark);
  const trunk = cyl(0.1 * s, 0.17 * s, 3.4 * s, T.ink, { seg: 10 }); trunk.position.set(0, 1.7 * s, 0); g.add(trunk);
  F.tube(g, [0, 2.8 * s, 0], [0.7 * s, 3.9 * s, 0.1], 0.04 * s, T.ink); F.tube(g, [0, 2.6 * s, 0], [-0.8 * s, 3.8 * s, -0.1], 0.04 * s, T.ink);
  [[0, 4.4, 0, 1.7, T.dark], [-1.0, 3.9, 0.2, 1.25, T.mid], [1.05, 4.0, -0.1, 1.3, T.mid], [0.1, 5.3, 0, 1.2, T.light], [-0.5, 5.0, 0.5, 0.9, T.dark]].forEach(([x, y, z, rad, t], i) => {
    const b = sphere(rad * s, t, { seg: 14 }); b.scale.set(1.15, 0.78, 1.0); b.position.set(x * s + (r() - 0.5) * 0.2, y * s, z * s); silueta(b, 0.05 * s); g.add(b); });
  return g;
}
function streetLamp(g, x, z, rot, night) {
  const l = tag(new THREE.Group(), 'calle:farola');
  cy(l, 0.09, 0.2, 0, 0, 0, T.ink); const pole = cyl(0.05, 0.08, 5.0, T.ink, { seg: 10 }); add(l, pole, 0, 2.6, 0);
  F.tube(l, [0, 5.0, 0], [0.9, 5.3, 0], 0.035, T.ink); const head = cyl(0.12, 0.28, 0.3, T.dark, { seg: 12 }); add(l, head, 1.0, 5.3, 0);
  add(l, sphere(0.16, T.pale, { accent: night, seg: 10 }), 1.0, 5.1, 0);
  l.position.set(x, 0, z); l.rotation.y = rot; g.add(l); return l;
}
const BIN = (g, x, z, t = T.dark) => { const b = cyl(0.3, 0.3, 0.9, t, { seg: 14 }); add(g, b, x, 0.45, z); add(g, cyl(0.32, 0.32, 0.08, T.ink, { seg: 14 }), x, 0.94, z); };

export function buildEntorno(parent, opts = {}) {
  const root = tag(new THREE.Group(), 'entorno'); parent.add(root);
  const night = opts.mood === 'noche', out = { group: root, lamps: [] }, S = STREET;
  const X0 = -75, X1 = 75, LX = X1 - X0, CXm = (X0 + X1) / 2;
  if (opts.street !== false) {
    const st = tag(new THREE.Group(), 'calle'); root.add(st);
    // ground: sidewalk (brick), red bike lane (accent), road, quay, canal, far bank
    blk(st, LX, 0.12, S.walk[1] - S.walk[0], CXm, -0.12, (S.walk[0] + S.walk[1]) / 2, T.light); pave(st, X0, X1, 0.1, S.walk[1], 0.002, 0.6);
    blk(st, LX, 0.1, S.bike[1] - S.bike[0], CXm, -0.12, (S.bike[0] + S.bike[1]) / 2, T.mid, { accent: opts.bikeLaneAccent !== false });
    blk(st, LX, 0.14, S.road[1] - S.road[0], CXm, -0.2, (S.road[0] + S.road[1]) / 2, T.mid);
    for (let x = X0; x < X1; x += 4) blk(st, 1.8, 0.01, 0.12, x + 1, -0.065, (S.laneNear + S.laneFar) / 2 + 0.0, T.pale, { line: false });
    // tram rails
    for (const z of [S.rail[0], S.rail[1]]) blk(st, LX, 0.06, 0.07, CXm, -0.066, z, T.light); for (let x = X0; x < X1; x += 1.0) blk(st, 0.12, 0.03, 0.9, x, -0.066, 8.2, T.ink, { line: false });
    blk(st, LX, 0.14, S.quay[1] - S.quay[0], CXm, -0.14, (S.quay[0] + S.quay[1]) / 2, T.light); pave(st, X0, X1, S.quay[0], S.quay[1], 0.002, 0.6);
    blk(st, LX, 1.2, 0.3, CXm, -1.4, S.canal[0] + 0.0, T.mid);                                                // quay wall
    const wat = blk(st, LX, 2.4, S.canal[1] - S.canal[0], CXm, -3.15, (S.canal[0] + S.canal[1]) / 2, T.pale);   // water (top at y -0.75)
    for (let z = 14.3; z < 20.8; z += 0.8) { const p = []; for (let x = X0; x < X1; x += 1.0) p.push([x, -0.745, z + 0.12 * Math.sin(x * 1.7 + z * 3)]); st.add(inkLine(p)); }
    blk(st, LX, 1.4, S.far[1] - S.far[0], CXm, -1.4, (S.far[0] + S.far[1]) / 2, T.light); blk(st, LX, 0.1, S.far[1] - S.far[0], CXm, -0.1, (S.far[0] + S.far[1]) / 2, T.light);
    pave(st, X0, X1, S.far[0], S.far[1], 0.0, 0.7);
    // quay railing (posts + rail) and rail-locked bikes
    const rl = tag(new THREE.Group(), 'calle:barandilla'); st.add(rl); F.tube(rl, [X0, 1.0, 13.45], [X1, 1.0, 13.45], 0.03, T.ink); F.tube(rl, [X0, 0.55, 13.45], [X1, 0.55, 13.45], 0.015, T.ink);
    for (let x = X0; x <= X1; x += 1.5) F.tube(rl, [x, 0, 13.45], [x, 1.0, 13.45], 0.03, T.ink);
    // street furniture: lamps, trees, bins, bench, bike racks with parked bikes, tram-stop shelter, bollards
    [-33, -18, 12, 30].forEach((x, i) => { const l = streetLamp(st, x, 2.5, Math.PI, night); if (night) out.lamps.push(lamp(x - 1.0, 5.1, 2.5, 10, 12)); });
    [-24, -13.6, 14.2, 26].forEach((x, i) => { const t = tree({ size: 0.9 + (i % 2) * 0.2, seed: i + 2 }); t.position.set(x, 0, 2.2); st.add(t); });
    [[-1.2, 1.3, T.dark], [-0.6, 1.3, T.mid], [11.8, 1.3, T.dark]].forEach(([x, z, t]) => BIN(st, x, z, t));
    { const bn = F.bench({ w: 1.7 }); bn.position.set(-6.3, 0, 1.5); st.add(bn); const bn2 = F.bench({ w: 1.7 }); bn2.position.set(-3.0, 0, 12.7); bn2.rotation.y = Math.PI; st.add(bn2); }
    // bikes: against the facade, in a rack, and locked to the quay railing
    const rb = rng(31), bikeTones = [T.dark, T.mid, T.ink, T.light];
    const bikeRow = (x0, x1, z, step, rot, name) => { const g = tag(new THREE.Group(), name); for (let x = x0, i = 0; x < x1; x += step, i++) { const b = F.bike({ tone: bikeTones[(i + Math.floor(rb() * 3)) % 4], basket: rb() > 0.3 }); b.position.set(x, 0, z + (rb() - 0.5) * 0.15); b.rotation.y = rot + (i % 3 === 0 ? 0.5 : (i % 3 === 1 ? -0.4 : 0.1)); g.add(b); } st.add(g); return g; };
    bikeRow(-10.4, -4.6, 1.3, 0.62, 0.0, 'calle:bicis-fachada-izq'); bikeRow(4.9, 10.8, 1.3, 0.66, 0.0, 'calle:bicis-fachada-der');
    bikeRow(-30, -14, 1.2, 0.9, 1.57, 'calle:bicis-fila-izq'); bikeRow(14, 30, 1.2, 0.9, 1.57, 'calle:bicis-fila-der'); bikeRow(-22, -8, 12.9, 0.85, 1.57, 'calle:bicis-barandilla');
    { const rk = tag(new THREE.Group(), 'calle:soporte-bicis'); for (let x = -30; x < -14; x += 0.9) F.tube(rk, [x, 0, 0.6], [x, 0.7, 0.6], 0.02, T.ink); F.tube(rk, [-30, 0.7, 0.6], [-14, 0.7, 0.6], 0.02, T.ink); st.add(rk); }
    // tram-stop shelter (roof + three glass panels + bench) on the sidewalk
    { const sh = tag(new THREE.Group(), 'calle:parada'); blk(sh, 3.2, 0.1, 1.1, 0, 2.4, 0, T.dark); for (const x of [-1.5, 1.5]) blk(sh, 0.06, 2.4, 0.06, x, 0, -0.5, T.ink); blk(sh, 3.0, 1.6, 0.03, 0, 0.5, -0.52, T.pale, { line: false }); const bn = F.bench({ w: 1.6 }); bn.position.set(0, 0, -0.3); sh.add(bn); sh.position.set(-43, 0, 1.2); st.add(sh); }
    out.hasStreet = true;
  }
  if (opts.neighbours !== false) {
    const nb = tag(new THREE.Group(), 'vecinos'); root.add(nb);
    // left: narrow canal house with bell gable and hoist beam
    const cl = casa(nb, { name: 'vecino:casa-canal', x0: -16.2, w: 5.0, floors: 4, gable: 'bell', tone: T.mid, seed: 5, depth: 14 });
    const top = 4 * 3.2 + 0.3 + 3.15, cxl = -13.7;
    blk(cl, 0.22, 0.22, 1.7, cxl, top - 0.5, 0.75, T.dark); const pul = cyl(0.14, 0.14, 0.12, T.ink, { seg: 12 }); add(cl, pul, cxl, top - 0.5, 1.55).rotation.z = Math.PI / 2;
    const piv = tag(new THREE.Group(), 'vecino:cuerda-sillon'); piv.position.set(cxl, top - 0.6, 1.55); cl.add(piv); piv.add(inkLine([[0, 0, 0], [0, -3.0, 0]])); piv.add(inkLine([[-0.3, -3.0, 0], [0.3, -3.0, 0], [0, -2.5, 0], [-0.3, -3.0, 0]]));
    const ch = F.armchair({ tone: T.light, tall: true }); ch.position.set(0, -3.55, 0); ch.rotation.y = 0.5; piv.add(ch); out.hoist = piv;   // an armchair being hoisted through the window (humour); swings in update()
    // right: small old crooked house with step gable
    const cr = casa(nb, { name: 'vecino:casa-antigua', x0: 11.25, w: 5.4, floors: 3, gable: 'step', tone: T.light, seed: 9, depth: 11 });
    cr.rotation.z = 0.012; cr.position.x -= 0.15;
    // further houses: row to the left and to the right
    const kinds = ['neck', 'bell', 'step', 'spout', 'neck', 'flat'], rr = rng(77);
    let x = -16.2; for (let i = 0; i < 9; i++) { const w = 4.4 + Math.floor(rr() * 3) * 0.7, fl = 3 + Math.floor(rr() * 3); x -= w; casa(nb, { name: 'vecino:casa-i' + i, x0: x, w, floors: fl, gable: kinds[i % 6], tone: [T.mid, T.light, T.pale][i % 3], seed: 20 + i, depth: 12, detail: i < 4, noDoor: false }); }
    x = 16.65; for (let i = 0; i < 9; i++) { const w = 4.4 + Math.floor(rr() * 3) * 0.7, fl = 3 + Math.floor(rr() * 3); casa(nb, { name: 'vecino:casa-d' + i, x0: x, w, floors: fl, gable: kinds[(i + 2) % 6], tone: [T.light, T.mid, T.pale][i % 3], seed: 40 + i, depth: 12, detail: i < 4 }); x += w; }
  }
  if (opts.skyline !== false) {
    const sk = tag(new THREE.Group(), 'fondo:ciudad', 'fondo'); root.add(sk);
    // back ground and a row of far houses behind the building (z = -30...-60), a church tower, gasometer-free skyline, a windmill and far trees
    blk(sk, 400, 0.1, 160, 0, -0.2, -80, T.pale, { line: false });
    const r = rng(101);
    for (let row = 0; row < 2; row++) { let x = -140; while (x < 140) { const w = 5 + Math.floor(r() * 4), fl = 3 + Math.floor(r() * 5); const c = casa(sk, { name: 'fondo:casa', x0: x, w, floors: fl, gable: ['bell', 'step', 'neck', 'flat', 'spout'][Math.floor(r() * 5)], tone: row ? T.pale : T.light, seed: Math.floor(r() * 99), depth: 8, detail: false, noDoor: true }); c.position.z = -34 - row * 24; c.position.y = row ? 0 : 0; x += w + 0.2; } }
    // church tower with a spire and a clock (no numbers)
    { const ch = tag(new THREE.Group(), 'fondo:iglesia'); blk(ch, 6, 28, 6, 0, 0, 0, T.mid); blk(ch, 6.6, 1.0, 6.6, 0, 28, 0, T.dark); blk(ch, 4.4, 6, 4.4, 0, 29, 0, T.light);
      for (const [x, z] of [[-2.1, 2.2], [2.1, 2.2]]) blk(ch, 0.9, 2.4, 0.2, x, 31, z, T.ink); const cl = cyl(1.0, 1.0, 0.15, T.paper, { seg: 24 }); add(ch, cl, 0, 20, 3.1).rotation.x = Math.PI / 2; blk(ch, 0.1, 0.8, 0.05, 0, 20, 3.2, T.ink);
      const sp = cyl(0, 2.7, 9, T.dark, { seg: 4 }); sp.rotation.y = Math.PI / 4; add(ch, sp, 0, 38.5, 0); F.tube(ch, [0, 43, 0], [0, 46, 0], 0.07, T.ink); ch.position.set(-34, 0, -55); sk.add(ch);
      const nave = blk(sk, 12, 12, 24, -34, 0, -73, T.light); }
    // windmill
    { const wm = tag(new THREE.Group(), 'fondo:molino'); const tw = cyl(2.4, 4.2, 14, T.mid, { seg: 12 }); add(wm, tw, 0, 7, 0); const cap = cyl(0, 2.6, 2.4, T.dark, { seg: 12 }); add(wm, cap, 0, 15.2, 0);
      const rot = tag(new THREE.Group(), 'fondo:aspas'); rot.position.set(0, 13.2, 3.0); for (let i = 0; i < 4; i++) { const arm = new THREE.Group(); blk(arm, 0.3, 9.5, 0.2, 0, 0.5, 0, T.ink); blk(arm, 1.8, 6.5, 0.1, 1.1, 2.6, 0.12, T.pale); arm.rotation.z = i * Math.PI / 2; rot.add(arm); } wm.add(rot); wm.position.set(62, 0, -52); sk.add(wm); out.windmill = rot; }
    for (let i = 0; i < 20; i++) { const t = tree({ size: 1.5 + r() * 0.7, seed: i + 9 }); t.position.set(-120 + i * 12 + r() * 6, 0, -22 - r() * 6); sk.add(t); }
    // sun / moon (the sun is the orange disc of the sala-de-espera look; keep it small)
    if (night) { const m = sphere(5, T.paper, { seg: 24 }); m.position.set(40, 45, -130); sk.add(m); } else { const sn = cyl(8, 8, 0.4, T.pale, { seg: 32, accent: true }); sn.rotation.x = Math.PI / 2; sn.position.set(-52, 42, -140); sk.add(sn); }
  }
  if (opts.farHouses) {
    const fb = tag(new THREE.Group(), 'fondo:banco-lejano', 'fondo'); root.add(fb); const r = rng(55); let x = -70;
    while (x < 70) { const w = 4.6 + Math.floor(r() * 3), fl = 3 + Math.floor(r() * 3); const c = casa(fb, { name: 'lejano:casa', x0: x, w, floors: fl, gable: ['bell', 'step', 'neck', 'spout'][Math.floor(r() * 4)], tone: T.light, seed: Math.floor(r() * 90), depth: 8, detail: Math.abs(x) < 40 }); c.rotation.y = Math.PI; c.position.set(2 * x + w, 0, 28); fb.add(c); x += w + 0.3; }
  }
  return out;
}
