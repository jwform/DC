// =============================================================
//  AMBULANCE — white Korean 119 emergency van (procedural)
//  extruded rounded body, glass, grille, headlights, wheels,
//  roof light bar, decals; built front = +X then turned to +Z
// =============================================================
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, FONT, glowTexture } from './textures.js';

const L = 5.94, ROOF = 2.55;
const FW = 1.92, RW = -1.62, WR = 0.375;

function profilePath(p) {
  p.moveTo(-2.85, 0.42);
  p.lineTo(-2.08, 0.42);
  p.absarc(RW, 0.37, 0.47, Math.PI - 0.1, 0.1, true);
  p.lineTo(1.45, 0.42);
  p.absarc(FW, 0.37, 0.47, Math.PI - 0.1, 0.1, true);
  p.lineTo(2.84, 0.42);
  p.quadraticCurveTo(2.97, 0.44, 2.97, 0.6);
  p.lineTo(2.97, 0.98);
  p.quadraticCurveTo(2.96, 1.14, 2.74, 1.19);
  p.lineTo(2.3, 1.32);
  p.quadraticCurveTo(2.22, 1.35, 2.18, 1.42);
  p.lineTo(1.62, 2.3);
  p.quadraticCurveTo(1.5, 2.54, 1.22, 2.55);
  p.lineTo(-2.82, ROOF);
  p.quadraticCurveTo(-2.97, ROOF, -2.97, 2.42);
  p.lineTo(-2.97, 0.56);
  p.quadraticCurveTo(-2.97, 0.42, -2.85, 0.42);
  return p;
}

