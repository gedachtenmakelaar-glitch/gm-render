// GM base world: the brand thread ON SCREEN (owner: main chat). Same look as the 2D kit: navy line 8.5 px, round caps, orange
// pen dot r 10 with a 3 px navy ring, always on top of the picture. 3D things are reached with screenOf(cam, worldPoint).
// Pure functions of t.
//
//   import * as H from '../motor/hilo2d.js';
//   const th = H.thread(svg);                 // svg = overlay <svg> with viewBox = video size
//   th.set(points, tip)                       // points [[x,y],...] (smoothed here), tip [x,y] or null (no pen dot)
//   H.hop(a, b, lift)                         // arc from a to b (screen), lift px above the higher end
//   H.part(points, k0, k1)                    // the piece of a polyline between fractions k0..k1 of its length
//   H.SEAM                                    // the hand-over to the standard logo ending (same numbers as _kit lib.js SEAM)
const NS = 'http://www.w3.org/2000/svg';
export const NAVY = '#1a3854', ORANGE = '#FFA462';
const E = (tag, at, p) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };
const f1 = (v) => (+v).toFixed(1);

// Catmull-Rom through the points, n samples per span
export function cr(P, n = 8) {
  if (P.length < 3) return P.slice();
  const o = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      o.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  o.push(P[P.length - 1]); return o;
}
export function length(P) { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; }
// point at distance d along P
export function at(P, d) {
  let L = 0;
  for (let i = 1; i < P.length; i++) { const s = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (L + s >= d) { const f = s ? (d - L) / s : 0; return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f]; } L += s; }
  return P[P.length - 1].slice();
}
// sub-polyline between fractions k0..k1 of the length
export function part(P, k0, k1) {
  const L = length(P), a = Math.max(0, k0) * L, b = Math.min(1, k1) * L; if (b <= a) return [];
  const o = [at(P, a)]; let d = 0;
  for (let i = 1; i < P.length; i++) { d += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (d > a && d < b) o.push(P[i]); }
  o.push(at(P, b)); return o;
}
// an arc between two screen points (the travelling thread)
export function hop(a, b, lift = 160) { return cr([a, [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - lift], b], 14); }
export const d = (P) => P.length ? 'M' + P.map((p) => f1(p[0]) + ',' + f1(p[1])).join('L') : '';

export function thread(svg, o = {}) {
  const k = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal.width : 1080) / 1080;
  const g = E('g', {}, svg);
  // halo: a thin paper-coloured edge so the thread reads over dark dotted areas (as in the 2D kit)
  const halo = E('path', { fill: 'none', stroke: '#F9F8F5', 'stroke-width': f1(14 * k), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.9 }, g);
  const line = E('path', { fill: 'none', stroke: o.accent ? ORANGE : NAVY, 'stroke-width': f1(8.5 * k), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  const pen = E('circle', { r: f1(10 * k), fill: ORANGE, stroke: NAVY, 'stroke-width': f1(3 * k), style: 'display:none' }, g);
  return {
    el: g,
    halo(on) { halo.style.display = on ? '' : 'none'; },   // off on clean beige (the seam into the logo has none)
    set(points, tip) {
      const dd = points && points.length > 1 ? d(points) : ''; line.setAttribute('d', dd); halo.setAttribute('d', dd);
      if (tip) { pen.style.display = ''; pen.setAttribute('cx', f1(tip[0])); pen.setAttribute('cy', f1(tip[1])); } else pen.style.display = 'none';
    },
  };
}

// Hand-over to the standard ending (videos/_base/final/logo.html, the approved 6.6 s logo). In the last TAIL seconds before
// the logo the picture must already be clean beige #F4EFE6 and the thread is exactly this: a line from below the frame up to
// the tip, tip at x 540 rising 600 px/s, so the first logo frame continues it without a jump. END = time the logo starts.
export const SEAM = {
  TAIL: 0.436, BEIGE: '#F4EFE6',
  tip: (t, END) => [540, 1322 - 600 * (t - (END - 0.436))],
  anchor: (t, END) => [557.47 + 5.15 * (t - END + 0.209), 3000],
  points(t, END) { const a = SEAM.anchor(t, END), b = SEAM.tip(t, END); return cr([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], 10); },
};
