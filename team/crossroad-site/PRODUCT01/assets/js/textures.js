// =============================================================
//  Procedural textures & texture atlases (canvas based)
// =============================================================
import * as THREE from 'three';

export const FONT = "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// ---- shelf-packing atlas. Two canvases: colour + emissive mask.
//      Packed into ONE RGBA DataTexture (rgb colour, a = emissive)
export class Atlas {
  constructor(w, h, { pad = 3, name = 'atlas' } = {}) {
    this.name = name;
    this.w = w; this.h = h; this.pad = pad;
    this.col = canvas(w, h); this.emi = canvas(w, h);
    this.cc = this.col.getContext('2d'); this.ec = this.emi.getContext('2d');
    this.cc.fillStyle = '#000'; this.cc.fillRect(0, 0, w, h);
    this.ec.fillStyle = '#000'; this.ec.fillRect(0, 0, w, h);
    this.x = 0; this.y = 0; this.rowH = 0;
  }
  alloc(w, h) {
    w = Math.max(4, Math.ceil(w)); h = Math.max(4, Math.ceil(h));
    const p = this.pad;
    if (w + 2 * p > this.w) { const k = (this.w - 2 * p) / w; w = Math.floor(w * k); h = Math.floor(h * k); }
    const W2 = w + 2 * p, H2 = h + 2 * p;
    this.shelves = this.shelves || [];
    this.top = this.top || 0;
    // best-fit shelf: tall enough, not wastefully taller, with room left
    let bucket = 16; while (bucket < H2) bucket = Math.ceil(bucket * 1.22);
    let best = null;
    for (const sh of this.shelves) {
      if (sh.h === bucket && sh.x + W2 <= this.w) { best = sh; break; }
    }
    if (!best) {
      if (this.top + bucket > this.h) {
        // fallback: any shelf with room
        for (const sh of this.shelves) if (sh.h >= H2 && sh.x + W2 <= this.w && (!best || sh.h < best.h)) best = sh;
        if (!best) { console.warn('atlas full: ' + this.name); best = this.shelves[0] || { x: 0, y: 0, h: H2 }; best.x = 0; }
      } else { best = { x: 0, y: this.top, h: bucket }; this.shelves.push(best); this.top += bucket; }
    }
    this.used = (this.used || 0) + W2 * H2; this.count = (this.count || 0) + 1;
    const r = { x: best.x + p, y: best.y + p, w, h };
    best.x += W2;
    r.u0 = r.x / this.w; r.u1 = (r.x + r.w) / this.w;
    r.v1 = 1 - r.y / this.h; r.v0 = 1 - (r.y + r.h) / this.h;
    return r;
  }
  // build the final texture; colour rgb, emissive in alpha
  toTexture(anisotropy = 8) {
    const a = this.cc.getImageData(0, 0, this.w, this.h).data;
    const e = this.ec.getImageData(0, 0, this.w, this.h).data;
    const out = new Uint8Array(this.w * this.h * 4);
    // flipY manually (DataTexture has no flipY)
    for (let y = 0; y < this.h; y++) {
      const src = y * this.w * 4, dst = (this.h - 1 - y) * this.w * 4;
      for (let x = 0; x < this.w * 4; x += 4) {
        out[dst + x] = a[src + x]; out[dst + x + 1] = a[src + x + 1]; out[dst + x + 2] = a[src + x + 2];
        out[dst + x + 3] = e[src + x];
      }
    }
    const t = new THREE.DataTexture(out, this.w, this.h, THREE.RGBAFormat);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = anisotropy;
    t.needsUpdate = true;
    this.col.width = this.col.height = 1; this.emi.width = this.emi.height = 1; // free
    return t;
  }
}

// colour helpers
export const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

export function noiseFill(ctx, x, y, w, h, r, amt = 18, alpha = 0.18) {
  const id = ctx.getImageData(x, y, w, h);
  for (let i = 0; i < id.data.length; i += 4) {
    const n = (r() - 0.5) * amt;
    id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n;
  }
  ctx.putImageData(id, x, y);
}

// fit text into a box
export function fitText(ctx, text, maxW, maxH, weight = 700, family = FONT) {
  let size = maxH;
  ctx.font = `${weight} ${size}px ${family}`;
  const m = ctx.measureText(text).width;
  if (m > maxW) size = size * maxW / m;
  ctx.font = `${weight} ${Math.floor(size)}px ${family}`;
  return size;
}

export async function loadFont(url) {
  try {
    const src = typeof url === 'string' ? `url(${url}) format('woff2')` : url;   // URL or ArrayBuffer
    const ff = new FontFace('Pretendard', src, { weight: '45 920', style: 'normal' });
    await ff.load();
    document.fonts.add(ff);
    await Promise.all([document.fonts.load(`700 40px Pretendard`, '명동가'), document.fonts.load(`300 40px Pretendard`, 'A')]);
  } catch (e) { console.warn('font load failed', e); }
}

// radial glow sprite texture
export function glowTexture(size = 128, inner = 'rgba(255,255,255,1)', mid = 'rgba(190,120,255,0.35)') {
  const c = canvas(size, size), g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner); gr.addColorStop(0.18, mid); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// soft rectangular contact shadow
export function contactShadowTexture(w = 512, h = 128) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#000'; g.filter = 'blur(18px)';
  g.globalAlpha = 0.9; g.fillRect(48, 40, w - 96, h - 80);
  const t = new THREE.CanvasTexture(c); return t;
}
