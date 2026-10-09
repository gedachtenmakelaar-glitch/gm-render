// GM base world: THE card (owner: main chat). Dil, 08/10/2026: every card is the ad / v4.1 card, only its place and size change.
// White face with the navy 5 px outline (radius 30 on 364 x 608), mono label top-left + number top-right, a dithered (retro) icon,
// a heavy title, an underline and a mono line; REAL thickness (24 stacked slices, 16 % of the width (v4.1: 12.6 %, a bit more here so the edge reads on a phone)), a halftone
// (dot) shadow that separates and softens with the height, a side sheen. It is a real 3D object: it can float in a room at any angle,
// or face the camera full screen on the orange field (the 2D ad look). It is NOT dithered (crisp, like the ad): put it in the CLEAN
// scene of the video (ctx.clean), never in the retro world. Everything is a pure function of its arguments (frames render apart).
//
//   import { tarjeta } from '../motor/tarjeta.js';
//   const c = tarjeta({ label: 'coach', num: '01', title: 'Coach', sub: 'from €1.05/min', icon: 'chat', w: 0.6 });  // w = width in metres
//   ctx.clean.scene.add(c.group);   c.group.position/rotation/scale: the OUTER group, yours (this file never touches it)
//   c.outline()   -> local points (group space) of the face outline, clockwise from the top-left: the pen draws the border only
//   c.underline() -> local points [x,y,z] of the line under the title (the pen traces it ~0.3 s while the text rises)
//   c.show(k)     -> 0..1 build: 0 nothing, the fill rises from the bottom (k 0.15-0.75), the slab thickens and the shadow appears (0.5-1)
//   c.write(wq,t) -> 0..1 the interior enters (NOT pen-written): label, number, title, line letter by letter, rising from a soft blur;
//                    the 3D icon builds itself (scale + turn from 0 with a spring). t = clock for the icon's slow turn.
//   c.tick(t,amp) -> t = seconds since the card started to build (0 = fill starts). Spring entry with elevation, two-axis sway, bob,
//                    shadow separation, sheen. Moves an INNER pivot only. amp 0..1 scales the pose (1 = the ad's pose rx 9 / ry -14).
//   LOGO face (09/10/2026): tarjeta({ logo: true, w }) = the same body, but the face shows only the OFFICIAL joined lockup, as wide as the face allows
//                    (motor/recursos/gm-logo-oficial-*.png). o.navy (default true): navy #1a3854 face + orange logo; o.navy = false: beige #F9F8F5 face + navy logo.
//                    write(wq) brings the logo in over 0..1 with the house spring from a soft blur. underline() = a short line under the logo.
//   c.penAt(wq)   -> (kept for compatibility) a point travelling over the interior; no longer needed.
// Fonts: 'GM Jakarta' 800 and 'GM Mono' 500 + 700 must be loaded before tarjeta() (motor/video.html does it).
import * as G from './gm3d.js';
import { makeRetro } from './retro.js';
const { THREE } = G;
const NAVY = '#1a3854';
const W0 = 364, H0 = 608, R0 = 30, S = 3;          // the ad card in px, texture at 3x
const HL = 304;                                      // the LOGO card is half as tall (364 x 304 face)
const DEP_LOGO = 0.11;                              // the LOGO card: a medium edge (clearly 3D, not chunky)
const DEP_K = 0.16, NSL = 24;                      // depth = 12.6 % of the width (v4.1: 46 px on 364), in 24 slices
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const seg = (t, s, d) => clamp((t - s) / d, 0, 1);
const eo3 = (x) => 1 - Math.pow(1 - x, 3);
const sprOut = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.exp(-8 * u) * Math.cos(9 * u));   // damped spring 0 -> 1 with a ~6 % overshoot
// the logo images (only used by tarjeta({logo:true})). Top-level await: every importer waits until they are decoded, so the first frame already has them.
// If they cannot be loaded (e.g. a still job that copies no png) the logo face is drawn empty and the other cards are not affected.
const loadImg = (name) => new Promise((res) => { const im = new Image(); const to = setTimeout(() => res(null), 8000); im.onload = () => { clearTimeout(to); res(im); }; im.onerror = () => { clearTimeout(to); res(null); }; im.src = new URL('./recursos/' + name, import.meta.url).href; });
const LOGO = { orange: await loadImg('gm-logo-oficial-orange.png'), navy: await loadImg('gm-logo-oficial-navy.png') };   // the OFFICIAL lockup (GM. LOGO PNG), cropped to its box + 6 px
const LOGO_LAY = { w: 328 };   // card px: the lockup is 861 x 286, so it is 109 px high; as wide as the face allows (18 px side margins)
const logoBox = () => { const h = LOGO_LAY.w * 286 / 861; return { y: (HL - h) / 2, h }; };
const sprIn = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.exp(-6 * u) * Math.cos(8 * u));   // the house spring for the logo (soft overshoot ~ 3 %)
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// the interior enters in wq 0..1: each block [from, to]; the icon builds itself from `icon`
const STEPS = { label: [0, 0.3], num: [0.06, 0.34], icon: [0.1, 0.7], dots: [0.4, 0.62], title: [0.3, 0.72], sub: [0.56, 1] };
// layout in card px (364 x 608). Text is big on purpose: at ~650 px of card on a 1080 x 1920 screen it gives >= 40 px capitals.
const LAY = { x: 32, innerW: 300, labelBase: 62, numBase: 62, iconSize: 232, iconCy: 214, dotsY: 336, titleBase: 446, ulY: 464, subBase: 548 };

