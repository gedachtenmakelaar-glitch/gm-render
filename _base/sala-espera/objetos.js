// Biblioteca de piezas reutilizables de la sala de espera (dueño: agente Sala). Cada pieza es una función con nombre que
// devuelve un Group con los pies en y=0 (salvo las de pared, que cuelgan de su origen). Las que se mueven llevan
// g.userData.upd = (t) => {...}, función PURA de t (segundos); escena.js las llama todas. Sin texto, sin caras.
import { THREE, TONE, mat, flat as gflat, ink, box, cyl, sphere, capsule, extrude, lathe, inkLine, tag, rng } from '../motor/gm3d.js';
const T = TONE;
export const LOOP = 12; // todo lo que se mueve se repite cada 12 s (bucle limpio)
const TAU = Math.PI * 2;
const G = (name) => tag(new THREE.Group(), (name.includes(':') ? name : 'sala:' + name));
const put = (g, o, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };

// ---- material plano (sin luz): para cielo, sol, paneles encendidos. acc = naranja.
const _flat = new Map();
export function flat(t, acc = false) {
  const k = `${t}|${acc}`; if (_flat.has(k)) return _flat.get(k);
  const m = gflat(t, { accent: acc, double: true }); _flat.set(k, m); return m;
}
const fmesh = (geo, t, acc = false, line = false) => { const m = new THREE.Mesh(geo, flat(t, acc)); if (line) ink(m, 40); return m; };
export const fbox = (w, h, d, t, acc = false, line = true) => fmesh(new THREE.BoxGeometry(w, h, d), t, acc, line);
export const fcyl = (rt, rb, h, t, acc = false, line = false) => fmesh(new THREE.CylinderGeometry(rt, rb, h, 36), t, acc, line);
export const fplane = (w, h, t, acc = false) => fmesh(new THREE.PlaneGeometry(w, h), t, acc);
const shell = (m, o = {}) => { m.castShadow = o.shadow !== false; m.receiveShadow = true; return m; };
const ell = (rx, ry, rz, t, o = {}) => { const s = sphere(1, t, { seg: 20, ...o }); s.scale.set(rx, ry, rz); return s; };   // elipsoide
const tor = (R, r, t, arc = Math.PI * 2, o = {}) => shell(new THREE.Mesh(new THREE.TorusGeometry(R, r, 8, 20, arc), mat(t, o)), o);
const cone = (r, h, t, o = {}) => shell(new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), mat(t, { double: true, ...o })), o);
const tubo = (x0, y0, z0, x1, y1, z1, r, t = T.ink) => {   // cilindro fino entre dos puntos
  const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), d = b.clone().sub(a);
  const c = cyl(r, r, d.length(), t, { seg: 10, line: false }); c.position.copy(a.clone().add(b).multiplyScalar(0.5));
  c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return c;
};
// los asientos: cada pieza guarda g.userData.asientos = [{x, z, rotY}] en su marco local (z hacia donde mira la pieza)

// ============================================================ MUEBLES
// banco({plazas=3, tono, respaldo}): banco corrido de listones con patas tubulares. Mira a +z.
export function banco({ plazas = 3, tono = T.mid, respaldo = T.light } = {}) {  // light benches so the people read in front (integration 08/10)
  const g = G('banco'), w = plazas * 0.56, L = w + 0.08;
  for (let i = 0; i < 3; i++) put(g, box(L, 0.045, 0.13, tono), 0, 0.43, -0.15 + i * 0.15);
  for (let j = 0; j < 2; j++) put(g, box(L, 0.1, 0.03, respaldo), 0, 0.74 + j * 0.13, -0.235, -0.1);
  for (let k = 0; k <= plazas; k++) put(g, box(0.035, 0.5, 0.035, T.ink, { line: false }), -L / 2 + 0.04 + k * (L - 0.08) / plazas, 0.68, -0.22, -0.1);
  const xs = plazas >= 4 ? [-L / 2 + 0.07, 0, L / 2 - 0.07] : [-L / 2 + 0.07, L / 2 - 0.07];
  for (const x of xs) {
    for (const z of [-0.17, 0.17]) { put(g, cyl(0.017, 0.017, 0.41, T.ink, { seg: 8, line: false }), x, 0.205, z); put(g, cyl(0.04, 0.04, 0.012, T.ink, { seg: 12, line: false }), x, 0.006, z); }
    put(g, box(0.03, 0.03, 0.36, T.ink, { line: false }), x, 0.4, 0);
  }
  g.userData.asientos = Array.from({ length: plazas }, (_, i) => ({ x: -w / 2 + 0.28 + i * 0.56, z: -0.03, rotY: 0 }));
  return g;
}
// silla({tono, brazos}): silla de espera individual (carcasa y patas de tubo). Mira a +z.
export function silla({ tono = T.mid, brazos = false } = {}) {
  const g = G('silla');
  put(g, box(0.44, 0.045, 0.42, tono), 0, 0.44, 0);
  put(g, box(0.42, 0.3, 0.035, tono), 0, 0.68, -0.205, -0.1);
  for (const x of [-0.19, 0.19]) for (const z of [-0.17, 0.17]) put(g, cyl(0.016, 0.016, 0.42, T.ink, { seg: 8, line: false }), x, 0.21, z);
  put(g, box(0.38, 0.02, 0.02, T.ink, { line: false }), 0, 0.2, 0.17); put(g, box(0.38, 0.02, 0.02, T.ink, { line: false }), 0, 0.2, -0.17);
  if (brazos) for (const x of [-0.24, 0.24]) { put(g, box(0.04, 0.03, 0.34, T.dark), x, 0.66, 0); put(g, box(0.025, 0.2, 0.025, T.ink, { line: false }), x, 0.55, 0.1); }
  g.userData.asientos = [{ x: 0, z: -0.03, rotY: 0 }];
  return g;
}
// sofa({plazas=2, tono, cojin}): sofá con brazos y cojines (consulta privada). cojin=true añade un cojín naranja. Mira a +z.
export function sofa({ plazas = 2, tono = T.mid, cojin = true } = {}) {
  const g = G('sofa'), c = 0.62, L = plazas * c + 0.36;
  put(g, box(L, 0.24, 0.86, tono), 0, 0.2, 0);
  put(g, box(L, 0.52, 0.2, tono), 0, 0.46, -0.33);
  for (let i = 0; i < plazas; i++) {
    const x = -L / 2 + 0.18 + c / 2 + i * c;
    put(g, box(c - 0.02, 0.13, 0.6, T.pale), x, 0.385, 0.08);
    put(g, box(c - 0.06, 0.34, 0.15, T.light), x, 0.66, -0.17, -0.18);
  }
  for (const s of [-1, 1]) { put(g, box(0.18, 0.5, 0.86, tono), s * (L / 2 - 0.09), 0.33, 0); put(g, box(0.2, 0.05, 0.88, T.dark), s * (L / 2 - 0.09), 0.595, 0); for (const z of [0.34, -0.34]) put(g, cyl(0.03, 0.02, 0.08, T.ink, { seg: 8, line: false }), s * (L / 2 - 0.1), 0.04, z); }
  if (cojin) put(g, box(0.3, 0.3, 0.09, T.light, { accent: true }), -L / 2 + 0.42, 0.68, -0.05, -0.15, 0, 0.35);
  g.userData.asientos = Array.from({ length: plazas }, (_, i) => ({ x: -L / 2 + 0.18 + c / 2 + i * c, z: -0.1, rotY: 0 }));
  return g;
}
// sillon(): un sofá de una plaza. Mira a +z.
export const sillon = (o = {}) => { const g = sofa({ plazas: 1, cojin: false, ...o }); g.name = 'sillon'; return g; };
// mesaBaja({revistas}): mesa baja con revistas, taza y una plantita.
export function mesaBaja({ revistas = true } = {}) {
  const g = G('mesaBaja');
  put(g, box(0.95, 0.04, 0.55, T.dark), 0, 0.4, 0); put(g, box(0.85, 0.02, 0.45, T.mid), 0, 0.2, 0);
  for (const x of [-0.42, 0.42]) for (const z of [-0.23, 0.23]) put(g, cyl(0.018, 0.014, 0.4, T.ink, { seg: 8, line: false }), x, 0.2, z);
  if (revistas) {
    put(g, box(0.28, 0.012, 0.2, T.paper), -0.22, 0.426, 0.04, 0, 0.3); put(g, box(0.26, 0.012, 0.19, T.light), -0.21, 0.438, 0.04, 0, 0.1);
    put(g, box(0.22, 0.012, 0.16, T.light, { accent: true }), 0.0, 0.426, -0.1, 0, -0.4);
  }
  put(g, lathe([[0.001, 0], [0.04, 0], [0.045, 0.08], [0.04, 0.085], [0.001, 0.05]], T.pale, { double: true }), 0.28, 0.42, 0.1);
  return g;
}
// alfombra({r=1.1, tono}): alfombra redonda con aro.
export function alfombra({ r = 1.1, tono = T.mid, aro = true } = {}) {
  const g = G('alfombra'); put(g, cyl(r, r, 0.015, tono, { seg: 48 }), 0, 0.008, 0);
  if (aro) { put(g, cyl(r * 0.72, r * 0.72, 0.018, T.pale, { seg: 48, line: false }), 0, 0.01, 0); put(g, cyl(r * 0.4, r * 0.4, 0.02, tono, { seg: 40, line: false }), 0, 0.012, 0); }
  return g;
}

