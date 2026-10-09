// GM base world: library of small 2D line doodles ("garabatos") that the animated pen draws next to a person.
// Plain ES module, no imports, no DOM. Every icon is { strokes: [[ [x,y], ... ], ...], acento: [[x,y], ...] | null }:
//   - points live in a box of about -45..45 (x right, y DOWN like SVG), centred on 0,0 (normalised at the bottom of this file)
//   - strokes are drawn in order by the pen; the first stroke starts near the top-left, main silhouette first, details after
//   - acento = ONE closed polygon filled orange (#FFA462) UNDER the navy line
// Points are computed at import time (arcs, Beziers, rounded rectangles) and are 15..140 per stroke.
const D = Math.PI / 180;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// ---- helpers -------------------------------------------------------------------------------------------------------------
// elliptical arc, angles in degrees (0 = right, 90 = down, increasing = clockwise on screen)
function arc(cx, cy, rx, ry, a0, a1, step = 3.5) {
  const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * D * Math.max(rx, ry)) / step)), o = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * D; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
  return o;
}
function bez(p0, p1, p2, p3, step = 3.5) {
  const L = (dist(p0, p1) + dist(p1, p2) + dist(p2, p3) + dist(p0, p3)) / 2, n = Math.max(2, Math.ceil(L / step)), o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    o.push([0, 1].map((c) => u * u * u * p0[c] + 3 * u * u * t * p1[c] + 3 * u * t * t * p2[c] + t * t * t * p3[c]));
  }
  return o;
}
// join several polylines into one (drops duplicated junction points)
function cat(...parts) {
  const o = [];
  for (const p of parts) for (const q of p) { const l = o[o.length - 1]; if (l && dist(l, q) < 0.01) continue; o.push(q); }
  return o;
}
// put extra points on straight segments so they draw smoothly (corners are kept exactly)
function lin(P, step = 4) {
  const o = [P[0]];
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], n = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let j = 1; j <= n; j++) o.push([a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n]);
  }
  return o;
}
const rot = (P, deg, cx = 0, cy = 0) => { const c = Math.cos(deg * D), s = Math.sin(deg * D); return P.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
// sub-polyline between fractions k0..k1 of the length
function sub(P, k0, k1) {
  let L = 0; for (let i = 1; i < P.length; i++) L += dist(P[i - 1], P[i]);
  const a = k0 * L, b = k1 * L, o = []; let d = 0;
  const at = (s) => { let acc = 0; for (let i = 1; i < P.length; i++) { const seg = dist(P[i - 1], P[i]); if (acc + seg >= s) { const f = seg ? (s - acc) / seg : 0; return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f]; } acc += seg; } return P[P.length - 1]; };
  o.push(at(a));
  for (let i = 1; i < P.length; i++) { d += dist(P[i - 1], P[i]); if (d > a && d < b) o.push(P[i]); }
  o.push(at(b)); return o;
}
// rounded rectangle, clockwise, starting on the left edge just under the top-left corner (closed)
function rrect(x0, y0, x1, y1, r) {
  return cat(arc(x0 + r, y0 + r, r, r, 180, 270), arc(x1 - r, y0 + r, r, r, 270, 360), arc(x1 - r, y1 - r, r, r, 0, 90), arc(x0 + r, y1 - r, r, r, 90, 180), [[x0, y0 + r]]);
}
// the two intersection points of two circles
function inter(c1, r1, c2, r2) {
  const d = dist(c1, c2), a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const ux = (c2[0] - c1[0]) / d, uy = (c2[1] - c1[1]) / d, px = c1[0] + a * ux, py = c1[1] + a * uy;
  return [[px - h * uy, py + h * ux], [px + h * uy, py - h * ux]];
}
// outline of a circle with round bumps (ears, paws...) stuck on it, clockwise, starting at the first bump after `startDeg`
function union(base, bumps, startDeg = 180) {
  const [bx, by, br] = base, ang = (p, cx, cy) => ((Math.atan2(p[1] - cy, p[0] - cx) / D) + 360) % 360;
  const items = bumps.map((b) => {
    let [p1, p2] = inter([bx, by], br, [b[0], b[1]], b[2]), a1 = ang(p1, bx, by), a2 = ang(p2, bx, by);
    if (((a2 - a1 + 360) % 360) > 180) { [p1, p2] = [p2, p1]; [a1, a2] = [a2, a1]; }
    return { b, p1, p2, a1, a2, key: (a1 - startDeg + 360) % 360 };
  }).sort((x, y) => x.key - y.key);
  const baseArc = (from, to) => { while (to <= from) to += 360; return arc(bx, by, br, br, from, to); };
  const parts = [];
  items.forEach((it, i) => {
    if (i > 0) parts.push(baseArc(items[i - 1].a2, it.a1));
    const ea = ang(it.p1, it.b[0], it.b[1]); let xa = ang(it.p2, it.b[0], it.b[1]); while (xa <= ea) xa += 360;
    parts.push(arc(it.b[0], it.b[1], it.b[2], it.b[2], ea, xa));
  });
  parts.push(baseArc(items[items.length - 1].a2, items[0].a1));
  return cat(...parts);
}
const circle = (cx, cy, r, from = 225) => arc(cx, cy, r, r, from, from + 360);

