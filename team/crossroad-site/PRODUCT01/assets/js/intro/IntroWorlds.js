// =============================================================
//  INTRO WORLDS — integration wrapper for the intro of file B
//  (2030-myeongdong 10th-week build). The vortex and the light
//  streams are file B's own code (IntroVortex.js / FlowStreams.js,
//  copied unchanged). This wrapper only re-creates the parts of
//  file B's main.js that drove them (camera, parallax, smoothing),
//  so they render through this project's single renderer.
// =============================================================
import * as THREE from 'three';
import { IntroVortex } from './IntroVortex.js';
import { FlowStreams } from './FlowStreams.js';

// --- from file B: js/animations/cameraPaths.js (conceptStreams path + sampler)
const CONCEPT_STREAMS = [
  { t: 0, p: [0, 0.8, 12], l: [0, 0.6, -40] },
  { t: 0.5, p: [0, 1.6, 9.5], l: [0, 0.3, -40] },
  { t: 1, p: [0, 3.2, 5.5], l: [0, 0.0, -36] },
];
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function sampleCamera(keys, q, outPos, outLook) {
  q = Math.min(1, Math.max(0, q));
  let i = 0;
  while (i < keys.length - 2 && q > keys[i + 1].t) i++;
  const k1 = keys[i], k2 = keys[Math.min(i + 1, keys.length - 1)];
  const k0 = keys[Math.max(i - 1, 0)], k3 = keys[Math.min(i + 2, keys.length - 1)];
  const u = k2.t > k1.t ? (q - k1.t) / (k2.t - k1.t) : 0;
  for (let a = 0; a < 3; a++) {
    outPos.setComponent(a, cr(k0.p[a], k1.p[a], k2.p[a], k3.p[a], u));
    outLook.setComponent(a, cr(k0.l[a], k1.l[a], k2.l[a], k3.l[a], u));
  }
}
const ramp = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
const smooth = (t) => t * t * (3 - 2 * t);

class SmoothCam {
  constructor() { this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 600); this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.fov = 40; this.init = false; }
  apply(dt, pos, look, up, fov, snap) {
    const k = snap || !this.init ? 1 : 1 - Math.exp(-dt * 9);
    this.pos.lerp(pos, k); this.look.lerp(look, k); this.fov += (fov - this.fov) * k;
    if (snap || !this.init) { this.pos.copy(pos); this.look.copy(look); this.fov = fov; }
    this.camera.up.copy(up); this.camera.position.copy(this.pos); this.camera.lookAt(this.look);
    this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); this.init = true;
  }
}

// Vortex: file B hero section. q = hero progress (we stop before B's suction / tunnel phase).
export class VortexWorld {
  constructor() {
    this.vortex = new IntroVortex();
    this.scene = this.vortex.scene;
    this.cam = new SmoothCam();
    this.camera = this.cam.camera;
    this._p = new THREE.Vector3(); this._l = new THREE.Vector3(); this._u = new THREE.Vector3(0, 1, 0);
  }
  set ignite(v) { this.vortex.ignite = v; }
  update(dt, q, mouse, fovScale = 1) {
    this.vortex.update(dt, q, 'hero', mouse);
    const c = this.vortex.camera(q, 'hero', this._p, this._l, this._u);
    this._p.x += mouse.x * 0.35 * 0.6; this._p.y += mouse.y * 0.18 * 0.6;   // file B parallax for the vortex
    this.cam.apply(dt, this._p, this._l, this._u, c.fov * fovScale, false);
    return c;
  }
  // file B afterimage damping for the hero
  damp(q) { return 0.6 + 0.3 * ramp(q, 0.25, 0.7) - 0.25 * ramp(q, 0.85, 1); }
}

// Light streams: file B concept section, first part ("THE CITY RESPONDS BEFORE YOU DO.")
export class StreamsWorld {
  constructor() {
    this.streams = new FlowStreams();
    this.scene = this.streams.scene;
    this.cam = new SmoothCam();
    this.camera = this.cam.camera;
    this._p = new THREE.Vector3(); this._l = new THREE.Vector3(); this._u = new THREE.Vector3(0, 1, 0);
  }
  update(dt, q, mouse, fovScale = 1) {
    // identical parameters to file B main.js (concept → streams branch)
    this.streams.update(dt, { converge: 1, jam: 1 - ramp(q, 0.55, 1) * 0.6, beam: 1, open: smooth(ramp(q, 0.12, 0.7)), gain: 1 });
    sampleCamera(CONCEPT_STREAMS, q, this._p, this._l);
    this._p.x += mouse.x * 0.35 * 0.18; this._p.y += mouse.y * 0.18 * 0.18;
    this.cam.apply(dt, this._p, this._l, this._u, 46 * fovScale, false);
  }
}