// ============================================================ PLANTAS Y OBJETOS DE SALA
// planta({alto=1.5, hojas=9, seed}): planta de interior en maceta (las hojas se mecen).
export function planta({ alto = 1.5, hojas = 9, seed = 5, tono = T.dark, inclinar = 0 } = {}) {
  const g = G('planta'), r = rng(seed), tallo = new THREE.Group(); tallo.position.y = 0.33; tallo.rotation.z = inclinar; g.add(tallo);
  put(g, lathe([[0.001, 0], [0.18, 0], [0.22, 0.1], [0.24, 0.34], [0.2, 0.36], [0.2, 0.31], [0.001, 0.31]], T.pale, { seg: 28, double: true }), 0, 0, 0);
  put(g, cyl(0.2, 0.2, 0.02, T.dark, { line: false }), 0, 0.33, 0);
  put(tallo, cyl(0.025, 0.035, alto * 0.7, T.dark, { seg: 8, line: false }), 0, alto * 0.35, 0);
  const hs = [];
  for (let i = 0; i < hojas; i++) {
    const a = (i / hojas) * TAU + r() * 0.6, h = 0.55 + (i / hojas) * (alto - 0.5), len = 0.34 + r() * 0.16;
    const piv = new THREE.Group(); piv.position.set(0, h - 0.33, 0); piv.rotation.y = a;
    const hoja = ell(len / 2, 0.014, 0.11 + r() * 0.04, i % 3 === 0 ? T.mid : tono, { line: false }); hoja.position.set(len / 2 + 0.03, 0.02, 0); hoja.rotation.z = 0.35 + r() * 0.3; piv.add(hoja);
    tallo.add(piv); hs.push([piv, a, r() * TAU, 1 + Math.floor(r() * 2)]);
  }
  g.userData.upd = (t) => { for (const [p, a, ph, k] of hs) p.rotation.y = a + 0.05 * Math.sin(TAU * k * t / LOOP + ph); };
  return g;
}
// dispensadorAgua(): enfriador de agua con garrafa invertida, grifos y vasos. Burbujas que suben.
export function dispensadorAgua() {
  const g = G('dispensadorAgua');
  put(g, box(0.34, 0.95, 0.34, T.light), 0, 0.475, 0); put(g, box(0.3, 0.05, 0.3, T.dark), 0, 0.975, 0);
  put(g, box(0.2, 0.1, 0.01, T.ink, { line: false }), 0, 0.5, 0.176); put(g, box(0.26, 0.015, 0.1, T.mid), 0, 0.46, 0.2);
  put(g, box(0.06, 0.05, 0.05, T.dark), -0.07, 0.68, 0.19); put(g, box(0.06, 0.05, 0.05, T.light, { accent: true }), 0.07, 0.68, 0.19);
  put(g, cyl(0.05, 0.05, 0.2, T.pale, { seg: 16 }), 0.2, 0.78, 0.05);
  put(g, lathe([[0.001, 0], [0.13, 0], [0.16, 0.1], [0.16, 0.34], [0.1, 0.46], [0.05, 0.5], [0.05, 0.56]], T.pale, { seg: 28, double: true }), 0, 1.0, 0);
  put(g, lathe([[0.001, 0.0], [0.125, 0.0], [0.155, 0.1], [0.155, 0.22], [0.001, 0.22]], T.mid, { seg: 24, line: false }), 0, 1.003, 0);
  const bub = []; for (let i = 0; i < 4; i++) { const b = sphere(0.014, T.paper, { seg: 8, line: false }); g.add(b); bub.push(b); }
  g.userData.upd = (t) => bub.forEach((b, i) => { const u = (t / LOOP * (2 + (i % 2)) + i / 4) % 1; b.position.set(Math.sin(u * 9 + i) * 0.04, 1.2 + u * 0.18, Math.cos(i) * 0.03); });
  return g;
}
// revistero(): revistero de pared (tablero con baldas inclinadas y revistas de colores sin texto). Origen: pie del centro, mira a +z.
export function revistero({ seed = 3 } = {}) {
  const g = G('revistero'), r = rng(seed);
  put(g, box(0.78, 1.0, 0.04, T.mid), 0, 0.5, 0.02);
  for (let k = 0; k < 3; k++) {
    const y = 0.22 + k * 0.3;
    put(g, box(0.76, 0.02, 0.12, T.dark), 0, y, 0.1, -0.35);
    for (let i = 0; i < 4; i++) { const tn = [T.paper, T.pale, T.light, T.dark][Math.floor(r() * 4)]; put(g, box(0.15, 0.2, 0.012, tn, { accent: k === 1 && i === 2 }), -0.28 + i * 0.185 + r() * 0.02, y + 0.12, 0.1, -0.35, 0, (r() - 0.5) * 0.12); }
  }
  return g;
}
// perchero({abrigos=true, paraguas=3}): perchero de pie con abrigos, bufanda naranja y paragüero con un patito de goma (humor).
export function perchero({ abrigos = true, paraguas = 3 } = {}) {
  const g = G('perchero');
  put(g, cyl(0.2, 0.22, 0.03, T.dark, { seg: 24 }), 0, 0.015, 0); put(g, cyl(0.022, 0.022, 1.85, T.ink, { seg: 8, line: false }), 0, 0.94, 0);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.add(tubo(0, 1.78, 0, Math.cos(a) * 0.17, 1.9, Math.sin(a) * 0.17, 0.012)); }
  if (abrigos) {
    put(g, capsule(0.13, 0.55, T.mid), 0.1, 1.4, 0.13, 0.1); put(g, capsule(0.12, 0.5, T.dark), -0.12, 1.42, -0.12, -0.1);
    put(g, capsule(0.04, 0.4, T.light, { accent: true }), -0.09, 1.55, 0.1, 0, 0, 0.05);
    put(g, cyl(0.1, 0.1, 0.03, T.pale, { seg: 16 }), 0.17, 1.93, -0.1); put(g, cyl(0.06, 0.07, 0.07, T.pale, { seg: 16 }), 0.17, 1.97, -0.1);
  }
  const p = new THREE.Group(); p.position.set(0.55, 0, 0.25); g.add(p);
  put(p, lathe([[0.001, 0], [0.12, 0], [0.13, 0.5], [0.12, 0.5], [0.12, 0.02], [0.001, 0.02]], T.dark, { seg: 20, double: true }), 0, 0, 0);
  const rr = rng(11);
  for (let i = 0; i < paraguas; i++) {
    const a = i * 1.7 + 0.4, tilt = 0.12 + rr() * 0.1; const u = new THREE.Group(); u.position.set(Math.cos(a) * 0.05, 0.1, Math.sin(a) * 0.05); u.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    put(u, cyl(0.012, 0.012, 0.8, T.ink, { seg: 8, line: false }), 0, 0.4, 0); put(u, cone(0.045, 0.5, [T.dark, T.mid, T.paper][i % 3]), 0, 0.57, 0); put(u, tor(0.03, 0.009, T.ink, Math.PI), 0.03, 0.8, 0); p.add(u);
  }
  put(p, sphere(0.05, T.light, { accent: true, seg: 14 }), -0.05, 0.54, 0.06); put(p, sphere(0.032, T.light, { accent: true, seg: 12 }), -0.05, 0.6, 0.085); put(p, box(0.035, 0.012, 0.02, T.dark, { line: false }), -0.05, 0.598, 0.12);
  return g;
}