// ---- the icons -----------------------------------------------------------------------------------------------------------
const raw = {};

// ovillo: ball of yarn with two knitting needles crossed above it and stuck into it (the ball is the orange accent)
{
  const c = [0, 24], r = 26;
  const ball = circle(c[0], c[1], r, 225);
  const S = ball[0], T = [c[0] + r * Math.cos(20 * D), c[1] + r * Math.sin(20 * D)];
  const wrap = cat(ball, bez(S, [-14, 40], [14, 46], T), bez(T, [12, 28], [-8, 22], [-22, 36]));
  const k1 = [-42, -44], k2 = [42, -44], kn = (k, a) => [k[0] + 4.5 * Math.cos(a * D), k[1] + 4.5 * Math.sin(a * D)];
  const n1 = cat(arc(k1[0], k1[1], 4.5, 4.5, 45, 405), [kn(k1, 45), [14, 14]]);
  const n2 = cat(arc(k2[0], k2[1], 4.5, 4.5, 135, 495), [kn(k2, 135), [-14, 14]]);
  raw.ovillo = { strokes: [wrap, n1, n2], acento: ball };
}

// hueso: dog bone, tilted
{
  const b = cat(
    arc(-37, -9, 11, 11, 125, 381), [[26.8, -5]],
    arc(37, -9, 11, 11, 159, 415),
    arc(37, 9, 11, 11, 305, 561), [[-26.8, 5]],
    arc(-37, 9, 11, 11, 339, 595));
  raw.hueso = { strokes: [rot(b, -30)], acento: null };
}

// auriculares: over-ear headphones
{
  const band = arc(0, 4, 36, 44, 180, 360);
  const cupL = rrect(-48, 4, -26, 40, 9), cupR = rrect(26, 4, 48, 40, 9);
  raw.auriculares = { strokes: [band, cupL, cupR], acento: null };
}

// baquetas: two drumsticks crossed over a small drum
{
  const top = arc(0, 22, 34, 10, 180, 540);
  const body = cat([[-34, 22]], [[-34, 40]], arc(0, 40, 34, 10, 180, 0), [[34, 22]]);
  const drum = cat(arc(0, 22, 34, 10, 180, 360), [[34, 40]], arc(0, 40, 34, 10, 0, 180), [[-34, 22]]);
  const bead = (x, y) => arc(x, y, 5, 5, 0, 360);
  void bead;
  const s1 = cat([[-42, -46], [14, 12]], arc(18, 15, 5.5, 5.5, 135, 495));
  const s2 = cat([[42, -46], [-14, 12]], arc(-18, 15, 5.5, 5.5, 45, 405));
  raw.baquetas = { strokes: [top, body, s1, s2], acento: drum };
}

