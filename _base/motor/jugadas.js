// GM base world: THE PLAYBOOK (owner: main chat). A video is a table of beats ("pulsos") in clip.json; this module plays it.
// Every beat is a ready-made move with a name (draw the place, open to 3D, take the phone, bubble, card full screen, cut,
// rise to the logo...). A clip only needs clip.json; for something special, a clip.js can import this and add to it.
// Vocabulary and options: videos/LEEME.md (table "Jugadas"). Everything is a pure function of t.
import * as G from './gm3d.js';
import * as H2 from './hilo2d.js';
import { burbuja } from './burbuja.js';
import { tarjeta } from './tarjeta.js';
import { person, blendPose } from './personas.js';
import { GARABATOS } from './garabatos.js';
const { THREE } = G;

const SITIOS = { 'sala-espera': '../sala-espera/escena.js', 'edificio': '../edificio/escena.js' };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const seg = (t, s, d) => clamp((t - s) / Math.max(1e-6, d), 0, 1);
const io = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const ease3 = (k) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const lerp = (a, b, k) => a + (b - a) * k;
const V = (a) => new THREE.Vector3(...a);
const D2R = Math.PI / 180;
const TAIL = H2.SEAM.TAIL;
const CAM_BEATS = ['camara-plano', 'abrir-3d', 'camara', 'recorrido', 'tarjeta-en-sala', 'tarjeta-pantalla'];
const HILO_BEATS = ['dibujar-sitio', 'dibujar-vivienda', 'borrar-sitio', 'chip', 'garabato', 'tarjeta-en-sala', 'tarjeta-pantalla', 'tarjeta-al-movil', 'subir-al-logo'];
const PERSON_BEATS = ['colocar', 'caminar', 'pose', 'vida'];

let S = null, SS = null;

