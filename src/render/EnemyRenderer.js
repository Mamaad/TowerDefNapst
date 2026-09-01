import * as THREE from 'three';
import { ELEMENTS } from '../config/elements.js';
import {
  toScene,
  material,
  emissiveMaterial,
  cylinder,
  box,
  sphere,
  crystal,
  torus,
  disposeObject,
} from './drawing.js';

export class EnemyRenderer {
  constructor(game, scene, camera) {
    this.game = game;
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.name = 'enemies-3d';
    scene.add(this.group);
    this.views = new Map();
  }

  sync(time) {
    const live = new Set(this.game.enemies);
    for (const [enemy, view] of this.views) {
      if (live.has(enemy)) continue;
      this.group.remove(view);
      disposeObject(view);
      this.views.delete(enemy);
    }
    for (const enemy of this.game.enemies) {
      let view = this.views.get(enemy);
      if (!view) {
        view = this.createEnemy(enemy);
        this.group.add(view);
        this.views.set(enemy, view);
      }
      this.updateEnemy(view, enemy, time);
    }
  }

  createEnemy(enemy) {
    const root = new THREE.Group();
    root.name = `enemy-${enemy.def.id}`;
    root.userData.enemy = enemy;
    const body = new THREE.Group();
    body.name = 'body';
    root.add(body);

    const scale = enemy.def.size * 0.016;
    const builder = this[enemy.def.id] ?? this.grunt;
    builder.call(this, body, enemy, scale);

    const health = new THREE.Group();
    health.name = 'health';
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.58 + scale, 0.055), new THREE.MeshBasicMaterial({ color: '#15201b', transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide }));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.55 + scale, 0.035), new THREE.MeshBasicMaterial({ color: '#72d38b', depthWrite: false, side: THREE.DoubleSide }));
    fill.name = 'health-fill';
    fill.position.z = 0.003;
    health.add(back, fill);
    health.position.y = 0.62 + scale * 1.5;
    root.add(health);

    const shield = new THREE.Mesh(
      new THREE.IcosahedronGeometry(scale * 1.55, 1),
      new THREE.MeshBasicMaterial({ color: '#83d8ff', wireframe: true, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    shield.name = 'shield';
    shield.position.y = scale * 1.1;
    root.add(shield);

    const status = torus(scale * 1.45, 0.012, '#ffffff', { intensity: 0.8, opacity: 0.5 });
    status.name = 'status-ring';
    status.rotation.x = Math.PI / 2;
    status.position.y = 0.035;
    root.add(status);

    return root;
  }

  grunt(root, enemy, s) {
    const cloak = new THREE.Mesh(new THREE.ConeGeometry(s * 0.8, s * 2.25, 7), material(enemy.def.color, { roughness: 0.95 }));
    cloak.position.y = s * 1.1;
    root.add(cloak);
    const head = sphere(s * 0.52, '#7e8d83', 12, { roughness: 0.92 });
    head.position.y = s * 2.35;
    root.add(head);
  }

  swift(root, enemy, s) {
    const core = sphere(s * 0.85, enemy.def.color, 16, { emissive: enemy.def.color, emissiveIntensity: 1.4, roughness: 0.25 });
    core.position.y = s * 1.4;
    core.name = 'pulse-core';
    root.add(core);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(s * 0.35, s * 1.1, 3), emissiveMaterial('#fff0b6', 0.5, 0.7));
      wing.position.set(side * s * 0.95, s * 1.3, 0);
      wing.rotation.z = side * Math.PI / 2;
      root.add(wing);
    }
  }

  tank(root, enemy, s) {
    const torso = box(s * 1.7, s * 1.65, s * 1.35, enemy.def.color, { roughness: 1 });
    torso.position.y = s * 1.05;
    root.add(torso);
    const head = box(s * 1.1, s * 0.9, s * 1.05, '#706354', { roughness: 1 });
    head.position.y = s * 2.2;
    root.add(head);
    for (const side of [-1, 1]) {
      const arm = box(s * 0.55, s * 1.45, s * 0.65, '#806d5b', { roughness: 1 });
      arm.position.set(side * s * 1.1, s * 1.05, 0);
      root.add(arm);
    }
  }

  mage(root, enemy, s) {
    const robe = new THREE.Mesh(new THREE.ConeGeometry(s * 0.9, s * 2.4, 8), material('#553b73', { roughness: 0.88 }));
    robe.position.y = s * 1.15;
    root.add(robe);
    const orb = sphere(s * 0.58, enemy.def.color, 16, { emissive: enemy.def.color, emissiveIntensity: 1.25, roughness: 0.2 });
    orb.position.y = s * 2.55;
    orb.name = 'spin-core';
    root.add(orb);
    const crown = torus(s * 0.82, s * 0.08, '#caa8ff', { intensity: 0.9, opacity: 0.8 });
    crown.position.y = s * 2.55;
    crown.name = 'orbit-ring';
    root.add(crown);
  }

  ember(root, enemy, s) {
    const body = new THREE.Mesh(new THREE.ConeGeometry(s * 0.9, s * 2.1, 6), material('#4a2821', { roughness: 0.78 }));
    body.position.y = s * 1.05;
    root.add(body);
    for (let i = 0; i < 3; i++) {
      const flame = crystal(s * (0.3 + i * 0.05), s * (1.05 + i * 0.15), '#ff6535', { intensity: 1.6 });
      flame.position.set((i - 1) * s * 0.45, s * 2.25, 0);
      root.add(flame);
    }
  }

  glacial(root, enemy, s) {
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(s * 1.15), emissiveMaterial('#76d7f2', 0.65, 0.9));
    body.position.y = s * 1.25;
    body.scale.y = 1.35;
    root.add(body);
    const shard = crystal(s * 0.55, s * 1.6, '#d9fbff', { intensity: 1.0 });
    shard.position.y = s * 2.45;
    root.add(shard);
  }

  regen(root, enemy, s) {
    const body = sphere(s * 1.15, '#517b49', 12, { roughness: 1 });
    body.position.y = s * 1.15;
    body.scale.y = 1.35;
    root.add(body);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(s * 0.3, s * 1.15, 4), material('#71aa5e', { roughness: 1 }));
      leaf.position.set(Math.cos(a) * s * 0.8, s * 1.7, Math.sin(a) * s * 0.8);
      leaf.rotation.z = Math.cos(a) * 0.7;
      leaf.rotation.x = -Math.sin(a) * 0.7;
      root.add(leaf);
    }
  }

  shield(root, enemy, s) {
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(s), material('#506b7a', { roughness: 0.48, metalness: 0.35 }));
    core.position.y = s * 1.25;
    root.add(core);
    const prism = torus(s * 1.15, s * 0.09, enemy.def.color, { intensity: 1.0, opacity: 0.8 });
    prism.position.y = s * 1.25;
    prism.rotation.x = Math.PI / 2;
    prism.name = 'spin-core';
    root.add(prism);
  }

  elite(root, enemy, s) {
    const armor = new THREE.Mesh(new THREE.DodecahedronGeometry(s * 1.1, 0), material('#513763', { roughness: 0.5, metalness: 0.36 }));
    armor.position.y = s * 1.2;
    armor.scale.y = 1.3;
    root.add(armor);
    const helm = crystal(s * 0.55, s * 1.25, enemy.def.color, { intensity: 1.0 });
    helm.position.y = s * 2.4;
    root.add(helm);
    for (const side of [-1, 1]) {
      const blade = crystal(s * 0.28, s * 1.5, '#d79bff', { intensity: 0.65 });
      blade.position.set(side * s * 1.25, s * 1.25, 0);
      blade.rotation.z = side * 0.65;
      root.add(blade);
    }
  }

  boss(root, enemy, s) {
    const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(s * 1.15, 0), material('#492940', { roughness: 0.48, metalness: 0.38 }));
    torso.position.y = s * 1.25;
    torso.scale.y = 1.45;
    root.add(torso);
    const core = sphere(s * 0.46, '#ffd5f2', 16, { emissive: enemy.def.color, emissiveIntensity: 2.6, roughness: 0.15 });
    core.position.y = s * 1.45;
    core.name = 'pulse-core';
    root.add(core);
    const crown = torus(s * 1.05, s * 0.09, enemy.def.color, { intensity: 1.5, opacity: 0.88 });
    crown.position.y = s * 2.6;
    crown.rotation.x = Math.PI / 2;
    crown.name = 'spin-core';
    root.add(crown);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      const horn = crystal(s * 0.24, s * 1.55, '#8d5ca6', { intensity: 0.5 });
      horn.position.set(Math.cos(a) * s * 1.05, s * 2.4, Math.sin(a) * s * 1.05);
      horn.rotation.z = Math.cos(a) * 0.72;
      horn.rotation.x = -Math.sin(a) * 0.72;
      root.add(horn);
    }
  }

  updateEnemy(view, enemy, time) {
    const base = toScene(enemy.x, enemy.y, 0.13);
    view.position.copy(base);
    view.rotation.y = Math.PI / 2 - enemy.angle;
    const body = view.getObjectByName('body');
    const bob = Math.sin(time * (enemy.def.id === 'swift' ? 9 : 5.5) + enemy.phase) * (enemy.def.id === 'tank' || enemy.def.boss ? 0.018 : 0.035);
    body.position.y = bob;
    body.rotation.z = Math.sin(time * 4 + enemy.phase) * (enemy.def.boss ? 0.015 : 0.035);

    const health = view.getObjectByName('health');
    const parentInverse = view.quaternion.clone().invert();
    health.quaternion.copy(parentInverse.multiply(this.camera.quaternion));
    const fill = health.getObjectByName('health-fill');
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    fill.scale.x = ratio;
    const totalWidth = 0.55 + enemy.def.size * 0.016;
    fill.position.x = -(1 - ratio) * totalWidth * 0.5;
    fill.material.color.set(ratio > 0.55 ? '#75d48a' : ratio > 0.25 ? '#e6b95e' : '#e36b63');

    const shield = view.getObjectByName('shield');
    shield.visible = enemy.shield > 0.01;
    if (shield.visible) {
      shield.rotation.y = time * 0.7;
      shield.material.opacity = 0.14 + 0.12 * (enemy.shield / Math.max(1, enemy.maxShield));
    }

    const status = view.getObjectByName('status-ring');
    const statusName = ['freeze', 'slow', 'burn', 'poison', 'stun', 'mark'].find((name) => enemy.effects.has(name));
    status.visible = Boolean(statusName);
    if (statusName) {
      const color = statusName === 'burn' ? ELEMENTS.fire.color : statusName === 'poison' ? ELEMENTS.nature.color : statusName === 'slow' || statusName === 'freeze' ? ELEMENTS.ice.color : statusName === 'stun' ? ELEMENTS.earth.color : ELEMENTS.arcane.color;
      status.material.color.set(color);
      status.material.emissive.set(color);
      status.rotation.z = time * 0.7;
    }

    const spin = view.getObjectByName('spin-core');
    if (spin) spin.rotation.y = time * 1.7 + enemy.phase;
    const orbit = view.getObjectByName('orbit-ring');
    if (orbit) orbit.rotation.z = time * 1.15;
    const pulse = view.getObjectByName('pulse-core');
    if (pulse) {
      const value = 1 + Math.sin(time * 4 + enemy.phase) * 0.07 + enemy.hitPulse * 0.18;
      const baseScale = pulse.userData.baseScale ?? pulse.scale.clone();
      pulse.userData.baseScale = baseScale;
      pulse.scale.copy(baseScale).multiplyScalar(value);
    }

    const hit = enemy.hitFlash;
    body.traverse((node) => {
      if (!node.isMesh || !node.material?.emissive) return;
      if (node.userData.baseEmissive === undefined) node.userData.baseEmissive = node.material.emissiveIntensity ?? 0;
      node.material.emissiveIntensity = node.userData.baseEmissive + hit * 1.8;
    });
  }
}