// ============================================================ PARED: RELOJ, TABLERO, CARTELES, VENTANA, PUERTA
// reloj({r=0.3, pendulo=true}): reloj de pared con caja larga y péndulo. Centro de la esfera en el origen, mira a +z. Segundero: 1 vuelta por LOOP (12 saltitos).
export function reloj({ r = 0.3, pendulo = true, largo = 0.85 } = {}) {
  const g = G('reloj');
  put(g, cyl(r + 0.05, r + 0.05, 0.08, T.dark, { seg: 40 }), 0, 0, 0.04, Math.PI / 2);
  put(g, cyl(r, r, 0.01, T.paper, { seg: 40, line: false }), 0, 0, 0.085, Math.PI / 2);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; put(g, box(i % 3 === 0 ? 0.03 : 0.018, i % 3 === 0 ? 0.05 : 0.035, 0.008, T.ink, { line: false }), Math.sin(a) * (r - 0.05), Math.cos(a) * (r - 0.05), 0.093, 0, 0, -a); }
  const mano = (len, w, t, z) => { const p = new THREE.Group(); p.position.z = z; const m = box(w, len, 0.008, t, { line: false }); m.position.y = len / 2 - 0.02; p.add(m); g.add(p); return p; };
  const h = mano(r * 0.55, 0.026, T.ink, 0.1), m = mano(r * 0.82, 0.018, T.ink, 0.104), s = mano(r * 0.9, 0.008, T.light, 0.108);
  s.children[0].material = mat(T.light, { accent: true }); put(g, sphere(0.018, T.ink, { seg: 10 }), 0, 0, 0.11);
  h.rotation.z = -(10.15 / 12) * TAU; m.rotation.z = -(54 / 60) * TAU;
  let pend = null;
  if (pendulo) {
    const cy = -(r + 0.05) - largo / 2 + 0.03;
    put(g, box(0.2, largo, 0.1, T.dark), 0, cy, 0.05); put(g, box(0.14, largo - 0.12, 0.01, T.pale, { line: false }), 0, cy, 0.102);
    pend = new THREE.Group(); pend.position.set(0, -(r + 0.05) - 0.06, 0.11); g.add(pend);
    put(pend, box(0.012, largo - 0.25, 0.006, T.ink, { line: false }), 0, -(largo - 0.25) / 2, 0); put(pend, cyl(0.045, 0.045, 0.012, T.mid, { seg: 20 }), 0, -(largo - 0.25), 0.004, Math.PI / 2);
    put(pend, cyl(0.02, 0.02, 0.014, T.pale, { seg: 12, line: false }), 0, -(largo - 0.25), 0.012, Math.PI / 2);
  }
  g.userData.upd = (t) => { const tick = Math.floor(t), f = Math.min(1, (t - tick) * 6); const e = 1 - Math.pow(1 - f, 3); s.rotation.z = -((tick + e) / LOOP) * TAU; if (pend) pend.rotation.z = 0.32 * Math.sin(Math.PI * t); };
  return g;
}
// tablero({w=1.5, h=0.55}): panel de turno SIN texto ni cifras: panel encendido en blanco con una fila de puntitos y UN punto naranja que se desplaza (ida y vuelta, bucle de LOOP). Origen centro, mira a +z.
export function tablero({ w = 1.5, h = 0.55 } = {}) {
  const g = G('tablero'), n = 9, x0 = -w / 2 + 0.2, dx = (w - 0.4) / (n - 1);
  put(g, box(w, h, 0.14, T.ink), 0, 0, 0.07); put(g, fbox(w - 0.12, h - 0.12, 0.01, 0.93, false, true), 0, 0, 0.145);
  for (let i = 0; i < n; i++) put(g, fcyl(0.032, 0.032, 0.01, 0.25, false, false), x0 + i * dx, 0, 0.155, Math.PI / 2);
  const dot = fcyl(0.07, 0.07, 0.012, 0.6, true, false); dot.rotation.x = Math.PI / 2; dot.position.set(x0, 0, 0.16); g.add(dot);
  g.add(tubo(-w / 2 + 0.15, h / 2, 0.05, -w / 2 + 0.15, h / 2 + 0.35, -0.02, 0.01)); g.add(tubo(w / 2 - 0.15, h / 2, 0.05, w / 2 - 0.15, h / 2 + 0.35, -0.02, 0.01));
  put(g, lathe([[0.001, 0], [0.12, 0], [0.12, 0.02], [0.05, 0.1], [0.001, 0.1]], T.dark, { seg: 20, double: true }), 0, h / 2 + 0.02, 0.1);
  put(g, fbox(0.1, 0.012, 0.1, T.light, true, false), 0, h / 2 + 0.0, 0.1);
  g.userData.upd = (t) => { const u = (t / LOOP * 2) % 2, p = u < 1 ? u : 2 - u; const e = p * p * (3 - 2 * p); dot.position.x = x0 + e * (n - 1) * dx; };
  return g;
}
// cartel(tipo): cartel enmarcado SOLO con formas: 'sol' | 'arbol' | 'corazon' | 'nubes' | 'manos' | 'mapa'. 0.5 x 0.7, mira a +z, centro en el origen.
export function cartel(tipo = 'sol', { w = 0.5, h = 0.7 } = {}) {
  const g = G('sala:cartel-' + tipo);
  put(g, box(w, h, 0.03, T.ink), 0, 0, 0.015); put(g, box(w - 0.06, h - 0.06, 0.012, T.paper, { line: false }), 0, 0, 0.031);
  const z = 0.04, disc = (r, t, x, y, o = {}) => put(g, cyl(r, r, 0.01, t, { seg: 24, line: false, ...o }), x, y, z, Math.PI / 2), bar = (bw, bh, t, x, y, o = {}) => put(g, box(bw, bh, 0.008, t, { line: false, ...o }), x, y, z);
  if (tipo === 'sol') { disc(0.1, T.light, 0, 0.08, { accent: true }); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; put(g, box(0.02, 0.05, 0.006, T.dark, { line: false }), Math.sin(a) * 0.17, 0.08 + Math.cos(a) * 0.17, z, 0, 0, -a); } bar(w - 0.1, 0.1, T.mid, 0, -0.25); }
  if (tipo === 'arbol') { bar(0.04, 0.22, T.dark, 0, -0.1); disc(0.13, T.mid, 0, 0.1); disc(0.08, T.dark, 0.07, 0.04); }
  if (tipo === 'corazon') { disc(0.07, T.mid, -0.06, 0.06); disc(0.07, T.mid, 0.06, 0.06); put(g, box(0.14, 0.14, 0.01, T.mid, { line: false }), 0, 0.0, z, 0, 0, Math.PI / 4); bar(w - 0.14, 0.03, T.light, 0, -0.22, { accent: true }); }
  if (tipo === 'nubes') { for (const [x, y, s] of [[-0.08, 0.1, 0.1], [0.07, 0.14, 0.08], [0.0, 0.05, 0.12]]) disc(s, T.pale, x, y, { line: true }); bar(w - 0.1, 0.08, T.dark, 0, -0.24); bar(0.18, 0.05, T.mid, 0.05, -0.15); }
  if (tipo === 'manos') { disc(0.12, T.pale, -0.05, 0.08, { line: true }); disc(0.12, T.mid, 0.05, 0.0, { line: true }); bar(0.3, 0.025, T.dark, 0, -0.22); bar(0.2, 0.025, T.dark, -0.05, -0.27); }
  if (tipo === 'mapa') { bar(0.34, 0.34, T.light, 0, 0.05); for (let i = 0; i < 3; i++) put(g, box(0.34, 0.012, 0.008, T.dark, { line: false }), 0, -0.04 + i * 0.1, z + 0.004); put(g, box(0.012, 0.34, 0.008, T.dark, { line: false }), 0.06, 0.05, z + 0.004); disc(0.03, T.light, -0.07, 0.1, { accent: true }); }
  return g;
}
// tablonAnuncios({w=0.9, h=0.6}): tablón de corcho con papelitos de formas (sin texto).
export function tablonAnuncios({ w = 0.9, h = 0.6, seed = 4 } = {}) {
  const g = G('tablonAnuncios'), r = rng(seed);
  put(g, box(w, h, 0.03, T.ink), 0, 0, 0.015); put(g, box(w - 0.06, h - 0.06, 0.012, T.mid, { line: false }), 0, 0, 0.031);
  for (let i = 0; i < 9; i++) { const pw = 0.1 + r() * 0.08, ph = 0.12 + r() * 0.08; put(g, box(pw, ph, 0.006, [T.paper, T.pale, T.light][i % 3], { accent: i === 4 }), (r() - 0.5) * (w - 0.25), (r() - 0.5) * (h - 0.25), 0.042 + i * 0.0006, 0, 0, (r() - 0.5) * 0.25); }
  return g;
}
// ventana({w, h, cortinas}): marco con parteluz, travesaño y alféizar interior y exterior. SIN cristal (se ve el exterior). Origen: centro del hueco en la pared (z=0 = cara interior).
export function ventana({ w = 3.0, h = 1.8, cortinas = false, trav = null } = {}) {
  const g = G('ventana'), f = 0.08;
  put(g, box(w + 2 * f, f, 0.14, T.dark), 0, h / 2 + f / 2, -0.02); put(g, box(w + 2 * f, f, 0.14, T.dark), 0, -h / 2 - f / 2, -0.02);
  for (const s of [-1, 1]) put(g, box(f, h + 2 * f, 0.14, T.dark), s * (w / 2 + f / 2), 0, -0.02);
  put(g, box(0.06, h, 0.07, T.dark), 0, 0, -0.06); put(g, box(w, 0.055, 0.07, T.dark), 0, trav ?? h * 0.18, -0.06);
  put(g, box(w + 0.3, 0.05, 0.26, T.mid), 0, -h / 2 - f - 0.02, 0.1);      // alféizar interior
  put(g, box(w + 0.2, 0.05, 0.34, T.mid), 0, -h / 2 - f - 0.02, -0.3);     // alféizar exterior (la paloma)
  if (cortinas) {
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) put(g, box(0.1, h + 0.5, 0.05, k % 2 ? T.light : T.pale), s * (w / 2 + 0.1 + k * 0.095), 0.12, 0.12 + (k % 2) * 0.03);
    put(g, cyl(0.02, 0.02, w + 1.0, T.ink, { seg: 8, line: false }), 0, h / 2 + 0.3, 0.12, 0, 0, Math.PI / 2);
  }
  return g;
}
// puerta({w=0.95, h=2.1, abierta=0, ventanita, piloto}): puerta con marco; abierta en radianes (0 cerrada). Origen: centro del hueco, en el suelo. Bisagra a la izquierda.
export function puerta({ w = 0.95, h = 2.1, abierta = 0, tono = T.mid, ventanita = true, piloto = false } = {}) {
  const g = G('puerta'), f = 0.07;
  put(g, box(w + 2 * f, f, 0.18, T.dark), 0, h + f / 2, -0.03); for (const s of [-1, 1]) put(g, box(f, h + f, 0.18, T.dark), s * (w / 2 + f / 2), (h + f) / 2, -0.03);
  const hoja = new THREE.Group(); hoja.position.set(-w / 2, 0, -0.04); hoja.rotation.y = -abierta; g.add(hoja);
  put(hoja, box(w - 0.02, h - 0.02, 0.05, tono), w / 2, h / 2, 0);
  put(hoja, box(w - 0.3, 0.7, 0.02, T.light), w / 2, 0.55, 0.03); put(hoja, box(w - 0.3, 0.7, 0.02, T.light), w / 2, 1.5, 0.03);
  if (ventanita) put(hoja, box(0.3, 0.5, 0.02, T.paper), w / 2, 1.5, 0.045);
  put(hoja, cyl(0.02, 0.02, 0.1, T.ink, { seg: 10, line: false }), w - 0.1, 1.0, 0.07, Math.PI / 2); put(hoja, box(0.11, 0.025, 0.02, T.ink, { line: false }), w - 0.14, 1.0, 0.09);
  if (piloto) put(g, fbox(0.12, 0.12, 0.03, T.light, true, true), 0, h + 0.28, 0.0);
  return g;
}
// persiana({w, caida}): persiana enrollable medio bajada (ventanilla). Origen: centro arriba.
export function persiana({ w = 2.0, caida = 0.35 } = {}) {
  const g = G('persiana'), n = Math.round(caida / 0.045); put(g, cyl(0.07, 0.07, w, T.dark, { seg: 16 }), 0, 0, 0.08, 0, 0, Math.PI / 2);
  for (let i = 0; i < n; i++) put(g, box(w, 0.04, 0.02, i % 2 ? T.mid : T.light), 0, -0.07 - i * 0.045, 0.07);
  put(g, box(w, 0.03, 0.04, T.dark), 0, -0.07 - n * 0.045 - 0.02, 0.075);
  return g;
}
// telarana({r}): telaraña de líneas de tinta en una esquina (humor: la ventanilla lleva tiempo parada). Esquina superior izquierda en el origen.
export function telarana({ r = 0.35 } = {}) {
  const g = G('telarana');
  for (let i = 0; i <= 4; i++) { const a = -i / 4 * Math.PI / 2; g.add(inkLine([[0, 0, 0], [Math.cos(a) * r, Math.sin(a) * r, 0]])); }
  for (let k = 1; k <= 4; k++) { const pts = []; for (let i = 0; i <= 4; i++) { const a = -i / 4 * Math.PI / 2, rr = r * k / 4 * (i % 2 ? 0.88 : 1); pts.push([Math.cos(a) * rr, Math.sin(a) * rr, 0]); } g.add(inkLine(pts)); }
  return g;
}
// aplique(): lámpara de pared con pantalla naranja (la luz de 'tarde' y 'noche'). Origen en la pared, mira a +z.
export function aplique({ acc = true } = {}) {
  const g = G('aplique'); put(g, box(0.08, 0.2, 0.03, T.dark), 0, 0, 0.015); g.add(tubo(0, 0, 0.03, 0, 0.1, 0.16, 0.012));
  put(g, fmesh(new THREE.CylinderGeometry(0.06, 0.1, 0.14, 20, 1, true), T.light, acc, false), 0, 0.1, 0.16);
  return g;
}

