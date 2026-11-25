// =============================================================
//  PEOPLE — procedural pedestrians (natural proportions, hair,
//  coats, bags, shoes). Instanced per outfit variant; walking is
//  done in the vertex shader (hip / shoulder pivots), movement
//  and evacuation on the CPU (deterministic from scroll params).
// =============================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './textures.js';

const V2 = (r, y) => new THREE.Vector2(r, y);
const SKIN = ['#e9c8ad', '#ddb393', '#c99d7c', '#b48466', '#8d6248'];
const HAIR = ['#0d0b0b', '#16110f', '#2a1d17', '#3a2a22', '#5b4a43', '#a59a92', '#2b2533'];
const CLOTH = ['#111115', '#1a1a20', '#26262d', '#34343c', '#4c4c55', '#1c2133', '#232b44', '#2a1d42', '#3a2a55', '#d8d1c2', '#bdb4a3', '#6e6a64'];
const PANTS = ['#121216', '#1b1d26', '#242a3d', '#2f3443', '#3b3b42', '#cfc6b4'];
const SHOE = ['#0e0e10', '#1b1b1f', '#e6e2da', '#bdb8af', '#3a2b22'];

function paint(geo, hex, limb) {
  geo.deleteAttribute('uv');
  const n = geo.attributes.position.count;
  const c = new THREE.Color(hex).convertSRGBToLinear();
  const col = new Float32Array(n * 3), lb = new Float32Array(n);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; lb[i] = limb; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('limb', new THREE.BufferAttribute(lb, 1));
  if (!geo.index) { const idx = []; for (let i = 0; i < n; i++) idx.push(i); geo.setIndex(idx); }
  return geo;
}
const ell = (rx, ry, rz, x, y, z, ws = 14, hs = 10) => new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz).translate(x, y, z);
const taper = (rT, rB, len, x, yTop, z, seg = 10) => new THREE.CylinderGeometry(rT, rB, len, seg, 2).translate(x, yTop - len / 2, z);
const lathe = (pts, sx = 1, sz = 0.62, seg = 16) => new THREE.LatheGeometry(pts.map(([r, y]) => V2(r, y)), seg).scale(sx, 1, sz);
const box = (w, h, d, x, y, z) => {
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  // soften the box
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i) / (w / 2), vy = p.getY(i) / (h / 2), vz = p.getZ(i) / (d / 2);
    const k = 1 - 0.12 * Math.max(0, (Math.abs(vx) + Math.abs(vy) + Math.abs(vz)) - 2);
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g.translate(x, y, z);
};