function fitFont(c, family, weight, size, min, text, maxW) {
  let s = size; for (; s > min; s -= 1) { c.font = `${weight} ${s}px '${family}'`; if (c.measureText(text).width <= maxW) break; }
  c.font = `${weight} ${s}px '${family}'`; return s;
}
// measure everything once: font sizes (auto-fit), per-letter x positions, widths
function layout(o) {
  if (o.logo) return null;
  const cv = document.createElement('canvas'), c = cv.getContext('2d'); c.textBaseline = 'alphabetic';
  const item = (family, weight, size, min, text, maxW) => {
    const px = fitFont(c, family, weight, size, min, text, maxW), font = c.font, xs = [];
    for (let i = 0; i < text.length; i++) xs.push(c.measureText(text.slice(0, i)).width);
    return { text, px, font, xs, w: c.measureText(text).width };
  };
  const num = item('GM Mono', 700, 32, 22, o.num || '', 120);
  const label = item('GM Mono', 500, 32, 20, '// ' + (o.label || ''), LAY.innerW - num.w - 16);
  const title = item('GM Jakarta', 800, 68, 38, o.title || '', LAY.innerW);
  const sub = item('GM Mono', 500, 32, 20, o.sub || '', LAY.innerW);
  return { label, num, title, sub };
}

