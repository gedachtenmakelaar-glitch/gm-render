// The GM apartment block (owner: edificio agent): 1920s-30s Amsterdam School brick portiek, ground floor + 5 floors + attic, basement.
// buildBuilding(parent, opts) -> { group, anchors, update(t), parts }.  opts: {cutaway: true|false|[homeIds], mood, residents}
import { THREE, TONE as T, flat, mat, box, block, cyl, sphere, plane, extrude, tag, inkLine, lamp, rng } from '../motor/gm3d.js';
import * as F from './muebles.js';
import { buildHome, windowsOf, HOMES, SPACES } from './viviendas.js';
import { XL, XR, D, WALL, SLAB, H, Y, CEIL, ROOF, CORE, ATTIC, LIFT, STAIR } from './medidas.js';

const add = (g, m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
const blk = (g, w, h, d, x, y0, z, t = T.mid, o) => add(g, box(w, h, d, t, o), x, y0 + h / 2, z);
const cy = (g, r, h, x, y0, z, t = T.mid, o) => add(g, cyl(r, r, h, t, { seg: 16, ...o }), x, y0 + h / 2, z);
const pane = (g, w, h, x, y, z, t, accent) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), flat(t, { accent, double: true })); m.position.set(x, y, z); g.add(m); return m; };
const SMOOTH = (x) => x * x * (3 - 2 * x);

// ---- floor slab with the stair and lift voids ----
function slab(g, s) {
  const holes = s >= 0 ? [
    [[STAIR.x0, -STAIR.z1], [STAIR.x1, -STAIR.z1], [STAIR.x1, -STAIR.z0], [STAIR.x0, -STAIR.z0]],
    [[LIFT.x0, -LIFT.z1], [LIFT.x1, -LIFT.z1], [LIFT.x1, -LIFT.z0], [LIFT.x0, -LIFT.z0]]] : [];
  const m = extrude([[XL, WALL], [XR, WALL], [XR, D], [XL, D]], SLAB, s === 6 ? T.light : T.pale, { holes });
  m.rotation.x = -Math.PI / 2; m.position.y = Y(s) - SLAB; g.add(m); return m;
}

// ---- stairs: one flight per storey, alternating direction (steep Dutch stairs), 13 steps, handrail on the open side ----
function flight(g, s) {
  const dir = ((s + 1) % 2 === 0) ? 1 : -1, n = 13, run = (STAIR.x1 - STAIR.x0) / n, rise = H / n, zc = (STAIR.z0 + STAIR.z1) / 2, wd = STAIR.z1 - STAIR.z0;
  const fg = tag(new THREE.Group(), 'escalera:tramo' + s); g.add(fg);
  for (let i = 0; i < n; i++) {
    const x = dir > 0 ? STAIR.x0 + run * (i + 0.5) : STAIR.x1 - run * (i + 0.5), y = Y(s) + rise * (i + 1);
    blk(fg, run + 0.01, 0.05, wd, x, y - 0.05, zc, T.pale); blk(fg, 0.02, rise, wd, x - dir * run / 2, y - rise, zc, T.mid, { line: false });
  }
  const len = Math.hypot(STAIR.x1 - STAIR.x0, H), ang = Math.atan2(H, STAIR.x1 - STAIR.x0) * dir;
  const st = box(len, 0.1, wd, T.dark); st.position.set((STAIR.x0 + STAIR.x1) / 2, Y(s) + H / 2 - 0.12, zc); st.rotation.z = ang; fg.add(st);
  const zr = STAIR.z1 - 0.04, xa = dir > 0 ? STAIR.x0 : STAIR.x1, xb = dir > 0 ? STAIR.x1 : STAIR.x0;
  F.tube(fg, [xa, Y(s) + 0.9, zr], [xb, Y(s) + H + 0.9, zr], 0.022, T.ink);
  for (let i = 0; i <= 6; i++) { const k = i / 6, x = xa + (xb - xa) * k, y = Y(s) + H * k; F.tube(fg, [x, y, zr], [x, y + 0.9, zr], 0.012, T.ink); }
  return fg;
}

