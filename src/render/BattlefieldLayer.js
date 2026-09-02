import * as THREE from 'three';
import { PATH, BUILD_PADS, WORLD, distanceToPath } from '../config/map.js';
import { toScene, material, emissiveMaterial, cylinder, box, seeded, setShadow } from './drawing.js';

const padDistance = (x, y) => Math.min(...BUILD_PADS.map((pad) => Math.hypot(pad.x - x, pad.y - y)));

export class BattlefieldLayer {
  constructor(game, scene) {
    this.game = game;
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'battlefield-polish';
    this.banners = [];
    this.flames = [];
    this.runes = [];
    this._baseScale = new THREE.Vector3(1, 1, 1);
    scene.add(this.group);
    this.build();
  }

  build() {
    this.buildContactRoad();
    this.buildPerimeterDepth();
    this.buildGroundScatter();
    this.buildWayfinding();
    this.buildLandmarks();
  }

  buildContactRoad() {
    const underlay = new THREE.Group();
    underlay.name = 'road-contact-shadow';
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#17231c', transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide,
    });
    const mossMat = new THREE.MeshBasicMaterial({
      color: '#89a568', transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide,
    });
    for (let i = 1; i < PATH.length; i++) {
      const a = toScene(PATH[i - 1].x, PATH[i - 1].y);
      const b = toScene(PATH[i].x, PATH[i].y);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      const yaw = Math.atan2(dz, dx);
      const center = a.clone().lerp(b, 0.5);

      const contact = new THREE.Mesh(new THREE.PlaneGeometry(length + 0.34, 1.17), shadowMat);
      contact.rotation.x = -Math.PI / 2;
      contact.rotation.z = -yaw;
      contact.position.set(center.x, 0.018, center.z);
      underlay.add(contact);

      for (const side of [-1, 1]) {
        const moss = new THREE.Mesh(new THREE.PlaneGeometry(length + 0.18, 0.11), mossMat);
        moss.rotation.x = -Math.PI / 2;
        moss.rotation.z = -yaw;
        moss.position.set(
          center.x - Math.sin(yaw) * side * 0.54,
          0.126,
          center.z + Math.cos(yaw) * side * 0.54,
        );
        underlay.add(moss);
      }
    }
    this.group.add(underlay);
  }

  buildPerimeterDepth() {
    const rockMat = material('#48564d', { roughness: 1 });
    const earthMat = material('#5f5c42', { roughness: 1 });
    const random = seeded(91027);
    const cliffGeometry = new THREE.DodecahedronGeometry(0.34, 0);
    const rockCount = 92;
    const cliffs = new THREE.InstancedMesh(cliffGeometry, rockMat, rockCount);
    const temp = new THREE.Object3D();

    for (let i = 0; i < rockCount; i++) {
      const edge = i % 4;
      let x;
      let z;
      if (edge === 0 || edge === 1) {
        x = (random() - 0.5) * 18.2;
        z = edge === 0 ? -5.45 - random() * 0.16 : 5.45 + random() * 0.16;
      } else {
        x = edge === 2 ? -9.2 - random() * 0.16 : 9.2 + random() * 0.16;
        z = (random() - 0.5) * 10.6;
      }
      temp.position.set(x, -0.08 + random() * 0.18, z);
      temp.rotation.set(random() * 0.35, random() * Math.PI, random() * 0.25);
      const scale = 0.62 + random() * 0.72;
      temp.scale.set(scale * (0.8 + random() * 0.5), scale, scale * (0.8 + random() * 0.45));
      temp.updateMatrix();
      cliffs.setMatrixAt(i, temp.matrix);
    }
    cliffs.instanceMatrix.needsUpdate = true;
    cliffs.castShadow = true;
    cliffs.receiveShadow = true;
    this.group.add(cliffs);

    const terraces = [
      [-7.5, -4.55, 3.2, 0.24, 1.2, 0.02],
      [-4.2, 4.55, 3.8, 0.28, 1.0, 0.03],
      [2.4, -4.5, 3.1, 0.22, 1.15, 0.02],
      [6.9, 4.48, 2.9, 0.26, 1.15, 0.04],
    ];
    for (const [x, z, w, h, d, y] of terraces) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), earthMat);
      shelf.position.set(x, y - h * 0.5, z);
      shelf.receiveShadow = true;
      shelf.castShadow = true;
      this.group.add(shelf);
    }
  }

  buildGroundScatter() {
    const random = seeded(44117);
    const pebbleGeo = new THREE.DodecahedronGeometry(0.055, 0);
    const pebbleMat = material('#7d887a', { roughness: 1 });
    const flowerGeo = new THREE.TetrahedronGeometry(0.035, 0);
    const flowerMat = emissiveMaterial('#d2e994', 0.12, 0.9);
    const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMat, 105);
    const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, 72);
    const temp = new THREE.Object3D();

    let p = 0;
    let f = 0;
    let attempts = 0;
    while ((p < 105 || f < 72) && attempts < 2500) {
      attempts += 1;
      const x = 45 + random() * (WORLD.width - 90);
      const y = 45 + random() * (WORLD.height - 90);
      if (distanceToPath(x, y) < 72 || padDistance(x, y) < 52) continue;
      const scene = toScene(x, y, 0.115);
      temp.position.copy(scene);
      temp.rotation.set(random() * 0.25, random() * Math.PI, random() * 0.25);
      if (p < 105 && random() > 0.38) {
        const s = 0.55 + random() * 0.85;
        temp.scale.set(s, s * (0.55 + random() * 0.55), s);
        temp.updateMatrix();
        pebbles.setMatrixAt(p++, temp.matrix);
      } else if (f < 72) {
        const s = 0.45 + random() * 0.5;
        temp.scale.setScalar(s);
        temp.updateMatrix();
        flowers.setMatrixAt(f++, temp.matrix);
      }
    }
    pebbles.count = p;
    flowers.count = f;
    pebbles.instanceMatrix.needsUpdate = true;
    flowers.instanceMatrix.needsUpdate = true;
    this.group.add(pebbles, flowers);
  }

  buildWayfinding() {
    const markerMat = emissiveMaterial('#f0dba4', 0.32, 0.72);
    markerMat.depthWrite = false;
    for (let i = 1; i < PATH.length; i++) {
      const a = PATH[i - 1];
      const b = PATH[i];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const count = Math.max(1, Math.floor(length / 150));
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      for (let j = 0; j < count; j++) {
        const t = (j + 0.62) / count;
        const x = THREE.MathUtils.lerp(a.x, b.x, Math.min(0.93, t));
        const y = THREE.MathUtils.lerp(a.y, b.y, Math.min(0.93, t));
        const marker = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 3), markerMat);
        marker.rotation.x = Math.PI / 2;
        marker.rotation.z = -angle - Math.PI / 2;
        marker.position.copy(toScene(x, y, 0.145));
        marker.scale.y = 1.25;
        marker.userData.phase = i * 0.7 + j;
        this.runes.push(marker);
        this.group.add(marker);
      }
    }

    const turnIndices = [1, 2, 4, 6, 8, 9];
    for (const index of turnIndices) {
      const point = PATH[index];
      const next = PATH[Math.min(PATH.length - 1, index + 1)];
      const dx = next.x - point.x;
      const dy = next.y - point.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      this.addBanner(point.x + nx * 72, point.y + ny * 72, index);
    }
  }

  addBanner(x, y, seed) {
    const root = new THREE.Group();
    root.position.copy(toScene(x, y, 0.12));
    const pole = cylinder(0.025, 0.03, 0.86, '#504636', 6, { roughness: 0.9 });
    pole.position.y = 0.43;
    root.add(pole);

    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.42, 2, 2),
      new THREE.MeshStandardMaterial({
        color: seed % 2 ? '#a45f49' : '#6d68a8',
        roughness: 0.92,
        side: THREE.DoubleSide,
        emissive: seed % 2 ? '#402419' : '#272343',
        emissiveIntensity: 0.12,
      }),
    );
    cloth.position.set(0.19, 0.64, 0);
    cloth.rotation.y = -0.18;
    cloth.castShadow = true;
    root.add(cloth);
    root.userData.cloth = cloth;
    root.userData.phase = seed * 0.83;
    this.banners.push(root);
    this.group.add(root);
  }

  buildLandmarks() {
    const landmarks = [
      { x: 100, y: 150, color: '#80f2bd', scale: 0.85 },
      { x: 1160, y: 615, color: '#d49cff', scale: 1.05 },
      { x: 520, y: 235, color: '#f4c978', scale: 0.7 },
      { x: 1040, y: 380, color: '#8fd8ff', scale: 0.72 },
    ];
    for (const item of landmarks) {
      const root = new THREE.Group();
      root.position.copy(toScene(item.x, item.y, 0.13));
      const plinth = cylinder(0.16 * item.scale, 0.21 * item.scale, 0.18, '#626a5e', 7, { roughness: 0.92 });
      plinth.position.y = 0.09;
      root.add(plinth);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.07 * item.scale, 0.28 * item.scale, 5),
        emissiveMaterial(item.color, 1.65, 0.85),
      );
      flame.position.y = 0.35;
      root.add(flame);
      root.userData.flame = flame;
      root.userData.phase = item.x * 0.01;
      this.flames.push(root);
      setShadow(root, true, true);
      this.group.add(root);
    }
  }

  update(time) {
    for (const banner of this.banners) {
      const cloth = banner.userData.cloth;
      cloth.rotation.y = -0.18 + Math.sin(time * 1.4 + banner.userData.phase) * 0.08;
      cloth.rotation.z = Math.sin(time * 1.1 + banner.userData.phase) * 0.025;
    }
    for (const root of this.flames) {
      const flame = root.userData.flame;
      const pulse = 1 + Math.sin(time * 6 + root.userData.phase) * 0.09;
      flame.scale.set(0.92 + pulse * 0.08, pulse, 0.92 + pulse * 0.08);
    }
    for (const rune of this.runes) {
      rune.material.opacity = 0.48 + Math.sin(time * 1.65 + rune.userData.phase) * 0.12;
    }
  }
}