// osito: teddy bear, front view (muzzle is the accent, no eyes)
{
  const head = union([0, -14, 21], [[-15, -30, 8.5], [15, -30, 8.5]], 180);
  const body = union([0, 27, 18], [[-19, 20, 7], [19, 20, 7], [-11, 43, 7], [11, 43, 7]], 180);
  const muzzle = circle(0, -7, 8, 225);
  raw.osito = { strokes: [head, body, muzzle], acento: muzzle };
}

// zapatilla: fluffy bunny slipper, side view, two long ears on the toe
{
  // scalloped fluffy collar from heel to toe
  const collar = [];
  const x0 = -42, x1 = 8, nb = 4, w = (x1 - x0) / nb;
  for (let i = 0; i < nb; i++) { const cx = x0 + w * (i + 0.5); collar.push(arc(cx, -3, w / 2, 6, 180, 360)); }
  const body = cat(
    [[-43, 2]], ...collar, [[8, -3]],
    bez([8, -3], [24, -16], [49, -6], [49, 16]),
    bez([49, 16], [49, 29], [42, 35], [30, 35]), [[-32, 35]],
    bez([-32, 35], [-44, 35], [-47, 22], [-43, 2]));
  const earL = cat(bez([12, -8], [-2, -22], [2, -48], [14, -48]), bez([14, -48], [24, -48], [27, -26], [26, -10]));
  const earR = cat(bez([32, -8], [30, -24], [36, -46], [44, -44]), bez([44, -44], [52, -42], [50, -22], [42, -6]));
  raw.zapatilla = { strokes: [body, earL, earR], acento: body };
}

// bebe: baby in a swaddle, faceless
{
  const head = cat(circle(0, -28, 15, 270), bez([0, -43], [3, -50], [11, -50], [10, -44]));
  const body = cat(
    [[-14, -9]], bez([-14, -9], [-28, 4], [-30, 34], [-20, 41]), bez([-20, 41], [-10, 49], [10, 49], [20, 41]),
    bez([20, 41], [30, 34], [28, 4], [14, -9]), [[0, 2], [-14, -9]]);
  const band1 = bez([-28, 14], [-10, 22], [8, 30], [24, 38]);
  const band2 = bez([28, 14], [10, 22], [-8, 30], [-24, 38]);
  raw.bebe = { strokes: [head, body, band1, band2], acento: body };
}

// mapa: folded map with a dotted (dashed) route and a pin
{
  const map = [[-46, -26], [-15, -34], [-15, 28], [15, 36], [15, -26], [46, -34], [46, 28], [15, 36], [-15, 28], [-46, 36], [-46, -26]];
  const route = bez([-36, 22], [-20, -8], [-4, 30], [27, 4], 2);
  const pinC = [30, -12], pin = cat(
    arc(pinC[0], pinC[1], 9, 9, 150, 390), [[pinC[0] + 0, 9]], [[pinC[0] - 7.8, pinC[1] + 4.5]]);
  const pinShape = cat(arc(pinC[0], pinC[1], 9, 9, 150, 390), [[30, 6], [pinC[0] - 7.8, pinC[1] + 4.5]]);
  raw.mapa = { strokes: [map, sub(route, 0, 0.42), sub(route, 0.54, 0.82), pinShape], acento: pinShape };
}

