// =============================================================
//  LIGHT WORLD — deep purple light trails rushing through space
//  chaos → aligned corridor (concept) → wall deploy / fold
//  → single beam (outro). All shape changes run in the shader.
// =============================================================
import * as THREE from 'three';
import { glowTexture } from '../textures.js';

const vert = /* glsl */`
  uniform float uAlign, uWall, uFold, uCollapse, uSpeed;
  attribute float aS; attribute float aSide; attribute vec4 aR;
  varying float vS; varying float vSide; varying vec4 vR; varying float vDepth;

  vec3 chaos(float s, vec4 r){
    float z = mix(-320.0, 30.0, s);
    float ang = r.x * 6.2831 + (r.z - 0.5) * 3.4 * (1.0 - s) + sin(s * 3.0 + r.w * 6.0) * 0.7;
    float rad = 2.4 + r.y * 17.0 + (1.0 - s) * r.w * 12.0;
    vec3 p = vec3(cos(ang) * rad, sin(ang) * rad * 0.6, z);
    p.x += sin(s * 3.14159 * (0.6 + r.w) + r.z * 6.0) * 7.0 * (r.y - 0.3);
    p.y += cos(s * 2.4 + r.x * 5.0) * 2.2 * (r.w - 0.5);
    return p;
  }
  vec3 corridor(float s, vec4 r){
    float z = mix(-320.0, 30.0, s);
    float side = r.x < 0.5 ? -1.0 : 1.0;
    float W = 3.1;
    float h = -2.2 + pow(r.y, 1.5) * (0.35 + uWall * 3.4);
    float x = side * (W + r.w * 0.9 * (1.0 - uWall * 0.7));
    if (r.z < 0.24) { x = (r.w * 2.0 - 1.0) * W * 0.8; h = -2.25; }
    h = mix(h, -2.25, uFold);
    return vec3(x, h, z);
  }
  vec3 beam(float s, vec4 r){
    float z = mix(-700.0, 30.0, s);
    float k = s * s;
    return vec3(mix(0.0, -4.2, k) + (r.x - 0.5) * 0.08, mix(-0.3, -3.0, k) + (r.y - 0.5) * 0.08, z);
  }
  vec3 path(float s){
    float a = smoothstep(aR.w * 0.35, 0.65 + aR.w * 0.35, uAlign);
    vec3 p = mix(chaos(s, aR), corridor(s, aR), a);
    p = mix(p, beam(s, aR), smoothstep(aR.y * 0.4, 0.6 + aR.y * 0.4, uCollapse));
    return p;
  }
  void main(){
    vec3 p = path(aS);
    vec3 p2 = path(aS + 0.003);
    vec3 T = normalize(p2 - p + 1e-5);
    vec3 toCam = normalize(cameraPosition - p);
    vec3 B = normalize(cross(T, toCam) + 1e-5);
    float w = (0.03 + aR.y * 0.085) * (1.0 + uSpeed * 0.12) * (1.0 - uCollapse * 0.5);
    p += B * aSide * w;
    vS = aS; vSide = aSide; vR = aR;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;

const frag = /* glsl */`
  uniform float uPhase, uLen, uIntensity, uPulse, uPulseAmt, uBaseLine, uKeep, uHead;
  uniform vec3 uColA, uColB;
  varying float vS; varying float vSide; varying vec4 vR; varying float vDepth;
  void main(){
    if (fract(vR.x * 7.31 + vR.y * 3.17) > uKeep) discard;
    float head = fract(vR.z * 7.13 + uPhase * (0.35 + vR.w * 0.65));
    float L = uLen * (0.55 + vR.y);
    float d = head - vS; d = d < 0.0 ? d + 1.0 : d;
    float tail = pow(clamp(1.0 - d / L, 0.0, 1.0), 1.7);
    float headGlow = exp(-d * 140.0);
    float prof = 1.0 - vSide * vSide;
    float a = (tail * 0.75 + headGlow * 1.4 * uHead + uBaseLine) * prof * (0.35 + 0.65 * step(0.45, fract(vR.x * 13.7)));
    a *= smoothstep(0.0, 0.07, vS) * smoothstep(1.0, 0.94, vS);
    a *= smoothstep(330.0, 50.0, vDepth) * smoothstep(0.2, 2.5, vDepth);
    vec3 col = mix(uColA, uColB, clamp(tail * 0.5 + headGlow, 0.0, 1.0));
    col += vec3(1.0) * headGlow * 0.7 * prof * uHead;
    float pz = exp(-abs(vS - uPulse) * 28.0) * prof;
    gl_FragColor = vec4(col * a * uIntensity + uColB * pz * uPulseAmt, 1.0);
  }`;

export class LightsWorld {
  constructor({ count = 110, segments = 180 } = {}) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050407);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(0, 0, 10);

    // ---- ribbons
    const vCount = count * segments * 2;
    const aS = new Float32Array(vCount), aSide = new Float32Array(vCount), aR = new Float32Array(vCount * 4);
    const idx = [];
    let v = 0;
    const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < count; i++) {
      const r = [rand(), rand(), rand(), rand()];
      for (let j = 0; j < segments; j++) {
        const s = j / (segments - 1);
        for (let k = 0; k < 2; k++) {
          aS[v] = s; aSide[v] = k ? 1 : -1; aR.set(r, v * 4); v++;
        }
        if (j < segments - 1) {
          const a = (i * segments + j) * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vCount * 3), 3));
    g.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
    g.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
    g.setAttribute('aR', new THREE.BufferAttribute(aR, 4));
    g.setIndex(idx);
    this.u = {
      uAlign: { value: 0 }, uWall: { value: 0 }, uFold: { value: 0 }, uCollapse: { value: 0 }, uSpeed: { value: 1 },
      uPhase: { value: 0 }, uLen: { value: 0.12 }, uIntensity: { value: 1 }, uPulse: { value: -1 }, uPulseAmt: { value: 0 },
      uBaseLine: { value: 0.012 }, uKeep: { value: 1 }, uHead: { value: 1 },
      uColA: { value: new THREE.Color(0.53, 0.23, 1.0).multiplyScalar(0.95) },
      uColB: { value: new THREE.Color(0.85, 0.72, 1.0).multiplyScalar(1.5) },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: this.u, vertexShader: vert, fragmentShader: frag,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.ribbons = new THREE.Mesh(g, m);
    this.ribbons.frustumCulled = false;
    this.scene.add(this.ribbons);

    // ---- central core light (intro)
    const gt = glowTexture(256, 'rgba(255,255,255,1)', 'rgba(165,77,255,0.45)');
    this.core = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0xffffff, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    this.core.position.set(0, 0, -60);
    this.scene.add(this.core);
    this.haze = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(256, 'rgba(120,50,220,0.6)', 'rgba(60,20,120,0.25)'), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    this.haze.position.set(0, -0.5, -120);
    this.scene.add(this.haze);

    // ---- fine dust for depth cues
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (rand() - 0.5) * 60; pos[i * 3 + 1] = (rand() - 0.5) * 34; pos[i * 3 + 2] = -rand() * 300; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustU = { uPhase: { value: 0 }, uOp: { value: 0.6 } };
    this.dust = new THREE.Points(dg, new THREE.ShaderMaterial({
      uniforms: this.dustU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uPhase; varying float vA;
        void main(){ vec3 p = position; p.z = mod(p.z + uPhase*40.0, 300.0) - 290.0;
          vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv;
          gl_PointSize = clamp(60.0/-mv.z, 1.0, 3.5); vA = smoothstep(280.0, 40.0, -mv.z)*smoothstep(1.0,8.0,-mv.z); }`,
      fragmentShader: `uniform float uOp; varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float a=smoothstep(0.5,0.0,length(c)); gl_FragColor=vec4(vec3(0.75,0.6,1.0)*a*vA*uOp,1.0);} `,
    }));
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
    this.phase = 0;
  }

  // P.lights: {speed, align, wall, fold, collapse, intensity, len, pulse, pulseAmt, core, coreScale, scrollPhase}
  update(dt, t, L, cam) {
    this.phase += dt * 0.06 * L.speed;
    const ph = this.phase + L.scrollPhase;
    const u = this.u;
    u.uPhase.value = ph; u.uSpeed.value = L.speed; u.uAlign.value = L.align; u.uWall.value = L.wall;
    u.uFold.value = L.fold; u.uCollapse.value = L.collapse; u.uIntensity.value = L.intensity;
    u.uLen.value = L.len; u.uPulse.value = L.pulse; u.uPulseAmt.value = L.pulseAmt;
    u.uKeep.value = L.keep ?? 1; u.uHead.value = L.head ?? 1; u.uBaseLine.value = L.base ?? 0.012;
    this.dustU.uPhase.value = ph; this.dustU.uOp.value = 0.55 * L.intensity * (1 - L.collapse) * (L.dust ?? 1);
    this.dust.visible = (L.dust ?? 1) > 0.01;
    const pulse = 1 + Math.sin(t * 2.2) * 0.04;
    this.core.material.opacity = L.core;
    this.core.scale.setScalar(L.coreScale * pulse);
    this.haze.material.opacity = L.core * 0.7 + L.intensity * 0.06;
    this.haze.scale.set(160, 70, 1);
    this.camera.position.set(cam.x, cam.y, cam.z);
    this.camera.lookAt(cam.tx, cam.ty, cam.tz);
    this.camera.fov = cam.fov; this.camera.updateProjectionMatrix();
  }
}
