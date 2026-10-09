// Estructura de la sala de espera (dueño: agente Sala): muros con huecos, suelo, y las dos variantes (pública y consulta privada).
// escena.js es la entrada; aquí se arma la habitación y se devuelve { seats, anclas, camaras, ... }. Ejes: fondo en -z, ventana a la izquierda, recepción a la derecha.
import { THREE, TONE, box, plane, extrude, cyl, sphere, inkLine, tag, rng, lamp, modelo } from '../motor/gm3d.js';
import * as O from './objetos.js';
const T = TONE, TAU = Math.PI * 2;
const K = 'modelos/kenney/';
export const MODELOS = ['furniture-kit/trashcan', 'furniture-kit/pottedPlant', 'furniture-kit/lampRoundFloor', 'furniture-kit/lampRoundTable', 'furniture-kit/sideTable', 'furniture-kit/books', 'furniture-kit/radio', 'furniture-kit/plantSmall2', 'furniture-kit/bookcaseOpenLow',
  'food-kit/cup-coffee', 'food-kit/mug', 'food-kit/soda-bottle', 'food-kit/cup-tea'].map((n) => K + n + '.glb');
const mod = (n, o, x, y, z, ry = 0) => { const m = modelo(K + n + '.glb', o); m.position.set(x, y, z); m.rotation.y = ry; tag(m, 'sala:modelo-' + n.split('/')[1]); return m; };
// charco de luz de una lámpara en el suelo (solo de noche): dos discos planos claros
function charco(root, x, z, r) {
  const g = tag(new THREE.Group(), 'sala:charco-de-luz'); root.add(g);
  put(g, O.fcyl(r, r, 0.004, 0.86, false, false), x, 0.016, z); put(g, O.fcyl(r * 0.6, r * 0.6, 0.004, 0.97, false, false), x, 0.018, z);
}
const put = (g, o, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };

// muro(len, h, aberturas, {tono, zocalo, grosor, shadow}): pared con huecos. Marco local: x = s a lo largo (centrado), y arriba, cara interior en z=0 mirando +z, el cuerpo hacia -z.
// aberturas: [{s0, s1, y0, y1}]; las de y0<=0 son puertas (muesca desde el suelo). Zócalo (franja baja con moldura) y moldura alta incluidos.
export function muro(len, h, aberturas = [], o = {}) {
  const gr = o.grosor ?? 0.2, g = tag(new THREE.Group(), 'sala:muro');
  const puertas = aberturas.filter((a) => a.y0 <= 0).sort((a, b) => a.s0 - b.s0), huecos = aberturas.filter((a) => a.y0 > 0);
  const pts = [[-len / 2, 0]];
  for (const p of puertas) pts.push([p.s0, 0], [p.s0, p.y1], [p.s1, p.y1], [p.s1, 0]);
  pts.push([len / 2, 0], [len / 2, h], [-len / 2, h]);
  const e = extrude(pts, gr, o.tono ?? T.pale, { holes: huecos.map((a) => [[a.s0, a.y0], [a.s1, a.y0], [a.s1, a.y1], [a.s0, a.y1]]), shadow: o.shadow }); e.position.z = -gr; g.add(e);
  const zh = o.zocalo ?? 1.0;
  if (zh) {
    let x0 = -len / 2; const segs = [];
    for (const p of puertas) { if (p.s0 > x0) segs.push([x0, p.s0]); x0 = p.s1; } segs.push([x0, len / 2]);
    for (const [a, b] of segs) {
      put(g, box(b - a, zh, 0.04, o.zocaloTono ?? T.mid, { shadow: false }), (a + b) / 2, zh / 2, 0.02);
      put(g, box(b - a, 0.05, 0.09, T.dark, { shadow: false }), (a + b) / 2, zh + 0.02, 0.045);
      put(g, box(b - a, 0.09, 0.06, T.dark, { shadow: false }), (a + b) / 2, 0.045, 0.03);
    }
  }
  put(g, box(len, 0.1, 0.1, o.molduraTono ?? T.mid, { shadow: false }), 0, h - 0.05, 0.05);
  return g;
}
const LADOS = { fondo: (W, D) => [0, -D / 2, 0], izq: (W) => [-W / 2, 0, Math.PI / 2], der: (W) => [W / 2, 0, -Math.PI / 2], frente: (W, D) => [0, D / 2, Math.PI] };
function colocarMuro(g, lado, W, D) {
  const [a, b, ry] = LADOS[lado](W, D);
  if (lado === 'fondo' || lado === 'frente') g.position.set(0, 0, b); else g.position.set(a, 0, 0);
  g.rotation.y = ry; g.name = 'sala:muro-' + lado; return g;
}