// regadera: watering can: body with rear handle, slanted spout with a flat rose, two drops
{
  const body = cat(
    [[-8, 2], [28, 2], [28, 30]],
    bez([28, 30], [52, 30], [52, 8], [28, 8]),
    [[28, 8], [28, 2], [31, 38], [-12, 38], [-8, 2]]);
  const sp = cat([[-10, 32], [-38, 4]], [[-31.5, -3], [-45, 11], [-38, 4]]);
  const drop = (cx, cy) => cat(bez([cx, cy - 8], [cx + 2, cy - 4], [cx + 5, cy], [cx, cy + 5]), bez([cx, cy + 5], [cx - 5, cy], [cx - 2, cy - 4], [cx, cy - 8]));
  raw.regadera = { strokes: [body, sp, drop(-52, 24), drop(-38, 34)], acento: drop(-52, 24) };
}

// pincel: paintbrush on the diagonal with a paint blob
{
  const P0 = [44, -44], dir = [-0.7071, 0.7071], nrm = [0.7071, 0.7071];
  const pt = (t, k) => [P0[0] + dir[0] * t + nrm[0] * k, P0[1] + dir[1] * t + nrm[1] * k];
  const sil = cat(
    [pt(0, -3.5), pt(34, -5.5), pt(40, -7), pt(58, -7)],
    bez(pt(58, -7), pt(70, -8), pt(80, -3), pt(92, 4), 3),
    bez(pt(92, 4), pt(86, 4), pt(80, 8), pt(58, 7), 3),
    [pt(40, 7), pt(34, 5.5), pt(0, 3.5)], [pt(0, -3.5)]);
  const ferr = [pt(40, -7), pt(40, 7), pt(58, 7), pt(58, -7)];
  const blobC = [-31, 33];
  const blob = [];
  for (let i = 0; i <= 28; i++) { const a = (225 + (360 * i) / 28) * D, rr = 11 + 2.2 * Math.sin(3 * a + 0.8); blob.push([blobC[0] + rr * Math.cos(a), blobC[1] + rr * 0.85 * Math.sin(a)]); }
  raw.pincel = { strokes: [sil, ferr, blob], acento: blob };
}

// gato: sitting cat silhouette, no face (ginger = accent)
{
  const sil = cat(
    [[-18, -46], [-6, -35], [6, -35], [18, -46]], bez([18, -46], [22, -38], [24, -26], [19, -16], 3),
    bez([19, -16], [15, -8], [16, -4], [20, 6]), bez([20, 6], [30, 20], [32, 36], [29, 44]),
    [[-29, 44]], bez([-29, 44], [-32, 36], [-30, 20], [-20, 6]), bez([-20, 6], [-16, -4], [-15, -8], [-19, -16]),
    bez([-19, -16], [-24, -26], [-22, -38], [-18, -46], 3));
  const legs = cat([[0, 22], [0, 44]]);
  const chest = bez([-12, 16], [-6, 22], [6, 22], [12, 16]);
  const tail = bez([27, 42], [52, 48], [56, 18], [42, 14]);
  raw.gato = { strokes: [sil, cat(chest, [[12, 16]]), legs, tail], acento: sil };
}

// pan: loaf of bread with three score lines
{
  const loaf = arc(0, 6, 46, 29, 180, 540);
  const slash = (x) => bez([x - 9, -9], [x - 3, -9], [x + 3, 3], [x + 5, 14]);
  raw.pan = { strokes: [loaf, slash(-22), slash(0), slash(22)], acento: loaf };
}

// llave: old-style key with round bow (tilted)
{
  const bow = circle(-30, 0, 16, 225), hole = circle(-30, 0, 6, 225);
  const shaft = cat([[-14, 0], [46, 0], [46, 15], [36, 15], [36, 7], [28, 7], [28, 15], [19, 15], [19, 0]]);
  const tilt = (P) => rot(P, 35);
  raw.llave = { strokes: [tilt(bow), tilt(shaft), tilt(hole)], acento: tilt(bow) };
}