function buildVariant(r) {
  const parts = [];
  const pick = (a) => a[Math.floor(r() * a.length)];
  const skin = pick(SKIN), hair = pick(HAIR);
  const types = ['coat', 'jacket', 'puffer', 'skirt', 'hoodie', 'coat', 'jacket'];
  const type = pick(types);
  const top = pick(CLOTH);
  let bottom = pick(PANTS);
  const shoe = pick(SHOE);
  const slim = type === 'skirt' || r() < 0.35;

  // legs (limb 1 = left, 2 = right)
  const legR = slim ? [0.062, 0.043] : [0.074, 0.05];
  const legCol = type === 'skirt' ? (r() < 0.5 ? '#141317' : skin) : bottom;
  for (const [sx, limb] of [[0.088, 1], [-0.088, 2]]) {
    parts.push(paint(taper(legR[0], legR[1], 0.86, sx, 0.95, 0), legCol, limb));
    parts.push(paint(ell(0.052, 0.042, 0.125, sx, 0.045, 0.03), shoe, limb));
    parts.push(paint(taper(0.05, 0.052, 0.05, sx, 0.11, 0.0), type === 'skirt' ? legCol : bottom, limb)); // cuff/ankle
  }

  // torso
  let torso;
  if (type === 'coat') torso = [[0, 0.5], [0.2, 0.5], [0.19, 0.62], [0.175, 0.85], [0.16, 1.0], [0.165, 1.18], [0.19, 1.34], [0.2, 1.41], [0.15, 1.47], [0.06, 1.5], [0, 1.5]];
  else if (type === 'puffer') torso = [[0, 0.84], [0.19, 0.84], [0.2, 0.9], [0.185, 0.96], [0.2, 1.04], [0.19, 1.11], [0.21, 1.19], [0.2, 1.27], [0.22, 1.35], [0.215, 1.42], [0.16, 1.49], [0.07, 1.53], [0, 1.53]];
  else if (type === 'skirt') torso = [[0, 0.56], [0.23, 0.56], [0.2, 0.7], [0.155, 0.93], [0.135, 1.02], [0.15, 1.2], [0.175, 1.33], [0.185, 1.41], [0.14, 1.47], [0.055, 1.5], [0, 1.5]];
  else if (type === 'hoodie') torso = [[0, 0.86], [0.17, 0.86], [0.17, 0.92], [0.16, 1.05], [0.17, 1.22], [0.19, 1.36], [0.19, 1.42], [0.15, 1.48], [0.08, 1.52], [0, 1.52]];
  else torso = [[0, 0.82], [0.165, 0.82], [0.165, 0.9], [0.15, 1.02], [0.16, 1.2], [0.185, 1.35], [0.19, 1.42], [0.145, 1.48], [0.06, 1.5], [0, 1.5]];
  const tw = slim ? 0.92 : 1.0;
  parts.push(paint(lathe(torso, tw, type === 'puffer' ? 0.72 : 0.62), top, 0));
  if (type === 'skirt' && r() < 0.5) parts.push(paint(lathe([[0, 0.93], [0.16, 0.93], [0.15, 1.03], [0, 1.03]], tw, 0.64), pick(CLOTH), 0)); // belt/top split
  if (type === 'hoodie') parts.push(paint(ell(0.12, 0.07, 0.09, 0, 1.5, -0.07), top, 0)); // hood
  if (r() < 0.25) parts.push(paint(new THREE.TorusGeometry(0.07, 0.03, 8, 16).rotateX(Math.PI / 2).scale(1, 1, 0.85).translate(0, 1.5, 0.005), pick(CLOTH), 0)); // scarf

  // arms (3 = left, 4 = right) – sleeves + hands
  const armR = type === 'puffer' ? [0.07, 0.056] : [0.058, 0.044];
  for (const [sx, limb] of [[1, 3], [-1, 4]]) {
    const a = taper(armR[0], armR[1], 0.56, 0, 0, 0).rotateZ(sx * 0.07).translate(sx * 0.205 * tw, 1.42, 0);
    parts.push(paint(a, top, limb));
    parts.push(paint(ell(0.034, 0.055, 0.03, sx * 0.235 * tw, 0.82, 0.005), skin, limb));
  }

  // neck, head, hair
  parts.push(paint(taper(0.043, 0.047, 0.09, 0, 1.57, 0), skin, 0));
  parts.push(paint(ell(0.09, 0.113, 0.103, 0, 1.645, 0.006, 16, 12), skin, 0));
  parts.push(paint(ell(0.02, 0.03, 0.015, 0.088, 1.64, -0.005), skin, 0)); // ears
  parts.push(paint(ell(0.02, 0.03, 0.015, -0.088, 1.64, -0.005), skin, 0));
  const hs = r();
  if (hs < 0.12) { // cap
    parts.push(paint(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.52).scale(1, 0.9, 1.08).translate(0, 1.675, -0.004), pick(['#111', '#1e2238', '#d8d1c2', '#2a1d42']), 0));
    parts.push(paint(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 16).scale(1, 1, 1.15).translate(0, 1.68, 0.075), '#111', 0));
  } else {
    parts.push(paint(ell(0.1, 0.1, 0.113, 0, 1.678, -0.02), hair, 0));
    parts.push(paint(ell(0.094, 0.1, 0.075, 0, 1.6, -0.042), hair, 0)); // back of head
    parts.push(paint(ell(0.088, 0.042, 0.05, 0, 1.725, 0.062), hair, 0)); // fringe
    if (hs < 0.5) parts.push(paint(ell(0.101, 0.18 + r() * 0.08, 0.06, 0, 1.53, -0.06), hair, 0)); // long hair
    else if (hs < 0.62) parts.push(paint(ell(0.045, 0.045, 0.045, 0, 1.74, -0.085), hair, 0)); // bun
  }

  // bags
  const bag = r();
  const bagCol = pick(['#0f0f12', '#1b1b20', '#3a2a22', '#d8d1c2', '#2a1d42', '#4c4c55']);
  if (bag < 0.28) parts.push(paint(box(0.27, 0.36, 0.13, 0, 1.18, -0.16), bagCol, 0));
  else if (bag < 0.5) {
    parts.push(paint(box(0.27, 0.3, 0.07, 0.25 * tw, 1.0, 0.0), bagCol, 0));
    parts.push(paint(taper(0.008, 0.008, 0.42, 0.22 * tw, 1.44, 0), bagCol, 0));
  } else if (bag < 0.68) parts.push(paint(box(0.18, 0.13, 0.06, -0.12, 1.02, 0.115), bagCol, 0));

  const g = mergeGeometries(parts, false);
  g.computeBoundingSphere();
  return g;
}

