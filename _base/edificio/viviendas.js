// The homes of the GM building (owner: edificio agent): data (who lives where, what is in each room) + the builder.
// Item format: [functionName, u, v, rotDeg, options, y]  u = metres from the room's left wall, v = metres from the BACK wall towards the street,
// rot = degrees about y (0 faces the street/camera, 90 faces right, -90 faces left), y = height above floor ('top' = ceiling underside).
// Cast format: {id, pose, u, v, rot, y?, h?}  (people use ../motor/personas.js, so the characters agent's real people drop in).
import { THREE, TONE as T, modelo, box, block, cyl, plane, extrude, tag, inkLine, rng } from '../motor/gm3d.js';
import { person } from '../motor/personas.js';
import * as F from './muebles.js';
import { ADD } from './detalles.js';
import { D, WALL, SLAB, Y, CEIL } from './medidas.js';

const P = (...a) => a;
const _at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
// ---- a few local pieces used by one home each ----
function bakeryCounter(o = {}) {
  const g = F.G('mueble:mostrador-panaderia'), w = o.w ?? 3.2, r = rng(4);
  g.add(_at(box(w, 0.9, 0.7, T.dark), 0, 0.45, 0));
  g.add(_at(box(w, 0.04, 0.8, T.pale), 0, 0.92, 0.0));
  g.add(_at(box(w - 0.1, 0.42, 0.5, T.paper, { line: false }), 0, 1.15, 0.05));
  for (let i = 0; i < Math.round(w / 0.4); i++) { const l = F.G('pan'); const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 4, 10), box(1, 1, 1, T.light).material); m.rotation.z = Math.PI / 2; m.position.set(-w / 2 + 0.25 + i * 0.4, 1.0, 0.05 + (r() - 0.5) * 0.1); m.castShadow = true; g.add(m); }
  g.add(_at(box(0.3, 0.22, 0.25, T.ink), w / 2 - 0.3, 1.05, -0.05));       // till
  g.add(_at(box(w - 0.1, 0.03, 0.55, T.mid), 0, 1.38, 0.05));            // glass top
  return g;
}
function breadShelf(o = {}) {
  const g = F.G('mueble:estante-pan'), w = o.w ?? 1.8, r = rng(11);
  for (let i = 0; i < 4; i++) { g.add(_at(box(w, 0.04, 0.4, T.dark), 0, 0.3 + i * 0.5, 0)); for (let j = 0; j < 5; j++) { const m = F.G('pan'); const l = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), box(1, 1, 1, [T.light, T.mid, T.pale][(i + j) % 3]).material); l.scale.set(1.3, 0.8, 0.9); l.position.set(-w / 2 + 0.25 + j * (w - 0.4) / 4, 0.43 + i * 0.5, (r() - 0.5) * 0.1); l.castShadow = true; g.add(l); } }
  g.add(_at(box(0.04, 2.1, 0.4, T.dark), -w / 2, 1.05, 0)); g.add(_at(box(0.04, 2.1, 0.4, T.dark), w / 2, 1.05, 0));
  return g;
}
function oven(o = {}) {
  const g = F.G('mueble:horno-panaderia'); g.add(_at(box(1.8, 1.7, 0.9, T.dark), 0, 0.85, 0));
  g.add(_at(box(1.1, 0.7, 0.05, T.pale, { accent: true }), 0, 0.95, 0.46));       // glowing mouth of the oven (accent)
  g.add(_at(box(1.2, 0.8, 0.03, T.ink, { line: false }), 0, 0.95, 0.44));
  g.add(_at(box(0.3, 0.9, 0.3, T.ink), 0.6, 2.1, -0.2)); return g;
}
function keyBoard() { const g = F.G('objeto:llavero-pared'); g.add(_at(box(0.7, 0.5, 0.03, T.dark), 0, -0.25, 0)); for (let i = 0; i < 6; i++) g.add(_at(box(0.03, 0.1, 0.02, T.pale), -0.27 + i * 0.108, -0.2 - (i % 2) * 0.12, 0.03)); return g; }
function bikes(o = {}) { const g = F.G('objeto:bicis'); for (let i = 0; i < (o.n ?? 5); i++) { const b = F.bike({ tone: [T.dark, T.mid, T.ink, T.light][i % 4] }); b.rotation.y = (i % 2 ? 1 : -1) * 0.6; b.position.set(i * 0.62, 0, (i % 2) * 0.35); g.add(b); } return g; }
function wallMap(o = {}) { const g = F.G('objeto:mapa-pared'), w = o.w ?? 1.8, h = o.h ?? 1.1; g.add(_at(box(w, h, 0.03, T.paper), 0, -h / 2, 0)); const r = rng(6);
  for (let i = 0; i < 6; i++) { const e = extrude([[0, 0], [0.3 + r() * 0.3, 0.05], [0.35 + r() * 0.3, 0.3 + r() * 0.2], [0.05, 0.3]], 0.004, [T.mid, T.light, T.dark][i % 3], { line: false }); e.position.set(-w / 2 + 0.1 + (i % 3) * (w / 3.2), -h + 0.12 + Math.floor(i / 3) * 0.45, 0.02); g.add(e); }
  for (const [x, y] of [[-0.3, -0.4], [0.4, -0.6], [0.0, -0.8]]) { const p = F.G('chincheta'); const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), box(1, 1, 1, T.mid, { accent: true }).material); s.position.set(x, y, 0.04); g.add(s); } return g; }
