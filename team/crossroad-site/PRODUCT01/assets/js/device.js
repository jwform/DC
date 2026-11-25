// =============================================================
//  DEVICE RIG — the user's emergency-path device (from GLB)
//  Geometry comes 1:1 from the original "open" GLB, regrouped
//  into named parts. Moving parts are stored in their CLOSED
//  pose; extras hold the measured hinge pivots / lift heights
//  solved from the closed ↔ open model pair.
// =============================================================
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const PURPLE = new THREE.Color(0.62, 0.28, 1.0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const _e = new THREE.Euler();
const _c = new THREE.Color();

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// heavy mechanical ease: slow break-away, steady travel, soft landing
const mech = (t) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

export async function loadDeviceRig(url) {
  const loader = new GLTFLoader();
  const gltf = typeof url === 'string' ? await loader.loadAsync(url) : await loader.parseAsync(url, '');
  const parts = {};
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      o.geometry.computeBoundingBox();
      parts[o.name] = {
        geometry: o.geometry,
        translation: o.position.clone(),
        extras: o.userData || {},
      };
    }
  });
  return parts;
}

// ---------- materials ----------
function acrylicEdgePatch(mat, edgeColor, strength) {
  mat.userData.edge = { value: strength };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uEdge = mat.userData.edge;
    sh.uniforms.uEdgeColor = { value: edgeColor };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjN;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvObjN = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjN;\nuniform float uEdge;\nuniform vec3 uEdgeColor;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float edgeMask = max(smoothstep(0.55,0.95,abs(vObjN.y)), smoothstep(0.55,0.95,abs(vObjN.x)));
        totalEmissiveRadiance += uEdgeColor * (edgeMask * 3.0 + 0.02) * uEdge;`);
  };
  mat.customProgramCacheKey = () => 'acrylic-edge';
}

export function makeDeviceMaterials({ transmission = true } = {}) {
  const metal = new THREE.MeshPhysicalMaterial({
    color: 0x0d0c11, metalness: 0.8, roughness: 0.4,
    clearcoat: 0.08, clearcoatRoughness: 0.5, envMapIntensity: 1.0,
  });
  const metalDark = new THREE.MeshPhysicalMaterial({
    color: 0x07070a, metalness: 0.7, roughness: 0.5, envMapIntensity: 0.7,
  });
  const led = new THREE.MeshBasicMaterial({ color: 0xffffff });
  let acrylic;
  if (transmission) {
    acrylic = new THREE.MeshPhysicalMaterial({
      color: 0xf3ecff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.03, ior: 1.49,
      attenuationColor: new THREE.Color(0.85, 0.72, 1.0), attenuationDistance: 2.5,
      specularIntensity: 1, envMapIntensity: 1.4, emissive: 0x000000,
    });
  } else {
    acrylic = new THREE.MeshPhysicalMaterial({
      color: 0xe6deff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.16,
      envMapIntensity: 1.6, depthWrite: false, emissive: 0x000000,
    });
  }
  acrylicEdgePatch(acrylic, PURPLE.clone(), 0);
  return { metal, metalDark, led, acrylic };
}

const PART_MATERIAL = {
  panelR: 'metal', panelL: 'metal', warnBodyL: 'metal', warnBodyR: 'metal',
  warnCapL: 'metal', warnCapR: 'metal', housingL: 'metal', housingR: 'metal', base: 'metal',
  underPlate: 'metalDark', acrylic: 'acrylic',
  warnLedL: 'led:warn', warnLedR: 'led:warn', ledStrip: 'led:strip', indicators: 'led:ind',
};

// state -> local matrix of a part
function partMatrix(name, part, st, out) {
  const ex = part.extras;
  _p.copy(part.translation);
  _q.identity();
  const s1 = smooth(0.0, 0.6, st.warn), s2 = smooth(0.42, 1.0, st.warn);
  if (name === 'panelR' || name === 'panelL') {
    const a = THREE.MathUtils.degToRad(ex.openRotZ) * mech(st.panel);
    _q.setFromEuler(_e.set(0, 0, a));
  } else if (name.startsWith('warnBody')) {
    _p.y += ex.openY * s1;
  } else if (name.startsWith('warnLed') || name.startsWith('warnCap')) {
    const body = 0.079;
    _p.y += body * s1 + (ex.openY - body) * s2;
  } else if (name === 'acrylic') {
    _p.y += ex.openY * mech(st.acrylic);
  }
  return out.compose(_p, _q, _s);
}

export function defaultDeviceState() {
  return { warn: 0, panel: 0, acrylic: 0, ledStrip: 0, ledWarn: 0, ledInd: 0.25, edge: 0 };
}

// V3 — INTERACTIVE VIEWER: the top end of the LEFT vertical panel caught the purple
// rim spotlight as a bright specular hot-spot that read as an LED glow. This clone of the
// panel's metal material removes only the direct specular on that end face (object-space
// +x, which points up when the panel is deployed) while uTipQuiet = 1. Nothing else changes.
function tipQuietMaterial(base) {
  const m = base.clone();
  m.userData.tipQuiet = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTipQuiet = m.userData.tipQuiet;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTipN;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvTipN = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTipN;\nuniform float uTipQuiet;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        float tipMask = smoothstep(0.5, 0.9, vTipN.x) * uTipQuiet;
        reflectedLight.directSpecular *= 1.0 - tipMask;
        reflectedLight.indirectSpecular *= 1.0 - tipMask * 0.6;
        #ifdef USE_CLEARCOAT
          clearcoatSpecularDirect *= 1.0 - tipMask;
        #endif`);
  };
  m.customProgramCacheKey = () => 'panel-tip-quiet';
  return m;
}

