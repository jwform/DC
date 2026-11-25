// =============================================================
//  CITY WORLD — 2030 Myeongdong at night
//  Procedurally generated commercial streets: varied buildings,
//  shopfront glass, Korean signage (horizontal + vertical blade
//  signs), AC units, pipes, overhead wires, lamps, rooftop gear,
//  wet reflective pavers, crowd, ambulance, device rows.
//  All static geometry is merged per material into a few draws.
// =============================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Atlas, rng, canvas, FONT, fitText } from '../textures.js';
import { createGround } from '../ground.js';
import { Crowd } from '../people.js';
import { Ambulance } from '../ambulance.js';
import { DeviceArray, makeDeviceMaterials } from '../device.js';
import { buildTowers, buildWires, buildHaze, hazeMaterial, towerTexture, panelTexture, spillTexture, spill, buildHolograms, hologramMaterial, buildMoon } from './cityCyber.js';

const Y = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------
const SHOP_NAMES = [
  ['명동 화장품', 'COSMETICS'], ['약국', 'PHARMACY'], ['환전', 'EXCHANGE'], ['카페 2030', 'COFFEE'], ['분식', 'STREET FOOD'],
  ['안경', 'OPTICAL'], ['의류', 'FASHION'], ['신발', 'SHOES'], ['편의점', '24H'], ['노래방', 'KARAOKE'], ['한식당', 'KOREAN FOOD'],
  ['마스크팩', 'SKIN CARE'], ['스킨케어', 'BEAUTY'], ['기념품', 'SOUVENIR'], ['떡볶이', 'TTEOKBOKKI'], ['호떡', 'HOTTEOK'],
  ['치킨', 'CHICKEN'], ['커피', 'ROASTERY'], ['네일', 'NAIL'], ['헤어', 'HAIR'], ['면세점', 'DUTY FREE'], ['렌즈', 'LENS'],
  ['액세서리', 'ACCESSORY'], ['김밥', 'GIMBAP'], ['만두', 'DUMPLING'], ['칼국수', 'NOODLE'], ['디저트', 'DESSERT'], ['약초 한방', 'HERB'],
  ['명동 스토어', 'STORE'], ['환전소', 'MONEY'], ['게스트하우스', 'GUEST HOUSE'], ['포토 스튜디오', 'PHOTO'], ['문구', 'STATIONERY'],
];
const BLADE = ['화장품', '약국', '노래방', '호텔', '안경원', '치과', '피부과', '한의원', '스파', '마사지', '환전', '카페', '사진관', '학원', 'PC방', '네일', '헤어', '식당', '갈비', '모텔', '당구장', '병원'];
const WINDOW_WORDS = ['2F', '3F', '네일', '피부관리', '안경', '헤어', '치과', '학원', '카페', '사무실', '임대', '속눈썹', '왁싱'];
// sign colours – purple deliberately rare; product owns purple
// V3: cyberpunk palette — magenta / violet / cyan lead, a few warm whites keep it Myeongdong
// V5: violet / hot pink / cyan / magenta / cool white
const SIGN_COLORS = ['#ff2fa8', '#9b5cff', '#38e1ff', '#ff3df0', '#e9f2ff', '#b47bff', '#5fd6ff', '#ff5ccf', '#c9b6ff', '#2fb8ff', '#ff2fa8', '#a35cff'];
const SHOP_LIGHT = ['#ffe2b8', '#fff4e0', '#ffd6a0', '#e8f0ff', '#ffe9d6', '#ffcfd8'];

// ---------------------------------------------------------------
function quadGeo(p0, p1, p2, p3, uv = [0, 0, 1, 0, 1, 1, 0, 1]) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array([...p0, ...p1, ...p2, ...p0, ...p2, ...p3].map((v) => v));
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const n = new THREE.Vector3().subVectors(new THREE.Vector3(...p1), new THREE.Vector3(...p0))
    .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...p3), new THREE.Vector3(...p0))).normalize();
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([...n, ...n, ...n, ...n, ...n, ...n]), 3));
  const [a, b, c, d, e, f, h, i] = uv;
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([a, b, c, d, e, f, a, b, e, f, h, i]), 2));
  return g;
}
const rectUV = (r, flip = false) => flip ? [r.u1, r.v0, r.u0, r.v0, r.u0, r.v1, r.u1, r.v1] : [r.u0, r.v0, r.u1, r.v0, r.u1, r.v1, r.u0, r.v1];

function solid(geo, matrix, color) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.applyMatrix4(matrix);
  g.deleteAttribute('uv');
  const c = new THREE.Color(color);
  const n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ===============================================================