function whiteboard() { const g = F.G('objeto:pizarra'); g.add(_at(box(1.5, 0.9, 0.03, T.ink), 0, -0.45, 0)); g.add(_at(box(1.42, 0.82, 0.02, T.paper, { line: false }), 0, -0.45, 0.02)); g.add(inkLine([[-0.6, -0.2, 0.035], [-0.1, -0.2, 0.035], [-0.1, -0.35, 0.035], [0.5, -0.35, 0.035], [0.5, -0.55, 0.035], [-0.4, -0.55, 0.035], [-0.4, -0.7, 0.035], [0.3, -0.7, 0.035]])); return g; }
function sorryDoor(o = {}) { const g = F.G('objeto:puerta-interior'); g.add(_at(box(0.95, 2.05, 0.06, T.dark), 0, 1.025, 0)); g.add(_at(box(0.1, 0.03, 0.05, T.pale), 0.35, 1.0, 0.05)); return g; }
function wallPlants(o = {}) { const g = F.G('objeto:plantas-colgantes'); for (let i = 0; i < 3; i++) { const p = F.plant({ size: 0.6, seed: i + 2, kind: 'leafy' }); p.position.set(i * 0.5 - 0.5, -0.0, 0.1); g.add(p); } return g; }
const KEN = 'modelos/kenney/';
function kenney(fn, o) { if (globalThis.__NOMODELS) return F.G('modelo:vacio'); const kind = fn[0] === 'k' ? 'furniture-kit' : 'food-kit'; return modelo(KEN + kind + '/' + fn.slice(2) + '.glb', { ...o }); }
const mm = (t, acc) => box(1, 1, 1, t, { accent: !!acc }).material;
// poster({shape:'bolt'|'star'|'wave', w, h, bg, fg, accent}) shapes only, hangs from its top edge
function poster(o = {}) { const g = F.G('objeto:poster'), w = o.w ?? 0.55, h = o.h ?? 0.75; g.add(_at(box(w, h, 0.02, o.bg ?? T.paper), 0, -h / 2, 0));
  const pts = { bolt: [[-0.1, 0.25], [0.08, 0.25], [0, 0.04], [0.14, 0.04], [-0.08, -0.28], [-0.02, -0.04], [-0.14, -0.04]], star: [[0, 0.28], [0.07, 0.08], [0.27, 0.08], [0.11, -0.05], [0.17, -0.25], [0, -0.12], [-0.17, -0.25], [-0.11, -0.05], [-0.27, 0.08], [-0.07, 0.08]], wave: [[-0.22, -0.1], [-0.12, 0.2], [0, -0.05], [0.12, 0.22], [0.22, -0.1], [0.12, -0.25], [-0.12, -0.25]] }[o.shape ?? 'bolt'];
  const e = extrude(pts.map(([x, y]) => [x * w / 0.55, y * h / 0.75]), 0.01, o.fg ?? T.ink, { accent: !!o.accent }); e.position.set(0, -h / 2, 0.015); g.add(e); return g; }
// cable({lines:[[[u,y,v],...]]}) floor cables in ink, coordinates in the room's own u,y,v (item placed at 0,0)
function cable(o = {}) { const g = F.G('objeto:cables'); (o.lines || []).forEach((pts) => g.add(inkLine(pts.map(([u, y, vv]) => [u, y + 0.015, vv])))); return g; }
function duck() { const g = F.G('objeto:patito'); const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mm(T.pale, true)); b.scale.set(1.2, 0.9, 1); b.position.y = 0.05; g.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), b.material); h.position.set(0.04, 0.11, 0); g.add(h); return g; }
function flamingo() { const g = F.G('objeto:flamenco'); const m = mm(T.pale, true); const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), m); b.scale.set(1.2, 0.9, 0.7); b.position.y = 0.62; g.add(b); F.tube(g, [0, 0, 0], [0, 0.55, 0], 0.012, T.ink); F.tube(g, [0, 0.7, 0], [0.12, 1.05, 0], 0.02, T.pale); const h = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), m); h.position.set(0.14, 1.08, 0); g.add(h); F.tube(g, [0.18, 1.08, 0], [0.26, 1.04, 0], 0.012, T.ink); return g; }
function wateringCan() { const g = F.G('objeto:regadera'); g.add(inkLine([[0, 0, 0], [0, -0.55, 0]])); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 14), mm(T.mid)); c.position.y = -0.7; g.add(c); F.tube(g, [0.08, -0.72, 0], [0.3, -0.55, 0], 0.012, T.ink); return g; }
function puddle(o = {}) { const g = F.G('objeto:charco'); const c = new THREE.Mesh(new THREE.CylinderGeometry(o.r ?? 0.25, o.r ?? 0.25, 0.01, 18), mm(T.pale, true)); c.position.y = 0.006; g.add(c); return g; }
function bikePots() { const g = F.G('objeto:bici-macetas'); const b = F.bike({ tone: T.mid }); g.add(b); for (const [x, s] of [[0.42, 0.45], [0.5, 0.35]]) { const p = F.plant({ size: s }); p.position.set(x, 0.86, (x - 0.45) * 2); g.add(p); } return g; }

const X = { ...F, poster, cable, duck, flamingo, wateringCan, puddle, bikePots, bakeryCounter, breadShelf, oven, keyBoard, bikes, wallMap, whiteboard, sorryDoor, wallPlants };

// =============================================================================
// DATA
// =============================================================================
// styles: {wall, wain, pat:'stripes'|'bricks'|'plain', floor, fk:'planks'|'tiles'|'carpet'}
const R = (n, x0, w, style, items, extra = {}) => ({ n, x0, w, ...style, items, ...extra });
const st = (wall, wain, pat, floor, fk) => ({ wall, wain, pat, floor, fk });