// ------------------------------------------------------------------ build
// "capitulos": [{desde, sitio, reparto, pulsos, tarjetas, coleccion}, ...] = several places or lights in one video: each chapter is
// built whole (its own world group, lights, people, beats with absolute times) and only the chapter of the moment is shown.
export async function build(ctx) {
  const caps = ctx.cfg.capitulos;
  if (!caps) { S = await buildOne(ctx.cfg, ctx, ctx.world.scene); S.desde = 0; SS = [S]; return; }
  SS = [];
  for (const c of caps) {
    const g = new THREE.Group(); g.name = 'capitulo'; ctx.world.scene.add(g);
    const s = await buildOne({ ...ctx.cfg, capitulos: undefined, ...c }, ctx, g); s.grupo = g; s.desde = c.desde ?? 0; s.bg = g.background || null; SS.push(s);
  }
  pick(0, ctx);
}
function pick(t, ctx) {
  let c = SS[0]; for (const s of SS) if (t >= s.desde) c = s;
  if (SS.length > 1) for (const s of SS) { s.grupo.visible = s === c; if (s !== c) hideChapter(s, t); }
  if (c.bg) ctx.world.scene.background = c.bg;
  S = c;
}
function hideChapter(s, t) {
  s.th.set(null, null); s.th2.set(null, null); s.dooG.style.display = 'none';
  Object.values(s.cards).forEach((k) => k.show(0));
  for (const [p, b] of s.bubbles) b.draw(t < p.t ? p.t - 50 : p.t + 50, { t0: p.t, t1: p.t + (p.dur || 1.2), head: [0, 0], from: [0, 0], side: 'L', face: null, texto: p.texto });
}
async function buildOne(cfg, ctx, host) {
  const { world, clean, svg, W, H } = ctx;
  const sitio = cfg.sitio || { tipo: 'sala-espera' };
  const MOD = await import(SITIOS[sitio.tipo] || sitio.tipo);
  if (MOD.MODELOS) await G.preloadModels(MOD.MODELOS);
  G.lights(host, sitio.mood || 'dia', { key: sitio.luz ?? 0.7 });
  const b = MOD.build(host, { gente: 'vacia', mood: sitio.mood || 'dia', ...(sitio.opts || {}) });
  const root = b.root || host;
  (sitio.ocultar || ['sala:muro-frente']).forEach((n) => root.traverse((o) => { if (o.name === n) o.visible = false; }));
  // cast: { id: { asiento: n | {z, n}, pos, rotY, pose, hold, emocion } }
  const P = {};
  for (const [id, r] of Object.entries(cfg.reparto || {})) {
    if (r.existente) {   // a person the place already has (the building's residents: 'residente:<id>')
      const nm = typeof r.existente === 'string' ? r.existente : id;   // the building's couple is 'pareja' and 'pareja#2'
      const p = root.getObjectByName('residente:' + nm) || root.getObjectByName('persona:' + nm) || root.getObjectByName('mascota:' + nm); if (!p) throw new Error('no está en el sitio: ' + nm);
      root.attach(p);
      const sent = /sit/.test(p.userData.pose || ''), wp = p.position.clone();
      P[id] = { g: p, r, sentado: sent, emo0: r.emocion ?? 2, focus: wp.clone().add(V([0, sent ? 0.95 : 1.25, 0])), pos0: wp, rot0: p.rotation.y, pose0: r.pose || p.userData.pose || 'stand', hold0: r.hold || {}, _emo: null }; continue;
    }
    const sentado = r.asiento != null;
    const p = person(id, r.pose || (sentado ? 'sit' : 'stand'), { hold: r.hold, emotion: r.emocion ?? 2 });
    let pos = r.pos || [0, 0, 0], rotY = r.rotY ?? 0;
    if (sentado) { const s = seatOf(b.seats, r.asiento); pos = s.pos; rotY = s.rotY; }
    p.position.set(...pos); p.rotation.y = rotY; root.add(p);
    P[id] = { g: p, r, sentado, emo0: r.emocion ?? 2, focus: V(pos).add(V([0, sentado ? 0.95 : 1.25, 0])), pos0: V(pos), rot0: rotY, pose0: r.pose || (sentado ? 'sit' : 'stand'), hold0: r.hold || {}, _emo: null };
  }
  Object.entries(P).forEach(([k, x]) => { x.id = k; x._used = (cfg.pulsos || []).some((q) => PERSON_BEATS.includes(q.jugada) && [].concat(q.quien).includes(k)); });
  // people the place brings itself (the receptionist): drawn too if seen
  const extra = []; root.traverse((o) => { if (o.name && o.name.startsWith('persona:') && !Object.values(P).some((x) => x.g === o)) extra.push(o); });
  const cards = {}; for (const [k, c] of Object.entries(cfg.tarjetas || {})) { const t = tarjeta(c); t.group.visible = false; clean.scene.add(t.group); cards[k] = t; }
  clean.scene.add(new THREE.AmbientLight(0xffffff, 1.4)); const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(-3, 5, 4); clean.scene.add(dl);
  const pulsos = (cfg.pulsos || []).map((p, i) => ({ dur: 0, ...p, i })).sort((a, c) => a.t - c.t || a.i - c.i);
  const dooG = mk('g', {}, svg);   // the 2D doodles live under the thread
  S = { cfg, b, MOD, root, P, extra, cards, pulsos, dooG, cams: b.cameras || {}, cam: new THREE.PerspectiveCamera(30, W / H, 0.05, 200), th2: H2.thread(svg), th: H2.thread(svg), bubbles: new Map(), END: ctx.DUR, W, H };
  dooInit();
  pulsos.filter((p) => p.jugada === 'burbuja').forEach((p) => S.bubbles.set(p, burbuja(svg)));
  if (typeof location !== 'undefined' && location.search.includes('vista')) { window.gmS = S; window.gmG = G; }   // debugging in the instant preview
  if (cfg.chip) ctx.hud.innerHTML = '<i></i>' + cfg.chip.split('|').map((x) => x.trim()).join('<b></b>');
  const img = ctx.field.querySelector('img'); img.style.width = '2600px'; img.style.left = '-760px'; img.style.top = '420px';
  // the place is drawn by the thread: only what the first camera sees
  pulsos.filter((p) => p.jugada === 'dibujar-vivienda').forEach((p) => reservar(p));
  pulsos.filter((p) => p.jugada === 'dibujar-sitio').forEach((p) => prepararDibujo(p));
  S.dibujos = pulsos.filter((p) => p.jugada === 'dibujar-sitio' || p.jugada === 'dibujar-vivienda');
  S.borrar = pulsos.find((p) => p.jugada === 'borrar-sitio'); if (S.borrar) prepararBorrado(S.borrar);
  if (sitio.culling) { S.cull = []; root.traverse((o) => { if (/^vivienda:/.test(o.name || '')) S.cull.push([o, new THREE.Box3().setFromObject(o)]); }); }
  chipInit(ctx);
  return S;
}
function seatOf(seats, a) {
  if (typeof a === 'number') return seats[a];
  const row = seats.filter((s) => Math.abs(s.pos[2] - a.z) < 0.5).sort((x, y) => x.pos[0] - y.pos[0]);
  return row[Math.min(a.n ?? 0, row.length - 1)];
}
// The thread DRAWS the place like the 2D videos (v4.1): object by object, the thick thread traces its outline clockwise from
// the top left (first the whole frame of the room), then the object fills in and the thread travels to the next one.
function prepararDibujo(p) {
  const { root, P, extra, W, H } = S;
  const sp = camSpec(p.t + 0.01), fc = new THREE.PerspectiveCamera(sp.fov, W / H, 1, 400); fc.position.copy(sp.pos); fc.lookAt(sp.look); fc.updateMatrixWorld(); fc.updateProjectionMatrix();
  const inFrame = (o) => { const bx = new THREE.Box3().setFromObject(o); if (bx.isEmpty()) return false; const c = bx.getCenter(new THREE.Vector3()).project(fc); return (Math.abs(c.x) < 1.3 && Math.abs(c.y) < 1.3) || bx.getSize(new THREE.Vector3()).length() > 8; };
  const people = new Set([...Object.values(P).map((x) => x.g), ...extra]);
  const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(fc.projectionMatrix, fc.matrixWorldInverse));
  const touches = (o) => { const bx = new THREE.Box3().setFromObject(o); return !bx.isEmpty() && fr.intersectsBox(bx); };
  const est = G.tag(new THREE.Group(), 'dibujo:estructura'), det = G.tag(new THREE.Group(), 'dibujo:detalles'); root.add(est, det);
  let items = [];
  [...root.children].forEach((o) => {
    if (o === est || o === det || !o.visible || people.has(o) || o.userData._res || o.name === 'gente' || o.isLight) return;
    if (/polvo|mosca|hoja-curiosa/.test(o.name || '')) { det.attach(o); return; }   // things that move by themselves come in with the details
    if (!inFrame(o)) { det.attach(o); return; }   // small, at the edge or off frame: comes in with the details
    const n = o.name || '';
    if (/suelo|muro|techo|colgantes|fachada|calle/.test(n)) {
      [...o.children].forEach((c) => { if (c.name && !c.isLight && inFrame(c) && !/zocalo|moldura/.test(c.name)) { root.attach(c); items.push(c); } });   // window, clock, board: their own outline
      est.attach(o);
    } else items.push(o);
  });
  const area = (o) => { const h = hull2(samples(o).map((q) => G.screenOf(fc, q, W, H))); return Math.abs(polyArea(h)); };
  items = items.map((o) => [o, area(o)]).filter(([o, a]) => { if (a < W * H * 0.004 || /luzSuelo|polvo|charco|mosca|colgantes/.test(o.name || '')) { det.attach(o); return false; } return true; }).sort((x, y) => y[1] - x[1]);
  items.slice(6).forEach(([o]) => det.attach(o)); items = items.slice(0, 6).map(([o]) => o);
  const cx = (o) => { const b = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()); return G.screenOf(fc, b, W, H); };
  items.sort((x, y) => cx(x)[0] - cx(y)[0] || cx(x)[1] - cx(y)[1]);
  const d = p.dur || 2.7, quien = [].concat(p.quien || Object.keys(P));
  const others = Object.keys(P).filter((id) => !quien.includes(id) && inFrame(P[id].g)).map((id) => P[id].g);   // everyone seen is drawn too
  const who = [...extra.filter(inFrame), ...others, ...quien.map((id) => P[id] && P[id].g)].filter((g) => g && !g.userData._res);   // the named ones last (the last is the hero)
  const plan = [], slot = (list, a, b) => list.forEach((o, i) => { const s0 = a + (b - a) * i / list.length, s1 = a + (b - a) * (i + 1) / list.length; plan.push({ obj: o, t0: p.t + d * s0, t1: p.t + d * s1 }); });
  slot([est], 0.0, 0.22); slot(items, 0.22, 0.6); slot(who, 0.6, 0.97);
  plan.forEach((it) => { it.pts = samples(it.obj); });
  p._plan = plan; p._det = { obj: det, t0: p.t + d * 0.5, t1: p.t + d * 0.62 }; p._ultimo = quien[quien.length - 1]; p._penEnd = p.t + d * 0.97;
}
// world points of an object to build its screen outline (at most ~1500)
function samples(o) {
  const out = [], v = new THREE.Vector3(); o.updateMatrixWorld(true); let n = 0;
  o.traverse((m) => { if (m.isMesh && m.geometry && m.geometry.attributes.position && !m.userData.hull) n += m.geometry.attributes.position.count; });
  const step = Math.max(1, Math.ceil(n / 1500));
  o.traverse((m) => { if (!m.isMesh || !m.geometry || !m.geometry.attributes.position || m.userData.hull) return; const a = m.geometry.attributes.position; for (let i = 0; i < a.count; i += step) out.push(v.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld).clone()); });
  return out;
}
function hull2(P) {   // convex hull (monotone chain) of screen points
  const q = P.filter((x) => isFinite(x[0]) && isFinite(x[1])).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (q.length < 3) return q;
  const cr2 = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
  for (const x of q) { while (lo.length >= 2 && cr2(lo[lo.length - 2], lo[lo.length - 1], x) <= 0) lo.pop(); lo.push(x); }
  for (let i = q.length - 1; i >= 0; i--) { const x = q[i]; while (up.length >= 2 && cr2(up[up.length - 2], up[up.length - 1], x) <= 0) up.pop(); up.push(x); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function polyArea(h) { let a = 0; for (let i = 0; i < h.length; i++) { const p = h[i], q = h[(i + 1) % h.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
// the outline the thread draws: hull clamped to the frame, clockwise on screen, starting at the top-left corner, closed
function contour(it, cam) {
  const { W, H } = S, m = 6;
  let h = hull2(it.pts.map((q) => G.screenOf(cam, q, W, H)).map(([x, y]) => [clamp(x, m, W - m), clamp(y, m, H - m)]));
  if (h.length < 3) return [];
  if (polyArea(h) < 0) h.reverse();
  let k = 0; h.forEach((q, i) => { if (q[0] + q[1] < h[k][0] + h[k][1]) k = i; });
  h = h.slice(k).concat(h.slice(0, k)); h.push(h[0]);
  const out = [h[0]]; for (let i = 1; i < h.length; i++) { const a = h[i - 1], b = h[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 24)); for (let j = 1; j <= n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); }
  return out;
}
// object visibility while the place is being drawn: hidden until its outline is closed, then the fill comes in
function dibujarObjetos(t) {
  const DR = { lineShare: 0.0001, fillStart: 0.55 }, er = S.erase;
  const put = (obj, v) => { v = Math.round(v * 40) / 40; if (obj.userData._dv === v) return; obj.userData._dv = v; G.drawOn(obj, v, DR); obj.traverse((o) => { if (o.isPoints) o.visible = v > 0; }); };
  const fade = (k) => k <= 0 ? 0 : k >= 1 ? 1 : 0.55 + 0.45 * k;
  const ek = (obj) => { const e = er && er.get(obj); return e ? seg(t, e[0], e[1] - e[0]) : 0; };
  const out = (obj) => { const k = ek(obj); return k <= 0 ? 1 : k >= 1 ? 0 : 0.55 + 0.45 * (1 - k); };
  for (const p of S.dibujos) {
    for (const it of p._plan) { const dd = it.t1 - it.t0; put(it.obj, Math.min(fade(seg(t, it.t0 + 0.62 * dd, 0.38 * dd + 0.12)), out(it.obj))); }
    put(p._det.obj, Math.min(fade(seg(t, p._det.t0, p._det.t1 - p._det.t0)), out(p._det.obj)));
  }
  if (S.borrar) S.root.visible = t < S.borrar.t + (S.borrar.dur || 2.7);
}
// THE ERASE (borrar-sitio): the pen goes back over everything it drew, last thing first, and each thing fades as its outline
// is run backwards; at the end the page is blank again (the loop starts from a blank page).
function prepararBorrado(p) {
  const all = []; S.dibujos.slice().reverse().forEach((q) => { all.push(...q._plan.slice().reverse()); });
  const d = p.dur || 2.7, n = Math.max(1, all.length); S.erase = new Map();
  p._plan = all.map((it, i) => { const t0 = p.t + d * 0.92 * i / n, t1 = p.t + d * 0.92 * (i + 1) / n; S.erase.set(it.obj, [t0, t1]); return { obj: it.obj, pts: it.pts, t0, t1 }; });
  S.dibujos.forEach((q) => S.erase.set(q._det.obj, [p.t, p.t + d * 0.5]));
  p._det = { obj: new THREE.Group(), t0: p.t, t1: p.t }; p._from = (cam) => idleTip(p.t, cam); p._penEnd = p.t + d * 0.92;
}
// dibujar-vivienda: the pen fills in a home (or a whole floor: several "viviendas") when the camera gets there: each home,
// then the people in it (and the named "objetos"). Until then those things are not on the page at all.
function reservar(p) {
  const { root, P } = S, objs = [], who = [];
  (p.viviendas || []).forEach((id) => { const v = root.getObjectByName('vivienda:' + id); if (!v) throw new Error('no hay vivienda ' + id); objs.push(v); v.traverse((o) => { if (/^(residente|mascota):/.test(o.name || '') && !(p.sin || []).some((id) => S.P[id] && S.P[id].g === o)) who.push(o); }); });   // sin: people of that home who are elsewhere
  (p.objetos || []).forEach((n) => root.traverse((o) => { if (o.name === n && !objs.includes(o)) objs.push(o); }));
  [].concat(p.quien || []).forEach((id) => { if (P[id] && !who.includes(P[id].g)) who.push(P[id].g); });
  [...objs, ...who].forEach((o) => { root.attach(o); o.userData._res = true; });
  const d = p.dur || 1.4, plan = [], slot = (list, a, b) => list.forEach((o, i) => plan.push({ obj: o, t0: p.t + d * (a + (b - a) * i / list.length), t1: p.t + d * (a + (b - a) * (i + 1) / list.length) }));
  slot(objs, 0, who.length ? 0.6 : 1); slot(who, 0.6, 1);
  plan.forEach((it) => { it.pts = samples(it.obj); });
  p._plan = plan; p._det = { obj: G.tag(new THREE.Group(), 'dibujo:vacio'), t0: p.t, t1: p.t }; p._from = (cam) => idleTip(p.t, cam); p._penEnd = p.t + d;
}
// the thread while drawing the place: [active path, tip, outline still filling]
function hiloDibujo(p, t, cam) {
  const plan = p._plan; let i = plan.findIndex((it) => t >= it.t0 && t < it.t1); if (i < 0) return null;
  const it = plan[i], dd = it.t1 - it.t0, c = contour(it, cam); if (!c.length) return { pts: null, tip: null, fill: null };
  const prevEnd = i > 0 ? (() => { const pc = contour(plan[i - 1], cam); return pc[pc.length - 1]; })() : p._from ? p._from(cam) : [-30, S.H * 0.3];
  const kt = i === 0 && !p._from ? 1 : seg(t, it.t0, 0.18 * dd), kd = i === 0 ? seg(t, it.t0, 0.62 * dd) : seg(t, it.t0 + 0.18 * dd, 0.44 * dd);
  let pts, tip;
  if (kt < 1) { const path = H2.hop(prevEnd, c[0], 90); pts = H2.part(path, Math.max(0, io(kt) - 0.5), io(kt)); }
  else { const cc = p.jugada === 'borrar-sitio' ? c.slice().reverse() : c; pts = H2.part(cc, 0, io(kd)); }
  tip = pts.length ? pts[pts.length - 1] : null;
  // the previous outline stays while its object fills, then goes
  let fill = null; if (i > 0) { const pr = plan[i - 1], pd = pr.t1 - pr.t0; if (t < pr.t1 + 0.3 * pd) fill = contour(pr, cam); }
  if (kd >= 1 && t < it.t1) fill = c;
  return { pts, tip, fill };
}

// ------------------------------------------------------------------ camera: a state {look, hS (frame height at the subject), fov, yaw, up}
function stSpec(s) { const d = s.hS / (2 * Math.tan(s.fov * D2R / 2)); return { pos: s.look.clone().add(V([d * Math.sin(s.yaw) * Math.cos(s.up), d * Math.sin(s.up), d * Math.cos(s.yaw) * Math.cos(s.up)])), look: s.look, fov: s.fov }; }
function lerpSt(a, b, k) { return { look: a.look.clone().lerp(b.look, k), hS: lerp(a.hS, b.hS, k), fov: Math.exp(lerp(Math.log(a.fov), Math.log(b.fov), k)), yaw: lerp(a.yaw, b.yaw, k), up: lerp(a.up, b.up, k) }; }
function focusOf(id, t = 0) { const x = S.P[id] || Object.values(S.P)[0]; if (!x) return V([0, 1, 0]); const st = personState(x, t); return st.pos.clone().add(V([0, /sit/.test(st.pose) ? 0.95 : 1.25, 0])); }
function stateOf(c) { const pos = V(c.pos), look = V(c.look), v = pos.clone().sub(look), d = v.length(), fov = c.fov || 40; return { look, hS: 2 * d * Math.tan(fov * D2R / 2), fov, yaw: Math.atan2(v.x, v.z), up: Math.asin(clamp(v.y / d, -1, 1)) }; }
function camOf(q) { const c = q.nombre ? S.cams[q.nombre] : q; if (!c) throw new Error('no hay cámara ' + q.nombre); return { pos: c.pos, look: c.look, fov: q.fov ?? c.fov ?? 40 }; }
// recorrido: a smooth camera through points [{t (from the beat), pos, look, fov} or {t, nombre}] (Catmull-Rom on position and look)
function recorrido(p, t) {
  const Q = p._q || (p._q = p.puntos.map((q) => ({ ...camOf(q), t: p.t + q.t })));
  if (t <= Q[0].t) return stateOf(Q[0]); if (t >= Q[Q.length - 1].t) return stateOf(Q[Q.length - 1]);
  let i = 0; while (i < Q.length - 2 && t > Q[i + 1].t) i++;
  let u = (t - Q[i].t) / (Q[i + 1].t - Q[i].t);
  if (i === 0) u = 0.5 * u + 0.5 * u * u; if (i === Q.length - 2) u = 0.5 * u + 0.5 * (1 - (1 - u) * (1 - u));   // soft start and stop
  const at = (k) => { const a = Q[Math.max(0, i - 1)][k], b = Q[i][k], c = Q[i + 1][k], d = Q[Math.min(Q.length - 1, i + 2)][k]; const u2 = u * u, u3 = u2 * u; return [0, 1, 2].map((j) => 0.5 * (2 * b[j] + (-a[j] + c[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u2 + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * u3)); };
  return stateOf({ pos: at('pos'), look: at('look'), fov: Math.exp(lerp(Math.log(Q[i].fov), Math.log(Q[i + 1].fov), u)) });
}
function camState(t) {
  const beats = S.pulsos.filter((p) => CAM_BEATS.includes(p.jugada) && p.camara !== false && p.t <= t);
  if (!beats.length) return { look: V([0, 1.3, 0]), hS: 3, fov: 40, yaw: 0, up: 0 };
  const p = beats[beats.length - 1], tl = t - p.t, f = p.centro ? V(p.centro) : focusOf(p.de || p.quien || S.cfg.foco, t);
  const prev = () => camState(p.t - 1e-4);
  let s;
  if (p.jugada === 'recorrido') return recorrido(p, t);
  if (p.jugada === 'camara' && (p.nombre || p.pos)) { const dr = seg(tl, 0, p.dur || 2.0); s = stateOf(camOf(p)); s.hS *= 1 - (p.empuje ?? 0.06) * dr; s.yaw += (p.deriva ?? 3) * D2R * dr; return s; }
  if (p.jugada === 'camara-plano') { const alto = p.alto ?? 3.0; s = { look: p.centro ? f : V([f.x + 0.05, f.y + 0.37, f.z]), hS: alto * (1 - 0.03 * seg(tl, 0, p.dur || 2.7)), fov: 3.2, yaw: (p.giro ?? 0) * D2R, up: (p.alza ?? 4) * D2R }; }
  else if (p.jugada === 'abrir-3d') { const a = prev(), u = ease3(seg(tl, 0, p.dur || 1.4)); s = lerpSt(a, { look: f.clone().add(V([0.05, 0.12, 0])), hS: p.alto ?? 1.9, fov: p.fov ?? 52, yaw: (p.giro ?? 32) * D2R, up: (p.alza ?? 9) * D2R }, u); }
  else if (p.jugada === 'camara') { const fov = p.fov ?? 50, dist = p.dist ?? 2.25, dr = seg(tl, 0, p.dur || 2.0); s = { look: f.clone().add(V(p.mira || [0, 0.18, 0])), hS: 2 * (dist - 0.15 * dr) * Math.tan(fov * D2R / 2), fov, yaw: ((p.lado ?? -30) + (p.deriva ?? -5) * dr) * D2R, up: (p.alza ?? -11) * D2R }; return s; }
  else if (p.jugada === 'tarjeta-en-sala') { const a = prev(), c = io(seg(tl, 0, 0.9)); s = { ...a, look: a.look.clone().lerp(f.clone().add(V([0.35, 0.55, 0.2])), c), hS: lerp(a.hS, 2.6, c) }; }
  else if (p.jugada === 'tarjeta-pantalla') {
    const a = prev(), card = S.cards[p.tarjeta], home = cardHome(p.tarjeta), k = io(seg(tl, 0, 1.0)), sp = stSpec(a), v = sp.pos.clone().sub(home);
    s = lerpSt(a, { look: home, hS: card.h * 1.55, fov: a.fov, yaw: Math.atan2(v.x, v.z), up: Math.asin(clamp(v.y / v.length(), -1, 1)) }, k);
    return s;
  }
  // after a move ends the camera keeps living: a slow drift
  const end = p.t + (p.dur || 0); if (t > end && p.jugada !== 'camara-plano') s.yaw += 4 * D2R * seg(t, end, 2.0);
  return s;
}
function camSpec(t) {
  const st = camState(t), sp = stSpec(st), fz = S.cfg.sitio && S.cfg.sitio.frente;
  { const L = S.pulsos.filter((p) => CAM_BEATS.includes(p.jugada) && p.camara !== false && p.t <= t), q = L[L.length - 1]; if (q && q.cerca != null) { sp.cerca = q.cerca; return sp; } }   // cerca: clip what is nearer than this in front of the look point
  if (fz != null && st.fov < 6) sp.cerca = Math.max(0.5, fz + 0.6 - sp.look.z) * Math.cos(st.up) + 0.2;   // flat (far) view: nothing in front of the front
  if (fz == null || sp.pos.z >= fz || sp.look.z >= fz) return sp;
  const v = sp.pos.clone().sub(sp.look), k = (fz - sp.look.z) / v.z, pos = sp.look.clone().addScaledVector(v, k), d = pos.distanceTo(sp.look);
  return { pos, look: sp.look, fov: Math.max(8, 2 * Math.atan(st.hS / 2 / d) / D2R) };
}
function setCam(cam, sp) { cam.fov = sp.fov; const d = sp.pos.distanceTo(sp.look); cam.near = Math.max(0.05, d - (sp.cerca ?? 14)); cam.far = d + 60; cam.position.copy(sp.pos); cam.lookAt(sp.look); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }

// ------------------------------------------------------------------ cards
function beatOf(j, t, key) { const L = S.pulsos.filter((p) => p.jugada === j && (key == null || p.tarjeta === key)); return t == null ? L : L.filter((p) => p.t <= t).pop(); }
function cardHome(key) { const b = beatOf('tarjeta-en-sala', null, key)[0]; return focusOf(b ? b.quien : S.cfg.foco, b ? b.t : 0).add(V(b && b.donde || [0.62, 0.78, 0.38])); }
function cardEnd(key) {
  const sala = beatOf('tarjeta-en-sala', null, key)[0], pant = beatOf('tarjeta-pantalla', null, key)[0], movil = beatOf('tarjeta-al-movil', null, key)[0];
  if (movil) return null;
  if (pant) return pant.t + (pant.dur || 2.1) + 0.45;
  const next = S.pulsos.find((q) => q.jugada === 'tarjeta-en-sala' && q.t > sala.t);
  return Math.min(next ? next.t : Infinity, sala.t + Math.max(sala.dur || 1.9, 3.2));
}
function cardPose(key, t, cam) {
  const sala = beatOf('tarjeta-en-sala', null, key)[0]; if (!sala || t < sala.t) return null;
  const card = S.cards[key], g = card.group, home = cardHome(key);
  const pant = beatOf('tarjeta-pantalla', null, key)[0], movil = beatOf('tarjeta-al-movil', null, key)[0];
  if (movil && t >= movil.t + (movil.dur || 0.6) + 0.05) return null;
  const end = cardEnd(key); if (end != null && t >= end) return null;
  const c0 = camSpec(sala.t + 0.5), q0 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(c0.pos, home, V([0, 1, 0])));
  q0.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.04, -0.42, 0.05)));
  g.position.copy(home); g.quaternion.copy(q0); g.scale.setScalar(1);
  if (pant && t >= pant.t && !(movil && t >= movil.t)) {
    const tl = t - pant.t; g.quaternion.slerp(cam.quaternion, io(seg(tl, 0, 1.0)));
    if (tl >= 1.0) { const bob = Math.sin((tl - 1.0) * 2.4); g.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.03 * bob, -0.11 * Math.sin((tl - 1.0) * 1.7), 0.015 * bob))); g.position.y += 0.012 * bob; }
  }
  if (movil && t >= movil.t) {   // hidden cut: same screen place with the new camera, then into the phone
    const pre = new THREE.PerspectiveCamera(30, S.W / S.H); setCam(pre, camSpec(movil.t - 1e-4));
    const rel = new THREE.Matrix4().copy(pre.matrixWorld).invert().multiply(new THREE.Matrix4().compose(home, pre.quaternion.clone(), V([1, 1, 1])));
    const start = new THREE.Matrix4().multiplyMatrices(cam.matrixWorld, rel), p0 = new THREE.Vector3(), q1 = new THREE.Quaternion(), sc = new THREE.Vector3(); start.decompose(p0, q1, sc);
    const who = S.P[movil.quien || S.cfg.foco], hand = who.g.localToWorld(who.g.userData.rig.anchor('handR').clone()).add(V([0, 0.06, 0.02]));
    const k = ease3(seg(t, movil.t, (movil.dur || 0.6) - 0.05));
    g.position.copy(p0).lerp(hand, k); g.quaternion.copy(q1).slerp(who.g.getWorldQuaternion(new THREE.Quaternion()), k); g.scale.setScalar(lerp(1, 0.1, k));
  }
  if (end != null) g.scale.multiplyScalar(1 - 0.92 * ease3(seg(t, end - 0.35, 0.35)));   // leaves by shrinking away
  card.show(seg(t, sala.t + 0.8, 0.5), 1);   // the fill rises once the thread has closed the outline
  if (card.tick) card.tick(t - (sala.t + 0.8), pant && t >= pant.t ? 1 : 0.4);   // the card lives (sway, bob, shadow); calmer in the room
  card.write(seg(t, sala.t + 1.0, 0.8), t);   // then the face comes in like v4.1 (letters rise from a soft blur, the icon builds)
  return g;
}

