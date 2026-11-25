// =============================================================
//  CITY — V3 cyberpunk layer for 2030 Myeongdong
//  · high-rise towers behind the street buildings (setbacks,
//    curtain-wall glass, metal frames, rooftop gear, antennas)
//  · cyan edge neon on building corners, magenta / violet
//    crowns and floor bands, huge vertical Korean signs
//  · neon light spill on facades (additive gradient cards)
//  · overhead wires across the street
//  · depth haze sheets (fade near the camera, never pop)
//  All geometry is merged into the city's existing per-material
//  lists, so the draw-call count only grows by 3 meshes.
// =============================================================
import * as THREE from 'three';
import { Atlas, rng, canvas } from '../textures.js';

const Y = new THREE.Vector3(0, 1, 0);

export function quad(p0, p1, p2, p3, uv = [0, 0, 1, 0, 1, 1, 0, 1]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...p0, ...p1, ...p2, ...p0, ...p2, ...p3]), 3));
  const n = new THREE.Vector3().subVectors(new THREE.Vector3(...p1), new THREE.Vector3(...p0))
    .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...p3), new THREE.Vector3(...p0))).normalize();
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([...n, ...n, ...n, ...n, ...n, ...n]), 3));
  const [a, b, c, d, e, f, h, i] = uv;
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([a, b, c, d, e, f, a, b, e, f, h, i]), 2));
  return g;
}
const rUV = (r) => [r.u0, r.v0, r.u1, r.v0, r.u1, r.v1, r.u0, r.v1];
function tint(g, color, k = 1) {
  const c = new THREE.Color(color).multiplyScalar(k);
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function solidBox(w, h, d, m, color) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.applyMatrix4(m); g.deleteAttribute('uv');
  return tint(g, color);
}

// ---------------- curtain-wall texture (repeat: 12 m wide × 12.8 m = 4 floors)
export function towerTexture(maxAniso = 8) {
  const at = new Atlas(512, 512, { pad: 0 });
  const g = at.cc, e = at.ec, r = rng(311);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#1a2440'); grd.addColorStop(1, '#0e1326');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  e.fillStyle = '#000'; e.fillRect(0, 0, 512, 512);
  const cols = 8, rows = 4, cw = 512 / cols, rh = 512 / rows;
  for (let f = 0; f < rows; f++) {
    const floorLit = r() < 0.3;
    for (let c = 0; c < cols; c++) {
      const x = c * cw, y = f * rh;
      // glass pane with a faint sky/neon gradient reflection
      const pg = g.createLinearGradient(x, y, x + cw, y + rh);
      pg.addColorStop(0, `rgba(${40 + r() * 30},${50 + r() * 40},${90 + r() * 60},0.35)`);
      pg.addColorStop(1, 'rgba(10,12,24,0.0)');
      g.fillStyle = pg; g.fillRect(x + 3, y + 10, cw - 6, rh - 22);
      e.fillStyle = 'rgb(16,0,0)'; e.fillRect(x + 3, y + 10, cw - 6, rh - 22);   // faint glass body so the tower reads as a volume
      const lit = floorLit ? r() < 0.42 : r() < 0.07;
      if (lit) {
        const pal = ['#d7e6ff', '#bfe9ff', '#ffe6c4', '#d3b8ff', '#9fe8ff'];
        g.fillStyle = pal[Math.floor(r() * pal.length)];
        g.globalAlpha = 0.35 + r() * 0.3; g.fillRect(x + 4, y + 12, cw - 8, rh - 26); g.globalAlpha = 1;
        e.fillStyle = `rgb(${30 + r() * 50},0,0)`; e.fillRect(x + 4, y + 12, cw - 8, rh - 26);
        // blinds / interior variation
        g.fillStyle = 'rgba(10,10,20,0.35)';
        for (let k = 0; k < 4; k++) g.fillRect(x + 4, y + 14 + k * (rh - 28) / 4, cw - 8, 2);
      }
    }
    // spandrel (floor slab) band: metal panel + a faint floor light line
    g.fillStyle = '#151a28'; g.fillRect(0, f * rh + rh - 14, 512, 14);
    g.fillStyle = '#2a3348'; g.fillRect(0, f * rh + rh - 14, 512, 2);
    if (r() < 0.5) { g.fillStyle = '#6fd8ff'; g.fillRect(0, f * rh + rh - 6, 512, 1.5); e.fillStyle = 'rgb(70,0,0)'; e.fillRect(0, f * rh + rh - 6, 512, 1.5); }
  }
  // mullions
  g.fillStyle = '#2c3650';
  for (let c = 0; c <= cols; c++) g.fillRect(c * cw - 2, 0, 4, 512);
  const tex = at.toTexture(maxAniso);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---------------- metal panel texture for tower side walls (repeat 12 × 12.8 m)
export function panelTexture() {
  const at = new Atlas(256, 256, { pad: 0 });
  const g = at.cc, e = at.ec, r = rng(97);
  g.fillStyle = '#16161d'; g.fillRect(0, 0, 256, 256);
  e.fillStyle = '#000'; e.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 64) {
    const v = 20 + r() * 12; g.fillStyle = `rgb(${v},${v},${v + 8})`; g.fillRect(x + 1, y + 1, 62, 30);
  }
  // a few small windows / service lights
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(r() * 8) * 32 + 10, y = Math.floor(r() * 8) * 32 + 10;
    const lit = r() < 0.35;
    g.fillStyle = lit ? '#ffd9a6' : '#0a0c14'; g.fillRect(x, y, 12, 12);
    if (lit) { e.fillStyle = 'rgb(90,0,0)'; e.fillRect(x, y, 12, 12); }
  }
  const tex = at.toTexture(4);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---------------- radial spill texture (white → transparent)
