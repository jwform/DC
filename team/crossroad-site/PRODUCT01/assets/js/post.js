// =============================================================
//  Post-processing: bloom + cinematic final pass (light-wipe
//  transitions, vignette, grain, chromatic aberration)
// =============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uFade: { value: 0 },
    uWipe: { value: 0 },
    uVignette: { value: 0.85 },
    uGrain: { value: 0.009 },
    uAberr: { value: 0.6 },
    uAlarm: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime, uFade, uWipe, uVignette, uGrain, uAberr, uAlarm;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 c = uv - 0.5;
      float r2 = dot(c,c);
      vec2 off = c * r2 * 0.012 * uAberr;
      vec3 col = vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);

      // ---- light-wipe transition (0..1 darkness sweeps in, 1..2 next world revealed)
      float d = uv.x * 0.82 + (1.0 - uv.y) * 0.18 + sin(uv.y * 7.0 + uv.x * 3.0) * 0.006;
      float vis = 1.0, edge = 0.0;
      if (uWipe > 0.001 && uWipe < 1.999) {
        if (uWipe <= 1.0) { float f = uWipe * 1.36 - 0.18; vis = smoothstep(f - 0.08, f, d); edge = exp(-abs(d - f) * 34.0) * smoothstep(0.0, 0.08, uWipe) * smoothstep(1.0, 0.92, uWipe); }
        else { float f = (uWipe - 1.0) * 1.36 - 0.18; vis = 1.0 - smoothstep(f, f + 0.08, d); edge = exp(-abs(d - f) * 34.0) * smoothstep(1.0, 1.08, uWipe) * smoothstep(2.0, 1.92, uWipe); }
      } else if (uWipe >= 1.0 && uWipe < 1.001) { vis = 0.0; }
      col *= vis;
      float streak = edge * (0.7 + 0.3 * sin(uv.y * 260.0 + uTime * 30.0));
      col += vec3(0.62, 0.30, 1.0) * streak * 2.2 + vec3(1.0, 0.92, 1.0) * pow(edge, 8.0) * 2.0;

      // alarm tint (problem scene)
      col = mix(col, col * vec3(1.15, 0.85, 0.95), uAlarm * 0.35);

      float v = smoothstep(0.95, 0.18, length(c * vec2(1.0, 1.15)));
      col *= mix(1.0, v, uVignette);
      col *= 1.0 - uFade;
      col += (hash(uv * uRes + fract(uTime) * 100.0) - 0.5) * uGrain * (0.4 + 0.6 * (1.0 - uFade));
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

// V4 — Sanitize: the scene renders into a half-float buffer. A single pixel that becomes
// NaN or +Inf there (e.g. an extreme specular highlight, > 65504 in half float) is spread by
// the bloom blur pyramid into large black rectangles (NaN * anything = NaN). This pass runs
// right after the scene render and before afterimage / bloom: NaN -> 0, Inf / huge -> 48.
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; varying vec2 vUv;
    // bit-level test: robust even where the GPU compiler uses fast-math (isnan may be optimised away)
    float fin(float v){ uint e = (floatBitsToUint(v) >> 23u) & 0xFFu; return e == 0xFFu ? 0.0 : clamp(v, 0.0, 48.0); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      bool bad = ((floatBitsToUint(c.r) >> 23u) & 0xFFu) == 0xFFu && (floatBitsToUint(c.r) & 0x7FFFFFu) != 0u;
      bad = bad || (((floatBitsToUint(c.g) >> 23u) & 0xFFu) == 0xFFu && (floatBitsToUint(c.g) & 0x7FFFFFu) != 0u);
      bad = bad || (((floatBitsToUint(c.b) >> 23u) & 0xFFu) == 0xFFu && (floatBitsToUint(c.b) & 0x7FFFFFu) != 0u);
      vec3 o = bad ? vec3(0.0) : vec3(fin(c.r), fin(c.g), fin(c.b));
      // +Inf (exponent all ones, mantissa 0) -> treat as a very bright, finite value
      if (!bad) o = mix(o, vec3(48.0), vec3(
        float(((floatBitsToUint(c.r) >> 23u) & 0xFFu) == 0xFFu),
        float(((floatBitsToUint(c.g) >> 23u) & 0xFFu) == 0xFFu),
        float(((floatBitsToUint(c.b) >> 23u) & 0xFFu) == 0xFFu)));
      gl_FragColor = vec4(o, 1.0);
    }`,
};

export function createPost(renderer, w, h) {
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 0 });
  const composer = new EffectComposer(renderer, rt);
  const dummyScene = new THREE.Scene();
  const dummyCam = new THREE.PerspectiveCamera();
  const mainPass = new RenderPass(dummyScene, dummyCam);
  const overlayPass = new RenderPass(dummyScene, dummyCam);
  overlayPass.clear = false;
  overlayPass.clearDepth = true;
  overlayPass.enabled = false;
  const afterimage = new AfterimagePass(0.8);   // file B: light afterimages while the intro vortex spins
  afterimage.enabled = false;
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.9, 0.55, 0.82);
  const final = new ShaderPass(FinalShader);
  const output = new OutputPass();
  composer.addPass(mainPass);
  composer.addPass(overlayPass);
  composer.addPass(new ShaderPass(SanitizeShader));
  composer.addPass(afterimage);
  composer.addPass(bloom);
  composer.addPass(final);
  composer.addPass(output);
  return { composer, mainPass, overlayPass, afterimage, bloom, final };
}