// casa: Dutch house with a bell gable (door is the orange accent)
{
  const outline = cat(
    [[-34, -8]], bez([-34, -8], [-20, -8], [-14, -16], [-12, -30]), bez([-12, -30], [-10, -45], [10, -45], [12, -30]),
    bez([12, -30], [14, -16], [20, -8], [34, -8]), [[34, 44], [-34, 44], [-34, -8]]);
  const door = cat([[-9, 44], [-9, 24]], arc(0, 24, 9, 9, 180, 360), [[9, 44]]);
  const doorFill = cat([[-9, 44], [-9, 24]], arc(0, 24, 9, 9, 180, 360), [[9, 44], [-9, 44]]);
  const win = (x) => [[x - 6, 6], [x + 6, 6], [x + 6, 18], [x - 6, 18], [x - 6, 6]];
  raw.casa = { strokes: [outline, door, win(-23), win(23)], acento: doorFill };
}

// corazon: heart with a small highlight
{
  const h = [];
  for (let i = 0; i <= 90; i++) {
    const t = (-1.0 + (2 * Math.PI * i) / 90);
    h.push([16 * Math.pow(Math.sin(t), 3), -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
  }
  const s = 2.7, heart = h.map(([x, y]) => [x * s, y * s - 4]);
  const shine = arc(-14, -8, 12, 12, 195, 265);
  raw.corazon = { strokes: [heart, shine], acento: heart };
}

// taza: coffee mug with handle and steam
{
  const bodyP = cat([[-38, -6], [8, -6], [8, 22]], arc(-15, 22, 23, 18, 0, 90), arc(-15, 22, 23, 18, 90, 180), [[-38, -6]]);
  const mug = cat([[-38, -6], [8, -6]], [[8, 22]], arc(-15, 22, 23, 18, 0, 90), arc(-15, 22, 23, 18, 90, 180), [[-38, -6]]);
  const handle = bez([8, 4], [34, -2], [34, 28], [6, 26]);
  const steam = (x) => { const o = []; for (let i = 0; i <= 14; i++) { const y = -12 - i * 2.2; o.push([x + 4.5 * Math.sin(i * 0.9), y]); } return o; };
  raw.taza = { strokes: [mug, handle, steam(-26), steam(-6)], acento: mug };
}

// ---- finishing: densify, clamp to 15..140 points, centre and scale to ~90 on the long side --------------------------------
function finish(P) {
  let Q = lin(P, 4);
  while (Q.length < 15) { // add points on the longest segments (corners stay put)
    let bi = 1, bl = 0; for (let i = 1; i < Q.length; i++) { const l = dist(Q[i - 1], Q[i]); if (l > bl) { bl = l; bi = i; } }
    Q.splice(bi, 0, [(Q[bi - 1][0] + Q[bi][0]) / 2, (Q[bi - 1][1] + Q[bi][1]) / 2]);
  }
  if (Q.length > 140) { // thin out evenly by arc length
    let L = 0; for (let i = 1; i < Q.length; i++) L += dist(Q[i - 1], Q[i]);
    const o = [Q[0]]; let acc = 0, next = L / 139;
    for (let i = 1; i < Q.length; i++) { acc += dist(Q[i - 1], Q[i]); if (acc >= next && o.length < 139) { o.push(Q[i]); next += L / 139; } }
    o.push(Q[Q.length - 1]); Q = o;
  }
  return Q;
}
function normalise(ic) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const S of ic.strokes) for (const [x, y] of S) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const k = 90 / Math.max(x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const f = (P) => P.map(([x, y]) => [Math.round((x - cx) * k * 10) / 10, Math.round((y - cy) * k * 10) / 10]);
  return { strokes: ic.strokes.map((S) => f(finish(S))), acento: ic.acento ? f(lin(ic.acento, 6)) : null };
}

export const GARABATOS = {};
for (const n of ['ovillo', 'hueso', 'auriculares', 'baquetas', 'osito', 'zapatilla', 'bebe', 'mapa', 'regadera', 'pincel', 'gato', 'pan', 'llave', 'casa', 'corazon', 'taza']) GARABATOS[n] = normalise(raw[n]);
export const NOMBRES = Object.keys(GARABATOS);