// ============================================================ ESTANTERÍA, LÁMPARAS (consulta privada)
// estanteria({w=1.2, h=2.0, baldas=5}): librería con libros de tonos. Origen: pie del centro, mira a +z.
export function estanteria({ w = 1.2, h = 2.0, baldas = 5, seed = 9 } = {}) {
  const g = G('estanteria'), r = rng(seed);
  put(g, box(w, h, 0.03, T.dark), 0, h / 2, -0.15);
  for (const s of [-1, 1]) put(g, box(0.04, h, 0.34, T.dark), s * (w / 2 - 0.02), h / 2, 0);
  for (let k = 0; k <= baldas; k++) put(g, box(w, 0.035, 0.34, T.mid), 0, 0.05 + k * (h - 0.1) / baldas, 0);
  for (let k = 0; k < baldas; k++) {
    const y0 = 0.07 + k * (h - 0.1) / baldas; let x = -w / 2 + 0.08; const free = (h - 0.1) / baldas - 0.05;
    while (x < w / 2 - 0.14) {
      const bw = 0.03 + r() * 0.035, bh = Math.min(free * (0.6 + r() * 0.38), free);
      if (r() < 0.12) { x += 0.12; continue; }
      put(g, box(bw, bh, 0.22, [T.paper, T.pale, T.light, T.mid, T.dark][Math.floor(r() * 5)], { accent: r() < 0.06 }), x + bw / 2, y0 + bh / 2, 0.0); x += bw + 0.004;
    }
  }
  put(g, box(0.2, 0.025, 0.16, T.light, { accent: true }), w / 4, h + 0.0125, 0, 0, 0.3, 0);
  return g;
}
// lamparaPie({acc=true}): lámpara de pie con pantalla cálida (naranja).
export function lamparaPie({ acc = true, alto = 1.55 } = {}) {
  const g = G('lamparaPie'); put(g, cyl(0.15, 0.17, 0.03, T.dark, { seg: 24 }), 0, 0.015, 0); put(g, cyl(0.012, 0.012, alto, T.ink, { seg: 8, line: false }), 0, alto / 2, 0);
  put(g, fmesh(new THREE.CylinderGeometry(0.14, 0.24, 0.3, 28, 1, true), T.pale, acc, false), 0, alto + 0.05, 0);
  put(g, sphere(0.05, T.paper, { seg: 12, line: false }), 0, alto - 0.02, 0);
  return g;
}
// lamparaMesa({acc=true}): lámpara de sobremesa pequeña.
export function lamparaMesa({ acc = true } = {}) {
  const g = G('lamparaMesa'); put(g, lathe([[0.001, 0], [0.08, 0], [0.07, 0.05], [0.04, 0.12], [0.03, 0.2], [0.001, 0.2]], T.dark, { seg: 20 }), 0, 0, 0);
  put(g, fmesh(new THREE.CylinderGeometry(0.09, 0.15, 0.18, 24, 1, true), T.pale, acc, false), 0, 0.3, 0); return g;
}

