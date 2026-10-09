// GM personajes: la cabeza (bola de garabato), el pelo como volumenes 3D, gorras, auriculares, gafas de aro.
// Origen de cada grupo = centro de la cabeza. R = radio de la bola. Sin cara: toda la emocion va por la densidad del garabato.
import { THREE, TONE, inkLine, rng } from '../motor/gm3d.js';
import { M, ell, box, cylm, torus, D } from './rig.js';

const LOOPS = [3, 5, 8, 12, 19, 30]; // trozos de ovillo por nivel 0..5 (cobertura ~20 % a >100 % de la esfera)
// ovillo de tinta GRUESA (tubos de ~0,05 R) que camina por la esfera y se sale un poco de ella. level 0..5.
// o.avoid: no pinta sobre la zona del pelo/gorra (arriba y detras) para que el pelo se lea encima.
export function scribble(R, level = 2, seed = 1, o = {}) {
  const g = new THREE.Group(), r = rng(seed * 977 + level * 31 + 5), lv = Math.max(0, Math.min(5, Math.round(level)));
  const tr = R * (.05 + lv * .002), CH = 26;
  let v = new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize();
  let t = new THREE.Vector3().crossVectors(v, new THREE.Vector3(0, 1, .3)).normalize();
  let om = 0, rad = 1.06;
  const hair = (p) => o.avoid && (p.y > .5 || (p.z < -.3 && p.y > -.35));
  const flush = (pts) => { if (pts.length >= 4) { const m = M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, tr, 5, false), .09, { line: false }); m.castShadow = false; g.add(m); } };
  for (let c = 0; c < LOOPS[lv]; c++) {
    let pts = [];
    for (let i = 0; i < CH; i++) {
      const a = .3; const nv = v.clone().multiplyScalar(Math.cos(a)).addScaledVector(t, Math.sin(a));
      const nt = t.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, -Math.sin(a)); v = nv.normalize(); t = nt.normalize();
      om = om * .8 + (r() - .5) * .9; t.applyAxisAngle(v, om).normalize();
      rad += (r() - .5) * .08; rad = Math.max(1.03, Math.min(1.2, rad));
      if (hair(v)) { flush(pts); pts = []; continue; }
      pts.push(new THREE.Vector3(v.x * R * rad, v.y * R * rad, v.z * R * rad));
    }
    flush(pts);
  }
  return g;
}
// espiral pequena encima de la cabeza: problema resuelto
export function spiral(R) {
  const pts = [];
  for (let i = 0; i <= 44; i++) { const t = i / 44, a = t * 2.4 * 2 * Math.PI, rr = .32 * R * (1 - .55 * t); pts.push(new THREE.Vector3(Math.cos(a) * rr, R * (1.32 + t * .95), Math.sin(a) * rr)); }
  const m = M(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, R * .035, 5, false), .09, { line: false }); m.castShadow = false; return m;
}
const shell = (r, thetaLen, tone, o = {}) => { const m = M(new THREE.SphereGeometry(r, 26, 16, 0, Math.PI * 2, 0, thetaLen), tone, { line: true, edge: 60, ...o }); return m; };
// pelo que deja libre la cara (el garabato se ve): tapa superior + casco trasero (solo z < 0)
const hairShell = (R, t, top = .34, back = .72, tilt = .25, k = 1.07) => { const g = new THREE.Group();
  g.add(shell(R * k, Math.PI * top, t));
  g.add(M(new THREE.SphereGeometry(R * k * 1.003, 26, 16, Math.PI, Math.PI, 0, Math.PI * back), t, { line: true, edge: 60 })); g.rotation.x = -tilt; return g; };
const at = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; };