// ---- lift: shaft walls with a door opening per storey + the cabin (open to +z so a camera sees inside) ----
function lift(g) {
  const lg = tag(new THREE.Group(), 'ascensor'); g.add(lg);
  const top = Y(5) + H + 0.3, bot = Y(-1) - SLAB, cx = (LIFT.x0 + LIFT.x1) / 2;
  blk(lg, 0.08, top - bot, LIFT.z1 - LIFT.z0, LIFT.x0, bot, (LIFT.z0 + LIFT.z1) / 2, T.light); blk(lg, 0.08, top - bot, LIFT.z1 - LIFT.z0, LIFT.x1, bot, (LIFT.z0 + LIFT.z1) / 2, T.light);
  for (let s = -1; s <= 5; s++) {
    const w = extrude([[LIFT.x0, 0], [LIFT.x1, 0], [LIFT.x1, H], [LIFT.x0, H]], 0.08, T.light, { holes: [[[cx - 0.5, SLAB], [cx + 0.5, SLAB], [cx + 0.5, SLAB + 2.15], [cx - 0.5, SLAB + 2.15]]] });
    w.position.set(0, Y(s) - SLAB, LIFT.z0 - 0.04); lg.add(w);
    blk(lg, 1.2, 0.05, 0.08, cx, Y(s) + 2.15, LIFT.z0 - 0.08, T.dark); blk(lg, 0.06, 2.15, 0.06, cx - 0.55, Y(s), LIFT.z0 - 0.08, T.dark); blk(lg, 0.06, 2.15, 0.06, cx + 0.55, Y(s), LIFT.z0 - 0.08, T.dark);
    blk(lg, 0.16, 0.34, 0.03, cx + 0.78, Y(s) + 0.95, LIFT.z0 - 0.095, T.ink); cy(lg, 0.03, 0.03, cx + 0.78, Y(s) + 1.12, LIFT.z0 - 0.12, T.pale, { accent: s === 3 }).rotation.x = Math.PI / 2; cy(lg, 0.03, 0.03, cx + 0.78, Y(s) + 1.0, LIFT.z0 - 0.12, T.pale).rotation.x = Math.PI / 2;
    for (const k of [-1, 1]) blk(lg, 0.5, 2.1, 0.04, cx + k * 0.255, Y(s), LIFT.z0 - 0.07, k < 0 ? T.light : T.paper); blk(lg, 0.02, 2.1, 0.05, cx, Y(s), LIFT.z0 - 0.07, T.ink, { line: false });
    for (let i = 0; i < 5; i++) cy(lg, 0.02, 0.02, cx - 0.2 + i * 0.1, Y(s) + 2.28, LIFT.z0 - 0.1, T.pale, { accent: i === Math.min(4, Math.max(0, s))}).rotation.x = Math.PI / 2;   // floor lamps above the door
  }
  // cabin: group origin at its floor; pos y animated. Open to +z. Back wall = sliding doors, right wall = mirror, left wall = button panel, handrail on 3 sides, lamp panel in the ceiling.
  const cab = tag(new THREE.Group(), 'ascensor:cabina'); lg.add(cab);
  const cw = 1.2, cd = 1.4, cz = (LIFT.z0 + LIFT.z1) / 2 - 0.05, ch = 2.2, zb = cz - cd / 2, xl = cx - cw / 2, xr = cx + cw / 2;
  blk(cab, cw, 0.08, cd, cx, 0, cz, T.dark);                                                        // floor
  { const p = []; let dir = 1; for (let z = zb + 0.12; z < cz + cd / 2; z += 0.23) { p.push(dir > 0 ? [xl + 0.03, 0.09, z] : [xr - 0.03, 0.09, z], dir > 0 ? [xr - 0.03, 0.09, z] : [xl + 0.03, 0.09, z]); dir = -dir; } cab.add(inkLine(p)); }
  blk(cab, cw, 0.08, cd, cx, ch, cz, T.paper); blk(cab, 0.5, 0.02, 0.5, cx, ch - 0.02, cz, T.pale, { accent: true }); // ceiling + lit panel (orange)
  blk(cab, 0.05, ch, cd, xl, 0, cz, T.light); blk(cab, 0.05, ch, cd, xr, 0, cz, T.light); blk(cab, cw, ch, 0.06, cx, 0, zb, T.dark);
  for (const x of [xl + 0.03, xr - 0.03]) { const p = []; for (let z = zb + 0.15; z < cz + cd / 2; z += 0.2) p.push([x, 0.1, z], [x, ch - 0.1, z], null); let seg = []; p.forEach((q) => { if (q) seg.push(q); else { cab.add(inkLine(seg)); seg = []; } }); }  // wall panel lines
  blk(cab, 0.5, 2.05, 0.04, cx - 0.255, 0.1, zb + 0.05, T.paper); blk(cab, 0.5, 2.05, 0.04, cx + 0.255, 0.1, zb + 0.05, T.light); blk(cab, 0.02, 2.05, 0.06, cx, 0.1, zb + 0.05, T.ink, { line: false });   // sliding doors
  blk(cab, 0.5, 0.06, 0.1, cx, 2.1, zb + 0.06, T.ink);                                              // door header with the floor indicator dots
  for (let i = 0; i < 7; i++) cy(cab, 0.022, 0.02, cx - 0.3 + i * 0.1, 2.12, zb + 0.12, T.pale, { accent: i === 3 });
  for (const [x, a, b] of [[xl + 0.08, zb + 0.2, cz + cd / 2 - 0.05], [xr - 0.08, zb + 0.2, cz + cd / 2 - 0.05]]) F.tube(cab, [x, 0.95, a], [x, 0.95, b], 0.03, T.ink);        // handrails
  F.tube(cab, [xl + 0.08, 0.95, zb + 0.2], [xr - 0.08, 0.95, zb + 0.2], 0.03, T.ink);
  blk(cab, 0.03, 0.8, 0.55, xr - 0.04, 0.9, cz + 0.02, T.ink); blk(cab, 0.02, 0.72, 0.47, xr - 0.06, 0.94, cz + 0.02, T.paper, { line: false });   // mirror with frame
  blk(cab, 0.03, 0.42, 0.16, xl + 0.04, 1.0, cz + cd / 2 - 0.3, T.ink);                              // button panel
  for (let i = 0; i < 6; i++) cy(cab, 0.02, 0.02, xl + 0.07, 1.05 + (i >> 1) * 0.1, cz + cd / 2 - 0.34 + (i & 1) * 0.07, T.pale, { accent: i === 4 }).rotation.z = Math.PI / 2;
  return { group: lg, cab, cx, y: (t) => liftY(t) };
}
// lift schedule (loops over 20 s): floor-3, 5, 3, 1, 3. Pure function of t.
const LIFT_KEYS = [[0, 3], [4, 3], [6, 5], [9, 5], [11, 3], [13, 3], [15, 1], [18, 1], [20, 3]];
export function liftFloorAt(t) {
  const u = ((t % 20) + 20) % 20;
  for (let i = 0; i < LIFT_KEYS.length - 1; i++) { const [t0, f0] = LIFT_KEYS[i], [t1, f1] = LIFT_KEYS[i + 1]; if (u >= t0 && u <= t1) return f0 + (f1 - f0) * (t1 === t0 ? 0 : SMOOTH((u - t0) / (t1 - t0))); }
  return 3;
}
const liftY = (t) => Y(liftFloorAt(t));

