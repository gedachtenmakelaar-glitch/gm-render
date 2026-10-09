// GM base world: the retro look LIVE, for video compositions (owner: main chat). Same result as still.py (Bayer 4x4 on a
// cell grid, ink lines kept as whole cells, navy / orange on beige), done on the GPU every frame, so drawOn() and moving
// cameras can be animated at 60 fps inside a HyperFrames composition.
//
//   import { makeRetro } from '../motor/retro.js';
//   const retro = makeRetro(renderer, W, H, { cell: 4 });
//   retro.render(scene, cam);          // instead of renderer.render(scene, cam)
import { THREE, setLineResolution } from './gm3d.js';

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FS = `
precision highp float;
uniform sampler2D tCol; uniform sampler2D tMask; uniform vec2 res; uniform float cell;
uniform vec3 navy; uniform vec3 orange; uniform vec3 paper; uniform float paperA;
varying vec2 vUv;
float bayer(vec2 c){
  int x = int(mod(c.x, 4.0)), y = int(mod(c.y, 4.0)); int i = y * 4 + x;
  float b[16]; b[0]=0.;b[1]=8.;b[2]=2.;b[3]=10.;b[4]=12.;b[5]=4.;b[6]=14.;b[7]=6.;b[8]=3.;b[9]=11.;b[10]=1.;b[11]=9.;b[12]=15.;b[13]=7.;b[14]=13.;b[15]=5.;
  float v = 0.; for (int k = 0; k < 16; k++) if (k == i) v = b[k];
  return (v + 0.5) / 16.0;
}
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float luma(vec2 px){ vec3 c = toSRGB(texture2D(tCol, px / res).rgb); /* render targets hold LINEAR light */ float Y = clamp(1.6 * (dot(c, vec3(0.299, 0.587, 0.114)) - 0.55) + 0.6, 0.0, 1.0); /* same contrast curve as still.py */ return clamp(1.22 * Y - 0.05, 0.0, 1.0); }
void main(){
  vec2 px = vec2(vUv.x * res.x, (1.0 - vUv.y) * res.y);
  vec2 c = floor(px / cell); vec2 o = c * cell;
  vec2 P = vec2(o.x, res.y - o.y - cell);           // cell origin in GL pixel space
  float centre = luma(P + vec2(cell * 0.5));
  float dk = 1.0;
  for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++) dk = min(dk, luma(P + (vec2(float(i), float(j)) + 0.5) * cell / 4.0));
  bool line = dk < 0.16;
  float s = line ? dk : centre;
  bool inkc = s < 1.0 - bayer(c);
  float m = texture2D(tMask, (P + vec2(cell * 0.5)) / res).r;
  vec3 col = (m > 0.5 && !line) ? orange : navy;
  gl_FragColor = vec4(inkc ? col : paper, inkc ? 1.0 : paperA);
}`;

const MASK = { on: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), off: new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }) };
const srgb = (r, g, b) => new THREE.Vector3(r / 255, g / 255, b / 255);

export function makeRetro(renderer, W, H, opts = {}) {
  const rtC = new THREE.WebGLRenderTarget(W, H, { samples: 4 });
  const rtM = new THREE.WebGLRenderTarget(W, H);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, depthTest: false, depthWrite: false,
    uniforms: { tCol: { value: rtC.texture }, tMask: { value: rtM.texture }, res: { value: new THREE.Vector2(W, H) }, cell: { value: opts.cell ?? 4 },
      navy: { value: srgb(26, 56, 84) }, orange: { value: srgb(255, 164, 98) }, paper: { value: opts.paper ? srgb(...opts.paper) : srgb(249, 248, 245) }, paperA: { value: opts.paperAlpha ?? 1.0 } },
  }));
  const post = new THREE.Scene(); post.add(quad); const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    render(scene, cam) {
      setLineResolution(scene, W, H);
      renderer.setRenderTarget(rtC); renderer.render(scene, cam);
      const saved = [];
      scene.traverse((o) => {
        if (o.userData && o.userData.hilo) { if (!o.material.userData.accent && o.visible) { saved.push([o, null]); o.visible = false; } }
        else if (o.userData && o.userData.hull) { if (o.visible) { saved.push([o, null]); o.visible = false; } }
        else if (o.isMesh && o.visible) { saved.push([o, o.material]); const ms = Array.isArray(o.material) ? o.material : [o.material]; { const base = ms.some((m) => m.userData && m.userData.accent) ? MASK.on : MASK.off, cp = ms[0].clippingPlanes, key = base === MASK.on ? '_mOn' : '_mOff'; if (cp && cp.length) { if (!o.userData[key]) { const mm = base.clone(); mm.clippingPlanes = cp; o.userData[key] = mm; } o.material = o.userData[key]; } else o.material = base; } }
        else if (o.isLine && o.visible) { saved.push([o, null]); o.visible = false; }
      });
      const bg = scene.background; scene.background = new THREE.Color(0x000000);
      renderer.setRenderTarget(rtM); renderer.render(scene, cam);
      scene.background = bg; saved.forEach(([o, m]) => { if (m) o.material = m; else o.visible = true; });
      renderer.setRenderTarget(null); renderer.render(post, postCam);
    },
    setCell(c) { quad.material.uniforms.cell.value = c; },
  };
}