function patchWalk(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float limb; attribute vec2 aAnim;`)
      .replace('#include <beginnormal_vertex>', `
        float ph = aAnim.x; float amp = aAnim.y; float sw = sin(ph);
        float ang = 0.0; vec3 piv = vec3(0.0);
        if (limb > 0.5 && limb < 1.5) { ang = sw * 0.44 * amp; piv = vec3(0.0, 0.93, 0.0); }
        else if (limb > 1.5 && limb < 2.5) { ang = -sw * 0.44 * amp; piv = vec3(0.0, 0.93, 0.0); }
        else if (limb > 2.5 && limb < 3.5) { ang = -sw * 0.36 * amp; piv = vec3(0.0, 1.42, 0.0); }
        else if (limb > 3.5) { ang = sw * 0.36 * amp; piv = vec3(0.0, 1.42, 0.0); }
        float cA = cos(ang), sA = sin(ang);
        mat3 RW = mat3(1.0, 0.0, 0.0, 0.0, cA, sA, 0.0, -sA, cA);
        #include <beginnormal_vertex>
        objectNormal = RW * objectNormal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed = RW * (transformed - piv) + piv;
        transformed.y += abs(cos(ph)) * 0.022 * amp;`);
  };
  mat.customProgramCacheKey = () => 'walker';
}

export class Crowd {
  constructor({ count = 300, variants = 12, seed = 11, envMap = null, spots = [], stalls = [], jamCount = 48 } = {}) {
    this.stalls = stalls;
    const r = rng(seed);
    this.r = r;
    this.group = new THREE.Group();
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.04, envMap, envMapIntensity: 0.55 });
    patchWalk(this.mat);
    this.variantGeos = [];
    for (let i = 0; i < variants; i++) this.variantGeos.push(buildVariant(rng(seed * 100 + i * 7 + 3)));

    // people records
    this.people = [];
    for (let i = 0; i < count; i++) {
      const cross = r() < 0.18;
      const standing = !cross && r() < 0.22;
      let x0;
      if (cross) x0 = (r() - 0.5) * 90;
      else if (standing) x0 = (r() < 0.5 ? -1 : 1) * (r() < 0.45 ? 0.2 + r() * 2.0 : 3.6 + r() * 1.3);
      else x0 = (r() - 0.5) * 9.6;
      const p = {
        v: Math.floor(r() * variants), cross, standing,
        x0, z0: cross ? 1.5 + r() * 9 : -118 + r() * 156,
        dir: r() < 0.5 ? 1 : -1, speed: 0.85 + r() * 0.55, scale: 0.92 + r() * 0.14,
        delay: r() * 0.55, safe: 2.85 + r() * 1.9, tint: 0.8 + r() * 0.35,
        yaw: 0, phase: r() * 10, px: 0, pz: 0, init: false,
      };
      if (standing) p.yaw = Math.abs(x0) > 3 ? (x0 > 0 ? Math.PI / 2 : -Math.PI / 2) + (r() - 0.5) * 0.8 : r() * Math.PI * 2;
      this.people.push(p);
    }
    // anchored people: stall vendors and waiting customers
    for (const sp of spots) {
      this.people.push({ v: Math.floor(r() * variants), cross: false, standing: true, anchored: true, x0: sp.x, z0: sp.z, dir: 1, speed: 0,
        scale: 0.92 + r() * 0.14, delay: r() * 0.5, safe: 2.8, tint: 0.8 + r() * 0.35, yaw: sp.yaw, phase: r() * 10, px: 0, pz: 0, init: false });
    }
    // V5: the crowd that blocks the ambulance (PROBLEM scene). Positioned relative to the
    // ambulance, packed in front of its bumper and along its sides; only shown while C.jam > 0.
    const jr = rng(seed * 7 + 5), placed = [];
    for (let i = 0, tries = 0; i < jamCount && tries < 4000; tries++) {
      const front = jr() < 0.78;
      const jz = front ? 3.35 + Math.pow(jr(), 1.25) * 9.5 : -2.6 + jr() * 5.6;
      const jx = front ? (jr() - 0.5) * 5.4 : (jr() < 0.5 ? -1 : 1) * (1.75 + jr() * 1.2);
      if (placed.some(([x, z]) => Math.hypot(x - jx, z - jz) < 0.58)) continue;
      placed.push([jx, jz]); i++;
      const look = jr() < 0.42;                     // some turn to look at the ambulance
      this.people.push({ v: Math.floor(jr() * variants), cross: false, standing: true, jamGroup: true, jx, jz,
        x0: 0, z0: 0, dir: 1, speed: 0, scale: 0.92 + jr() * 0.14, delay: 0, safe: 0, tint: 0.75 + jr() * 0.35,
        yaw: look ? Math.PI + (jr() - 0.5) * 0.9 : (jr() - 0.5) * 1.6, phase: jr() * 10, px: 0, pz: 0, init: false });
    }
    count = this.people.length;
    // instanced meshes
    this.inst = [];
    const counts = new Array(variants).fill(0);
    for (const p of this.people) p.slot = counts[p.v]++;
    for (let v = 0; v < variants; v++) {
      const geo = this.variantGeos[v].clone();
      const n = Math.max(1, counts[v]);
      geo.setAttribute('aAnim', new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2).setUsage(THREE.DynamicDrawUsage));
      const im = new THREE.InstancedMesh(geo, this.mat, n);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false;
      for (let k = 0; k < n; k++) im.setColorAt(k, new THREE.Color(1, 1, 1));
      this.group.add(im);
      this.inst.push(im);
    }
    for (const p of this.people) this.inst[p.v].setColorAt(p.slot, new THREE.Color().setScalar(p.tint));

    // soft contact shadows
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const st = new THREE.CanvasTexture(c);
    this.shadow = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 0.7).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, color: 0x000000, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }), count);
    this.shadow.frustumCulled = false;
    this.shadow.renderOrder = 1;
    this.group.add(this.shadow);

    this.clock = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
  }

  // C: {evac (0..1), rate}, amb: {x, z, active}, cam: Vector3
  update(dt, C, amb, cam) {
    dt = Math.min(dt, 0.05);
    const jam = C.jam || 0;
    this.clock += dt * (1 - 0.92 * Math.min(1, C.evac * 1.4)) * (1 - 0.72 * jam);
    const T = this.clock;
    const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    let si = 0;
    const jamVis = amb.active ? sm(0.12, 0.55, jam) : 0;
    for (const p of this.people) {
      let x, z;
      if (p.jamGroup) {
        const sway = Math.sin(T * 0.9 + p.phase) * 0.06;
        x = amb.x + p.jx + sway; z = amb.z + p.jz;
        const s = p.scale * jamVis * ((Math.hypot(x - cam.x, z - cam.z) < 0.9 && cam.y < 2.2) ? 0 : 1);
        this._q.setFromAxisAngle(this._up, p.yaw + Math.sin(T * 0.3 + p.phase) * 0.15);
        this._m.compose(this._v.set(x, 0, z), this._q, this._s.set(s, s, s));
        this.inst[p.v].setMatrixAt(p.slot, this._m);
        const aa = this.inst[p.v].geometry.attributes.aAnim;
        aa.array[p.slot * 2] = p.phase; aa.array[p.slot * 2 + 1] = 0.12;   // shuffling in place
        this._m.compose(this._v.set(x, 0.012, z), this._q.identity(), this._s.set(s > 0 ? 1 : 0, 1, s > 0 ? 1 : 0));
        this.shadow.setMatrixAt(si++, this._m);
        continue;
      }
      if (p.cross) {
        x = ((p.x0 + p.dir * p.speed * T + 45) % 90 + 90) % 90 - 45;
        z = p.z0;
      } else {
        x = p.x0;
        z = p.standing ? p.z0 : ((p.z0 + p.dir * p.speed * T + 118) % 156 + 156) % 156 - 118;
        if (!p.standing) { x += Math.sin(T * 0.3 + p.z0) * 0.25; x *= 1 - 0.4 * jam; }
      }
      // evacuation: leave the emergency lane |x| < 2.75
      const e = sm(p.delay, p.delay + 0.45, C.evac);
      if (Math.abs(x) < p.safe && z < 14) {
        const side = x >= 0 ? 1 : -1;
        x = x + (side * p.safe - x) * e;
      }
      // keep clear of the ambulance body
      if (amb.active) {
        const dz = z - amb.z;
        if (dz > -3.6 && dz < 4.4 && Math.abs(x - amb.x) < 1.6) {
          const side = x - amb.x >= 0 ? 1 : -1;
          const k = sm(4.4, 3.2, dz) * sm(-3.6, -2.6, dz);
          x = x + (amb.x + side * 1.6 - x) * k;
        }
      }
      // keep walkers out of the street-food stalls
      if (!p.anchored && this.stalls.length) {
        for (const st of this.stalls) {
          if (x > st.x0 && x < st.x1 && z > st.z0 && z < st.z1) { x = st.side > 0 ? st.x0 - 0.05 : st.x1 + 0.05; break; }
        }
      }
      // keep-out zones: around the hero device (close-ups) and the camera
      if (C.keep > 0.001) {
        const kx = 2.1, kz = -4.0, R = 2.6 * C.keep;
        const dx = x - kx, dz2 = (z - kz) * 0.55, d = Math.hypot(dx, dz2);
        if (d < R) { const k = R / Math.max(d, 1e-3); x = kx + dx * k; z = kz + (z - kz) * k; }
      }
      {
        const dx = x - cam.x, dz2 = z - cam.z, d = Math.hypot(dx, dz2), R = cam.y < 2.5 ? 1.9 : 0;
        if (d < R) { const k = R / Math.max(d, 1e-3); x = cam.x + dx * k; z = cam.z + dz2 * k; }
      }
      // velocity -> facing + gait
      let speed = 0;
      if (p.init) {
        const vx = (x - p.px) / Math.max(dt, 1e-4), vz = (z - p.pz) / Math.max(dt, 1e-4);
        speed = Math.hypot(vx, vz);
        if (speed > 0.12 && speed < 8) {
          const target = Math.atan2(vx, vz);
          let d = target - p.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
          p.yaw += d * Math.min(1, dt * 6);
        }
        if (speed >= 8) speed = 0;
      }
      p.px = x; p.pz = z; p.init = true;
      p.phase += Math.min(speed, 2.2) * dt * 5.4;
      const amp = Math.min(1, speed / 1.0);
      // hide if too close to the camera
      const dc = Math.hypot(x - cam.x, z - cam.z);
      const vis = (dc < 0.9 && cam.y < 2.2) ? 0 : 1;
      const s = p.scale * vis;
      this._q.setFromAxisAngle(this._up, p.yaw);
      this._m.compose(this._v.set(x, 0, z), this._q, this._s.set(s, s, s));
      this.inst[p.v].setMatrixAt(p.slot, this._m);
      const aa = this.inst[p.v].geometry.attributes.aAnim;
      aa.array[p.slot * 2] = p.phase; aa.array[p.slot * 2 + 1] = amp;
      this._m.compose(this._v.set(x, 0.012, z), this._q.identity(), this._s.set(vis, 1, vis));
      this.shadow.setMatrixAt(si++, this._m);
    }
    for (const im of this.inst) { im.instanceMatrix.needsUpdate = true; im.geometry.attributes.aAnim.needsUpdate = true; }
    this.shadow.instanceMatrix.needsUpdate = true;
  }
}
