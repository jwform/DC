// =============================================================
//  Wet reflective ground (planar reflection + procedural shading)
//  MODE_CITY  : Myeongdong pavers, neon light pools, device glow,
//               detection ripples, lane chevrons, ambulance light
//  MODE_STUDIO: dark glossy studio floor with LED glow
// =============================================================
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const vert = /* glsl */`
  uniform mat4 textureMatrix;
  varying vec4 vUvR;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main(){
    vUvR = textureMatrix * vec4(position, 1.0);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const frag = /* glsl */`
  uniform vec3 color;
  uniform sampler2D tDiffuse;
  uniform sampler2D tTile;
  uniform sampler2D tLight;
  uniform vec4 uLightRect;
  uniform float uTime, uReflect, uBlur, uDetect, uLane, uSiren, uSirenK, uDim, uEdge;
  uniform vec3 uAmb;          // x, z, on
  uniform vec4 uRow;          // rowX, zStart, pitch, count
  uniform vec4 uRowGlow;      // standby, deploy, ripple-unused, scanZ
  uniform float uScan;
  uniform vec4 uDev;          // studio: strip, warn, ind, open
  varying vec4 vUvR;
  varying vec3 vWorld;
  #include <fog_pars_fragment>

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  const vec3 PURPLE = vec3(0.62, 0.28, 1.0);

  vec3 reflection(float wet, vec2 jitter){
    vec4 uvp = vUvR; uvp.xy += jitter * uvp.w;
    vec3 acc = vec3(0.0); float tot = 0.0;
  #ifdef MODE_CITY
    // V3: long vertical streaks (wet asphalt) — wider in damp areas, tighter in puddles
    float blur = mix(uBlur * 1.6, uBlur * 0.55, wet);
  #else
    float blur = mix(uBlur, uBlur*0.25, wet);
  #endif
    for (int i = 0; i < 7; i++){
      float o = (float(i) - 3.0) / 3.0;
      float wgt = 1.0 - abs(o) * 0.7;
      vec4 u = uvp; u.y += o * blur * u.w; u.x += o * blur * 0.15 * u.w;
      vec3 smp = texture2DProj(tDiffuse, u).rgb;
      // V4: never let a NaN / Inf reflection texel through (bit test, safe under fast-math)
      uvec3 bits = (floatBitsToUint(smp) >> 23u) & 0xFFu;
      if (any(equal(bits, uvec3(0xFFu)))) smp = vec3(0.0);
      acc += clamp(smp, 0.0, 48.0) * wgt; tot += wgt;
    }
    return acc / tot;
  }

  void main(){
    vec3 p = vWorld;
    vec3 V = normalize(cameraPosition - p);
    float fres = 0.18 + 0.82 * pow(1.0 - max(V.y, 0.0), 4.0);

  #ifdef MODE_CITY
    float wet = smoothstep(0.36, 0.7, vnoise(p.xz * 0.22) * 0.75 + vnoise(p.xz * 1.1) * 0.35);
    vec2 jitter = (vec2(vnoise(p.xz * 4.0), vnoise(p.xz * 4.0 + 17.3)) - 0.5) * mix(0.006, 0.0015, wet);
    jitter.x += (vnoise(vec2(p.x * 9.0, p.z * 0.35)) - 0.5) * mix(0.007, 0.002, wet);   // streak break-up
    float rough = vnoise(p.xz * 2.3 + 5.0);                                             // varied roughness
    vec3 tile = texture2D(tTile, p.xz / 4.0).rgb;
    vec2 luv = (p.xz - uLightRect.xy) / uLightRect.zw;
    vec3 lmap = texture2D(tLight, luv).rgb;
    vec3 base = tile * (0.05 + lmap * 1.35) * mix(1.0, 0.55, wet);

    // ---- device rows: glow, ripples, install scan
    float ax = abs(p.x);
    float zEnd = uRow.y - uRow.z * (uRow.w - 1.0) - 1.4;
    float zc = clamp(p.z, zEnd, uRow.y + 1.4);
    float dRow = length(vec2(ax - uRow.x, p.z - zc));
    float rowMask = exp(-dRow * 2.4);
    vec3 glow = PURPLE * rowMask * (uRowGlow.x * 0.8 + uRowGlow.y * 1.0);
    // detection ripples from every device
    float k = clamp(floor((uRow.y - p.z) / uRow.z + 0.5), 0.0, uRow.w - 1.0);
    float zi = uRow.y - k * uRow.z;
    float r = length(vec2(ax - uRow.x, (p.z - zi) * 0.8));
    float ph = fract(uTime * 0.55 + k * 0.07);
    float ring = exp(-abs(r - ph * 3.2) * 9.0) * (1.0 - ph) * smoothstep(0.1, 0.4, r);
    glow += PURPLE * ring * uDetect * 1.6;
    // install scan band travelling down the rows
    float band = exp(-abs(p.z - uRowGlow.w) * 1.2) * exp(-abs(ax - uRow.x) * 1.4);
    glow += mix(PURPLE, vec3(1.0), 0.3) * band * uScan * 2.2;
    // emergency lane chevrons
    if (ax < 1.7 && p.z < uRow.y + 2.0 && p.z > zEnd) {
      float f = fract(-p.z / 2.4 + ax * 0.42 + uTime * 0.35);
      float chev = smoothstep(0.0, 0.04, f) * smoothstep(0.16, 0.09, f) * smoothstep(1.6, 1.1, ax);
      glow += PURPLE * chev * uLane * 0.9;
      float edgeL = exp(-abs(ax - 1.85) * 18.0);
      glow += PURPLE * edgeL * uLane * 0.6;
    }
    // street-edge neon lines (cyan-blue left, magenta right) along the shopfronts
    float edgeZ = step(-168.0, p.z) * step(p.z, 62.0) * (1.0 - step(-0.5, p.z) * step(p.z, 12.5));
    float edgeL = exp(-abs(ax - 4.85) * 26.0) + exp(-abs(ax - 4.85) * 4.0) * 0.18;
    glow += mix(vec3(0.22, 0.55, 1.0), vec3(0.95, 0.22, 0.95), step(0.0, p.x)) * edgeL * edgeZ * uEdge * 0.9;   // V5: softer painted lines, more real reflection
    // ambulance headlights & siren
    float dz = p.z - (uAmb.y + 2.9);
    if (dz > 0.0) {
      float lat = abs(p.x - uAmb.x);
      float cone = smoothstep(0.95 + dz * 0.3, 0.35 + dz * 0.14, lat) * exp(-dz * 0.08) * smoothstep(0.0, 1.2, dz);
      glow += vec3(1.0, 0.95, 0.88) * cone * uAmb.z * 0.45;
    }
    float sr = length(p.xz - uAmb.xy);
    glow += mix(vec3(1.0, 0.05, 0.08), vec3(0.1, 0.25, 1.0), uSiren) * exp(-sr * 0.3) * uSirenK * 0.75;   // V5: flashes with the light bar

    vec3 refl = reflection(wet, jitter) * mix(0.16, 0.95, wet) * mix(0.75, 1.0, rough) * uReflect * fres;
    // V5: wet sparkle — tiny glints that only light up where a real reflection is bright
    vec2 gc = floor(p.xz * 38.0);
    float glint = step(0.986, fract(sin(dot(gc, vec2(12.9898, 78.233))) * 43758.5453));
    glint *= 0.5 + 0.5 * sin(uTime * 2.3 + gc.x * 1.7 + gc.y * 2.9);
    refl *= 1.0 + glint * wet * 2.6;
    vec3 col = base + glow * mix(0.6, 1.0, wet) + refl;
    col *= uDim;
  #else
    // ---- studio floor
    float wet = 0.6 + 0.4 * vnoise(p.xz * 2.0);
    vec2 jitter = (vec2(vnoise(p.xz * 6.0), vnoise(p.xz * 6.0 + 9.1)) - 0.5) * 0.004;
    float rr = length(p.xz * vec2(0.55, 0.9));
    vec3 base = color * (0.7 + 0.6 * exp(-rr * 0.9));
    // LED glow pools
    float ax = abs(p.x);
    float dStrip = length(vec2(max(abs(p.x + 0.05) - 0.74, 0.0), p.z));
    float stripG = exp(-dStrip * 5.5) * uDev.x;
    float dWarn = length(vec2(ax - 1.13, p.z * 0.9));
    float warnG = exp(-dWarn * 4.5) * (uDev.y + uDev.z * 0.25);
    vec3 glow = PURPLE * (stripG * 0.9 + warnG * 1.1);
    vec3 refl = reflection(wet, jitter) * uReflect * fres;
    vec3 col = base + glow + refl;
    col = mix(vec3(0.0032, 0.0026, 0.0045), col, smoothstep(9.0, 2.5, rr)) * uDim;
  #endif
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }`;

export function createGround({ mode = 'city', size = [120, 260], center = [0, 0], res = 512, tile = null, light = null, lightRect = null }) {
  const geo = new THREE.PlaneGeometry(size[0], size[1]);
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      color: { value: new THREE.Color(0.012, 0.011, 0.016) },
      tDiffuse: { value: null }, textureMatrix: { value: null },
      tTile: { value: null }, tLight: { value: null },
      uLightRect: { value: new THREE.Vector4(-60, -175, 120, 250) },
      uTime: { value: 0 }, uReflect: { value: 1 }, uBlur: { value: 0.03 }, uDetect: { value: 0 }, uLane: { value: 0 },
      uSiren: { value: 0 }, uSirenK: { value: 0 }, uDim: { value: 1 }, uEdge: { value: 1 },
      uAmb: { value: new THREE.Vector3(0, -200, 0) },
      uRow: { value: new THREE.Vector4(2.1, -4, 3.35, 12) },
      uRowGlow: { value: new THREE.Vector4(0, 0, 0, 100) },
      uScan: { value: 0 },
      uDev: { value: new THREE.Vector4(0, 0, 0, 0) },
    },
  ]);
  const mirror = new Reflector(geo, {
    textureWidth: res, textureHeight: res, clipBias: 0.0005, multisample: 0,
    shader: { name: 'WetGround', uniforms, vertexShader: vert, fragmentShader: frag },
  });
  const m = mirror.material;
  m.defines = mode === 'city' ? { MODE_CITY: '' } : {};
  m.fog = true;
  m.uniforms.tTile.value = tile;
  m.uniforms.tLight.value = light;
  if (lightRect) m.uniforms.uLightRect.value.set(...lightRect);
  if (mode !== 'city') { m.uniforms.color.value.set(0.010, 0.009, 0.014); m.uniforms.uBlur.value = 0.012; m.uniforms.uReflect.value = 0.55; }
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(center[0], 0, center[1]);
  mirror.renderOrder = -1;
  return mirror;
}
