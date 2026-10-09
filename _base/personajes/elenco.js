// GM personajes: el elenco. person(id, pose, opts) -> THREE.Group con los pies en y = 0, mirando a +z (misma firma que motor/maniqui.js).
//   opts: { emotion: 0..5 (densidad del garabato), resolved: bool (esfera limpia + espiral), hold: {R:'phone', L:'mug'}, lookAt:[x,y,z], h (altura en m),
//           phase (0..1: andar, correr, saludar, tocar), role:'a'|'b' (parejas), variant (otro garabato) }
// pet(id, pose, opts) -> mascota. duo(idA, idB, pose, opts) -> dos personas colocadas y en contacto (hug, give-object, hold-hands, talk).
import { THREE, TONE, tag, inkLine } from '../motor/gm3d.js';
import { buildRig, D, M, ell, box, cylm, between, lathe } from './rig.js';
import { POSES, POSE_NAMES } from './poses.js';
import { PROPS, PROP_NAMES, pram, leadLine, babyBundle, yarnBall, easel, table } from './props.js';
import { headFactory, scribble } from './cabeza.js';
import * as C from './ropa.js';
export { pet, PET_NAMES, PET_POSES } from './mascotas.js';
export { POSES, POSE_NAMES, PROP_NAMES, leadLine, easel, table };

// Orden de dibujo (para drawOn del motor): el hilo traza estas partes por este orden, luego entra el relleno de cada una.
export const DRAW_ORDER = ['cabeza', 'garabato', 'torso', 'caderas', 'brazoR', 'brazoL', 'manoR', 'manoL', 'piernaR', 'piernaL', 'zapatoR', 'zapatoL', 'ropa', 'pelo', 'objeto'];

