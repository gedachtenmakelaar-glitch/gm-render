// GM base world: shared 3D engine (owner: main chat). Everything in _base is built with this, so building,
// waiting room and characters share ONE camera, ONE light set and ONE retro look (grey render -> Bayer dither, see still.py).
// Units: 1 = 1 metre. y up, ground y = 0. Facades face +z (cameras usually look towards -z). Pure functions of T only.
import * as THREE from 'three';
export { THREE };

// ---- tones: everything is grey; the dither turns grey into dot density. 0 = black ink, 1 = paper.
// Use these names, not raw colours, so all parts read the same after the dither.
export const TONE = { ink: 0.08, dark: 0.32, mid: 0.55, light: 0.74, pale: 0.86, paper: 0.97 };
const _mats = new Map();
// mat(t): matte material of tone t (0..1). opts.accent = true marks it ORANGE (#FFA462) in the final image (keep it under ~10 %).
export function mat(t = TONE.mid, opts = {}) {
  const key = `${t}|${!!opts.accent}|${opts.rough ?? 0.6}|${!!opts.double}`;
  if (_mats.has(key)) return _mats.get(key);
  const v = Math.max(0, Math.min(1, t));
  const c = new THREE.Color(v, v, v); c.convertSRGBToLinear();
  const m = new THREE.MeshStandardMaterial({ color: c, roughness: opts.rough ?? 0.6, metalness: 0,
    side: opts.double ? THREE.DoubleSide : THREE.FrontSide });
  m.userData.accent = !!opts.accent;
  _mats.set(key, m);
  return m;
}
// flat(t): unlit tone (signs, sky, glowing panels: always the same density whatever the light). opts.accent for orange.
export function flat(t = TONE.mid, opts = {}) { const v = Math.max(0, Math.min(1, t)); const c = new THREE.Color(v, v, v); c.convertSRGBToLinear(); const m = new THREE.MeshBasicMaterial({ color: c, side: opts.double ? THREE.DoubleSide : THREE.FrontSide }); m.userData.accent = !!opts.accent; return m; }
// glass / window panes: light tone, low roughness.
export const glass = () => mat(TONE.pale, { rough: 0.15 });

// ---- ink outlines (the navy line drawing). Primitives add them by default. thresholdDeg: which edges count.
const INK_LINE = new THREE.LineBasicMaterial({ color: 0x000000 });
export function ink(mesh, thresholdDeg = 28) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, thresholdDeg), INK_LINE);
  e.userData.isInk = true; mesh.add(e); return mesh;
}

// ---- primitives (Mesh, outlined unless {line:false}; o.accent for orange; o.shadow=false to not cast). Position = CENTRE.
const finish = (m, o) => { m.castShadow = o.shadow !== false; m.receiveShadow = true; if (o.line !== false) ink(m, o.edge ?? 28); return m; };
export function box(w, h, d, t = TONE.mid, o = {}) { return finish(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(t, o)), o); }
// box standing on a floor: footprint centre (x, z), bottom at y0
export function block(x, y0, z, w, h, d, t = TONE.mid, o = {}) { const m = box(w, h, d, t, o); m.position.set(x, y0 + h / 2, z); return m; }
export function cyl(rTop, rBot, h, t = TONE.mid, o = {}) { return finish(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, o.seg ?? 28), mat(t, o)), { edge: 50, ...o }); }
export function sphere(r, t = TONE.mid, o = {}) { return finish(new THREE.Mesh(new THREE.SphereGeometry(r, o.seg ?? 28, Math.round((o.seg ?? 28) * 0.66)), mat(t, o)), { line: false, ...o }); }
export function capsule(r, len, t = TONE.mid, o = {}) { return finish(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), mat(t, o)), { line: false, ...o }); }
export function plane(w, h, t = TONE.mid, o = {}) { return finish(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(t, { double: true, ...o })), { line: false, ...o }); }
// extruded 2D outline: pts = [[x,y],...] metres, depth along +z (gables, furniture profiles, signs). o.holes = [[[x,y],...],...]
export function extrude(pts, depth, t = TONE.mid, o = {}) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  (o.holes || []).forEach((h) => s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)))));
  return finish(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), mat(t, o)), o);
}
// lathe: profile [[r,y],...] turned around y (vases, lamps, cups, bottles)
export function lathe(profile, t = TONE.mid, o = {}) { return finish(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), o.seg ?? 32), mat(t, o)), { edge: 60, ...o }); }
// a line in ink (cables, strings, motion lines): pts = [[x,y,z],...]
export function inkLine(pts) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p))), INK_LINE); l.userData.isInk = true; return l; }