// ---------- single hero device (studio) ----------
export class Device {
  constructor(parts, mats) {
    this.group = new THREE.Group();
    this.parts = parts;
    this.meshes = {};
    this.ledMats = { warn: mats.led.clone(), strip: mats.led.clone(), ind: mats.led.clone() };
    this.mats = mats;
    for (const [name, part] of Object.entries(parts)) {
      const key = PART_MATERIAL[name] || 'metal';
      let mat = key.startsWith('led:') ? this.ledMats[key.slice(4)] : mats[key];
      if (name === 'panelL') mat = this.panelLMat = tipQuietMaterial(mat);   // V3 (viewer): see tipQuietMaterial
      const mesh = new THREE.Mesh(part.geometry, mat);
      mesh.name = name;
      mesh.matrixAutoUpdate = false;
      mesh.castShadow = key !== 'acrylic';
      mesh.receiveShadow = true;
      if (name === 'acrylic') mesh.renderOrder = 2;
      this.group.add(mesh);
      this.meshes[name] = mesh;
    }
    this.set(defaultDeviceState());
  }
  set(st) {
    for (const [name, mesh] of Object.entries(this.meshes)) {
      partMatrix(name, this.parts[name], st, mesh.matrix);
      mesh.matrixWorldNeedsUpdate = true;
    }
    this.ledMats.warn.color.copy(PURPLE).multiplyScalar(0.05 + st.ledWarn * 7.0);
    this.ledMats.strip.color.copy(PURPLE).multiplyScalar(0.05 + st.ledStrip * 8.0);
    this.ledMats.ind.color.copy(PURPLE).multiplyScalar(0.05 + st.ledInd * 6.0);
    this.mats.acrylic.userData.edge.value = st.edge;
    this.meshes.acrylic.visible = st.acrylic > 0.002;
  }
}

// ---------- array of devices (city) – one InstancedMesh per part ----------
export class DeviceArray {
  constructor(parts, mats, placements) {
    this.group = new THREE.Group();
    this.parts = parts;
    this.placements = placements; // [{x,z,rotY,order}]
    this.n = placements.length;
    this.inst = {};
    this.mats = mats;
    this.base = placements.map((p) => new THREE.Matrix4().compose(
      new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.rotY, 0)), new THREE.Vector3(1, 1, 1)));
    for (const [name, part] of Object.entries(parts)) {
      const key = PART_MATERIAL[name] || 'metal';
      const mat = key.startsWith('led:') ? mats.led : mats[key];
      const im = new THREE.InstancedMesh(part.geometry, mat, this.n);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false;
      if (key.startsWith('led:')) {
        im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.n * 3), 3);
        im.instanceColor.setUsage(THREE.DynamicDrawUsage);
        im.userData.led = key.slice(4);
      }
      if (name === 'acrylic') im.renderOrder = 2;
      im.name = name;
      this.group.add(im);
      this.inst[name] = im;
    }
    this._local = new THREE.Matrix4();
    this._w = new THREE.Matrix4();
    this._st = defaultDeviceState();
  }
  // st: shared state, stagger: delay per order unit (0..)
  set(st, stagger = 0, online = 1) {
    const maxOrder = Math.max(...this.placements.map((p) => p.order));
    const span = 1 + maxOrder * stagger;
    for (let i = 0; i < this.n; i++) {
      const o = this.placements[i].order * stagger;
      const local = this._st;
      const f = (v) => clamp01(v * span - o);
      local.warn = f(st.warn); local.panel = f(st.panel); local.acrylic = f(st.acrylic);
      const on = clamp01((online * (maxOrder + 1.5) - this.placements[i].order));
      for (const [name, im] of Object.entries(this.inst)) {
        partMatrix(name, this.parts[name], local, this._local);
        this._w.multiplyMatrices(this.base[i], this._local);
        im.setMatrixAt(i, this._w);
        if (im.userData.led) {
          let k = im.userData.led === 'warn' ? 0.04 + st.ledWarn * 6.5 * Math.min(1, local.warn * 1.5)
            : im.userData.led === 'strip' ? 0.04 + st.ledStrip * 7.5 * local.acrylic
              : (0.04 + st.ledInd * 5.5) * on;
          _c.copy(PURPLE).multiplyScalar(k);
          im.setColorAt(i, _c);
        }
      }
    }
    for (const im of Object.values(this.inst)) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    this.mats.acrylic.userData.edge.value = st.edge;
  }
}

// one-parameter deploy sequence (0 = closed, 1 = deployed). Reversing t
// gives the real restore order: acrylic → panels → LEDs → warning modules.
export function sequenceState(t, out = defaultDeviceState()) {
  const seg = (a, b) => clamp01((t - a) / (b - a));
  out.warn = seg(0.0, 0.3); out.ledWarn = seg(0.04, 0.3);
  out.panel = seg(0.27, 0.68);
  out.acrylic = seg(0.66, 0.94);
  out.ledStrip = seg(0.7, 0.95); out.edge = seg(0.74, 1.0);
  out.ledInd = 0.3 + 0.45 * seg(0.0, 0.15);
  return out;
}