export const HOMES = [
  // ---------------------------------------------------------------- ground floor
  { id: 'pb-portero', nombre: 'Piso del portero', s: 0, core: 'R', coreX: -4, shop: false,
    humor: 'Un tablero de llaves donde todas las llaves son iguales; la bici del portero cuelga del techo.',
    rooms: [
      R('taller', -11, 3.2, st(T.light, T.mid, 'plain', T.mid, 'planks'), [
        P('desk', 1.0, 0.7, 0, { w: 1.6, laptop: false }), P('toolbox', 1.9, 0.7, 0, {}, 0.76), P('shelf', 2.6, 0.3, 0, { w: 1.2 }, 1.6), P('boxes', 0.5, 0.45, 0, { n: 3 }), P('bucketMop', 0.45, 5.4, 0), P('broom', 2.9, 3.6, 90),
        P('keyBoard', 1.1, 0.15, 0, {}, 2.0), P('bike', 2.0, 4.3, 90, { tone: T.dark }, 0.0)], { win: [1.6] }),
      R('estar', -7.8, 3.8, st(T.pale, T.dark, 'stripes', T.dark, 'planks'), [
        P('armchair', 1.2, 3.4, 90, { tone: T.dark }), P('tv', 3.5, 3.4, -90, { w: 0.7 }), P('kitchen', 1.7, 0.4, 0, { w: 1.8, upper: false, tone: T.mid }), P('fridge', 3.2, 0.45, 0, { h: 1.2 }),
        P('table', 2.4, 4.8, 0, { w: 0.9, d: 0.6, round: true }), P('chair', 1.8, 4.8, 90), P('coatRack', 0.35, 6.0, 0), P('plant', 3.5, 5.7, 0, { size: 0.8 }), P('clock', 2.6, 0.2, 0, { r: 0.2 }, 2.0)],
        { win: [1.9] }) ],
    cast: [{ id: 'portero', pose: 'sit', room: 'estar', u: 1.2, v: 3.4, rot: 90, y: 0.05 }] },
  { id: 'pb-panaderia', nombre: 'Panaderia de la esquina', s: 0, core: 'L', coreX: 4, shop: true,
    humor: 'Una barra de pan mas alta que la panadera y una gaviota que espera fuera.',
    rooms: [
      R('tienda', 4, 7, st(T.pale, T.light, 'bricks', T.light, 'tiles'), [
        P('oven', 5.6, 0.7, 0, {}), P('breadShelf', 3.6, 0.35, 0, { w: 1.7 }), P('bakeryCounter', 3.0, 3.9, 0, { w: 3.0 }), P('table', 1.2, 5.3, 0, { w: 0.7, d: 0.7, h: 0.75, round: true }), P('stool', 0.7, 5.3, 0), P('stool', 1.7, 5.3, 0),
        P('mug', 1.2, 5.3, 0, {}, 0.77), P('plant', 6.5, 5.6, 0, { size: 1 }), P('clock', 2.4, 0.2, 0, { r: 0.25 }, 2.1), P('pendant', 3.0, 4.0, 0, { drop: 0.5 }, 'top'), P('pendant', 1.2, 5.3, 0, { drop: 0.9 }, 'top')], { win: [1.0, 2.9, 4.8], big: true }) ],
    cast: [{ id: 'panadera', pose: 'stand', room: 'tienda', u: 3.0, v: 2.7, rot: 0 }] },
  // ---------------------------------------------------------------- floor 1
  { id: 'p1-abuela', nombre: 'La abuela del gato', s: 1, core: 'R', coreX: -2.5, resident: 'abuela',
    humor: 'El gato duerme encima de la tele, y el ovillo de lana ha recorrido media casa.',
    rooms: [
      R('dormitorio', -11, 3.8, st(T.light, T.mid, 'stripes', T.dark, 'planks'), [
        P('bed', 1.2, 1.25, 0, { w: 1.3, l: 2, tone: T.light, blanket: T.mid }), P('nightstand', 2.3, 0.4, 0), P('lampTable', 2.3, 0.4, 0, {}, 0.55), P('wardrobe', 3.0, 0.5, 0, { w: 1.3 }),
        P('frame', 1.2, 0.2, 0, { w: 0.6, h: 0.5, art: 'hills' }, 2.0), P('rug', 1.3, 3.2, 0, { w: 2.2, d: 1.4, tone: T.pale, border: T.mid }), P('basket', 0.6, 4.6, 0), P('yarn', 1.6, 4.0, 30, { accent: true }), P('plant', 3.2, 5.6, 0, { size: 0.8 })]),
      R('salon', -7.2, 4.7, st(T.pale, T.mid, 'stripes', T.dark, 'planks'), [
        P('kitchen', 1.3, 0.4, 0, { w: 2.0, upper: true }), P('fridge', 2.75, 0.45, 0, { cat: false }), P('rug', 2.4, 3.8, 0, { w: 2.8, d: 1.9, tone: T.light, border: T.dark }),
        P('armchair', 1.7, 3.8, 90, { tone: T.mid, tall: true }), P('tv', 4.4, 3.8, -90, { w: 0.7 }), P('cat', 4.4, 3.8, 0, { pose: 'loaf', tone: T.dark }, 0.98),
        P('coffeeTable', 3.0, 3.8, 0, { w: 0.6, d: 0.6 }), P('bookshelf', 0.25, 5.4, 90, { w: 1.0, h: 1.9, seed: 2 }), P('frame', 0.8, 0.2, 0, { w: 0.4, h: 0.5, art: 'sun' }, 2.0), P('clock', 3.6, 0.2, 0, { r: 0.2 }, 2.1),
        P('plant', 4.1, 5.8, 0, { size: 0.9 }), P('lampFloor', 1.0, 2.2, 0, { shade: 'accent' }), P('yarn', 3.0, 2.6, 60, {}), P('pendant', 2.35, 3.0, 0, { drop: 0.5 }, 'top')]) ],
    cast: [{ id: 'abuela', pose: 'sit', room: 'salon', u: 1.7, v: 3.8, rot: 90, y: 0.1 }] },
  { id: 'p1-abuelo', nombre: 'El abuelo del perro', s: 1, core: 'L', coreX: 2.5, resident: 'abuelo',
    humor: 'El perro ocupa el mejor sillon y el abuelo juega al ajedrez contra si mismo.',
    rooms: [
      R('salon', 2.5, 4.7, st(T.mid, T.dark, 'plain', T.pale, 'tiles'), [
        P('kitchen', 3.0, 0.4, 0, { w: 1.8, upper: false, tone: T.dark }), P('fridge', 4.25, 0.45, 0, { h: 1.5 }), P('armchair', 1.4, 3.6, 90, { tone: T.ink, tall: true }), P('dog', 2.9, 4.8, 0, { pose: 'sleep', tone: T.light }),
        P('table', 3.4, 3.4, 0, { w: 0.9, d: 0.7, h: 0.7, round: true }), P('chessBoard', 3.4, 3.4, 0, {}, 0.72), P('chair', 3.4, 4.2, 180), P('rug', 3.0, 4.6, 0, { w: 3.0, d: 2.2, tone: T.dark, border: T.light }),
        P('bookshelf', 0.25, 5.4, 90, { w: 1.6, h: 2.1, seed: 5 }), P('clock', 1.7, 0.2, 0, { r: 0.22 }, 2.0), P('frame', 2.3, 0.2, 0, { w: 0.5, h: 0.4, art: 'hills' }, 1.9), P('recordPlayer', 4.3, 5.2, 0, {}, 0.0), P('plant', 4.3, 6.1, 0, { size: 0.8 }), P('newspaper', 3.1, 3.6, 0, {}, 0.72), P('pendant', 2.4, 3.0, 0, { drop: 0.5 }, 'top')]),
      R('dormitorio', 7.2, 3.8, st(T.light, T.mid, 'plain', T.mid, 'planks'), [
        P('bed', 2.4, 1.15, 0, { w: 1.2, l: 2, tone: T.dark, blanket: T.light }), P('nightstand', 1.4, 0.4, 0), P('radio', 1.4, 0.4, 0, {}, 0.55), P('wardrobe', 3.0, 0.5, 0, { w: 1.2 }), P('shoes', 0.7, 4.6, 0, { n: 2 }), P('frame', 2.4, 0.2, 0, { w: 0.7, h: 0.4, art: 'hills' }, 2.0), P('rug', 2.3, 3.2, 0, { w: 1.8, d: 1.2, tone: T.pale, border: T.dark })]) ],
    cast: [{ id: 'abuelo', pose: 'sit', room: 'salon', u: 1.4, v: 3.6, rot: 90, y: 0.1 }] },
  // ---------------------------------------------------------------- floor 2
  { id: 'p2-pareja', nombre: 'La pareja que acaba de mudarse', s: 2, core: 'R', coreX: -2.5, resident: 'pareja',
    humor: 'La estanteria sigue en su caja y la pareja ya discute como montarla.',
    rooms: [
      R('dormitorio', -11, 3.8, st(T.paper, T.light, 'plain', T.light, 'planks'), [
        P('bed', 1.5, 1.15, 0, { w: 1.6, l: 2, tone: T.mid, blanket: T.dark }), P('nightstand', 0.5, 0.4, 0), P('nightstand', 2.6, 0.4, 0), P('wardrobe', 3.1, 0.5, 0, { w: 1.3, tone: T.light }), P('boxes', 0.5, 4.6, 20, { n: 4 }), P('suitcase', 1.7, 4.2, 15), P('lampTable', 0.5, 0.4, 0, {}, 0.55), P('frame', 1.5, 0.2, 0, { w: 0.8, h: 0.5, art: 'sun' }, 2.0)]),
      R('salon', -7.2, 4.7, st(T.paper, T.pale, 'plain', T.light, 'planks'), [
        P('sofa', 2.3, 4.6, 0, { w: 2.2, tone: T.dark, cushion: 'accent' }), P('rug', 2.3, 3.6, 0, { w: 2.4, d: 1.7, tone: T.pale, border: T.mid, round: false }), P('coffeeTable', 2.3, 3.2, 0, { w: 1.0, d: 0.6 }),
        P('kitchen', 1.3, 0.4, 0, { w: 2.0, upper: true, tone: T.light }), P('table', 3.5, 1.4, 0, { w: 0.9, d: 0.9, round: true }), P('chair', 3.1, 1.4, 90), P('chair', 3.9, 1.4, -90), P('boxes', 0.4, 2.6, 0, { n: 2, seed: 8 }),
        P('plant', 4.2, 5.4, 0, { size: 1.2, kind: 'tall' }), P('plant', 0.35, 6.0, 0, { size: 0.7 }), P('lampFloor', 3.9, 4.0, 0, { shade: 'accent' }), P('frame', 3.4, 0.2, 0, { w: 0.5, h: 0.7, art: 'hills' }, 2.1), P('bookshelf', 4.4, 3.0, -90, { w: 0.9, h: 0.5, rows: 1, seed: 9 }), P('pendant', 2.35, 3.0, 0, { drop: 0.6, shade: 'accent' }, 'top')]) ],
    cast: [{ id: 'pareja', pose: 'sit', room: 'salon', u: 1.9, v: 4.6, rot: 0, y: 0.0 }, { id: 'pareja', pose: 'stand', room: 'salon', u: 3.3, v: 2.4, rot: -20 }] },
  { id: 'p2-estudiante', nombre: 'La estudiante', s: 2, core: 'L', coreX: 2.5, resident: 'estudiante',
    humor: 'Una torre de platos que desafia la gravedad y fideos instantaneos de cena.',
    rooms: [
      R('estudio', 2.5, 4.7, st(T.light, T.mid, 'plain', T.dark, 'planks'), [
        P('desk', 3.1, 0.7, 0, { w: 1.8, laptop: true }), P('officeChair', 3.1, 1.5, 180), P('dishTower', 3.9, 0.7, 0, {}, 0.76), P('bookshelf', 4.4, 3.4, -90, { w: 1.2, h: 1.6, seed: 12 }), P('laundryRack', 1.6, 5.4, 0, { n: 7 }), P('basket', 0.7, 3.8, 0),
        P('frame', 1.2, 0.2, 0, { w: 0.5, h: 0.7, art: 'kid' }, 2.2), P('frame', 2.0, 0.2, 0, { w: 0.4, h: 0.5, art: 'hills', tilt: 0.1 }, 2.0), P('lampTable', 2.4, 0.5, 0, {}, 0.76), P('plant', 0.4, 6.0, 0, { size: 0.6, kind: 'cactus' }), P('sofa', 1.4, 2.6, 90, { w: 1.6, tone: T.mid }), P('pendant', 2.35, 3.0, 0, {}, 'top')]),
      R('cuarto', 7.2, 3.8, st(T.pale, T.light, 'plain', T.mid, 'planks'), [
        P('mattress', 1.6, 1.4, 0, { w: 1.1, l: 2, blanket: T.dark }), P('suitcase', 3.0, 0.5, 0), P('wardrobe', 3.1, 0.4, 0, { w: 0.8, h: 1.7 }), P('basket', 0.5, 4.3, 0), P('frame', 1.6, 0.2, 0, { w: 0.6, h: 0.4, art: 'sun' }, 2.0), P('boxes', 3.0, 4.6, 0, { n: 2 })]) ],
    cast: [{ id: 'estudiante', pose: 'sit', room: 'estudio', u: 3.1, v: 1.5, rot: 180, y: 0.0 }] },
  // ---------------------------------------------------------------- floor 3
  { id: 'p3-nina', nombre: 'La familia de Nina', s: 3, core: 'R', coreX: -2.5, resident: 'nina',
    humor: 'El osito tiene su propio plato en la mesa y la bici de la nina duerme en el salon.',
    rooms: [
      R('cuarto-nina', -11, 3.8, st(T.pale, T.light, 'stripes', T.light, 'carpet'), [
        P('bed', 1.1, 1.25, 0, { w: 1.0, l: 1.9, tone: T.light, blanket: T.dark }), P('crib', 2.9, 0.8, 0, { mobile: false }), P('toyBlocks', 1.8, 4.0, 20), P('teddy', 2.4, 3.2, 0), P('toyBall', 0.7, 4.8, 0, { accent: true }), P('frame', 1.1, 0.2, 0, { w: 0.5, h: 0.4, art: 'kid' }, 2.0), P('frame', 2.6, 0.2, 0, { w: 0.5, h: 0.4, art: 'kid' }, 1.8), P('rug', 2.0, 3.6, 0, { w: 2.0, d: 1.6, tone: T.pale, border: T.dark, round: true }), P('bookshelf', 3.6, 3.3, -90, { w: 1.0, h: 1.1, rows: 3, seed: 14 })]),
      R('salon', -7.2, 4.7, st(T.pale, T.mid, 'stripes', T.mid, 'planks'), [
        P('kitchen', 1.3, 0.4, 0, { w: 2.0, upper: true, tone: T.light }), P('fridge', 2.75, 0.45, 0, {}), P('frame', 3.55, 0.2, 0, { w: 0.3, h: 0.4, art: 'kid' }, 1.8), P('table', 3.0, 3.2, 0, { w: 1.5, d: 0.9 }), P('chair', 2.5, 3.9, 0), P('chair', 3.5, 3.9, 0), P('chair', 2.5, 2.5, 180), P('chair', 3.5, 2.5, 180),
        P('teddy', 3.0, 2.5, 0, {}, 0.47), P('sofa', 0.8, 4.8, 90, { w: 1.9, tone: T.mid, cushion: 'accent' }), P('toyBlocks', 1.5, 3.3, 10), P('rug', 1.7, 4.2, 0, { w: 2.0, d: 1.6, tone: T.light, border: T.mid }), P('bike', 1.2, 1.9, 0, { tone: T.light }), P('plant', 4.3, 5.8, 0, { size: 1.0 }), P('pendant', 3.0, 3.2, 0, { drop: 0.6 }, 'top')]) ],
    cast: [{ id: 'nina', pose: 'stand', room: 'salon', u: 1.5, v: 3.7, rot: 0, h: 1.15 }, { id: 'madre', pose: 'stand', room: 'salon', u: 2.0, v: 1.6, rot: 20 }] },
  { id: 'p3-chico', nombre: 'El chico de la bateria', s: 3, core: 'L', coreX: 2.5, resident: 'chico', solid: [6.75],
    humor: 'Huevera en la pared como aislante acustico: no funciona. Un calcetin cuelga del platillo.',
    rooms: [
      R('cuarto', 2.5, 4.25, st(T.dark, T.ink, 'plain', T.mid, 'planks'), [
        P('drumKit', 2.7, 3.2, 0, {}), P('eggCartons', 0.6, 0.12, 0, { cols: 7, rows: 6 }, 0.9), P('mattress', 1.2, 1.2, 90, { w: 0.95, l: 1.9, blanket: T.mid }), P('guitar', 4.0, 1.0, 0, {}), P('shoes', 0.4, 5.6, 0, { n: 4 }), P('frame', 3.9, 0.2, 0, { w: 0.5, h: 0.7, art: 'sun', accent: true }, 2.3), P('frame', 3.3, 0.2, 0, { w: 0.4, h: 0.5, art: 'kid' }, 2.0), P('boxes', 3.4, 5.5, 0, { n: 2 }), P('lampFloor', 4.0, 5.3, 0, { shade: T.pale }), P('basket', 0.5, 4.2, 0), P('sorryDoor', 2.6, 0.2, 0, {}, 0.0)]) ],
    cast: [{ id: 'chico', pose: 'sit', room: 'cuarto', u: 2.7, v: 3.95, rot: 0, y: 0.05 }] },
  { id: 'p3-vecina', nombre: 'La vecina de la pared', s: 3, core: 'none', coreX: null, resident: 'vecina', solid: [6.75],
    humor: 'Pared compartida con el baterista: un cuadro torcido y tapones de oido en la taza.',
    rooms: [
      R('cuarto', 6.75, 4.25, st(T.paper, T.pale, 'plain', T.light, 'planks'), [
        P('armchair', 1.7, 3.6, 0, { tone: T.mid, tall: true, cushion: true }), P('lampFloor', 0.8, 3.7, 0, { shade: 'accent' }), P('bookshelf', 3.4, 0.3, 0, { w: 1.1, h: 2.0, seed: 21 }), P('bed', 3.2, 3.9, 0, { w: 1.2, l: 1.9, tone: T.light, blanket: T.mid }), P('frame', 0.8, 0.2, 0, { w: 0.6, h: 0.5, art: 'hills', tilt: 0.25 }, 2.2), P('plant', 0.4, 0.8, 0, { size: 1.0, kind: 'tall' }), P('rug', 1.7, 3.7, 0, { w: 1.8, d: 1.4, tone: T.pale, border: T.dark }), P('mug', 2.3, 3.7, 0, {}, 0.0), P('kitchen', 1.4, 0.4, 0, { w: 1.2, upper: false, tone: T.mid }), P('sorryDoor', 2.8, 0.2, 0, {}, 0.0), P('pendant', 2.1, 3.0, 0, { drop: 0.5 }, 'top')]) ],
    cast: [{ id: 'vecina', pose: 'sit', room: 'cuarto', u: 1.7, v: 3.6, rot: 0, y: 0.1 }] },
  // ---------------------------------------------------------------- floor 4
  { id: 'p4-teletrabajo', nombre: 'El teletrabajo', s: 4, core: 'R', coreX: -2.5, resident: 'teletrabajo',
    humor: 'Una planta se inclina hacia la camara y una camisa solo de cintura para arriba (la parte de la reunion).',
    rooms: [
      R('dormitorio', -11, 3.8, st(T.light, T.mid, 'plain', T.pale, 'planks'), [
        P('bed', 1.5, 1.2, 0, { w: 1.4, l: 2, tone: T.dark, blanket: T.light }), P('nightstand', 2.6, 0.4, 0), P('laundryRack', 3.0, 3.8, 0, { n: 6 }), P('wardrobe', 0.9, 4.6, 90, { w: 1.2 }), P('lampTable', 2.6, 0.4, 0, {}, 0.55)]),
      R('despacho', -7.2, 4.7, st(T.paper, T.light, 'plain', T.mid, 'planks'), [
        P('desk', 2.4, 0.9, 0, { w: 2.0, monitor: 2, laptop: false }), P('officeChair', 2.4, 1.7, 180), P('whiteboard', 0.95, 0.2, 0, {}, 2.0), P('bookshelf', 4.25, 3.0, -90, { w: 1.4, h: 1.9, seed: 33 }), P('plant', 3.6, 0.55, 0, { size: 1.0, kind: 'tall' }), P('kitchen', 2.5, 5.0, 0, { w: 1.5, upper: false }), P('lampTable', 1.5, 0.6, 0, {}, 0.76),
        P('rug', 2.3, 3.2, 0, { w: 2.0, d: 1.4, tone: T.light, border: T.mid }), P('basket', 0.5, 5.8, 0), P('coatRack', 4.3, 5.7, 0), P('pendant', 2.35, 3.0, 0, { drop: 0.5 }, 'top')]) ],
    cast: [{ id: 'teletrabajo', pose: 'sit', room: 'despacho', u: 2.4, v: 1.7, rot: 180, y: 0.0 }] },
  { id: 'p4-bebe', nombre: 'La familia del bebe', s: 4, core: 'L', coreX: 2.5, resident: 'familia-bebe',
    humor: 'Una torre de panales, un carrito aparcado en el salon y un movil de bolitas sobre la cuna.',
    rooms: [
      R('salon', 2.5, 4.7, st(T.pale, T.mid, 'stripes', T.light, 'planks'), [
        P('pram', 1.6, 3.4, 90, {}), P('sofa', 3.4, 4.8, 0, { w: 2.1, tone: T.dark, cushion: 'accent' }), P('rug', 3.0, 3.5, 0, { w: 2.4, d: 1.8, tone: T.light, border: T.dark }), P('kitchen', 3.2, 0.4, 0, { w: 2.0, upper: true, tone: T.mid }), P('fridge', 4.55, 0.45, 0, {}),
        P('laundryRack', 1.0, 0.8, 0, { n: 8 }), P('toyBlocks', 3.5, 3.2, 40), P('lampFloor', 0.45, 4.8, 0, { shade: T.paper }), P('plant', 4.4, 5.9, 0, { size: 0.8 }), P('frame', 2.0, 0.2, 0, { w: 0.4, h: 0.3, art: 'kid' }, 2.0), P('basket', 4.4, 2.5, 0), P('pendant', 3.0, 3.0, 0, {}, 'top')]),
      R('cuarto-bebe', 7.2, 3.8, st(T.light, T.pale, 'stripes', T.pale, 'carpet'), [
        P('crib', 1.9, 1.0, 0, { mobile: true }), P('bed', 2.8, 4.7, 90, { w: 1.5, l: 2, tone: T.mid, blanket: T.light }), P('dresser', 3.3, 0.45, 0, { w: 0.8 }), P('teddy', 0.6, 4.6, 0), P('rug', 1.8, 3.2, 0, { w: 1.8, d: 1.4, tone: T.light, border: T.mid, round: true }), P('frame', 1.9, 0.2, 0, { w: 0.5, h: 0.4, art: 'kid' }, 2.0)]) ],
    cast: [{ id: 'familia-bebe', pose: 'stand', room: 'salon', u: 2.4, v: 3.4, rot: 90 }] },
  // ---------------------------------------------------------------- floor 5
  { id: 'p5-viajera', nombre: 'La viajera', s: 5, core: 'R', coreX: -2.5, resident: 'viajera',
    humor: 'Un flamenco de peluche vigila el mapa y una maleta sigue sin deshacer desde 2019.',
    rooms: [
      R('dormitorio', -11, 3.8, st(T.light, T.mid, 'plain', T.mid, 'planks'), [
        P('bed', 1.5, 1.15, 0, { w: 1.4, l: 2, tone: T.pale, blanket: T.dark }), P('suitcase', 3.0, 4.0, 0), P('suitcase', 3.0, 4.35, 8, { tone: T.light }), P('nightstand', 2.6, 0.4, 0), P('globe', 2.6, 0.4, 0, {}, 0.55), P('plant', 0.5, 5.4, 0, { size: 1.0, kind: 'tall' }), P('frame', 1.5, 0.2, 0, { w: 0.7, h: 0.4, art: 'hills' }, 2.0)]),
      R('salon', -7.2, 4.7, st(T.mid, T.dark, 'plain', T.pale, 'planks'), [
        P('wallMap', 2.3, 0.2, 0, { w: 2.4, h: 1.3 }, 2.3), P('sofa', 1.9, 3.7, 0, { w: 1.9, tone: T.dark }), P('globe', 3.8, 2.0, 0, {}, 0.0), P('suitcase', 3.8, 3.2, 20, {}), P('boxes', 4.1, 5.0, 0, { n: 3 }), P('plant', 0.5, 0.7, 0, { size: 1.3, kind: 'jungle' }), P('plant', 4.3, 0.6, 0, { size: 0.9 }),
        P('kitchen', 3.4, 5.9, 0, { w: 1.6, upper: false }), P('rug', 2.0, 3.4, 0, { w: 2.2, d: 1.6, tone: T.light, border: T.dark }), P('coatRack', 0.5, 5.6, 0), P('pendant', 2.35, 3.0, 0, { drop: 0.5, shade: 'accent' }, 'top')]) ],
    cast: [{ id: 'viajera', pose: 'stand', room: 'salon', u: 3.1, v: 2.4, rot: -30 }] },
  { id: 'p5-plantera', nombre: 'La del jardin interior', s: 5, core: 'L', coreX: 2.5, resident: 'plantera',
    humor: 'La estanteria esta siendo devorada por la planta, y el regadera cuelga del techo.',
    rooms: [
      R('salon', 2.5, 4.7, st(T.paper, T.pale, 'plain', T.dark, 'planks'), [
        P('bookshelf', 3.8, 0.3, 0, { w: 1.4, h: 2.1, seed: 44 }), P('plant', 3.8, 0.6, 0, { size: 1.9, kind: 'jungle', seed: 9 }), P('plant', 1.0, 4.0, 0, { size: 1.3, kind: 'jungle', seed: 4 }), P('plant', 4.3, 4.5, 0, { size: 1.4, kind: 'tall' }), P('plant', 2.0, 0.6, 0, { size: 1.0 }), P('armchair', 2.4, 3.9, 0, { tone: T.light, tall: true }),
        P('coffeeTable', 3.2, 4.2, 0, {}), P('wallPlants', 1.7, 0.2, 0, {}, 1.8), P('rug', 2.4, 3.8, 0, { w: 2.6, d: 1.8, tone: T.light, border: T.mid, round: true }), P('pendant', 2.35, 3.0, 0, { drop: 0.6, shade: 'accent' }, 'top')]),
      R('cuarto', 7.2, 3.8, st(T.light, T.pale, 'stripes', T.mid, 'planks'), [
        P('bed', 1.6, 1.15, 0, { w: 1.4, l: 2, tone: T.dark, blanket: T.pale }), P('plant', 3.2, 0.7, 0, { size: 1.2, kind: 'tall' }), P('plant', 0.5, 3.0, 0, { size: 0.9, kind: 'jungle', seed: 12 }), P('nightstand', 2.7, 0.4, 0), P('shelf', 3.0, 0.2, 0, { w: 0.8 }, 1.6)]) ],
    cast: [{ id: 'plantera', pose: 'stand', room: 'salon', u: 3.0, v: 3.0, rot: 20 }] },
];

