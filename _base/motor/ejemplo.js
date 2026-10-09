// Example scene for the engine (owner: main chat): a Dutch canal-house front, a bike, a bench, one person.
// It shows the contract: export build(scene, opts) -> { cameras }, optional update(t, scene, built). Copy its pattern.
import { THREE, TONE, block, box, extrude, cyl, plane, sphere, tag, rng, drawSequence } from './gm3d.js';
import { person } from './personas.js';

export function build(scene, opts) {
  const root = tag(new THREE.Group(), 'ejemplo'); scene.add(root);
  const suelo = tag(plane(60, 30, TONE.light), 'suelo'); suelo.rotation.x = -Math.PI / 2; root.add(suelo);
  // narrow brick house with a bell gable, 3 floors
  const W = 5.2, Hh = 10.5;
  const front = extrude([[-W / 2, 0], [W / 2, 0], [W / 2, Hh], [1.6, Hh + 1.2], [0.7, Hh + 2.6], [-0.7, Hh + 2.6], [-1.6, Hh + 1.2], [-W / 2, Hh]], 0.3, TONE.mid,
    { holes: [0, 1, 2].flatMap((f) => [-1.4, 1.4].map((x) => [[x - 0.6, 1.2 + f * 3.2], [x + 0.6, 1.2 + f * 3.2], [x + 0.6, 3.4 + f * 3.2], [x - 0.6, 3.4 + f * 3.2]])) });
  front.position.z = 0; root.add(tag(front, 'casa:fachada'));
  root.add(tag(block(0, 0, -3, W - 0.1, Hh, 6, TONE.light), 'casa:cuerpo'));
  root.add(tag(block(0, Hh + 2.2, 0.35, 0.2, 0.2, 1.4, TONE.dark), 'casa:viga-polea'));       // hoisting beam
  root.add(tag(block(-1.4, 0, 0.25, 1.1, 2.2, 0.15, TONE.dark), 'casa:puerta'));
  const lampOn = block(-1.4, 2.3, 0.45, 0.25, 0.3, 0.25, TONE.pale, { accent: true }); root.add(tag(lampOn, 'casa:farol'));
  // bike
  const bike = tag(new THREE.Group(), 'bici');
  for (const x of [-0.55, 0.55]) { const w = cyl(0.34, 0.34, 0.05, TONE.dark, { seg: 32 }); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, 0); bike.add(w); }
  bike.add(block(0, 0.55, 0, 1.0, 0.05, 0.05, TONE.ink)); bike.position.set(2.5, 0, 1.6); root.add(bike);
  // bench
  root.add(tag(block(-4.5, 0.4, 1.2, 1.8, 0.08, 0.5, TONE.dark), 'banco'));
  const p = person('vecina', 'stand'); p.position.set(0.8, 0, 2.2); root.add(p);
  const r = rng(3); for (let i = 0; i < 6; i++) root.add(tag(block(-25 + i * 9 + r() * 3, 0, -20, 4 + r() * 3, 8 + r() * 10, 5, TONE.pale), 'ciudad', 'fondo'));
  // the thread builds the scene: house, then bike, then the person (opts.draw = true turns it on; update(t) drives it)
  const casa = tag(new THREE.Group(), 'casa'); root.children.filter((o) => o.name.startsWith('casa:')).forEach((o) => casa.add(o)); root.add(casa);
  const dot = sphere(0.18, TONE.pale, { accent: true }); dot.visible = false; root.add(dot);
  const seq = [{ obj: casa, t0: 0, dur: 2.4 }, { obj: bike, t0: 2.2, dur: 0.8 }, { obj: p, t0: 2.8, dur: 1.0 }];
  return { seq, dot, draw: !!opts.draw, cameras: {
    frente: { pos: [0, 7, 30], look: [0, 6, 0], fov: 30 },
    tresCuartos: { pos: [14, 4, 16], look: [0, 4, 0], fov: 32 },
    contrapicado: { pos: [3, 0.6, 7], look: [0, 6, 0], fov: 50 },
    casita: { pos: [0, 7, 50], look: [0, 7, 0], ortho: 8 },
  } };
}

export function update(t, scene, built) {
  if (!built.draw) return;
  const tip = drawSequence(built.seq, t);
  built.dot.visible = !!tip; if (tip) built.dot.position.copy(tip);
}