// ---- pelo y tocados (cada uno devuelve un Group en el marco de la cabeza) ----
export const HAIR = {
  bun(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? .22;
    g.add(hairShell(R, t, .36, .72, .3));
    g.add(at(ell(.46 * R, .42 * R, .46 * R, t, { line: true, edge: 20 }), 0, 1.02 * R, -.55 * R));
    g.add(at(torus(.42 * R, .05 * R, o.band ?? TONE.mid, { accent: !!o.accentBand }), 0, .72 * R, -.53 * R, Math.PI / 2 - .4, 0, 0));
    return g; },
  short(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? .2;
    g.add(hairShell(R, t, .4, .6, .2));
    for (const sx of [-1, 1]) g.add(at(ell(.2 * R, .42 * R, .5 * R, t), sx * 1.0 * R, .18 * R, -.1 * R));
    if (o.spiky) for (let i = 0; i < 7; i++) { const a = -1.2 + i * .4; const c = M(new THREE.ConeGeometry(.2 * R, .55 * R, 5), t, { line: true, edge: 30 }); c.position.set(Math.sin(a) * .7 * R, (1.0 + .08 * Math.cos(i * 2)) * R, Math.cos(a) * .25 * R - .1 * R); c.rotation.set(0, 0, -a * .5); g.add(c); }
    return g; },
  swept(R, o = {}) { const g = HAIR.short(R, { tone: o.tone ?? .3 });
    g.add(at(ell(.62 * R, .22 * R, .7 * R, o.tone ?? .3, { line: true, edge: 25 }), .25 * R, .93 * R, .38 * R, .25, 0, -.35)); return g; },
  cap(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? TONE.dark; // gorra con visera
    g.add(at(shell(R * 1.1, Math.PI * .4, t), 0, .02 * R, 0, .05, 0, 0));
    g.add(at(cylm(1.06 * R, 1.08 * R, .09 * R, o.band ?? TONE.ink, { seg: 26 }), 0, .34 * R, 0));
    g.add(at(ell(.84 * R, .055 * R, .62 * R, t, { line: true, edge: 20 }), 0, .32 * R, 1.22 * R, .24, 0, 0));
    g.add(at(ell(.09 * R, .08 * R, .09 * R, TONE.ink), 0, 1.1 * R, 0)); return g; },
  flatcap(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? TONE.mid; // gorra plana de abuelo
    g.add(at(ell(1.22 * R, .5 * R, 1.24 * R, t, { line: true, edge: 25 }), 0, .66 * R, .12 * R, .16, 0, 0));
    g.add(at(cylm(1.08 * R, 1.1 * R, .12 * R, TONE.dark, { seg: 26 }), 0, .34 * R, 0));
    g.add(at(ell(.75 * R, .06 * R, .5 * R, TONE.dark, { line: true, edge: 20 }), 0, .34 * R, 1.08 * R, .1, 0, 0));
    g.add(at(ell(.1 * R, .08 * R, .1 * R, TONE.ink), .15 * R, 1.1 * R, .1 * R)); return g; },
  ponytail(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? .22;
    g.add(hairShell(R, t, .36, .7, .25));
    const base = new THREE.Group(); base.position.set(0, .55 * R, -1.02 * R); g.add(base);
    let parent = base; const L = [.7, .62, .5], W = [.3, .27, .2];
    for (let i = 0; i < 3; i++) { const seg = new THREE.Group(); seg.rotation.x = i === 0 ? .95 : -.5; seg.position.y = i === 0 ? 0 : -L[i - 1] * R; parent.add(seg);
      const c = ell(W[i] * R, L[i] * R * .62, W[i] * R, t, { line: true, edge: 15 }); c.position.y = -L[i] * R * .5; seg.add(c); parent = seg; }
    g.add(at(torus(.28 * R, .07 * R, TONE.light, { accent: true }), 0, .5 * R, -1.04 * R, .7, 0, 0));
    return g; },
  curls(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? TONE.pale, r = rng(41);
    const n = o.n ?? 22; for (let i = 0; i < n; i++) { const th = .12 + r() * 1.7, ph = r() * Math.PI * 2; if (Math.sin(ph) > 0 && th > .62) continue; // cara libre
      const m = M(new THREE.IcosahedronGeometry(.3 * R, 1), t, { line: true, edge: 18 }); m.position.set(Math.sin(th) * Math.cos(ph) * 1.0 * R, Math.cos(th) * 1.0 * R, Math.sin(th) * Math.sin(ph) * 1.0 * R); g.add(m); }
    return g; },
  bob(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? .45;
    g.add(hairShell(R, t, .4, .85, .12, 1.09));
    for (const sx of [-1, 1]) g.add(at(ell(.34 * R, .8 * R, .9 * R, t, { line: true, edge: 20 }), sx * .88 * R, -.28 * R, -.1 * R, 0, 0, sx * .12));
    return g; },
  long(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? .2;
    g.add(hairShell(R, t, .38, .82, .2, 1.08));
    g.add(at(ell(1.0 * R, 1.55 * R, .55 * R, t, { line: true, edge: 20 }), 0, -.75 * R, -.62 * R));
    for (const sx of [-1, 1]) g.add(at(ell(.3 * R, 1.1 * R, .55 * R, t, { line: true, edge: 20 }), sx * .92 * R, -.5 * R, -.15 * R));
    return g; },
  bunlow(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? .15;
    g.add(hairShell(R, t, .36, .8, .3));
    g.add(at(ell(.5 * R, .46 * R, .5 * R, t, { line: true, edge: 20 }), 0, -.15 * R, -1.02 * R)); return g; },
  bald(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? .6; // calvo con mechones peinados (humor)
    g.add(M(new THREE.SphereGeometry(R * 1.06, 26, 16, Math.PI, Math.PI, Math.PI * .22, Math.PI * .42), t, { line: true, edge: 60 }));
    for (const sx of [-1, 1]) g.add(at(ell(.2 * R, .3 * R, .45 * R, t, { line: true, edge: 20 }), sx * 1.0 * R, .12 * R, -.15 * R));
    for (let i = 0; i < 4; i++) { const pts = []; for (let k = 0; k <= 10; k++) { const a = -1.15 + k * .23; pts.push([Math.sin(a) * R * 1.04, R * (.68 + .05 * i + .05 * Math.cos(a * 1.5)), Math.cos(a) * R * .05 * 0 + (-.3 + i * .22) * R * Math.cos(a)]); } g.add(inkLine(pts)); }
    return g; },
  beanie(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? TONE.mid;
    g.add(at(shell(R * 1.12, Math.PI * .46, t), 0, .02 * R, 0, .05, 0, 0));
    g.add(at(cylm(1.12 * R, 1.14 * R, .2 * R, TONE.dark, { seg: 26 }), 0, .32 * R, 0));
    g.add(at(ell(.32 * R, .3 * R, .32 * R, TONE.pale, { line: true, edge: 18 }), 0, 1.18 * R, 0)); return g; },
  chef(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? .92; // gorro de panadera alto
    g.add(hairShell(R, .34, .3, .6, .2));
    g.add(at(cylm(1.04 * R, 1.08 * R, .22 * R, t, { seg: 26 }), 0, .52 * R, 0));
    g.add(at(cylm(.92 * R, 1.0 * R, 1.1 * R, t, { seg: 26 }), 0, 1.2 * R, 0));
    g.add(at(ell(1.3 * R, .7 * R, 1.3 * R, t, { line: true, edge: 25 }), 0, 1.95 * R, 0));
    g.add(at(cylm(1.06 * R, 1.08 * R, .06 * R, TONE.mid, { seg: 26 }), 0, .43 * R, 0)); return g; },
  widebrim(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? .86; // sombrero de ala ancha
    g.add(hairShell(R, .34, .3, .6, .2));
    g.add(at(ell(1.12 * R, .8 * R, 1.12 * R, t, { line: true, edge: 25 }), 0, .8 * R, 0));
    g.add(at(cylm(1.9 * R, 1.9 * R, .07 * R, t, { seg: 36 }), 0, .5 * R, 0, -.06, 0, 0));
    g.add(at(cylm(1.13 * R, 1.17 * R, .22 * R, o.band ?? TONE.dark, { seg: 28 }), 0, .62 * R, 0)); return g; },
  beret(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? .45; // boina ladeada
    g.add(hairShell(R, .32, .3, .6, .2));
    g.add(at(ell(1.3 * R, .42 * R, 1.25 * R, t, { line: true, edge: 25 }), .22 * R, .86 * R, -.02 * R, .1, 0, -.28));
    g.add(at(cylm(1.04 * R, 1.06 * R, .1 * R, t, { seg: 26 }), 0, .56 * R, 0, 0, 0, 0));
    g.add(at(ell(.07 * R, .1 * R, .07 * R, TONE.ink, { rings: false }), .3 * R, 1.3 * R, 0)); return g; },
  ponylow(R, o = {}) { const g = new THREE.Group(), t = o.tone ?? .24; // coleta baja con goma
    g.add(hairShell(R, .36, .7, .25));
    const base = new THREE.Group(); base.position.set(0, -.1 * R, -1.0 * R); g.add(base);
    let parent = base; const L = [.9, .8, .7], W = [.34, .3, .24];
    for (let i = 0; i < 3; i++) { const seg = new THREE.Group(); seg.rotation.x = i === 0 ? .6 : -.12; seg.position.y = i === 0 ? 0 : -L[i - 1] * R; parent.add(seg);
      const c = ell(W[i] * R, L[i] * R * .62, W[i] * R, t, { line: true, edge: 15 }); c.position.y = -L[i] * R * .5; seg.add(c); parent = seg; }
    g.add(at(torus(.28 * R, .07 * R, o.band ?? TONE.light, { accent: o.accent !== false }), 0, -.2 * R, -1.03 * R, 1.2, 0, 0));
    return g; },
  messy(R, o = {}) { const g = HAIR.short(R, { tone: .18, spiky: true });
    for (const [x, y, z, ry] of [[-.8, .9, -.2, .5], [.9, .85, .05, -.5], [0, .95, -.7, 0]]) { const c = M(new THREE.ConeGeometry(.2 * R, .75 * R, 5), .18, { line: true, edge: 30 }); c.position.set(x * R, y * R, z * R); c.rotation.set(-.3, 0, -x * .8); g.add(c); }
    return g; },
};
export const ACC = {
  glasses(R) { const g = new THREE.Group(); // dos aros finos delante: gafas de abuela
    for (const sx of [-1, 1]) g.add(at(torus(.3 * R, .04 * R, TONE.ink, { line: false }), sx * .42 * R, .08 * R, .98 * R));
    g.add(at(cylm(.03 * R, .03 * R, .24 * R, TONE.ink, { line: false }), 0, .12 * R, 1.0 * R, 0, 0, Math.PI / 2)); return g; },
  headphonesNeck(R, o = {}) { const g = new THREE.Group(); // alrededor del cuello: se cuelga del cuello, no de la cabeza
    g.add(at(torus(.95 * R, .1 * R, TONE.ink, { line: false }), 0, -1.5 * R, .1 * R, Math.PI / 2 - .35, 0, 0));
    for (const sx of [-1, 1]) g.add(at(cylm(.4 * R, .4 * R, .22 * R, TONE.ink, { seg: 18 }), sx * .95 * R, -1.95 * R, .55 * R, 0, 0, Math.PI / 2));
    return g; },
  headset(R) { const g = new THREE.Group(); // recepcionista: auricular con microfono
    g.add(at(torus(1.05 * R, .05 * R, TONE.ink, { line: false, arc: Math.PI }), 0, .02 * R, -.06 * R));
    g.add(at(cylm(.3 * R, .3 * R, .2 * R, TONE.ink, { seg: 16 }), 1.05 * R, -.02 * R, -.06 * R, 0, 0, Math.PI / 2));
    g.add(at(box(.04 * R, .04 * R, .95 * R, TONE.ink, { line: false }), .98 * R, -.3 * R, .4 * R, 0, -.35, 0));
    g.add(at(ell(.13 * R, .13 * R, .13 * R, TONE.ink, { rings: false }), .55 * R, -.52 * R, .9 * R)); return g; },
  headphonesOn(R) { const g = new THREE.Group();
    g.add(at(torus(1.15 * R, .08 * R, TONE.ink, { line: false, arc: Math.PI }), 0, 0, 0));
    for (const sx of [-1, 1]) g.add(at(cylm(.42 * R, .42 * R, .24 * R, TONE.ink, { seg: 18 }), sx * 1.1 * R, 0, 0, 0, 0, Math.PI / 2)); return g; },
};

// fabrica de cabezas para un personaje: hair = nombre de HAIR (o funcion), acc = lista de ACC
export function headFactory({ hair, hairOpts = {}, acc = [], seed = 1, accOn = {}, hairFn = null }) {
  return (R, o = {}, rig) => {
    const g = new THREE.Group(); const e = Math.max(0, Math.min(5, o.emotion ?? 2));
    const core = ell(R, R, R, o.resolved ? .95 : .9 - e * .07, { rings: false, hull: R * .075 }); g.add(core);
    const sc = o.resolved ? spiral(R) : scribble(R, e, seed + (o.variant || 0), { avoid: !!(hair || hairFn) }); sc.name = 'parte:garabato'; g.add(sc);
    const hh = new THREE.Group(); hh.name = 'parte:pelo'; g.add(hh);
    if (hairFn) hh.add(hairFn(R)); else if (hair) hh.add(HAIR[hair](R, hairOpts));
    for (const a of acc) { const x = ACC[a](R); x.name = 'parte:ropa'; g.add(x); }
    return g;
  };
}