export function spillTexture() {
  const c = canvas(128, 128), g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------- towers along both main streets
export function buildTowers(city) {
  const r = rng(4711), L = city.lists;
  const sides = [
    { O: new THREE.Vector3(5.5, 0, 0), N: new THREE.Vector3(-1, 0, 0), s0: -64, s1: 176, gap: [-2, 14] },
    { O: new THREE.Vector3(-5.5, 0, 0), N: new THREE.Vector3(1, 0, 0), s0: -64, s1: 176, gap: [-14, 2] },
  ];
  const EDGE = ['cyan', 'cyan', 'cyan', 'cyan', 'indigo', 'violet'];
  const CROWN = ['magenta', 'violet', 'magenta', 'cyan', 'violet', 'pink'];
  for (const S of sides) {
    const U = new THREE.Vector3().crossVectors(S.N.clone().negate(), Y);
    const P = (u, n, y) => S.O.clone().addScaledVector(U, u).addScaledVector(S.N, n).addScaledVector(Y, y).toArray();
    let s = S.s0;
    while (s < S.s1) {
      const w = 11 + r() * 13;
      let a = s, b = s + w;
      s = b + 1.5 + r() * 4;
      if (b > S.gap[0] && a < S.gap[1]) { s = S.gap[1] + 0.5; continue; }
      const dist = Math.abs((a + b) / 2) ;          // further down the street → can be taller
      const nF = -(13.5 + r() * 6);                // front face (behind the 12 m deep street buildings)
      const depth = 14 + r() * 12;
      const H = 34 + r() * 60 + Math.min(60, dist * 0.35) * r();
      const h1 = H * (0.5 + r() * 0.2);
      const uo = r() * 12;
      // lower block
      box(city, P, a, b, nF, nF - depth, 0, h1, uo, r() < 0.7 ? 'glass' : 'panel');
      // upper block (setback)
      const ia = 1 + r() * 2.5, ib = 1 + r() * 2.5, inF = 1.5 + r() * 2.5;
      box(city, P, a + ia, b - ib, nF - inF, nF - depth + 1.5, h1, H, uo + 3, 'glass');
      // setback ledge: dark metal lip + light line
      L.dark.push(solidBox(b - a, 0.5, 0.5, mat(P, (a + b) / 2, h1 + 0.25, nF - 0.25, U, S.N), '#1b1d26'));
      // corner edge neon (vertical, both street-side corners, on front and side faces)
      const ec = EDGE[Math.floor(r() * EDGE.length)];
      const ew = 0.22;
      const edge = (u, n, y0, y1, dir) => {
        if (r() > 0.82) return;
        L.sign.push(quad(P(u, n + 0.03, y0), P(u + dir * ew, n + 0.03, y0), P(u + dir * ew, n + 0.03, y1), P(u, n + 0.03, y1), rUV(city.solidRect[ec])));
        L.sign.push(quad(P(u - dir * 0.03, n, y0), P(u - dir * 0.03, n - ew, y0), P(u - dir * 0.03, n - ew, y1), P(u - dir * 0.03, n, y1), rUV(city.solidRect[ec])));
      };
      edge(a, nF, 2, h1, 1); edge(b - ew, nF, 2, h1, 1);
      edge(a + ia, nF - inF, h1, H, 1); edge(b - ib - ew, nF - inF, h1, H, 1);
      // crown + floor bands
      const cc = CROWN[Math.floor(r() * CROWN.length)];
      const band = (u0, u1, n, y, t, col) => L.sign.push(quad(P(u0, n + 0.04, y), P(u1, n + 0.04, y), P(u1, n + 0.04, y + t), P(u0, n + 0.04, y + t), rUV(city.solidRect[col])));
      if (r() < 0.75) band(a + ia, b - ib, nF - inF, H - 0.9, 0.28, cc);
      if (r() < 0.55) band(a, b, nF, h1 - 0.7, 0.2, cc);
      if (r() < 0.35) for (let y = 12.8; y < h1 - 2; y += 12.8) band(a + 0.3, b - 0.3, nF, y, 0.06, 'indigo');
      // huge vertical sign (Korean) near the street-side corner
      if (r() < 0.5 && h1 > 16) {
        const sw = 1.6 + r() * 1.2, sh = Math.min(h1 - 8, 9 + r() * 12);
        const y0 = 6 + r() * Math.max(0, h1 - sh - 8);
        const u = r() < 0.5 ? a + 1.2 : b - 1.2 - sw, n = nF + 0.9;
        const rr = city.paintSign(sw * 0.42, sh * 0.42, r, 'blade');
        const si = city._lastSign;
        L.sign.push(quad(P(u, n, y0), P(u + sw, n, y0), P(u + sw, n, y0 + sh), P(u, n, y0 + sh), rUV(rr)));
        L.dark.push(solidBox(sw + 0.2, sh + 0.2, 0.25, mat(P, u + sw / 2, y0 + sh / 2, n - 0.14, U, S.N), '#0d0d12'));
        L.dark.push(solidBox(0.08, 0.08, 0.9, mat(P, u + sw / 2, y0 + sh - 0.6, nF + 0.45, U, S.N), '#2a2a30'));
        spill(city, P, u + sw / 2, nF + 0.05, y0 + sh / 2, sw * 4.5, sh * 1.35, si.col, 0.42);
      }
      // rooftop: frame, tanks, antennas with aviation light
      const top = H;
      if (r() < 0.6) L.dark.push(solidBox((b - a) * 0.5, 2.4, 4, mat(P, a + (b - a) * (0.3 + r() * 0.4), top + 1.2, nF - inF - 4, U, S.N), '#1a1a20'));
      const nA = 1 + Math.floor(r() * 3);
      for (let k = 0; k < nA; k++) {
        const ah = 5 + r() * 14, u = a + ia + 1 + r() * Math.max(0.5, b - a - ia - ib - 2), n = nF - inF - 2 - r() * 6;
        L.dark.push(solidBox(0.18, ah, 0.18, mat(P, u, top + ah / 2, n, U, S.N), '#2b2b33'));
        L.sign.push(quad(P(u - 0.25, n + 0.1, top + ah), P(u + 0.25, n + 0.1, top + ah), P(u + 0.25, n + 0.1, top + ah + 0.5), P(u - 0.25, n + 0.1, top + ah + 0.5), rUV(city.solidRect[r() < 0.7 ? 'pink' : 'white'])));
      }
      // façade-wide neon spill from the street (cool from below)
      spill(city, P, (a + b) / 2, nF + 0.08, 4, (b - a) * 1.2, 14, r() < 0.5 ? '#3a8dff' : '#b04dff', 0.16);
    }
  }
}

function mat(P, u, y, n, U, N) {
  const m = new THREE.Matrix4().makeBasis(U, Y, N);
  m.setPosition(new THREE.Vector3(...P(u, n, y)));
  return m;
}

function box(city, P, a, b, nF, nB, y0, y1, uo, kind) {
  const L = city.lists;
  const list = kind === 'glass' ? L.tower : L.panel;
  const tu = (u) => (u + uo) / 12, tv = (y) => y / 12.8;
  // front (faces the street)
  list.push(quad(P(a, nF, y0), P(b, nF, y0), P(b, nF, y1), P(a, nF, y1), [tu(a), tv(y0), tu(b), tv(y0), tu(b), tv(y1), tu(a), tv(y1)]));
  // sides
  const d = Math.abs(nB - nF);
  L.panel.push(quad(P(a, nB, y0), P(a, nF, y0), P(a, nF, y1), P(a, nB, y1), [0, tv(y0), d / 12, tv(y0), d / 12, tv(y1), 0, tv(y1)]));
  L.panel.push(quad(P(b, nF, y0), P(b, nB, y0), P(b, nB, y1), P(b, nF, y1), [0, tv(y0), d / 12, tv(y0), d / 12, tv(y1), 0, tv(y1)]));
  // roof
  L.roof.push(quad(P(a, nF, y1), P(b, nF, y1), P(b, nB, y1), P(a, nB, y1), [0, 0, (b - a) / 8, 0, (b - a) / 8, d / 8, 0, d / 8]));
  // vertical metal fins on the curtain wall (depth + rhythm)
  if (kind === 'glass') {
    const step = 3;
    for (let u = a + step; u < b - 0.5; u += step) {
      const m = new THREE.Matrix4().makeBasis(new THREE.Vector3().fromArray(P(1, 0, 0)).sub(new THREE.Vector3().fromArray(P(0, 0, 0))), Y,
        new THREE.Vector3().fromArray(P(0, 1, 0)).sub(new THREE.Vector3().fromArray(P(0, 0, 0))));
      m.setPosition(new THREE.Vector3(...P(u, nF + 0.12, (y0 + y1) / 2)));
      L.dark.push(solidBox(0.12, y1 - y0, 0.24, m, '#20263a'));
    }
  }
}

export function spill(city, P, u, n, y, w, h, color, k) {
  city.lists.spill.push(tint(quad(P(u - w / 2, n, y - h / 2), P(u + w / 2, n, y - h / 2), P(u + w / 2, n, y + h / 2), P(u - w / 2, n, y + h / 2)), color, k));
}

// ---------------- overhead wires across the street (catenaries) + a few with bulbs
export function buildWires(city) {
  const r = rng(808), L = city.lists;
  for (let z = 62; z > -166; z -= 2.4 + r() * 3.8) {
    if (z < 13.5 && z > -1.5) continue;
    const n = 1 + (r() < 0.55 ? 1 : 0) + (r() < 0.3 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const y0 = 5.6 + r() * 9, y1 = Math.max(5.2, y0 + (r() - 0.5) * 3), dz = (r() - 0.5) * 4, sag = 0.5 + r() * 1.6;
      const zz = z + (r() - 0.5) * 1.2;
      const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-5.45, y0, zz), new THREE.Vector3(0, Math.min(y0, y1) - sag * 2, zz + dz / 2), new THREE.Vector3(5.45, y1, zz + dz));
      const tg = new THREE.TubeGeometry(c, 14, 0.014 + r() * 0.01, 3, false).toNonIndexed();
      tg.deleteAttribute('uv');
      L.dark.push(tint(tg, '#07070a'));
      // a few strings of warm / neon bulbs (Myeongdong street-food alleys)
      if (r() < 0.16) {
        const col = r() < 0.6 ? 'amber' : (r() < 0.5 ? 'magenta' : 'cyan');
        for (let i = 1; i < 12; i++) {
          const p = c.getPoint(i / 12);
          const s = 0.07;
          L.sign.push(quad([p.x - s, p.y - 0.12, p.z], [p.x + s, p.y - 0.12, p.z], [p.x + s, p.y - 0.12 + 2 * s, p.z], [p.x - s, p.y - 0.12 + 2 * s, p.z], rUV(city.solidRect[col])));
          L.sign.push(quad([p.x, p.y - 0.12, p.z + s], [p.x, p.y - 0.12, p.z - s], [p.x, p.y - 0.12 + 2 * s, p.z - s], [p.x, p.y - 0.12 + 2 * s, p.z + s], rUV(city.solidRect[col])));
        }
      }
    }
  }
}