// suelo: baldosas (damero) y juntas de tinta, o tablones (parquet). Plano base + piezas alternas.
function sueloBaldosas(root, W, D, o = {}) {
  const g = tag(new THREE.Group(), 'sala:suelo'); root.add(g);
  const nx = o.nx ?? 12, tx = W / nx, nz = Math.round(D / tx), tz = D / nz;
  put(g, plane(W, D, o.base ?? T.pale), 0, 0, 0, -Math.PI / 2);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if ((i + j) % 2) put(g, plane(tx, tz, o.alt ?? T.light, { shadow: false }), -W / 2 + tx * (i + 0.5), 0.003, -D / 2 + tz * (j + 0.5), -Math.PI / 2);
  for (let i = 0; i <= nx; i++) g.add(inkLine([[-W / 2 + i * tx, 0.006, -D / 2], [-W / 2 + i * tx, 0.006, D / 2]]));
  for (let j = 0; j <= nz; j++) g.add(inkLine([[-W / 2, 0.006, -D / 2 + j * tz], [W / 2, 0.006, -D / 2 + j * tz]]));
  return g;
}
function sueloTablones(root, W, D) {
  const g = tag(new THREE.Group(), 'sala:suelo'); root.add(g);
  put(g, plane(W, D, T.light), 0, 0, 0, -Math.PI / 2);
  const r = rng(4), n = Math.round(W / 0.2);
  for (let i = 0; i < n; i++) put(g, plane(W / n - 0.004, D, [T.light, T.pale, T.mid][Math.floor(r() * 3)], { shadow: false }), -W / 2 + (i + 0.5) * W / n, 0.003, 0, -Math.PI / 2);
  for (let i = 0; i <= n; i++) g.add(inkLine([[-W / 2 + i * W / n, 0.006, -D / 2], [-W / 2 + i * W / n, 0.006, D / 2]]));
  for (let j = 1; j < 5; j++) { const z = -D / 2 + j * D / 5 + (j % 2) * 0.35; g.add(inkLine([[-W / 2, 0.006, z], [W / 2, 0.006, z]])); }
  return g;
}