// ------------------------------------------------------------------ people
// What a person is doing at t, from the beats (pure: also used by the camera, which only needs where they are).
//   colocar {quien, pos, giro, pose, hold}  move at a cut   caminar {quien, de, a, dur, pose ('walk'|'stairs-up'), fin}
//   pose {quien, pose, dur (blend 0.5), hold, mira [x,y,z], giro}   vida {quien, pose, periodo (s), hold}: a pose looping in time
function personState(x, t) {
  const st = { pos: x.pos0.clone(), rot: x.rot0, pose: x.pose0, hold: x.hold0, from: null, k: 1, loop: null, mira: null, walk: null };
  for (const p of S.pulsos) {
    if (p.t > t || !PERSON_BEATS.includes(p.jugada) || !([].concat(p.quien).includes(x.id))) continue;
    if (p.jugada === 'colocar') { if (p.pos) st.pos = V(p.pos); if (p.giro != null) st.rot = p.giro * D2R; if (p.pose) st.pose = p.pose; if (p.hold) st.hold = p.hold; st.from = st.loop = st.walk = null; st.k = 1; }
    if (p.jugada === 'caminar') {
      const pts = p.ruta ? [...(p.de === false ? [] : [p.de ? V(p.de) : st.pos.clone()]), ...p.ruta.map(V)] : [p.de ? V(p.de) : st.pos.clone(), V(p.a)];
      const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.max(1e-4, pts[i].distanceTo(pts[i - 1])); L.push(l); tot += l; }
      const d = p.dur || tot / 1.25, k = seg(t, p.t, d); st.from = st.loop = null; st.k = 1; if (p.hold) st.hold = p.hold;
      let s = k * tot, i = 0; while (i < L.length - 1 && s > L[i]) { s -= L[i]; i++; }
      const a = pts[i], b = pts[i + 1], v = b.clone().sub(a), flat = Math.hypot(v.x, v.z);
      if (flat > 1e-3) st.rot = Math.atan2(v.x, v.z);
      if (k < 1) { const sube = Math.abs(v.y) > 0.25 * flat; st.pos = a.clone().lerp(b, s / L[i]); st.walk = { pose: sube ? 'stairs-up' : (p.pose || 'walk'), phase: (k * tot / (sube ? 0.9 : 1.4)) % 1 }; }
      else { st.pos = pts[pts.length - 1]; st.walk = null; st.pose = p.fin || 'stand'; if (p.giro != null) st.rot = p.giro * D2R; }
    }
    if (p.jugada === 'pose') { st.from = { pose: st.pose, hold: st.hold, mira: st.mira }; st.pose = p.pose || st.pose; if (p.hold) st.hold = p.hold; if (p.mira) st.mira = p.mira; if (p.giro != null) st.rot = p.giro * D2R; st.k = io(seg(t, p.t, p.dur ?? 0.5)); st.loop = st.walk = null; }
    if (p.jugada === 'vida') { st.loop = { pose: p.pose || st.pose, periodo: p.periodo || 2, hold: p.hold || st.hold, t0: p.t }; st.from = st.walk = null; st.k = 1; }
  }
  return st;
}
function applyPerson(x, t, cam) {
  const st = personState(x, t), g = x.g;
  const place = () => { g.position.copy(st.pos); g.rotation.set(0, st.rot, 0); g.updateMatrixWorld(true); };
  place();
  if (!x._used) return;
  const o = (hold, mira) => { const r = { hold: hold || {} }; if (mira) r.lookAt = g.worldToLocal(V(mira)).toArray(); return r; };
  const opts = { from: st.from && o(st.from.hold, st.from.mira), to: o(st.hold, st.mira) };   // lookAt needs the real place
  // the rig stands the feet on the WORLD floor (y 0) when it re-poses: pose the person at the origin, then put them back
  g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.updateMatrixWorld(true);
  try { reposeAt(x, st, t, cam, opts, o); } finally { place(); }
}
function reposeAt(x, st, t, cam, opts, o) {
  const g = x.g;
  const re = (key, fn) => { if (x._ap !== key) { fn(); x._ap = key; x._emo = null; } };
  if (st.walk) { const ph = Math.round(st.walk.phase * 8) / 8 % 1; re('w' + st.walk.pose + ph + JSON.stringify(st.hold), () => g.userData.repose(st.walk.pose, { hold: st.hold || {}, phase: ph, step: 0.238 })); }
  else if (st.loop) {
    const c = st.pos.clone().add(V([0, 1, 0])).project(cam); if (Math.abs(c.x) > 1.4 || Math.abs(c.y) > 1.4 || c.z > 1) return;   // not seen: no need to move
    const ph = Math.round((((t - st.loop.t0) / st.loop.periodo) % 1) * 12) / 12 % 1; re('l' + st.loop.pose + ph + JSON.stringify(st.loop.hold), () => g.userData.repose(st.loop.pose, { hold: st.loop.hold || {}, phase: ph }));
  }
  else if (st.from && st.k < 1) { blendPose(g, [st.from.pose, opts.from], [st.pose, opts.to], st.k); x._ap = null; x._emo = null; }
  else re('p' + JSON.stringify([st.pose, st.hold, st.mira]), () => g.userData.repose(st.pose, opts.to));
}
function poseAndHead(t, cam) {
  for (const [id, x] of Object.entries(S.P)) {
    applyPerson(x, t, cam);
    let lift = null;
    for (const p of S.pulsos) {
      if (p.quien !== id || p.t > t) continue;
      if (p.jugada === 'coger-movil') lift = io(seg(t, p.t, p.dur || 0.75));
      if (p.jugada === 'dejar-movil') lift = 1 - io(seg(t, p.t, p.dur || 0.6));
    }
    if (!x._used && x.r.hold && x.r.hold.R === 'phone' && x.sentado) blendPose(x.g, ['sit-chair', { hold: {} }], ['sit-chair', { hold: { R: 'phone' } }], lift ?? 0);
    let emo = [x.emo0, false], unw = null;
    for (const p of S.pulsos) if (p.quien === id && p.t <= t) {
      if (p.jugada === 'emocion') emo = [p.nivel ?? 2, false];
      if (p.jugada === 'resolver') { const d = p.dur ?? 0.9; if (t < p.t + d) unw = seg(t, p.t, d); else emo = [0, true]; }
    }
    const k = emo.join(); if (k !== x._emo) { x.g.userData.setEmotion(emo[0], emo[1]); x._emo = k; }
    desenredo(x, unw, emo[0]);
  }
}
// THE UNTANGLE (resolver): the scribble ball turns into one thread that is pulled out and winds up into exactly the spiral of
// the resolved head; the head clears up at the same time. k 0..1 (null = not untangling). The thread is a fat line in the world.
function desenredo(x, k, e0) {
  const hg = (() => { let h = null; x.g.traverse((o) => { if (!h && o.name === 'parte:garabato') h = o.parent; }); return h; })(); if (!hg) return;
  const sc = hg.getObjectByName('parte:garabato'), core = hg.children[0];
  if (k == null) { if (x._unw) x._unw.visible = false; if (sc) sc.visible = true; if (x._unwCore === core) core.material.color.copy(x._core0); return; }
  const R = x.g.userData.rig.d.headR, M = 90;
  if (!x._unw) {
    const r = G.rng(91), A = [], B = [];
    let v = new THREE.Vector3(0.3, 0.2, 0.9).normalize(), tt = new THREE.Vector3(1, 0, 0);
    for (let i = 0; i < M; i++) {   // the ball: a random walk on the head
      const a = 0.42; const nv = v.clone().multiplyScalar(Math.cos(a)).addScaledVector(tt, Math.sin(a)); tt = tt.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, -Math.sin(a)).applyAxisAngle(nv, (r() - 0.5) * 1.6).normalize(); v = nv.normalize();
      A.push(v.clone().multiplyScalar(R * (1.08 + 0.06 * r())));
      const u = i / (M - 1), ang = u * 2.4 * 2 * Math.PI, rr = 0.32 * R * (1 - 0.55 * u);   // same spiral as cabeza.js spiral()
      B.push(new THREE.Vector3(Math.cos(ang) * rr, R * (1.32 + u * 0.95), Math.sin(ang) * rr));
    }
    x._unw = G.hilo(A.map((q) => q.toArray()), { px: 9 }); x._unwA = A; x._unwB = B; x._core0 = core.material.color.clone(); x._unwCore = core;
  }
  if (x._unw.parent !== hg) hg.add(x._unw);
  if (sc) sc.visible = false; x._unw.visible = true;
  const P = []; for (let i = 0; i < M; i++) { const w = io(clamp(k * 1.6 - (1 - i / (M - 1)) * 0.6, 0, 1)); P.push(...x._unwA[i].clone().lerp(x._unwB[i], w).toArray()); }
  x._unw.geometry.setPositions(P);
  const c1 = new THREE.Color(0.95, 0.95, 0.95).convertSRGBToLinear(); core.material.color.copy(x._core0).lerp(c1, io(k));
}
function headW(id) { const x = S.P[id]; return x.g.localToWorld(x.g.userData.rig.anchor('head').clone()).add(V([0, 0.2, 0])); }