// ---------------- V5 neon sign panel (no lettering)
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function neonPanel(g, X, Y, W, H, col, q, { vertical = false, cells = 0, shapes = 0, backlit = false } = {}) {
  const m = Math.min(W, H), cx = X + W / 2, cy = Y + H / 2;
  // housing: dark smoked glass
  g.fillStyle = '#060509'; g.fillRect(X, Y, W, H);
  const inset = m * 0.1;
  const ix = X + inset, iy = Y + inset, iw = W - inset * 2, ih = H - inset * 2;
  // acrylic diffuser lit from inside: brighter centre band, darker ends
  const gr = vertical ? g.createLinearGradient(ix, 0, ix + iw, 0) : g.createLinearGradient(0, iy, 0, iy + ih);
  const lo = backlit ? 0.45 : 0.22, hi = backlit ? 0.95 : 0.7;
  gr.addColorStop(0, rgba(col, lo)); gr.addColorStop(0.5, rgba(col, hi)); gr.addColorStop(1, rgba(col, lo));
  g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
  const rg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(iw, ih) * 0.55);
  rg.addColorStop(0, 'rgba(255,255,255,0.32)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg; g.fillRect(ix, iy, iw, ih);
  // modules: separate lit cells (like stacked Korean sign boxes), no characters
  if (cells > 1) {
    g.fillStyle = 'rgba(6,5,9,0.85)';
    for (let i = 1; i < cells; i++) {
      if (vertical) g.fillRect(ix, iy + ih * i / cells - m * 0.025, iw, m * 0.05);
      else g.fillRect(ix + iw * i / cells - m * 0.025, iy, m * 0.05, ih);
    }
    for (let i = 0; i < cells; i++) {            // each module a slightly different intensity
      const a = 0.05 + q() * 0.22;
      g.fillStyle = q() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      if (vertical) g.fillRect(ix, iy + ih * i / cells + m * 0.03, iw, ih / cells - m * 0.06);
      else g.fillRect(ix + iw * i / cells + m * 0.03, iy, iw / cells - m * 0.06, ih);
    }
  } else if (cells === 1) {
    // single band sign: a bright emblem block at one end + a long light bar
    const bw = Math.min(iw * 0.22, ih * 1.1);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(ix + ih * 0.15, iy + ih * 0.2, bw * 0.75, ih * 0.6);
    g.fillStyle = rgba(col, 0.9); g.fillRect(ix + bw + ih * 0.2, iy + ih * 0.42, iw - bw - ih * 0.5, ih * 0.16);
  }
  // abstract light graphics for holo / screen / billboard
  if (shapes === 1) {        // holographic frame: rings + bars
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = Math.max(1.5, m * 0.025);
    const R = m * 0.3, ox = ix + iw * 0.22;
    g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; g[i ? 'lineTo' : 'moveTo'](ox + Math.cos(a) * R, cy + Math.sin(a) * R); } g.stroke();
    g.beginPath(); g.arc(ox, cy, R * 0.45, 0, 7); g.stroke();
    for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + i * 0.12})`; g.fillRect(ix + iw * 0.45, iy + ih * (0.3 + i * 0.16), iw * (0.45 - i * 0.1), ih * 0.06); }
  } else if (shapes >= 2) {  // digital screen / billboard: soft light orbs + sweeping arcs
    for (let i = 0; i < 6; i++) {
      const ox = ix + iw * q(), oy = iy + ih * q(), R = m * (0.15 + q() * 0.5);
      const og = g.createRadialGradient(ox, oy, 0, ox, oy, R);
      og.addColorStop(0, `rgba(255,255,255,${0.18 + q() * 0.2})`); og.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = og; g.fillRect(ix, iy, iw, ih);
    }
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, m * 0.012);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(ix + iw * (0.2 + q() * 0.6), iy + ih * 1.4, Math.max(iw, ih) * (0.6 + i * 0.18), Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  }
  // diffuser micro-lines (acrylic texture)
  g.fillStyle = 'rgba(0,0,0,0.12)';
  const step = Math.max(2, m * 0.05);
  if (vertical) for (let x = ix; x < ix + iw; x += step) g.fillRect(x, iy, 1, ih);
  else for (let y = iy; y < iy + ih; y += step) g.fillRect(ix, y, iw, 1);
  // inner acrylic bevel
  g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = Math.max(1, m * 0.015);
  g.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
  // neon tube border: coloured glow + white-hot core
  const t = Math.max(2, m * 0.055), o = m * 0.05;
  g.shadowColor = col; g.shadowBlur = m * 0.22;
  g.strokeStyle = col; g.lineWidth = t; g.strokeRect(X + o, Y + o, W - o * 2, H - o * 2);
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(1, t * 0.35); g.strokeRect(X + o, Y + o, W - o * 2, H - o * 2);
  // glass reflection streak
  g.fillStyle = 'rgba(255,255,255,0.07)';
  g.beginPath(); g.moveTo(X + W * 0.08, Y + H); g.lineTo(X + W * 0.2, Y + H); g.lineTo(X + W * 0.42, Y); g.lineTo(X + W * 0.3, Y); g.fill();
}

export class CityWorld {
  constructor(renderer, { quality = 'high', env, rig, mobile = false } = {}) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05040d);
    this.scene.fog = new THREE.FogExp2(0x0e0b24, 0.0115);   // V3: deep navy-violet haze
    this.scene.environment = null;
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.04, 900);
    this.env = env;
    this.mobile = mobile;
    const hi = quality === 'high';
    this.R = rng(2030);
    this.ppm = hi ? 15 : 9; this.shopPPM = hi ? 34 : 22; this.signPPM = hi ? 72 : 44;
    this.fac = new Atlas(hi ? 4096 : 2048, hi ? 4096 : 4096, { name: 'facade' });
    this.sig = new Atlas(hi ? 4096 : 2048, hi ? 4096 : 3072, { name: 'sign' });
    this.lists = { facade: [], wall: [], roof: [], dark: [], sign: [], holo: [], screen: [], canopy: [], tower: [], panel: [], spill: [] };
    this.stalls = []; this.spots = [];
    this.lightPools = [];

    this.buildSharedRects();
    this.buildStreets();
    buildTowers(this);          // V3: high-rise canyon behind the street buildings
    buildWires(this);           // V3: overhead wires across the street
    this._holoDefs = buildHolograms(this);   // V5: two large white holograms on façades
    this.buildFillers();
    this.buildStreetFurniture();
    this.buildSkyline();
    this.finishStatic();
    this.buildGround();
    this.buildLights();

    // dynamic actors
    this.crowd = new Crowd({ count: mobile ? 150 : 300, variants: mobile ? 8 : 14, envMap: env, spots: this.spots, stalls: this.stalls });
    this.scene.add(this.crowd.group);
    this.ambulance = new Ambulance(env);
    this.scene.add(this.ambulance.group);
    const dm = makeDeviceMaterials({ transmission: false });
    for (const k of ['metal', 'metalDark', 'acrylic']) { dm[k].envMap = env; }
    this.devMats = dm;
    const placements = [];
    for (let i = 0; i < 12; i++) {
      const z = -4 - i * 3.35;
      placements.push({ x: 2.1, z, rotY: -Math.PI / 2, order: i });
      placements.push({ x: -2.1, z, rotY: -Math.PI / 2, order: i });
    }
    this.devices = new DeviceArray(rig, dm, placements);
    this.scene.add(this.devices.group);
  }

  // ---------------- shared atlas rects
  buildSharedRects() {
    // AC unit grill
    const r = this.fac.alloc(96, 72); this.acRect = r;
    const g = this.fac.cc, e = this.fac.ec;
    g.fillStyle = '#b9b9b4'; g.fillRect(r.x, r.y, r.w, r.h);
    g.fillStyle = '#6d6d6a'; g.beginPath(); g.arc(r.x + r.w * 0.66, r.y + r.h / 2, r.h * 0.38, 0, 7); g.fill();
    g.strokeStyle = '#8d8d89'; g.lineWidth = 1;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(r.x + 4, r.y + 6 + i * 7); g.lineTo(r.x + r.w * 0.4, r.y + 6 + i * 7); g.stroke(); }
    e.fillStyle = '#000'; e.fillRect(r.x, r.y, r.w, r.h);
    // solid emissive rects in sign atlas (lamps, light strips)
    const s = this.sig;
    this.solidRect = {};
    for (const [k, c] of [['white', '#ffffff'], ['warm', '#ffd9a8'], ['amber', '#ffb04a'], ['cool', '#cfe6ff'], ['pink', '#ff5c9a'], ['blue', '#4d8dff'], ['dark', '#0b0b0e'], ['cyan', '#55dfff'], ['magenta', '#ff3dc8'], ['violet', '#a65cff'], ['indigo', '#5a6bff']]) {
      const rr = s.alloc(16, 16); s.cc.fillStyle = c; s.cc.fillRect(rr.x - 2, rr.y - 2, rr.w + 4, rr.h + 4);
      rr.u0 += 2 / s.w; rr.u1 -= 2 / s.w; rr.v0 += 2 / s.h; rr.v1 -= 2 / s.h; this.solidRect[k] = rr;
    }
  }

  // ---------------- facade texture painters
  paintFacade(w, h, style, r) {
    const ppm = this.ppm * style.res;
    const rect = this.fac.alloc(w * ppm, h * ppm);
    const g = this.fac.cc, e = this.fac.ec;
    const X = rect.x, Yp = rect.y, W = rect.w, H = rect.h;
    const k = W / w; // px per meter
    g.save(); e.save();
    g.beginPath(); g.rect(X, Yp, W, H); g.clip(); e.beginPath(); e.rect(X, Yp, W, H); e.clip();
    g.fillStyle = style.wall; g.fillRect(X, Yp, W, H);
    e.fillStyle = '#000'; e.fillRect(X, Yp, W, H);
    // subtle wall noise / tile lines
    if (style.type === 'tile' || style.type === 'brick') {
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
      const step = style.type === 'brick' ? 0.25 * k : 0.6 * k;
      for (let y = Yp; y < Yp + H; y += step) { g.beginPath(); g.moveTo(X, y); g.lineTo(X + W, y); g.stroke(); }
    }
    const floorH = 3.3 * k;
    const floors = Math.max(1, Math.floor(H / floorH));
    const bay = (style.type === 'glass' ? 1.5 : 1.9 + r() * 0.7) * k;
    const bays = Math.max(1, Math.round(W / bay));
    const bw = W / bays;
    for (let f = 0; f < floors; f++) {
      const fy = Yp + H - (f + 1) * floorH;
      const floorLit = r() < 0.55;
      const signWin = r() < 0.32;
      const word = WINDOW_WORDS[Math.floor(r() * WINDOW_WORDS.length)];
      const signCol = SIGN_COLORS[Math.floor(r() * SIGN_COLORS.length)];
      for (let b = 0; b < bays; b++) {
        let wx, wy, ww, wh;
        if (style.type === 'glass') { wx = X + b * bw + 1; wy = fy + 2; ww = bw - 2; wh = floorH - 4; }
        else if (style.type === 'concrete') { wx = X + b * bw; wy = fy + floorH * 0.3; ww = bw - 1; wh = floorH * 0.46; }
        else { wx = X + b * bw + bw * 0.16; wy = fy + floorH * 0.22; ww = bw * 0.68; wh = floorH * 0.56; }
        const lit = floorLit ? r() < 0.75 : r() < 0.18;
        if (lit) {
          const warm = r() < 0.6;
          const gr = g.createLinearGradient(0, wy, 0, wy + wh);
          gr.addColorStop(0, warm ? '#ffe7c4' : '#e3ecff'); gr.addColorStop(1, warm ? '#c98d55' : '#8ea4c8');
          g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
          const lum = 0.35 + r() * 0.5;
          e.fillStyle = `rgb(${lum * 255},${lum * 255},${lum * 255})`; e.fillRect(wx, wy, ww, wh);
          if (r() < 0.45) { // blinds
            g.fillStyle = 'rgba(40,30,20,0.35)';
            for (let y = wy; y < wy + wh * (0.3 + r() * 0.6); y += 3) g.fillRect(wx, y, ww, 1.4);
          }
          if (r() < 0.3) { g.fillStyle = 'rgba(20,15,25,0.55)'; g.fillRect(wx + ww * r() * 0.6, wy + wh * 0.4, ww * 0.25, wh * 0.6); } // silhouette/furniture
        } else {
          const gr = g.createLinearGradient(wx, wy, wx + ww, wy + wh);
          gr.addColorStop(0, '#141824'); gr.addColorStop(0.55, '#0b0d14'); gr.addColorStop(1, '#232a3a');
          g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
        }
        // frame
        g.strokeStyle = style.frame; g.lineWidth = Math.max(1, k * 0.06); g.strokeRect(wx, wy, ww, wh);
        if (style.type !== 'glass' && ww > k * 0.9) { g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.stroke(); }
      }
      if (signWin && style.type !== 'glass') { // window lettering (typical Korean window signage)
        const tx = X + W * (0.2 + r() * 0.5), ty = fy + floorH * 0.5;
        // V5: no lettering — a thin glowing film strip in the sign colour
        const fw = Math.min(W * 0.36, floorH * (0.9 + word.length * 0.35)), fh = floorH * 0.16;
        g.fillStyle = signCol; g.globalAlpha = 0.85; g.fillRect(tx - fw / 2, ty - fh / 2, fw, fh); g.globalAlpha = 1;
        e.fillStyle = '#d8d8d8'; e.fillRect(tx - fw / 2, ty - fh / 2, fw, fh);
      }
      // floor line
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X, fy + floorH - 2, W, 2);
    }
    // LED media facade panel
    if (style.led) {
      const lw = W * (0.5 + r() * 0.35), lh = Math.min(H * 0.55, lw * (0.8 + r() * 0.6));
      const lx = X + (W - lw) * r(), ly = Yp + H * 0.12;
      const gr = g.createLinearGradient(lx, ly, lx + lw, ly + lh);
      const pal = r() < 0.5 ? ['#1b1240', '#5a2bd1', '#ff5ca8'] : ['#071a3a', '#2a6cff', '#7de3ff'];
      gr.addColorStop(0, pal[0]); gr.addColorStop(0.55, pal[1]); gr.addColorStop(1, pal[2]);
      g.fillStyle = gr; g.fillRect(lx, ly, lw, lh);
      // V5: abstract light forms instead of text (r() calls kept so the city layout is unchanged)
      const a1 = r(), a2 = r();
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1, lh * 0.012);
      for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(lx + lw * (0.3 + a1 * 0.4), ly + lh * 0.5, lw * (0.08 + i * 0.07), lh * (0.06 + i * 0.05) * (0.6 + a2), 0, 0, 7); g.stroke(); }
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
      for (let y = ly; y < ly + lh; y += 3) { g.beginPath(); g.moveTo(lx, y); g.lineTo(lx + lw, y); g.stroke(); }
      e.fillStyle = '#e6e6e6'; e.fillRect(lx, ly, lw, lh);
    }
    g.restore(); e.restore();
    return rect;
  }

  paintShopfront(w, h, r, lightCol) {
    const ppm = this.shopPPM;
    const rect = this.fac.alloc(w * ppm, h * ppm);
    const g = this.fac.cc, e = this.fac.ec;
    const X = rect.x, Yp = rect.y, W = rect.w, H = rect.h, k = W / w;
    g.save(); g.beginPath(); g.rect(X, Yp, W, H); g.clip();
    const gr = g.createLinearGradient(0, Yp, 0, Yp + H);
    gr.addColorStop(0, lightCol); gr.addColorStop(0.45, '#6b5048'); gr.addColorStop(1, '#1c1418');   // V3: moodier interiors
    g.fillStyle = gr; g.fillRect(X, Yp, W, H);
    // ceiling lights
    for (let x = X + k * 0.6; x < X + W; x += k * 1.2) { g.fillStyle = '#ffffff'; g.fillRect(x, Yp + H * 0.05, k * 0.5, 3); }
    // shelves & products
    const shelfCols = ['#ff6b9a', '#ffffff', '#ffd66b', '#7fd0ff', '#c89bff', '#ff8f5a', '#a6f0c6', '#f2e6da'];
    for (let s = 0; s < 4; s++) {
      const sy = Yp + H * (0.28 + s * 0.15);
      g.fillStyle = 'rgba(40,30,30,0.7)'; g.fillRect(X, sy, W, 3);
      for (let x = X + 2; x < X + W - 4; x += 3 + r() * 6) {
        g.fillStyle = shelfCols[Math.floor(r() * shelfCols.length)];
        const ph = 4 + r() * k * 0.25; g.fillRect(x, sy - ph, 2 + r() * 4, ph);
      }
    }
    // people silhouettes inside
    for (let i = 0; i < 2 + r() * 3; i++) {
      const px = X + r() * W, ph = H * (0.38 + r() * 0.12);
      g.fillStyle = 'rgba(30,22,26,0.75)'; g.beginPath(); g.ellipse(px, Yp + H - ph * 0.55, k * 0.18, ph * 0.5, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(px, Yp + H - ph * 1.08, k * 0.1, 0, 7); g.fill();
    }
    // glass reflection streak
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.beginPath(); g.moveTo(X + W * 0.1, Yp + H); g.lineTo(X + W * 0.25, Yp + H); g.lineTo(X + W * 0.55, Yp); g.lineTo(X + W * 0.4, Yp); g.fill();
    // posters / sale text on glass
    if (r() < 0.6) {
      // V5: no lettering — a lit poster panel
      g.fillStyle = r() < 0.5 ? '#ff3d9e' : '#e9f2ff'; const pw = W * (0.08 + Math.floor(r() * 6) * 0.012), px0 = X + W * (0.05 + r() * 0.4);
      g.globalAlpha = 0.55; g.fillRect(px0, Yp + H * 0.6, pw, H * 0.16); g.globalAlpha = 1;
    }
    // V3: tinted glass (deep navy) so interiors glow without washing out the street
    g.fillStyle = 'rgba(12,14,40,0.28)'; g.fillRect(X, Yp, W, H);
    // mullions & door
    g.fillStyle = '#121216';
    const mw = Math.max(2, k * 0.07);
    for (let x = X; x <= X + W; x += k * (1.3 + r() * 0.4)) g.fillRect(x, Yp, mw, H);
    g.fillRect(X, Yp, W, mw * 1.4); g.fillRect(X, Yp + H - mw * 2, W, mw * 2);
    const dx = X + W * (0.3 + r() * 0.4);
    g.fillRect(dx, Yp + H * 0.12, mw, H); g.fillRect(dx + k * 1.0, Yp + H * 0.12, mw, H); g.fillRect(dx, Yp + H * 0.12, k * 1.0, mw);
    g.fillStyle = '#c9c9c9'; g.fillRect(dx + k * 0.85, Yp + H * 0.55, 2, H * 0.15);
    g.restore();
    e.save(); e.beginPath(); e.rect(X, Yp, W, H); e.clip();
    const eg = e.createLinearGradient(0, Yp, 0, Yp + H); eg.addColorStop(0, '#8a8a8a'); eg.addColorStop(1, '#242424');
    e.fillStyle = eg; e.fillRect(X, Yp, W, H);
    e.fillStyle = '#000';
    for (let x = X; x <= X + W; x += k * 1.5) e.fillRect(x, Yp, mw, H);
    e.restore();
    return rect;
  }

  // V5 — signs carry no lettering. Each one is a glowing panel: dark glass housing, an acrylic
  // diffuser face lit from inside (soft gradient + hot core), a neon tube border with a white-hot
  // core, diffuser micro-lines and a glass reflection streak. r() is consumed exactly as before,
  // so every sign keeps its size, position and the city layout does not change.
  paintSign(w, h, r, kind = 'band') {
    const ppm = this.signPPM * (kind === 'blade' ? 0.85 : 1);
    const rect = this.sig.alloc(w * ppm, h * ppm);
    const g = this.sig.cc;
    const X = rect.x, Yp = rect.y, W = rect.w, H = rect.h;
    const ci = r();
    const col = SIGN_COLORS[Math.floor(ci * SIGN_COLORS.length)];
    const backlit = r() < 0.42;
    if (backlit) r();
    const q = rng(Math.floor(ci * 1e6) + Math.floor(W * 31 + H * 17));
    g.save(); g.beginPath(); g.rect(X, Yp, W, H); g.clip();
    if (kind === 'menu') {      // street-food stall menu boards stay as they were (not building signs)
      g.fillStyle = '#f2e3c4'; g.fillRect(X, Yp, W, H);
      g.fillStyle = '#c0261c'; g.fillRect(X, Yp, W, H * 0.3);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const title = ['떡볶이 · 어묵', '꼬치 · 호떡', '순대 · 튀김', '계란빵 · 붕어빵', '닭꼬치 · 어묵'][Math.floor(r() * 5)];
      fitText(g, title, W * 0.9, H * 0.24, 800); g.fillText(title, X + W / 2, Yp + H * 0.16);
      g.fillStyle = '#2a1a12'; g.textAlign = 'left';
      const items = [['떡볶이', '4,000'], ['어묵', '1,500'], ['순대', '5,000'], ['꼬치', '3,500'], ['호떡', '2,000'], ['튀김', '3,000']];
      for (let i = 0; i < 3; i++) { const [a, b] = items[Math.floor(r() * items.length)]; fitText(g, a + '  ' + b, W * 0.85, H * 0.18, 700); g.fillText(a + '  ' + b, X + W * 0.08, Yp + H * (0.45 + i * 0.2)); }
      g.restore();
      this._lastSign = { col: '#ffd9a8', backlit: true };
      return rect;
    }
    let c = col, vertical = H > W * 1.25, cells = 0, shapes = 0;
    if (kind === 'band') { r(); cells = 1 + Math.floor(q() * 3); }
    else if (kind === 'blade') { r(); cells = 3 + Math.floor(q() * 3); vertical = true; }
    else if (kind === 'holo') { c = r() < 0.5 ? '#38e1ff' : (r() < 0.5 ? '#ff3df0' : '#b47bff'); r(); shapes = 1; }
    else if (kind === 'screen') { r(); for (let i = 0; i < 15; i++) r(); r(); shapes = 2; }
    else { r(); r(); shapes = 3; }   // rooftop billboard
    neonPanel(g, X, Yp, W, H, c, q, { vertical, cells, shapes, backlit, kind });
    g.restore();
    this._lastSign = { col: c, backlit: kind === 'screen' || kind === 'board' || backlit };
    return rect;
  }

  // ---------------- streets
  buildStreets() {
    const rows = [
      { O: [5.5, 0, 0], N: [-1, 0, 0], s0: -165, s1: 0, main: true },
      { O: [5.5, 0, 0], N: [-1, 0, 0], s0: 12, s1: 64, main: true },
      { O: [-5.5, 0, 0], N: [1, 0, 0], s0: 0, s1: 165, main: true },
      { O: [-5.5, 0, 0], N: [1, 0, 0], s0: -64, s1: -12, main: true },
      { O: [0, 0, 0], N: [0, 0, 1], s0: 17.5, s1: 70, main: false },
      { O: [0, 0, 0], N: [0, 0, 1], s0: -70, s1: -17.5, main: false },
      { O: [0, 0, 12], N: [0, 0, -1], s0: -70, s1: -17.5, main: false },
      { O: [0, 0, 12], N: [0, 0, -1], s0: 17.5, s1: 70, main: false },
    ];
    for (const row of rows) {
      const O = new THREE.Vector3(...row.O), N = new THREE.Vector3(...row.N);
      const U = new THREE.Vector3().crossVectors(N.clone().negate(), Y);
      let s = row.s0;
      while (s < row.s1 - 3) {
        let w = 6 + this.R() * 6.5;
        if (row.s1 - (s + w) < 5) w = row.s1 - s;
        this.building(O, U, N, s, s + w, row.main);
        s += w;
      }
    }
  }

  building(O, U, N, s0, s1, main) {
    const r = this.R;
    const w = s1 - s0, d = 12;
    const g = 4.3;
    const floors = main ? 4 + Math.floor(r() * 6) + (r() < 0.2 ? 6 : 0) : 5 + Math.floor(r() * 9);
    const h = g + floors * 3.3 + 0.8;
    const styles = [
      { type: 'tile', wall: '#3b3631', frame: '#1a1714' }, { type: 'tile', wall: '#4a4540', frame: '#24201c' },
      { type: 'glass', wall: '#0c0f18', frame: '#2a3242' }, { type: 'concrete', wall: '#2b2b2e', frame: '#151517' },
      { type: 'brick', wall: '#3a2420', frame: '#1c1210' }, { type: 'tile', wall: '#5a554e', frame: '#2a2622' },
      { type: 'glass', wall: '#10131c', frame: '#3a4152' },
    ];
    const style = { ...styles[Math.floor(r() * styles.length)], res: main ? 1 : 0.6 };
    style.led = (r() < (main ? 0.14 : 0.22)) && floors > 4;
    const P = (u, n, y) => O.clone().addScaledVector(U, u).addScaledVector(N, n).addScaledVector(Y, y).toArray();
    const L = this.lists;
    const shopLight = SHOP_LIGHT[Math.floor(r() * SHOP_LIGHT.length)];

    // upper facade
    const fr = this.paintFacade(w, h - g, style, r);
    L.facade.push(quadGeo(P(s0, 0, g), P(s1, 0, g), P(s1, 0, h), P(s0, 0, h), rectUV(fr)));
    // ground shopfront (recessed)
    const rec = 0.5;
    const sr = this.paintShopfront(w, g, r, shopLight);
    L.facade.push(quadGeo(P(s0, -rec, 0), P(s1, -rec, 0), P(s1, -rec, g), P(s0, -rec, g), rectUV(sr)));
    const wuv = (a, b, y0, y1) => [a / 16, y0 / 12.8, b / 16, y0 / 12.8, b / 16, y1 / 12.8, a / 16, y1 / 12.8];
    L.wall.push(quadGeo(P(s0, 0, 0), P(s0, -rec, 0), P(s0, -rec, g), P(s0, 0, g), wuv(0, rec, 0, g)));
    L.wall.push(quadGeo(P(s1, -rec, 0), P(s1, 0, 0), P(s1, 0, g), P(s1, -rec, g), wuv(0, rec, 0, g)));
    L.dark.push(solid(quadGeo(P(s0, 0, g), P(s0, -rec, g), P(s1, -rec, g), P(s1, 0, g)), new THREE.Matrix4(), '#1a1a1e'));
    // side walls + roof
    L.wall.push(quadGeo(P(s0, -d, 0), P(s0, 0, 0), P(s0, 0, h), P(s0, -d, h), wuv(s0, s0 + d, 0, h)));
    L.wall.push(quadGeo(P(s1, 0, 0), P(s1, -d, 0), P(s1, -d, h), P(s1, 0, h), wuv(s1, s1 + d, 0, h)));
    L.wall.push(quadGeo(P(s1, -d, 0), P(s0, -d, 0), P(s0, -d, h), P(s1, -d, h), wuv(s0, s1, 0, h)));
    L.roof.push(quadGeo(P(s0, 0, h), P(s1, 0, h), P(s1, -d, h), P(s0, -d, h), [0, 0, w / 8, 0, w / 8, d / 8, 0, d / 8]));

    // basis matrix for solids placed in lot space (x=U, y=Y, z=N)
    const basis = new THREE.Matrix4().makeBasis(U, Y, N).setPosition(O);
    const at = (geo, u, y, n, color, ry = 0) => {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(u, y, n), new THREE.Quaternion().setFromAxisAngle(Y, ry), new THREE.Vector3(1, 1, 1));
      L.dark.push(solid(geo, basis.clone().multiply(m), color));
    };
    const frameCol = style.type === 'glass' ? '#2a2f3a' : '#1c1a1a';
    // pilasters + cornice + slab lines
    at(new THREE.BoxGeometry(0.32, h - g, 0.16), s0 + 0.16, g + (h - g) / 2, 0.08, frameCol);
    at(new THREE.BoxGeometry(0.32, h - g, 0.16), s1 - 0.16, g + (h - g) / 2, 0.08, frameCol);
    at(new THREE.BoxGeometry(w, 0.35, 0.3), (s0 + s1) / 2, h - 0.15, 0.12, frameCol);
    if (style.type !== 'glass') for (let f = 1; f < floors; f += (r() < 0.5 ? 1 : 2)) at(new THREE.BoxGeometry(w - 0.4, 0.12, 0.1), (s0 + s1) / 2, g + f * 3.3, 0.05, frameCol);
    // parapet
    at(new THREE.BoxGeometry(w, 0.7, 0.18), (s0 + s1) / 2, h + 0.35, -0.09, '#18171a');
    at(new THREE.BoxGeometry(w, 0.7, 0.18), (s0 + s1) / 2, h + 0.35, -d + 0.09, '#18171a');

    const signRes = main ? 1 : 0.7;
    // horizontal sign band
    const bw = w - 0.5, bh = 0.95;
    const br = this.paintSign(bw * signRes, bh * signRes, r, 'band');
    const sInfo = this._lastSign;
    const sb0 = s0 + 0.25, sb1 = s1 - 0.25, sy0 = g + 0.12, sy1 = g + 0.12 + bh, sn = 0.3;
    L.sign.push(quadGeo(P(sb0, sn, sy0), P(sb1, sn, sy0), P(sb1, sn, sy1), P(sb0, sn, sy1), rectUV(br)));
    at(new THREE.BoxGeometry(bw, bh, sn), (sb0 + sb1) / 2, (sy0 + sy1) / 2, sn / 2 - 0.01, '#111114');
    // awning light strip under sign
    const lr = this.solidRect[r() < 0.5 ? 'warm' : 'white'];
    L.sign.push(quadGeo(P(s0 + 0.2, 0.02, g - 0.02), P(s1 - 0.2, 0.02, g - 0.02), P(s1 - 0.2, -0.12, g - 0.02), P(s0 + 0.2, -0.12, g - 0.02), rectUV(lr)));
    spill(this, P, (s0 + s1) / 2, 0.03, g + 0.9, w * 1.1, 2.6, sInfo.col, sInfo.backlit ? 0.3 : 0.2);   // V3: sign light on the facade
    // light pools on the ground
    this.lightPools.push({ p: P((s0 + s1) / 2, 1.6, 0), U: U.clone(), N: N.clone(), w, col: shopLight, k: 1.0 });
    this.lightPools.push({ p: P((s0 + s1) / 2, 2.6, 0), U: U.clone(), N: N.clone(), w: w * 0.8, col: sInfo.col, k: sInfo.backlit ? 0.55 : 0.3 });

    // vertical blade signs
    const nBlade = main ? (r() < 0.55 ? 1 : r() < 0.6 ? 2 : 0) : (r() < 0.3 ? 1 : 0);
    for (let i = 0; i < nBlade; i++) {
      const u = i === 0 ? s0 + 0.7 + r() * 0.6 : s1 - 0.7 - r() * 0.6;
      const bh2 = Math.min(h - g - 2, 3 + r() * 4.5);
      if (bh2 < 2.2) continue;
      const by0 = g + 1.6 + r() * Math.max(0, h - g - 2 - bh2 - 1.6);
      const bwid = 0.8 + r() * 0.3, n0 = 0.3, n1 = n0 + bwid, th = 0.09;
      const rr = this.paintSign(bwid * signRes, bh2 * signRes, r, 'blade');
      const si = this._lastSign;
      // both faces (readable from each direction)
      L.sign.push(quadGeo(P(u + th, n0, by0), P(u + th, n1, by0), P(u + th, n1, by0 + bh2), P(u + th, n0, by0 + bh2), rectUV(rr, true)));
      L.sign.push(quadGeo(P(u - th, n1, by0), P(u - th, n0, by0), P(u - th, n0, by0 + bh2), P(u - th, n1, by0 + bh2), rectUV(rr)));
      at(new THREE.BoxGeometry(th * 2 - 0.01, bh2 + 0.1, bwid + 0.06), u, by0 + bh2 / 2, (n0 + n1) / 2, '#121216');
      at(new THREE.BoxGeometry(0.05, 0.05, n0 + 0.05), u, by0 + bh2 - 0.2, n0 / 2, '#2a2a2e');
      at(new THREE.BoxGeometry(0.05, 0.05, n0 + 0.05), u, by0 + 0.2, n0 / 2, '#2a2a2e');
      this.lightPools.push({ p: P(u, 1.2, 0), U: U.clone(), N: N.clone(), w: 2.2, col: si.col, k: 0.35 });
      spill(this, P, u, 0.03, by0 + bh2 / 2, 3.6, bh2 * 1.4, si.col, 0.32);
    }
    // AC units, pipes
    const nAC = Math.floor(r() * (floors > 3 ? 4 : 2));
    for (let i = 0; i < nAC; i++) {
      const f = 1 + Math.floor(r() * (floors - 1)), u = s0 + 0.9 + r() * Math.max(0.1, w - 1.8);
      const y = g + f * 3.3 + 0.25 + 0.31;
      at(new THREE.BoxGeometry(0.86, 0.62, 0.34), u, y, 0.17, '#9d9d98');
      L.facade.push(quadGeo(P(u - 0.43, 0.345, y - 0.31), P(u + 0.43, 0.345, y - 0.31), P(u + 0.43, 0.345, y + 0.31), P(u - 0.43, 0.345, y + 0.31), rectUV(this.acRect)));
      at(new THREE.BoxGeometry(0.9, 0.04, 0.45), u, y - 0.34, 0.22, '#3a3a3a');
      at(new THREE.CylinderGeometry(0.02, 0.02, y - g, 6), u + 0.36, g + (y - g) / 2, 0.05, '#7d7d78');
    }
    if (r() < 0.75) at(new THREE.CylinderGeometry(0.05, 0.05, h, 8), s1 - 0.42, h / 2, 0.08, '#4a4a4c');
    if (r() < 0.4) at(new THREE.CylinderGeometry(0.035, 0.035, h - g, 6), s0 + 0.5, g + (h - g) / 2, 0.06, '#5a5a5c');
    // ---- cyberpunk additions: neon frames, balconies, holograms, digital screens
    const neonCols = ['cyan', 'magenta', 'violet', 'indigo', 'cyan', 'magenta', 'violet'];
    const nc = neonCols[Math.floor(r() * neonCols.length)];
    const strip = (a, b, y0, y1, n, col) => L.sign.push(quadGeo(P(a, n, y0), P(b, n, y0), P(b, n, y1), P(a, n, y1), rectUV(this.solidRect[col])));
    const ec = r() < 0.7 ? 'cyan' : nc;   // V3: cyan edge neon along the building corners
    if (r() < (main ? 0.75 : 0.5)) strip(s0 + 0.02, s0 + 0.12, g + 0.6, h + 0.6, 0.17, ec);
    if (r() < (main ? 0.6 : 0.4)) strip(s1 - 0.12, s1 - 0.02, g + 0.6, h + 0.6, 0.17, ec);
    if (r() < 0.55) strip(s0 + 0.1, s1 - 0.1, h - 0.3, h - 0.22, 0.275, neonCols[Math.floor(r() * neonCols.length)]);
    if (style.type === 'glass' && r() < 0.6) for (let f = 2; f < floors; f += 2) strip(s0 + 0.4, s1 - 0.4, g + f * 3.3 - 0.03, g + f * 3.3 + 0.03, 0.03, 'indigo');
    if (style.type !== 'glass' && r() < 0.5) {
      let nb = 0;
      for (let f = 1; f < floors && nb < 6; f++) {
        if (r() < 0.45) continue;
        const u = s0 + 1.1 + r() * Math.max(0.1, w - 2.9);
        const yb = g + f * 3.3;
        at(new THREE.BoxGeometry(1.7, 0.12, 0.85), u, yb + 0.06, 0.42, '#26262b');
        at(new THREE.BoxGeometry(1.7, 0.85, 0.04), u, yb + 0.55, 0.83, '#3b3b44');
        at(new THREE.BoxGeometry(0.04, 0.85, 0.8), u - 0.83, yb + 0.55, 0.43, '#3b3b44');
        at(new THREE.BoxGeometry(0.04, 0.85, 0.8), u + 0.83, yb + 0.55, 0.43, '#3b3b44');
        if (r() < 0.35) L.sign.push(quadGeo(P(u - 0.8, 0.86, yb + 0.95), P(u + 0.8, 0.86, yb + 0.95), P(u + 0.8, 0.86, yb + 0.99), P(u - 0.8, 0.86, yb + 0.99), rectUV(this.solidRect[nc])));
        nb++;
      }
    }
    if (main && h > 10 && r() < 0.3) {
      const hw = 2.4 + r() * 1.2, hh = hw * 0.55, u = s0 + w * (0.25 + r() * 0.5), y = g + 3 + r() * Math.max(0.5, h - g - 6 - hh), n = 0.9 + r() * 0.5;
      const hr = this.paintSign(hw * 0.8, hh * 0.8, r, 'holo');
      L.holo.push(quadGeo(P(u - hw / 2, n, y), P(u + hw / 2, n, y), P(u + hw / 2, n, y + hh), P(u - hw / 2, n, y + hh), rectUV(hr)));
      at(new THREE.BoxGeometry(0.04, 0.04, n), u, y + hh / 2, n / 2, '#2a2a30');
    }
    if (main && floors >= 5 && r() < 0.38) {
      const sw = Math.min(w - 1.4, 4.8), sh = Math.min(h - g - 3.5, sw * (1.3 + r() * 0.6));
      if (sh > 3) {
        const u0 = s0 + (w - sw) / 2, y0 = g + 2.2 + r() * Math.max(0, h - g - 2.8 - sh);
        const sr2 = this.paintSign(sw * 0.7, sh * 0.7, r, 'screen');
        L.screen.push(quadGeo(P(u0, 0.24, y0), P(u0 + sw, 0.24, y0), P(u0 + sw, 0.24, y0 + sh), P(u0, 0.24, y0 + sh), rectUV(sr2)));
        at(new THREE.BoxGeometry(sw + 0.3, sh + 0.3, 0.2), u0 + sw / 2, y0 + sh / 2, 0.12, '#0e0e12');
        strip(u0 - 0.15, u0 + sw + 0.15, y0 - 0.2, y0 - 0.14, 0.235, nc);
        this.lightPools.push({ p: P(u0 + sw / 2, 3.2, 0), U: U.clone(), N: N.clone(), w: sw, col: this._lastSign.col, k: 0.45 });
        spill(this, P, u0 + sw / 2, 0.03, y0 + sh / 2, sw * 2.0, sh * 1.5, this._lastSign.col, 0.22);
      }
    }
    // rooftop gear
    if (r() < 0.6) at(new THREE.CylinderGeometry(0.8, 0.8, 1.6, 14), s0 + 1.4 + r() * (w - 2.8), h + 0.8, -d * 0.6, '#3a3a3e');
    if (r() < 0.5) at(new THREE.BoxGeometry(2.4, 2.6, 2.4), s0 + 1.5 + r() * (w - 3), h + 1.3, -d * 0.4, '#232326');
    if (r() < 0.35) at(new THREE.CylinderGeometry(0.03, 0.03, 4, 5), s0 + r() * w, h + 2, -d * 0.7, '#555');
    if (r() < (main ? 0.22 : 0.4) && w > 6) {
      const bbw = Math.min(w - 1, 7), bbh = 2.6 + r() * 1.4;
      const rr = this.paintSign(bbw * 0.6, bbh * 0.6, r, 'board');
      L.sign.push(quadGeo(P(s0 + 0.5, -0.6, h + 1.2), P(s0 + 0.5 + bbw, -0.6, h + 1.2), P(s0 + 0.5 + bbw, -0.6, h + 1.2 + bbh), P(s0 + 0.5, -0.6, h + 1.2 + bbh), rectUV(rr)));
      at(new THREE.BoxGeometry(bbw, bbh, 0.2), s0 + 0.5 + bbw / 2, h + 1.2 + bbh / 2, -0.72, '#141416');
      for (const k of [0.2, 0.8]) at(new THREE.BoxGeometry(0.12, 1.3, 0.12), s0 + 0.5 + bbw * k, h + 0.6, -0.72, '#2a2a2a');
    }
  }

  buildFillers() {
    const r = this.R, L = this.lists;
    const box = (x0, x1, z0, z1, h) => {
      const P = (x, y, z) => [x, y, z];
      L.wall.push(quadGeo(P(x0, 0, z1), P(x1, 0, z1), P(x1, h, z1), P(x0, h, z1), [x0 / 16, 0, x1 / 16, 0, x1 / 16, h / 12.8, x0 / 16, h / 12.8]));
      L.wall.push(quadGeo(P(x1, 0, z0), P(x0, 0, z0), P(x0, h, z0), P(x1, h, z0), [x0 / 16, 0, x1 / 16, 0, x1 / 16, h / 12.8, x0 / 16, h / 12.8]));
      L.wall.push(quadGeo(P(x1, 0, z1), P(x1, 0, z0), P(x1, h, z0), P(x1, h, z1), [z0 / 16, 0, z1 / 16, 0, z1 / 16, h / 12.8, z0 / 16, h / 12.8]));
      L.wall.push(quadGeo(P(x0, 0, z0), P(x0, 0, z1), P(x0, h, z1), P(x0, h, z0), [z0 / 16, 0, z1 / 16, 0, z1 / 16, h / 12.8, z0 / 16, h / 12.8]));
      L.roof.push(quadGeo(P(x0, h, z1), P(x1, h, z1), P(x1, h, z0), P(x0, h, z0), [0, 0, (x1 - x0) / 8, 0, (x1 - x0) / 8, (z1 - z0) / 8, 0, (z1 - z0) / 8]));
      const nc = ['cyan', 'magenta', 'violet', 'indigo'][Math.floor(r() * 4)];
      const ru = rectUV(this.solidRect[nc]);
      if (r() < 0.4) { L.sign.push(quadGeo(P(x1 - 0.15, 4, z1 + 0.02), P(x1, 4, z1 + 0.02), P(x1, h, z1 + 0.02), P(x1 - 0.15, h, z1 + 0.02), ru)); L.sign.push(quadGeo(P(x0, 4, z1 + 0.02), P(x0 + 0.15, 4, z1 + 0.02), P(x0 + 0.15, h, z1 + 0.02), P(x0, h, z1 + 0.02), ru)); }
      if (r() < 0.35) L.sign.push(quadGeo(P(x0, h - 0.9, z1 + 0.02), P(x1, h - 0.9, z1 + 0.02), P(x1, h - 0.7, z1 + 0.02), P(x0, h - 0.7, z1 + 0.02), ru));
    };
    for (const sx of [1, -1]) {
      for (let z = -168; z < 66; z += 14 + r() * 6) {
        if (z > -14 && z < 26) continue;
        for (let x = 18.5; x < 74; x += 12 + r() * 8) {
          const h = 12 + r() * 30 + (r() < 0.12 ? 30 : 0);
          const a = sx * x, b = sx * (x + 9 + r() * 4);
          box(Math.min(a, b), Math.max(a, b), z, z + 10 + r() * 3, h);
        }
      }
    }
  }

  buildStreetFurniture() {
    const r = this.R, L = this.lists;
    const M = (x, y, z, ry = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(Y, ry), new THREE.Vector3(1, 1, 1));
    // overhead wires across and along the alley (catenaries)
    for (let z = -150; z < 60; z += 4 + r() * 6) {
      if (z > -1 && z < 13) continue;
      const n = 1 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const y1 = 5.2 + r() * 3.2, y2 = 5.2 + r() * 3.2, dz = (r() - 0.5) * 6;
        const a = new THREE.Vector3(-5.5, y1, z), b = new THREE.Vector3(5.5, y2, z + dz);
        const mid = a.clone().lerp(b, 0.5); mid.y -= 0.4 + r() * 0.7;
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        L.dark.push(solid(new THREE.TubeGeometry(curve, 18, 0.014, 3, false), new THREE.Matrix4(), '#0c0c0e'));
      }
    }
    for (const sx of [5.42, -5.42]) for (let k = 0; k < 3; k++) {
      const y = 4.8 + k * 0.35;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(sx, y, -160), new THREE.Vector3(sx, y - 0.2, -80), new THREE.Vector3(sx, y, -1)]);
      L.dark.push(solid(new THREE.TubeGeometry(curve, 60, 0.018, 3, false), new THREE.Matrix4(), '#101012'));
    }
    // street lamps
    for (let z = -150; z < 60; z += 17) {
      if (z > -2 && z < 14) continue;
      for (const sx of [1, -1]) {
        const x = sx * 4.75, zz = z + (sx > 0 ? 0 : 8);
        L.dark.push(solid(new THREE.CylinderGeometry(0.06, 0.08, 5.2, 10), M(x, 2.6, zz), '#202024'));
        L.dark.push(solid(new THREE.BoxGeometry(0.9, 0.08, 0.1), M(x - sx * 0.42, 5.15, zz), '#202024'));
        L.dark.push(solid(new THREE.BoxGeometry(0.5, 0.12, 0.26), M(x - sx * 0.8, 5.1, zz), '#18181b'));
        const rr = this.solidRect.warm;
        const X0 = x - sx * 0.8 - 0.22, X1 = x - sx * 0.8 + 0.22;
        L.sign.push(quadGeo([X0, 5.035, zz + 0.11], [X1, 5.035, zz + 0.11], [X1, 5.035, zz - 0.11], [X0, 5.035, zz - 0.11], rectUV(rr)));
        this.lightPools.push({ p: [x - sx * 0.8, 0, zz], U: new THREE.Vector3(0, 0, 1), N: new THREE.Vector3(1, 0, 0), w: 4, col: '#ffcf96', k: 0.75, round: true });
      }
    }
    this.buildStalls();
  }

  // ---------------- pojangmacha (street food stalls) – on the sidewalks, never in the lane
  buildStalls() {
    const r = rng(4242), L = this.lists;
    const M = (x, y, z, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(1, 1, 1));
    const lampZ = (side, z) => { for (let k = -150; k < 60; k += 17) { const zz = k + (side > 0 ? 0 : 8); if (Math.abs(z - zz) < 1.9) return true; } return false; };
    const tarps = ['#d9531e', '#c7302b', '#e07a1f', '#2f5fd0', '#b0302f', '#d9531e'];
    const foods = [['#d8321f', '#f06a2a'], ['#c9a26b', '#e8c48a'], ['#d39a4a', '#f2c46b'], ['#5a2a1e', '#8a4a2a'], ['#f2d36b', '#d9a441']];
    const solidUV = (geo, matrix, rect) => {
      const g = (geo.index ? geo.toNonIndexed() : geo).applyMatrix4(matrix);
      const n = g.attributes.position.count, uv = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { uv[i * 2] = (rect.u0 + rect.u1) / 2; uv[i * 2 + 1] = (rect.v0 + rect.v1) / 2; }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      return g;
    };
    const one = (side, z) => {
      const D = 1.25, Lz = 2.2 + r() * 0.9, x = side * 4.15, f = -side; // f: towards the lane
      const fx = x + f * D / 2;                                         // front face x
      L.dark.push(solid(new THREE.BoxGeometry(D, 0.88, Lz), M(x, 0.44, z), '#25252a'));
      const tarp = tarps[Math.floor(r() * tarps.length)];
      L.canopy.push(solid(new THREE.BoxGeometry(0.02, 0.26, Lz - 0.1), M(fx + f * 0.012, 0.66, z), tarp));
      L.dark.push(solid(new THREE.BoxGeometry(D + 0.08, 0.05, Lz + 0.08), M(x, 0.905, z), '#a9afb6'));
      const nT = 3 + Math.floor(r() * 3);
      for (let i = 0; i < nT; i++) {
        const tz = z - Lz / 2 + 0.35 + i * (Lz - 0.7) / Math.max(1, nT - 1), [c1, c2] = foods[Math.floor(r() * foods.length)];
        L.dark.push(solid(new THREE.BoxGeometry(0.44, 0.05, Math.min(0.48, (Lz - 0.4) / nT)), M(fx - f * 0.3, 0.955, tz), '#7d8186'));
        const kind = r();
        if (kind < 0.4) L.dark.push(solid(new THREE.BoxGeometry(0.38, 0.04, Math.min(0.42, (Lz - 0.4) / nT - 0.05)), M(fx - f * 0.3, 0.99, tz), c1));
        else if (kind < 0.75) for (let k = 0; k < 6; k++) L.dark.push(solid(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 4), M(fx - f * (0.18 + k * 0.045), 1.08, tz + (k % 2 ? 0.08 : -0.08), 0, f * 0.5), c2));
        else for (let k = 0; k < 4; k++) L.dark.push(solid(new THREE.CylinderGeometry(0.06, 0.06, 0.022, 10), M(fx - f * (0.2 + (k % 2) * 0.16), 0.995, tz + (k < 2 ? -0.08 : 0.08)), c1));
      }
      L.dark.push(solid(new THREE.CylinderGeometry(0.2, 0.18, 0.24, 14), M(x + side * 0.25, 1.05, z + Lz / 2 - 0.3), '#b9bec4'));
      L.dark.push(solid(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 14), M(x + side * 0.25, 1.17, z + Lz / 2 - 0.3), '#7a2a1a'));
      // frame & canopy
      const ex = D / 2 + 0.3, ez = Lz / 2 + 0.15;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.dark.push(solid(new THREE.CylinderGeometry(0.022, 0.022, 2.3, 6), M(x + sx * ex, 1.15, z + sz * ez), '#55575c'));
      const P = (dx, y, dz) => [x + dx, y, z + dz];
      const tc = new THREE.Color(tarp), tc2 = tc.clone().multiplyScalar(0.75);
      L.canopy.push(solid(quadGeo(P(f * ex, 2.22, -ez), P(f * ex, 2.22, ez), P(0, 2.6, ez), P(0, 2.6, -ez)), new THREE.Matrix4(), tc));
      L.canopy.push(solid(quadGeo(P(-f * ex, 2.22, ez), P(-f * ex, 2.22, -ez), P(0, 2.6, -ez), P(0, 2.6, ez)), new THREE.Matrix4(), tc2));
      L.canopy.push(solid(quadGeo(P(f * ex, 1.92, -ez), P(f * ex, 1.92, ez), P(f * ex, 2.22, ez), P(f * ex, 2.22, -ez)), new THREE.Matrix4(), tc));
      L.canopy.push(solid(quadGeo(P(-f * ex, 0.9, ez), P(-f * ex, 0.9, -ez), P(-f * ex, 2.22, -ez), P(-f * ex, 2.22, ez)), new THREE.Matrix4(), tc2.clone().multiplyScalar(0.7)));
      // menu board hanging at the front
      const mr = this.paintSign(Lz * 0.55, 0.42, r, 'menu');
      const mx = x + f * (ex + 0.02), mw = Lz * 0.32;
      L.sign.push(quadGeo([mx, 1.5, z + f * mw], [mx, 1.5, z - f * mw], [mx, 1.88, z - f * mw], [mx, 1.88, z + f * mw], rectUV(mr)));
      // bulbs + stools
      for (let k = -1; k <= 1; k++) L.sign.push(solidUV(new THREE.SphereGeometry(0.05, 8, 6), M(x + f * 0.1, 2.12, z + k * Lz * 0.32), this.solidRect.warm));
      for (let k = 0; k < 2 + Math.floor(r() * 2); k++) L.dark.push(solid(new THREE.CylinderGeometry(0.15, 0.13, 0.44, 10), M(fx + f * 0.42, 0.22, z - Lz / 3 + k * Lz / 3), r() < 0.5 ? '#c7302b' : '#2f5fd0'));
      this.lightPools.push({ p: [fx + f * 0.6, 0, z], U: new THREE.Vector3(0, 0, 1), N: new THREE.Vector3(1, 0, 0), w: 3, col: '#ffb46a', k: 1.0, round: true });
      this.stalls.push({ x0: Math.min(fx, x - f * ex) - 0.1, x1: Math.max(fx, x - f * ex) + 0.1, z0: z - ez - 0.15, z1: z + ez + 0.15, side });
      // vendor behind the counter, customers waiting in front
      this.spots.push({ x: x - f * (D / 2 + 0.12), z: z + (r() - 0.5) * Lz * 0.5, yaw: f > 0 ? Math.PI / 2 : -Math.PI / 2 });
      const nc = 1 + Math.floor(r() * 3);
      for (let k = 0; k < nc; k++) this.spots.push({ x: fx + f * (0.5 + r() * 0.5), z: z + (r() - 0.5) * Lz, yaw: (f > 0 ? -Math.PI / 2 : Math.PI / 2) + (r() - 0.5) * 0.7 });
    };
    for (let z = -13; z > -128; z -= 8 + r() * 4) if (!lampZ(1, z)) one(1, z);
    for (let z = -9; z > -128; z -= 8 + r() * 4) if (!lampZ(-1, z)) one(-1, z);
    for (let z = 22; z < 55; z += 9 + r() * 4) { if (!lampZ(1, z)) one(1, z); if (!lampZ(-1, z + 4)) one(-1, z + 4); }
  }

  buildSkyline() {
    const r = this.R, L = this.lists;
    for (let i = 0; i < 26; i++) {
      const x = (r() - 0.5) * 220, z = -190 - r() * 140, w = 14 + r() * 22;
      let h = 50 + r() * 110;
      if (Math.abs(x) < 46) h = Math.min(h, 40);   // V5: keep the end of the street low so the moon can rise over it
      const d = 14 + r() * 16;
      const P = (a, b, c) => [a, b, c];
      L.wall.push(quadGeo(P(x - w / 2, 0, z + d / 2), P(x + w / 2, 0, z + d / 2), P(x + w / 2, h, z + d / 2), P(x - w / 2, h, z + d / 2), [0, 0, w / 16, 0, w / 16, h / 12.8, 0, h / 12.8]));
      L.wall.push(quadGeo(P(x + w / 2, 0, z + d / 2), P(x + w / 2, 0, z - d / 2), P(x + w / 2, h, z - d / 2), P(x + w / 2, h, z + d / 2), [0, 0, d / 16, 0, d / 16, h / 12.8, 0, h / 12.8]));
      L.wall.push(quadGeo(P(x - w / 2, 0, z - d / 2), P(x - w / 2, 0, z + d / 2), P(x - w / 2, h, z + d / 2), P(x - w / 2, h, z - d / 2), [0, 0, d / 16, 0, d / 16, h / 12.8, 0, h / 12.8]));
      L.roof.push(quadGeo(P(x - w / 2, h, z + d / 2), P(x + w / 2, h, z + d / 2), P(x + w / 2, h, z - d / 2), P(x - w / 2, h, z - d / 2), [0, 0, 1, 0, 1, 1, 0, 1]));
    }
    // Namsan + tower silhouette far behind (unfogged, very dim)
    const g = new THREE.Group();
    const hill = new THREE.Mesh(new THREE.SphereGeometry(260, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.6, 0.45, 1), new THREE.MeshBasicMaterial({ color: 0x07050b, fog: false }));
    g.add(hill);
    const tm = new THREE.MeshBasicMaterial({ color: 0x120c1c, fog: false });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 120, 16), tm); shaft.position.y = 160; g.add(shaft);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(13, 10, 14, 24), tm); pod.position.y = 205; g.add(pod);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(13.2, 13.2, 1.2, 32, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.55, 1.3), fog: false })); ring.position.y = 203; g.add(ring);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.6, 60, 8), tm); ant.position.y = 242; g.add(ant);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.25), fog: false })); tip.position.y = 273; g.add(tip);
    g.position.set(-120, -40, -620);
    this.scene.add(g);
    // sky dome
    const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, fog: false, depthWrite: false,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: 'varying vec3 vP; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(vec3(0.20,0.06,0.30), vec3(0.03,0.025,0.08), smoothstep(0.0,0.22,h)); c = mix(c, vec3(0.006,0.006,0.016), smoothstep(0.22,0.6,h)); c += vec3(0.05,0.12,0.22) * exp(-abs(h-0.05)*30.0) * 0.5; gl_FragColor = vec4(c,1.0);} ',
    }));
    sky.renderOrder = -20;   // V5: before the moon (-10)
    this.scene.add(sky);
  }

  finishStatic() {
    const L = this.lists;
    const facadeTex = this.fac.toTexture(this.renderer.capabilities.getMaxAnisotropy());
    // generic wall tile with windows (emissive in alpha)
    const wa = new Atlas(512, 512, { pad: 0 });
    const k = 32; // 16m x 12.8m -> 512 x 409.6 ; use full 512 for 12.8 m height
    const g = wa.cc, e = wa.ec, r = rng(77);
    g.fillStyle = '#2c2a2d'; g.fillRect(0, 0, 512, 512);
    for (let f = 0; f < 4; f++) for (let b = 0; b < 8; b++) {
      const x = b * 64 + 10, y = f * 128 + 34, w = 44, h = 62;
      const lit = r() < 0.22;
      if (lit) { g.fillStyle = r() < 0.6 ? '#ffd9a6' : '#dfe8ff'; e.fillStyle = `rgb(${50 + r() * 70},0,0)`; e.fillRect(x, y, w, h); }
      else g.fillStyle = '#10131b';
      g.fillRect(x, y, w, h);
      g.strokeStyle = '#1a1919'; g.lineWidth = 3; g.strokeRect(x, y, w, h);
    }
    g.fillStyle = 'rgba(0,0,0,0.3)'; for (let f = 0; f < 4; f++) g.fillRect(0, f * 128 + 120, 512, 6);
    const wallTex = wa.toTexture(8); wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    // roof
    const rc = canvas(256, 256), rg = rc.getContext('2d');
    rg.fillStyle = '#1b1a1d'; rg.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) { rg.fillStyle = `rgba(${r() * 60},${r() * 60},${r() * 70},0.25)`; rg.fillRect(r() * 256, r() * 256, 2, 2); }
    rg.strokeStyle = 'rgba(0,0,0,0.4)'; rg.strokeRect(0, 0, 256, 256);
    const roofTex = new THREE.CanvasTexture(rc); roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping; roofTex.colorSpace = THREE.SRGBColorSpace;
    const signTex = new THREE.CanvasTexture(this.sig.col); signTex.colorSpace = THREE.SRGBColorSpace; signTex.anisotropy = 8;

    const emissiveAlpha = (mat, k) => {
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uGlow = this.glowU;
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlow;')
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += sampledDiffuseColor.rgb * sampledDiffuseColor.a * ${k.toFixed(2)} * uGlow;`);
      };
    };
    this.glowU = { value: 1 };
    const env = this.env;
    const mFacade = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.62, metalness: 0.2, envMap: env, envMapIntensity: 0.5 });
    emissiveAlpha(mFacade, 0.92);
    const mWall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.1, envMap: env, envMapIntensity: 0.3 });
    emissiveAlpha(mWall, 0.45);
    mWall.emissive.set(0x0b0b1c);   // V3: walls keep a faint navy silhouette in the haze
    const mRoof = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.95, metalness: 0.0 });
    const mDark = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.45, envMap: env, envMapIntensity: 0.6 });
    const mSign = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide });
    this.signU = { value: 1 };
    mSign.onBeforeCompile = (sh) => {
      sh.uniforms.uSign = this.signU;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSign;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          float lum = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
          diffuseColor.rgb *= (0.5 + 1.7 * smoothstep(0.3, 0.95, lum)) * uSign;`);
    };
    this.timeU = { value: 0 };
    const mHolo = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0.85 });
    mHolo.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.timeU; sh.uniforms.uSign = this.signU;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uSign;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          diffuseColor.rgb *= (1.4 + 0.25 * sin(uTime * 6.0 + gl_FragCoord.y * 0.35)) * (0.92 + 0.08 * sin(uTime * 23.0)) * uSign;`);
    };
    const mScreen = new THREE.MeshBasicMaterial({ map: signTex });
    mScreen.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.timeU; sh.uniforms.uSign = this.signU;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uSign;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec3 c0 = diffuseColor.rgb; float sh = 0.5 + 0.5 * sin(uTime * 0.35 + vMapUv.x * 40.0);
          diffuseColor.rgb = mix(c0, c0.brg, sh * 0.45) * (0.88 + 0.12 * sin(gl_FragCoord.y * 1.4)) * 1.5 * uSign;
          diffuseColor.rgb += vec3(0.35) * smoothstep(0.985, 1.0, fract(vMapUv.y * 30.0 - uTime * 0.25)) * uSign;`);
    };
    const mCanopy = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.0 });
    mCanopy.onBeforeCompile = (sh) => {
      sh.uniforms.uGlow = this.glowU;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlow;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * 0.75 * uGlow;');
    };
    // V3 towers: curtain-wall glass (reflects the neon environment) + metal panels
    const mTower = new THREE.MeshStandardMaterial({ map: towerTexture(this.renderer.capabilities.getMaxAnisotropy()), roughness: 0.3, metalness: 0.7, envMap: env, envMapIntensity: 1.25 });
    emissiveAlpha(mTower, 0.85);
    mTower.emissive.set(0x0c1226);
    const mPanel = new THREE.MeshStandardMaterial({ map: panelTexture(), roughness: 0.55, metalness: 0.55, envMap: env, envMapIntensity: 0.7 });
    emissiveAlpha(mPanel, 0.6);
    mPanel.emissive.set(0x0a0b1a); mRoof.emissive.set(0x07070f);
    const mSpill = new THREE.MeshBasicMaterial({ map: spillTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true, polygonOffset: true, polygonOffsetFactor: -2 });
    this.mSpill = mSpill;
    const add = (list, mat) => { if (!list.length) return; const m = new THREE.Mesh(mergeGeometries(list, false), mat); m.matrixAutoUpdate = false; this.scene.add(m); };
    add(L.facade, mFacade); add(L.wall, mWall); add(L.roof, mRoof); add(L.dark, mDark); add(L.sign, mSign);
    add(L.screen, mScreen); add(L.canopy, mCanopy); add(L.holo, mHolo);
    add(L.tower, mTower); add(L.panel, mPanel); add(L.spill, mSpill);
    this.hazeMat = hazeMaterial();
    const haze = new THREE.Mesh(mergeGeometries(buildHaze(this), false), this.hazeMat); haze.renderOrder = 5; haze.frustumCulled = false; this.scene.add(haze);
    // V5: white holograms + full moon
    this.holoMats = this._holoDefs.map((d) => {
      const m = hologramMaterial(this.timeU); m.uniforms.uSeed.value = d.seed;
      const mesh = new THREE.Mesh(d.geo, m); mesh.renderOrder = 6; this.scene.add(mesh); return m;
    });
    this.moon = buildMoon();
    this.moonDir = new THREE.Vector3(Math.sin(-0.05) * Math.cos(0.218), Math.sin(0.218), -Math.cos(-0.05) * Math.cos(0.218));   // ~12.5° up, slightly left
    this.moon.scale.setScalar(150);
    this.scene.add(this.moon);
    this.mats = { mFacade, mWall, mSign };
    this.lists = null;
  }

  buildGround() {
    // pavers
    const c = canvas(1024, 1024), g = c.getContext('2d'), r = rng(9);
    g.fillStyle = '#58565a'; g.fillRect(0, 0, 1024, 1024);
    const pw = 128, ph = 64;
    for (let y = 0; y < 1024; y += ph) for (let x = -(y / ph % 2) * pw / 2; x < 1024; x += pw) {
      const v = 70 + r() * 40;
      g.fillStyle = `rgb(${v},${v - 2},${v + 4})`; g.fillRect(x + 2, y + 2, pw - 4, ph - 4);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(x + r() * pw, y + r() * ph, 2, 2); }
    }
    g.fillStyle = 'rgba(20,20,24,0.9)'; g.fillRect(0, 500, 1024, 24); // drainage line
    const tile = new THREE.CanvasTexture(c); tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.colorSpace = THREE.SRGBColorSpace; tile.anisotropy = 8;
    // light pools map
    const rect = [-60, -175, 120, 250], ppm = 3;
    const lc = canvas(rect[2] * ppm, rect[3] * ppm), lg = lc.getContext('2d');
    lg.fillStyle = '#000'; lg.fillRect(0, 0, lc.width, lc.height);
    const toC = (x, z) => [(x - rect[0]) * ppm, (1 - (z - rect[1]) / rect[3]) * lc.height];
    lg.globalCompositeOperation = 'lighter';
    for (const lp of this.lightPools) {
      const [cx, cy] = toC(lp.p[0], lp.p[2]);
      const along = lp.round ? 2.6 : lp.w * 0.55, across = lp.round ? 2.6 : 2.4;
      const ang = Math.atan2(-lp.U.z, lp.U.x);
      lg.save(); lg.translate(cx, cy); lg.rotate(ang); lg.scale(along * ppm, across * ppm);
      const gr = lg.createRadialGradient(0, 0, 0, 0, 0, 1);
      const col = new THREE.Color(lp.col);
      gr.addColorStop(0, `rgba(${col.r * 255},${col.g * 255},${col.b * 255},${0.55 * lp.k})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gr; lg.beginPath(); lg.arc(0, 0, 1, 0, 7); lg.fill(); lg.restore();
    }
    const light = new THREE.CanvasTexture(lc); light.colorSpace = THREE.SRGBColorSpace;
    const res = Math.round(Math.min(1024, (this.mobile ? 0.3 : 0.5) * Math.max(innerWidth, innerHeight)));
    this.ground = createGround({ mode: 'city', size: [240, 520], center: [0, -60], res, tile, light, lightRect: rect });
    this.scene.add(this.ground);
    this.gU = this.ground.material.uniforms;
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x4a3fb0, 0x07060f, 0.75));
    const pts = [
      [0xffb77a, -3.5, 3.4, -8, 14], [0xff3dc8, 3.8, 3.4, -16, 12], [0x55dfff, -4, 4, -26, 12],
      [0xa65cff, 4, 4.5, -38, 12], [0xffc48a, 0, 4.6, -55, 14], [0x55dfff, 3, 3.6, 4, 10],
    ];
    this.pLights = pts.map(([c, x, y, z, i]) => { const l = new THREE.PointLight(c, i, 18, 1.6); l.position.set(x, y, z); this.scene.add(l); return l; });
    // hero accent (device close-ups)
    this.hero = new THREE.PointLight(0xa54dff, 0, 3.5, 1.8);
    this.hero.position.set(2.6, 0.5, -3.6);
    this.scene.add(this.hero);
    this.key = new THREE.SpotLight(0xe8e4ff, 0, 14, 0.5, 0.8, 1.4);
    this.key.position.set(3.8, 5.5, -1);
    this.key.target.position.set(2.1, 0, -4.2);
    this.scene.add(this.key, this.key.target);
  }

  setSize(w, h, pr) {
    const res = Math.round(Math.min(1024, (this.mobile ? 0.3 : 0.5) * Math.max(w, h) * Math.min(pr, 1.5)));
    this.ground.getRenderTarget().setSize(res, Math.round(res * h / w));
  }

  // C = P.city state from timeline
  update(dt, t, C, cam) {
    this.camera.position.set(cam.x, cam.y, cam.z);
    this.camera.lookAt(cam.tx, cam.ty, cam.tz);
    this.camera.fov = cam.fov; this.camera.updateProjectionMatrix();
    // ambulance
    const A = C.amb;
    this.ambulance.update(t, A);
    // crowd
    this.crowd.update(dt, { evac: C.evac, keep: C.keep, jam: C.jam || 0 }, { x: A.x, z: A.z, active: A.visible > 0.5 }, this.camera.position);
    // devices
    this.devices.group.visible = C.devices > 0.5;
    this.devices.set(C.dev, C.stagger, C.online);
    // lights
    this.hero.intensity = C.hero * 2.4;
    this.key.intensity = C.key * 40;
    // ground
    const u = this.gU;
    u.uTime.value = t; this.timeU.value = t;
    u.uDetect.value = C.detect; u.uLane.value = C.lane; u.uScan.value = C.scan;
    u.uRowGlow.value.set(C.devices > 0.5 ? C.dev.ledInd * C.online : 0, C.devices > 0.5 ? C.dev.ledStrip * C.dev.acrylic * 0.7 + C.dev.ledWarn * C.dev.warn * 0.2 : 0, 0, C.scanZ);
    u.uAmb.value.set(A.x, A.z, A.visible > 0.5 ? A.lights : 0);
    u.uSiren.value = this.ambulance.sirenMix || 0;
    u.uSirenK.value = this.ambulance.sirenLevel || 0;
    u.uDim.value = C.dim;
    this.glowU.value = C.dim; this.signU.value = C.dim;
    this.mSpill.color.setScalar(C.dim); this.hazeMat.uniforms.uDim.value = C.dim;
    for (const m of this.holoMats) m.uniforms.uDim.value = C.dim;
    this.moon.position.copy(this.camera.position).addScaledVector(this.moonDir, 620); this.moon.lookAt(this.camera.position); this.moon.material.uniforms.uDim.value = 0.35 + 0.65 * C.dim;
  }
}