// the face. Letters enter one by one: rise 18 px, from a 7 px blur, 0 -> 1 opacity, small stagger (like the brand's kinetic text).
function drawFace(c, o, M, w) {
  const HC = o.logo ? HL : H0;
  c.setTransform(S, 0, 0, S, 0, 0); c.clearRect(0, 0, W0, HC); c.filter = 'none'; c.globalAlpha = 1;
  rrect(c, 0, 0, W0, HC, R0); c.save(); c.clip();
  const g = c.createLinearGradient(0, 0, W0, 0);
  if (o.logo) { const f = o.navy !== false ? NAVY : '#F9F8F5'; g.addColorStop(0, f); g.addColorStop(1, f); } else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#ffffff'); g.addColorStop(1, '#f1f2f6'); }
  c.fillStyle = g; c.fillRect(0, 0, W0, HC);
  if (o.logo) {   // the logo face: icon then wordmark, each rising 16 px from a 10 px blur with a spring scale
    const B = logoBox();
    const put = (im, cx, y, ww, hh, k) => { const u = sprIn(k); if (!im || k <= 0) return; const e = eo3(k);
      c.save(); c.globalAlpha = Math.min(1, e * 1.4); c.filter = e < 0.999 ? `blur(${((1 - e) * 10 * S).toFixed(2)}px)` : 'none';
      const sc = 0.86 + 0.14 * u; c.translate(cx, y + hh / 2 + (1 - e) * 16); c.scale(sc, sc); c.drawImage(im, -ww / 2, -hh / 2, ww, hh); c.restore(); };
    put(o.navy !== false ? LOGO.orange : LOGO.navy, W0 / 2, B.y, LOGO_LAY.w, B.h, seg(w, 0, 1));
    c.restore(); c.strokeStyle = NAVY; c.lineWidth = 5; rrect(c, 2.5, 2.5, W0 - 5, HC - 5, R0 - 2); c.stroke(); return;
  }
  const kk = (n) => seg(w, STEPS[n][0], STEPS[n][1] - STEPS[n][0]);
  c.textBaseline = 'alphabetic';
  const kin = (it, x, base, color, k) => {
    if (k <= 0) return; c.fillStyle = color; c.font = it.font; const n = it.text.length;
    for (let i = 0; i < n; i++) {
      const u = eo3(seg(k, n > 1 ? 0.62 * i / (n - 1) : 0, 0.38)); if (u <= 0) continue;
      c.globalAlpha = u; c.filter = u < 0.999 ? `blur(${((1 - u) * 7 * S).toFixed(2)}px)` : 'none';
      c.fillText(it.text[i], x + it.xs[i], base + (1 - u) * 18);
    }
    c.globalAlpha = 1; c.filter = 'none';
  };
  kin(M.label, LAY.x, LAY.labelBase, '#5f6b76', kk('label'));
  kin(M.num, W0 - LAY.x - M.num.w, LAY.numBase, NAVY, kk('num'));
  // the dotted ground shadow under the icon (halftone, like the ad)
  { const k = kk('dots'); if (k > 0) { c.fillStyle = NAVY; c.globalAlpha = eo3(k); const ox = (W0 - 190) / 2, oy = LAY.dotsY; for (let x = 0; x < 180; x += 6) for (let y = 0; y < 3; y++) if ((x / 6 + y) % 2 === 0 || Math.abs(x - 90) < 50) c.fillRect(ox + 5 + x, oy + y * 6, 3.6, 3.6); c.globalAlpha = 1; } }
  kin(M.title, LAY.x, LAY.titleBase, NAVY, kk('title'));
  kin(M.sub, LAY.x, LAY.subBase, '#4a5866', kk('sub'));
  c.restore();
  c.strokeStyle = NAVY; c.lineWidth = 5; rrect(c, 2.5, 2.5, W0 - 5, HC - 5, R0 - 2); c.stroke();
}
// the 3D icon (dithered like the world, on white): a small scene with its own retro pass, rendered into a texture
function icon3D(kind) {
  const sz = 320, cv = document.createElement('canvas'); cv.width = cv.height = sz;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true }); r.setClearColor(0xffffff, 0); r.setPixelRatio(1); r.setSize(sz, sz, false); r.outputColorSpace = THREE.SRGBColorSpace;
  const retro = makeRetro(r, sz, sz, { cell: 4, paper: [255, 255, 255], paperAlpha: 0 });   // paper = transparent: only the dots sit on the card
  const sc = new THREE.Scene(); sc.background = new THREE.Color(1, 1, 1);
  sc.add(new THREE.AmbientLight(0xffffff, 0.75)); const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(-2, 3, 4); sc.add(dl);
  const grp = new THREE.Group(); sc.add(grp);
  if (kind === 'heart') {
    const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; pts.push([16 * Math.sin(a) ** 3 / 17, (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17]); }
    const m = G.extrude(pts, 0.35, G.TONE.mid); m.position.z = -0.17; grp.add(m);
  } else if (kind === 'hourglass') {
    grp.add(G.lathe([[0.02, -0.9], [0.55, -0.85], [0.5, -0.4], [0.08, 0], [0.5, 0.4], [0.55, 0.85], [0.02, 0.9]], G.TONE.light));
    for (const y of [-0.95, 0.95]) { const c = G.cyl(0.65, 0.65, 0.1, G.TONE.dark); c.position.y = y; grp.add(c); }
  } else {   // chat: rounded bubble with a tail and three dots (the coach card of the ad)
    const P = [], rr = 0.28, x0 = -0.85, x1 = 0.85, y0 = -0.5, y1 = 0.6, arc = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; P.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } };
    arc(x1 - rr, y1 - rr, 0); arc(x0 + rr, y1 - rr, Math.PI / 2); arc(x0 + rr, y0 + rr, Math.PI); P.push([-0.25, y0], [-0.45, -0.85], [-0.02, y0]); arc(x1 - rr, y0 + rr, -Math.PI / 2);
    const m = G.extrude(P, 0.32, G.TONE.mid); m.position.z = -0.16; grp.add(m);
    for (const x of [-0.42, 0, 0.42]) { const d = G.sphere(0.13, G.TONE.ink); d.position.set(x, 0.05, 0.2); grp.add(d); }
  }
  G.drawOn(grp, 1, { lineShare: 0.6, fillStart: 0.5 });   // fully drawn: it is built by scale + turn, not by drawing
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 0.15, 4.4); cam.lookAt(0, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  let last = null;
  return { tex, render(t, k) {   // k 0..1: the icon builds itself (spring scale + a half turn); t: it then turns slowly
    const key = Math.round(t * 30) + ':' + Math.round(k * 240); if (key === last) return; last = key;
    const e = k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.exp(-4.5 * k) * Math.cos(7 * k), s = Math.max(0.001, e);
    grp.scale.setScalar(s);
    grp.rotation.set(0.12 + 0.05 * Math.sin(t * 1.3), -0.45 + 0.3 * Math.sin(t * 0.9) - (1 - e) * 3.4, 0);
    G.setLineResolution(sc, sz, sz);
    retro.render(sc, cam); tex.needsUpdate = true; } };
}

