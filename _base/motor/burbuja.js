// GM base world: THE bubble (owner: main chat). Dil, 08/10/2026: every bubble in the series is the SAME shape and the SAME
// size: a chat message (WhatsApp style) with its little tail at the bottom, left or right depending on where the character is.
// It lives in SCREEN space (an <svg> over the video), so it never changes size with the camera. Pure function of t.
//
//   import { burbuja } from '../motor/burbuja.js';
//   const b = burbuja(svg);                                   // svg = the overlay <svg> (viewBox = video size)
//   b.draw(t, { t0: 3.2, t1: 4.6, head: [x, y], side: 'L', face: 'worried' });   // null hides it
//      head  = screen point of the top of the head (screenOf(cam, rig.anchor('head') + up));
//      side  = where the TAIL is: 'L' = bottom-left corner (bubble to the right of the head), 'R' = bottom-right.
//      texto = optional 1-3 words (GM Jakarta 800 navy): bubble grows WIDER (same height/radius/line/shadow/tail), draw() returns the real w.
//              pen draws outline+fill+face then underlines the word; letters rise in from a blur (not pen-written). face+texto: face left, word right.
//      face  = one of FACES; the face draws itself in (pencil), the bubble pops in with the house spring and leaves in 0.2 s.
// Size is fixed: SIZE.w x SIZE.h px at 1080 wide (scaled with the video width). Safe zone keeps it inside the frame.
const NS = 'http://www.w3.org/2000/svg';
const NAVY = '#1a3854', OR = '#FFA462', PAPER = '#F9F8F5';
export const SIZE = { w: 236, h: 184, r: 46, line: 7, shadow: 9 };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const seg = (t, s, d) => clamp((t - s) / d, 0, 1);
const spr = (t, z = 0.55, w = 13) => { if (t <= 0) return 0; const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)); };
const E = (tag, at, p) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (p) p.appendChild(e); return e; };