const T = TONE;
const skinT = T.light;
// ------------------------------------------------------------------ el reparto
const DEFS = {
  chico: { desc: 'Adolescente baterista, delgado y alto; sudadera con bolsillo canguro, vaqueros, mochila grande, pelo de punta, zapatillas con talon naranja. SIN capucha.',
    body: { h: 1.74, age: 'teen', sex: 'm', build: .85 }, top: .5, hips: .5, sleeve: .5, bottom: .42, head: { hair: 'short', hairOpts: { tone: .16, spiky: true }, seed: 3 },
    dress(r) { const H = r.d.h; C.collar(r, 'round', .38); C.cuffs(r, .38, .035); C.band(r, 'hips', -.045 * H, .022 * H, .38, 1.03); C.pocket(r, 'hips', 0, .015, .2, .075, .38); C.trouserCuffs(r, .34);
      C.backpack(r, .62, { accent: true, pocket: .4, flap: .34 }); C.shoes(r, { kind: 'sneaker', tone: .86, sole: T.ink, accent: true }); } },
  vecina: { desc: 'Adulta redonda; cardigan oscuro largo, blusa clara, falda ancha plisada, moño alto, bailarinas. Cabeza con moño.',
    body: { h: 1.64, age: 'adult', sex: 'f', build: 1.12 }, top: .36, hips: .36, sleeve: .36, bottom: skinT, thigh: skinT, shin: skinT, head: { hair: 'bun', hairOpts: { tone: .2 }, seed: 5 },
    dress(r) { const H = r.d.h; C.collar(r, 'shirt', .92); C.buttons(r, 4, .115 * H, -.03 * H, T.light); C.cuffs(r, .26, .03); C.band(r, 'hips', -.045 * H, .022 * H, .26, 1.04);
      C.skirt(r, { len: .27 * H, rTop: r.d.hip * 1.04, rBot: r.d.hip * 2.2, tone: T.mid, pleats: 14 }); C.shoes(r, { kind: 'flat', tone: .3, sole: T.ink }); } },
  portero: { desc: 'Portero ancho; gorra con visera, chaqueta de trabajo con bolsillos y cremallera, pantalon oscuro con cinturon, botas, llavero naranja.',
    body: { h: 1.8, age: 'adult', sex: 'm', build: 1.22 }, top: .5, hips: .5, sleeve: .5, bottom: .36, head: { hair: 'cap', hairOpts: { tone: .3 }, seed: 7 },
    dress(r) { const H = r.d.h; C.collar(r, 'shirt', .56); C.zip(r, .13 * H, .0); C.zip(r, .088 * H, -.055 * H, 'hips'); C.cuffs(r, .3, .035); C.band(r, 'hips', -.055 * H, .03 * H, .28, 1.03);
      for (const sx of [-1, 1]) { C.pocket(r, 'chest', sx * .052, .095, .055, .05, .34); C.pocket(r, 'hips', sx * .062, -.012, .06, .062, .34); }
      C.belt(r, T.ink); C.trouserCuffs(r, .3); const k = ell(.011 * H, .017 * H, .008 * H, T.light, { accent: true, rings: false }); k.name = 'parte:ropa'; r.add('body', k, -.078 * H, .075 * H, r.surf('hips', -.078 * H, .075 * H) + .012 * H);
      C.shoes(r, { kind: 'work', tone: .2, sole: T.ink, cap: .34, boot: .22 }); } },
  nina: { desc: 'Nina de 7 anos; impermeable claro acampanado, mallas oscuras, botas de agua, coleta con goma naranja.',
    body: { h: 1.2, age: 'child', sex: 'f', build: 1 }, top: .78, hips: .78, sleeve: .78, bottom: .4, head: { hair: 'ponytail', hairOpts: { tone: .24 }, seed: 11 },
    dress(r) { const H = r.d.h; C.collar(r, 'round', .6); C.buttons(r, 3, .1 * H, -.02 * H, T.ink); C.cuffs(r, .6, .03); C.band(r, 'hips', -.06 * H, .02 * H, .6, 1.03);
      C.skirt(r, { len: .17 * H, rTop: r.d.hip * 1.04, rBot: r.d.hip * 1.85, tone: .78, depth: 1 }); C.shoes(r, { kind: 'wellie', tone: .5, sole: T.ink, boot: .5 }); } },
  abuelo: { desc: 'Abuelo encorvado; gorra plana, camisa clara con chaleco y tirantes, pantalon alto, bastón. Dueño del perro.',
    body: { h: 1.66, age: 'old', sex: 'm', build: 1.18, stoop: 9 }, top: .86, hips: .45, sleeve: .86, bottom: .45, head: { hair: 'flatcap', hairOpts: { tone: .5 }, seed: 13 },
    dress(r) { const H = r.d.h; C.collar(r, 'shirt', .72); C.cuffs(r, .78, .028); C.vest(r, .45, .0); C.braces(r, T.ink); C.belt(r, T.ink); C.trouserCuffs(r, .3); C.shoes(r, { kind: 'sneaker', tone: .26, sole: T.ink, cap: .26 }); } },
  abuela: { desc: 'Abuela; rizos grises, gafas de aro, chal sobre un vestido largo, zapatos planos. Dueña del gato.',
    body: { h: 1.52, age: 'old', sex: 'f', build: 1.05, stoop: 6 }, top: .42, hips: .42, sleeve: .42, bottom: skinT, thigh: skinT, shin: skinT, head: { hair: 'curls', hairOpts: { tone: .88 }, acc: ['glasses'], seed: 17 },
    dress(r) { const H = r.d.h; C.collar(r, 'round', .66); C.cuffs(r, .55, .028); C.skirt(r, { len: .3 * H, rTop: r.d.hip * 1.04, rBot: r.d.hip * 1.85, tone: .42, pleats: 0 }); C.shawl(r, .66, .3);
      const b = ell(.012 * H, .012 * H, .006 * H, T.light, { accent: true, rings: false }); b.name = 'parte:ropa'; r.add('spine', b, -.03 * H, r.parts.clen - .1 * H, r.surf('chest', -.03 * H, r.parts.clen - .1 * H) + .03 * H);
      C.shoes(r, { kind: 'flat', tone: .22, sole: T.ink }); } },
  'pareja-a': { desc: 'Pareja A: hombre muy alto con abrigo largo oscuro de cuello alto, gorro de lana con borla, botas. Siempre al lado de pareja-b.',
    body: { h: 1.9, age: 'adult', sex: 'm', build: 1.02 }, top: .4, hips: .4, sleeve: .4, bottom: .4, head: { hair: 'beanie', hairOpts: { tone: .55 }, seed: 19 },
    dress(r) { const H = r.d.h; C.collar(r, 'high', .24); C.buttons(r, 5, .125 * H, -.04 * H, T.light); C.cuffs(r, .3, .03); C.band(r, 'hips', -.05 * H, .02 * H, .3, 1.03);
      C.lapels(r, .5, .14, -.03); C.skirt(r, { len: .3 * H, rTop: r.d.hip * 1.06, rBot: r.d.hip * 1.6, tone: .4, depth: 1 }); C.shoes(r, { kind: 'boot', tone: .22, sole: T.ink, cap: .3 }); } },
  'pareja-b': { desc: 'Pareja B: mujer menuda con plumifero claro acolchado de cuello alto, pelo largo oscuro, mallas, botines y bolsa de tela al hombro.',
    body: { h: 1.6, age: 'adult', sex: 'f', build: .88 }, top: .8, hips: .8, sleeve: .8, bottom: .4, head: { hair: 'long', hairOpts: { tone: .17 }, seed: 23 },
    dress(r) { const H = r.d.h, cy = r.parts.clen; C.collar(r, 'high', .7); C.cuffs(r, .66, .035); C.stripesTorso(r, .6, -.03 * H, .15 * H, 4, 'chest', 1.045); C.stripesTorso(r, .6, -.05 * H, .0, 2, 'hips', 1.04);
      C.shoes(r, { kind: 'ankleboot', tone: .35, sole: T.ink, boot: .35 });
      const bag = box(.2 * H, .2 * H, .06 * H, T.pale, { edge: 20 }); bag.name = 'parte:ropa'; r.add('body', bag, -.125 * H, -.02 * H, .015 * H);
      const st = between([-.09 * H, .0, 0], [-.07 * H, cy - .01 * H, .01 * H], .02 * H, .006 * H, T.dark); st.name = 'parte:ropa'; r.J.spine.add(st);
      const st2 = between([-.07 * H, cy - .01 * H, .01 * H], [.07 * H, cy - .012 * H, .0], .02 * H, .006 * H, T.dark); st2.name = 'parte:ropa'; r.J.spine.add(st2);
      const st3 = between([.07 * H, cy - .012 * H, 0], [.08 * H, -.02 * H, -.02 * H], .02 * H, .006 * H, T.dark); st3.name = 'parte:ropa'; r.J.spine.add(st3); } },
  estudiante: { desc: 'Estudiante adolescente delgada; jersey ENORME claro con rayas y mangas que tapan las manos, mallas, zapatillas gordas blancas, auriculares al cuello.',
    body: { h: 1.62, age: 'teen', sex: 'f', build: .75 }, top: .84, hips: .84, sleeve: .84, bottom: .42, head: { hair: 'bob', hairOpts: { tone: .6 }, acc: ['headphonesNeck'], seed: 29 },
    dress(r) { const H = r.d.h; C.jumper(r, .84, 1.95, { band: .6 }); C.stripesTorso(r, .36, .02 * H, .13 * H, 3, 'chest', 2.0); C.shoes(r, { kind: 'sneaker', tone: .9, sole: .9, cap: .9 }); } },
  teletrabajo: { desc: 'Teletrabajador: camisa blanca con corbata ARRIBA y pijama de rayas ABAJO con zapatillas de conejo (humor).',
    body: { h: 1.76, age: 'adult', sex: 'm', build: 1.05 }, top: .92, hips: .62, sleeve: .92, bottom: .62, head: { hair: 'bald', hairOpts: { tone: .6 }, seed: 31 },
    dress(r) { const H = r.d.h, cy = r.parts.clen; C.collar(r, 'shirt', .97); C.cuffs(r, .85, .028); C.stripes(r, 'th', .3, 5); C.stripes(r, 'sn', .3, 4); C.stripesTorso(r, .3, -.05 * H, .0, 2, 'hips', 1.03); C.trouserCuffs(r, .5);
      const tie = between([0, cy - .015 * H, r.surf('chest', 0, cy - .015 * H) + .006 * H], [0, .02 * H, r.surf('chest', 0, .02 * H) + .008 * H], .026 * H, .006 * H, T.ink); tie.name = 'parte:ropa'; r.J.spine.add(tie);
      const kn = ell(.015 * H, .014 * H, .009 * H, T.ink, { rings: false }); kn.name = 'parte:ropa'; r.add('spine', kn, 0, cy - .014 * H, r.surf('chest', 0, cy - .014 * H) + .008 * H);
      C.shoes(r, { kind: 'slipper', tone: .9 }); } },
  'familia-bebe': { desc: 'Madre/padre con el bebe en canguro delante y cochecito (pose push-pram); jersey medio, vaqueros, pelo con raya al lado.',
    body: { h: 1.7, age: 'adult', sex: 'f', build: 1.05 }, top: .55, hips: .55, sleeve: .55, bottom: .45, head: { hair: 'swept', hairOpts: { tone: .45 }, seed: 37 },
    dress(r) { const H = r.d.h; C.collar(r, 'round', .4); C.cuffs(r, .4, .03); C.band(r, 'hips', -.05 * H, .02 * H, .4, 1.03); C.carrier(r, .62, (R) => scribble(R, 0, 91)); C.trouserCuffs(r, .4); C.shoes(r, { kind: 'sneaker', tone: .8, sole: T.ink }); } },
  recepcionista: { desc: 'Recepcionista; americana oscura ajustada, blusa clara, falda de tubo, pelo recogido bajo, auricular con micro, acreditacion con cordon.',
    body: { h: 1.68, age: 'adult', sex: 'f', build: .9 }, top: .42, hips: .42, sleeve: .42, bottom: skinT, thigh: skinT, shin: skinT, head: { hair: 'bunlow', hairOpts: { tone: .15 }, acc: ['headset'], seed: 41 },
    dress(r) { const H = r.d.h; C.collar(r, 'shirt', .93); C.buttons(r, 2, .06 * H, .0, T.light); C.cuffs(r, .3, .028); C.band(r, 'hips', -.05 * H, .02 * H, .3, 1.03); C.lapels(r, .6, .1, -.02); C.lanyard(r);
      C.skirt(r, { len: .24 * H, rTop: r.d.hip * 1.04, rBot: r.d.hip * 1.14, tone: .38, depth: 1 }); C.shoes(r, { kind: 'flat', tone: .18, sole: T.ink }); } },
  profesional: { desc: 'Profesional (coach o terapeuta); chaqueta larga oscura, camisa clara, pelo rizado oscuro y la BUFANDA NARANJA del v4.1.',
    body: { h: 1.76, age: 'adult', sex: 'n', build: 1 }, top: .42, hips: .42, sleeve: .42, bottom: .44, head: { hair: 'curls', hairOpts: { tone: .2, n: 18 }, seed: 43 },
    dress(r) { const H = r.d.h; C.collar(r, 'shirt', .93); C.buttons(r, 3, .1 * H, -.03 * H, T.light); C.cuffs(r, .24, .028); C.band(r, 'hips', -.05 * H, .02 * H, .22, 1.03);
      C.skirt(r, { len: .2 * H, rTop: r.d.hip * 1.05, rBot: r.d.hip * 1.3, tone: .42, depth: 1 }); C.lapels(r, .5, .12, -.03); C.trouserCuffs(r, .34); C.scarf(r, T.light, { accent: true }); C.shoes(r, { kind: 'flat', tone: .2, sole: T.ink }); } },
  panadera: { desc: 'Panadera; DELANTAL claro con peto y bolsillo + GORRO DE PANADERA alto y abombado. Blusa media, pantalon oscuro, zapatos planos.',
    body: { h: 1.64, age: 'adult', sex: 'f', build: 1.1 }, top: .56, hips: .5, sleeve: .56, bottom: .4, head: { hair: 'chef', hairOpts: { tone: .93 }, seed: 47 },
    dress(r) { const H = r.d.h; C.collar(r, 'round', .5); C.cuffs(r, .5, .03); C.apron(r, .93, { tie: .55, pocket: .72 }); C.trouserCuffs(r, .36); C.shoes(r, { kind: 'flat', tone: .24, sole: T.ink }); } },
  madre: { desc: 'Madre adulta; pelo recogido en COLETA BAJA con goma naranja (como nina) + JERSEY LARGO claro que llega a medio muslo, mallas, zapatillas.',
    body: { h: 1.66, age: 'adult', sex: 'f', build: 1.0 }, top: .74, hips: .74, sleeve: .74, bottom: .4, head: { hair: 'ponylow', hairOpts: { tone: .24 }, seed: 53 },
    dress(r) { const H = r.d.h; C.collar(r, 'turtle', .66); C.cuffs(r, .6, .03); C.skirt(r, { len: .2 * H, rTop: r.d.hip * 1.04, rBot: r.d.hip * 1.2, tone: .74, depth: 1 }); C.band(r, 'hips', -.15 * H, .02 * H, .56, 1.2);
      C.trouserCuffs(r, .36); C.shoes(r, { kind: 'sneaker', tone: .8, sole: T.ink }); } },
  viajera: { desc: 'Viajera; MOCHILA DE VIAJE enorme con rollo encima + GORRA CON VISERA clara; chaqueta media, pantalon, botas de monte.',
    body: { h: 1.66, age: 'adult', sex: 'f', build: .95 }, top: .62, hips: .5, sleeve: .62, bottom: .42, head: { hair: 'cap', hairOpts: { tone: .84, band: .5 }, seed: 59 },
    dress(r) { const H = r.d.h; C.collar(r, 'high', .5); C.zip(r, .13 * H, .0); C.cuffs(r, .5, .03); C.band(r, 'hips', -.05 * H, .02 * H, .45, 1.03); C.trouserCuffs(r, .34);
      C.travelPack(r, .66, { flap: .46, roll: .38, pocket: .38 }); C.shoes(r, { kind: 'boot', tone: .26, sole: T.ink, cap: .38, boot: .3 }); } },
  plantera: { desc: 'Plantera; SOMBRERO DE ALA ANCHA de paja + PETO de jardin con bolsillo sobre camisa clara; pantalon medio, botas.',
    body: { h: 1.62, age: 'adult', sex: 'f', build: 1.05 }, top: .9, hips: .46, sleeve: .9, bottom: .46, head: { hair: 'widebrim', hairOpts: { tone: .86 }, seed: 61 },
    dress(r) { const H = r.d.h; C.collar(r, 'shirt', .95); C.cuffs(r, .85, .03); C.bibOveralls(r, .46, { pocket: .6 }); C.trouserCuffs(r, .4); C.shoes(r, { kind: 'work', tone: .3, sole: T.ink, cap: .4, boot: .3 }); } },
  artista: { desc: 'Artista; BOINA ladeada + BATA larga clara manchada de pintura (alguna mancha NARANJA como acento); pantalon oscuro, zapatos planos.',
    body: { h: 1.7, age: 'adult', sex: 'n', build: .98 }, top: .88, hips: .88, sleeve: .88, bottom: .4, head: { hair: 'beret', hairOpts: { tone: .5 }, seed: 67 },
    dress(r) { const H = r.d.h; C.collar(r, 'shirt', .95); C.cuffs(r, .84, .03); C.skirt(r, { len: .24 * H, rTop: r.d.hip * 1.05, rBot: r.d.hip * 1.4, tone: .88, depth: 1 }); C.smockFront(r, .88, { pocket: .66, belt: .66 });
      const zc = r.surf('chest', 0, .02 * H), zh = r.surf('hips', 0, 0);
      C.stain(r, 'spine', -.05 * H, .06 * H, zc + .0 * H + .012 * H, .03 * H, true); C.stain(r, 'spine', .045 * H, .12 * H, r.surf('chest', .045 * H, .12 * H) + .006 * H, .02 * H, true);
      C.stain(r, 'body', .03 * H, -.04 * H, zh + .02 * H, .02 * H, false, .3); C.stain(r, 'shR', -.015 * H, -.1 * H, .028 * H, .022 * H, true); C.stain(r, 'elL', .02 * H, -.05 * H, .0, .012 * H, false);
      C.trouserCuffs(r, .34); C.shoes(r, { kind: 'flat', tone: .28, sole: T.ink }); } },
};
export const CAST = Object.fromEntries(Object.entries(DEFS).map(([k, v]) => [k, v.desc]));
export const CAST_IDS = Object.keys(DEFS);