// halftone (dot) shadow: a soft rounded-rect mask turned into dots on a 30 deg screen grid; the dots grow where the shadow is dense
const SH_VERT = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SH_FRAG = `precision highp float; varying vec2 vP; uniform vec2 uHalf; uniform float uR, uSoft, uOp, uCell;
float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r; }
void main(){
  float d = sdRR(vP, uHalf, uR);
  float a = 1.0 - smoothstep(-uSoft, uSoft * 1.6, d);
  if (a < 0.02) discard;
  float c = 0.5236, s = sin(c); c = cos(c);
  vec2 g = mat2(c, -s, s, c) * gl_FragCoord.xy / uCell;
  float dist = length(fract(g) - 0.5);
  float rad = sqrt(a) * 0.58;
  float m = 1.0 - smoothstep(rad - 0.07, rad + 0.04, dist);
  if (m < 0.01) discard;
  gl_FragColor = vec4(0.102, 0.2196, 0.3294, m * uOp);
}`;
// side sheen over the face (clipped by the same rising plane): white on the lit side, a little navy on the other
const SN_VERT = `#include <clipping_planes_pars_vertex>
varying vec2 vP; void main(){ vP = position.xy; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <clipping_planes_vertex>
}`;
const SN_FRAG = `precision highp float; varying vec2 vP; uniform vec2 uHalf; uniform float uR, uWh, uNv, uAng;
#include <clipping_planes_pars_fragment>
float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r; }
void main(){
#include <clipping_planes_fragment>
  if (sdRR(vP, uHalf, uR) > -0.0005) discard;
  vec2 dir = vec2(sin(uAng), cos(uAng));
  float L = abs(dir.x) * uHalf.x * 2.0 + abs(dir.y) * uHalf.y * 2.0;
  float p = dot(vP, dir) / L + 0.5;
  float wh = uWh * (1.0 - smoothstep(0.0, 0.42, p)), nv = uNv * smoothstep(0.58, 1.0, p);
  float a = wh + nv; if (a < 0.002) discard;
  vec3 col = (wh * vec3(1.0) + nv * vec3(0.102, 0.2196, 0.3294)) / a;
  gl_FragColor = vec4(col, a);
}`;