// ---- attic and basement spaces (no facade windows computed from them) ----
export const SPACES = [
  { id: 'atico-artista', nombre: 'El atico del artista', s: 6, kind: 'attic', humor: 'Un lienzo con un sol naranja demasiado grande para el marco y un charco de pintura.', rooms: [
    R('estudio', -11, 10, st(T.pale, T.light, 'plain', T.mid, 'planks'), [
      P('easel', 4.5, 3.2, 0, {}), P('mattress', 1.5, 2.0, 90, { w: 1.2, l: 2, blanket: T.mid }), P('boxes', 0.6, 5.2, 0, { n: 3 }), P('plant', 8.8, 5.8, 0, { size: 1.5, kind: 'tall' }), P('table', 7.2, 2.8, 0, { w: 1.4, d: 0.8 }), P('stool', 7.9, 3.6, 0), P('lampFloor', 3.0, 1.0, 0, { shade: T.paper, h: 1.3 }), P('rug', 5.5, 4.0, 0, { w: 2.8, d: 2.0, tone: T.light, border: T.dark }), P('frame', 7.0, 0.2, 0, { w: 0.9, h: 0.6, art: 'sun', accent: true }, 1.6), P('frame', 8.3, 0.2, 0, { w: 0.5, h: 0.5, art: 'hills' }, 1.4), P('frame', 2.2, 0.2, 0, { w: 0.5, h: 0.8, art: 'kid' }, 1.2)])],
    cast: [{ id: 'artista', pose: 'stand', room: 'estudio', u: 5.4, v: 3.0, rot: 25 }] },
  { id: 'atico-secadero', nombre: 'El secadero del atico', s: 6, kind: 'attic', humor: 'Una sabana colgada que pasa por fantasma y una paloma durmiendo en una caja.', rooms: [
    R('secadero', -1, 12, st(T.light, T.mid, 'bricks', T.mid, 'planks'), [
      P('boxes', 1.0, 1.0, 0, { n: 4 }), P('sofa', 3.0, 1.2, 0, { w: 1.8, tone: T.mid }), P('bike', 6.5, 1.0, 0, { tone: T.dark }), P('laundryRack', 8.5, 3.0, 0, { n: 8 }), P('basket', 10.0, 2.0, 0), P('suitcase', 11.0, 1.2, 0), P('plant', 5.0, 3.8, 0, { size: 0.9 }), P('lampFloor', 4.9, 1.3, 0, { shade: T.paper, h: 1.2 })])],
    cast: [] },
  { id: 'sotano-bicis', nombre: 'Bicicletero', s: -1, kind: 'basement', humor: 'Cuarenta bicis para diez familias, y una con la cesta llena de macetas.', rooms: [
    R('bicis', -11, 10, st(T.light, T.dark, 'plain', T.mid, 'tiles'), [
      P('bikes', 1.5, 3.0, 0, { n: 5 }), P('bikes', 1.2, 5.6, 0, { n: 6 }), P('bike', 9.0, 1.5, 0, { tone: T.light }), P('boxes', 9.2, 5.0, 0, { n: 3 }), P('lampFloor', 6.0, 0.8, 0, { shade: T.paper, h: 1.1 }), P('shelf', 4.0, 0.2, 0, { w: 1.5 }, 1.8)])],
    cast: [] },
  { id: 'sotano-lavanderia', nombre: 'Lavanderia comun', s: -1, kind: 'basement', humor: 'Una sola lavadora esta siempre ocupada, y hay un calcetin solitario sobre la secadora.', rooms: [
    R('lavanderia', -1, 12, st(T.pale, T.mid, 'bricks', T.light, 'tiles'), [
      P('washer', 1.5, 0.45, 0, {}), P('washer', 2.2, 0.45, 0, {}), P('washer', 2.9, 0.45, 0, { sock: false }), P('table', 5.2, 0.7, 0, { w: 1.6, d: 0.7 }), P('basket', 4.4, 1.2, 0), P('laundryRack', 7.0, 2.0, 0, { n: 8 }), P('laundryRack', 8.2, 3.5, 0, { n: 6 }), P('boxes', 10.8, 1.0, 0, { n: 2 }), P('plant', 11.0, 5.0, 0, { size: 0.7 }), P('pendant', 6.0, 3.0, 0, { drop: 0.5 }, 'top'), P('basket', 3.5, 3.5, 0)])],
    cast: [] },
];