// ------------------------------------------------------------------ objetos en mano: agarre por defecto y brazo que lo sostiene
const GRIP = { needle: 'grip-stick', phone: 'grip-phone', mug: 'grip-handle', cup: 'grip-handle', book: 'grip-book', bag: 'grip-handle', keys: 'grip-pinch', letter: 'grip-pinch', umbrella: 'grip-handle', sticks: 'grip-stick', cane: 'grip-handle', lead: 'grip-handle', wateringCan: 'grip-handle', brush: 'grip-stick' };
const AUTO_HOLD = { knit: { R: 'needle', L: 'needle' }, 'knit-sit': { R: 'needle', L: 'needle' }, paint: { R: 'brush' }, water: { R: 'wateringCan' } }; // objeto por defecto de la pose (si no se da opts.hold)
const sgn = (S) => (S === 'R' ? -1 : 1);
const HOLD_ARM = {
  phone: (S) => ({ to: (c) => c.anchor('eyes').add(c.v(sgn(S) * .07 * c.k, -.3 * c.k, .2 * c.k)), pole: [sgn(S) * .5, -1, -.4], roll: -62 }),
  mug: (S) => ({ to: (c) => c.anchor('front').add(c.v(sgn(S) * .12 * c.k, -.02 * c.k, .2 * c.k)), pole: [sgn(S) * .5, -1, -.3], roll: -25 }),
  book: (S) => ({ to: (c) => c.anchor('front').add(c.v(sgn(S) * .07 * c.k, .02 * c.k, .23 * c.k)), pole: [sgn(S), -1, -.3], roll: -15 }),
  keys: (S) => ({ to: (c) => c.anchor('sh' + S).add(c.v(0, -.27 * c.k, .24 * c.k)), pole: [sgn(S) * .5, -1, -.3], roll: -40 }),
  letter: (S) => ({ to: (c) => c.anchor('sh' + S).add(c.v(0, -.24 * c.k, .26 * c.k)), pole: [sgn(S) * .5, -1, -.3], roll: -40 }),
  umbrella: (S) => ({ to: (c) => c.anchor('sh' + S).add(c.v(sgn(S) * .04 * c.k, -.1 * c.k, .3 * c.k)), pole: [sgn(S) * .6, -1, -.2], roll: 0 }),
  sticks: (S) => ({ to: (c) => c.anchor('front').add(c.v(sgn(S) * .18 * c.k, -.1 * c.k, .26 * c.k)), pole: [sgn(S), -1, -.2], roll: 85 }),
  cane: (S) => ({ to: (c) => c.anchor('sh' + S).add(c.v(sgn(S) * .0 * c.k, -.46 * c.k, .17 * c.k)), pole: [sgn(S) * .5, -1, -.3], roll: 0 }),
  lead: (S) => ({ to: (c) => c.anchor('hip').add(c.v(sgn(S) * .2 * c.k, .02 * c.k, .2 * c.k)), pole: [sgn(S), -1, -.3], roll: 0 }),
};
const FREE_POSES = ['stand', 'walk', 'walk-0', 'walk-1', 'walk-2', 'walk-3', 'sit-chair', 'sit-sofa', 'sit-floor'];
const EMO_DEFAULT = { sad: 4, 'hands-on-head': 5, laugh: 1, 'peek-corner': 3, knock: 3, 'phone-look': 2, hug: 1, read: 1 };