export function tarjeta(o = {}) {
  const HC = o.logo ? HL : H0;
  const w = o.w ?? 0.6, h = w * HC / W0, r = w * R0 / W0, dep = w * (o.logo ? DEP_LOGO : DEP_K), pxm = w / W0;   // pxm: metres per card px
  const group = new THREE.Group(); group.name = 'tarjeta:' + (o.logo ? 'logo' : (o.label || ''));
  const pivot = new THREE.Group(); pivot.name = 'tarjeta-pivot'; group.add(pivot);   // sway / bob / elevation live here, never on `group`
  const x0 = -w / 2, y0 = -h / 2;
  const mkShape = (inset) => { const a = x0 + inset, b = y0 + inset, ww = w - 2 * inset, hh = h - 2 * inset, rr = Math.max(0.001, r - inset), s = new THREE.Shape();
    s.moveTo(a + rr, b); s.lineTo(a + ww - rr, b); s.quadraticCurveTo(a + ww, b, a + ww, b + rr); s.lineTo(a + ww, b + hh - rr);
    s.quadraticCurveTo(a + ww, b + hh, a + ww - rr, b + hh); s.lineTo(a + rr, b + hh); s.quadraticCurveTo(a, b + hh, a, b + hh - rr); s.lineTo(a, b + rr); s.quadraticCurveTo(a, b, a + rr, b); return s; };
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), clips = [clip];
  // the slab: stacked slices from just behind the face to the back, beige tinted more and more with navy (like the v4.1); the back one is navy
  const sliceGeo = new THREE.ShapeGeometry(mkShape(0), 10), slices = [];
  const beige = new THREE.Color('#F4EFE6'), navy = new THREE.Color(NAVY);
  for (let i = 0; i < NSL; i++) {
    const a = 0.2 + 0.6 * i / (NSL - 1); let col = beige.clone().lerp(navy, a); if (i === NSL - 1) col.copy(navy);
    if (o.logo) { const t = i / (NSL - 1), dark = o.navy !== false;   // logo card: a navy-tinted edge that reads the same on both faces (lighter navy on the navy one so it does not vanish)
      col = new THREE.Color(dark ? '#7f9ab4' : '#9db0c2').lerp(new THREE.Color(dark ? '#2d4f6e' : '#1a3854'), t); }
    const m = new THREE.Mesh(sliceGeo, new THREE.MeshBasicMaterial({ color: col, clippingPlanes: clips, side: THREE.DoubleSide })); m.renderOrder = 1;
    pivot.add(m); slices.push(m);
  }
  const cv = document.createElement('canvas'); cv.width = W0 * S; cv.height = HC * S; const fx = cv.getContext('2d');
  const faceTex = new THREE.CanvasTexture(cv); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 8;
  const M = layout(o); let wNow = -1; drawFace(fx, o, M, 0);
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, clippingPlanes: clips, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat); face.renderOrder = 2; pivot.add(face);
  const ic = o.logo ? { tex: null, render() {} } : icon3D(o.icon), icS = w * LAY.iconSize / W0;
  // the icon plane: no depth write (it used to z-fight with the face when the card shrank), drawn right after the face
  const icon = new THREE.Mesh(new THREE.PlaneGeometry(icS, icS), new THREE.MeshBasicMaterial({ map: ic.tex, transparent: true, depthWrite: false, clippingPlanes: clips, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  icon.position.set(0, (0.5 - LAY.iconCy / HC) * h, 0.0004); icon.renderOrder = 3; pivot.add(icon);
  const snU = { uHalf: { value: new THREE.Vector2(w / 2, h / 2) }, uR: { value: r }, uWh: { value: 0.12 }, uNv: { value: 0.04 }, uAng: { value: 1.75 } };
  const sheenMat = new THREE.ShaderMaterial({ uniforms: snU, vertexShader: SN_VERT, fragmentShader: SN_FRAG, transparent: true, depthWrite: false, clipping: true, clippingPlanes: clips, extensions: {} });
  sheenMat.clipping = true;
  const sheen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), sheenMat); sheen.position.z = 0.0008; sheen.renderOrder = 4; pivot.add(sheen);
  // the halftone shadow: a plane behind the slab
  const shU = { uHalf: { value: new THREE.Vector2(w / 2, h / 2) }, uR: { value: r }, uSoft: { value: 0.02 * w }, uOp: { value: 0.5 }, uCell: { value: 8 } };
  const shMat = new THREE.ShaderMaterial({ uniforms: shU, vertexShader: SH_VERT, fragmentShader: SH_FRAG, transparent: true, depthWrite: false });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.7, h * 1.45), shMat); sh.renderOrder = 0; pivot.add(sh);
  let ksNow = 1, hgNow = 1, shOp = 1;
  // slices + shadow depend on show() (thickness) and tick() (height): re-place them whenever either changes
  const place = () => {
    const d = dep * ksNow; slices.forEach((m, i) => { m.position.z = -d * (i + 1) / NSL; m.visible = ksNow > 0.02; });
    const hg = hgNow, gap = (0.035 + 0.1 * hg) * w;
    sh.position.set((0.05 + 0.1 * hg) * w, -(0.06 + 0.12 * hg) * w, -d - gap - 0.002);
    sh.scale.setScalar(1.03 + 0.09 * hg);   // grows with the height (the mask lives in plane space, so it scales with it)
    shU.uSoft.value = (0.018 + 0.05 * hg) * w;
    shU.uOp.value = shOp * (0.46 - 0.1 * Math.min(1.3, hg));
  };
  const toG = (v) => { pivot.updateMatrix(); return v.applyMatrix4(pivot.matrix); };   // pivot space -> group space (the pen works in group space)
  const V3 = (px, py, z = 0.002) => new THREE.Vector3((px / W0 - 0.5) * w, (0.5 - py / HC) * h, z);
  const outline = () => {   // clockwise from the top-left of the face
    const z = 0.002, p = [[-w / 2, h / 2 - r], [-w / 2 + r * 0.3, h / 2 - r * 0.3], [-w / 2 + r, h / 2], [w / 2 - r, h / 2], [w / 2 - r * 0.3, h / 2 - r * 0.3], [w / 2, h / 2 - r],
      [w / 2, -h / 2 + r], [w / 2 - r * 0.3, -h / 2 + r * 0.3], [w / 2 - r, -h / 2], [-w / 2 + r, -h / 2], [-w / 2 + r * 0.3, -h / 2 + r * 0.3], [-w / 2, -h / 2 + r], [-w / 2, h / 2 - r]];
    return p.map(([a, b]) => toG(new THREE.Vector3(a, b, z)));
  };
  const underline = () => (o.logo ? (() => { const B = logoBox(), y = B.y + B.h + 22, a = W0 / 2 - 56; return [[a, y], [W0 / 2, y], [a + 112, y]]; })()
    : [[LAY.x, LAY.ulY], [LAY.x + M.title.w * 0.5, LAY.ulY], [LAY.x + M.title.w, LAY.ulY]]).map(([a, b]) => toG(V3(a, b, 0.003)));   // [x,y,z] group space
  // (compat) a point travelling over the interior; the pen no longer writes it
  const penAt = (wq) => {
    if (o.logo) return toG(V3(W0 / 2, HC / 2));
    const st = (n) => seg(wq, STEPS[n][0], STEPS[n][1] - STEPS[n][0]);
    if (wq < STEPS.icon[0]) return toG(V3(LAY.x + M.label.w * st('label'), LAY.labelBase - 10));
    if (wq < STEPS.title[0]) { const a = -2.36 + st('icon') * Math.PI * 2; return toG(V3(182 + 112 * Math.cos(a), LAY.iconCy + 112 * Math.sin(a))); }
    if (wq < STEPS.sub[0]) return toG(V3(LAY.x + M.title.w * st('title'), LAY.titleBase - 20));
    return toG(V3(LAY.x + M.sub.w * st('sub'), LAY.subBase - 12));
  };
  let ph = 0; for (const ch of (o.label || 'x')) ph += ch.charCodeAt(0); ph = (ph % 7) * 0.9;
  const D2R = Math.PI / 180;
  const api = {
    group, pivot, w, h, outline, underline, penAt,
    // the interior enters (wq 0..1). Returns null (the pen does not write it). t: clock for the icon's slow turn
    write(wq, t = 0) {
      const q = Math.round(clamp(wq, 0, 1) * 240) / 240; if (q !== wNow) { wNow = q; drawFace(fx, o, M, q); faceTex.needsUpdate = true; }
      const ki = seg(q, STEPS.icon[0], STEPS.icon[1] - STEPS.icon[0]); icon.visible = !o.logo && ki > 0 && face.visible; if (icon.visible) ic.render(t, ki);
      return null;
    },
    show(k, lift = 1) {
      group.visible = k > 0;
      const kf = seg(k, 0.15, 0.6), ks = eo3(seg(k, 0.5, 0.5));
      // the fill rises from the bottom: a clipping plane in world space along the card's up axis (pivot pose included)
      group.updateMatrixWorld(true);
      const up = new THREE.Vector3(0, 1, 0).transformDirection(pivot.matrixWorld), sc = new THREE.Vector3().setFromMatrixScale(pivot.matrixWorld).y;
      const bottom = pivot.localToWorld(new THREE.Vector3(0, -h / 2 - 0.001, 0));
      const top = bottom.clone().addScaledVector(up, (h + 0.002) * sc * kf);
      clip.setFromNormalAndCoplanarPoint(up.clone().negate(), top);
      slices.forEach((m) => { m.visible = kf > 0 && ks > 0.02; }); face.visible = kf > 0; sheen.visible = kf > 0; if (kf <= 0) icon.visible = false;
      sh.visible = ks > 0; ksNow = ks; shOp = ks; place();
    },
    // t = seconds since the card started to build. Pure function of t.
    tick(t, amp = 1) {
      const d = t, up = d <= 0 ? 0 : Math.min(1.08, sprOut(d / 0.9)), lift = d <= 0.12 ? 0 : sprOut((d - 0.12) / 1.0), fl = Math.max(0, d - 0.12), ramp = seg(d, 0.12, 0.6);
      const bob = 11 * pxm * Math.sin(2 * Math.PI * 0.4 * fl + ph) * ramp;   // v4.1: 11 px at 364 px
      // base pose rx 9 deg (top away) / ry -14 deg (right side to us). The sway never gets close to 0: |ry| >= 12, |rx| >= 7.5.
      const pose = 0.35 + 0.65 * up, ry = amp * (-17 * pose * D2R) + 5 * D2R * up * Math.sin(2 * Math.PI * 0.28 * fl + ph),
        rx = amp * (-10 * pose * D2R) + 2.5 * D2R * up * Math.sin(2 * Math.PI * 0.36 * fl + ph * 2);
      pivot.rotation.set(rx, ry, 0, 'YXZ');
      pivot.position.set(0, amp * 0.044 * w * lift + bob, amp * 0.06 * w * lift);   // elevation toward us + the float
      hgNow = Math.max(0, lift * (1 + 0.25 * bob / (8 * pxm)));
      const ryd = ry / D2R;
      snU.uWh.value = 0.10 + Math.max(0, -ryd) / 120; snU.uNv.value = 0.04 + Math.max(0, ryd) / 160; snU.uAng.value = (100 + ryd * 2) * D2R;
      place(); pivot.updateMatrix();
    },
  };
  api.tick(99, 1);   // settled pose by default, so the thickness shows even if the caller never calls tick()
  return api;
}