// ---- tags. name = catalogue name; layer for parallax plates: 'fondo' (sky, far city), 'medio' (default), 'frente' (foreground).
export function tag(obj, name, layer) { obj.name = name; if (layer) obj.userData.layer = layer; return obj; }

// ---- lights by mood ('dia' | 'tarde' | 'noche'). Key light from the top LEFT (house rule). Call once per scene.
export function lights(scene, mood = 'dia', o = {}) {  // o.key: key-light factor (interiors 0.6-0.8)
  const g = new THREE.Group(); g.name = 'luces';
  const M = { dia: [0.55, 2.3, 0.6], tarde: [0.45, 1.9, 0.9], noche: [0.34, 1.05, 0.42] }[mood] || [0.55, 2.3, 0.6];   // noche: halfway to day (Dil, 09/10: dark but readable)
  g.add(new THREE.AmbientLight(0xffffff, M[0]));
  const key = new THREE.DirectionalLight(0xffffff, M[1] * (o.key ?? 1)); key.position.set(-30, 45, 40); key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096); const c = key.shadow.camera; c.left = -45; c.right = 45; c.top = 45; c.bottom = -15; c.near = 1; c.far = 180; key.shadow.bias = -0.0004;
  g.add(key); g.add(key.target);
  const rim = new THREE.DirectionalLight(0xffffff, M[2]); rim.position.set(25, 12, -20); g.add(rim);
  scene.add(g); g.userData.key = key; return g;
}
// a warm interior / street light (shows at 'noche'). Make the bulb mesh accent if it should read orange.
export function lamp(x, y, z, power = 6, dist = 7) { const p = new THREE.PointLight(0xffffff, power, dist, 2); p.position.set(x, y, z); return p; }

// ---- cameras: plain data so they live in catalogues (camaras.json).
// { pos:[x,y,z], look:[x,y,z], fov:30 }  perspective (vertical fov, degrees)
// { pos, look, ortho: halfHeight }       orthographic (dollhouse front view; frame height = 2*halfHeight metres)
export function camera(spec, aspect) {
  let cam;
  if (spec.ortho) { const h = spec.ortho; cam = new THREE.OrthographicCamera(-h * aspect, h * aspect, h, -h, 0.1, 600); }
  else cam = new THREE.PerspectiveCamera(spec.fov ?? 30, aspect, 0.05, 800);
  cam.position.set(...spec.pos); cam.lookAt(new THREE.Vector3(...spec.look)); cam.updateProjectionMatrix();
  return cam;
}

// ---- deterministic randomness (never Math.random): const r = rng(7); r() -> [0,1)
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- used by still.html: normal pass on the left half of the canvas, accent mask (white = orange) on the right half.
const MASK = { on: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), off: new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }) };
function layerOf(o) { for (let p = o; p; p = p.parent) if (p.userData && p.userData.layer) return p.userData.layer; return 'medio'; }
export function renderPair(renderer, scene, cam, W, H, onlyLayer) {
  const hidden = [];
  setLineResolution(scene, W, H);
  if (onlyLayer) scene.traverse((o) => { if ((o.isMesh || o.isLine) && layerOf(o) !== onlyLayer && o.visible) { hidden.push(o); o.visible = false; } });
  renderer.setScissorTest(true);
  renderer.setViewport(0, 0, W, H); renderer.setScissor(0, 0, W, H); renderer.render(scene, cam);
  const saved = [];
  scene.traverse((o) => {
    if (o.userData && o.userData.hilo) { if (!o.material.userData.accent && o.visible) { saved.push([o, null]); o.visible = false; } }
    else if (o.userData && o.userData.hull) { if (o.visible) { saved.push([o, null]); o.visible = false; } }
    else if (o.isMesh) { saved.push([o, o.material]); const ms = Array.isArray(o.material) ? o.material : [o.material]; o.material = ms.some((m) => m.userData.accent) ? MASK.on : MASK.off; }
    else if (o.isLine && o.visible) { saved.push([o, null]); o.visible = false; }
  });
  const bg = scene.background; scene.background = new THREE.Color(0x000000);
  renderer.setViewport(W, 0, W, H); renderer.setScissor(W, 0, W, H); renderer.render(scene, cam);
  scene.background = bg;
  saved.forEach(([o, m]) => { if (m) o.material = m; else o.visible = true; });
  hidden.forEach((o) => { o.visible = true; });
  renderer.setScissorTest(false);
}

