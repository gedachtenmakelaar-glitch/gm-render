// Furniture + object library for the GM base building (owner: edificio agent).
// Every function returns a THREE.Group with its origin on the floor at the centre of its footprint, front facing +z.
// Options are in the comment above each function. Tones come from TONE; accent:true = orange (use sparingly).
import { THREE, TONE as T, mat, box, cyl, sphere, capsule, plane, extrude, lathe, inkLine, tag, rng } from '../motor/gm3d.js';

export const G = (name) => tag(new THREE.Group(), name);
const at = (g, m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
// block: size w,h,d, centre x, bottom y0, centre z
const blk = (g, w, h, d, x, y0, z, t = T.mid, o) => at(g, box(w, h, d, t, o), x, y0 + h / 2, z);
// vertical cylinder: radius r, height h, centre x,z, bottom y0
const cy = (g, r, h, x, y0, z, t = T.mid, o) => at(g, cyl(r, r, h, t, { seg: 20, ...o }), x, y0 + h / 2, z);
const ball = (g, r, x, y, z, t = T.mid, o, sx = 1, sy = 1, sz = 1) => { const m = sphere(r, t, { seg: 16, ...o }); m.scale.set(sx, sy, sz); return at(g, m, x, y, z); };
const legs4 = (g, w, d, h, t, r = 0.035) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) cy(g, r, h, sx * (w / 2 - r * 2), 0, sz * (d / 2 - r * 2), t); };

// ---------- seating ----------
// sofa({w=2, tone, cushion:'accent'|tone}) 3 seat cushions + arms + back cushions, small legs
export function sofa(o = {}) {
  const w = o.w ?? 2, t = o.tone ?? T.mid, g = G('mueble:sofa');
  blk(g, w, 0.3, 0.9, 0, 0.12, 0, t);
  blk(g, w, 0.55, 0.22, 0, 0.42, -0.34, t);
  for (const s of [-1, 1]) blk(g, 0.2, 0.32, 0.9, s * (w / 2 - 0.1), 0.42, 0, t);
  const n = Math.max(1, Math.round((w - 0.4) / 0.8)), cw = (w - 0.4) / n;
  for (let i = 0; i < n; i++) {
    const x = -((w - 0.4) / 2) + cw * (i + 0.5);
    blk(g, cw - 0.03, 0.14, 0.62, x, 0.42, 0.1, T.light);
    at(g, box(cw - 0.06, 0.4, 0.14, T.pale), x, 0.82, -0.18, -0.2, 0, 0);
  }
  if (o.cushion) at(g, box(0.4, 0.4, 0.12, T.mid, { accent: o.cushion === 'accent' }), -w / 2 + 0.45, 0.8, 0.0, -0.3, 0.3, 0);
  legs4(g, w - 0.1, 0.8, 0.12, T.ink); return g;
}
// armchair({tone, tall:false}) one-seat sofa; tall = winged
export function armchair(o = {}) { const g = sofa({ w: 0.95, tone: o.tone ?? T.dark, cushion: o.cushion }); g.name = 'mueble:sillon'; if (o.tall) blk(g, 0.95, 0.35, 0.18, 0, 0.97, -0.34, o.tone ?? T.dark); return g; }
// chair({tone, h=0.46, back:true}) dining chair
export function chair(o = {}) {
  const t = o.tone ?? T.dark, g = G('mueble:silla');
  blk(g, 0.42, 0.05, 0.42, 0, o.h ?? 0.46, 0, t); legs4(g, 0.42, 0.42, o.h ?? 0.46, T.ink, 0.025);
  if (o.back !== false) { blk(g, 0.42, 0.42, 0.04, 0, (o.h ?? 0.46) + 0.05, -0.19, t); blk(g, 0.34, 0.1, 0.03, 0, (o.h ?? 0.46) + 0.22, -0.17, T.light); }
  return g;
}
// stool({h=0.5, r=0.17, tone})
export function stool(o = {}) { const g = G('mueble:taburete'), h = o.h ?? 0.5; cy(g, o.r ?? 0.17, 0.05, 0, h, 0, o.tone ?? T.dark); for (const a of [0, 2.1, 4.2]) cy(g, 0.02, h, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, T.ink); return g; }
// officeChair({tone}) swivel chair with 5-star base
export function officeChair(o = {}) {
  const g = G('mueble:silla-oficina'), t = o.tone ?? T.dark;
  cy(g, 0.03, 0.4, 0, 0.05, 0, T.ink); blk(g, 0.5, 0.08, 0.48, 0, 0.45, 0, t); blk(g, 0.46, 0.55, 0.07, 0, 0.55, -0.22, t);
  for (let i = 0; i < 5; i++) { const a = i * 1.2566; at(g, box(0.3, 0.03, 0.04, T.ink), Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15, 0, -a, 0); }
  return g;
}
// bench({w=1.6}) simple wooden bench
export function bench(o = {}) { const g = G('mueble:banco'), w = o.w ?? 1.6; blk(g, w, 0.06, 0.4, 0, 0.44, 0, o.tone ?? T.dark); for (const s of [-1, 1]) blk(g, 0.06, 0.44, 0.34, s * (w / 2 - 0.1), 0, 0, T.ink); return g; }