function boxProp(k) { const g = new THREE.Group(); g.name = 'parte:objeto'; g.userData.prop = true;
  const b = box(.4 * k, .28 * k, .3 * k, T.light, { edge: 20 }); g.add(b); const t = box(.045 * k, .285 * k, .305 * k, T.mid, { edge: 20 }); g.add(t); return g; }

function applyPose(P, pose, o, extra) {
  const { rig, id } = P;
  const fn = POSES[pose] || POSES.stand; const spec = { ...fn({ ...o }) };
  const hold = o.hold || AUTO_HOLD[pose] || {}; const free = FREE_POSES.includes(pose);
  for (const S of ['R', 'L']) {
    let item = hold[S]; if (!item) continue; if (typeof item === 'object') item = item.prop;
    if (free && !spec['reach' + S] && HOLD_ARM[item]) { spec['reach' + S] = HOLD_ARM[item](S); delete spec['arm' + S]; if (item === 'phone') { spec.head = [12, 0, 0]; spec.neck = [8, 0, 0];
        // 10/10/2026: a phone in use is held with BOTH hands (the free one cradles it from the other side), like a real person reading it
        const O = S === 'R' ? 'L' : 'R';
        if (!hold[O] && !spec['reach' + O]) { spec['reach' + O] = { to: (c) => c.anchor('eyes').add(c.v(sgn(S) * .06 * c.k, -.37 * c.k, .23 * c.k)), pole: [sgn(O) * .5, -1, -.4], roll: 62 }; delete spec['arm' + O]; spec['hand' + O] = 'grip-phone'; } } }
    if (!free && !spec['reach' + S] && HOLD_ARM[item] && !(item === 'bag')) { /* la pose manda */ }
  }
  rig.pose(spec, { ...extra, other: extra.other, meet: extra.meet });
  // objetos en mano (se crean una sola vez tras colocar el brazo; asi el baston sabe cuanto mide)
  if (!P.held) { P.held = {}; for (const S of ['R', 'L']) { let item = hold[S]; if (!item) continue; let grip = GRIP[item];
      if (typeof item === 'object') { grip = item.grip || GRIP[item.prop]; item = item.prop; }
      const opts = item === 'cane' ? { len: Math.max(.4, rig.anchor('hand' + S).y) } : {}; const obj = PROPS[item](opts); rig.attach(obj, 'hand' + S, grip); P.held[S] = obj; }
    if (spec.pram && !P.pram) { P.pram = pram(); const k = rig.d.h / 1.7; P.pram.scale.setScalar(k); P.pram.position.set(0, 0, .62 * k); P.pram.userData.noGround = true; P.group.add(P.pram); }
    if (spec.carry === 'baby') { const k = rig.d.h / 1.7, b = babyBundle(k); b.position.set(-.07 * k, .06 * rig.d.h, rig.surf('chest', 0, .06 * rig.d.h) + .15 * k); rig.J.spine.add(b); P.box = b; }
    if (spec.carry === 'yarn') { const k = rig.d.h / 1.7, y = yarnBall(k), H = rig.d.h, zz = rig.surf('chest', 0, 0) + .24 * k, xx = .13 * k; y.position.set(xx, -.035 * H, zz); rig.J.spine.add(y);
      const th = inkLine([[.05 * k, .13 * H, zz + .02 * k], [.09 * k, .09 * H, zz + .03 * k], [xx - .01 * k, .03 * H, zz + .02 * k], [xx, -.02 * H, zz]]); th.name = 'parte:objeto'; th.userData.prop = true; rig.J.spine.add(th); P.box = y; }
    if (spec.carry === 'box') { const b = boxProp(rig.d.h / 1.7); b.position.set(0, .01, rig.surf('chest', 0, .05 * rig.d.h) + .2 * rig.d.h / 1.7); rig.J.spine.add(b); P.box = b; } }
  if (o.lookAt) { const hp = rig.anchor('head'), dv = new THREE.Vector3(...o.lookAt).sub(hp), yaw = Math.atan2(dv.x, dv.z) / D, pit = -Math.atan2(dv.y, Math.hypot(dv.x, dv.z)) / D;
    const by = (spec.rot?.[1] || 0), yy = Math.max(-70, Math.min(70, yaw - by)), pp = Math.max(-35, Math.min(35, pit));
    rig.J.neck.rotation.y += yy * .4 * D; rig.J.head.rotation.y += yy * .6 * D; rig.J.neck.rotation.x += pp * .4 * D; rig.J.head.rotation.x += pp * .6 * D; }
  P.group.userData.pose = pose; P.group.userData.seatY = rig.seatY();
}