// techo: plano + vigas (se quita con opts.techo=false). colgantes: tubos de luz colgados, siempre (dan primer plano a cenital y contrapicado).
function techo(root, W, D, H, vigas = 4) {
  const g = tag(new THREE.Group(), 'sala:techo'); root.add(g);
  put(g, O.fplane(W + 0.4, D + 0.4, 0.8), 0, H, 0, Math.PI / 2);
  for (let i = 0; i < vigas; i++) put(g, O.fbox(W + 0.4, 0.16, 0.2, 0.66, false, true), 0, H - 0.08, -D / 2 + (i + 0.5) * D / vigas);
  return g;
}
function colgantes(root, W, D, H) {
  const g = tag(new THREE.Group(), 'sala:colgantes'); root.add(g);
  for (const [x, z] of [[-W * 0.25, -D * 0.1], [W * 0.22, -D * 0.12], [0, D * 0.3]]) {
    put(g, O.fbox(1.3, 0.05, 0.22, 0.99, false, true), x, H - 0.55, z);
    for (const dx of [-0.55, 0.55]) g.add(inkLine([[x + dx, H - 0.55, z], [x + dx, H - 0.16, z]]));
  }
  return g;
}
// colocar un mueble y registrar sus asientos (posición donde va el ORIGEN de la persona sentada y hacia dónde mira)
function mueble(root, obj, x, z, ry, seats) {
  obj.position.set(x, 0, z); obj.rotation.y = ry; root.add(obj);
  const c = Math.cos(ry), s = Math.sin(ry);
  for (const a of obj.userData.asientos || []) seats.push({ i: seats.length, pos: [x + a.x * c + a.z * s, 0, z - a.x * s + a.z * c], rotY: ry + (a.rotY || 0), tipo: obj.name, grupo: obj.userData.grupo ?? obj.name });
  return obj;
}
// ruta de la mosca: función pura de t con periodo LOOP
function rutaMosca(c, t) { const u = TAU * t / O.LOOP; return [c[0] + 0.9 * Math.sin(2 * u + 0.4), c[1] + 0.22 * Math.sin(3 * u + 1) + 0.12 * Math.sin(5 * u), c[2] + 0.5 * Math.sin(u + 0.5)]; }
function moscaConRastro(c) {
  const g = tag(new THREE.Group(), 'sala:mosca'), m = O.mosca(), dots = []; g.add(m);
  for (let i = 1; i <= 14; i++) { const d = sphere(0.009 + 0.0004 * (14 - i), T.ink, { seg: 6, line: false, shadow: false }); g.add(d); dots.push(d); }
  g.userData.upd = (t) => {
    const p = rutaMosca(c, t), q = rutaMosca(c, t + 0.05); m.position.set(...p); m.rotation.y = Math.atan2(-(q[2] - p[2]), q[0] - p[0]);
    m.userData.alas.forEach((a, i) => { a.rotation.x = (i ? -1 : 1) * 0.6 * Math.sin(t * 90); });
    dots.forEach((d, i) => { if (i % 2) { d.visible = false; return; } d.visible = true; d.position.set(...rutaMosca(c, t - (i + 1) * 0.07)); });
  };
  return g;
}
// mueve el sol un poco (periodo LOOP)
function solQueSeMueve(cielo) { const s = cielo.userData.sun, s0 = cielo.userData.sun0; return (t) => { s.position.set(s0.x + 0.25 * Math.sin(TAU * t / O.LOOP), s0.y + 0.12 * Math.sin(TAU * t / O.LOOP + 1), s0.z); }; }