// ---------- tables / storage ----------
// table({w=1.4,d=0.8,h=0.74,round:false,tone}) dining table
export function table(o = {}) {
  const w = o.w ?? 1.4, d = o.d ?? 0.8, h = o.h ?? 0.74, t = o.tone ?? T.mid, g = G('mueble:mesa');
  if (o.round) { cy(g, w / 2, 0.05, 0, h - 0.05, 0, t); cy(g, 0.05, h - 0.05, 0, 0, 0, T.dark); cy(g, 0.28, 0.04, 0, 0, 0, T.dark); }
  else { blk(g, w, 0.05, d, 0, h - 0.05, 0, t); legs4(g, w, d, h - 0.05, T.dark, 0.04); }
  return g;
}
// coffeeTable({w=1,d=0.55,tone})
export function coffeeTable(o = {}) { return table({ w: o.w ?? 1, d: o.d ?? 0.55, h: 0.4, tone: o.tone ?? T.dark, round: o.round }); }
// dresser({w=1.2,h=0.85,tone}) chest of drawers with handles
export function dresser(o = {}) {
  const w = o.w ?? 1.2, h = o.h ?? 0.85, t = o.tone ?? T.mid, g = G('mueble:comoda');
  blk(g, w, h, 0.45, 0, 0.1, 0, t); legs4(g, w, 0.4, 0.1, T.ink);
  for (let i = 0; i < 3; i++) { blk(g, w - 0.08, 0.02, 0.02, 0, 0.1 + (i + 0.5) * (h / 3), 0.23, T.ink); blk(g, 0.12, 0.03, 0.03, 0, 0.1 + (i + 0.5) * (h / 3) - 0.04, 0.24, T.pale); }
  return g;
}
// wardrobe({w=1.4,h=2.1,tone}) double door
export function wardrobe(o = {}) {
  const w = o.w ?? 1.4, h = o.h ?? 2.1, t = o.tone ?? T.mid, g = G('mueble:armario');
  blk(g, w, h, 0.6, 0, 0, 0, t); blk(g, 0.02, h - 0.1, 0.02, 0, 0.05, 0.31, T.ink);
  for (const s of [-1, 1]) blk(g, 0.03, 0.25, 0.03, s * 0.06, h * 0.45, 0.32, T.pale);
  blk(g, w + 0.06, 0.06, 0.64, 0, h, 0, T.dark); return g;
}
// bookshelf({w=1.2,h=2,rows=5,seed=1,tone}) open shelf full of books; o.hole=true leaves a gap
export function bookshelf(o = {}) {
  const w = o.w ?? 1.2, h = o.h ?? 2, rows = o.rows ?? 5, t = o.tone ?? T.dark, g = G('mueble:estanteria'), r = rng(o.seed ?? 1);
  blk(g, 0.04, h, 0.32, -w / 2, 0, 0, t); blk(g, 0.04, h, 0.32, w / 2, 0, 0, t);
  for (let i = 0; i <= rows; i++) blk(g, w, 0.04, 0.32, 0, i * ((h - 0.04) / rows), 0, t);
  blk(g, w, h, 0.02, 0, 0, -0.15, T.light, { line: false });
  for (let i = 0; i < rows; i++) {
    let x = -w / 2 + 0.07; const y0 = i * ((h - 0.04) / rows) + 0.04;
    while (x < w / 2 - 0.1) { const bw = 0.03 + r() * 0.04, bh = 0.18 + r() * (((h - 0.04) / rows) - 0.28); if (r() > 0.12) blk(g, bw, bh, 0.22, x + bw / 2, y0, -0.02, [T.ink, T.mid, T.pale, T.dark, T.light][Math.floor(r() * 5)], { line: false }); x += bw + 0.005; if (r() < 0.07) x += 0.25; }
  }
  return g;
}
// shelf({w=1,tone}) wall shelf with a couple of objects
export function shelf(o = {}) { const g = G('mueble:balda'), w = o.w ?? 1; blk(g, w, 0.04, 0.22, 0, 0, 0, o.tone ?? T.dark); for (const s of [-1, 1]) blk(g, 0.04, 0.12, 0.2, s * (w / 2 - 0.15), -0.12, -0.0, T.ink); return g; }
// nightstand({tone}) small bedside table with drawer
export function nightstand(o = {}) { const g = G('mueble:mesilla'); blk(g, 0.42, 0.45, 0.4, 0, 0.1, 0, o.tone ?? T.mid); legs4(g, 0.4, 0.38, 0.1, T.ink, 0.025); blk(g, 0.16, 0.02, 0.02, 0, 0.35, 0.21, T.pale); return g; }
// desk({w=1.4,d=0.7,laptop:true,monitor:0,mug:true,tone}) desk with drawers; monitor = count of monitors
export function desk(o = {}) {
  const w = o.w ?? 1.4, d = o.d ?? 0.7, t = o.tone ?? T.mid, g = G('mueble:escritorio');
  blk(g, w, 0.04, d, 0, 0.72, 0, t); blk(g, 0.04, 0.72, d - 0.05, -w / 2 + 0.04, 0, 0, T.dark);
  blk(g, 0.4, 0.72, d - 0.05, w / 2 - 0.22, 0, 0, T.dark); blk(g, 0.34, 0.02, 0.02, w / 2 - 0.22, 0.6, d / 2 - 0.0, T.pale);
  if (o.laptop !== false && !o.monitor) laptop({ at: g, x: -0.1, z: 0.05 });
  for (let i = 0; i < (o.monitor ?? 0); i++) { const x = (o.monitor === 1 ? 0 : (i - 0.5) * 0.6); blk(g, 0.55, 0.32, 0.03, x, 0.98, -0.2, T.ink); blk(g, 0.5, 0.26, 0.01, x, 1.0, -0.185, T.pale, { line: false }); cy(g, 0.04, 0.2, x, 0.76, -0.2, T.dark); blk(g, 0.22, 0.015, 0.14, x, 0.76, -0.2, T.dark); }
  if (o.mug !== false) mug({ at: g, x: w / 2 - 0.55, z: 0.1, y: 0.76 });
  return g;
}
// laptop({at: group, x, z, y=0.76}) laptop on a surface (adds into 'at' if given, else returns a group)
export function laptop(o = {}) {
  const g = o.at ?? G('objeto:portatil'), x = o.x ?? 0, z = o.z ?? 0, y = o.y ?? 0.76;
  blk(g, 0.34, 0.02, 0.24, x, y, z, T.dark); const s = box(0.34, 0.22, 0.015, T.dark); at(g, s, x, y + 0.12, z - 0.12, -0.2); at(g, box(0.3, 0.18, 0.005, T.pale, { line: false }), x, y + 0.12, z - 0.105, -0.2);
  return g;
}
// mug({at,x,z,y}) coffee mug
export function mug(o = {}) { const g = o.at ?? G('objeto:taza'); const m = lathe([[0, 0], [0.04, 0], [0.045, 0.1], [0.04, 0.1], [0, 0.09]], o.tone ?? T.pale, { seg: 12 }); at(g, m, o.x ?? 0, o.y ?? 0, o.z ?? 0); return g; }