// ---- window dressing on the facade (frame, sill, lintel, flower box, curtain, night glow) ----
function windowDress(g, w, s, o) {
  const x = w.x, y0 = Y(s) + w.sill, hh = w.h, ww = w.w, z = -0.12;
  const fr = (a, b, c, d, e) => blk(g, a, b, c, d, e[0], e[1], T.paper);
  fr(0.07, hh, 0.14, x - ww / 2 + 0.035, [y0, z]); fr(0.07, hh, 0.14, x + ww / 2 - 0.035, [y0, z]); fr(ww, 0.07, 0.14, x, [y0, z]); fr(ww, 0.07, 0.14, x, [y0 + hh - 0.07, z]);
  if (!w.balcony) { fr(0.05, hh, 0.1, x, [y0, z]); fr(ww, 0.05, 0.1, x, [y0 + hh * 0.72, z]); }
  else { fr(0.05, hh, 0.1, x, [y0, z]); fr(ww, 0.05, 0.1, x, [y0 + hh * 0.72, z]); }
  blk(g, ww + 0.22, 0.07, 0.3, x, y0 - 0.07, 0.06, T.light);                    // sill
  blk(g, ww + 0.3, 0.16, 0.18, x, y0 + hh + 0.01, 0.0, T.dark);                  // lintel (soldier course)
  if (o.night) pane(g, ww - 0.1, hh - 0.1, x, y0 + hh / 2, -0.28, o.lit ? 0.38 : T.dark, !!o.lit);
  else { pane(g, ww - 0.1, hh - 0.1, x, y0 + hh / 2, -0.28, T.light); if (o.curtain) { const c = F.curtain({ w: ww - 0.1, h: hh - 0.15, tone: o.curtain, open: true }); c.position.set(x, y0 + hh, -0.2); g.add(c); } }
}
function balcony(g, w, s, r) {
  const x = w.x, y = Y(s), bw = 1.9; const bg = tag(new THREE.Group(), 'balcon:' + w.home); g.add(bg);
  blk(bg, bw, 0.2, 1.25, x, y - 0.22, 0.325, T.light);
  for (let i = 0; i <= 8; i++) blk(bg, 0.03, 0.9, 0.03, x - bw / 2 + 0.02 + i * (bw - 0.04) / 8, y - 0.02, 0.92, T.ink, { line: false });
  for (const sx of [-1, 1]) for (let j = 0; j <= 4; j++) blk(bg, 0.03, 0.9, 0.03, x + sx * (bw / 2 - 0.02), y - 0.02, -0.25 + j * 0.28, T.ink, { line: false });
  blk(bg, bw, 0.05, 0.05, x, y + 0.88, 0.92, T.dark); for (const sx of [-1, 1]) blk(bg, 0.05, 0.05, 1.2, x + sx * (bw / 2 - 0.02), y + 0.88, 0.32, T.dark);
  blk(bg, bw - 0.1, 0.2, 0.22, x, y + 0.9, 0.98, T.mid);                               // flower box
  for (let i = 0; i < 6; i++) { const b = sphere(0.1, i % 2 ? T.dark : T.mid, { seg: 10 }); b.scale.set(1, 0.9, 1); add(bg, b, x - bw / 2 + 0.3 + i * 0.26, y + 1.14, 0.98); }
  for (const dx of [-0.4, 0.5]) add(bg, sphere(0.05, T.pale, { accent: true, seg: 8 }), x + dx, y + 1.26, 1.02);   // two orange flowers
  return bg;
}

