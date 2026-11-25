// Minimal shims so the intro code from the 10th-week build (file B) runs unchanged inside this project.
// QUALITY / rng are copied from file B: js/config/settings.js and js/core/batch.js
export const QUALITY = { mobile: matchMedia('(max-width: 820px)').matches || /Mobi|Android/i.test(navigator.userAgent) };
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