// ---------- sleeping ----------
// bed({w=1.6,l=2.0,tone,blanket,head:'back'}) head at the back (-z); pillows + folded blanket; o.bunk for bunk bed
export function bed(o = {}) {
  const w = o.w ?? 1.6, l = o.l ?? 2.0, t = o.tone ?? T.dark, g = G('mueble:cama');
  blk(g, w + 0.1, 0.3, l + 0.1, 0, 0.1, 0, t); blk(g, w, 0.2, l, 0, 0.4, 0, T.pale);
  blk(g, w + 0.1, 0.8, 0.07, 0, 0.1, -l / 2 - 0.02, t);
  const n = w > 1.1 ? 2 : 1; for (let i = 0; i < n; i++) at(g, box(w / n - 0.2, 0.12, 0.38, T.paper), (i - (n - 1) / 2) * (w / n), 0.66, -l / 2 + 0.3, -0.12);
  blk(g, w + 0.04, 0.12, l * 0.62, 0, 0.58, l * 0.16, o.blanket ?? T.mid);
  blk(g, w + 0.06, 0.08, 0.2, 0, 0.58, l * 0.16 - l * 0.31, o.blanket ?? T.mid);
  if (o.bunk) { for (const s of [-1, 1]) for (const z of [-l / 2, l / 2]) blk(g, 0.07, 1.8, 0.07, s * (w / 2 + 0.03), 0, z, t); blk(g, w, 0.18, l, 0, 1.25, 0, T.pale); blk(g, w, 0.1, l * 0.5, 0, 1.43, l * 0.22, o.blanket ?? T.mid); blk(g, w, 0.4, 0.04, 0, 1.43, l / 2, t); }
  legs4(g, w, l, 0.1, T.ink, 0.03); return g;
}
// mattress({w,l}) mattress on the floor (student, drummer)
export function mattress(o = {}) { const g = G('mueble:colchon'), w = o.w ?? 1.1, l = o.l ?? 2; blk(g, w, 0.2, l, 0, 0, 0, T.pale); blk(g, w - 0.04, 0.1, l * 0.55, 0, 0.2, l * 0.2, o.blanket ?? T.mid); at(g, box(w * 0.7, 0.1, 0.35, T.paper), 0, 0.25, -l / 2 + 0.3, -0.1); return g; }
// crib({tone}) baby crib with bars and a mobile
export function crib(o = {}) {
  const g = G('mueble:cuna'), t = o.tone ?? T.light;
  blk(g, 1.0, 0.06, 0.65, 0, 0.3, 0, T.pale); legs4(g, 1.0, 0.65, 0.3, T.dark, 0.03);
  for (let i = 0; i <= 8; i++) { blk(g, 0.02, 0.5, 0.02, -0.5 + i * 0.125, 0.36, 0.32, t); blk(g, 0.02, 0.5, 0.02, -0.5 + i * 0.125, 0.36, -0.32, t); }
  for (const s of [-1, 1]) blk(g, 0.03, 0.5, 0.66, s * 0.5, 0.36, 0, t, { line: false }); blk(g, 1.04, 0.04, 0.04, 0, 0.88, 0.32, t); blk(g, 1.04, 0.04, 0.04, 0, 0.88, -0.32, t);
  blk(g, 0.9, 0.08, 0.55, 0, 0.36, 0, T.paper); if (o.mobile) { cy(g, 0.01, 0.6, 0, 0.9, 0, T.ink); for (const a of [0, 2.1, 4.2]) ball(g, 0.05, Math.cos(a) * 0.2, 1.3, Math.sin(a) * 0.12, T.mid); }
  return g;
}
// pram({tone}) baby pram with a hood and a bundle
export function pram(o = {}) {
  const g = G('objeto:carrito-bebe'), t = o.tone ?? T.dark;
  for (const x of [-0.3, 0.3]) for (const z of [-0.35, 0.35]) { const w = cyl(0.14, 0.14, 0.04, T.ink, { seg: 20 }); at(g, w, x, 0.14, z, 0, 0, Math.PI / 2); }
  blk(g, 0.62, 0.16, 0.95, 0, 0.28, 0, t); blk(g, 0.6, 0.3, 0.04, 0, 0.44, -0.46, t);
  const hood = box(0.62, 0.4, 0.05, t); at(g, hood, 0, 0.78, -0.3, -0.7); blk(g, 0.5, 0.05, 0.8, 0, 0.44, 0.0, T.paper);
  ball(g, 0.1, 0, 0.58, -0.22, T.pale); blk(g, 0.04, 0.04, 0.5, 0.31, 0.75, 0.55, T.ink); blk(g, 0.04, 0.04, 0.5, -0.31, 0.75, 0.55, T.ink); blk(g, 0.7, 0.04, 0.04, 0, 0.98, 0.78, T.ink);
  return g;
}