// ------------------------------------------------------------------ the thread
function penEnd(p) {
  if (p.jugada === 'dibujar-sitio' || p.jugada === 'dibujar-vivienda' || p.jugada === 'borrar-sitio') return p._penEnd;
  if (p.jugada === 'chip') return p.t + 0.45;
  if (p.jugada === 'garabato') return p.t + (p.dur || 1.0);
  if (p.jugada === 'tarjeta-en-sala') return p.t + (S.cards[p.tarjeta].underline ? 1.4 : 1.05);
  if (p.jugada === 'tarjeta-pantalla' || p.jugada === 'tarjeta-al-movil') return p.t + (p.dur || 0.6);
  return Infinity;
}
function hiloAt(t, scr, cam) {
  const L = S.pulsos.filter((p) => HILO_BEATS.includes(p.jugada) && p.t <= t), p = L[L.length - 1];
  if (!p) return [null, null];
  const e = penEnd(p);
  if (t < e) return penTask(p, t, scr, cam);
  const end = penTask(p, e - 1e-3, scr, cam)[1];
  if (p.jugada === 'borrar-sitio') {   // the page is blank: the pen leaves the frame
    if (!end || t > e + 0.25) return [null, null];
    const k = io(seg(t, e, 0.25)), pts = H2.part(H2.hop(end, [S.W * 0.5, -80], 60), Math.max(0, k - 0.4), k); return [pts, pts[pts.length - 1]];
  }
  if (end && t < e + 0.3) { const k = io(seg(t, e, 0.3)), pts = H2.part(H2.hop(end, idleTip(t, cam), 80), Math.max(0, k - 0.5), k); return [pts, pts[pts.length - 1]]; }
  return idle(t, cam);
}
// where the pen waits: a slow loop above the head of the person the moment is about (or low in the frame if nobody is seen)
function idleCentre(t, cam) {
  const { W, H } = S; let who = null;
  for (const p of S.pulsos) { if (p.t > t) break; if (typeof p.quien === 'string' && S.P[p.quien]) who = p.quien; }
  who = who || (S.P[S.cfg.foco] ? S.cfg.foco : null);
  if (who) { const hw = headW(who), q = hw.clone().project(cam), h = G.screenOf(cam, hw, W, H); if (q.z < 1 && h[0] > 80 && h[0] < W - 80 && h[1] > 260 && h[1] < H - 200) return [h[0], h[1] - 95]; }
  return [W * 0.5, H * 0.7];
}
const idlePt = (c, u) => [c[0] + 100 * Math.cos(2.1 * u), c[1] + 34 * Math.sin(2.1 * u) - 8 * Math.sin(4.2 * u)];
function idleTip(t, cam) { return idlePt(idleCentre(t, cam), t); }
function idle(t, cam) { const c = idleCentre(t, cam), pts = []; for (let i = 0; i <= 14; i++) pts.push(idlePt(c, t - 0.5 + 0.5 * i / 14)); return [pts, pts[pts.length - 1]]; }
function penTask(p, t, scr, cam) {
  const W = S.W, tl = t - p.t, d = p.dur || 0;
  if (p.jugada === 'dibujar-sitio' || p.jugada === 'dibujar-vivienda' || p.jugada === 'borrar-sitio') { const r = hiloDibujo(p, t, cam); return r ? [r.pts, r.tip, r.fill] : idle(t, cam); }
  if (p.jugada === 'chip') {   // the pen draws the chip's box; the text comes in by itself (as the card's)
    const hd = S.hud, w = hd.offsetWidth, h = hd.offsetHeight, x0 = W - 48 - w, y0 = 150, x1 = W - 48, y1 = 150 + h;
    const box = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], start = idleTip(p.t, cam);
    if (tl < 0.15) { const k = io(seg(tl, 0, 0.15)), pts = H2.part(H2.hop(start, box[0], 120), Math.max(0, k - 0.5), k); return [pts, pts[pts.length - 1]]; }
    const pts = H2.part(box, 0, io(seg(tl, 0.15, 0.3))); return [pts, pts[pts.length - 1]];
  }
  if (p.jugada === 'garabato') {   // the pen hops next to the neighbour and draws the doodle stroke by stroke
    const it = S.doo.find((q) => q.p === p), c = dooDrawAt(it, t, cam), k = dooK(it, t), st = dooStrokesAt(it, k, c, DOO_DRAW);
    const first = dooStrokesAt(it, 0.001, c, DOO_DRAW)[0] || [c];
    if (tl < 0.14) { const kk = io(seg(tl, 0, 0.14)), pts = H2.part(H2.hop(idleTip(p.t, cam), first[0] || c, 90), Math.max(0, kk - 0.5), kk); return [pts, pts[pts.length - 1]]; }
    const cur = st[st.length - 1] || []; return [cur, cur.length ? cur[cur.length - 1] : c];
  }
  if (p.jugada === 'tarjeta-en-sala') {
    const card = S.cards[p.tarjeta], g = card.group;
    const olS = H2.cr(card.outline().map((q) => scr(g.localToWorld(q.clone()))), 3);
    if (tl < 0.25) { const h = idleTip(p.t, cam), path = H2.hop(h, olS[0], 180), k = io(seg(tl, 0, 0.25)); const pts = H2.part(path, Math.max(0, k - 0.45), k); return [pts, pts[pts.length - 1]]; }
    if (tl < 1.05) { let pts = H2.part(olS, 0, io(seg(tl, 0.25, 0.6))); if (tl > 0.85) pts = H2.part(olS, seg(tl, 0.85, 0.2), 1); return [pts, pts.length ? pts[pts.length - 1] : olS[olS.length - 1]]; }
    const ul = card.underline().map((q) => scr(g.localToWorld(q.isVector3 ? q.clone() : V(q)))), e0 = olS[olS.length - 1];   // then it underlines the title while the text rises
    if (tl < 1.15) { const k = io(seg(tl, 1.05, 0.1)), pts = H2.part(H2.hop(e0, ul[0], 40), Math.max(0, k - 0.6), k); return [pts, pts[pts.length - 1]]; }
    const pts = H2.part(H2.cr(ul, 4), 0, io(seg(tl, 1.15, 0.25))); return [pts, pts[pts.length - 1]];
  }
  if (p.jugada === 'tarjeta-pantalla') {   // the pen keeps running round the card while it turns to us
    const card = S.cards[p.tarjeta], g = card.group, ol = H2.cr(card.outline().map((q) => scr(g.localToWorld(q.clone()))), 3), dbl = ol.concat(ol.slice(1));
    const a = (tl * 0.3) % 1, pts = H2.part(dbl, a / 2, (a + 0.24) / 2); return [pts, pts[pts.length - 1]];
  }
  if (p.jugada === 'tarjeta-al-movil') {   // and rides the card into the phone
    const g = S.cards[p.tarjeta].group, c = scr(g.position), k = seg(tl, 0, d || 0.6), r = lerp(150, 30, k), pts = [];
    for (let i = 0; i <= 14; i++) { const u = t * 5 - 1.4 + 1.4 * i / 14; pts.push([c[0] + r * Math.cos(u), c[1] + r * 0.6 * Math.sin(u)]); }
    return [pts, pts[pts.length - 1]];
  }
  if (p.jugada === 'subir-al-logo') {
    const END = S.END, ts = END - TAIL;
    if (t >= ts) return [H2.SEAM.points(t, END), H2.SEAM.tip(t, END)];
    const h = scr(headW(p.quien || S.cfg.foco).add(V([0, 0.12, 0]))), a = [h[0], h[1] + dropAt(t)], k = io(seg(t, p.t, ts - p.t));
    const tip = [lerp(a[0], 540, k), lerp(a[1] - 40, 1322, k) - 260 * Math.sin(k * Math.PI)];
    return [H2.cr([a, [lerp(a[0], tip[0], 0.5), lerp(a[1], tip[1], 0.5) + 40], tip], 10), tip];
  }
  return idle(t, cam);
}
// the chip (top right): its box is drawn by the pen, its text rises letter by letter from a soft blur (like the card's)
function chipInit(ctx) { S.hud = ctx.hud; S.chips = S.pulsos.filter((p) => p.jugada === 'chip'); }
function chipFrame(t, hudEnd) {
  const hud = S.hud, L = S.chips.filter((p) => p.t <= t), p = L[L.length - 1];
  if (!p || t >= hudEnd) { hud.style.display = 'none'; return; }
  hud.style.display = 'block'; hud.style.transform = 'none';
  hud.style.opacity = p === S.chips[0] ? seg(t, p.t + 0.45, 0.12).toFixed(3) : '1';
  if (hud._key !== p.texto) { hud._key = p.texto; hud.innerHTML = '<i></i>' + String(p.texto).split('|').map((x) => [...x.trim()].map((c) => `<span style="display:inline-block">${c === ' ' ? '&nbsp;' : c}</span>`).join('')).join('<b></b>'); hud._sp = [...hud.querySelectorAll('span')]; }
  hud._sp.forEach((e, i) => { const k = ease3(seg(t, p.t + 0.4 + i * 0.03, 0.3)); e.style.opacity = k.toFixed(3); e.style.transform = `translateY(${(18 * (1 - k)).toFixed(1)}px)`; e.style.filter = k < 1 ? `blur(${(6 * (1 - k)).toFixed(1)}px)` : 'none'; });
}
function dropAt(t) { const p = beatOf('subir-al-logo')[0]; if (!p) return 0; return S.H * 1.05 * io(seg(t, p.t + 0.05, S.END - TAIL - p.t - 0.05)); }

