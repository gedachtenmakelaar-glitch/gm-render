// GM personajes: biblioteca de poses. POSES[nombre](o) devuelve una especificacion de pose para rig.pose().
// Angulos en grados. f = adelante, a = separar del cuerpo (todo simetrico: R y L se escriben igual). Las manos/pies con IK usan
// 'reachR/L' {to: (c)=>punto, pole, roll} y 'footR/L'. c = {anchor(nombre), k (altura/1.7), v(x,y,z), other (para parejas)}.
// Todas funcionan desde cualquier angulo (la persona es 3D: gira el grupo). Con o.phase (0..1) andar/correr/saludar/llamar se animan.
const TAU = Math.PI * 2;
const A = (c, n, x = 0, y = 0, z = 0) => c.anchor(n).add(c.v(x * c.k, y * c.k, z * c.k));
const mx = Math.max;

// ciclo de andar/correr: phase 0..1; contactos en .25 y .75, pasos por el centro en 0 y .5
function gait(o, big, run) {
  const th = (o.phase ?? 0) * TAU, s = Math.sin(th), cc = Math.cos(th), hold = o.holdR || o.holdL;
  const sp = {
    legR: { f: big * s, a: 2 }, legL: { f: -big * s, a: 2 },
    kneeR: (run ? 22 : 5) + (run ? 95 : 48) * mx(0, cc), kneeL: (run ? 22 : 5) + (run ? 95 : 48) * mx(0, -cc),
    ankR: 8 * mx(0, s) - 8 * mx(0, -s), ankL: 8 * mx(0, -s) - 8 * mx(0, s),
    armR: { f: -(run ? 50 : 26) * s, a: 5 }, armL: { f: (run ? 50 : 26) * s, a: 5 },
    elbR: (run ? 88 : 16) + (run ? 8 : 14) * mx(0, -s), elbL: (run ? 88 : 16) + (run ? 8 : 14) * mx(0, s),
    spine: [run ? 13 : 3, -6 * s * (run ? 1.6 : 1), 0], neck: [run ? -8 : -2, 5 * s, 0], head: [0, 0, 0], rot: [0, 0, 0],
    handR: run ? 'fist' : 'relaxed', handL: run ? 'fist' : 'relaxed', lift: run ? .05 * (1 - Math.abs(s)) : 0,
  };
  if (o.holdR) { sp.armR = { f: 14, a: 6 }; sp.elbR = 36; } if (o.holdL) { sp.armL = { f: 14, a: 6 }; sp.elbL = 36; }
  void hold; return sp;
}