// balconies: [room, window index] (the window becomes a balcony door with a small balcony outside)
const BAL = { 'p1-abuela': ['salon', 0], 'p2-pareja': ['salon', 1], 'p3-nina': ['salon', 1], 'p4-bebe': ['salon', 0], 'p5-viajera': ['salon', 1], 'p5-plantera': ['salon', 0], 'p2-estudiante': ['estudio', 1] };
HOMES.forEach((h) => { if (BAL[h.id]) h.balcony = { room: BAL[h.id][0], i: BAL[h.id][1] }; });
[...HOMES, ...SPACES].forEach((h) => { const a = ADD[h.id]; if (!a) return; h.rooms.forEach((r) => { if (a[r.n]) r.items.push(...a[r.n]); }); });
export const ALL = [...HOMES, ...SPACES];
// every Kenney model used (still.html preloads them)
export const MODELOS = [...new Set(ALL.flatMap((h) => h.rooms.flatMap((r) => r.items.filter((it) => it[0][1] === ':').map((it) => KEN + (it[0][0] === 'k' ? 'furniture-kit/' : 'food-kit/') + it[0].slice(2) + '.glb'))))];
export const CAST = ALL.flatMap((h) => h.cast.map((c) => ({ id: c.id, home: h.id })));

// =============================================================================
// BUILDER
// =============================================================================
const deg = (a) => a * Math.PI / 180;
export function roomCtx(h, r) { return { y0: Y(h.s), top: h.kind === 'attic' ? Y(6) + 3.6 : CEIL(h.s) }; }
function floorLines(g, r, y0, kind) {
  const w = r.w, z0 = -D + 0.15, z1 = -0.35, pts = [];
  if (kind === 'planks') { const step = 0.32; let dir = 1; for (let z = z0; z <= z1; z += step) { pts.push(dir > 0 ? [r.x0 + 0.1, y0 + 0.025, z] : [r.x0 + w - 0.1, y0 + 0.025, z]); pts.push(dir > 0 ? [r.x0 + w - 0.1, y0 + 0.025, z] : [r.x0 + 0.1, y0 + 0.025, z]); dir = -dir; } g.add(inkLine(pts)); }
  else if (kind === 'tiles') { const step = 0.55; let dir = 1; for (let z = z0; z <= z1; z += step) { pts.push(dir > 0 ? [r.x0 + 0.1, y0 + 0.025, z] : [r.x0 + w - 0.1, y0 + 0.025, z]); pts.push(dir > 0 ? [r.x0 + w - 0.1, y0 + 0.025, z] : [r.x0 + 0.1, y0 + 0.025, z]); dir = -dir; } g.add(inkLine(pts)); const p2 = []; dir = 1; for (let x = r.x0 + 0.1; x <= r.x0 + w - 0.1; x += step) { p2.push(dir > 0 ? [x, y0 + 0.025, z0] : [x, y0 + 0.025, z1]); p2.push(dir > 0 ? [x, y0 + 0.025, z1] : [x, y0 + 0.025, z0]); dir = -dir; } g.add(inkLine(p2)); }
}
function wallPattern(g, r, y0, top, z) {
  const pts = [], lo = y0 + (r.wain ? 1.05 : 0.1), hi = top - 0.08;
  if (r.pat === 'stripes') { let up = true; for (let x = r.x0 + 0.15; x < r.x0 + r.w - 0.1; x += 0.28) { pts.push([x, up ? lo : hi, z], [x, up ? hi : lo, z]); up = !up; } g.add(inkLine(pts)); }
  else if (r.pat === 'bricks') { let dir = 1; for (let y = y0 + 0.2; y < hi; y += 0.22) { pts.push(dir > 0 ? [r.x0 + 0.1, y, z] : [r.x0 + r.w - 0.1, y, z], dir > 0 ? [r.x0 + r.w - 0.1, y, z] : [r.x0 + 0.1, y, z]); dir = -dir; } g.add(inkLine(pts)); }
}
// buildHome(parent, home, opts) -> {group, rooms:{name:{group,x0,w,y0}}, people:[...]}
export function buildHome(parent, h, opts = {}) {
  const grp = tag(new THREE.Group(), 'vivienda:' + h.id); parent.add(grp);
  const y0 = Y(h.s), out = { group: grp, rooms: {}, y0 };
  const top = h.kind === 'attic' ? y0 + 3.6 : CEIL(h.s);
  const night = opts.mood === 'noche', r0 = rng(h.id.length * 7 + h.s);
  h.rooms.forEach((r, ri) => {
    const rg = tag(new THREE.Group(), `vivienda:${h.id}:${r.n}`); grp.add(rg);
    const cx = r.x0 + r.w / 2, cz = -D / 2 - WALL / 2 + 0.05, depth = D - WALL - 0.15;
    rg.add(block(cx, y0, cz, r.w, 0.02, depth, r.floor)); // floor finish
    floorLines(rg, r, y0, r.fk);
    if (h.kind === 'attic') { /* back wall low; roof slope is built by the structure */ rg.add(block(cx, y0, -D + 0.075, r.w, 1.1, 0.15, r.wall)); }
    else rg.add(block(cx, y0, -D + 0.075, r.w, top - y0, 0.15, r.wall));
    const wz = -D + 0.16;
    if (r.wain && h.kind !== 'attic') { rg.add(block(cx, y0, wz, r.w, 1.0, 0.03, r.wain, { line: false })); rg.add(block(cx, y0 + 1.0, wz + 0.01, r.w, 0.05, 0.05, T.ink)); }
    rg.add(block(cx, y0, wz + 0.01, r.w, 0.1, 0.04, T.ink, { line: false })); // skirting
    wallPattern(rg, r, y0, h.kind === 'attic' ? y0 + 1.1 : top, wz + 0.005);
    r.items.forEach(([fn, u, v, rot, o, yy]) => {
      const f = X[fn] || ((fn[1] === ':' && (fn[0] === 'k' || fn[0] === 'f')) ? ((oo) => kenney(fn, oo)) : null); if (!f) throw new Error('unknown item ' + fn);
      const g = f(o || {}); g.position.set(r.x0 + u, y0 + (yy === 'top' ? (top - y0) : (yy ?? 0)), -D + v); g.rotation.y = deg(rot || 0); rg.add(g);
    });
    if (night && ri === 0) { /* the first room of each home is the lit one */ }
    out.rooms[r.n] = { group: rg, x0: r.x0, w: r.w, y0, lit: ri === 0 };
  });
  // partitions between rooms of one home, outer walls, core wall with the door
  const xs = [...new Set(h.rooms.flatMap((r) => [r.x0, r.x0 + r.w]))].sort((a, b) => a - b);
  const wallAt = (x, gap) => {
    const hgt = top - y0, zA = -D, zB = -WALL;
    if (!gap) { grp.add(block(x, y0, (zA + zB) / 2, 0.14, hgt, zB - zA, T.light)); return; }
    const [g0, g1] = gap; grp.add(block(x, y0, (zA + g0) / 2, 0.14, hgt, g0 - zA, T.light)); grp.add(block(x, y0, (g1 + zB) / 2, 0.14, hgt, zB - g1, T.light));
    grp.add(block(x, y0 + 2.1, (g0 + g1) / 2, 0.14, hgt - 2.1, g1 - g0, T.light)); grp.add(block(x, y0, (g0 + g1) / 2, 0.15, 0.04, g1 - g0, T.dark, { line: false }));
  };
  if (h.kind !== 'attic') xs.forEach((x) => {
    if (Math.abs(Math.abs(x) - 11) < 0.01) return wallAt(x, null);                        // the building's outer wall
    if ((h.solid || []).some((s) => Math.abs(s - x) < 0.01)) return wallAt(x, null);      // shared wall between two flats
    if (h.coreX != null && Math.abs(h.coreX - x) < 0.01) return wallAt(x, [-D + 0.7, -D + 1.6]);   // front door onto the landing
    if (h.kind === 'basement') return wallAt(x, [-D + 2.2, -D + 3.2]);
    if (x === xs[0] || x === xs[xs.length - 1]) return wallAt(x, null);
    return wallAt(x, [-D + 2.3, -D + 3.2]);                                              // doorway between two rooms of the same home
  });
  // residents
  out.people = [];
  if (opts.residents !== false) {
    const seen = {};
    h.cast.forEach((c) => {
      const rm = out.rooms[c.room]; const p = person(c.id, c.pose, { ...(c.h ? { h: c.h } : {}), tone: c.tone ?? T.dark });
      seen[c.id] = (seen[c.id] || 0) + 1; p.name = 'residente:' + c.id + (seen[c.id] > 1 ? '#' + seen[c.id] : '');
      p.position.set(rm.x0 + c.u, rm.y0 + (c.y ?? 0), -D + c.v); p.rotation.y = deg(c.rot || 0); grp.add(p); out.people.push(p);
    });
  }
  return out;
}
export const roomsOf = (h) => h.rooms;
// window centres for the facade: [{x (world), w, h, sill, door}] for a home. Ground-floor shop gets one big shop window.
export function windowsOf(h) {
  const out = [];
  h.rooms.forEach((r) => {
    const list = r.win ?? (r.w > 4.5 ? [r.w * 0.27, r.w * 0.73] : [r.w / 2]);
    list.forEach((u, i) => out.push({ x: r.x0 + u, w: h.shop ? 1.7 : (r.n === 'estar' || r.n === 'taller' ? 1.1 : 1.1), h: h.shop ? 2.0 : 1.7, sill: h.shop ? 0.45 : 0.9, room: r.n, home: h.id, balcony: !!(h.balcony && r.n === h.balcony.room && i === h.balcony.i) }));
  });
  return out;
}