// ------------------------------------------------------------------ frame
export function frame(t, ctx) {
  pick(t, ctx);
  const { W, H, world, clean, field, hud, wrap } = ctx, { cam } = S;
  if (S.MOD.update) S.MOD.update(t, world.scene, S.b);
  const tc = ctx.camT(t);
  setCam(cam, camSpec(tc));
  poseAndHead(t, cam);
  dibujarObjetos(t);
  if (S.cull) { const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)); S.cull.forEach(([o, bx]) => { o.visible = fr.intersectsBox(bx); }); }
  const scr = (q) => G.screenOf(cam, q, W, H);
  // cards (and the orange field that belongs to them)
  let R = 0, fc = [W / 2, H / 2];
  for (const key of Object.keys(S.cards)) {
    const g = cardPose(key, t, cam); if (!g) { S.cards[key].show(0); continue; }
    const pant = beatOf('tarjeta-pantalla', null, key)[0], movil = beatOf('tarjeta-al-movil', null, key)[0];
    if (pant && t >= pant.t + 0.3 && !(movil && t >= movil.t)) { const pe = pant.t + (pant.dur || 2.1); R = 2400 * (t < pe ? ease3(seg(t, pant.t + 0.3, 0.65)) : 1 - ease3(seg(t, pe, 0.45))); fc = scr(cardHome(key)); }
    if (movil && t >= movil.t && t < movil.t + (movil.dur || 0.6)) { R = 2400 * (1 - ease3(seg(t, movil.t, (movil.dur || 0.6) - 0.05))); fc = scr(g.position); }
  }
  if (R > 1) { field.style.display = 'block'; field.style.clipPath = `circle(${R.toFixed(1)}px at ${fc[0].toFixed(1)}px ${fc[1].toFixed(1)}px)`; } else field.style.display = 'none';
  // bubbles: one shape, one size; the tail on the side of the head (or "lado")
  let penBusy = false;
  for (const [p, b] of S.bubbles) { const h = scr(headW(p.quien || S.cfg.foco)); p._box = b.draw(t, { t0: p.t, t1: p.t + (p.dur || 1.2), head: h, from: [h[0] - 20, h[1] - 8], side: p.lado || (h[0] > W / 2 ? 'R' : 'L'), face: p.texto && !p.cara ? null : (p.cara || 'neutral'), texto: p.texto }); if (p._box && p._box.drawing) penBusy = true; }
  const sub = beatOf('subir-al-logo')[0], hudEnd = sub ? sub.t : S.borrar ? S.borrar.t + 0.3 : S.END;   // the loop's last picture has no chip (nor the first)
  if (S.chips.length) chipFrame(t, hudEnd);
  else { hud.style.display = S.cfg.chip && t > 0.35 && t < hudEnd ? 'block' : 'none'; if (t > 0.35) hud.style.transform = `translateX(${(260 * (1 - io(seg(t, 0.35, 0.3)))).toFixed(1)}px)`; }
  const [pts, tip, fill] = hiloAt(t, scr, cam); { const sb = beatOf('subir-al-logo')[0]; S.th.halo(!(sb && t >= sb.t)); } S.th.set(penBusy ? null : pts, penBusy ? null : tip); S.th2.set(fill || null, null);   // one pen at a time
  dooFrame(t, cam);
  const dr = dropAt(t); wrap.style.transform = `translateY(${dr.toFixed(1)}px)`;
  // behind the falling world the paper turns from the world's beige (#F9F8F5) into the ending's (#F4EFE6): no jump at the seam
  const kb = clamp(dr / (S.H * 0.6), 0, 1); wrap.parentElement.style.background = `rgb(${Math.round(lerp(249, 244, kb))},${Math.round(lerp(248, 239, kb))},${Math.round(lerp(245, 230, kb))})`;
  world.render(cam); clean.render(cam);
}