// ============================================================ RECEPCIÓN
// mostrador({w=2.7, d=0.7}): mostrador de recepción con paneles, timbre, teléfono, bandeja. Cara frontal a +z. Origen: centro, en el suelo.
export function mostrador({ w = 2.7, d = 0.7 } = {}) {
  const g = G('mostrador');
  put(g, box(w, 0.92, d - 0.05, T.dark), 0, 0.46, -0.02);
  for (let i = 0; i < Math.round(w / 0.3); i++) put(g, box(0.26, 0.7, 0.02, T.ink), -w / 2 + 0.15 + i * 0.3, 0.46, d / 2 - 0.04);
  put(g, box(w + 0.08, 0.06, d + 0.06, T.light), 0, 1.0, 0);
  put(g, lathe([[0.001, 0], [0.05, 0], [0.04, 0.03], [0.001, 0.045]], T.pale, { seg: 16 }), -w / 2 + 0.55, 1.03, 0.18); put(g, sphere(0.012, T.light, { accent: true, seg: 8 }), -w / 2 + 0.55, 1.085, 0.18);
  put(g, box(0.2, 0.06, 0.18, T.ink), -w / 2 + 1.05, 1.06, 0.1); put(g, box(0.12, 0.02, 0.05, T.mid, { line: false }), -w / 2 + 1.05, 1.1, 0.1);
  put(g, box(0.3, 0.02, 0.22, T.pale), w / 2 - 0.5, 1.04, 0.15); put(g, box(0.26, 0.012, 0.18, T.paper), w / 2 - 0.5, 1.06, 0.15, 0, 0.1);
  put(g, lathe([[0.001, 0], [0.05, 0], [0.055, 0.08], [0.001, 0.08]], T.dark, { seg: 16 }), w / 2 - 0.15, 1.03, 0.1); put(g, capsule(0.03, 0.12, T.mid, { seg: 10 }), w / 2 - 0.15, 1.17, 0.1);
  return g;
}
// trastienda({w, d}): el cuarto detrás de la ventanilla: suelo, paredes, archivadores, lámpara y monitor de espaldas. Origen: centro de la cara de la pared (z=0), crece hacia -z.
export function trastienda({ w = 2.7, d = 1.6, h = 3.0 } = {}) {
  const g = G('trastienda');
  put(g, box(w, 0.04, d, T.mid), 0, 0.02, -d / 2);
  put(g, box(w, h, 0.06, T.light), 0, h / 2, -d); for (const s of [-1, 1]) put(g, box(0.06, h, d, T.mid), s * w / 2, h / 2, -d / 2);
  for (let k = 0; k < 4; k++) { put(g, box(w - 0.3, 0.03, 0.3, T.dark), 0, 1.0 + k * 0.45, -d + 0.2); for (let i = 0; i < 8; i++) put(g, box(0.18, 0.34, 0.24, [T.pale, T.light, T.paper, T.mid][(i + k) % 4], { accent: k === 1 && i === 5 }), -w / 2 + 0.3 + i * 0.28, 1.19 + k * 0.45, -d + 0.2); }
  put(g, lamparaMesa({}), -w / 2 + 0.4, 1.0, -0.4); put(g, box(0.3, 0.22, 0.04, T.ink), 0.45, 1.14, -0.6); put(g, box(0.5, 0.04, 0.4, T.dark), 0.45, 0.98, -0.5);
  return g;
}