// ---- main ----
export function buildBuilding(parent, opts = {}) {
  const root = tag(new THREE.Group(), 'edificio'); parent.add(root);
  const cutAll = opts.cutaway === undefined ? true : opts.cutaway, cutList = Array.isArray(cutAll) ? cutAll : null;
  const isCut = (homeId) => cutList ? cutList.includes(homeId) : !!cutAll;
  const night = opts.mood === 'noche';
  const structure = tag(new THREE.Group(), 'edificio:estructura'); root.add(structure);
  const facade = tag(new THREE.Group(), 'edificio:fachada'); root.add(facade);
  const homesG = tag(new THREE.Group(), 'edificio:viviendas'); root.add(homesG);
  const anchors = {}, people = [];

  // slabs + outer walls + back wall + brick bands
  for (let s = -1; s <= 6; s++) slab(structure, s);
  blk(structure, 0.2, ROOF - Y(-1) + 0.3, D, XL - 0.0, Y(-1) - SLAB, -D / 2, T.mid); blk(structure, 0.2, ROOF - Y(-1) + 0.3, D, XR, Y(-1) - SLAB, -D / 2, T.mid);
  blk(structure, 22.2, ROOF - Y(-1) + 0.25, 0.15, 0, Y(-1) - SLAB, -D - 0.05, T.mid);
  const cwall = tag(new THREE.Group(), 'nucleo:pared'); structure.add(cwall);
  for (let s = -1; s <= 5; s++) { const hall = s === 0; blk(cwall, hall ? 8 : 5, H - SLAB, 0.12, 0, Y(s), -D + 0.06, T.pale); }
  { const pts = []; let dir = 1; for (let y = Y(-1) + 0.3; y < ROOF; y += 0.24) { pts.push(dir > 0 ? [-2.45, y, -D + 0.13] : [2.45, y, -D + 0.13], dir > 0 ? [2.45, y, -D + 0.13] : [-2.45, y, -D + 0.13]); dir = -dir; } cwall.add(inkLine(pts)); }
  for (let s = 0; s <= 6; s++) blk(root, 22.5, 0.2, 0.55, 0, Y(s) - 0.3, -0.06, T.dark);      // brick bands at every floor line (stay in the cutaway: they are the floor ledges)
  // stairs, lift
  const stairsG = tag(new THREE.Group(), 'escalera'); root.add(stairsG); for (let s = -1; s <= 5; s++) flight(stairsG, s);
  const L = lift(root);
  // hall dressing (ground floor, core)
  const hall = tag(new THREE.Group(), 'recibidor'); root.add(hall);
  { const m = F.mailboxes({ cols: 4, rows: 3 }); m.position.set(3.88, 0.25 + 0.95, -5.0); m.rotation.y = -Math.PI / 2; hall.add(m); }
  { const b = F.bike({ tone: T.dark }); b.position.set(-3.1, 0.25, -5.4); b.rotation.y = 1.4; hall.add(b); const b2 = F.bike({ tone: T.mid }); b2.position.set(-2.9, 0.25, -4.2); b2.rotation.y = -1.2; hall.add(b2); }
  { const p = F.plant({ size: 1.5, kind: 'jungle' }); p.position.set(-3.5, 0.25, -1.0); hall.add(p); const p2 = F.plant({ size: 1.0, kind: 'tall' }); p2.position.set(2.0, 0.25, -6.4); hall.add(p2); }
  { const f = F.frame({ w: 0.7, h: 0.5, art: 'blank' }); f.position.set(-1.2, 1.9, -D + 0.17); hall.add(f); const b = F.bench({ w: 1.2 }); b.position.set(-0.4, 0.25, -6.4); hall.add(b); const lp = F.pendant({ drop: 0.4, shade: 'accent' }); lp.position.set(0, CEIL(0), -4.6); hall.add(lp); }
  // ground-floor wall to the stairwell between the caretaker flat and the hall is made by the flat itself
  // the homes
  [...HOMES, ...SPACES].forEach((h) => {
    const main = h.rooms.find((r) => r.n === 'salon' || r.n === 'estudio' || r.n === 'tienda' || r.n === 'cuarto' || r.n === 'estar' || r.n === 'despacho') || h.rooms[0];
    anchors[h.id] = { x: main.x0 + main.w / 2, y: Y(h.s), z: -D / 2, w: main.w, home: h.id, s: h.s, room: main.n, rooms: Object.fromEntries(h.rooms.map((r) => [r.n, { x: r.x0 + r.w / 2, w: r.w }])), coreX: h.coreX, side: (main.x0 + main.w / 2) < 0 ? 'L' : 'R' };
    if (opts.homes && !opts.homes.includes(h.id)) return;
    const b = buildHome(homesG, h, { mood: opts.mood, residents: opts.residents });
    people.push(...b.people);
  });

  // ---- facade, one piece per storey and per home ----
  const fSeg = [];
  for (let s = 0; s <= 5; s++) {
    const hs = HOMES.filter((h) => h.s === s).map((h) => ({ h, x0: Math.min(...h.rooms.map((r) => r.x0)), x1: Math.max(...h.rooms.map((r) => r.x0 + r.w)) })).sort((a, b) => a.x0 - b.x0);
    const segs = []; let cur = XL;
    hs.forEach((e) => { if (e.x0 > cur + 0.01) segs.push({ id: 'nucleo', x0: cur, x1: e.x0, h: null }); segs.push({ id: e.h.id, x0: e.x0, x1: e.x1, h: e.h }); cur = e.x1; });
    if (cur < XR - 0.01) segs.push({ id: 'nucleo', x0: cur, x1: XR, h: null });
    segs.forEach((sg) => fSeg.push({ ...sg, s }));
  }
  fSeg.forEach((sg) => {
    const fg = tag(new THREE.Group(), `fachada:${sg.id}:s${sg.s}`); const cutHere = sg.h ? isCut(sg.h.id) : (cutList ? false : !!cutAll);
    const holes = [], wins = sg.h ? windowsOf(sg.h) : [];
    wins.forEach((w) => holes.push([[w.x - w.w / 2, SLAB + w.sill], [w.x + w.w / 2, SLAB + w.sill], [w.x + w.w / 2, SLAB + w.sill + w.h], [w.x - w.w / 2, SLAB + w.sill + w.h]]));
    const extra = [];
    if (!sg.h) {   // core: tall stairwell window per floor (+ entrance door and big hall window on the ground floor)
      if (sg.s === 0) { extra.push({ x: -1.5, w: 1.7, h: 2.3, sill: 0.45 }); extra.push({ x: 3.0, w: 1.2, h: 2.4, sill: 0, door: true }); }
      else extra.push({ x: -0.4, w: 1.5, h: 2.3, sill: 0.35 });
    }
    if (sg.s === 0 && sg.h && sg.h.id === 'pb-panaderia') extra.push({ x: 10.2, w: 0.95, h: 2.3, sill: 0, door: true });
    extra.forEach((w) => holes.push([[w.x - w.w / 2, SLAB + w.sill], [w.x + w.w / 2, SLAB + w.sill], [w.x + w.w / 2, SLAB + w.sill + w.h], [w.x - w.w / 2, SLAB + w.sill + w.h]]));
    const body = extrude([[sg.x0, 0], [sg.x1, 0], [sg.x1, H], [sg.x0, H]], WALL, T.mid, { holes });
    body.position.set(0, Y(sg.s) - SLAB, -WALL); fg.add(body);
    wins.forEach((w) => {
      const lit = night && ((sg.s * 3 + Math.round(w.x * 2) + 7) % 5 < 3);
      windowDress(fg, w, sg.s, { night, lit, curtain: (!night && (Math.round(w.x * 3) + sg.s) % 3 === 0) ? [T.light, T.pale, T.dark][(sg.s + 1) % 3] : null });
      if (w.balcony) balcony(root, w, sg.s);    // balconies hang from the slab: they stay in the cutaway
    });
    extra.forEach((w) => {
      if (w.door) {
        const isMain = w.x === 3.0; blk(fg, w.w, w.h, 0.06, w.x, Y(sg.s), -0.12, T.ink); blk(fg, w.w - 0.3, w.h * 0.45, 0.02, w.x, Y(sg.s) + w.h * 0.5, -0.08, T.pale, { line: false });
        blk(fg, 0.08, w.h + 0.1, 0.4, w.x - w.w / 2 - 0.04, Y(sg.s), 0.0, T.paper); blk(fg, 0.08, w.h + 0.1, 0.4, w.x + w.w / 2 + 0.04, Y(sg.s), 0.0, T.paper); blk(fg, w.w + 0.4, 0.14, 0.4, w.x, Y(sg.s) + w.h + 0.05, 0.0, T.paper);
        if (isMain) { blk(fg, 0.1, 0.16, 0.1, w.x + 1.0, Y(sg.s) + 2.5, 0.15, T.ink); add(fg, sphere(0.12, T.pale, { accent: true, seg: 10 }), w.x + 1.0, Y(sg.s) + 2.35, 0.2); }
      } else windowDress(fg, { ...w, home: 'nucleo', balcony: false }, sg.s, { night, lit: night && sg.s % 2 === 1, curtain: null });
    });
    // grille bars under the caretaker windows, shop sign-free fascia
    if (sg.s === 0 && sg.h && sg.h.id === 'pb-panaderia') { blk(fg, 7, 0.5, 0.1, 7.5, Y(0) + 2.55, 0.0, T.dark); }
    root.add(fg); fg.userData.cut = cutHere; if (cutHere) fg.visible = false; fg.userData.seg = sg.id;
  });
  // shop awning (accent stripes, one stripe in two)
  { const aw = tag(new THREE.Group(), 'toldo:panaderia'); for (let i = 0; i < 12; i++) { const st = box(0.58, 0.05, 1.3, i % 2 ? T.paper : T.mid, { accent: i % 2 === 0 }); st.position.set(4.35 + i * 0.58, Y(0) + 2.55, 0.65); st.rotation.x = 0.28; aw.add(st); } root.add(aw); }
  // entrance steps (stoop) and gable-wide pilasters
  blk(root, 2.4, 0.125, 1.0, 3.0, 0, 1.0, T.light); blk(root, 2.0, 0.125, 0.6, 3.0, 0.125, 0.8, T.light);
  const pil = tag(new THREE.Group(), 'fachada:pilastras');
  for (const x of [XL, XR]) blk(root, 0.45, ROOF - 0.0 + 1.8, 0.5, x, 0.0, -0.05, T.light);          // corner piers, they stay in the cutaway
  for (const x of [-2.5, 2.5, -4, 4]) blk(pil, 0.28, ROOF - 0.0, 0.3, x, 0.0, 0.08, T.light);
  facade.add(pil); if (isCut(null) || cutAll === true) pil.visible = false;
  // parapet (Amsterdam School stepped crown over the core) + corner pyramids
  { const par = extrude([[XL, 0], [-4, 0], [-4, 1.1], [-3, 1.1], [-3, 1.6], [-2, 1.6], [-2, 2.1], [2, 2.1], [2, 1.6], [3, 1.6], [3, 1.1], [4, 1.1], [4, 0], [XR, 0], [XR, 0.9], [XL, 0.9]], 0.3, T.mid);
    par.position.set(0, ROOF, -0.3); const pg = tag(new THREE.Group(), 'fachada:parapeto'); pg.add(par); blk(pg, 22.2, 0.08, 0.4, 0, ROOF + 0.9, -0.1, T.dark); root.add(pg); if (cutAll === true) pg.visible = false;
    for (const x of [XL, XR]) { const py = cyl(0.0, 0.42, 0.9, T.dark, { seg: 4 }); py.rotation.y = Math.PI / 4; py.position.set(x, ROOF + 1.8 + 0.45, -0.05); root.add(py); } }
  // railing + roof terrace (stays in the cutaway)
  const ter = tag(new THREE.Group(), 'terraza'); root.add(ter);
  F.tube(ter, [XL + 0.4, ROOF + 0.95, 0.0], [XR - 0.4, ROOF + 0.95, 0.0], 0.025, T.ink); F.tube(ter, [XL + 0.4, ROOF + 0.45, 0.0], [XR - 0.4, ROOF + 0.45, 0.0], 0.015, T.ink);
  for (let x = XL + 0.4; x <= XR - 0.39; x += 0.8) F.tube(ter, [x, ROOF, 0.0], [x, ROOF + 0.95, 0.0], 0.018, T.ink);
  { const tb = F.table({ w: 0.9, d: 0.9, round: true }); tb.position.set(-7.5, ROOF, -1.0); ter.add(tb); for (const [x, r] of [[-8.3, 1.57], [-6.7, -1.57]]) { const c = F.chair({ tone: T.light }); c.position.set(x, ROOF, -1.0); c.rotation.y = r; ter.add(c); }
    const bn = F.bench({ w: 1.6 }); bn.position.set(-3.5, ROOF, -0.5); ter.add(bn);
    [[-9.8, 0.9], [-5.2, 1.0], [0.5, 0.8], [6.5, 1.2], [9.7, 1.1]].forEach(([x, sz], i) => { const p = F.plant({ size: sz, kind: i % 2 ? 'tall' : 'leafy', pot: i === 1 ? 'accent' : undefined }); p.position.set(x, ROOF, -0.9); ter.add(p); });
    const bq = new THREE.Group(); const bowl = sphere(0.3, T.dark, { seg: 14 }); bowl.scale.set(1, 0.5, 1); bowl.position.y = 0.9; bq.add(bowl); cy(bq, 0.02, 0.9, 0, 0, 0, T.ink); bq.position.set(8.0, ROOF, -1.0); ter.add(bq);
    // string lights across the terrace (orange bulbs)
    const pts = []; for (let i = 0; i <= 20; i++) { const x = -10 + i; pts.push([x, ROOF + 2.4 - Math.sin(i * Math.PI / 20 * 3) * 0.0 - 0.35 * Math.abs(Math.sin(i * Math.PI / 4)), -1.0]); }
    ter.add(inkLine(pts)); for (let i = 0; i <= 20; i += 2) add(ter, sphere(0.07, T.pale, { accent: true, seg: 8 }), pts[i][0], pts[i][1] - 0.07, -1.0); }
  // attic: pitched roof, gables, dormers, chimneys; front slope + dormers are 'roof-front' (removed in the cutaway)
  const roofG = tag(new THREE.Group(), 'tejado'); root.add(roofG);
  const len = Math.hypot(ATTIC.front - ATTIC.ridge, ATTIC.ridgeH - ATTIC.kneeH);
  const slope = (zc, ang, name, tn = T.dark) => { const g = tag(new THREE.Group(), name); g.position.set(0, ROOF + (ATTIC.kneeH + ATTIC.ridgeH) / 2, zc); g.rotation.x = ang; const sl = box(22.6, 0.14, len, tn); g.add(sl);
    const pts = []; let dir = 1; for (let i = 0.15; i < len; i += 0.3) { const z = -len / 2 + i; pts.push(dir > 0 ? [-11.2, 0.085, z] : [11.2, 0.085, z], dir > 0 ? [11.2, 0.085, z] : [-11.2, 0.085, z]); dir = -dir; } g.add(inkLine(pts)); return g; };
  const rafters = (g, tn) => { for (let x = -10.2; x <= 10.3; x += 1.2) { const rb = box(0.1, 0.1, len, T.dark, { line: false }); rb.position.set(x, -0.1, 0); g.add(rb); } for (const x of [-6, 2.5]) { const f = box(1.7, 0.06, 1.3, T.ink); f.position.set(x, -0.1, 0.0); g.add(f); const gl = box(1.5, 0.05, 1.1, T.pale, { line: false }); gl.position.set(x, -0.14, 0.0); g.add(gl); const bar = box(0.06, 0.07, 1.1, T.ink, { line: false }); bar.position.set(x, -0.15, 0); g.add(bar); } };
  const front = slope((ATTIC.front + ATTIC.ridge) / 2, Math.PI / 4, 'tejado:frente'), back = slope((ATTIC.back + ATTIC.ridge) / 2, -Math.PI / 4, 'tejado:fondo', cutAll === true ? T.paper : T.dark);
  if (cutAll === true) rafters(back); roofG.add(back); const rf = tag(new THREE.Group(), 'tejado:frente-grupo'); rf.add(front); roofG.add(rf); if (cutAll === true || (cutList && cutList.includes('atico-artista'))) rf.visible = false;
  for (const x of [-4.4, 1.2, 6.5]) { const d = tag(new THREE.Group(), 'buhardilla'); blk(d, 1.5, 1.25, 1.1, 0, 0, 0, T.mid); const rr = extrude([[-0.85, 0], [0.85, 0], [0, 0.5]], 1.2, T.dark); rr.position.set(0, 1.25, -0.6); d.add(rr);
    blk(d, 0.9, 0.75, 0.05, 0, 0.25, 0.56, T.paper); blk(d, 0.8, 0.65, 0.02, 0, 0.3, 0.57, T.pale, { line: false }); blk(d, 0.04, 0.7, 0.06, 0, 0.27, 0.58, T.paper); d.position.set(x, ROOF + 1.95, -2.7); rf.add(d); }
  { for (const x of [XL, XR]) { const gb = extrude([[ATTIC.back, 0], [ATTIC.front, 0], [ATTIC.front, ATTIC.kneeH], [ATTIC.ridge, ATTIC.ridgeH], [ATTIC.back, ATTIC.kneeH]], 0.15, T.mid); gb.rotation.y = -Math.PI / 2; gb.position.set(x === XL ? XL : XR + 0.15, ROOF, 0); roofG.add(gb); } }
  blk(roofG, 22.6, 0.5, 0.5, 0, ROOF + ATTIC.ridgeH + 0.0, ATTIC.ridge, T.ink);
  for (const x of [-7, 5.5, 9]) { blk(roofG, 0.8, 1.7, 0.7, x, ROOF + ATTIC.ridgeH, ATTIC.ridge - 0.5, T.mid); blk(roofG, 0.95, 0.12, 0.85, x, ROOF + ATTIC.ridgeH + 1.7, ATTIC.ridge - 0.5, T.dark); }
  { const an = tag(new THREE.Group(), 'antena'); F.tube(an, [0, 0, 0], [0, 2.2, 0], 0.02, T.ink); for (let i = 0; i < 4; i++) F.tube(an, [-0.5 + i * 0.05, 0.9 + i * 0.35, 0], [0.5 - i * 0.05, 0.9 + i * 0.35, 0], 0.012, T.ink); an.position.set(-2.0, ROOF + ATTIC.ridgeH + 0.3, ATTIC.ridge); roofG.add(an); }
  // knee wall at the attic front (interior side) so the attic floor is closed to the terrace
  blk(root, 22.2, cutAll === true ? 0.3 : ATTIC.kneeH, 0.15, 0, ROOF, ATTIC.front, T.light);
  blk(root, 0.15, ATTIC.kneeH + 2.5, D - 2, 0.0, ROOF, -4.5, T.light);   // wall between the studio and the drying attic
  blk(root, 0.06, 1.1, 0.5, 0, ROOF + 1.5, -4.4, T.ink, { line: false });
  // basement front wall (only when the facade is closed)
  if (!cutAll) { const bw = block(0, Y(-1) - SLAB, -0.15, 22.2, H + SLAB, 0.3, T.dark); structure.add(bw); }
  // drainpipes
  for (const x of [XL + 0.3, XR - 0.3]) F.tube(facade, [x, 0.4, 0.2], [x, ROOF + 0.4, 0.2], 0.05, T.ink);
  return { group: root, anchors, people, parts: { lift: L, facade, roofFront: rf }, update(t) { L.cab.position.y = liftY(t); } };
}