// ------------------------------------------------------------------ 2D doodles (garabato, abanico, repartir)
// garabato {t, dur (1.0), quien: the neighbour it is about, icono, lado}: the pen draws a small 2D icon next to that person; then it
// flies into the COLLECTION that floats over the heads of cfg.coleccion.de (ids). abanico {t, dur, centro: id}: the collection opens
// into a big ring around someone. repartir {t, dur}: each doodle flies back to its neighbour and goes (an invitation).
const NS = 'http://www.w3.org/2000/svg', DOO_DRAW = 2.3, DOO_COL = 1.0;
function mk(tag, at, parent) { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(at)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; }
function dooInit() {
  S.doo = S.pulsos.filter((p) => p.jugada === 'garabato').map((p, i) => {
    const ic = GARABATOS[p.icono]; if (!ic) throw new Error('no hay garabato ' + p.icono);
    const g = mk('g', { style: 'display:none' }, S.dooG);
    const halo = mk('path', { fill: 'none', stroke: '#F9F8F5', 'stroke-width': 15, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, g);
    const acc = mk('path', { fill: H2.ORANGE, stroke: 'none' }, g);
    const line = mk('path', { fill: 'none', stroke: H2.NAVY, 'stroke-width': 7.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, g);
    const lens = ic.strokes.map((q) => H2.length(q)), total = lens.reduce((a, b) => a + b, 0);
    if (ic.acento) acc.setAttribute('d', H2.d(ic.acento) + 'Z');
    return { p, i, ic, g, halo, acc, line, lens, total, dd: p.dur || 1.0 };
  });
  S.abanico = S.pulsos.find((p) => p.jugada === 'abanico'); S.repartir = S.pulsos.find((p) => p.jugada === 'repartir');
}
const dooK = (it, t) => seg(t, it.p.t + 0.14, it.dd - 0.14);
function onScreen(id, cam, dy = 0) {   // a head's screen point (null if behind the camera)
  if (!S.P[id]) return null; const w = headW(id), q = w.clone().project(cam); if (q.z > 1) return null; const h = G.screenOf(cam, w, S.W, S.H); return [h[0], h[1] + dy];
}
const clampScr = (c, mx = 150, top = 330, bot = 330) => [clamp(c[0], mx, S.W - mx), clamp(c[1], top, S.H - bot)];
function dooDrawAt(it, t, cam) { const h = onScreen(it.p.quien, cam) || [S.W * 0.5, S.H * 0.45], side = it.p.lado ? (it.p.lado === 'L' ? -1 : 1) : (h[0] > S.W / 2 ? -1 : 1); return clampScr([h[0] + side * 230, h[1] - 190], 190, 360, 360); }
// the drawn part of the strokes, in screen coordinates (centre c, scale sc)
function dooStrokesAt(it, k, c, sc) {
  let left = k * it.total; const out = [];
  for (let j = 0; j < it.ic.strokes.length && left > 0; j++) {
    const P = it.ic.strokes[j].map((q) => [c[0] + q[0] * sc, c[1] + q[1] * sc]), L = it.lens[j];
    out.push(left >= L ? P : H2.part(P, 0, left / L)); left -= L;
  }
  return out;
}
function colCentre(cam) {
  const ids = [].concat((S.cfg.coleccion && S.cfg.coleccion.de) || []), hs = ids.map((id) => onScreen(id, cam)).filter(Boolean);
  if (!hs.length) return null;   // the couple is not on screen (a cut to a neighbour): the collection waits out of sight
  return clampScr([hs.reduce((a, h) => a + h[0], 0) / hs.length, Math.min(...hs.map((h) => h[1])) - 40], 260, 560, 600);
}
function slotOf(j, n, c, t) {   // the collection: one or two arcs over the heads
  const row = j < 5 ? 0 : 1, m = row ? n - 5 : Math.min(n, 5), jj = row ? j - 5 : j, R = row ? 420 : 270;
  const a = Math.PI + (jj + 0.5) / Math.max(1, m) * Math.PI, bob = 6 * Math.sin(t * 2.2 + j * 1.3);
  return [c[0] + R * Math.cos(a), c[1] + R * 0.62 * Math.sin(a) + bob];
}
function dooFrame(t, cam) {
  if (!S.doo.length) { S.dooG.style.display = 'none'; return; }
  S.dooG.style.display = '';
  const col0 = colCentre(cam), col = col0 || [S.W * 0.5, 430], n = S.doo.filter((q) => t >= q.p.t + q.dd + 0.2).length, A = S.abanico, R = S.repartir;
  for (const it of S.doo) {
    const t0 = it.p.t, fly = t0 + it.dd + 0.2; let c, sc, k = 1, op = 1;
    if (t < t0 + 0.14) { it.g.style.display = 'none'; continue; }
    if (t < fly) { c = dooDrawAt(it, t, cam); sc = DOO_DRAW; k = dooK(it, t); }
    else {
      const from = dooDrawAt(it, fly, cam), slot = slotOf(it.i, Math.max(n, it.i + 1), col, t), u = ease3(seg(t, fly, 0.55));
      if (!col0 && u >= 1 && !(A && t >= A.t) && !(R && t >= R.t)) { it.g.style.display = 'none'; continue; }   // collected, couple off screen: hidden
      c = [lerp(from[0], slot[0], u), lerp(from[1], slot[1], u) - 120 * Math.sin(u * Math.PI)]; sc = lerp(DOO_DRAW, DOO_COL, u);
      if (A && t >= A.t) {   // the fan: a big ring around someone
        const cc = clampScr(onScreen(A.centro, cam) || [S.W / 2, S.H * 0.45], 380, 560, 560), N = S.doo.length, a = -Math.PI / 2 + 2 * Math.PI * it.i / N + 0.25 * (t - A.t), v = ease3(seg(t, A.t + it.i * 0.04, 0.8));
        const ring = [cc[0] + 340 * Math.cos(a), cc[1] + 380 * Math.sin(a)]; c = [lerp(c[0], ring[0], v), lerp(c[1], ring[1], v)]; sc = lerp(sc, 1.05, v);
      }
      if (R && t >= R.t) {   // and each goes back to its neighbour
        const r0 = R.t + it.i * ((R.dur || 2.0) - 0.8) / Math.max(1, S.doo.length), v = ease3(seg(t, r0, 0.75));
        const dst = onScreen(it.p.quien, cam) || [c[0], S.H + 220]; c = [lerp(c[0], dst[0], v), lerp(c[1], dst[1], v) - 140 * Math.sin(v * Math.PI)]; sc = lerp(sc, 0.45, v);
        op = 1 - seg(t, r0 + 0.6, 0.15); if (op <= 0) { it.g.style.display = 'none'; continue; }
      }
    }
    it.g.style.display = ''; it.g.setAttribute('opacity', op.toFixed(3));
    it.g.setAttribute('transform', `translate(${c[0].toFixed(1)},${c[1].toFixed(1)}) scale(${sc.toFixed(4)})`);
    const key = Math.round(k * 200); if (it._k !== key) { it._k = key; const st = dooStrokesAt(it, k, [0, 0], 1), dd = st.map((q) => H2.d(q)).join(''); it.line.setAttribute('d', dd); it.halo.setAttribute('d', dd); }
    it.acc.setAttribute('opacity', seg(t, t0 + it.dd - 0.1, 0.3).toFixed(3));
  }
}

// ------------------------------------------------------------------ automatic checks (run in the instant preview: await gmQC())
// For one time t: people on screen whose head is out of frame or hidden behind something, bubbles outside the safe zone or
// over the HUD chip, card text too small while the card is meant to be read (full screen). Returns a list of strings.
const ray = new THREE.Raycaster();
export function qc(t, ctx) {
  const out = [], { W, H } = S, cam = S.cam;
  frame(t, ctx);
  const hudR = ctx.hud.style.display === 'block' ? { x0: W - 48 - ctx.hud.offsetWidth, y0: 150, x1: W - 48 + 9, y1: 150 + ctx.hud.offsetHeight + 9 } : null;
  for (const [id, x] of Object.entries(S.P)) {
    const bx = new THREE.Box3().setFromObject(x.g), c = bx.getCenter(new THREE.Vector3()).project(cam);
    if (Math.abs(c.x) > 1 || Math.abs(c.y) > 1 || c.z > 1) continue;              // not in the shot
    { let on = false; x.g.traverse((m) => { if (!on && m.isMesh && m.visible && seen(m)) on = true; }); if (!on) continue; }   // not drawn yet (or erased)
    const hw = x.g.localToWorld(x.g.userData.rig.anchor('head').clone()), h = G.screenOf(cam, hw, W, H);
    if (h[0] < 0 || h[0] > W || h[1] < 0 || h[1] > H) { out.push(`${id}: cuerpo en plano y cabeza fuera`); continue; }
    const blocker = (pW) => { ray.camera = cam; ray.set(cam.position, pW.clone().sub(cam.position).normalize()); ray.far = pW.distanceTo(cam.position) - 0.15;
      return ray.intersectObjects(S.root.children, true).find((i) => seen(i.object) && !i.object.userData.hull && !i.object.isLine && !i.object.isLineSegments && !isInside(i.object, x.g)); };
    const hit = blocker(hw), body = blocker(x.g.localToWorld(x.g.userData.rig.anchor('chest').clone()));
    if (hit && !body) out.push(`${id}: se ve el cuerpo y la cabeza no (tapada por ${nameOf(hit.object)})`);
  }
  for (const [p] of S.bubbles) {
    if (t < p.t || t > p.t + (p.dur || 1.2)) continue;
    const r = p._box; if (!r) continue;
    if (r.x < 40 || r.y < 120 || r.x + r.w > W - 40 || r.y + r.h > H - 240) out.push(`burbuja de ${p.quien}: fuera de la zona segura`);
    if (hudR && r.x < hudR.x1 && r.x + r.w > hudR.x0 && r.y < hudR.y1 && r.y + r.h > hudR.y0) out.push(`burbuja de ${p.quien}: encima del chip`);
  }
  for (const [key, card] of Object.entries(S.cards)) {
    const pant = beatOf('tarjeta-pantalla', null, key)[0]; if (!pant || t < pant.t + 1.0 || t > pant.t + (pant.dur || 2)) continue;
    const g = card.group, top = G.screenOf(cam, g.localToWorld(V([0, card.h / 2, 0])), W, H), bot = G.screenOf(cam, g.localToWorld(V([0, -card.h / 2, 0])), W, H);
    const px = Math.hypot(top[0] - bot[0], top[1] - bot[1]), sub = 24 * px / 608;
    if (sub < 40 * 0.75) out.push(`tarjeta ${key}: la línea pequeña mide ${sub.toFixed(0)} px (mín. 30)`);
    if (top[1] < 60 || bot[1] > H - 60) out.push(`tarjeta ${key}: se sale del encuadre`);
  }
  return out;
}
function seen(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }
function isInside(o, g) { for (let p = o; p; p = p.parent) if (p === g) return true; return false; }
function nameOf(o) { for (let p = o; p; p = p.parent) if (p.name) return p.name; return 'algo'; }