// ============================================================ RINCÓN INFANTIL
// rinconNinos(): alfombra redonda, mesita con dos sillitas, torre de cubos, tren, osito y pelota naranja. Origen: centro de la alfombra.
export function rinconNinos() {
  const g = G('rinconNinos');
  put(g, alfombra({ r: 1.25, tono: T.light }), 0, 0, 0);
  put(g, box(0.6, 0.03, 0.45, T.mid), -0.45, 0.42, -0.25); for (const x of [-0.7, -0.2]) for (const z of [-0.42, -0.08]) put(g, cyl(0.02, 0.02, 0.4, T.ink, { seg: 8, line: false }), x, 0.2, z);
  for (const [x, z, ry] of [[-0.45, 0.2, Math.PI], [-1.0, -0.3, Math.PI / 2]]) { const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; put(s, box(0.26, 0.03, 0.26, T.dark), 0, 0.26, 0); put(s, box(0.26, 0.2, 0.03, T.dark), 0, 0.38, -0.12); for (const a of [-0.1, 0.1]) for (const b of [-0.1, 0.1]) put(s, cyl(0.013, 0.013, 0.25, T.ink, { seg: 6, line: false }), a, 0.125, b); g.add(s); }
  [[0.2, T.paper, 0], [0.18, T.dark, 0.2], [0.16, T.light, 0.4]].forEach(([s, t, y], i) => put(g, box(s, 0.2, s, t, { accent: i === 2 }), 0.55 + (i === 1 ? 0.01 : 0), 0.1 + y, 0.5, 0, i * 0.3, 0));
  put(g, sphere(0.04, T.light, { accent: true, seg: 10 }), 0.55, 0.64, 0.5);
  const tr = new THREE.Group(); tr.position.set(0.3, 0, -0.5); tr.rotation.y = 0.5; g.add(tr);
  put(tr, box(0.3, 0.12, 0.14, T.dark), 0, 0.1, 0); put(tr, box(0.12, 0.08, 0.14, T.paper), -0.07, 0.2, 0); put(tr, cyl(0.04, 0.04, 0.12, T.mid, { seg: 12 }), 0.1, 0.2, 0); put(tr, box(0.22, 0.1, 0.12, T.light), -0.32, 0.09, 0);
  for (const x of [-0.1, 0.1, -0.38, -0.26]) for (const z of [-0.075, 0.075]) put(tr, cyl(0.035, 0.035, 0.02, T.ink, { seg: 12, line: false }), x, 0.035, z, Math.PI / 2);
  const o = new THREE.Group(); o.position.set(-0.1, 0, 0.55); o.rotation.y = 0.6; g.add(o);
  put(o, sphere(0.1, T.mid, { seg: 14, line: false }), 0, 0.14, 0); put(o, sphere(0.07, T.mid, { seg: 12, line: false }), 0, 0.3, 0);
  for (const s of [-1, 1]) { put(o, sphere(0.03, T.mid, { seg: 8, line: false }), s * 0.055, 0.36, 0); put(o, sphere(0.04, T.mid, { seg: 8, line: false }), s * 0.1, 0.1, 0.07); }
  put(g, sphere(0.09, T.pale, { accent: true, seg: 14 }), 0.9, 0.09, 0.0);
  return g;
}

