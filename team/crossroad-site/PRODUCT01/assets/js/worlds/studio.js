// =============================================================
//  STUDIO WORLD — dark product studio for the reveal & finale
// =============================================================
import * as THREE from 'three';
import { createGround } from '../ground.js';
import { Device, makeDeviceMaterials, PURPLE, sequenceState, defaultDeviceState } from '../device.js';
import { contactShadowTexture, glowTexture } from '../textures.js';

// V5 — LIGHT SWEEP for the SOLUTION reveal: a thin violet light travels once along the product.
// Two moving point lights give real specular highlights on the metal / acrylic; a shader term adds
// the light band itself (sharp core + short afterglow), weighted toward grazing angles so the
// edges and the form read. The model, its materials' base values and the camera are untouched.
function addSweep(m, U) {
  const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : () => '';
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(m, sh, r);
    sh.uniforms.uSweepX = U.x; sh.uniforms.uSweepK = U.k;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSwW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSwW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vSwW;\nuniform float uSweepX, uSweepK;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float sd = vSwW.x - uSweepX;
          float band = exp(-sd * sd / 0.0012);
          float wake = sd < 0.0 ? exp(sd * 6.5) * 0.22 : 0.0;
          float fr = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
          totalEmissiveRadiance += vec3(0.6, 0.28, 1.0) * (band * 2.2 + wake) * (0.3 + 0.7 * pow(fr, 1.4)) * uSweepK;
        }`);
  };
  m.customProgramCacheKey = () => prevKey() + '|sweep';
  m.needsUpdate = true;
}

export class StudioWorld {
  constructor(renderer, { env, rig, mobile = false }) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050407);
    this.scene.fog = new THREE.Fog(0x0a080e, 6, 15);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.02, 60);
    const mats = makeDeviceMaterials({ transmission: true });
    for (const m of Object.values(mats)) if (m.isMeshStandardMaterial) m.envMap = env;
    this.mats = mats;
    this.device = new Device(rig, mats);
    this.scene.add(this.device.group);
    this.sweepU = { x: { value: -9 }, k: { value: 0 } };
    const seen = new Set();
    for (const mesh of Object.values(this.device.meshes)) {
      const mt = mesh.material;
      if (!mt || !mt.isMeshStandardMaterial || seen.has(mt)) continue;
      seen.add(mt); addSweep(mt, this.sweepU);
    }
    this.sweepA = new THREE.PointLight(0xa45cff, 0, 1.3, 1.2);
    this.sweepB = new THREE.PointLight(0xc49bff, 0, 1.1, 1.2);
    this.scene.add(this.sweepA, this.sweepB);

    // backdrop: soft violet haze behind product
    const bg = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uGlow: { value: 1 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: `uniform float uGlow; varying vec3 vP;
        void main(){ float h = vP.y; float back = smoothstep(0.2, -1.0, vP.z);
          vec3 c = vec3(0.0032,0.0026,0.0045) + vec3(0.012,0.0045,0.022) * exp(-pow((h-0.22)*3.0,2.0)) * back * uGlow;
          gl_FragColor = vec4(c,1.0);} `,
    }));
    bg.renderOrder = -2;
    this.bg = bg;
    this.scene.add(bg);

    const res = Math.round(Math.min(1024, (mobile ? 0.35 : 0.55) * Math.max(innerWidth, innerHeight)));
    this.ground = createGround({ mode: 'studio', size: [40, 40], res });
    this.ground.material.uniforms.uReflect.value = 0.38;
    this.scene.add(this.ground);
    this.gU = this.ground.material.uniforms;

    // contact shadow
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.75).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, opacity: 0.85, depthWrite: false, color: 0x000000 }));
    cs.material.alphaMap = cs.material.map; cs.material.map = null;
    cs.position.y = 0.002; cs.renderOrder = 1;
    this.scene.add(cs);

    // lights
    this.scene.add(new THREE.HemisphereLight(0x2a2140, 0x050407, 0.35));
    const key = new THREE.DirectionalLight(0xf2eeff, 1.6);
    key.position.set(1.5, 5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -2; key.shadow.camera.right = 2; key.shadow.camera.top = 2; key.shadow.camera.bottom = -2;
    key.shadow.radius = 6; key.shadow.bias = -0.0004;
    this.key = key;
    this.scene.add(key);
    this.rimL = new THREE.SpotLight(0xa54dff, 30, 12, 0.6, 0.8, 1.5); this.rimL.position.set(-3, 1.6, -2.5);
    this.rimR = new THREE.SpotLight(0x873bff, 30, 12, 0.6, 0.8, 1.5); this.rimR.position.set(3, 1.6, -2.5);
    this.scene.add(this.rimL, this.rimR);
    // travelling edge light (reveals form)
    this.scanLight = new THREE.PointLight(0xb070ff, 0, 1.4, 1.6);
    this.scene.add(this.scanLight);
    this.scanBar = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.42), new THREE.MeshBasicMaterial({ color: new THREE.Color(PURPLE).multiplyScalar(6) }));
    this.scene.add(this.scanBar);
    this.scanGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(128), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    this.scanGlow.scale.set(0.22, 0.22, 1);
    this.scene.add(this.scanGlow);
    // LED fill under the product
    this.ledFill = new THREE.PointLight(0xa54dff, 0, 2.2, 1.6); this.ledFill.position.set(0, 0.25, 0.4);
    this.warnFill = new THREE.PointLight(0xa54dff, 0, 1.6, 1.6); this.warnFill.position.set(1.15, 0.3, 0.3);
    this.warnFill2 = new THREE.PointLight(0xa54dff, 0, 1.6, 1.6); this.warnFill2.position.set(-1.15, 0.3, 0.3);
    this.scene.add(this.ledFill, this.warnFill, this.warnFill2);
    this.renderer = renderer;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  setSize(w, h, pr) {
    const res = Math.round(Math.min(1024, 0.55 * Math.max(w, h) * Math.min(pr, 1.5)));
    this.ground.getRenderTarget().setSize(res, Math.round(res * h / w));
  }

  // S = P.studio
  // S = P.studio, V = P.viewer {az, el, r, tx, ty, tz, t}
  update(dt, t, S, cam, V) {
    const v = S.viewer || 0;
    let px = cam.x, py = cam.y, pz = cam.z, tx = cam.tx, ty = cam.ty, tz = cam.tz;
    if (v > 0.001 && V) {
      const ox = V.tx + Math.sin(V.az) * Math.cos(V.el) * V.r;
      const oy = V.ty + Math.sin(V.el) * V.r;
      const oz = V.tz + Math.cos(V.az) * Math.cos(V.el) * V.r;
      px += (ox - px) * v; py += (oy - py) * v; pz += (oz - pz) * v;
      tx += (V.tx - tx) * v; ty += (V.ty - ty) * v; tz += (V.tz - tz) * v;
    }
    this.camera.position.set(px, py, pz);
    this.camera.lookAt(tx, ty, tz);
    this.camera.fov = cam.fov; this.camera.updateProjectionMatrix();
    const d = v > 0.5 && V ? sequenceState(V.t, this._vs || (this._vs = defaultDeviceState())) : S.dev;
    this.device.set(d);
    this.scanLight.intensity = 0; this.scanBar.visible = false; this.scanGlow.visible = false;
    this.ledFill.intensity = d.ledStrip * d.acrylic * 1.2;
    // V3: interactive viewer only — no purple hot-spot on the top end of the left panel
    this.device.panelLMat.userData.tipQuiet.value = S.viewer > 0.5 ? 1 : 0;
    this.warnFill.intensity = this.warnFill2.intensity = d.ledWarn * 0.8 + d.ledInd * 0.15;
    this.gU.uDev.value.set(d.ledStrip * d.acrylic, d.ledWarn * Math.min(1, d.warn * 2), d.ledInd, 0);
    this.gU.uDim.value = S.dim;
    this.rimL.intensity = this.rimR.intensity = 14 * S.rim;
    this.key.intensity = 1.6 * S.key;
    this.bg.material.uniforms.uGlow.value = S.bgGlow;
    // V5 light sweep (S.sweep 0 → 1, driven by a one-shot tween in main.js)
    const sw = S.sweep || 0;
    if (sw > 0.001 && sw < 0.999) {
      const e = sw * sw * (3 - 2 * sw);
      const x = -1.5 + 3.0 * e, k = Math.pow(Math.sin(Math.PI * sw), 0.55);
      this.sweepU.x.value = x; this.sweepU.k.value = k;
      this.sweepA.position.set(x, 0.55, 0.32); this.sweepB.position.set(x - 0.05, 0.4, -0.4);
      this.sweepA.intensity = 5 * k; this.sweepB.intensity = 2.5 * k;
    } else { this.sweepU.k.value = 0; this.sweepA.intensity = this.sweepB.intensity = 0; }
  }
}
