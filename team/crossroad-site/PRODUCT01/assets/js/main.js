// =============================================================
//  2030 MYEONGDONG — FUTURE EMERGENCY PATH
//  bootstrap · loading · render loop · scroll binding
// =============================================================
import * as THREE from 'three';
import { loadFont } from './textures.js';
import { loadDeviceRig, defaultDeviceState } from './device.js';
import { neonEnv, studioEnv } from './env.js';
import { createPost } from './post.js';
import { LightsWorld } from './worlds/lights.js';
import { CityWorld } from './worlds/city.js';
import { StudioWorld } from './worlds/studio.js';
import { VortexWorld, StreamsWorld } from './intro/IntroWorlds.js';   // file B intro (vortex + light streams)
import { buildTimeline, CHAPTERS, STEPS, PRINCIPLE, VIEWER, TOTAL , SWEEP } from './timeline.js';

const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const ASSETS = new URL('assets/', location.href);   // index.html sits next to assets/
const EMB = window.__EMB || null;                    // embedded model + font (only when opened by double-click, file://)
const b64buf = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0)).buffer;
const asset = (p) => new URL(p, ASSETS).href;
const $ = (id) => document.getElementById(id);
const mobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
const params = new URLSearchParams(location.search);

// ---------------- shared animation state (written by the timeline)
const P = {
  world: 3, wipe: 0, fade: 0, alarm: 0, overlay: 0, exposure: 1,
  bloom: { s: 0.5, r: 0.5, t: 0.75 },
  intro: { q: 0, s: 0, ignite: 0, veil: 1 },   // q = file B hero progress, s = file B concept-streams progress
  viewer: { az: 0.62, el: 0.3, r: 4.9, tx: 0, ty: 0.36, tz: 0, t: 0, azT: 0.62, elT: 0.3, target: 0 },
  mouse: { x: 0, y: 0, tx: 0, ty: 0 },
  boot: { v: 0 },
  lights: { speed: 0.7, align: 0, wall: 0, fold: 0, collapse: 0, intensity: 1, len: 0.12, pulse: -1, pulseAmt: 0, core: 1, coreScale: 9, scrollPhase: 0, keep: 1, head: 1, base: 0.012, dust: 1 },
  camL: { x: 0, y: 0, z: 10, tx: 0, ty: 0, tz: -100, fov: 60 },
  city: {
    devices: 0, online: 0, evac: 0, keep: 0, jam: 0, stagger: 0.06, detect: 0, lane: 0, scan: 0, scanZ: 2, dim: 1, hero: 0, key: 0,
    dev: defaultDeviceState(),
    amb: { visible: 1, x: 0, z: -95, siren: 0.6, lights: 1 },
  },
  camC: { x: 4, y: 30, z: 34, tx: 0, ty: 0, tz: -42, fov: 42 },
  studio: { dev: defaultDeviceState(), frame: 0, sweep: 0, viewer: 0, scan: 0, scanOn: 0, orbit: 0, dim: 1, rim: 1, key: 1, bgGlow: 1 },
  camS: { x: 2.9, y: 1.25, z: 3.3, tx: 0, ty: 0.03, tz: 0, fov: 30 },
};