export const POSES = {
  stand: (o) => { const p = o.phase == null ? null : o.phase * TAU, b = p == null ? 0 : Math.sin(p), c = p == null ? 0 : Math.cos(p); // respiracion + balanceo (bucle cerrado)
    return { armR: { f: 3 + 1.5 * b, a: 6 + c }, elbR: 10 + 2 * b, armL: { f: -2 - 1.5 * b, a: 7 - c }, elbL: 8 - 2 * b, legR: { f: 2, a: 2 }, kneeR: 4, legL: { f: -3, a: 3 }, kneeL: 3, spine: [1 + .9 * b, 2 + 1.2 * c, 0], head: [0, 1.5 * c, 2 + .8 * b], ankR: 0, ankL: 0 }; },
  walk: (o) => gait(o, 30, false),
  run: (o) => gait(o, 50, true),
  'sit-chair': (o) => ({ legR: { f: 88, a: 3 }, legL: { f: 88, a: 3 }, kneeR: 92, kneeL: 92, spine: [o.lean ?? 3, 0, 0], neck: [0, 0, 0], armR: { f: 28, a: 6 }, armL: { f: 28, a: 6 }, elbR: 82, elbL: 82, wrR: [0, 0], head: [2, 0, 0] }),
  'sit-sofa': (o) => ({ rot: [-14, 0, 0], legR: { f: 80, a: 6 }, legL: { f: 80, a: 6 }, kneeR: 68, kneeL: 68, ankR: 8, ankL: 8, spine: [8, 0, 0], neck: [10, 0, 0], head: [-3, 0, 4], armR: { f: -8, a: 40, t: 0 }, elbR: 30, armL: { f: 30, a: 12 }, elbL: 70 }),
  'sit-floor': (o) => ({ legR: { f: 58, a: 52 }, legL: { f: 58, a: 52 }, kneeR: 128, kneeL: 128, ankR: -15, ankL: -15, spine: [6, 0, 0], armR: { f: 32, a: 10 }, armL: { f: 32, a: 10 }, elbR: 50, elbL: 50, head: [4, 0, 0] }),
  lie: (o) => ({ rot: [-90, 0, 0], legR: { f: 22, a: 5 }, legL: { f: 4, a: 5 }, kneeR: 40, kneeL: 8, armR: { f: 8, a: 14 }, armL: { f: 70, a: 25 }, elbL: 100, elbR: 8, head: [0, 0, 6] }),
  crouch: (o) => ({ legR: { f: 105, a: 14 }, legL: { f: 105, a: 14 }, kneeR: 138, kneeL: 138, ankR: 30, ankL: 30, spine: [30, 0, 0], neck: [-24, 0, 0], armR: { f: 50, a: 14 }, armL: { f: 50, a: 14 }, elbR: 50, elbL: 50 }),
  kneel: (o) => ({ legR: { f: 4, a: 3 }, legL: { f: 4, a: 3 }, kneeR: 100, kneeL: 100, ankR: -55, ankL: -55, spine: [5, 0, 0], armR: { f: 22, a: 6 }, armL: { f: 22, a: 6 }, elbR: 50, elbL: 50 }),
  knock: (o) => ({ spine: [6, 0, 0], head: [8, 0, 0], handR: 'fist', legR: { f: 2, a: 3 }, legL: { f: -3, a: 3 }, kneeR: 4,
    reachR: { to: (c) => A(c, 'shR', 0.0, 0.0, 0.5 + .04 * Math.sin((o.phase ?? 0) * TAU * 2)), pole: [-.4, -1, -.2], roll: 60 }, armL: { f: -3, a: 8 }, elbL: 12 }),
  wave: (o) => ({ spine: [0, 0, 0], head: [0, 8, 4], handR: 'wave', legR: { f: 2, a: 3 }, legL: { f: -3, a: 3 }, armL: { f: -2, a: 8 }, elbL: 10,
    reachR: { to: (c) => A(c, 'head', -.2, 0.05, .1), pole: [-1, -.4, -.2], roll: -75, wrist: [0, 22 * Math.sin((o.phase ?? 0) * TAU)] } }),
  point: (o) => ({ spine: [2, o.turn ?? 6, 0], head: [0, o.turn ?? 6, 0], handR: 'point', legR: { f: 3, a: 3 }, legL: { f: -3, a: 3 }, armL: { f: -2, a: 8 }, elbL: 10,
    reachR: { to: (c) => A(c, 'shR', -.1, -.02, .6), pole: [-.3, -1, -.2], roll: 0 } }),
  'arms-crossed': (o) => ({ armR: { f: 28, a: -4, t: 78 }, elbR: 122, armL: { f: 40, a: -4, t: 78 }, elbL: 126, handR: 'fist', handL: 'relaxed', legR: { f: 4, a: 4 }, legL: { f: -4, a: 7 }, kneeR: 6, spine: [2, 0, 0], head: [0, 0, 3] }),
  'hands-on-head': (o) => ({ spine: [8, 0, 0], neck: [6, 0, 0], head: [10, 0, 0], handR: 'open', handL: 'open', legR: { f: 3, a: 5 }, legL: { f: -3, a: 5 }, kneeR: 8, kneeL: 6,
    reachR: { to: (c) => A(c, 'head', -.14, .06, -.03), pole: [-1, -.2, -.5], roll: -100 }, reachL: { to: (c) => A(c, 'head', .14, .06, -.03), pole: [1, -.2, -.5], roll: -100 } }),
  shrug: (o) => ({ shoulders: .03, head: [0, 0, 5], neck: [0, 0, 0], armR: { f: 10, a: 32 }, elbR: 78, armL: { f: 10, a: 32 }, elbL: 78, wrR: [0, 0], handR: 'open', handL: 'open', legR: { f: 2, a: 3 }, legL: { f: -2, a: 4 }, spine: [0, 0, 0] }),
  'phone-look': (o) => ({ spine: [10, 0, 0], neck: [10, 0, 0], head: [14, 0, 0], handR: 'grip-phone', handL: 'relaxed', legR: { f: 3, a: 3 }, legL: { f: -3, a: 4 }, kneeR: 4,
    reachR: { to: (c) => A(c, 'eyes', -.07, -.3, .2), pole: [-.5, -1, -.4], roll: -62 }, armL: { f: 14, a: 6 }, elbL: 60 }),
  'phone-call': (o) => { const p = (o.phase ?? 0) * TAU; return ({ spine: [.8 * Math.sin(p), 2 * Math.sin(p), 0], head: [0, 2 * Math.sin(p + 1), -6 + 1.5 * Math.sin(p)], handR: 'grip-phone', handL: 'relaxed', legR: { f: 3, a: 3 }, legL: { f: -3, a: 4 },
    reachR: { to: (c) => A(c, 'earR', -.03, -.01, .0), pole: [-.5, -1, -.3], roll: 0 }, armL: { f: 2, a: 7 }, elbL: 12, wrR: [0, 0] }); },
  'carry-box': (o) => ({ spine: [-3, 0, 0], head: [4, 0, 0], handR: 'flat', handL: 'flat', legR: { f: 4, a: 3 }, legL: { f: -2, a: 4 }, carry: 'box',
    reachR: { to: (c) => A(c, 'front', -.17, -.02, .22), pole: [-1, -1, -.2], roll: -30 }, reachL: { to: (c) => A(c, 'front', .17, -.02, .22), pole: [1, -1, -.2], roll: -30 } }),
  laugh: (o) => ({ spine: [-9, 0, 0], neck: [-6, 0, 0], head: [-16, 0, 4], legR: { f: 4, a: 4 }, legL: { f: -2, a: 6 }, kneeR: 10, kneeL: 8, handR: 'open', handL: 'relaxed',
    reachR: { to: (c) => A(c, 'waist', -.1, -.05, .18), pole: [-1, -.6, -.2], roll: -20 }, armL: { f: 25, a: 20 }, elbL: 50, lift: 0 }),
  sad: (o) => ({ spine: [24, 0, 0], neck: [20, 0, 0], head: [16, 0, 3], shoulders: -.025, armR: { f: 10, a: 3 }, armL: { f: 10, a: 3 }, elbR: 14, elbL: 12, legR: { f: 2, a: 1 }, legL: { f: 0, a: 1 }, kneeR: 7, kneeL: 5 }),
  'stairs-up': (o) => {
    const ph = o.phase ?? 0, st = o.step ?? .18; return ph < .5 ? {
      dy: -.012, dz: .1, spine: [9, 0, 0], head: [-4, 0, 0], armR: { f: -14, a: 5 }, elbR: 24, armL: { f: 18, a: 5 }, elbL: 30,
      footR: { to: (c) => c.v(-c.d.hipHalf, c.d.ank + st, .3 * c.k), pole: [0, 0, 1] }, footL: { to: (c) => c.v(c.d.hipHalf, c.d.ank, -.06 * c.k), pole: [0, 0, 1] } } : {
      dy: st - .02, dz: .28, spine: [8, 0, 0], head: [-4, 0, 0], armR: { f: 12, a: 5 }, elbR: 26, armL: { f: -14, a: 5 }, elbL: 28,
      footR: { to: (c) => c.v(-c.d.hipHalf, c.d.ank + st, .3 * c.k), pole: [0, 0, 1] }, footL: { to: (c) => c.v(c.d.hipHalf, c.d.ank + st + .06, .1 * c.k), pole: [0, 0, 1], pitch: 15 } };
  },
  'lean-wall': (o) => { const L = (o.side || 'L') === 'L', s = L ? 1 : -1; return { rot: [0, 0, -s * 9], spine: [0, 0, -s * 3], head: [0, 0, s * 6],
    legR: { f: 6, a: -s * 8 + 3 }, legL: { f: -2, a: s * 8 + 3 }, kneeR: 8, armR: { f: 28, a: -4, t: 78 }, elbR: 122, armL: { f: 40, a: -4, t: 78 }, elbL: 126, handR: 'fist', wallSide: o.side || 'L' }; },
  'peek-corner': (o) => ({ rot: [0, -22, -14], spine: [4, 0, -8], neck: [4, -18, 8], head: [4, 0, 6], legR: { f: 3, a: 11 }, legL: { f: -5, a: 4 }, kneeR: 5, handL: 'flat', handR: 'relaxed',
    reachL: { to: (c) => A(c, 'shL', .1, -.05, .34), pole: [1, -.6, -.2], roll: 20 }, armR: { f: 4, a: 5 }, elbR: 20 }),
  read: (o) => { const p = (o.phase ?? 0) * TAU; return ({ spine: [6 + .8 * Math.sin(p), 0, 0], head: [20 + 1.5 * Math.sin(p), 2 * Math.sin(p + 1.5), 0], neck: [8, 0, 0], handR: 'grip-book', handL: 'flat', legR: { f: 3, a: 3 }, legL: { f: -3, a: 4 },
    reachR: { to: (c) => A(c, 'front', -.07, .02, .23), pole: [-1, -1, -.3], roll: -15 }, reachL: { to: (c) => A(c, 'front', .09, -.05, .19), pole: [1, -1, -.3], roll: -70 } }); },
  drink: (o) => ({ spine: [-2, 0, 0], head: [-10, 0, 0], handR: 'grip-handle', handL: 'relaxed', legR: { f: 3, a: 3 }, legL: { f: -3, a: 4 },
    reachR: { to: (c) => A(c, 'eyes', -.09, -.14, .12), pole: [-.5, -1, -.3], roll: -35 }, armL: { f: 18, a: 8 }, elbL: 70 }),
  drum: (o) => { const p = (o.phase ?? 0) * TAU; return { spine: [8, 0, 0], head: [14, 0, 0], handR: 'grip-stick', handL: 'grip-stick', legR: { f: 4, a: 7 }, legL: { f: -2, a: 7 }, kneeR: 8,
    reachR: { to: (c) => A(c, 'front', -.18, -.1 + .09 * mx(0, Math.sin(p)), .26), pole: [-1, -1, -.2], roll: 85 }, reachL: { to: (c) => A(c, 'front', .18, -.1 + .09 * mx(0, -Math.sin(p)), .26), pole: [1, -1, -.2], roll: 85 } }; },
  umbrella: (o) => ({ spine: [0, 0, 0], handR: 'grip-handle', handL: 'relaxed', legR: { f: 3, a: 3 }, legL: { f: -3, a: 4 }, head: [0, 0, 4],
    reachR: { to: (c) => A(c, 'shR', -.04, -.1, .3), pole: [-.6, -1, -.2], roll: 0 }, armL: { f: 2, a: 8 }, elbL: 14 }),
  'push-pram': (o) => { const p = o.phase ?? 0, s = Math.sin(p * TAU); return { spine: [10, 0, 0], head: [-6, 0, 0], handR: 'grip-handle', handL: 'grip-handle', pram: true,
    legR: { f: 22 * s, a: 2 }, legL: { f: -22 * s, a: 2 }, kneeR: 6 + 30 * mx(0, Math.cos(p * TAU)), kneeL: 6 + 30 * mx(0, -Math.cos(p * TAU)),
    reachR: { to: (c) => c.v(-.2 * c.k, .95 * c.k, .62 * c.k), pole: [-.5, -1, -.3], roll: 90 }, reachL: { to: (c) => c.v(.2 * c.k, .95 * c.k, .62 * c.k), pole: [.5, -1, -.3], roll: 90 } }; },
  hug: (o) => { const b = o.role === 'b'; return { spine: [8, 0, 0], head: [6, b ? -26 : 26, b ? 10 : -10], handR: 'open', handL: 'open', legR: { f: 4, a: 4 }, legL: { f: -2, a: 4 },
    reachR: { to: (c) => (c.other ? c.other.backHigh.clone().add(c.v(.07 * c.k, .02 * c.k, 0)) : A(c, 'front', 0, 0, .3)), pole: [-1, -.5, -.3], roll: -40 },
    reachL: { to: (c) => (c.other ? c.other.backLow.clone().add(c.v(-.07 * c.k, 0, 0)) : A(c, 'front', 0, 0, .3)), pole: [1, -.5, -.3], roll: -40 } }; },
  'give-object': (o) => { const b = o.role === 'b'; return { spine: [3, 0, 0], head: [5, 0, 0], handR: b ? 'open' : 'grip-pinch', handL: 'relaxed', legR: { f: 3, a: 3 }, legL: { f: -3, a: 4 },
    reachR: { to: (c) => (c.meet ? c.meet.clone().add(c.v(-.03 * c.k, 0, 0)) : A(c, 'front', -.1, -.05, .4)), pole: [-.6, -1, -.2], roll: b ? -60 : -20 }, armL: { f: 3, a: 8 }, elbL: 12 }; },
  'hold-hands': (o) => { const s = o.role === 'b' ? 'R' : 'L'; const p = { spine: [0, 0, 0], head: [0, o.role === 'b' ? 14 : -14, 0], legR: { f: 3, a: 3 }, legL: { f: -3, a: 3 } };
    p['hand' + s] = 'grip-handle'; p['reach' + s] = { to: (c) => (c.meet ? c.meet : A(c, 'hip', (s === 'R' ? -1 : 1) * .3, .0, .05)), pole: [s === 'R' ? -1 : 1, -1, -.2], roll: 80 }; p['arm' + (s === 'R' ? 'L' : 'R')] = { f: 3, a: 7 }; return p; },
  talk: (o) => ({ spine: [2, 0, 0], head: [2, o.role === 'b' ? -10 : 10, 0], handR: 'open', handL: 'relaxed', legR: { f: 3, a: 3 }, legL: { f: -3, a: 4 },
    reachR: { to: (c) => A(c, 'front', -.17, -.08, .2 + .03 * Math.sin((o.phase ?? 0) * TAU)), pole: [-1, -.8, -.2], roll: -50 }, armL: { f: 4, a: 8 }, elbL: 16 }),

  // ---- ampliacion 09/10: tejer, amasar, pintar, mecer, regar, teclear (bucles cerrados con phase 0..1; phase 0 = phase 1) ----
  // knit: dos agujas ('sticks', una por mano) delante del pecho, cruzadas en X; las puntas se mueven en circulos pequenos contrarios. o.sit = sentado (sit-chair).
  knit: (o) => { const p = (o.phase ?? 0) * TAU, sn = Math.sin(p), cs = Math.cos(p), base = o.sit ? POSES['sit-chair']({ ...o }) : { spine: [8, 0, 0], head: [16, 0, 0], legR: { f: 3, a: 3 }, legL: { f: -3, a: 4 } }, rl = o.rollK ?? 0, dy = o.dyK ?? 0, dx = o.dxK ?? .1;
    return { ...base, spine: [8 + .8 * sn, 0, 0], head: [16, 0, 0], neck: [6, 0, 0], handR: 'grip-stick', handL: 'grip-stick', carry: 'yarn',
      reachR: { to: (c) => A(c, 'front', -dx + .035 * cs, -.08 + dy + .045 * sn, .26), pole: [-1, -1, -.3], roll: rl }, reachL: { to: (c) => A(c, 'front', dx - .035 * cs, -.08 + dy - .045 * sn, .22), pole: [1, -1, -.3], roll: rl } }; },
  // knead: de pie ante una mesa (tabla a ~0,86 m, delante a ~0,45 m); las dos palmas empujan y vuelven, alternadas.
  knead: (o) => { const p = (o.phase ?? 0) * TAU, a = Math.cos(p), b = -Math.cos(p);
    return { spine: [20 + 3 * Math.cos(p * 2), 0, 0], neck: [6, 0, 0], head: [10, 0, 0], handR: 'flat', handL: 'flat', legR: { f: 3, a: 4 }, legL: { f: -3, a: 5 }, kneeR: 6, kneeL: 5,
      reachR: { to: (c) => A(c, 'hip', -.11, -.015 - .02 * mx(0, a), .42 + .06 * a), pole: [-.6, -1, -.4], roll: -85 }, reachL: { to: (c) => A(c, 'hip', .11, -.015 - .02 * mx(0, b), .42 + .06 * b), pole: [.6, -1, -.4], roll: -85 } }; },
  // paint: de pie ante un caballete (lienzo a ~0,55 m delante); la mano derecha con pincel traza ochos, la izquierda en la cadera.
  paint: (o) => { const p = (o.phase ?? 0) * TAU;
    return { spine: [2, -6, 0], head: [-2, -8, 3], handR: 'grip-stick', handL: 'relaxed', legR: { f: 3, a: 5 }, legL: { f: -4, a: 4 }, kneeR: 5, rot: [0, 0, 0],
      reachR: { to: (c) => A(c, 'shR', .05 + .1 * Math.cos(p), -.1 + .06 * Math.sin(p * 2), .52), pole: [-.5, -1, -.2], roll: 70 }, armL: { f: 16, a: 22, t: 0 }, elbL: 90 }; },
  // rock: bebe (carry 'baby') acunado en brazos contra el pecho, balanceo lateral lento con las rodillas
  rock: (o) => { const p = (o.phase ?? 0) * TAU, s = Math.cos(p);
    return { rot: [0, 0, 3 * s], spine: [-4, 0, -2 * s], neck: [4, 0, 0], head: [14, 0, 6 * s], handR: 'flat', handL: 'flat', carry: 'baby', legR: { f: 4, a: 5 }, legL: { f: -2, a: 6 }, kneeR: 6 + 3 * mx(0, s), kneeL: 6 + 3 * mx(0, -s),
      reachR: { to: (c) => A(c, 'front', -.1, -.21, .17), pole: [-1, -1, -.2], roll: -40 }, reachL: { to: (c) => A(c, 'front', .2, -.25, .17), pole: [1, -1, -.2], roll: -40 } }; },
  // water: regadera ('wateringCan') en la mano derecha, brazo adelante y levemente subido; se inclina y vuelve; la izquierda atras para equilibrio
  water: (o) => { const p = (o.phase ?? 0) * TAU, s = Math.cos(p), t = .5 - .5 * s;
    return { spine: [8 + 4 * t, 0, 0], head: [14, -8, 0], handR: 'grip-handle', handL: 'relaxed', legR: { f: 6, a: 4 }, legL: { f: -6, a: 6 }, kneeR: 5,
      reachR: { to: (c) => A(c, 'shR', -.05, -.14 + .02 * t, .42), pole: [-.5, -1, -.2], roll: 15 }, armL: { f: -18, a: 28 }, elbL: 14 }; },
  // type: sentado ante una mesa (tablero a ~0,74 m), manos sobre el teclado, dedos alternos (4 golpes por ciclo)
  type: (o) => { const p = (o.phase ?? 0) * TAU * 3, a = mx(0, Math.sin(p + .9)), b = mx(0, Math.sin(p + 3)), ph = o.phase == null ? 0 : o.phase * TAU;
    return { ...POSES['sit-chair']({ ...o }), spine: [8 + .6 * Math.sin(ph), 0, 0], neck: [6, 0, 0], head: [14 + Math.sin(ph) * 1.5, 2 * Math.sin(ph), 0], handR: 'relaxed', handL: 'relaxed',
      reachR: { to: (c) => A(c, 'front', -.09, -.13 + .012 * a, .26), pole: [-1, -1, -.3], roll: -85 }, reachL: { to: (c) => A(c, 'front', .09, -.13 + .012 * b, .26), pole: [1, -1, -.3], roll: -85 } }; },
};
POSES['knit-sit'] = (o) => POSES.knit({ ...o, sit: true });
// pasos clave del andar (4 fases) con nombre propio
[.25, .5, .75, 0].forEach((ph, i) => { POSES['walk-' + i] = (o) => POSES.walk({ ...o, phase: ph }); });
[0, 1].forEach((i) => { POSES['stairs-up-' + i] = (o) => POSES['stairs-up']({ ...o, phase: i * .75 }); });
export const POSE_NAMES = Object.keys(POSES);