export function person(id = 'chico', pose = 'stand', opts = {}) {
  const base = DEFS[id] || DEFS.chico; if (!DEFS[id]) console.warn('personajes: id desconocido', id, '-> chico');
  const def = { ...base, body: { ...base.body, h: opts.h ?? base.body.h }, skin: skinT };
  def.makeHead = headFactory(base.head);
  const rig = buildRig(def); base.dress(rig);
  const e = opts.emotion ?? EMO_DEFAULT[pose] ?? 2; rig.setHead({ emotion: e, resolved: !!opts.resolved, variant: opts.variant || 0 });
  const group = rig.root; tag(group, 'persona:' + id);
  const P = { rig, id, group };
  group.userData.rig = rig; group.userData.id = id;
  group.userData.repose = (pose2, o2 = {}, extra = {}) => applyPose(P, pose2, { ...opts, ...o2 }, extra);
  group.userData.setEmotion = (n, resolved = false) => rig.setHead({ emotion: n, resolved });
  applyPose(P, pose, opts, {});
  return group;
}

// ------------------------------------------------------------------ parejas en contacto
const DUO = {
  hug: { a: [0, 0, -.3], b: [0, Math.PI, .3] }, 'give-object': { a: [0, 0, -.45], b: [0, Math.PI, .45] }, talk: { a: [0, 0, -.55], b: [0, Math.PI, .55] },
  'hold-hands': { a: [-.28, 0, 0], b: [.28, 0, 0] },
};
// duo('pareja-a','pareja-b','hold-hands') ; duo('abuela','nina','give-object',{A:{hold:{R:'letter'}}})
export function duo(a, b, pose = 'hug', opts = {}) {
  const g = new THREE.Group(); g.name = 'duo:' + a + '+' + b;
  const L = DUO[pose] || DUO.talk, A = person(a, 'stand', { ...(opts.A || {}) }), B = person(b, 'stand', { ...(opts.B || {}) });
  A.position.set(L.a[0], 0, L.a[2]); A.rotation.y = L.a[1]; B.position.set(L.b[0], 0, L.b[2]); B.rotation.y = L.b[1]; g.add(A, B); g.updateMatrixWorld(true);
  const conv = (from, to, v) => to.worldToLocal(from.localToWorld(v.clone()));
  const mid = (n) => from2(A.userData.rig.anchor(n), B.userData.rig.anchor(n));
  const from2 = (pa, pb) => conv(A, g, pa).add(conv(B, g, pb)).multiplyScalar(.5);
  const meetG = from2(A.userData.rig.anchor('front'), B.userData.rig.anchor('front')).add(new THREE.Vector3(0, .0, 0));
  if (pose === 'hold-hands') meetG.set(0, Math.min(A.userData.rig.anchor('hip').y, B.userData.rig.anchor('hip').y) * .9, .04);
  void mid;
  for (const [P, Q, role] of [[A, B, 'a'], [B, A, 'b']]) {
    const R = Q.userData.rig, other = { backHigh: conv(Q, P, R.anchor('backHigh')), backLow: conv(Q, P, R.anchor('backLow')), front: conv(Q, P, R.anchor('front')), head: conv(Q, P, R.anchor('head')) };
    const meet = g.localToWorld(meetG.clone()); const meetP = P.worldToLocal(meet);
    P.userData.repose(pose, { role, ...(role === 'a' ? opts.A : opts.B) }, { other, meet: meetP });
  }
  return g;
}