// ---------------- loader UI
const setLoad = (p, txt) => { $('ldBar').style.width = `${Math.round(p * 100)}%`; $('ldPct').textContent = `${Math.round(p * 100)}%`; if (txt) $('ldText').textContent = txt; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

async function init() {
  const canvas = $('gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
  } catch (e) {
    $('fallback').hidden = false; $('loader').classList.add('done'); return;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  let pr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.6);
  if (params.has('pr')) pr = parseFloat(params.get('pr'));
  renderer.setPixelRatio(pr);
  const W = () => innerWidth, H = () => innerHeight;
  renderer.setSize(W(), H(), false);

  setLoad(0.05, 'TYPE');
  await loadFont(EMB ? b64buf(EMB.font) : asset('fonts/PretendardVariable.woff2'));
  setLoad(0.15, 'DEVICE MODEL');
  const rig = await loadDeviceRig(EMB ? b64buf(EMB.glb) : asset('models/emergency-path-device.glb'));
  setLoad(0.3, 'LIGHT'); await nextFrame();
  const envCity = neonEnv(renderer);
  const envStudio = studioEnv(renderer);
  const lights = new LightsWorld({ count: mobile ? 80 : 120 });
  setLoad(0.38, 'MYEONGDONG 2030'); await nextFrame();
  const city = new CityWorld(renderer, { quality: mobile ? 'low' : 'high', env: envCity, rig, mobile });
  setLoad(0.72, 'STUDIO'); await nextFrame();
  const studio = new StudioWorld(renderer, { env: envStudio, rig, mobile });
  const vortex = new VortexWorld();
  const streams = new StreamsWorld();
  const worlds = [lights, city, studio, vortex, streams];
  if (mobile) P.viewer.r = 6.2;

  const post = createPost(renderer, Math.round(W() * pr), Math.round(H() * pr));
  if (!mobile) { post.composer.renderTarget1.samples = 4; post.composer.renderTarget2.samples = 4; }

  // ---------------- sizing
  const refAspect = 1.6;
  const fovAdj = (fov) => {
    const a = W() / H();
    if (a >= refAspect) return fov;
    const f = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * Math.pow(refAspect / a, 0.62));
    return Math.min(82, THREE.MathUtils.radToDeg(f));
  };
  const resize = () => {
    renderer.setPixelRatio(pr);
    renderer.setSize(W(), H(), false);
    post.composer.setPixelRatio(pr);
    post.composer.setSize(W(), H());
    post.final.uniforms.uRes.value.set(W() * pr, H() * pr);
    for (const w of worlds) { w.camera.aspect = W() / H(); w.camera.updateProjectionMatrix(); w.setSize && w.setSize(W(), H(), pr); }
  };
  resize();
  addEventListener('resize', () => { resize(); });

  // fov correction for narrow screens, used by file B's intro cameras as a scale
  const fovScale = (fov) => fovAdj(fov) / fov;
  let introCam = { blur: 0, distort: 0 };
  // ---------------- warm-up: compile & upload every world
  setLoad(0.82, 'COMPILING SHADERS'); await nextFrame();
  const camOf = (i) => (i === 0 ? P.camL : i === 1 ? P.camC : P.camS);
  for (let i = 0; i < worlds.length; i++) {
    const w = worlds[i];
    updateWorld(i, 0.016, 0);
    try { renderer.compile(w.scene, w.camera); } catch (e) { /* ignore */ }
    post.mainPass.scene = w.scene; post.mainPass.camera = w.camera;
    post.final.uniforms.uFade.value = 1;
    post.composer.render(0.016);
    setLoad(0.82 + 0.05 * (i + 1)); await nextFrame();
  }

  function updateWorld(i, dt, t) {
    if (i === 3) { vortex.ignite = P.intro.ignite; introCam = vortex.update(dt, P.intro.q, P.mouse, fovScale(40)); return; }
    if (i === 4) { streams.update(dt, P.intro.s, P.mouse, fovScale(46)); return; }
    const c = camOf(i);
    const cam = { ...c, fov: fovAdj(c.fov) };
    const M = P.mouse, k = i === 1 ? 0.5 : i === 2 ? 0.05 * (1 - P.studio.viewer) : 0.3;
    cam.x += M.x * k * 0.5; cam.y += M.y * k * 0.3; cam.tx += M.x * k * 0.25;
    if (mobile && i === 2) cam.tx *= 0.2;   // keep the product centred on narrow screens
    if (i === 0) {
      const L = { ...P.lights };
      const b = P.boot.v;
      L.intensity *= THREE.MathUtils.smoothstep(b, 0.18, 1.0);
      L.core *= Math.min(1, b * 3);
      lights.scene.background = lights._bg || (lights._bg = lights.scene.background);
      lights.dust.visible = lights.core.visible = lights.haze.visible = true;
      lights.update(dt, t, L, cam);
    } else if (i === 1) city.update(dt, t, P.city, cam);
    else {
      studio.update(dt, t, P.studio, cam, P.viewer);
      // V3 reveal layout: frame the product left of the HOW IT WORKS column (desktop),
      // or above the stacked text (narrow screens). Lens shift + slight zoom-out only:
      // camera position, target and the model stay exactly as authored.
      const f = P.studio.frame, sc = studio.camera;
      if (f > 0.001) {
        const narrow = W() < 820 || W() / H() < 1.0;
        const z = 1 + (narrow ? 0.32 : 0.3) * f;
        sc.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(sc.fov) / 2) * z));
        const w = W(), h = H();
        sc.setViewOffset(w, h, narrow ? 0 : w * 0.1 * f, narrow ? h * 0.2 * f : 0, w, h);
      } else if (sc.view && sc.view.enabled) sc.clearViewOffset();
      sc.updateProjectionMatrix();
    }
  }

  // ---------------- timeline + scroll
  const tl = buildTimeline(P);
  // V4 pacing: ~1.7x more scroll per timeline unit than V3 (each scene lasts longer under the wheel)
  const unit = () => Math.max(170, H() * (mobile ? 0.3 : 0.32));
  const st = ScrollTrigger.create({
    trigger: '#stage', start: 'top top', end: () => '+=' + Math.round(TOTAL * unit()),
    pin: true, scrub: mobile ? 1.0 : 1.6, animation: tl, invalidateOnRefresh: true, anticipatePin: 1,
  });
  ScrollTrigger.config({ ignoreMobileResize: true });

  // ---------------- V4 wheel pacing: a fast wheel flick can no longer jump several scenes.
  // Wheel input moves a target; the page follows it at a capped speed (≈1.6 screens / s),
  // eased in and out. Touch, keyboard, scrollbar and the chapter buttons stay native: any
  // scroll that does not come from here simply re-syncs the target.
  let wTarget = scrollY, wActive = false, wOwn = 0;
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.defaultPrevented) return;
    e.preventDefault();
    const d = e.deltaMode === 1 ? e.deltaY * 36 : e.deltaMode === 2 ? e.deltaY * H() : e.deltaY;
    const step = Math.max(-H() * 0.6, Math.min(H() * 0.6, d));
    if (!wActive) wTarget = scrollY;
    wTarget = Math.max(0, Math.min(maxScroll(), wTarget + step));
    wActive = true;
  }, { passive: false });
  addEventListener('scroll', () => { if (wOwn) { wOwn = 0; return; } if (!wActive) wTarget = scrollY; }, { passive: true });
  function wheelStep(dt) {
    if (!wActive) return;
    const diff = wTarget - scrollY;
    if (Math.abs(diff) < 0.6) { wActive = false; return; }
    const vmax = H() * 1.6 * dt;                          // capped speed
    const v = Math.sign(diff) * Math.min(Math.abs(diff) * (1 - Math.exp(-dt * 7)), vmax);
    wOwn = 1; window.scrollTo(0, scrollY + (Math.abs(v) < 0.6 ? diff : v));
  }
  const stopWheel = () => { wActive = false; wTarget = scrollY; };
  addEventListener('keydown', stopWheel); addEventListener('touchstart', stopWheel, { passive: true }); addEventListener('pointerdown', stopWheel);
  const jumpTo = (name) => {
    stopWheel();
    const ch = CHAPTERS.find((c) => c[0] === name); if (!ch) return;
    const t = name === 'intro' ? 0 : ch[1] + 0.8;
    const y = st.start + (t / tl.duration()) * (st.end - st.start);
    window.scrollTo({ top: y, behavior: Math.abs(y - scrollY) > H() * 14 ? 'auto' : 'smooth' });
  };
  document.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); jumpTo(b.dataset.jump); }));
  if (params.has('t')) { // debug: ?t=<timeline time>
    const t = parseFloat(params.get('t'));
    requestAnimationFrame(() => { const y = st.start + (t / tl.duration()) * (st.end - st.start); window.scrollTo(0, y); st.scroll(y); tl.progress(t / tl.duration()); });
  }

  // ---------------- HUD
  const chapterBtns = [...document.querySelectorAll('.chapters button')];
  const railItems = [...document.querySelectorAll('#rail li')];
  const ramp = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  const smooth = (v) => v * v * (3 - 2 * v);
  const ranged = [...document.querySelectorAll('#bIntro [data-range]')].map((el) => { const [a, b] = el.dataset.range.split(',').map(Number); return { el, a, b }; });
  const phases = [...document.querySelectorAll('#bIntro .phase')].map((el) => { const [a, b] = el.dataset.p.split(',').map(Number); return { el, a, b }; });
  const heroTitle = $('heroTitle'), scrollHintEl = $('scrollHint');
  let introDone = false;
  let sweepFired = false;
  const SW = { v: 0 };   // V5 light-sweep progress
  let lastCh = -1, lastStep = -2, lastPr = -2, viewerOn = false;
  const prItems = [...document.querySelectorAll('#principle li')];
  const densBar = $('densBar'), densVal = $('densVal'), viewerLayer = $('viewerLayer'), vState = $('vState'), vStateBox = vState.parentElement, vProg = $('vProg');

  // ---------------- interactive viewer: drag to rotate, OPEN / CLOSE
  const V = P.viewer, pad = $('viewerPad'), btnOpen = $('btnOpen'), btnClose = $('btnClose');
  let drag = null;
  function endDrag() { if (drag) { try { pad.releasePointerCapture(drag.id); } catch (e) { /* */ } drag = null; pad.classList.remove('dragging'); } }
  pad.addEventListener('pointerdown', (e) => {
    if (!viewerOn || e.button > 0) return;
    e.preventDefault();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now() };
    try { pad.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    pad.classList.add('dragging');
  });
  pad.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    e.preventDefault();
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    V.azT -= dx * 0.0062;
    V.elT = Math.min(1.15, Math.max(0.04, V.elT + dy * 0.0042));
  });
  const up = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy), quick = performance.now() - drag.t0 < 350;
    endDrag();
    if (moved < 5 && quick) setDeploy(V.target > 0.5 ? 0 : 1);
  };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', () => endDrag());
  pad.addEventListener('dragstart', (e) => e.preventDefault());
  function setDeploy(open) {
    V.target = open;
    btnOpen.disabled = open === 1; btnClose.disabled = open === 0;
    const b = open ? btnOpen : btnClose; b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
    gsap.to(V, { t: open, duration: 0.3 + 3.6 * Math.abs(open - V.t), ease: 'power1.inOut', overwrite: true });
  }
  btnOpen.addEventListener('click', () => { if (V.target !== 1) setDeploy(1); });
  btnClose.addEventListener('click', () => { if (V.target !== 0) setDeploy(0); });
  addEventListener('pointermove', (e) => { P.mouse.tx = (e.clientX / innerWidth - 0.5) * 2; P.mouse.ty = -(e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  const mech = (t) => { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function hud() {
    const t = tl.time();
    // V5: product light sweep — fires once each time the SOLUTION range is entered (either direction)
    const inSweep = t >= SWEEP[0] && t < SWEEP[1];
    // (tweens its own object: an overwrite on P.studio would kill the scroll timeline's studio tweens)
    if (inSweep && !sweepFired) { sweepFired = true; gsap.killTweensOf(SW); gsap.fromTo(SW, { v: 0 }, { v: 1, duration: 1.05, ease: 'none', delay: 0.15 }); }
    else if (!inSweep && sweepFired) { sweepFired = false; gsap.killTweensOf(SW); SW.v = 0; }
    P.studio.sweep = SW.v;
    // ---- file B intro DOM rules (updateDOM in file B main.js), driven by the hero / streams progress
    const hq = P.intro.q, sq = P.intro.s;
    for (const r of ranged) {
      const fin = smooth(ramp(sq, r.a, r.a + 0.09));
      const fout = r.b >= 0.97 ? 1 : 1 - smooth(ramp(sq, r.b - 0.08, r.b));
      r.el.style.setProperty('--in', fin.toFixed(4));
      r.el.style.setProperty('--out', fout.toFixed(4));
      r.el.style.visibility = fin * fout < 0.002 ? 'hidden' : 'visible';
    }
    heroTitle.style.setProperty('--out', (1 - smooth(ramp(hq, 0.2, 0.34))).toFixed(4));
    heroTitle.style.transform = `translateY(${(-hq * 120).toFixed(1)}px)`;
    if (introDone) scrollHintEl.style.opacity = String(1 - ramp(hq, 0.02, 0.1));
    for (const ph of phases) ph.el.style.setProperty('--in', (smooth(ramp(hq, ph.a, ph.a + 0.05)) * (1 - smooth(ramp(hq, ph.b - 0.05, ph.b)))).toFixed(3));
    $('prog').style.width = `${(t / TOTAL) * 100}%`;
    let ci = 0; for (let i = 0; i < CHAPTERS.length; i++) if (t >= CHAPTERS[i][1] - 0.01) ci = i;
    if (ci !== lastCh) {
      lastCh = ci;
      $('sceneNo').textContent = String(ci + 1).padStart(2, '0');
      $('sceneName').textContent = CHAPTERS[ci][2];
      chapterBtns.forEach((b, i) => b.classList.toggle('on', i === ci));
    }
    let si = -1; for (let i = 0; i < STEPS.length - 1; i++) if (t >= STEPS[i] && t < STEPS[i + 1]) si = i;
    if (si !== lastStep) { lastStep = si; railItems.forEach((li, i) => { li.classList.toggle('on', i === si); li.classList.toggle('done', si >= 0 && i < si); }); }
    $('angleVal').textContent = Math.round(90 * mech(P.city.dev.panel));
    let pi = -1; for (let i = 0; i < PRINCIPLE.length - 1; i++) if (t >= PRINCIPLE[i] && t < PRINCIPLE[i + 1]) pi = i;
    if (pi !== lastPr) { lastPr = pi; prItems.forEach((li, i) => li.classList.toggle('on', i === pi)); }
    const jam = P.city.jam;
    densBar.style.width = `${12 + jam * 86}%`;
    const dl = jam < 0.3 ? 'FLOW' : jam < 0.75 ? 'DENSE' : 'CONGESTED';
    if (densVal.textContent !== dl) densVal.textContent = dl;
    const vOn = t >= VIEWER[0] && t <= VIEWER[1];
    if (vOn !== viewerOn) { viewerOn = vOn; viewerLayer.classList.toggle('active', vOn); if (!vOn) endDrag(); }
    const vt = P.viewer.t, moving = vt > 0.002 && vt < 0.998;
    const label = moving ? (P.viewer.target > 0.5 ? 'DEPLOYING…' : 'RETRACTING…') : vt >= 0.998 ? 'DEPLOYED STATE' : 'CLOSED STATE';
    if (vState.textContent !== label) { vState.textContent = label; vStateBox.classList.toggle('open', vt >= 0.998); vStateBox.classList.toggle('moving', moving); }
    vProg.style.width = `${vt * 100}%`;
  }

  // ---------------- render loop
  const clock = new THREE.Clock();
  let t = 0, acc = 0, frames = 0;
  // V4 adaptive resolution: decided at the START of a frame, so a resize is always followed by a
  // full render in the same frame (resizing after the render left one cleared/black frame on
  // screen). Hysteresis: it only steps up again after 6 s of headroom and at most 3 times, so it
  // can no longer oscillate (each oscillation re-allocated every render target).
  let ups = 0, lastChange = 0;
  function adapt(now) {
    if (params.has('pr')) return;                       // fixed pixel ratio for testing
    acc += lastDt; frames++;
    if (acc < 1.5) return;
    const ft = acc / frames; acc = 0; frames = 0;
    const maxPr = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.6);
    if (ft > 1 / 38 && pr > 0.75) { pr = Math.max(0.75, +(pr - 0.15).toFixed(2)); resize(); lastChange = now; }
    else if (ft < 1 / 57 && ups < 3 && now - lastChange > 6 && pr < maxPr - 0.05) { pr = Math.min(+(pr + 0.1).toFixed(2), maxPr); resize(); lastChange = now; ups++; }
  }
  let lastDt = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.1);
    t += dt; lastDt = dt;
    adapt(t);
    wheelStep(dt);
    const dk = 1 - Math.pow(0.002, dt);
    P.mouse.x += (P.mouse.tx - P.mouse.x) * dk * 0.35; P.mouse.y += (P.mouse.ty - P.mouse.y) * dk * 0.35;
    if (drag) { P.mouse.x *= 0.9; P.mouse.y *= 0.9; }
    const vk = 1 - Math.pow(0.0001, dt);
    V.az += (V.azT - V.az) * vk; V.el += (V.elT - V.el) * vk;
    const wi = Math.round(P.world);
    updateWorld(wi, dt, t);
    const w = worlds[wi];
    post.mainPass.scene = w.scene; post.mainPass.camera = w.camera;
    // light-trail overlay during world transitions
    if (wi !== 0 && P.overlay > 0.01) {
      post.overlayPass.enabled = true;
      post.overlayPass.scene = lights.scene; post.overlayPass.camera = lights.camera;
      lights.scene.background = null;
      lights.dust.visible = lights.core.visible = lights.haze.visible = false;
      lights.update(dt, t, { ...P.lights, align: 0, wall: 0, fold: 0, collapse: 0, speed: 7, len: 0.42, intensity: P.overlay * 1.3, pulseAmt: 0, core: 0, scrollPhase: P.lights.scrollPhase + P.overlay * 2 }, { x: 0, y: 0, z: 10, tx: 0, ty: 0, tz: -100, fov: fovAdj(60) });
    } else post.overlayPass.enabled = false;
    // post
    // file B: light afterimages only while the vortex spins
    post.afterimage.enabled = wi === 3;
    if (wi === 3) post.afterimage.uniforms.damp.value = vortex.damp(P.intro.q);
    post.bloom.strength = P.bloom.s; post.bloom.radius = P.bloom.r; post.bloom.threshold = P.bloom.t;
    const u = post.final.uniforms;
    u.uTime.value = t; u.uWipe.value = P.wipe; u.uAlarm.value = P.alarm;
    u.uFade.value = Math.max(P.fade, P.intro.veil);
    renderer.toneMappingExposure = P.exposure;
    post.composer.render(dt);
    hud();
    requestAnimationFrame(frame);
  }

  setLoad(1, 'READY');
  await nextFrame();
  $('loader').classList.add('done');
  requestAnimationFrame(frame);

  // ---------------- boot: file B runIntro sequence (veil → ignite → title light-sweep → scroll hint)
  gsap.to(P.boot, { v: 1, duration: 3.6, ease: 'power2.out', delay: 0.2 });
  const words = [...document.querySelectorAll('#heroTitle [data-sweep]')];
  const finishIntro = () => {
    words.forEach((w) => w.classList.add('is-lit'));
    introDone = true; document.body.classList.add('intro-done');
    P.intro.veil = 0; P.intro.ignite = 1;
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) finishIntro();
  else {
    const btl = gsap.timeline();
    btl.to(P.intro, { veil: 0, duration: 1.2, ease: 'power1.inOut' }, 0.1)
      .to(P.intro, { ignite: 1, duration: 3.2, ease: 'power2.inOut' }, 0.2)
      .call(() => words[0] && words[0].classList.add('is-lit'), null, 1.6)
      .call(() => words[1] && words[1].classList.add('is-lit'), null, 1.95)
      .call(() => { introDone = true; document.body.classList.add('intro-done'); }, null, 3.0);
    const skip = () => { if (scrollY > 30) { btl.progress(1); finishIntro(); removeEventListener('scroll', skip); } };
    addEventListener('scroll', skip, { passive: true });
  }
  window.__introDone = () => introDone;
  window.__app = { THREE, setPR: (v) => { pr = v; resize(); }, post, P, tl, st, renderer, city, studio, lights, vortex, streams, setDeploy };
}

init().catch((e) => {
  console.error(e);
  $('ldText').textContent = 'ERROR — ' + e.message;
});