// ---- THE THREAD DRAWS THINGS INTO EXISTENCE (Dil, 08/10/2026: the brand thread builds every house, person and card).
// drawOn(group, k): k 0..1. First the ink outlines appear in pen order (one continuous stroke as far as possible), then the
// fill comes in (in the dither: dots grow from paper to full tone). k >= 1 restores the object exactly. Pure function of k.
// Returns { tip: THREE.Vector3 (world) | null, done }: the pen position, so a screen-space thread (SVG in the composition)
// can end on it: screenOf(cam, tip, W, H). opts: { lineShare: 0.7 (part of k used by the outline), fillStart: 0.55 }.
const _plans = new WeakMap();
const PEN_MAT = new THREE.LineBasicMaterial({ color: 0x000000 });
function planFor(obj) {
  if (_plans.has(obj)) return _plans.get(obj);
  obj.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
  const segs = [], lines = [], meshes = [];
  const v = new THREE.Vector3();
  obj.traverse((o) => {
    if (o.userData.pen || o.userData.hilo) return;
    if (o.isMesh) meshes.push(o);
    if (o.userData.isInk && o.geometry && o.geometry.attributes.position) {
      lines.push(o);
      const p = o.geometry.attributes.position, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      const at = (i) => v.fromBufferAttribute(p, i).applyMatrix4(m).toArray();
      if (o.isLineSegments) for (let i = 0; i + 1 < p.count; i += 2) segs.push([at(i), at(i + 1)]);
      else for (let i = 0; i + 1 < p.count; i++) segs.push([at(i), at(i + 1)]);
    }
  });
  // pen order: greedy nearest-endpoint chaining from the lowest-left point (snake rows if very many segments)
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  let order = [];
  if (segs.length <= 4000) {
    const used = new Uint8Array(segs.length);
    let cur = segs.reduce((best, s) => { const p = s[0][1] < s[1][1] ? s[0] : s[1]; return !best || p[1] + p[0] * 0.01 < best[1] + best[0] * 0.01 ? p : best; }, null) || [0, 0, 0];
    for (let n = 0; n < segs.length; n++) {
      let bi = -1, bd = Infinity, flip = false;
      for (let i = 0; i < segs.length; i++) { if (used[i]) continue; const a = d2(cur, segs[i][0]), b = d2(cur, segs[i][1]); if (a < bd) { bd = a; bi = i; flip = false; } if (b < bd) { bd = b; bi = i; flip = true; } }
      used[bi] = 1; const s = flip ? [segs[bi][1], segs[bi][0]] : segs[bi]; order.push(s); cur = s[1];
    }
  } else {
    const band = 0.5;
    order = segs.slice().sort((a, b) => { const ya = Math.floor(Math.min(a[0][1], a[1][1]) / band), yb = Math.floor(Math.min(b[0][1], b[1][1]) / band); if (ya !== yb) return ya - yb; const dir = ya % 2 ? -1 : 1; return dir * (Math.min(a[0][0], a[1][0]) - Math.min(b[0][0], b[1][0])); });
  }
  const pos = new Float32Array(order.length * 6), cum = new Float32Array(order.length);
  let L = 0;
  order.forEach((s, i) => { pos.set(s[0], i * 6); pos.set(s[1], i * 6 + 3); L += Math.sqrt(d2(s[0], s[1])); cum[i] = L; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pen = new THREE.LineSegments(g, PEN_MAT); pen.userData.pen = true; pen.userData.isInk = true; pen.visible = false; obj.add(pen);
  const plan = { lines, meshes, pen, cum, total: L, order };
  _plans.set(obj, plan); return plan;
}
export function drawOn(obj, k, opts = {}) {
  const P = planFor(obj);
  const ls = opts.lineShare ?? 0.7, fs = opts.fillStart ?? 0.55;
  if (k >= 1) {
    P.lines.forEach((l) => { l.visible = true; }); P.pen.visible = false;
    P.meshes.forEach((m) => { m.visible = true; if (m.userData._orig) m.material = m.userData._orig; });
    return { tip: null, done: true };
  }
  P.lines.forEach((l) => { l.visible = false; });
  const kl = Math.max(0, Math.min(1, k / ls)), target = kl * P.total;
  let n = 0; while (n < P.cum.length && P.cum[n] <= target) n++;
  P.pen.visible = n > 0; P.pen.geometry.setDrawRange(0, n * 2);
  const kf = Math.max(0, Math.min(1, (k - fs) / (1 - fs)));
  P.meshes.forEach((m) => {
    if (kf <= 0) { m.visible = false; return; }
    m.visible = true;
    if (!m.userData._orig) m.userData._orig = m.material;
    if (!m.userData._fade) { const f = (Array.isArray(m.material) ? m.material[0] : m.material).clone(); f.transparent = true; f.userData = { ...m.userData._orig.userData }; m.userData._fade = f; }
    m.userData._fade.opacity = kf; m.material = m.userData._fade;
  });
  const last = n > 0 ? P.order[n - 1][1] : (P.order[0] ? P.order[0][0] : [0, 0, 0]);
  return { tip: obj.localToWorld(new THREE.Vector3(...last)), done: false };
}
// world point -> screen px (for the 2D thread overlay in a composition)
export function screenOf(cam, p, W, H) { const q = p.clone().project(cam); return [(q.x + 1) / 2 * W, (1 - q.y) / 2 * H]; }
// sequence helper: items [{ obj, t0, dur }] -> calls drawOn for each at time t; returns the active pen tip (or null)
export function drawSequence(items, t, opts) { let tip = null; for (const it of items) { const r = drawOn(it.obj, (t - it.t0) / it.dur, opts); if (!r.done && r.tip && t >= it.t0) tip = r.tip; } return tip; }

// ---- READY-MADE MODELS (CC0, _base/modelos/: Kenney kits; licences inside each kit). They are restyled on load: their
// colours become our grey tones (by brightness, or o.tone / o.tones per mesh name), they get ink outlines and shadows, so
// they look like the rest of the world. Load them ONCE, before build(): export from your scene module
//   export const MODELOS = ['modelos/kenney/furniture-kit/loungeSofa.glb', ...];   (still.html preloads them)
// then inside build():  const s = modelo('modelos/kenney/furniture-kit/loungeSofa.glb', { w: 2.0 });  (feet on y=0, centred)
// o: { h | w | d | l (target size in metres; l = the longest horizontal side, e.g. a car's length; default keeps the file scale), tone (one tone for all), tones: {meshName: tone},
//      accent: true | [meshNames], edge: 35 (ink threshold), line: true }
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const _models = new Map();
export async function preloadModels(paths = []) {
  const L = new GLTFLoader();
  await Promise.all(paths.filter((p) => !_models.has(p)).map(async (p) => { const g = await L.loadAsync('./' + p); _models.set(p, g.scene); }));
}
function lumOf(m) {
  if (!m || !m.color) return 0.6;
  const c = m.color.clone(); c.convertLinearToSRGB();
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}
export function modelo(path, o = {}) {
  const src = _models.get(path);
  if (!src) throw new Error('modelo not preloaded: ' + path + ' (add it to MODELOS)');
  const g = src.clone(true);
  const q = (t) => Math.round(t * 20) / 20;
  g.traverse((m) => {
    if (!m.isMesh) return;
    const t = o.tones && o.tones[m.name] != null ? o.tones[m.name] : o.tone != null ? o.tone : q(0.18 + 0.78 * lumOf(Array.isArray(m.material) ? m.material[0] : m.material));
    const acc = o.accent === true || (Array.isArray(o.accent) && o.accent.includes(m.name));
    m.material = mat(t, { accent: acc });
    m.castShadow = true; m.receiveShadow = true;
    if (o.line !== false) ink(m, o.edge ?? 35);
  });
  const box3 = new THREE.Box3().setFromObject(g), size = box3.getSize(new THREE.Vector3());
  let s = 1;
  if (o.h) s = o.h / size.y; else if (o.w) s = o.w / size.x; else if (o.d) s = o.d / size.z; else if (o.l) s = o.l / Math.max(size.x, size.z);
  const wrap = new THREE.Group();
  g.position.set(-(box3.min.x + size.x / 2), -box3.min.y, -(box3.min.z + size.z / 2));
  wrap.add(g); wrap.scale.setScalar(s);
  return tag(wrap, 'modelo:' + path.split('/').pop().replace('.glb', ''));
}

// ---- THICK LINES. hilo(): the brand thread in 3D (fixed width in screen px, like the 8.5 px thread of the ads).
// pts = [[x,y,z],...]; o: { px: 8.5, accent: false (true = the orange thread of the ending) }.
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
export function hilo(pts, o = {}) {
  const geo = new LineGeometry(); geo.setPositions(pts.flat());
  const m = new LineMaterial({ color: o.accent ? 0xffa462 : 0x000000, linewidth: o.px ?? 8.5, worldUnits: false });
  m.userData.accent = !!o.accent; m.userData.fatLine = true;
  const l = new Line2(geo, m); l.computeLineDistances(); l.userData.hilo = true;
  return l;
}
// LineMaterial needs the viewport size: renderPair and retro.js call this before rendering
export function setLineResolution(scene, W, H) { scene.traverse((o) => { if (o.material && o.material.userData && o.material.userData.fatLine) o.material.resolution.set(W, H); }); }

// ---- SILHOUETTE OUTLINE for round shapes (capsules, spheres, heads, limbs: EdgesGeometry gives them no line).
// Inverted hull: a slightly bigger copy, black, back faces only. thick in metres (0.012 is a clear line on a person at 1080p).
const HULL = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
export function silueta(mesh, thick = 0.012) {
  mesh.geometry.computeBoundingSphere();
  const bs = mesh.geometry.boundingSphere, r = Math.max(0.001, bs.radius), k = 1 + thick / r;
  const h = new THREE.Mesh(mesh.geometry, HULL); h.scale.setScalar(k); h.position.copy(bs.center).multiplyScalar(1 - k);
  h.userData.hull = true; h.castShadow = false;
  mesh.add(h); return mesh;
}

// ---- pen position WITHOUT changing the object (for the thick thread's trail in a video): world point of the pen at k
// (same timing as drawOn: the outline uses the first opts.lineShare of k). Null before the object has outlines.
export function penAt(obj, k, opts = {}) {
  const P = planFor(obj); if (!P.order.length) return null;
  const kl = Math.max(0, Math.min(1, k / (opts.lineShare ?? 0.7))), target = kl * P.total;
  let n = 0; while (n < P.cum.length && P.cum[n] <= target) n++;
  const s = P.order[Math.min(n, P.order.length - 1)], prev = n > 0 ? P.cum[n - 1] : 0, len = (P.cum[Math.min(n, P.cum.length - 1)] - prev) || 1;
  const f = Math.max(0, Math.min(1, (target - prev) / len));
  return obj.localToWorld(new THREE.Vector3(s[0][0] + (s[1][0] - s[0][0]) * f, s[0][1] + (s[1][1] - s[0][1]) * f, s[0][2] + (s[1][2] - s[0][2]) * f));
}