// ---------- kitchen / bath ----------
// kitchen({w=2.4,upper:true,tone}) base cabinets with doors, worktop, sink, tap and hob; optional wall cabinets
export function kitchen(o = {}) {
  const w = o.w ?? 2.4, t = o.tone ?? T.mid, g = G('mueble:cocina');
  blk(g, w, 0.82, 0.6, 0, 0.08, 0, t); blk(g, w, 0.04, 0.64, 0, 0.9, 0.01, T.pale); blk(g, w - 0.06, 0.08, 0.5, 0, 0, -0.02, T.ink);
  const n = Math.round(w / 0.6); for (let i = 1; i < n; i++) blk(g, 0.015, 0.7, 0.015, -w / 2 + i * (w / n), 0.14, 0.31, T.ink);
  for (let i = 0; i < n; i++) blk(g, 0.1, 0.02, 0.025, -w / 2 + (i + 0.5) * (w / n), 0.76, 0.32, T.pale);
  blk(g, 0.5, 0.02, 0.38, -w / 2 + 0.55, 0.94, 0.0, T.dark);                    // sink
  cy(g, 0.012, 0.22, -w / 2 + 0.55, 0.94, -0.2, T.ink); blk(g, 0.02, 0.02, 0.12, -w / 2 + 0.55, 1.14, -0.14, T.ink);
  for (const dx of [0.2, 0.55]) { const d = cyl(0.09, 0.09, 0.015, T.ink, { seg: 18 }); at(g, d, w / 2 - dx - 0.2, 0.945, 0.0); }
  if (o.upper !== false) { blk(g, w, 0.7, 0.34, 0, 1.55, -0.13, t); for (let i = 1; i < n; i++) blk(g, 0.015, 0.66, 0.015, -w / 2 + i * (w / n), 1.57, 0.045, T.ink); blk(g, 0.7, 0.12, 0.4, w / 2 - 0.5, 1.25, -0.1, T.dark); }
  return g;
}
// fridge({h=1.85,tone, cat:false}) fridge; cat:true puts a sleeping cat on top
export function fridge(o = {}) {
  const h = o.h ?? 1.85, g = G('mueble:nevera');
  blk(g, 0.62, h, 0.62, 0, 0, 0, o.tone ?? T.pale); blk(g, 0.6, 0.02, 0.02, 0, h * 0.68, 0.32, T.ink);
  blk(g, 0.03, 0.4, 0.04, 0.22, h * 0.72, 0.33, T.dark); blk(g, 0.03, 0.55, 0.04, 0.22, h * 0.3, 0.33, T.dark);
  if (o.cat) { const c = cat({ pose: 'loaf', tone: T.dark }); c.position.set(0, h, 0); g.add(c); }
  return g;
}
// washer({tone}) front-loading washing machine with round door, knob and a sock hanging out (humour)
export function washer(o = {}) {
  const g = G('mueble:lavadora'); blk(g, 0.6, 0.85, 0.6, 0, 0, 0, o.tone ?? T.pale);
  const d = cyl(0.21, 0.21, 0.06, T.dark, { seg: 28 }); at(g, d, 0, 0.42, 0.3, Math.PI / 2); const d2 = cyl(0.15, 0.15, 0.07, T.light, { seg: 28 }); at(g, d2, 0, 0.42, 0.31, Math.PI / 2);
  blk(g, 0.5, 0.1, 0.02, 0, 0.74, 0.31, T.dark); cy(g, 0.03, 0.03, 0.2, 0.74, 0.33, T.ink); if (o.sock !== false) blk(g, 0.05, 0.16, 0.03, 0.17, 0.3, 0.33, T.mid); return g;
}
// bathtub({w=1.7}) tub with tap
export function bathtub(o = {}) { const g = G('mueble:banera'), w = o.w ?? 1.7; blk(g, w, 0.55, 0.75, 0, 0, 0, T.paper); blk(g, w - 0.2, 0.05, 0.55, 0, 0.52, 0, T.mid, { line: false }); cy(g, 0.02, 0.2, -w / 2 + 0.1, 0.55, -0.3, T.ink); return g; }
// toilet() / basin({mirror:true}) bathroom bits
export function toilet() { const g = G('mueble:inodoro'); blk(g, 0.4, 0.42, 0.28, 0, 0, 0.12, T.paper); blk(g, 0.38, 0.5, 0.18, 0, 0.1, -0.15, T.paper); return g; }
export function basin(o = {}) { const g = G('mueble:lavabo'); blk(g, 0.5, 0.12, 0.38, 0, 0.8, 0, T.paper); cy(g, 0.06, 0.8, 0, 0, -0.05, T.pale); if (o.mirror !== false) blk(g, 0.5, 0.7, 0.03, 0, 1.2, -0.18, T.pale); return g; }
// pot({r=0.12, h=0.1}) cooking pot on the hob etc.
export function cookPot(o = {}) { const g = G('objeto:cazo'); cy(g, o.r ?? 0.12, o.h ?? 0.14, 0, 0, 0, T.dark); blk(g, 0.12, 0.02, 0.02, (o.r ?? 0.12) + 0.04, (o.h ?? 0.14) - 0.03, 0, T.ink); return g; }