// ============================================================ ANIMALITOS Y LUZ
// paloma(): paloma de perfil mirando a +x (sobre el alféizar exterior). Picotea cada 1,5 s.
export function paloma() {
  const g = G('paloma');
  put(g, ell(0.115, 0.075, 0.07, T.light), 0, 0.12, 0); put(g, ell(0.08, 0.05, 0.065, T.mid, { line: false }), -0.02, 0.135, 0.005);
  put(g, box(0.12, 0.02, 0.06, T.dark, { line: false }), -0.17, 0.115, 0, 0, 0, 0.2); put(g, ell(0.05, 0.06, 0.055, T.pale), 0.08, 0.13, 0);
  const head = new THREE.Group(); head.position.set(0.1, 0.19, 0); g.add(head);
  put(head, sphere(0.04, T.light, { seg: 14 }), 0.02, 0.03, 0); put(head, cone(0.014, 0.05, T.light, { accent: true }), 0.075, 0.025, 0, 0, 0, -Math.PI / 2);
  put(head, sphere(0.008, T.ink, { seg: 6, line: false }), 0.045, 0.045, 0.03);
  for (const z of [-0.025, 0.025]) { put(g, box(0.01, 0.06, 0.01, T.ink, { line: false }), 0.01, 0.03, z); put(g, box(0.04, 0.008, 0.012, T.ink, { line: false }), 0.025, 0.004, z); }
  g.userData.upd = (t) => { const p = Math.pow(Math.max(0, Math.sin(TAU * t / 1.5)), 3); head.rotation.z = -p * 0.9; head.position.y = 0.19 - p * 0.03; };
  return g;
}
// mosca(): mosca con alas que aletean. La ruta y el rastro de puntos los pone escena.js.
export function mosca() {
  const g = G('mosca'); put(g, ell(0.022, 0.014, 0.014, T.ink), 0, 0, 0); put(g, sphere(0.012, T.ink, { seg: 8, line: false }), 0.024, 0, 0);
  const a = fbox(0.03, 0.002, 0.026, T.paper, false, true), b = a.clone(); a.position.set(-0.002, 0.012, 0.016); b.position.set(-0.002, 0.012, -0.016); g.add(a, b);
  g.userData.alas = [a, b]; return g;
}
// polvo(caja, n): motas de polvo en el haz de luz de la ventana (bolitas de tinta que flotan, bucle de LOOP s). Se reparten en la caja {x0,x1,y0,y1,z0,z1}.
export function polvo(caja, n = 30, seed = 2) {
  const g = G('polvo'), r = rng(seed), ps = [];
  for (let i = 0; i < n; i++) { const m = sphere(0.011 + r() * 0.007, T.ink, { seg: 6, line: false, shadow: false }); g.add(m); ps.push({ m, x: caja.x0 + r() * (caja.x1 - caja.x0), y: caja.y0 + r() * (caja.y1 - caja.y0), z: caja.z0 + r() * (caja.z1 - caja.z0), ph: r() * TAU, k: 1 + Math.floor(r() * 2) }); }
  g.userData.upd = (t) => ps.forEach((p) => { const u = TAU * p.k * t / LOOP + p.ph; p.m.position.set(p.x + 0.12 * Math.sin(u), p.y + 0.1 * Math.sin(u + 1.3), p.z + 0.1 * Math.cos(u)); });
  return g;
}
// cieloVentana({mood, sun, sunR, zc, arbol}): lo que se ve desde la ventana: cielo plano, sol (o luna) entero, casas holandesas de enfrente (frontones de campana, de escalera y de cuello, ventanas altas con marco blanco) y un árbol. Capa 'fondo'. userData.sun = grupo del sol.
export function cieloVentana({ mood = 'dia', z = -40, cx = -6, sun = [-14, 5.7, -34], sunR = 1.9, zc = -20, arbol = [-3.5, -9] } = {}) {
  const g = G('cielo'); g.userData.layer = 'fondo';
  const noche = mood === 'noche', tarde = mood === 'tarde', sky = noche ? 0.1 : tarde ? 0.8 : 0.94;
  put(g, fplane(200, 90, sky), cx, 20, z);
  const s = new THREE.Group(); s.position.set(sun[0], tarde ? sun[1] - 0.8 : sun[1], sun[2]); s.scale.setScalar(sunR); g.add(s);
  if (noche) { put(s, fcyl(0.9, 0.9, 0.02, 0.92, true), 0, 0, 0, Math.PI / 2); put(s, fcyl(0.72, 0.72, 0.03, sky, false), 0.33, 0.12, 0.0, Math.PI / 2); }
  else { put(s, fcyl(1.0, 1.0, 0.02, 0.55, true), 0, 0, 0, Math.PI / 2); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; put(s, fbox(0.1, 0.4, 0.01, 0.3, false, false), Math.sin(a) * 1.55, Math.cos(a) * 1.55, -0.02, 0, 0, -a); } }
  g.userData.sun = s; g.userData.sun0 = s.position.clone();
  const r = rng(21);
  for (let i = 0; i < (noche ? 40 : 5); i++) {
    if (noche) put(g, fbox(0.12, 0.12, 0.01, 0.95, false, false), cx - 40 + r() * 80, 9 + r() * 25, z + 0.2);
    else { const cxx = cx - 30 + i * 16 + r() * 4, cy = 18 + r() * 8; for (const [dx, dy, q] of [[0, 0, 2], [3.4, -0.3, 1.6], [-3.2, -0.4, 1.4]]) put(g, fcyl(q * 1.5, q * 1.5, 0.01, 1.0, false, true), cxx + dx, cy + dy, z + 0.3, Math.PI / 2).scale.set(1.4, 1, 0.55); }
  }
  const tipos = ['campana', 'escalera', 'cuello', 'campana', 'escalera', 'cuello', 'escalera', 'campana']; let x = cx - 18;
  for (let k = 0; x < cx + 24; k++) {
    const w = 3.2 + (k % 3) * 0.25, h = 2.7 + (k % 2) * 0.12, tipo = tipos[k % tipos.length];
    let top; if (tipo === 'campana') top = [[w * 0.9, h + 0.15], [w * 0.74, h + 0.55], [w * 0.6, h + 0.85], [w * 0.4, h + 0.85], [w * 0.26, h + 0.55], [w * 0.1, h + 0.15]];
    else if (tipo === 'escalera') top = [[w, h + 0.3], [w * 0.8, h + 0.3], [w * 0.8, h + 0.6], [w * 0.6, h + 0.6], [w * 0.6, h + 0.9], [w * 0.4, h + 0.9], [w * 0.4, h + 0.6], [w * 0.2, h + 0.6], [w * 0.2, h + 0.3], [0, h + 0.3]];
    else top = [[w * 0.84, h + 0.2], [w * 0.7, h + 0.5], [w * 0.64, h + 0.9], [w * 0.36, h + 0.9], [w * 0.3, h + 0.5], [w * 0.16, h + 0.2]];
    const pts = [[0, 0], [w, 0], [w, h], ...top, [0, h]];
    const e = extrude(pts, 0.5, noche ? [0.22, 0.28, 0.18, 0.25][k % 4] : [0.52, 0.6, 0.46, 0.56][k % 4], {}); e.position.set(x, 0, zc); g.add(e);
    const zf = zc + 0.52;
    for (const wx of [0.12, 0.58]) for (const [wy, wh] of [[0.45, 1.15], [1.75, 0.8]]) {
      const lit = noche && ((k * 3 + Math.round(wx * 10) + Math.round(wy * 5)) % 3 === 0), cxw = x + w * wx + 0.35;
      put(g, fbox(0.46, wh + 0.14, 0.02, noche ? 0.6 : 0.98, false, false), cxw, wy + wh / 2 + 0.07, zf);
      put(g, fbox(0.34, wh, 0.02, lit ? 0.8 : (noche ? 0.06 : 0.25), lit, false), cxw, wy + wh / 2 + 0.07, zf + 0.012);
      put(g, fbox(0.36, 0.035, 0.02, 0.98, false, false), cxw, wy + wh * 0.62, zf + 0.025);
    }
    put(g, fbox(0.5, 0.9, 0.02, 0.2, false, false), x + w * 0.8, 0.45, zf + 0.005);
    x += w + 0.12;
  }
  const [tx, tz] = arbol, tr = new THREE.Group(); tr.position.set(tx, -0.6, tz); tr.scale.setScalar(0.7); g.add(tr);
  put(tr, cyl(0.1, 0.16, 2.6, T.ink, { seg: 8 }), 0, 1.3, 0);
  for (const [dx, dy, q] of [[0, 3.1, 1.0], [-0.8, 2.6, 0.75], [0.8, 2.7, 0.8], [0.2, 3.7, 0.65], [-0.4, 3.4, 0.7]]) put(tr, sphere(q, noche ? T.dark : (dy > 3 ? T.mid : T.dark), { seg: 14 }), dx, dy, 0);
  return g;
}
// luzSuelo(pts, barras): mancha de sol en el suelo. pts = [[x,z],...] del mundo; barras = lista de polígonos [[x,z],...] más oscuros (sombras del marco).
export function luzSuelo(pts, barras = []) {
  const g = G('luzSuelo');
  const mk = (p, t, y) => { const e = extrude(p.map(([x, z]) => [x, -z]), 0.002, t, { line: false, shadow: false }); e.rotation.x = -Math.PI / 2; e.position.y = y; g.add(e); };
  mk(pts, T.paper, 0.012); for (const b of barras) mk(b, T.light, 0.0135);
  return g;
}

