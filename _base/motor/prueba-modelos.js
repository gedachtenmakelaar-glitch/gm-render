// Engine check (owner: main chat): ready-made models restyled, the thick thread and silhouette outlines.
import { THREE, TONE, plane, block, capsule, sphere, tag, modelo, hilo, silueta } from './gm3d.js';
const K = 'modelos/kenney/';
export const MODELOS = [K + 'furniture-kit/loungeSofa.glb', K + 'furniture-kit/lampRoundFloor.glb', K + 'furniture-kit/pottedPlant.glb',
  K + 'car-kit/sedan.glb', K + 'nature-kit/tree_default.glb', K + 'furniture-kit/tableCoffee.glb'];
export function build(scene) {
  const root = tag(new THREE.Group(), 'prueba'); scene.add(root);
  const f = plane(30, 30, TONE.light); f.rotation.x = -Math.PI / 2; root.add(f);
  root.add(block(0, 0, -2.2, 8, 3, 0.2, TONE.pale));
  const sofa = modelo(MODELOS[0], { l: 2.1 }); sofa.position.set(-1.2, 0, -1.3); root.add(sofa);
  const lamp = modelo(MODELOS[1], { h: 1.6 }); lamp.position.set(0.6, 0, -1.6); root.add(lamp);
  const plant = modelo(MODELOS[2], { h: 0.9 }); plant.position.set(-2.8, 0, -1.6); root.add(plant);
  const table = modelo(MODELOS[5], { l: 1.0 }); table.position.set(-1.2, 0, -0.2); root.add(table);
  const car = modelo(MODELOS[3], { l: 4.3 }); car.position.set(3.5, 0, 2.5); car.rotation.y = -0.5; root.add(car);
  const tree = modelo(MODELOS[4], { h: 5 }); tree.position.set(5.5, 0, -3); root.add(tree);
  // a person-ish capsule with and without silhouette
  for (const [x, sil] of [[1.6, false], [2.3, true]]) {
    const b = capsule(0.2, 0.9, TONE.light); b.position.set(x, 0.65, 0); if (sil) silueta(b, 0.02); root.add(b);
    const h = sphere(0.15, TONE.dark); h.position.set(x, 1.45, 0); if (sil) silueta(h, 0.02); root.add(h);
  }
  // the brand thread entering and looping around the sofa
  const pts = []; for (let i = 0; i <= 80; i++) { const k = i / 80; pts.push([-6 + 7 * k, 1.8 + Math.sin(k * 7) * 0.4, 0.6 - k]); }
  root.add(hilo(pts, { px: 8.5 }));
  return { cameras: { sala: { pos: [1.5, 2.2, 7.5], look: [0.3, 0.9, -0.8], fov: 40 } } };
}
