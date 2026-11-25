// =============================================================
//  MASTER SCROLL TIMELINE
//  One GSAP timeline (pinned + scrubbed by ScrollTrigger) drives
//  every camera, light, device part, crowd and text state.
//  1 timeline unit = a fraction of the viewport height of scroll.
// =============================================================
const gsap = window.gsap;

// V3: the intro is file B's vortex + light-streams sequence, which needs more scroll
// than the V2 ring. Everything after the intro is authored at its V2 time and shifted
// by INTRO_SHIFT (gsap shiftChildren), so the rest of the story is unchanged.
const V2_INTRO_END = 9.2;
export const INTRO_SHIFT = 8.0;
const sh = (t) => +(t + INTRO_SHIFT).toFixed(2);
export const CHAPTERS = [
  ['intro', 0, 'INTRO'], ['problem', sh(9.2), 'PROBLEM'], ['concept', sh(31.0), 'CONCEPT'], ['solution', sh(38.6), 'SOLUTION'],
  ['reveal', sh(45.0), 'PRODUCT REVEAL'], ['install', sh(68.0), 'INSTALLATION'], ['viewer', sh(126.6), 'INTERACTIVE VIEWER'], ['outro', sh(139.0), 'OUTRO'],
];
export const STEPS = [78.6, 84.4, 90.4, 96.6, 103.6, 110.8, 119.8, 126.0].map(sh);
export const PRINCIPLE = [56.0, 59.2, 63.4, 66.0, 68.0].map(sh);
export const VIEWER = [128.6, 137.2].map(sh);   // range where the viewer is interactive
export const TOTAL = sh(152);
export const SWEEP = [sh(39.0), sh(44.6)];   // V5: SOLUTION — product light sweep fires once on entering this range