// ---------- light, plants, decoration ----------
// plant({size=1, kind:'leafy'|'cactus'|'tall'|'jungle', pot:'accent'|tone, seed}) potted plant. jungle = the plant that eats the shelf (humour)
export function plant(o = {}) {
  const s = o.size ?? 1, g = G('mueble:planta'), r = rng(o.seed ?? 3), k = o.kind ?? 'leafy';
  const pot = lathe([[0, 0], [0.1 * s, 0], [0.14 * s, 0.22 * s], [0.15 * s, 0.24 * s], [0.13 * s, 0.24 * s], [0, 0.2 * s]], o.pot === 'accent' ? T.mid : (typeof o.pot === 'number' ? o.pot : T.dark), { seg: 16, accent: o.pot === 'accent' }); g.add(pot);
  if (k === 'cactus') { const c = capsule(0.07 * s, 0.35 * s, T.mid); c.position.set(0, 0.45 * s, 0); g.add(c); const a = capsule(0.04 * s, 0.14 * s, T.mid); a.position.set(0.1 * s, 0.5 * s, 0); g.add(a); }
  else if (k === 'tall') { for (let i = 0; i < 7; i++) { const l = ball(g, 0.1 * s, (r() - 0.5) * 0.3 * s, (0.5 + i * 0.16) * s, (r() - 0.5) * 0.2 * s, T.mid, {}, 0.8, 1.6, 0.5); l.rotation.z = (r() - 0.5) * 0.7; } cy(g, 0.01 * s, 0.9 * s, 0, 0.24 * s, 0, T.ink); }
  else { const n = k === 'jungle' ? 14 : 8; for (let i = 0; i < n; i++) { const a = r() * 6.28, rad = (k === 'jungle' ? 0.45 : 0.22) * s * r(); const l = ball(g, 0.14 * s, Math.cos(a) * rad, (0.42 + r() * (k === 'jungle' ? 1.1 : 0.4)) * s, Math.sin(a) * rad, [T.mid, T.dark, T.light][i % 3], {}, 1, 0.55, 1); l.rotation.set(r() - 0.5, r() * 3, r() - 0.5); } }
  return g;
}
// lampFloor({shade:'accent'|tone,h=1.6}) floor lamp; at night the shade glows if accent
export function lampFloor(o = {}) {
  const h = o.h ?? 1.6, g = G('mueble:lampara-pie'); cy(g, 0.14, 0.03, 0, 0, 0, T.ink); cy(g, 0.012, h, 0, 0, 0, T.ink);
  at(g, cyl(0.12, 0.2, 0.28, o.shade === 'accent' ? T.pale : (o.shade ?? T.paper), { seg: 18, accent: o.shade === 'accent' }), 0, h + 0.05, 0); return g;
}
// lampTable({shade}) table lamp (lathe base + shade)
export function lampTable(o = {}) { const g = G('mueble:lampara-mesa'); const b = lathe([[0, 0], [0.07, 0], [0.04, 0.12], [0.02, 0.22], [0.015, 0.25]], T.dark, { seg: 14 }); g.add(b); at(g, cyl(0.07, 0.12, 0.16, o.shade === 'accent' ? T.pale : T.paper, { seg: 16, accent: o.shade === 'accent' }), 0, 0.3, 0); return g; }
// pendant({drop=0.6,shade}) ceiling lamp hanging from y=0 downwards (place y at the ceiling)
export function pendant(o = {}) { const g = G('mueble:lampara-techo'), d = o.drop ?? 0.6; g.add(inkLine([[0, 0, 0], [0, -d, 0]])); at(g, cyl(0.04, 0.22, 0.16, o.shade === 'accent' ? T.pale : T.paper, { seg: 18, accent: o.shade === 'accent' }), 0, -d - 0.06, 0); ball(g, 0.05, 0, -d - 0.14, 0, T.paper, { line: false }); return g; }
// tv({w=0.9,on:false}) TV on a low stand
export function tv(o = {}) {
  const w = o.w ?? 0.9, g = G('mueble:tele'); blk(g, w + 0.3, 0.4, 0.38, 0, 0, 0, T.dark); legs4(g, w + 0.2, 0.3, 0.0, T.ink);
  blk(g, w, w * 0.58, 0.06, 0, 0.45, 0, T.ink); blk(g, w - 0.08, w * 0.58 - 0.08, 0.01, 0, 0.49, 0.035, o.on ? T.paper : T.light, { line: false }); cy(g, 0.03, 0.05, 0, 0.4, 0, T.ink); return g;
}
// frame({w=0.5,h=0.4,art:'hills'|'sun'|'blank'|'kid',tone, tilt:0}) picture frame (hangs on a wall: place its y at the picture centre)
export function frame(o = {}) {
  const w = o.w ?? 0.5, h = o.h ?? 0.4, g = G('mueble:cuadro'); blk(g, w, h, 0.03, 0, -h / 2, 0, o.tone ?? T.ink); blk(g, w - 0.07, h - 0.07, 0.01, 0, -h / 2 + 0.0, 0.02, T.paper, { line: false });
  const a = o.art ?? 'hills';
  if (a === 'hills') { const e = extrude([[-w / 2 + 0.05, -h + 0.05], [-w / 2 + 0.05, -h * 0.55], [-0.05, -h * 0.3], [0.1, -h * 0.5], [w / 2 - 0.05, -h * 0.4], [w / 2 - 0.05, -h + 0.05]], 0.004, T.mid, { line: false }); e.position.z = 0.022; g.add(e); }
  else if (a === 'sun') { const s = cyl(0.07, 0.07, 0.01, T.pale, { seg: 16, accent: !!o.accent }); at(g, s, 0, -h / 2 + 0.03, 0.025, Math.PI / 2); }
  else if (a === 'kid') { for (const [x, y] of [[-0.1, 0], [0.05, 0.05], [0.12, -0.04]]) { const c = cyl(0.04, 0.04, 0.01, T.dark, { seg: 10 }); at(g, c, x * w * 2, -h / 2 + y, 0.025, Math.PI / 2); } }
  g.rotation.z = o.tilt ?? 0; return g;
}
// clock({r=0.22}) wall clock without numbers (hands only)
export function clock(o = {}) { const r = o.r ?? 0.22, g = G('mueble:reloj'); const f = cyl(r, r, 0.05, T.ink, { seg: 28 }); at(g, f, 0, 0, 0, Math.PI / 2); const d = cyl(r - 0.03, r - 0.03, 0.02, T.paper, { seg: 28 }); at(g, d, 0, 0, 0.03, Math.PI / 2); blk(g, 0.015, r * 0.7, 0.01, 0, 0, 0.045, T.ink); blk(g, 0.015, r * 0.5, 0.01, 0, -0.0, 0.05, T.ink).rotation.z = 1.9; return g; }
// rug({w=2.2,d=1.5,tone, border}) flat carpet
export function rug(o = {}) { const g = G('mueble:alfombra'), w = o.w ?? 2.2, d = o.d ?? 1.5; if (o.round) { cy(g, w / 2, 0.025, 0, 0, 0, o.tone ?? T.light); cy(g, w / 2 - 0.12, 0.03, 0, 0, 0, o.border ?? T.dark); } else { blk(g, w, 0.025, d, 0, 0, 0, o.tone ?? T.light); blk(g, w - 0.24, 0.03, d - 0.24, 0, 0, 0, o.border ?? T.dark, { line: false }); blk(g, w - 0.4, 0.035, d - 0.4, 0, 0, 0, o.tone ?? T.light, { line: false }); } return g; }
// curtain({w=1.4,h=2.2,tone,open}) curtain pair with rod; place at window top. open=true bunches to the sides
export function curtain(o = {}) {
  const w = o.w ?? 1.4, h = o.h ?? 2.2, t = o.tone ?? T.mid, g = G('mueble:cortina');
  at(g, cyl(0.015, 0.015, w + 0.3, T.ink, { seg: 8 }), 0, 0, 0, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const pw = o.open === false ? w / 6 : w / 9; blk(g, pw, h, 0.03, s * (o.open === false ? pw * (i + 0.5) : (w / 2 - pw * (i + 0.5) + 0.02)), -h, 0.03 * ((i % 2) * 2 - 1), t, { line: false }); }
  return g;
}
// rugby ball etc. toys: toyBlocks(), ball(), teddy()
export function toyBlocks() { const g = G('objeto:cubos'); blk(g, 0.12, 0.12, 0.12, 0, 0, 0, T.mid).rotation.y = 0.3; blk(g, 0.12, 0.12, 0.12, 0.16, 0, 0.02, T.light).rotation.y = -0.2; blk(g, 0.12, 0.12, 0.12, 0.07, 0.12, 0.0, T.dark).rotation.y = 0.6; return g; }
export function teddy(o = {}) { const g = G('objeto:osito'), t = o.tone ?? T.mid; ball(g, 0.1, 0, 0.14, 0, t, {}, 1, 1.1, 0.9); ball(g, 0.075, 0, 0.3, 0.01, t); for (const s of [-1, 1]) { ball(g, 0.03, s * 0.06, 0.37, 0, t); ball(g, 0.035, s * 0.1, 0.1, 0.07, t); ball(g, 0.035, s * 0.12, 0.2, 0.0, t); } return g; }
export function toyBall(o = {}) { const g = G('objeto:pelota'); ball(g, o.r ?? 0.1, 0, o.r ?? 0.1, 0, o.tone ?? T.light, { accent: !!o.accent }); return g; }
// box pile: boxes({n=3, seed}) cardboard moving boxes
export function boxes(o = {}) { const g = G('objeto:cajas'), r = rng(o.seed ?? 5); let y = 0; for (let i = 0; i < (o.n ?? 3); i++) { const w = 0.5 + r() * 0.25; const b = blk(g, w, 0.35, 0.45, (r() - 0.5) * 0.1, y, 0, T.light); b.rotation.y = (r() - 0.5) * 0.3; blk(g, 0.04, 0.005, 0.46, 0, y + 0.35, 0, T.dark, { line: false }); y += 0.35; } return g; }
// suitcase({tone}) suitcase with handle
export function suitcase(o = {}) { const g = G('objeto:maleta'); blk(g, 0.55, 0.38, 0.22, 0, 0.05, 0, o.tone ?? T.dark); blk(g, 0.2, 0.02, 0.03, 0, 0.43, 0, T.ink); blk(g, 0.04, 0.4, 0.23, 0.15, 0.05, 0, T.ink); blk(g, 0.04, 0.4, 0.23, -0.15, 0.05, 0, T.ink); return g; }
// globe() desk globe;  yarn({unravel}) a ball of yarn trailing a thread across the floor (humour)
export function globe() { const g = G('objeto:globo'); cy(g, 0.08, 0.02, 0, 0, 0, T.ink); cy(g, 0.01, 0.2, 0, 0, 0, T.ink); ball(g, 0.14, 0, 0.32, 0, T.light); blk(g, 0.26, 0.015, 0.015, 0, 0.32, 0, T.ink); return g; }
export function yarn(o = {}) { const g = G('objeto:ovillo'); ball(g, 0.1, 0, 0.1, 0, o.tone ?? T.mid, { accent: !!o.accent }); const r = rng(9); const pts = [[0.08, 0.02, 0.05]]; for (let i = 1; i < 14; i++) pts.push([0.08 + i * 0.09, 0.012, 0.05 + Math.sin(i * 0.9) * 0.18 + (r() - 0.5) * 0.03]); g.add(inkLine(pts)); return g; }
// easel + canvas: easel({canvas:true})
export function easel() { const g = G('mueble:caballete'); for (const [x, z, rx] of [[-0.3, 0, 0.12], [0.3, 0, 0.12], [0, -0.4, -0.3]]) { const m = box(0.04, 1.8, 0.04, T.dark); at(g, m, x, 0.9, z, rx, 0, 0); } blk(g, 0.7, 0.05, 0.05, 0, 0.5, 0.1, T.dark); blk(g, 0.8, 0.6, 0.03, 0, 0.78, 0.05, T.paper); const e = extrude([[-0.3, -0.2], [-0.1, 0.1], [0.05, -0.05], [0.3, 0.15], [0.3, -0.2]], 0.005, T.mid, { line: false }); e.position.set(0, 0.88, 0.07); g.add(e); const s = sphere(0.06, T.pale, { accent: true, seg: 12 }); s.position.set(0.2, 1.0, 0.075); g.add(s); return g; }
// guitar({tone}) acoustic guitar leaning (rotate it yourself)
export function guitar(o = {}) { const g = G('objeto:guitarra'); const b = ball(g, 0.2, 0, 0.25, 0, o.tone ?? T.mid, {}, 1, 1.15, 0.28); ball(g, 0.14, 0, 0.55, 0, o.tone ?? T.mid, {}, 1, 1, 0.28); blk(g, 0.06, 0.7, 0.04, 0, 0.55, 0, T.dark); blk(g, 0.08, 0.14, 0.04, 0, 1.22, 0, T.dark); cy(g, 0.06, 0.03, 0, 0.22, 0.04, T.ink).rotation.x = Math.PI / 2; return g; }
// drumKit({tone}) full kit: kick, snare, 2 toms, floor tom, hi-hat, crash, ride, stool. ~1.8 x 1.4 m, front towards +z
export function drumKit(o = {}) {
  const g = G('objeto:bateria'), sh = o.tone ?? T.mid;
  const drum = (r, h, x, y, z, t = sh, rx = 0) => { const d = cyl(r, r, h, t, { seg: 28 }); at(g, d, x, y, z, rx); const rim = cyl(r + 0.01, r + 0.01, 0.02, T.paper, { seg: 28 }); at(g, rim, x, y + (rx ? 0 : h / 2), z + (rx ? h / 2 : 0), rx); return d; };
  drum(0.34, 0.4, 0, 0.4, -0.15, sh, Math.PI / 2); blk(g, 0.05, 0.4, 0.05, -0.28, 0, 0.0, T.ink); blk(g, 0.05, 0.4, 0.05, 0.28, 0, 0.0, T.ink);        // kick on its side
  { const k = cyl(0.12, 0.12, 0.01, T.pale, { seg: 20 }); at(g, k, 0, 0.4, 0.07, Math.PI / 2); }
  drum(0.17, 0.2, -0.28, 0.98, -0.3); drum(0.2, 0.22, 0.22, 0.98, -0.3); drum(0.22, 0.4, 0.62, 0.55, 0.0);
  drum(0.19, 0.12, -0.6, 0.78, 0.15, T.pale); cy(g, 0.012, 0.78, -0.6, 0, 0.15, T.ink);                         // snare
  cy(g, 0.012, 0.95, -0.95, 0, 0.1, T.ink); cy(g, 0.15, 0.01, -0.95, 0.93, 0.1, T.pale); cy(g, 0.15, 0.01, -0.95, 0.96, 0.1, T.pale);   // hi-hat
  cy(g, 0.012, 1.45, -0.55, 0, -0.5, T.ink); { const c = cyl(0.22, 0.22, 0.01, T.pale, { seg: 24 }); at(g, c, -0.55, 1.45, -0.5, 0.15); }  // crash
  cy(g, 0.012, 1.3, 0.8, 0, -0.45, T.ink); { const c = cyl(0.26, 0.26, 0.01, T.pale, { seg: 24 }); at(g, c, 0.8, 1.3, -0.45, -0.1); }
  const st = stool({ h: 0.5 }); st.position.set(0, 0, 0.75); g.add(st); return g;
}
// mailboxes({cols=4,rows=3}) bank of numberless mailboxes for the entrance hall
export function mailboxes(o = {}) { const g = G('objeto:buzones'), c = o.cols ?? 4, r = o.rows ?? 3; blk(g, c * 0.22 + 0.08, r * 0.2 + 0.08, 0.1, 0, 0, 0, T.dark); for (let i = 0; i < c; i++) for (let j = 0; j < r; j++) { blk(g, 0.18, 0.16, 0.03, (i - (c - 1) / 2) * 0.22, 0.04 + j * 0.2, 0.06, T.light); blk(g, 0.1, 0.012, 0.01, (i - (c - 1) / 2) * 0.22, 0.14 + j * 0.2, 0.08, T.ink); } return g; }
// coatRack({tone}) coat stand with hats and a coat
export function coatRack() { const g = G('mueble:perchero'); cy(g, 0.02, 1.7, 0, 0, 0, T.dark); cy(g, 0.16, 0.03, 0, 0, 0, T.dark); for (let i = 0; i < 4; i++) { const a = i * 1.57; at(g, box(0.18, 0.02, 0.02, T.dark), Math.cos(a) * 0.08, 1.62, Math.sin(a) * 0.08, 0, -a, 0); } ball(g, 0.2, 0.02, 1.2, 0.02, T.mid, {}, 0.8, 1.5, 0.5); return g; }
// shoes({n=3}) pile of shoes by a door
export function shoes(o = {}) { const g = G('objeto:zapatos'); for (let i = 0; i < (o.n ?? 3); i++) { const s = ball(g, 0.1, i * 0.2, 0.05, (i % 2) * 0.06, i % 2 ? T.dark : T.mid, {}, 1.2, 0.5, 0.55); s.rotation.y = i * 0.5; } return g; }
// bucketMop() bucket with mop (caretaker)
export function bucketMop() { const g = G('objeto:cubo-fregona'); at(g, cyl(0.17, 0.13, 0.28, T.mid, { seg: 16 }), 0, 0.14, 0); cy(g, 0.012, 1.3, 0.06, 0.1, 0, T.dark).rotation.z = 0.12; ball(g, 0.1, 0.17, 0.08, 0, T.paper, {}, 1, 0.8, 1); return g; }
// broom() leaning broom
export function broom() { const g = G('objeto:escoba'); cy(g, 0.012, 1.5, 0, 0, 0, T.dark); blk(g, 0.22, 0.2, 0.05, 0, 0, 0, T.light); return g; }
// toolbox, ironing board, laundry rack, laundry basket
export function toolbox() { const g = G('objeto:caja-herramientas'); blk(g, 0.5, 0.2, 0.22, 0, 0, 0, T.dark); blk(g, 0.28, 0.04, 0.03, 0, 0.2, 0, T.ink); return g; }
export function laundryRack(o = {}) { const g = G('mueble:tendedero'); for (const s of [-1, 1]) { const m = box(0.03, 1.1, 0.03, T.ink); at(g, m, s * 0.5, 0.5, 0, 0, 0, s * 0.2); } for (let i = 0; i < 4; i++) blk(g, 1.0, 0.015, 0.015, 0, 0.25 + i * 0.22, 0, T.ink); const r = rng(4); for (let i = 0; i < (o.n ?? 5); i++) blk(g, 0.12 + r() * 0.1, 0.22, 0.01, -0.4 + i * 0.2, 0.05 + 0.22 * Math.floor(i % 3 + 1) - 0.1, 0, [T.paper, T.mid, T.light][i % 3], { line: false }); return g; }
export function basket(o = {}) { const g = G('objeto:cesto'); const c = cyl(0.25, 0.2, 0.4, T.light, { seg: 16 }); at(g, c, 0, 0.2, 0); const r = rng(8); for (let i = 0; i < 5; i++) ball(g, 0.1, (r() - 0.5) * 0.2, 0.42, (r() - 0.5) * 0.2, [T.mid, T.paper, T.dark][i % 3], {}, 1.3, 0.7, 1); return g; }
// eggCartons({cols,rows}) soundproofing by egg carton on a wall (drummer; humour: it does not work). Origin = bottom-left, facing +z
export function eggCartons(o = {}) { const g = G('objeto:huevera-pared'), c = o.cols ?? 6, r = o.rows ?? 4; for (let i = 0; i < c; i++) for (let j = 0; j < r; j++) { const s = ball(g, 0.075, i * 0.15 + 0.075, j * 0.15 + 0.075, 0.02, T.light, {}, 1, 1, 0.5); } return g; }
// dishTower() a stack of plates and cups (student humour)
export function dishTower() { const g = G('objeto:platos'); for (let i = 0; i < 9; i++) cy(g, 0.12 - (i % 3) * 0.01, 0.035, (i % 2) * 0.01, i * 0.04, 0, i % 2 ? T.paper : T.light); mug({ at: g, x: 0.2, y: 0.0 }); return g; }
// recordPlayer() / radio()
export function recordPlayer() { const g = G('objeto:tocadiscos'); blk(g, 0.5, 0.1, 0.4, 0, 0, 0, T.dark); cy(g, 0.17, 0.015, -0.05, 0.1, 0, T.ink); cy(g, 0.03, 0.02, -0.05, 0.115, 0, T.pale, { accent: true }); blk(g, 0.02, 0.02, 0.2, 0.17, 0.12, -0.05, T.pale); return g; }
export function radio() { const g = G('objeto:radio'); blk(g, 0.36, 0.22, 0.14, 0, 0, 0, T.mid); cy(g, 0.05, 0.02, -0.08, 0.1, 0.08, T.ink).rotation.x = Math.PI / 2; blk(g, 0.15, 0.1, 0.02, 0.07, 0.06, 0.075, T.light); return g; }
// chessBoard() flat board with a few pieces (abuelo)
export function chessBoard() { const g = G('objeto:ajedrez'); blk(g, 0.4, 0.02, 0.4, 0, 0, 0, T.pale); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) blk(g, 0.1, 0.005, 0.1, -0.15 + i * 0.1 + (j % 2) * 0.1 - 0.0, 0.02, -0.15 + j * 0.1, T.dark, { line: false }); for (const [x, z, t] of [[-0.1, 0.1, T.ink], [0.1, -0.1, T.paper], [0.0, 0.0, T.ink]]) cy(g, 0.02, 0.07, x, 0.02, z, t, { seg: 8 }); return g; }
// newspaper() on a table (no print)
export function newspaper() { const g = G('objeto:periodico'); blk(g, 0.4, 0.01, 0.3, 0, 0, 0, T.paper); for (let i = 0; i < 5; i++) blk(g, 0.34, 0.003, 0.012, 0, 0.011, -0.1 + i * 0.05, T.light, { line: false }); return g; }
// ---------- pets ----------
// cat({pose:'sit'|'loaf'|'stand', tone}) house cat, ~0.3 long
export function cat(o = {}) {
  const t = o.tone ?? T.dark, g = G('mascota:gato'), p = o.pose ?? 'sit';
  if (p === 'loaf') { ball(g, 0.1, 0, 0.1, 0, t, {}, 1.4, 0.9, 1); ball(g, 0.075, 0.13, 0.12, 0.0, t); for (const s of [-1, 1]) at(g, cyl(0.0, 0.03, 0.06, t, { seg: 4 }), 0.15, 0.2, s * 0.04); at(g, capsule(0.015, 0.2, t), -0.17, 0.05, 0.05, 0, 0, Math.PI / 2 + 0.3); }
  else { ball(g, 0.09, 0, 0.14, 0, t, {}, 0.9, 1.4, 0.9); ball(g, 0.07, 0.01, 0.32, 0.0, t); for (const s of [-1, 1]) at(g, cyl(0.0, 0.025, 0.06, t, { seg: 4 }), 0.01, 0.4, s * 0.04); at(g, capsule(0.015, 0.25, t), -0.1, 0.1, 0, 0, 0, 0.9); }
  return g;
}
// dog({pose:'sit'|'sleep'|'stand', tone}) medium dog, ~0.6 long
export function dog(o = {}) {
  const t = o.tone ?? T.light, g = G('mascota:perro'), p = o.pose ?? 'sit';
  if (p === 'sleep') { ball(g, 0.17, 0, 0.14, 0, t, {}, 1.8, 0.8, 1); ball(g, 0.11, 0.3, 0.12, 0, t, {}, 1.1, 0.9, 1); for (const s of [-1, 1]) ball(g, 0.05, 0.3, 0.12, s * 0.11, T.dark, {}, 0.7, 1.4, 0.4); at(g, capsule(0.025, 0.2, t), -0.35, 0.08, 0.05, 0, 0, Math.PI / 2 - 0.4); }
  else { ball(g, 0.16, 0, 0.35, 0, t, {}, 1.8, 1, 1); ball(g, 0.1, 0.32, 0.5, 0, t); ball(g, 0.06, 0.42, 0.47, 0, T.dark); for (const s of [-1, 1]) { ball(g, 0.045, 0.3, 0.5, s * 0.1, T.dark, {}, 0.7, 1.4, 0.4); for (const x of [-0.2, 0.2]) cy(g, 0.035, 0.28, x, 0, s * 0.08, t); } at(g, capsule(0.025, 0.22, t), -0.34, 0.45, 0, 0, 0, 0.7); }
  return g;
}
// bird({kind:'pigeon'|'gull', wing:0..1, tone}) a small bird; wing = flap phase (0..1) for flying birds, -1 = wings folded (standing)
export function bird(o = {}) {
  const gull = o.kind === 'gull', t = o.tone ?? (gull ? T.paper : T.mid), g = G('pajaro:' + (o.kind ?? 'pigeon')), s = gull ? 1.3 : 1;
  ball(g, 0.1 * s, 0, 0, 0, t, {}, 1.5, 0.8, 0.8); ball(g, 0.055 * s, 0.14 * s, 0.05 * s, 0, t); at(g, cyl(0.0, 0.02 * s, 0.07 * s, gull ? T.dark : T.ink, { seg: 5 }), 0.22 * s, 0.05 * s, 0, 0, 0, -Math.PI / 2);
  at(g, box(0.12 * s, 0.015, 0.05 * s, T.ink, { line: false }), -0.16 * s, 0.02 * s, 0);
  const fl = o.wing ?? -1; for (const side of [-1, 1]) { const w = box(0.04 * s, 0.015, 0.28 * s, gull ? T.paper : T.light); w.geometry.translate(0, 0, side * 0.14 * s); const a = fl < 0 ? -0.1 : Math.sin(fl * Math.PI * 2) * 0.7; w.rotation.x = -side * a; w.position.set(0, 0.04 * s, 0); w.userData.side = side; g.add(w); w.name = 'ala'; }
  return g;
}
// ---------- bikes ----------
const _tubeUp = new THREE.Vector3(0, 1, 0);
// tube(g, a, b, r, tone): thin box between two points (frames, rails)
export function tube(g, a, b, r = 0.012, t = T.ink) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const m = box(r * 2, len, r * 2, t, { line: false }); m.position.copy(A.clone().add(B).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(_tubeUp, d.normalize()); g.add(m); return m;
}
// bike({tone=T.dark, basket:true, wheelPhase:0, rider:false, tilt}) Dutch upright bike, 1.75 m long, points to +x, origin on the ground under the middle. wheels named 'rueda' so they can spin.
export function bike(o = {}) {
  const g = G('calle:bici'), t = o.tone ?? T.dark;
  for (const x of [-0.58, 0.58]) {
    const w = new THREE.Group(); w.name = 'rueda'; const tor = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.022, 6, 22), mat(T.ink)); tor.castShadow = true; w.add(tor);
    for (let i = 0; i < 4; i++) { const sp = box(0.012, 0.64, 0.012, T.mid, { line: false }); sp.rotation.z = i * Math.PI / 4; w.add(sp); }
    const hub = cyl(0.04, 0.04, 0.05, T.dark, { seg: 8, line: false }); hub.rotation.x = Math.PI / 2; w.add(hub); w.position.set(x, 0.35, 0); w.rotation.z = o.wheelPhase ?? 0; g.add(w);
  }
  tube(g, [-0.58, 0.35, 0], [-0.18, 0.62, 0], 0.014, t); tube(g, [-0.18, 0.62, 0], [0.30, 0.66, 0], 0.014, t); tube(g, [0.30, 0.66, 0], [0.58, 0.35, 0], 0.014, t);   // frame (step-through)
  tube(g, [-0.2, 0.62, 0], [0.05, 0.34, 0], 0.014, t); tube(g, [0.05, 0.34, 0], [-0.58, 0.35, 0], 0.014, t); tube(g, [0.3, 0.66, 0], [0.3, 1.0, 0], 0.014, T.ink);
  tube(g, [0.3, 1.0, -0.26], [0.3, 1.0, 0.26], 0.012, T.ink); tube(g, [0.2, 1.0, -0.26], [0.3, 1.0, -0.26], 0.012, T.ink); tube(g, [-0.2, 0.62, 0], [-0.2, 0.9, 0], 0.012, T.ink);
  blk(g, 0.26, 0.05, 0.12, -0.22, 0.9, 0, T.ink); blk(g, 0.34, 0.02, 0.1, -0.5, 0.58, 0, T.ink, { line: false }); // saddle, rear rack
  at(g, box(0.3, 0.025, 0.08, t, { line: false }), -0.38, 0.45, 0, 0, 0, 0.0);
  if (o.basket !== false) blk(g, 0.25, 0.18, 0.34, 0.45, 0.86, 0, T.light);
  if (o.tilt) g.rotation.z = o.tilt; return g;
}