// bolsa({tono}): bolso de mano olvidado en el suelo (primer plano). Origen en el suelo.
export function bolsa({ tono = T.dark } = {}) {
  const g = G('bolsa'); put(g, box(0.34, 0.22, 0.14, tono), 0, 0.11, 0); put(g, box(0.36, 0.03, 0.16, T.mid), 0, 0.235, 0); put(g, tor(0.11, 0.012, T.ink, Math.PI), 0, 0.235, 0);
  put(g, box(0.08, 0.05, 0.01, T.light, { accent: true, line: false }), 0, 0.14, 0.076); return g;
}
// paraguasGoteando(): paraguas cerrado apoyado en la pared con un cubo debajo; gotas que caen (bucle 1,5 s). Humor: el cubo va por la mitad. Mira a +z.
export function paraguasGoteando() {
  const g = G('paraguasGoteando'); const u = new THREE.Group(); u.position.set(0, 0, -0.1); u.rotation.x = -0.16; g.add(u);
  put(u, cyl(0.012, 0.012, 0.85, T.ink, { seg: 8, line: false }), 0, 0.43, 0); put(u, cone(0.06, 0.55, T.mid), 0, 0.62, 0); put(u, tor(0.035, 0.01, T.ink, Math.PI), 0.035, 0.86, 0);
  put(g, lathe([[0.001, 0], [0.12, 0], [0.15, 0.3], [0.14, 0.3], [0.11, 0.02], [0.001, 0.02]], T.mid, { seg: 20, double: true }), 0, 0, 0.22);
  put(g, cyl(0.12, 0.12, 0.012, T.pale, { seg: 20, line: false }), 0, 0.14, 0.22);
  put(g, cyl(0.28, 0.28, 0.006, T.dark, { seg: 24, line: false, shadow: false }), 0.0, 0.004, 0.0).scale.set(1, 1, 0.6);
  const ds = []; for (let i = 0; i < 3; i++) { const d = sphere(0.014, T.ink, { seg: 6, line: false, shadow: false }); g.add(d); ds.push(d); }
  g.userData.upd = (t) => ds.forEach((d, i) => { const q = ((t / 1.5) + i / 3) % 1; d.position.set(0, 0.04 + (1 - q * q) * 0.28, 0.04 + q * 0.18); d.visible = q < 0.9; });
  return g;
}
// cajaPerdidos(): caja de objetos perdidos con un solo calcetín colgando (humor), un guante y una bufanda. Origen en el suelo, abierta hacia +z.
export function cajaPerdidos() {
  const g = G('cajaPerdidos');
  put(g, box(0.55, 0.3, 0.38, T.mid), 0, 0.15, 0); put(g, box(0.47, 0.02, 0.3, T.dark, { line: false }), 0, 0.29, 0);
  put(g, capsule(0.035, 0.18, T.paper), 0.1, 0.3, 0.18, 0.2, 0, 0.5); put(g, capsule(0.04, 0.12, T.light, { accent: true }), 0.17, 0.2, 0.2, 0.0, 0, 0.1);
  put(g, capsule(0.035, 0.2, T.paper), 0.12, 0.34, 0.22, 0, 0, 0.1); put(g, capsule(0.03, 0.14, T.light), -0.12, 0.34, 0.08, 0.5, 0, -0.3);
  return g;
}