// ---------- text helpers
function split(el) {
  const lines = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = '';
  const chars = [];
  lines.forEach((line, li) => {
    const words = line.trim().split(/\s+/);
    words.forEach((word, wi) => {
      const w = document.createElement('span'); w.className = 'w';
      for (const ch of word) { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; w.appendChild(c); chars.push(c); }
      el.appendChild(w);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    if (li < lines.length - 1) el.appendChild(document.createElement('br'));
  });
  return chars;
}

export function buildTimeline(P) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const $ = (id) => document.getElementById(id);
  const T = (obj, vars, at, dur, ease = 'power2.inOut') => tl.to(obj, { ...vars, duration: dur, ease }, at);
  const S = (obj, vars, at) => tl.set(obj, vars, at);
  const CAM = (c, k, at, dur, ease = 'power2.inOut') => tl.to(c, { ...k, duration: dur, ease }, at);

  // --- text effects (all reversible via scrub)
  const rise = (el, at, dur = 0.7) => tl.fromTo(el, { autoAlpha: 0, y: 36, filter: 'blur(10px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: dur, ease: 'power3.out' }, at);
  const sink = (el, at, dur = 0.5) => tl.to(el, { autoAlpha: 0, y: -24, filter: 'blur(8px)', duration: dur, ease: 'power2.in' }, at);
  const charsIn = (el, at, dur = 0.9) => {
    const cs = el._chars || (el._chars = split(el));
    tl.set(el, { autoAlpha: 1 }, at);
    tl.fromTo(cs, { yPercent: 110, opacity: 0, rotateX: -70, filter: 'blur(6px)' }, { yPercent: 0, opacity: 1, rotateX: 0, filter: 'blur(0px)', duration: dur * 0.6, stagger: dur * 0.4 / cs.length, ease: 'power3.out' }, at);
  };
  const charsOut = (el, at, dur = 0.6) => {
    const cs = el._chars || (el._chars = split(el));
    tl.to(cs, { yPercent: -60, opacity: 0, filter: 'blur(8px)', duration: dur * 0.6, stagger: dur * 0.4 / cs.length, ease: 'power2.in' }, at);
    tl.set(el, { autoAlpha: 0 }, at + dur);
  };
  const maskIn = (el, at, dur = 1.0) => tl.fromTo(el, { autoAlpha: 1, clipPath: 'inset(0% 0% 100% 0%)', y: 40 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: dur, ease: 'power3.out' }, at);
  const maskOut = (el, at, dur = 0.6) => tl.to(el, { clipPath: 'inset(0% 0% 0% 100%)', duration: dur, ease: 'power2.in' }, at);
  const scatterIn = (el, at, dur) => {
    const cs = el._chars || (el._chars = split(el));
    tl.set(el, { autoAlpha: 1 }, at);
    cs.forEach((c, i) => {
      const a = (i * 2.399) % (Math.PI * 2), r = 260 + (i * 37 % 7) * 60;
      tl.fromTo(c, { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6, z: -400, rotate: (i % 2 ? 1 : -1) * (40 + i * 7 % 60), opacity: 0, filter: 'blur(14px)' },
        { x: 0, y: 0, z: 0, rotate: 0, opacity: 1, filter: 'blur(0px)', duration: dur * (0.6 + (i % 5) * 0.08), ease: 'power3.inOut' }, at + (i % 7) * dur * 0.03);
    });
  };
  const swapWorld = (at, world, setup, { overlay = true, dur = 1.0 } = {}) => {
    T(P, { wipe: 1 }, at, dur, 'power2.in');
    if (overlay) { T(P, { overlay: 1 }, at, dur, 'power2.in'); }
    S(P, { world }, at + dur);
    if (setup) setup(at + dur);
    T(P, { wipe: 2 }, at + dur, dur, 'power2.out');
    if (overlay) T(P, { overlay: 0 }, at + dur, dur, 'power2.out');
    S(P, { wipe: 0 }, at + 2 * dur + 0.01);
  };

  const L = P.lights, CL = P.camL, C = P.city, CC = P.camC, D = P.city.dev, A = P.city.amb, ST = P.studio, CS = P.camS, SD = P.studio.dev, I = P.intro;
  const lineRise = (el, at, dur = 1.2, stagger = 0.25) => {
    const ls = el.querySelectorAll('.ln > .li');
    tl.set(el, { autoAlpha: 1 }, at);
    tl.fromTo(ls, { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, duration: dur, stagger, ease: 'power3.out' }, at);
  };
  const lineOut = (el, at, dur = 0.7) => {
    tl.to(el.querySelectorAll('.ln > .li'), { yPercent: -40, opacity: 0, duration: dur, stagger: 0.08, ease: 'power2.in' }, at);
    tl.set(el, { autoAlpha: 0 }, at + dur + 0.2);
  };
  const fadeTo = (at, dur, world, setup) => {      // fade through black and switch world
    T(P, { fade: 1 }, at, dur, 'power2.in');
    S(P, { world }, at + dur);
    if (setup) setup(at + dur);
    T(P, { fade: 0 }, at + dur + 0.05, dur, 'power2.out');
  };
  const bloomFor = (w) => (w === 0 ? { s: 0.6, r: 0.6, t: 0.3, exp: 1.0 } : w === 1 ? { s: 0.62, r: 0.45, t: 0.95, exp: 1.15 } : w === 2 ? { s: 0.55, r: 0.45, t: 1.1, exp: 1.08 }
    : w === 3 ? { s: 1.05, r: 0.85, t: 0.05, exp: 1.0 }      // file B: vortex bloom
    : { s: 1.0, r: 0.75, t: 0.05, exp: 1.0 });                // file B: streams bloom
  const setBloom = (w, at) => { const b = bloomFor(w); S(P.bloom, { s: b.s, r: b.r, t: b.t }, at); S(P, { exposure: b.exp }, at); };
  const quietLights = { speed: 0.5, len: 0.55, align: 1, wall: 0.15, fold: 0, collapse: 0, intensity: 0, core: 0, pulseAmt: 0, keep: 0.1, head: 0.25, base: 0.03, dust: 0 };

  // wrap every masked line so its content can rise inside the clip
  document.querySelectorAll('.ln').forEach((ln) => { if (!ln.querySelector(':scope > .li')) { const w = document.createElement('span'); w.className = 'li'; while (ln.firstChild) w.appendChild(ln.firstChild); ln.appendChild(w); } });

  // ===================== 02 PROBLEM — words first (9.2 – 21), then the street
  const msg = (id, at, hold) => {
    const el = document.getElementById(id);
    tl.set(el, { autoAlpha: 1 }, at);
    tl.fromTo(el.querySelector('.eyebrow'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, at);
    tl.fromTo(el.querySelectorAll('.ln > .li'), { yPercent: 105 }, { yPercent: 0, duration: 1.3, stagger: 0.3, ease: 'power3.out' }, at + 0.2);
    tl.fromTo(el.querySelector('.kr-md'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' }, at + 1.0);
    tl.to(el, { autoAlpha: 0, y: -26, filter: 'blur(6px)', duration: 0.8, ease: 'power2.in' }, at + hold);
  };
  msg('pm1', 9.4, 3.2); msg('pm2', 13.2, 3.2); msg('pm3', 17.0, 3.6);
  // V3: the words now sit over the dimmed street (set up at the end of the intro), and the
  // street simply brightens here instead of fading in from black.
  T(C, { dim: 1 }, 20.6, 1.0, 'power2.inOut');
  T(P, { exposure: bloomFor(1).exp }, 20.6, 1.0, 'power2.inOut');
  CAM(CC, { x: 3, y: 34, z: 40, tx: 0, ty: 2, tz: -46, fov: 42 }, 9.2, 11.8, 'power1.inOut');
  CAM(CC, { x: 2.2, y: 12, z: 17, tx: 0, ty: 2, tz: -38 }, 21.4, 3.4, 'power2.inOut');
  CAM(CC, { x: 1.6, y: 3.0, z: 9, tx: 0, ty: 2.0, tz: -34, fov: 40 }, 24.8, 2.8, 'power2.inOut');
  // V5: lower and closer — the ambulance front (lights, light bar) framed inside the jam, not filling the screen
  CAM(CC, { x: 1.5, y: 2.4, z: -7.5, tx: 0.1, ty: 1.3, tz: -26, fov: 36 }, 27.6, 2.4, 'power1.inOut');
  tl.fromTo('#streetCap', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 22.0);
  tl.fromTo('#capA', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 22.2);
  tl.to('#capA', { autoAlpha: 0, y: -10, duration: 0.5 }, 25.4);
  tl.fromTo('#capB', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 25.8);
  tl.fromTo('#density', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 22.4);
  T(C, { jam: 1 }, 24.6, 3.6, 'power1.inOut');
  T(A, { siren: 1 }, 21.6, 1.0);   // V5: flashing as soon as the street appears T(P, { alarm: 1 }, 26.0, 1.6);
  tl.to(['#streetCap', '#density'], { autoAlpha: 0, duration: 0.6 }, 29.6);
  T(P, { alarm: 0 }, 29.6, 1.0);
  fadeTo(30.2, 0.8, 0, (at) => {
    setBloom(0, at);
    S(L, { ...quietLights, intensity: 0.6 }, at);
    S(CL, { x: 0, y: 0.6, z: 12, tx: 0, ty: -0.4, tz: -100, fov: 58 }, at);
  });

  // ===================== 03 CONCEPT — rises from below (31 – 38.6)
  CAM(CL, { z: 2, y: 0.8 }, 31, 7.4, 'none');
  T(L, { scrollPhase: 4 }, 31, 7.4, 'none');
  rise(document.getElementById('cEyebrow'), 31.6, 0.8);
  const cT = document.getElementById('cTitle');
  tl.set(cT, { autoAlpha: 1 }, 31.8);
  tl.fromTo(cT.querySelectorAll('.w'), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.4, stagger: 0.32, ease: 'power3.out' }, 31.9);
  rise(document.getElementById('cKr'), 34.0, 0.9);
  tl.to(['#cEyebrow', '#cTitle', '#cKr'], { autoAlpha: 0, y: -36, duration: 0.8, stagger: 0.08, ease: 'power2.in' }, 36.8);
  fadeTo(37.8, 0.7, 2, (at) => {
    setBloom(2, at);
    S(CS, { x: 2.9, y: 1.1, z: 3.4, tx: 0, ty: 0.05, tz: 0, fov: 30 }, at);
    S(ST, { viewer: 0, scan: 0, scanOn: 0, orbit: 0, dim: 1, rim: 1.25, key: 0.9, bgGlow: 0.8 }, at);
    S(SD, { warn: 0, panel: 0, acrylic: 0, ledStrip: 0, ledWarn: 0, ledInd: 0.3, edge: 0 }, at);
  });

  // ===================== 04 SOLUTION — product is the hero (38.6 – 45)
  CAM(CS, { x: 2.35, y: 0.82, z: 2.85, ty: 0.04 }, 38.6, 6.0, 'power1.inOut');
  rise(document.getElementById('sEyebrow'), 39.2, 0.6); maskIn(document.getElementById('sTitle'), 39.4, 1.4); rise(document.getElementById('sKr'), 40.4, 0.8);
  tl.to(['#sEyebrow', '#sTitle', '#sKr'], { autoAlpha: 0, y: -26, duration: 0.6, ease: 'power2.in' }, 43.8);

  // ===================== 05 PRODUCT REVEAL — closed state → principle (45 – 68)
  const stmt = (id, at, hold) => { rise(document.getElementById(id), at, 0.9); sink(document.getElementById(id), at + hold, 0.6); };
  CAM(CS, { x: 0.2, y: 0.24, z: 3.9, tx: 0.1, ty: 0.36, tz: 0, fov: 30 }, 44.6, 2.6);         // low side: thin, flush
  stmt('st_a', 45.6, 3.0);
  T(ST, { key: 1.9, bgGlow: 1.5, rim: 1.7 }, 44.6, 2.0); T(ST, { key: 0.9, bgGlow: 0.8, rim: 1.25 }, 48.4, 2.0);
  CAM(CS, { x: 1.7, y: 0.42, z: 1.05, tx: 0.72, ty: 0.12, tz: 0, fov: 32 }, 48.4, 2.6);    // end module
  T(SD, { ledInd: 0.75 }, 49.2, 1.2);
  stmt('st_b', 49.0, 3.0);
  CAM(CS, { x: 0.7, y: 0.5, z: 0.75, tx: 0.05, ty: 0.06, tz: 0, fov: 30 }, 51.8, 2.4);      // centre panels
  stmt('st_c', 52.4, 2.8);
  T(SD, { ledInd: 0.35 }, 52.4, 1.0);
  CAM(CS, { x: 2.9, y: 1.2, z: 3.9, tx: 1.05, ty: 0.32, tz: 0, fov: 30 }, 55.0, 2.4);       // wide 3/4 for the principle
  tl.fromTo('#principle', { autoAlpha: 0, x: 30 }, { autoAlpha: 1, x: 0, duration: 0.7, ease: 'power3.out' }, 55.4);
  T(ST, { frame: 1 }, 55.0, 2.4);                                                            // V3: product left / text right
  // DETECT
  T(SD, { ledInd: 1 }, 56.2, 0.6); T(SD, { ledInd: 0.45 }, 57.0, 0.6); T(SD, { ledInd: 1 }, 57.8, 0.6);
  // DEPLOY
  T(SD, { warn: 1, ledWarn: 1 }, 59.4, 1.4, 'power1.inOut');
  T(SD, { panel: 1 }, 60.6, 2.0, 'none');
  T(SD, { acrylic: 1 }, 62.4, 1.2, 'none');
  CAM(CS, { x: 2.6, y: 0.95, z: 3.5, ty: 0.38 }, 59.4, 4.0, 'power1.inOut');
  // GUIDE
  T(SD, { ledStrip: 1, edge: 1 }, 63.5, 1.0); T(ST, { bgGlow: 1.3 }, 63.5, 1.0);
  // RESTORE
  T(SD, { acrylic: 0, edge: 0 }, 66.1, 0.7, 'none'); T(SD, { panel: 0 }, 66.7, 0.9, 'none'); T(SD, { ledStrip: 0 }, 67.4, 0.2);
  T(SD, { warn: 0, ledWarn: 0, ledInd: 0.3 }, 67.5, 0.5); T(ST, { bgGlow: 0.8 }, 66.1, 1.2);
  tl.to('#principle', { autoAlpha: 0, x: 20, duration: 0.5 }, 67.6);
  T(ST, { frame: 0 }, 67.6, 1.0);

  // ===================== 06 INSTALLATION — cyberpunk Myeongdong (68 – 126)
  fadeTo(67.9, 0.6, 1, (at) => {
    setBloom(1, at);
    S(CC, { x: 0.4, y: 10, z: 30, tx: 0, ty: 7, tz: -70, fov: 48 }, at);
    S(C, { devices: 1, online: 0, evac: 0, keep: 0, jam: 0, dim: 1, lane: 0, detect: 0, scan: 0, scanZ: 2, hero: 0.35, key: 0.6 }, at);
    S(D, { warn: 0, panel: 0, acrylic: 0, ledStrip: 0, ledWarn: 0, ledInd: 0.3, edge: 0 }, at);
    S(A, { visible: 0, z: -140, siren: 0, lights: 0 }, at);
  });
  CAM(CC, { x: 1.2, y: 7.5, z: 16, tx: 0, ty: 3.0, tz: -50, fov: 44 }, 68.6, 3.4, 'power1.inOut');   // slow descent
  rise(document.getElementById('iEyebrow'), 69.2, 0.6); charsIn(document.getElementById('iTitle'), 69.4, 1.1); rise(document.getElementById('iKr'), 70.2, 0.7);
  tl.to(['#iEyebrow', '#iTitle', '#iKr'], { autoAlpha: 0, y: -24, filter: 'blur(8px)', duration: 0.6, ease: 'power2.in' }, 72.4);
  // V4: x 4.8 → 3.3 — at 4.8 the camera sat in the side-street mouth and the corner building's end wall filled ~1/3 of the frame
  CAM(CC, { x: 3.3, y: 3.0, z: 5.6, tx: 1.4, ty: 0.2, tz: -16, fov: 40 }, 72.0, 3.0, 'power1.inOut');   // down to the installed rows
  S(C, { scan: 1 }, 72.4); T(C, { scanZ: -48, online: 1 }, 72.4, 3.2, 'power1.inOut'); S(C, { scan: 0 }, 75.8);
  CAM(CC, { x: 0, y: 20, z: 8, tx: 0, ty: 0, tz: -20, fov: 42 }, 75.0, 2.4);
  rise(document.getElementById('iKr1'), 75.2); sink(document.getElementById('iKr1'), 76.6);
  rise(document.getElementById('iKr2'), 76.8); sink(document.getElementById('iKr2'), 78.2);
  T(C, { lane: 1 }, 75.6, 1.0); tl.fromTo('#laneTag', { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.6 }, 76.0);
  tl.to('#laneTag', { autoAlpha: 0, duration: 0.4 }, 78.0); T(C, { lane: 0 }, 78.0, 0.8);
  T(C, { keep: 1 }, 77.6, 1.0);

  // ---------- 06b OPERATION IN THE STREET (78.6 – 126)
  tl.fromTo('#rail', { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.6 }, 79.2);
  tl.to('#rail', { autoAlpha: 0, x: -20, duration: 0.6 }, 125.6);
  const stepIn = (id, at) => tl.fromTo(id, { autoAlpha: 0, y: 30, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' }, at);
  const stepOut = (id, at) => tl.to(id, { autoAlpha: 0, y: -20, filter: 'blur(6px)', duration: 0.4, ease: 'power2.in' }, at);

  // S1 STANDBY
  CAM(CC, { x: 4.3, y: 0.5, z: -0.5, tx: 2.1, ty: 0.06, tz: -4.4, fov: 32 }, 78.6, 3.0);
  stepIn('#st1', 80.0); stepOut('#st1', 84.0);
  // S2 DETECTION
  S(A, { visible: 1, x: 0, z: -100, siren: 1, lights: 1 }, 84.0);
  CAM(CC, { x: 3.4, y: 2.4, z: 4.8, tx: 0.4, ty: 0.9, tz: -45, fov: 38 }, 84.4, 2.8);
  T(A, { z: -66 }, 84.4, 6.0, 'power1.inOut');
  T(C, { detect: 1 }, 86.0, 1.6); T(D, { ledInd: 0.75 }, 86.0, 1.6);
  stepIn('#st2', 85.0); stepOut('#st2', 90.0);
  // S3 EARLY WARNING
  CAM(CC, { x: 2.95, y: 0.34, z: -1.95, tx: 2.1, ty: 0.08, tz: -2.85, fov: 30 }, 90.4, 2.6);
  T(C, { detect: 0.35, hero: 1, key: 1 }, 91.0, 1.5);
  T(D, { warn: 1 }, 92.6, 3.4, 'power1.inOut'); T(D, { ledWarn: 1 }, 93.0, 3.0);
  T(C, { evac: 0.35 }, 93.0, 4.0, 'power1.inOut');
  stepIn('#st3', 91.0); stepOut('#st3', 96.2);
  // S4 SIDE PANEL
  CAM(CC, { x: 3.2, y: 0.22, z: -2.95, tx: 2.1, ty: 0.1, tz: -3.3, fov: 30 }, 96.6, 1.9);
  CAM(CC, { x: 3.8, y: 1.05, z: -1.55, tx: 2.1, ty: 0.5, tz: -3.6, fov: 32 }, 98.5, 4.6, 'power1.inOut');
  T(D, { panel: 1 }, 98.5, 4.6, 'none');
  T(C, { evac: 0.6 }, 98.5, 4.6, 'power1.inOut');
  stepIn('#st4', 97.2); stepOut('#st4', 103.2);
  // S5 TRANSPARENT BARRIER
  CAM(CC, { x: 3.25, y: 0.42, z: -4.5, tx: 2.1, ty: 0.22, tz: -4.0, fov: 34 }, 103.6, 1.9);
  T(D, { acrylic: 1 }, 105.5, 3.0, 'none');
  CAM(CC, { ty: 0.62, y: 0.62 }, 105.6, 2.9, 'power1.inOut');
  T(D, { ledStrip: 1 }, 106.0, 2.5); T(D, { edge: 1 }, 106.5, 2.0);
  CAM(CC, { x: 0.55, y: 1.0, z: 0.2, tx: 2.1, ty: 0.42, tz: -4.6, fov: 36 }, 108.5, 2.3);
  stepIn('#st5', 104.0); stepOut('#st5', 110.4);
  // S6 EMERGENCY PASSAGE
  CAM(CC, { x: 0.0, y: 15, z: 13, tx: 0, ty: 0, tz: -24, fov: 40 }, 110.8, 2.4);
  T(C, { keep: 0 }, 110.8, 1.5);
  T(C, { keep: 1 }, 119.8, 1.5);
  T(C, { evac: 1 }, 111.0, 3.0, 'power1.inOut'); T(C, { lane: 0.8, hero: 0.4 }, 112.0, 2.0);
  T(A, { z: -36 }, 113.4, 2.8, 'power1.in');
  CAM(CC, { x: 1.72, y: 0.55, z: 5.5, tx: 0.2, ty: 0.9, tz: -14, fov: 38 }, 114.8, 1.8);
  T(A, { z: 46 }, 116.4, 3.4, 'none');
  stepIn('#st6', 111.4); stepOut('#st6', 119.4);
  // S7 RESTORATION
  S(A, { visible: 0 }, 119.9);
  T(C, { lane: 0, detect: 0 }, 119.8, 0.8);
  CAM(CC, { x: 3.4, y: 0.62, z: -1.4, tx: 2.1, ty: 0.22, tz: -4.0, fov: 32 }, 119.8, 1.8);
  T(D, { acrylic: 0, edge: 0 }, 120.6, 1.6, 'none');
  T(D, { panel: 0 }, 122.2, 1.8, 'none');
  T(D, { ledStrip: 0 }, 123.6, 0.6);
  T(D, { warn: 0, ledWarn: 0 }, 124.2, 1.3, 'power1.inOut');
  T(C, { evac: 0, hero: 0.3, key: 0.6 }, 122.4, 3.6, 'power1.inOut');
  T(D, { ledInd: 0.3 }, 124.5, 1.0);
  CAM(CC, { x: 3.05, y: 0.28, z: -2.2, tx: 2.1, ty: 0.05, tz: -4.0, fov: 32 }, 123.0, 2.6);
  stepIn('#st7', 120.4); stepOut('#st7', 125.6);


  // ===================== 07 INTERACTIVE VIEWER (126.6 – 139)
  fadeTo(126.0, 0.7, 2, (at) => {
    setBloom(2, at);
    S(CS, { x: 2.6, y: 1.0, z: 3.5, tx: 0, ty: 0.3, tz: 0, fov: 30 }, at);
    S(ST, { viewer: 0, dim: 1, rim: 1.3, key: 1, bgGlow: 1.15 }, at);
    S(SD, { warn: 0, panel: 0, acrylic: 0, ledStrip: 0, ledWarn: 0, ledInd: 0.35, edge: 0 }, at);
  });
  T(ST, { viewer: 1 }, 126.8, 1.6, 'power2.inOut');
  tl.fromTo('#vHead', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 127.4);
  tl.fromTo(['#vCtrl', '#vHint'], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.15, ease: 'power3.out' }, 127.8);
  tl.to({}, { duration: 8.0 }, 129);                                     // hold: the user explores here
  tl.to(['#vHead', '#vCtrl', '#vHint'], { autoAlpha: 0, y: -16, duration: 0.6, ease: 'power2.in' }, 137.4);
  T(P, { fade: 1 }, 137.8, 1.0, 'power2.in');
  S(P, { world: 0 }, 138.85); S(L, { ...quietLights, intensity: 0 }, 138.85); setBloom(0, 138.85);

  // ===================== 08 OUTRO (139 – 152)
  S(P, { fade: 0 }, 139.0);
  lineRise(document.getElementById('oClear'), 139.8, 1.6, 0.2);
  lineRise(document.getElementById('oSave'), 141.2, 1.6, 0.2);
  rise(document.getElementById('oKr'), 142.6, 1.0);
  // V3: thin purple horizon curve — rises from below and brightens, then its glow spreads sideways, then holds
  tl.fromTo('#horizon', { '--hl': 0, y: 70 }, { '--hl': 1, y: 0, duration: 2.0, ease: 'power2.out' }, 143.8);
  tl.fromTo('#horizon', { '--hs': 0 }, { '--hs': 1, duration: 2.6, ease: 'power1.inOut' }, 145.4);
  tl.fromTo('#final', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 147.6);
  tl.to({}, { duration: 0.01 }, TOTAL - INTRO_SHIFT);   // (authored at V2 time, shifted below)

  // ---- shift everything authored at V2 times behind the longer intro
  tl.shiftChildren(INTRO_SHIFT, false, V2_INTRO_END - 0.01);
  CHAPTERS.forEach(([name, t]) => tl.addLabel(name, t));

  // ===================== 01 INTRO — file B: vortex title → light streams phrase (0 – 17.2)
  // world 3 = file B IntroVortex (hero), world 4 = file B FlowStreams (concept phrase).
  // I.q / I.s are file B's section progress values; its own DOM rules run in main.js hud().
  S(P, { world: 3 }, 0); setBloom(3, 0);
  S(I, { q: 0, s: 0 }, 0);
  T(I, { q: 0.54 }, 0, 8.6, 'none');                         // B hero: title out → PHASE 01 → PHASE 02
  T(P.bloom, { s: 1.07 }, 6.4, 2.2, 'none');                  // B: 1.05 + 0.4·ramp(q,.5,.9)
  tl.to('#heroMeta', { autoAlpha: 0, duration: 0.8 }, 7.4);
  fadeTo(8.6, 0.6, 4, (at) => { setBloom(4, at); S(I, { s: 0 }, at); });
  T(I, { s: 1 }, 9.4, 6.0, 'none');                           // B concept streams (phrase range .09–.88)
  // phrase → Myeongdong street: short fade, the street arrives dimmed under the problem words
  fadeTo(15.6, 0.55, 1, (at) => {
    setBloom(1, at); S(P, { exposure: 0.8 }, at);
    S(CC, { x: 3, y: 34, z: 40, tx: 0, ty: 2, tz: -46, fov: 42 }, at);
    CAM(CC, { x: 4.5, y: 40, z: 46, tz: -48 }, at, INTRO_SHIFT + 9.2 - at, 'none');   // slow aerial drift
    S(C, { devices: 0, evac: 0, keep: 0, jam: 0, dim: 0.32, lane: 0, detect: 0, scan: 0, hero: 0, key: 0 }, at);
    // V5: the ambulance is stuck in the crowd much closer (z -92 → -24) so it reads in the street shots
    S(A, { visible: 1, x: 0.2, z: -24, siren: 0.0, lights: 0.5 }, at);
  });
  return tl;
}