function drawSide(frontOnRight) {
  const W = 2048, H = 896, c = canvas(W, H), g = c.getContext('2d');
  const sx = (u) => (frontOnRight ? (u + 3) : (3 - u)) / 6 * W;
  const sy = (v) => (1 - v / 2.6) * H;
  // clip to body outline
  g.save();
  const path = new Path2D();
  const P = { moveTo: (u, v) => path.moveTo(sx(u), sy(v)), lineTo: (u, v) => path.lineTo(sx(u), sy(v)),
    quadraticCurveTo: (a, b, u, v) => path.quadraticCurveTo(sx(a), sy(b), sx(u), sy(v)),
    absarc: (cu, cv, r, a0, a1) => { const n = 24; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; path.lineTo(sx(cu + Math.cos(a) * r), sy(cv + Math.sin(a) * r)); } } };
  profilePath(P);
  g.clip(path);
  // lower cladding
  g.fillStyle = 'rgba(40,42,46,0.92)'; g.fillRect(0, sy(0.66), W, sy(0) - sy(0.66));
  // stripes
  g.fillStyle = '#c4161c'; g.fillRect(0, sy(1.24), W, sy(1.0) - sy(1.24));
  g.fillStyle = '#f2a516'; g.fillRect(0, sy(0.96), W, sy(0.9) - sy(0.96));
  g.fillStyle = '#c4161c'; g.fillRect(0, sy(2.43), W, sy(2.36) - sy(2.43));
  // text
  g.fillStyle = '#c4161c';
  g.font = `800 ${Math.round(H * 0.16)}px ${FONT}`;
  g.textBaseline = 'middle'; g.textAlign = 'center';
  const tx = sx(-1.05);
  g.fillText('119 구급대', tx, sy(1.72));
  g.font = `600 ${Math.round(H * 0.045)}px ${FONT}`;
  g.fillStyle = '#1d2a6b';
  g.fillText('EMERGENCY MEDICAL SERVICE', tx, sy(1.42));
  // star of life
  const cx = sx(0.95), cy = sy(1.75), R = H * 0.085;
  g.save(); g.translate(cx, cy); g.fillStyle = '#1b4fbf';
  for (let i = 0; i < 3; i++) { g.save(); g.rotate(i * Math.PI / 3); g.fillRect(-R * 0.28, -R, R * 0.56, R * 2); g.restore(); }
  g.fillStyle = '#fff'; g.fillRect(-R * 0.06, -R * 0.75, R * 0.12, R * 1.5); g.restore();
  // panel gaps
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 3;
  const line = (pts) => { g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(sx(u), sy(v)) : g.moveTo(sx(u), sy(v)))); g.stroke(); };
  line([[0.55, 0.5], [0.55, 2.3]]);
  line([[2.2, 0.5], [2.2, 1.38]]);
  line([[-0.35, 0.5], [-0.35, 2.33], [0.48, 2.33]]);
  line([[-2.9, 0.5], [-2.9, 2.45]]);
  // handles
  g.fillStyle = 'rgba(30,30,34,0.9)';
  g.fillRect(sx(0.75) - 18, sy(1.38), 36, 10); g.fillRect(sx(-0.2) - 18, sy(1.38), 36, 10);
  // side markers
  g.fillStyle = '#ff8a00'; g.fillRect(sx(2.6) - 14, sy(0.78), 28, 10);
  g.fillStyle = '#d10f1a'; g.fillRect(sx(-2.75) - 14, sy(0.78), 28, 10);
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function grilleTexture() {
  const c = canvas(512, 256), g = c.getContext('2d');
  g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 6; i++) {
    const y = 26 + i * 36;
    const gr = g.createLinearGradient(0, y, 0, y + 12);
    gr.addColorStop(0, '#9aa0a8'); gr.addColorStop(0.5, '#e8ecf0'); gr.addColorStop(1, '#5d636b');
    g.fillStyle = gr; g.fillRect(14, y, 484, 11);
  }
  g.strokeStyle = '#7d838b'; g.lineWidth = 8; g.strokeRect(6, 6, 500, 244);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function plateTexture() {
  const c = canvas(520, 110), g = c.getContext('2d');
  g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 520, 110);
  g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(4, 4, 512, 102);
  g.fillStyle = '#111'; g.font = `700 70px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('119 구 2030', 260, 58);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Ambulance {
  constructor(envMap) {
    this.group = new THREE.Group();
    const car = new THREE.Group();
    car.rotation.y = -Math.PI / 2; // front (+X) -> world +Z
    this.group.add(car);

    const paint = new THREE.MeshPhysicalMaterial({ color: 0xdfe0de, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.07, envMap, envMapIntensity: 1.0 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x05070b, roughness: 0.04, metalness: 0.3, clearcoat: 1, envMap, envMapIntensity: 1.8, side: THREE.DoubleSide });
    const frosted = new THREE.MeshStandardMaterial({ color: 0xb8c2c8, roughness: 0.35, metalness: 0.1, envMap, envMapIntensity: 0.8, emissive: 0x161a22, side: THREE.DoubleSide });
    const plastic = new THREE.MeshStandardMaterial({ color: 0x232427, roughness: 0.55, metalness: 0.1, envMap, envMapIntensity: 0.6 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.18, metalness: 1.0, envMap, envMapIntensity: 1.4 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.85, metalness: 0.0, envMap, envMapIntensity: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9 });
    this.headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.9, 3.6) });
    this.drlMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 3.6, 4) });
    this.tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.05, 0.06) });
    this.redMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.1, 0.12) });
    this.blueMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.15, 0.4, 3.2) });

    // ---- body
    const shape = profilePath(new THREE.Shape());
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 1.9, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 5, curveSegments: 28 });
    bodyGeo.translate(0, 0, -0.95);
    const body = new THREE.Mesh(bodyGeo, paint);
    car.add(body);

    // decals both sides
    const decGeo = new THREE.PlaneGeometry(6, 2.6).translate(0, 1.3, 0);
    const dA = new THREE.Mesh(decGeo, new THREE.MeshStandardMaterial({ map: drawSide(true), transparent: true, roughness: 0.32, envMap, envMapIntensity: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
    dA.position.z = 1.003; car.add(dA);
    const dB = new THREE.Mesh(decGeo, new THREE.MeshStandardMaterial({ map: drawSide(false), transparent: true, roughness: 0.32, envMap, envMapIntensity: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
    dB.position.z = -1.003; dB.rotation.y = Math.PI; car.add(dB);

    // ---- glass
    const quad = (pts, mat) => {
      const g = new THREE.BufferGeometry();
      const v = new Float32Array([...pts[0], ...pts[1], ...pts[2], ...pts[0], ...pts[2], ...pts[3]]);
      g.setAttribute('position', new THREE.BufferAttribute(v, 3)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); car.add(m); return m;
    };
    const n = new THREE.Vector2(0.88, 0.6).normalize().multiplyScalar(0.012);
    const wb = [2.17 + n.x, 1.44 + n.y], wt = [1.63 + n.x, 2.27 + n.y];
    quad([[wb[0], wb[1], 0.9], [wt[0], wt[1], 0.86], [wt[0], wt[1], -0.86], [wb[0], wb[1], -0.9]], glass);
    for (const s of [1, -1]) {
      const z = s * 1.006;
      const pts = [[2.1, 1.45, z], [1.6, 2.22, z], [0.62, 2.22, z], [0.62, 1.45, z]];
      quad(s > 0 ? pts : pts.slice().reverse(), glass);
      const p2 = [[0.4, 1.62, z], [0.4, 2.18, z], [-0.25, 2.18, z], [-0.25, 1.62, z]];
      quad(s > 0 ? p2.slice().reverse() : p2, frosted);
    }
    // rear door windows
    for (const s of [1, -1]) {
      const z0 = s * 0.12, z1 = s * 0.8;
      const pts = [[-2.976, 1.55, z0], [-2.976, 2.2, z0], [-2.976, 2.2, z1], [-2.976, 1.55, z1]];
      quad(s > 0 ? pts : pts.slice().reverse(), frosted);
    }
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.01, 1.95, 0.02), dark); seam.position.set(-2.975, 1.48, 0); car.add(seam);

    // ---- front: grille, headlights, bumper, plate
    const grille = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.32), new THREE.MeshStandardMaterial({ map: grilleTexture(), roughness: 0.3, metalness: 0.6, envMap }));
    grille.rotation.y = Math.PI / 2; grille.position.set(2.978, 0.84, 0); car.add(grille);
    for (const s of [1, -1]) {
      const housing = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.15, 0.46, 3, 0.04), chrome);
      housing.position.set(2.86, 1.06, s * 0.68); housing.rotation.z = -0.35; car.add(housing);
      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.09), this.headMat);
      lens.rotation.y = Math.PI / 2; lens.rotation.x = 0; lens.position.set(2.95, 1.05, s * 0.68); car.add(lens);
      const drl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.018, 0.4), this.drlMat);
      drl.position.set(2.9, 1.135, s * 0.68); car.add(drl);
      const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(128, 'rgba(255,255,255,1)', 'rgba(220,225,255,0.35)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      flare.position.set(3.05, 1.06, s * 0.68); flare.scale.setScalar(0.7); flare.material.opacity = 0.7; car.add(flare);
      // tail lights
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.12), this.tailMat);
      tail.position.set(-2.98, 1.12, s * 0.9); car.add(tail);
      // mirrors
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.16), plastic); arm.position.set(2.1, 1.82, s * 1.06); car.add(arm);
      const mir = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.26, 0.12, 2, 0.03), plastic); mir.position.set(2.08, 1.9, s * 1.16); car.add(mir);
      // corner flashers
      for (const u of [-2.72, 0.95]) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.02), this.redMat); f.position.set(u, 2.4, s * 1.012); car.add(f);
      }
    }
    const bump = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.32, 2.08, 3, 0.07), plastic); bump.position.set(2.86, 0.6, 0); car.add(bump);
    const rbump = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.26, 2.04, 3, 0.06), plastic); rbump.position.set(-2.92, 0.56, 0); car.add(rbump);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.11), new THREE.MeshStandardMaterial({ map: plateTexture(), roughness: 0.4 }));
    plate.rotation.y = Math.PI / 2; plate.position.set(3.016, 0.6, 0); car.add(plate);

    // ---- roof: light bar + module
    const barBase = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.1, 1.78, 3, 0.04), plastic); barBase.position.set(1.1, 2.62, 0); car.add(barBase);
    this.flareR = []; this.flareB = [];
    for (let i = 0; i < 8; i++) {
      const z = -0.77 + i * 0.22;
      const red = i < 4;
      const seg = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.1, 0.19, 2, 0.03), red ? this.redMat : this.blueMat);
      seg.position.set(1.1, 2.7, z); car.add(seg);
      if (i === 1 || i === 6) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(128, 'rgba(255,255,255,1)', red ? 'rgba(255,40,60,0.5)' : 'rgba(60,110,255,0.5)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        sp.position.set(1.2, 2.72, z); sp.scale.setScalar(2.2); car.add(sp);
        (red ? this.flareR : this.flareB).push(sp);
      }
    }
    const module = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.16, 1.2, 3, 0.05), paint); module.position.set(-1.5, 2.62, 0); car.add(module);
    for (const s of [1, -1]) { const rl = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.1, 0.2, 2, 0.03), s > 0 ? this.redMat : this.blueMat); rl.position.set(-2.82, 2.62, s * 0.8); car.add(rl); }

    // ---- under body & interior shadow volume
    const under = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.24, 1.76), dark); under.position.set(0.1, 0.34, 0); car.add(under);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.84), dark); cabin.position.set(1.5, 1.6, 0); car.add(cabin);

    // ---- wheels
    const tirePts = [[0.215, -0.118], [0.32, -0.122], [0.358, -0.108], [0.375, -0.06], [0.378, 0], [0.375, 0.06], [0.358, 0.108], [0.32, 0.122], [0.215, 0.118]].map(([r, y]) => new THREE.Vector2(r, y));
    const tireGeo = new THREE.LatheGeometry(tirePts, 40).rotateX(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.215, 0.215, 0.2, 32, 1, true).rotateX(Math.PI / 2);
    const discGeo = new THREE.CircleGeometry(0.205, 32);
    const spokeGeo = new THREE.BoxGeometry(0.05, 0.17, 0.03).translate(0, 0.095, 0);
    const hubGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.06, 16).rotateX(Math.PI / 2);
    this.wheels = [];
    for (const [u, s] of [[FW, 1], [FW, -1], [RW, 1], [RW, -1]]) {
      const w = new THREE.Group();
      w.position.set(u, WR, s * 0.87);
      w.add(new THREE.Mesh(tireGeo, rubber));
      w.add(new THREE.Mesh(rimGeo, chrome));
      const disc = new THREE.Mesh(discGeo, dark); disc.position.z = s * 0.06; if (s < 0) disc.rotation.y = Math.PI; w.add(disc);
      for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(spokeGeo, chrome); sp.rotation.z = k * Math.PI / 3; sp.position.z = s * 0.075; w.add(sp); }
      const hub = new THREE.Mesh(hubGeo, chrome); hub.position.z = s * 0.08; w.add(hub);
      car.add(w); this.wheels.push(w);
      const liner = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.34, 24, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x08080a, side: THREE.BackSide, roughness: 1 }));
      liner.position.set(u, 0.37, s * 0.82); car.add(liner);
    }

    // ---- lights
    this.spot = new THREE.SpotLight(0xfff3e6, 30, 40, 0.45, 0.75, 1.5);
    this.spot.position.set(0, 1.1, 3.0);
    this.spot.target.position.set(0, 0, 18);
    this.group.add(this.spot, this.spot.target);
    this.siren = new THREE.PointLight(0xff2030, 10, 24, 1.4);   // V5: reaches people, walls and the wet road
    this.siren.position.set(0, 3.1, 1.1);
    this.group.add(this.siren);
    this.sirenPhase = 0;
    this.lastZ = null;
    this.car = car;
  }

  update(t, A) {
    this.group.visible = A.visible > 0.5;
    this.group.position.set(A.x, 0, A.z);
    if (this.lastZ !== null) {
      const d = A.z - this.lastZ;
      for (const w of this.wheels) w.rotation.z -= d / WR;
    }
    this.lastZ = A.z;
    // siren pattern: double flashes alternating red / blue
    const cyc = (t * 2.2) % 1;
    const flash = (c0) => { const x = (cyc - c0 + 1) % 1; return (x < 0.08 || (x > 0.14 && x < 0.22)) ? 1 : 0.06; };
    const r = A.siren * flash(0), b = A.siren * flash(0.5);
    this.redMat.color.setRGB(3.2 * r + 0.15, 0.08 * r + 0.01, 0.1 * r + 0.01);
    this.blueMat.color.setRGB(0.12 * b + 0.01, 0.35 * b + 0.02, 3.4 * b + 0.15);
    this.flareR.forEach((s) => (s.material.opacity = r));
    this.flareB.forEach((s) => (s.material.opacity = b));
    this.siren.color.setRGB(r > b ? 1 : 0.15, 0.1, r > b ? 0.12 : 1);
    this.siren.intensity = (r + b) * 26 * A.siren;
    this.sirenMix = b > r ? 1 : 0;
    this.sirenLevel = Math.max(r, b) * A.siren * (A.visible > 0.5 ? 1 : 0);
    this.spot.intensity = 30 * A.lights;
    this.headMat.color.setScalar(0.4 + 3.6 * A.lights);
  }
}