// ============================================================================ SALA PÚBLICA (consulta de médico de cabecera / salud mental)
// opts: disposicion 'v41' | 'enfrentadas' | 'pared' | 'pocas'; recepcion true/false; mood; hora.
export function salaPublica(root, o) {
  const W = 10, D = 10, H = 3.2, gr = 0.2, mood = o.mood || 'dia', seats = [], anclas = {};
  const recep = o.recepcion !== false;
  sueloBaldosas(root, W, D, { base: T.pale, alt: T.mid });
  if (o.techo !== false) techo(root, W, D, H);
  colgantes(root, W, D, H);
  // ---- muros
  const fondo = muro(W + 2 * gr, H, [{ s0: -4.6, s1: -1.6, y0: 1.0, y1: 3.0 }, ...(recep ? [{ s0: 2.6, s1: 4.6, y0: 1.05, y1: 2.1 }] : [])], { tono: T.light, zocaloTono: T.mid });
  const izq = muro(D, H, [{ s0: 0.925, s1: 1.875, y0: 0, y1: 2.1 }], { tono: T.light, shadow: false, zocaloTono: T.mid });
  const der = muro(D, H, [{ s0: 2.325, s1: 3.275, y0: 0, y1: 2.1 }], { tono: T.light, zocaloTono: T.mid });
  const frente = muro(W + 2 * gr, H, [], { shadow: false, tono: T.light, zocaloTono: T.mid });
  colocarMuro(fondo, 'fondo', W, D); colocarMuro(izq, 'izq', W, D); colocarMuro(der, 'der', W, D); colocarMuro(frente, 'frente', W, D);
  root.add(fondo, izq, der, frente);
  // ---- fondo: ventana, reloj, tablero, recepción
  put(fondo, O.ventana({ w: 3.0, h: 2.0, trav: -0.25 }), -3.1, 2.0, 0);
  put(fondo, O.reloj({ r: 0.3, largo: 0.85 }), -0.9, 2.5, 0.0);
  put(fondo, O.tablero({}), 0.9, 2.55, 0.0);
  put(fondo, O.aplique({}), 2.0, 2.0, 0.0); put(fondo, O.aplique({}), -5.0 + 0.3, 1.9, 0.0);
  if (recep) {
    const mc = tag(new THREE.Group(), 'sala:recepcion-marco'); fondo.add(mc);
    const f = (w, h, x, y) => put(mc, box(w, h, 0.07, T.dark), x, y, 0.035);
    f(2.4, 0.16, 3.6, 2.18); f(0.2, 1.3, 2.4, 1.55); f(0.2, 1.3, 4.8, 1.55);
    put(mc, box(0.9, 0.18, 0.04, T.paper), 3.6, 2.5, 0.02); for (const x of [3.35, 3.85]) put(mc, cyl(0.03, 0.03, 0.02, T.ink, { seg: 12, line: false }), x, 2.5, 0.045, Math.PI / 2);
    put(fondo, O.persiana({ w: 2.0, caida: 0.38 }), 3.6, 2.1, -0.03);
    put(fondo, O.telarana({ r: 0.4 }), 2.62, 2.08, 0.0);
    put(mc, box(2.0, 0.05, 0.4, T.light), 3.6, 1.025, -0.1);                        // repisa de la ventanilla
    put(fondo, O.trastienda({ w: 2.7, d: 1.6, h: 3.0 }), 3.6, 0, -0.2);
    put(fondo, O.cartel('nubes', { w: 0.45, h: 0.6 }), 1.55, 1.7, 0.0);
    mueble(root, O.mostrador({ w: 2.7, d: 0.7 }), 3.6, -4.65, 0, seats);
    const sil = O.silla({ tono: T.dark, brazos: true }); sil.name = 'sala:silla-recepcion'; sil.userData.grupo = 'recepcion';
    const tmp = []; mueble(root, sil, 3.6, -5.55, 0, tmp); anclas.recepcionista = { pos: [tmp[0].pos[0], 0, tmp[0].pos[2]], rotY: 0 };
    anclas.cliente_mostrador = { pos: [3.4, 0, -3.6], rotY: Math.PI }; anclas.cola_mostrador = { pos: [2.5, 0, -3.3], rotY: Math.PI };
  }
  // ---- pared izquierda (s = -z): puerta a las consultas, revistero, cartel, tablón
  const pc = O.puerta({ w: 0.95, h: 2.1, abierta: 0, piloto: true }); put(izq, pc, 1.4, 0, 0);
  put(izq, O.revistero({}), 3.55, 0.82, 0.0); put(izq, O.cartel('manos'), -3.5, 1.7, 0.0); put(izq, O.tablonAnuncios({}), -1.6, 1.6, 0.0); put(izq, O.aplique({}), 0.0, 2.2, 0.0);
  anclas.puerta_consultas = { pos: [-4.3, 0, -1.4], rotY: -Math.PI / 2 };
  // ---- pared derecha (s = z): entrada con la puerta entreabierta y la luz de fuera
  const pe = O.puerta({ w: 0.95, h: 2.1, abierta: 0.95, tono: T.mid, ventanita: true }); put(der, pe, 2.8, 0, 0);
  { const fu = tag(new THREE.Group(), 'sala:luz-de-la-calle'); der.add(fu); put(fu, O.fplane(1.1, 2.3, 0.97), 2.8, 1.1, -0.45); put(fu, box(1.2, 0.02, 0.9, T.light, { shadow: false }), 2.8, 0.01, 0.4); }
  put(der, O.cartel('sol'), -1.0, 1.75, 0.0); put(der, O.cartel('mapa'), 0.4, 1.75, 0.0); put(der, O.aplique({}), -3.0, 2.2, 0.0);
  anclas.entrada = { pos: [4.2, 0, 2.8], rotY: Math.PI / 2 };
  // ---- pared frontal
  put(frente, O.tablonAnuncios({ w: 1.1, h: 0.75, seed: 6 }), -3.0, 1.7, 0.0); put(frente, O.cartel('corazon'), 0.9, 1.7, 0.0); put(frente, O.cartel('arbol'), 2.0, 1.7, 0.0); put(frente, O.aplique({}), 0.0, 2.3, 0.0);
  // ---- fuera: cielo, sol, casas, paloma
  const cielo = O.cieloVentana({ mood, sun: [-18.2, 7.08, -34], sunR: 1.76, zc: -20, arbol: [-3.5, -9] }); root.add(cielo);
  const paloma = O.paloma(); put(root, paloma, -2.45, 1.0 + 0.05, -D / 2 - 0.25); paloma.scale.setScalar(1.15); paloma.rotation.y = 0;
  // ---- luz del sol en el suelo (mancha + sombras del marco) y polvo en el haz
  if (mood !== 'noche') {
    const cx = (z, x) => x + (z + 5) * 0.55;   // el haz cae hacia +x al avanzar en z
    root.add(O.luzSuelo([[-4.6, -4.9], [-1.6, -4.9], [cx(-1.8, -1.6), -1.8], [cx(-1.8, -4.6), -1.8]], [[[-3.13, -4.9], [-3.07, -4.9], [cx(-1.8, -3.07), -1.8], [cx(-1.8, -3.13), -1.8]]]));
    root.add(O.polvo({ x0: -3.8, x1: -0.6, y0: 0.4, y1: 2.6, z0: -4.2, z1: -0.8 }, 34, 2));
  }
  root.add(moscaConRastro([0.9, 2.15, -2.8]));
  // ---- mobiliario según la disposición
  const disp = o.disposicion || 'v41';
  const banco = (n, x, z, ry, extra = {}) => { const b = O.banco({ plazas: n, ...extra }); b.userData.grupo = 'banco-' + x.toFixed(1) + '/' + z.toFixed(1); return mueble(root, b, x, z, ry, seats); };
  const sillaS = (x, z, ry, extra = {}) => mueble(root, O.silla(extra), x, z, ry, seats);
  if (disp === 'v41') { banco(4, -1.0, -4.55, 0); banco(4, -2.2, -1.5, 0); banco(3, 2.4, -2.2, 0, { tono: T.mid }); sillaS(4.2, -0.2, -Math.PI / 2 + 0.3); sillaS(3.5, 1.4, -Math.PI / 2 - 0.2, { tono: T.dark }); put(root, O.mesaBaja({}), -2.2, 0, -0.2); }
  if (disp === 'enfrentadas') { banco(5, 0, -2.1, 0); banco(5, 0, 0.7, Math.PI); put(root, O.mesaBaja({}), 0, 0, -0.7); sillaS(-4.0, -3.5, 0.2); sillaS(3.6, -3.0, 0.0); }
  if (disp === 'pared') { for (let i = 0; i < 7; i++) sillaS(-4.2 + i * 0.66, -4.45, 0, { tono: i % 3 === 1 ? T.dark : T.mid }); for (let i = 0; i < 3; i++) sillaS(-4.6, -2.7 + i * 0.66 + 0.0, Math.PI / 2, { tono: T.mid }); put(root, O.mesaBaja({}), 0.4, 0, -3.2); }
  if (disp === 'pocas') { sillaS(-2.3, -1.2, 0.0); sillaS(-0.6, -0.6, -0.35, { tono: T.dark }); sillaS(1.2, -1.5, 0.25); const s = O.sillon({}); s.userData.grupo = 'sillon'; mueble(root, s, 3.3, -2.6, -0.2, seats); put(root, O.mesaBaja({}), 0.4, 0, -2.4); }
  // ---- fijos
  put(root, O.planta({ alto: 1.6, seed: 5, inclinar: -0.2 }), -4.45, 0, -4.25);
  put(root, O.planta({ alto: 1.1, seed: 9, hojas: 7 }), 3.8, 0, 4.3);
  const hz = tag(new THREE.Group(), 'sala:hoja-curiosa'); put(root, hz, -4.7, 1.78, -4.0); { const h = sphere(1, T.dark, { seg: 14, line: false }); h.scale.set(0.36, 0.02, 0.1); put(hz, h, -0.2, -0.2, 0.0, 0, 0.5, -0.5); }
  const dis = O.dispensadorAgua(); put(root, dis, -4.65, 0, 0.9); dis.rotation.y = Math.PI / 2;
  const per = O.perchero({}); put(root, per, 4.6, 0, 1.0); per.rotation.y = -Math.PI / 2;
  put(root, O.rinconNinos(), -3.1, 0, 3.2);
  root.add(mod('furniture-kit/trashcan', { h: 0.55 }, 4.7, 0, -2.9), mod('furniture-kit/pottedPlant', { h: 1.0 }, 1.35, 0, -4.5), mod('furniture-kit/lampRoundFloor', { h: 1.5 }, -4.7, 0, -2.4));
  root.add(mod('food-kit/cup-coffee', { h: 0.1 }, 3.0, 1.06, -4.5), mod('food-kit/mug', { h: 0.1 }, 4.1, 1.06, -4.45, 1), mod('food-kit/cup-tea', { h: 0.08 }, -2.0, 0.42, -0.05), mod('furniture-kit/books', { l: 0.3 }, -2.45, 0.42, -0.3, 0.4), mod('food-kit/soda-bottle', { h: 0.24 }, -2.3, 0.42, 0.1));
  tag(put(root, box(1.6, 0.02, 0.7, T.mid, { shadow: false }), 4.1, 0.012, 2.8), 'sala:felpudo');   // felpudo
  put(root, O.paraguasGoteando(), 4.65, 0, 3.9).rotation.y = -Math.PI / 2;
  put(root, O.cajaPerdidos(), 4.65, 0, -0.5).rotation.y = -Math.PI / 2;
  put(root, O.bolsa({}), 0.55, 0, 1.9).rotation.y = 0.5;
  anclas.enfriador = { pos: [-4.0, 0, 0.9], rotY: -Math.PI / 2 }; anclas.perchero = { pos: [3.9, 0, 1.0], rotY: Math.PI / 2 }; anclas.rincon_ninos = { pos: [-3.1, 0, 3.2], rotY: 0 };
  // ---- luces de noche
  const luces = [];
  if (mood === 'noche') { luces.push(lamp(-2.5, 2.3, -3.2, 9, 8), lamp(2, 2.3, -0.5, 9, 8), lamp(-3, 2.3, 2.5, 7, 8), lamp(3.6, 1.8, -5.6, 2, 5)); charco(root, -2.5, -3.0, 1.9); charco(root, 2, -0.5, 1.9); charco(root, -3, 2.5, 1.7); }
  else if (mood === 'tarde') luces.push(lamp(3.6, 1.8, -5.6, 2, 5));
  else luces.push(lamp(3.6, 1.8, -5.6, 1.6, 5));
  luces.forEach((l) => root.add(l));
  const anim = [solQueSeMueve(cielo)];
  // ---- cámaras (ancho 3:2 y su versión '-v' para 1080x1920)
  const cams = {
    'ancho-puerta': { pos: [4.5, 1.65, 1.7], look: [-1.5, 1.0, -2.6], fov: 56 },
    'v41': { pos: [0.1, 1.15, 2.6], look: [0.1, 0.65, -5], fov: 44 },
    'inverso-ventana': { pos: [-3.1, 1.4, -4.6], look: [0.2, -0.3, 5], fov: 46 },
    'recepcion-hombro': { pos: [2.45, 1.78, -2.55], look: [3.7, 1.4, -5.1], fov: 36 },
    'reloj': { pos: [-0.9, 2.1, -1.9], look: [-0.9, 2.0, -5], fov: 28 },
    'contrapicado-suelo': { pos: [0.9, 0.16, 3.0], look: [-0.5, 1.0, -3.0], fov: 62 },
    'cenital': { pos: [0.4, 10.5, 5.6], look: [0, 0.3, -1.2], fov: 56 },
    'ancho-puerta-v': { pos: [4.6, 1.6, 2.4], look: [-1.5, 1.0, -1.6], fov: 66 },
    'v41-v': { pos: [-0.2, 1.3, 0.9], look: [-0.5, 0.0, -5], fov: 64 },
    'inverso-ventana-v': { pos: [-3.0, 1.5, -4.5], look: [0.3, 0.2, 5], fov: 70 },
    'recepcion-hombro-v': { pos: [2.5, 1.8, -2.2], look: [3.7, 1.5, -5.1], fov: 50 },
    'reloj-v': { pos: [-0.9, 2.0, -2.0], look: [-0.9, 2.0, -5], fov: 40 },
    'contrapicado-suelo-v': { pos: [0.8, 0.16, 2.8], look: [-0.3, 1.0, -3.5], fov: 74 },
    'cenital-v': { pos: [0.2, 10.5, 5.4], look: [0, 0, -0.8], fov: 76 },
  };
  return { W, D, H, seats, anclas, cams, anim, tipo: 'publica' };
}

