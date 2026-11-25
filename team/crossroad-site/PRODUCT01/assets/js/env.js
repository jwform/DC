// =============================================================
//  Environment maps for reflections (metal, glass, car paint)
// =============================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function panel(scene, color, intensity, w, h, pos, look) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
  m.position.set(...pos); m.lookAt(...look); scene.add(m);
}

// neon street environment: dark sky, coloured sign strips, warm shop light
export function neonEnv(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x030206);
  const C = [0, 1.5, 0];
  panel(s, 0xa54dff, 3.0, 8, 1.2, [-9, 4, -4], C);
  panel(s, 0xff3d8b, 2.2, 5, 0.8, [9, 5, -6], C);
  panel(s, 0x3d7bff, 2.2, 6, 0.9, [-8, 6, 7], C);
  panel(s, 0xffb35a, 1.8, 10, 2.5, [10, 1.5, 4], C);
  panel(s, 0xffffff, 1.4, 12, 1.2, [0, 9, -10], C);
  panel(s, 0xffffff, 0.8, 18, 0.25, [0, 10, 0], C);
  panel(s, 0x873bff, 1.5, 14, 0.4, [0, 0.2, -12], C);
  panel(s, 0xd9b8ff, 1.0, 3, 6, [-12, 3, -2], C);
  const pm = new THREE.PMREMGenerator(renderer);
  const t = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return t;
}

// soft studio environment with violet accents
export function studioEnv(renderer) {
  const room = new RoomEnvironment();
  room.traverse((o) => { if (o.isMesh && o.material && o.material.color) o.material.color.multiplyScalar(0.35); });
  const s = new THREE.Scene();
  s.add(room);
  panel(s, 0xffffff, 6, 6, 0.5, [0, 8, 2], [0, 0, 0]);
  panel(s, 0xa54dff, 5, 0.5, 6, [-7, 2, -3], [0, 0, 0]);
  panel(s, 0xa54dff, 4, 0.5, 6, [7, 2, -3], [0, 0, 0]);
  panel(s, 0xd9b8ff, 2, 10, 0.3, [0, 3, -8], [0, 0, 0]);
  const pm = new THREE.PMREMGenerator(renderer);
  const t = pm.fromScene(s, 0.03).texture;
  pm.dispose();
  return t;
}