// ---------------- depth haze: soft sheets across the canyon, faded near the camera
export function buildHaze(city) {
  const r = rng(55);
  const geos = [];
  const cols = [[0.35, 0.18, 0.75], [0.12, 0.3, 0.7], [0.55, 0.12, 0.5], [0.25, 0.16, 0.6]];
  for (let z = 50; z > -170; z -= 7 + r() * 6) {
    if (z < 14 && z > -2) continue;
    const g = new THREE.PlaneGeometry(13, 34, 1, 1).toNonIndexed();
    g.translate((r() - 0.5) * 2, 17 - 1.5, z);
    const c = cols[Math.floor(r() * cols.length)], k = 0.6 + r() * 0.6;
    tint(g, new THREE.Color(c[0] * k, c[1] * k, c[2] * k));
    geos.push(g);
  }
  // a few low, wider glows near the far end (light pollution of the strip)
  for (const z of [-120, -150, -175]) {
    const g = new THREE.PlaneGeometry(60, 60, 1, 1).toNonIndexed();
    g.translate(0, 18, z); tint(g, new THREE.Color(0.5, 0.18, 0.7)); geos.push(g);
  }
  return geos;
}

export function hazeMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uDim: { value: 1 }, uK: { value: 0.07 } },
    vertexShader: /* glsl */`
      attribute vec3 color; varying vec3 vC; varying vec2 vUv; varying float vD;
      void main(){ vC = color; vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`
      uniform float uDim, uK; varying vec3 vC; varying vec2 vUv; varying float vD;
      void main(){
        float x = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0);
        float y = smoothstep(0.0, 0.18, vUv.y) * pow(1.0 - vUv.y, 1.6);
        float near = smoothstep(5.0, 22.0, vD) * (1.0 - smoothstep(160.0, 260.0, vD));
        gl_FragColor = vec4(vC * x * y * near * uK * uDim, 1.0);
      }`,
  });
}

// =============================================================
//  V5 — large white holograms mounted on two façades + a full moon
// =============================================================
// Abstract light sculpture (no lettering): flowing contour rings around a soft core, fine
// vertical filaments and a broken light frame — cool white / silver-blue, additive, with a
// very slow breathing and drift. Fades out near the camera so it never fills the frame.
export function hologramMaterial(timeU) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: timeU, uDim: { value: 1 }, uK: { value: 1.45 }, uSeed: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec2 vUv; varying float vD;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`
      uniform float uT, uDim, uK, uSeed; varying vec2 vUv; varying float vD;
      float line(float x, float w){ return pow(max(0.0, 1.0 - abs(fract(x) - 0.5) * 2.0), w); }
      void main(){
        float t = uT * 0.6 + uSeed * 10.0;
        vec2 p = vUv - 0.5; p.y *= 1.45;                       // panel is taller than wide
        float r = length(p), a = atan(p.y, p.x);
        float wave = r * 13.0 - t * 0.22 + 0.55 * sin(3.0 * a + t * 0.11) + 0.35 * sin(p.y * 5.0 + t * 0.17);
        float rings = line(wave, 9.0) * smoothstep(0.5, 0.1, r);
        float core = exp(-r * r * 20.0) * 0.32;
        float glass = 0.07 + 0.05 * smoothstep(0.6, 0.0, r);                 // faint light-glass body so the panel reads
        float fil = line(p.x * 26.0 + 0.25 * sin(p.y * 4.0 + t * 0.15), 40.0) * smoothstep(0.42, 0.05, abs(p.x)) * smoothstep(0.75, 0.2, abs(p.y)) * 0.28;
        // broken light frame (corner brackets)
        vec2 e = min(vUv, 1.0 - vUv);
        float edge = smoothstep(0.012, 0.0, min(e.x, e.y));
        float corner = step(0.82, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0) ;
        float frame = edge * mix(0.25, 1.0, corner);
        float scan = 0.86 + 0.14 * sin(vUv.y * 520.0);
        float breathe = 0.78 + 0.22 * sin(uT * 0.45 + uSeed * 3.0);
        vec3 c = vec3(0.84, 0.92, 1.0) * (rings * 0.95 + core + fil + glass) * scan * breathe + vec3(0.7, 0.84, 1.0) * frame * 1.2;
        float near = smoothstep(5.0, 13.0, vD);
        gl_FragColor = vec4(c * uK * uDim * near, 1.0);
      }`,
  });
}

// two holograms on main façades. They project OUT from the wall over the sidewalk (like the
// blade signs), so a camera looking down the street sees their face, not their edge.
export function buildHolograms(city) {
  const L = city.lists, out = [];
  const defs = [
    { O: new THREE.Vector3(5.5, 0, 0), N: new THREE.Vector3(-1, 0, 0), u: -38, n0: 0.7, n1: 4.3, y0: 6.6, h: 8.4, seed: 0.1 },
    { O: new THREE.Vector3(-5.5, 0, 0), N: new THREE.Vector3(1, 0, 0), u: 70, n0: 0.7, n1: 4.5, y0: 7.2, h: 9.2, seed: 0.7 },
  ];
  for (const d of defs) {
    const U = new THREE.Vector3().crossVectors(d.N.clone().negate(), Y);
    const P = (u, n, y) => d.O.clone().addScaledVector(U, u).addScaledVector(d.N, n).addScaledVector(Y, y).toArray();
    const y1 = d.y0 + d.h, nm = (d.n0 + d.n1) / 2, w = d.n1 - d.n0;
    out.push({ geo: quad(P(d.u, d.n0, d.y0), P(d.u, d.n1, d.y0), P(d.u, d.n1, y1), P(d.u, d.n0, y1)), seed: d.seed });
    // structure tying it to the building: wall plate, two arms, projector rail with a cool light strip
    L.dark.push(solidBox(0.6, d.h + 1.0, 0.18, mat(P, d.u, d.y0 + d.h / 2, 0.09, U, d.N), '#17181e'));
    for (const y of [d.y0 - 0.18, y1 + 0.12]) L.dark.push(solidBox(0.12, 0.12, d.n1 + 0.1, mat(P, d.u, y, (d.n1 + 0.1) / 2, U, d.N), '#23242c'));
    L.dark.push(solidBox(0.32, 0.2, w + 0.2, mat(P, d.u, d.y0 - 0.32, nm, U, d.N), '#15161c'));
    for (const s of [-1, 1]) L.sign.push(quad(P(d.u + s * 0.17, d.n0, d.y0 - 0.25), P(d.u + s * 0.17, d.n1, d.y0 - 0.25), P(d.u + s * 0.17, d.n1, d.y0 - 0.18), P(d.u + s * 0.17, d.n0, d.y0 - 0.18), rUV(city.solidRect.cool)));
    // its light on the façade around the mount
    spill(city, P, d.u, 0.04, d.y0 + d.h / 2, 6.5, d.h * 1.3, '#dfeaff', 0.18);
  }
  return out;
}

// full moon: soft disc with faint maria and a wide halo, sitting low at the end of the street
export function buildMoon() {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    // drawn as part of the sky: first in the opaque pass, no depth, so every building in front covers it
    transparent: false, depthWrite: false, depthTest: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { uDim: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: /* glsl */`
      uniform float uDim; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = (vUv - 0.5) * 2.0; float r = length(p);
        float R = 0.28;                                         // disc radius (rest of the quad is halo)
        float disc = smoothstep(R, R - 0.006, r);
        vec2 q = p / R;
        float maria = n(q * 3.0 + 1.7) * 0.6 + n(q * 7.0) * 0.4;
        float limb = sqrt(max(0.0, 1.0 - dot(q, q)));
        vec3 moon = vec3(0.86, 0.9, 1.0) * (0.72 + 0.28 * limb) * (1.0 - 0.22 * smoothstep(0.45, 0.75, maria));
        float halo = exp(-max(0.0, r - R) * 9.0) * 0.22 + exp(-max(0.0, r - R) * 2.6) * 0.06;
        vec3 c = moon * disc * 0.95 + vec3(0.62, 0.7, 1.0) * halo * (1.0 - disc);
        gl_FragColor = vec4(c * uDim, 1.0);
      }`,
  }));
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}