// ============================================================================ CONSULTA PRIVADA (rincón de sofá, luz cálida)
export function consultorio(root, o) {
  const W = 7, D = 7, H = 2.9, mood = o.mood || 'dia', seats = [], anclas = {};
  sueloTablones(root, W, D);
  if (o.techo !== false) techo(root, W, D, H, 3);
  colgantes(root, W, D, H);
  const fondo = muro(W + 0.4, H, [{ s0: -2.4, s1: -0.2, y0: 1.0, y1: 2.5 }], { tono: T.pale, zocalo: 0.9, zocaloTono: T.light });
  const izq = muro(D, H, [{ s0: -2.25, s1: -1.35, y0: 0, y1: 2.1 }], { tono: T.light, zocalo: 0.9, shadow: false, zocaloTono: T.mid });
  const der = muro(D, H, [], { tono: T.pale, zocalo: 0.9, zocaloTono: T.light });
  const frente = muro(W + 0.4, H, [], { shadow: false, zocalo: 0.9, zocaloTono: T.light });
  colocarMuro(fondo, 'fondo', W, D); colocarMuro(izq, 'izq', W, D); colocarMuro(der, 'der', W, D); colocarMuro(frente, 'frente', W, D);
  root.add(fondo, izq, der, frente);
  put(fondo, O.ventana({ w: 2.2, h: 1.5, cortinas: true }), -1.3, 1.75, 0);
  put(fondo, O.reloj({ r: 0.22, largo: 0.6 }), 1.1, 2.15, 0);
  put(fondo, O.cartel('sol', { w: 0.4, h: 0.56 }), 0.0, 1.7, 0.0);
  put(izq, O.puerta({ w: 0.9, h: 2.1, ventanita: false, tono: T.light }), -1.8, 0, 0);
  put(izq, O.cartel('nubes'), 0.7, 1.7, 0.0);
  put(der, O.cartel('mapa'), 0.2, 1.7, 0.0); put(der, O.aplique({}), 1.8, 2.0, 0.0); put(frente, O.cartel('arbol'), 0.0, 1.7, 0.0); put(frente, O.aplique({}), 1.5, 2.0, 0.0);
  const cielo = O.cieloVentana({ mood, sun: [-11.7, 6.4, -32], sunR: 1.1, zc: -20, arbol: [-1.6, -8] }); root.add(cielo);
  const paloma = O.paloma(); put(root, paloma, -1.3 + 0.7, 1.05, -D / 2 - 0.25); paloma.scale.setScalar(1.15);
  put(root, O.estanteria({ w: 1.3, h: 2.1 }), 2.4, 0, -D / 2 + 0.2);
  put(root, O.alfombra({ r: 1.5, tono: T.light }), -1.6, 0, -0.5);
  const sf = O.sofa({ plazas: 3 }); sf.userData.grupo = 'sofa'; mueble(root, sf, -2.95, -0.55, Math.PI / 2, seats);
  put(root, O.mesaBaja({}), -1.55, 0, -0.55).rotation.y = Math.PI / 2;
  put(root, O.lamparaMesa({}), -1.55, 0.42, -0.9);
  const sl = O.sillon({}); sl.userData.grupo = 'sillon'; mueble(root, sl, -0.2, -0.55, -Math.PI / 2, seats);
  const ch = O.silla({ tono: T.dark, brazos: true }); ch.userData.grupo = 'silla'; mueble(root, ch, -1.6, 1.25, Math.PI, seats);
  const ch2 = O.silla({ tono: T.mid }); ch2.userData.grupo = 'silla-extra'; mueble(root, ch2, 1.4, 0.8, -Math.PI / 2 - 0.4, seats);
  put(root, O.lamparaPie({}), -3.1, 0, -2.65);
  put(root, O.planta({ alto: 1.5, seed: 7 }), 2.95, 0, -2.9); put(root, O.planta({ alto: 1.0, seed: 3, hojas: 6 }), -3.0, 0, 3.0);
  root.add(mod('furniture-kit/sideTable', { h: 0.5 }, -3.1, 0, 1.0), mod('furniture-kit/lampRoundTable', { h: 0.4 }, -3.1, 0.5, 1.0), mod('furniture-kit/trashcan', { h: 0.5 }, 3.0, 0, 3.0), mod('food-kit/mug', { h: 0.1 }, -1.4, 0.42, -0.35, 2), mod('furniture-kit/books', { l: 0.28 }, -1.7, 0.42, -0.7, 0.3), mod('furniture-kit/plantSmall2', { h: 0.35 }, 2.7, 2.08, -3.3), mod('furniture-kit/radio', { l: 0.3 }, 2.1, 0.87, -3.3, 0.2));
  anclas.puerta = { pos: [-2.9, 0, 1.8], rotY: -Math.PI / 2 };
  root.add(moscaConRastro([1.2, 1.9, -1.5]));
  if (mood !== 'noche') root.add(O.polvo({ x0: -2.8, x1: -0.6, y0: 0.5, y1: 2.3, z0: -3.0, z1: -0.5 }, 24, 5));
  const luces = [lamp(-1.55, 1.2, -0.9, mood === 'noche' ? 8 : 1.8, 6), lamp(-3.1, 1.9, -2.65, mood === 'noche' ? 9 : 2.4, 7)];
  if (mood === 'noche') { luces.push(lamp(1.5, 2.4, 0.5, 6, 8)); charco(root, -1.55, -0.6, 1.5); charco(root, -3.0, -2.4, 1.4); charco(root, 1.5, 0.5, 1.4); }
  luces.forEach((l) => root.add(l));
  const anim = [solQueSeMueve(cielo)];
  const cams = {
    'ancho-puerta': { pos: [-2.6, 1.62, 3.0], look: [0.2, 1.0, -2.0], fov: 56 },
    'v41': { pos: [0.4, 1.3, 3.0], look: [-0.9, 1.25, -3.5], fov: 44 },
    'inverso-ventana': { pos: [-1.3, 1.5, -3.2], look: [-0.5, 1.0, 3.5], fov: 54 },
    'reloj': { pos: [1.1, 2.0, -1.4], look: [1.1, 2.0, -3.5], fov: 26 },
    'contrapicado-suelo': { pos: [0.6, 0.16, 2.4], look: [-1.5, 0.9, -1.0], fov: 62 },
    'cenital': { pos: [0, 11, 1.6], look: [0, 0, -0.3], fov: 42 },
    'ancho-puerta-v': { pos: [-2.4, 1.6, 3.1], look: [-0.4, 1.0, -1.8], fov: 64 },
    'v41-v': { pos: [1.2, 1.3, 2.4], look: [-1.8, 1.0, -0.6], fov: 62 },
    'inverso-ventana-v': { pos: [-1.3, 1.5, -3.2], look: [-0.5, 1.0, 3.5], fov: 76 },
    'reloj-v': { pos: [1.1, 2.0, -1.2], look: [1.1, 2.0, -3.5], fov: 40 },
    'contrapicado-suelo-v': { pos: [0.4, 0.16, 2.2], look: [-1.7, 0.9, -0.6], fov: 76 },
    'cenital-v': { pos: [0, 10.2, 1.3], look: [0, 0, -0.3], fov: 70 },
  };
  return { W, D, H, seats, anclas, cams, anim, tipo: 'consultorio' };
}