// faces: box 140 x 140 centred on (0, 0); strokes in drawing order. S = line, F = filled shape
const S = (d, w = 7, o) => ({ d, w, o }), F = (d, fill) => ({ d, fill });
const C = (cx, cy, r) => `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
const HEAD = S(C(0, 0, 60), 7);
export const FACES = {
  neutral: [HEAD, F(C(-22, -12, 7), 'navy'), F(C(22, -12, 7), 'navy'), S('M-20,26L20,26', 7)],
  worried: [HEAD, S('M-38,-24L-12,-36', 6), S('M12,-36L38,-24', 6), F(C(-22, -10, 6), 'navy'), F(C(22, -10, 6), 'navy'),
    S('M-24,30Q-18,22 -12,30T0,30T12,30T24,30', 6), F('M46,-50Q58,-30 46,-22Q34,-30 46,-50Z', 'orange')],
  sad: [HEAD, S('M-38,-22L-12,-34', 6), S('M12,-34L38,-22', 6), F(C(-22, -8, 6), 'navy'), F(C(22, -8, 6), 'navy'),
    S('M-22,36Q0,14 22,36', 7), F('M-24,4Q-14,20 -24,26Q-34,20 -24,4Z', 'orange')],
  surprised: [HEAD, S('M-36,-36Q-22,-50 -8,-36', 6), S('M8,-36Q22,-50 36,-36', 6), S(C(-22, -12, 10), 6), S(C(22, -12, 10), 6),
    F(C(-22, -11, 4), 'navy'), F(C(22, -11, 4), 'navy'), F('M-11,30a11,14 0 1,0 22,0a11,14 0 1,0 -22,0', 'orange')],
  happy: [HEAD, S('M-34,-8Q-22,-26 -10,-8', 7), S('M10,-8Q22,-26 34,-8', 7), S('M-30,14Q0,48 30,14', 7),
    F('M-48,14a10,6 0 1,0 20,0a10,6 0 1,0 -20,0', 'orange'), F('M28,14a10,6 0 1,0 20,0a10,6 0 1,0 -20,0', 'orange')],
  curious: [HEAD, F(C(-22, -8, 7), 'navy'), F(C(22, -8, 9), 'navy'), S('M8,-32Q22,-46 38,-34', 6), S('M-30,-28L-12,-28', 6), S(C(6, 28, 7), 6)],
};

// the one shape: rounded rectangle + tail at a bottom corner (the chat-message tail, curving out and down)
function shape(w, h, r, side) {
  const x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2;
  if (side === 'L') return `M${x0 + r},${y0}H${x1 - r}A${r},${r} 0 0 1 ${x1},${y0 + r}V${y1 - r}A${r},${r} 0 0 1 ${x1 - r},${y1}H${x0 + 34}` +
    `C${x0 + 18},${y1} ${x0 + 2},${y1 + 10} ${x0 - 22},${y1 + 30}C${x0 - 4},${y1 + 4} ${x0},${y1 - 14} ${x0},${y1 - 34}V${y0 + r}A${r},${r} 0 0 1 ${x0 + r},${y0}Z`;
  return `M${x0 + r},${y0}H${x1 - r}A${r},${r} 0 0 1 ${x1},${y0 + r}V${y1 - 34}C${x1},${y1 - 14} ${x1 + 4},${y1 + 4} ${x1 + 22},${y1 + 30}` +
    `C${x1 - 2},${y1 + 10} ${x1 - 18},${y1} ${x1 - 34},${y1}H${x0 + r}A${r},${r} 0 0 1 ${x0},${y1 - r}V${y0 + r}A${r},${r} 0 0 1 ${x0 + r},${y0}Z`;
}

let UID = 0;
const mctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
const measure = (s, fs) => { mctx.font = `800 ${fs}px 'GM Jakarta', 'Plus Jakarta Sans', sans-serif`; return mctx.measureText(s).width; };
const FACE_W = 96, FACE_FS = FACE_W / 127;
// text layout in bubble units (centre 0,0): width, letter x positions, font size, face centre
function layout(texto, hasFace, maxW) {
  if (!texto) return { w: SIZE.w };
  const pad = hasFace ? 36 : 46, fw = hasFace ? FACE_W : 0, gp = hasFace ? 20 : 0;
  let fz = 56, tw = measure(texto, fz); const avail = maxW - 2 * pad - fw - gp;
  if (tw > avail) { fz = Math.max(44, Math.floor(56 * avail / tw)); tw = measure(texto, fz); }
  const w = Math.max(SIZE.w, 2 * pad + fw + gp + tw), left = -w / 2 + (w - (fw + gp + tw)) / 2, x0 = left + fw + gp;
  const xs = []; for (let i = 0; i < texto.length; i++) xs.push(x0 + measure(texto.slice(0, i), fz));
  return { w, fz, tw, x0, xs, fx: left + fw / 2, base: Math.round(0.34 * fz - 6) };
}

export function burbuja(svg, opts = {}) {
  const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : { width: 1080, height: 1920 };
  const k = (opts.scale ?? 1) * vb.width / 1080, Hb = SIZE.h * k, uid = ++UID;
  const maxW = (vb.width - 2 * 60 * k) / k;
  const g = E('g', { style: 'display:none' }, svg);
  const defs = E('defs', {}, g);
  const inner = E('g', {}, g);
  const shadow = E('path', { fill: NAVY }, inner);
  const body = E('path', { fill: PAPER, stroke: NAVY, 'stroke-width': SIZE.line, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, inner);
  const face = E('g', {}, inner);
  const tg = E('g', {}, inner);
  // the pen that draws it (screen space, on top): the thread arriving + the orange dot
  const hopH = E('path', { fill: 'none', stroke: PAPER, 'stroke-width': (14 * k).toFixed(1), 'stroke-linecap': 'round', opacity: 0.9, style: 'display:none' }, svg);
  const hop = E('path', { fill: 'none', stroke: NAVY, 'stroke-width': (8.5 * k).toFixed(1), 'stroke-linecap': 'round', style: 'display:none' }, svg);
  const pen = E('circle', { r: (10 * k).toFixed(1), fill: OR, stroke: NAVY, 'stroke-width': (3 * k).toFixed(1), style: 'display:none' }, svg);
  let faceName = null, parts = [], textKey = null, letters = [], under = null;
  function setFace(name) {
    if (name === faceName) return; faceName = name; face.innerHTML = ''; parts = [];
    if (!name) return;
    (FACES[name] || FACES.neutral).forEach((p) => {
      const e = p.fill ? E('path', { d: p.d, fill: p.fill === 'orange' ? OR : NAVY }, face)
        : E('path', { d: p.d, fill: 'none', stroke: p.o ? OR : NAVY, 'stroke-width': p.w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': '1 1' }, face);
      parts.push([e, !!p.fill]);
    });
  }
  function setText(texto, L) {
    const key = texto ? texto + '|' + L.fz + '|' + L.x0.toFixed(1) : '';
    if (key === textKey) return; textKey = key; tg.innerHTML = ''; defs.innerHTML = ''; letters = []; under = null;
    if (!texto) return;
    for (let i = 0; i < texto.length; i++) {
      if (texto[i] === ' ') continue;
      const id = `gmb${uid}_${i}`, f = E('filter', { id, x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
      const bl = E('feGaussianBlur', { stdDeviation: 0 }, f);
      const e = E('text', { x: L.xs[i].toFixed(1), y: L.base, 'font-family': "'GM Jakarta', 'Plus Jakarta Sans', sans-serif", 'font-weight': 800, 'font-size': L.fz, fill: NAVY }, tg);
      e.textContent = texto[i]; letters.push({ e, bl, id, i });
    }
    const uy = L.base + 17, xm = L.x0 + L.tw / 2;
    under = E('path', { d: `M${L.x0.toFixed(1)},${uy}Q${xm.toFixed(1)},${uy + 8} ${(L.x0 + L.tw).toFixed(1)},${uy - 2}`, fill: 'none', stroke: OR, 'stroke-width': 6, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1' }, tg);
  }
  const at = (el, f) => { const L = el.getTotalLength(); const q = el.getPointAtLength(Math.max(0, Math.min(1, f)) * L); return [q.x, q.y]; };
  return {
    // returns the bubble box {x, y, w, h, drawing} (screen px, without tail; w = real width) or null
    // Drawn like everything else: (thread arrives from st.from) > the pen traces the outline clockwise from the top left >
    // the fill comes in > the pen draws the face stroke by stroke > (texto) the letters rise in from a blur while the pen underlines.
    // st.from = screen point the thread comes from (optional).
    draw(t, st) {
      const off = () => { g.style.display = 'none'; hop.style.display = 'none'; hopH.style.display = 'none'; pen.style.display = 'none'; return null; };
      if (!st || t < st.t0 || t > st.t1 + 0.2) return off();
      g.style.display = '';
      const texto = (st.texto || '').trim().slice(0, 40);
      const L = layout(texto, !!st.face && !!texto, maxW), Wd = L.w, Wb = Wd * k;
      const side = st.side || 'L', [hx, hy] = st.head, gap = 26 * k;
      let cx = side === 'L' ? hx + Wb / 2 + 22 * k : hx - Wb / 2 - 22 * k, cy = hy - gap - 30 * k - Hb / 2;
      cx = clamp(cx, 60 * k + Wb / 2, vb.width - 60 * k - Wb / 2); cy = clamp(cy, 240 * k + Hb / 2, vb.height - 300 * k);
      const pre = st.from ? 0.14 : 0, a = t - st.t0, out = 1 - seg(t, st.t1, 0.2), s = Math.max(0.001, out);
      const ox = side === 'L' ? -Wb / 2 - 22 * k : Wb / 2 + 22 * k, oy = Hb / 2 + 30 * k;
      g.setAttribute('transform', `translate(${(cx + ox).toFixed(1)},${(cy + oy).toFixed(1)}) scale(${s.toFixed(4)}) translate(${(-ox).toFixed(1)},${(-oy).toFixed(1)})`);
      inner.setAttribute('transform', `scale(${k})`);
      const d = shape(Wd, SIZE.h, SIZE.r, side);
      body.setAttribute('d', d); shadow.setAttribute('d', d); shadow.setAttribute('transform', `translate(${SIZE.shadow},${SIZE.shadow})`);
      body.setAttribute('pathLength', '1');
      let fs, fx = 0;
      if (st.face || !texto) setFace(st.face || 'neutral'); else setFace(null);
      if (texto) { fs = FACE_FS; fx = L.fx || 0; } else fs = 0.92 * Math.min(SIZE.w, SIZE.h) / 140;
      face.setAttribute('transform', `translate(${fx.toFixed(1)},0) scale(${fs.toFixed(3)})`);
      setText(texto, L);
      // screen point from a point in a part's local frame (scale f, x offset px, bubble units)
      const scr = (q, f = 1, px = 0) => [cx + k * (px + f * q[0]), cy + k * f * q[1]];
      const kO = seg(a, pre, 0.34), kF = seg(a, pre + 0.3, 0.12), kD = seg(a, pre + 0.42, 0.55);
      body.setAttribute('stroke-dasharray', '1 1'); body.setAttribute('stroke-dashoffset', (1 - kO).toFixed(4));
      body.style.fill = kF > 0 ? PAPER : 'none'; body.style.fillOpacity = kF.toFixed(3); shadow.style.opacity = kF.toFixed(3);
      let tip = null;
      if (st.from && a < pre) {   // the thread comes from the head
        const s0 = scr(at(body, 0)), f = st.from, m = [(f[0] + s0[0]) / 2, Math.min(f[1], s0[1]) - 70 * k], kk = a / pre;
        const P = []; for (let i = 0; i <= 16; i++) { const u = i / 16 * kk, w = 1 - u; P.push([w * w * f[0] + 2 * w * u * m[0] + u * u * s0[0], w * w * f[1] + 2 * w * u * m[1] + u * u * s0[1]]); }
        const hd = 'M' + P.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L'); hop.style.display = ''; hopH.style.display = ''; hop.setAttribute('d', hd); hopH.setAttribute('d', hd); tip = P[P.length - 1];
      } else { hop.style.display = 'none'; hopH.style.display = 'none'; }
      if (a >= pre && kO < 1) tip = scr(at(body, kO));
      // pen strokes in order: the face parts, then (texto) the underline
      const seq = parts.map(([e, fill]) => ({ e, fill, f: fs, px: fx }));
      if (under) seq.push({ e: under, fill: false, f: 1, px: 0 });
      const n = seq.length;
      seq.forEach(({ e, fill, f, px }, i) => {
        const kk = clamp(kD * n - i, 0, 1);
        if (fill) e.style.opacity = kk > 0.5 ? '1' : '0'; else e.setAttribute('stroke-dashoffset', (1 - kk).toFixed(3));
        if (kO >= 1 && kk > 0 && kk < 1) { const bb = e.getBBox(); tip = fill ? scr([bb.x + bb.width / 2, bb.y + bb.height / 2], f, px) : scr(at(e, kk), f, px); }
      });
      // letters: rise from a soft blur with a small stagger (not written by the pen)
      if (letters.length) {
        const nl = texto.length, st0 = pre + 0.26, step = nl > 1 ? 0.2 / (nl - 1) : 0, dur = 0.28;
        letters.forEach(({ e, bl, id, i }) => {
          const u = seg(a, st0 + i * step, dur), q = 1 - Math.pow(1 - u, 3);
          e.setAttribute('opacity', Math.min(1, u * 1.8).toFixed(3));
          e.setAttribute('transform', `translate(0,${((1 - q) * 22).toFixed(2)})`);
          const sd = (1 - q) * 7;
          if (sd > 0.05) { bl.setAttribute('stdDeviation', sd.toFixed(2)); e.setAttribute('filter', `url(#${id})`); } else e.removeAttribute('filter');
        });
      }
      if (tip && s > 0.99) { pen.style.display = ''; pen.setAttribute('cx', tip[0].toFixed(1)); pen.setAttribute('cy', tip[1].toFixed(1)); } else pen.style.display = 'none';
      return { x: cx - Wb / 2, y: cy - Hb / 2, w: Wb, h: Hb, drawing: a < pre + 0.97 };
    },
  };
}
