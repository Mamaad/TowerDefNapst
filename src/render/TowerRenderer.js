import * as THREE from 'three';
import { ELEMENTS } from '../config/elements.js';
import { TOWER_BY_ID } from '../config/towers.js';
import {
  SCENE_SCALE,
  toScene,
  material,
  emissiveMaterial,
  cylinder,
  box,
  sphere,
  crystal,
  torus,
  markInteractive,
  disposeObject,
} from './drawing.js';

export class TowerRenderer {
  constructor(game, scene) {
    this.game = game;
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'towers-3d';
    scene.add(this.group);
    this.views = new Map();
    this.range = null;
    this.preview = null;
    this.previewKey = '';
  }

  sync(time) {
    const live = new Set(this.game.towers);
    for (const [tower, view] of this.views) {
      if (live.has(tower)) continue;
      this.group.remove(view);
      disposeObject(view);
      this.views.delete(tower);
    }

    for (const tower of this.game.towers) {
      let view = this.views.get(tower);
      if (!view || view.userData.level !== tower.level) {
        if (view) {
          this.group.remove(view);
          disposeObject(view);
        }
        view = this.createTower(tower.def, tower.level, false);
        view.userData.level = tower.level;
        markInteractive(view, 'tower', tower);
        this.group.add(view);
        this.views.set(tower, view);
      }
      this.updateTower(view, tower, time);
    }

    this.syncRange();
    this.syncPreview(time);
  }

  createTower(def, level = 1, ghost = false, valid = true) {
    const el = ELEMENTS[def.element];
    const root = new THREE.Group();
    root.name = `tower-${def.id}`;
    root.userData.level = level;

    const baseColor = ghost ? (valid ? '#45695a' : '#764c45') : '#46524d';
    const base = cylinder(0.3 + level * 0.025, 0.37 + level * 0.025, 0.16, baseColor, 8, { roughness: 0.82, metalness: 0.08 });
    base.position.y = 0.08;
    root.add(base);
    const inset = cylinder(0.245, 0.27, 0.055, '#252f2b', 8, { roughness: 0.65, metalness: 0.16 });
    inset.position.y = 0.185;
    root.add(inset);
    const rune = torus(0.205, 0.016, valid ? el.color : '#ff6b61', { intensity: ghost ? 0.7 : 0.4, opacity: ghost ? 0.7 : 0.45 });
    rune.rotation.x = Math.PI / 2;
    rune.position.y = 0.225;
    root.add(rune);

    const head = new THREE.Group();
    head.name = 'head';
    head.position.y = 0.22;
    root.add(head);
    this[def.id.replaceAll('-', '_')]?.(head, el, level);

    if (level >= 2) {
      for (const side of [-1, 1]) {
        const levelShard = crystal(0.04, 0.25 + level * 0.04, el.color, { intensity: 0.65 });
        levelShard.position.set(side * 0.25, 0.16, 0.02);
        levelShard.rotation.z = side * 0.32;
        root.add(levelShard);
      }
    }
    if (level >= 3) {
      const crown = torus(0.31, 0.012, el.light, { intensity: 1.05, opacity: 0.75 });
      crown.rotation.x = Math.PI / 2;
      crown.position.y = 0.34;
      crown.name = 'level-crown';
      root.add(crown);
    }

    if (ghost) this.setOpacity(root, 0.62);
    return root;
  }

  ember_spire(root, el, level) {
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.78 + level * 0.08, 5), material('#302522', { roughness: 0.72 }));
    spire.position.y = 0.41;
    root.add(spire);
    const flame = crystal(0.11 + level * 0.012, 0.34, '#ff7a37', { intensity: 1.8 });
    flame.position.y = 0.93 + level * 0.07;
    flame.name = 'pulse-core';
    root.add(flame);
    const ember = sphere(0.065, '#ffd07a', 12, { emissive: '#ff7a37', emissiveIntensity: 2.2, roughness: 0.25 });
    ember.position.y = 1.02 + level * 0.07;
    root.add(ember);
  }

  magma_forge(root, el, level) {
    const bowl = cylinder(0.27, 0.2, 0.34, '#342b27', 10, { roughness: 0.78, metalness: 0.12 });
    bowl.position.y = 0.3;
    root.add(bowl);
    const lava = cylinder(0.21, 0.21, 0.035, '#ff7136', 16, { emissive: '#ff4d1f', emissiveIntensity: 2.2, roughness: 0.2 });
    lava.position.y = 0.49;
    lava.name = 'pulse-core';
    root.add(lava);
    for (const side of [-1, 1]) {
      const vent = box(0.12, 0.18, 0.28, '#574238', { roughness: 0.8 });
      vent.position.set(side * 0.31, 0.25, 0);
      vent.rotation.z = side * 0.2;
      root.add(vent);
    }
  }

  frost_obelisk(root, el, level) {
    const pillar = crystal(0.18, 0.88 + level * 0.08, '#74dcf1', { intensity: 0.75 });
    pillar.position.y = 0.48;
    root.add(pillar);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.15 + level * 0.012), emissiveMaterial(el.light, 1.15, 0.88));
    core.position.y = 0.96 + level * 0.06;
    core.name = 'spin-core';
    root.add(core);
  }

  cryo_prism(root, el, level) {
    const stem = cylinder(0.09, 0.14, 0.5, '#385863', 7, { roughness: 0.72 });
    stem.position.y = 0.29;
    root.add(stem);
    const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.27 + level * 0.02), emissiveMaterial('#8eefff', 1.15, 0.92));
    prism.position.y = 0.74;
    prism.scale.y = 1.35;
    prism.name = 'spin-core';
    root.add(prism);
    const ring = torus(0.34, 0.02, '#dffcff', { intensity: 1.15, opacity: 0.72 });
    ring.position.y = 0.74;
    ring.rotation.x = Math.PI / 2;
    ring.name = 'orbit-ring';
    root.add(ring);
  }

  spark_coil(root, el, level) {
    const mast = cylinder(0.075, 0.12, 0.72, '#35475b', 8, { roughness: 0.56, metalness: 0.45 });
    mast.position.y = 0.38;
    root.add(mast);
    for (let i = 0; i < 3 + level; i++) {
      const ring = torus(0.19 + i * 0.012, 0.022, '#6a9dcc', { emissive: false, roughness: 0.45, metalness: 0.55 });
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.3 + i * 0.13;
      root.add(ring);
    }
    const orb = sphere(0.13, el.light, 16, { emissive: el.color, emissiveIntensity: 2.3, roughness: 0.2 });
    orb.position.y = 0.88;
    orb.name = 'pulse-core';
    root.add(orb);
  }

  tempest_pylon(root, el, level) {
    const hub = cylinder(0.15, 0.2, 0.42, '#2d3f55', 7, { roughness: 0.62, metalness: 0.32 });
    hub.position.y = 0.25;
    root.add(hub);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      const prong = crystal(0.07, 0.65 + level * 0.05, '#6ca9e8', { intensity: 0.55 });
      prong.position.set(Math.cos(a) * 0.21, 0.56, Math.sin(a) * 0.21);
      prong.rotation.z = Math.cos(a) * 0.18;
      prong.rotation.x = Math.sin(a) * 0.18;
      root.add(prong);
    }
    const orb = sphere(0.15, '#eaf8ff', 16, { emissive: el.color, emissiveIntensity: 2.4, roughness: 0.12 });
    orb.position.y = 0.88;
    orb.name = 'pulse-core';
    root.add(orb);
  }

  thorn_nest(root, el, level) {
    const heart = sphere(0.22, '#355336', 12, { roughness: 0.95 });
    heart.position.y = 0.36;
    root.add(heart);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const thorn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.43 + level * 0.03, 5), material('#627a42', { roughness: 1 }));
      thorn.position.set(Math.cos(a) * 0.24, 0.37, Math.sin(a) * 0.24);
      thorn.rotation.z = Math.cos(a) * 1.05;
      thorn.rotation.x = -Math.sin(a) * 1.05;
      root.add(thorn);
    }
    const seed = sphere(0.11, el.light, 12, { emissive: el.color, emissiveIntensity: 1.1, roughness: 0.5 });
    seed.position.y = 0.62;
    seed.name = 'pulse-core';
    root.add(seed);
  }

  bloom_sanctum(root, el, level) {
    const trunk = cylinder(0.08, 0.14, 0.66, '#4f412d', 7, { roughness: 1 });
    trunk.position.y = 0.34;
    root.add(trunk);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const petal = sphere(0.15 + level * 0.008, '#5d9c54', 12, { roughness: 0.85 });
      petal.position.set(Math.cos(a) * 0.21, 0.7 + Math.sin(a * 2) * 0.04, Math.sin(a) * 0.21);
      petal.scale.set(1.25, 0.72, 0.85);
      root.add(petal);
    }
    const bloom = sphere(0.13, '#dff9a8', 16, { emissive: el.color, emissiveIntensity: 1.25, roughness: 0.35 });
    bloom.position.y = 0.75;
    bloom.name = 'spin-core';
    root.add(bloom);
  }

  stone_bastion(root, el, level) {
    const tower = box(0.47, 0.48 + level * 0.05, 0.47, '#59615b', { roughness: 0.94 });
    tower.position.y = 0.28;
    root.add(tower);
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      const merlon = box(0.14, 0.18, 0.14, '#6e756d', { roughness: 0.94 });
      merlon.position.set(Math.cos(a) * 0.19, 0.62 + level * 0.03, Math.sin(a) * 0.19);
      root.add(merlon);
    }
    const core = crystal(0.08, 0.27, el.color, { intensity: 0.55 });
    core.position.y = 0.72;
    root.add(core);
  }

  seismic_hammer(root, el, level) {
    const support = cylinder(0.12, 0.17, 0.62, '#4d5350', 8, { roughness: 0.85, metalness: 0.16 });
    support.position.y = 0.34;
    root.add(support);
    const pivot = sphere(0.13, '#886644', 12, { roughness: 0.75, metalness: 0.22 });
    pivot.position.y = 0.67;
    root.add(pivot);
    const handle = box(0.1, 0.1, 0.68, '#5c432d', { roughness: 0.95 });
    handle.position.set(0, 0.68, 0.24);
    handle.name = 'recoil-part';
    root.add(handle);
    const hammer = box(0.5 + level * 0.05, 0.24, 0.26, '#77746a', { roughness: 0.8, metalness: 0.18 });
    hammer.position.set(0, 0.68, 0.56);
    hammer.name = 'recoil-part';
    root.add(hammer);
  }

  arcane_eye(root, el, level) {
    const stem = cylinder(0.07, 0.13, 0.58, '#443551', 7, { roughness: 0.66, metalness: 0.18 });
    stem.position.y = 0.3;
    root.add(stem);
    const ring = torus(0.31 + level * 0.015, 0.035, '#b47af6', { intensity: 1.25, opacity: 0.88 });
    ring.position.y = 0.73;
    ring.name = 'spin-core';
    root.add(ring);
    const eye = sphere(0.14, '#f1deff', 16, { emissive: el.color, emissiveIntensity: 2.0, roughness: 0.2 });
    eye.position.y = 0.73;
    eye.scale.z = 0.5;
    eye.name = 'pulse-core';
    root.add(eye);
  }

  rift_weaver(root, el, level) {
    for (const side of [-1, 1]) {
      const pillar = crystal(0.105, 0.82 + level * 0.06, '#69468a', { intensity: 0.42 });
      pillar.position.set(side * 0.2, 0.43, 0);
      pillar.rotation.z = side * 0.08;
      root.add(pillar);
    }
    const rift = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 + level * 0.015), emissiveMaterial('#d6a7ff', 1.8, 0.82));
    rift.position.y = 0.76;
    rift.scale.y = 1.55;
    rift.name = 'spin-core';
    root.add(rift);
    const ring = torus(0.36, 0.018, el.color, { intensity: 1.4, opacity: 0.72 });
    ring.position.y = 0.76;
    ring.rotation.x = Math.PI / 2;
    ring.name = 'orbit-ring';
    root.add(ring);
  }

  updateTower(view, tower, time) {
    view.position.copy(toScene(tower.x, tower.y, 0.14));
    const buildScale = 1 + tower.buildFx * 0.18;
    view.scale.setScalar(buildScale);
    const head = view.getObjectByName('head');
    if (head) {
      head.rotation.y = Math.PI / 2 - tower.angle;
      head.position.z = -tower.recoil * 0.04;
    }
    const spin = view.getObjectByName('spin-core');
    if (spin) spin.rotation.y = time * 1.35 + tower.phase;
    const orbit = view.getObjectByName('orbit-ring');
    if (orbit) orbit.rotation.z = time * 0.9 + tower.phase;
    const pulse = view.getObjectByName('pulse-core');
    if (pulse) {
      const value = 1 + Math.sin(time * 4 + tower.phase) * 0.055 + tower.flash * 0.12;
      pulse.scale.multiplyScalar(1 / (pulse.userData.lastScale || 1));
      pulse.scale.multiplyScalar(value);
      pulse.userData.lastScale = value;
    }
    const crown = view.getObjectByName('level-crown');
    if (crown) crown.rotation.z = time * 0.55;
  }

  syncRange() {
    const tower = this.game.selectedTower;
    if (!tower) {
      if (this.range) this.range.visible = false;
      return;
    }
    const r = tower.stats.range * SCENE_SCALE;
    const key = `${tower.def.element}-${r.toFixed(3)}`;
    if (!this.range || this.range.userData.key !== key) {
      if (this.range) {
        this.scene.remove(this.range);
        disposeObject(this.range);
      }
      const el = ELEMENTS[tower.def.element];
      const root = new THREE.Group();
      const disk = new THREE.Mesh(
        new THREE.CircleGeometry(r, 96),
        new THREE.MeshBasicMaterial({ color: el.color, transparent: true, opacity: 0.045, depthWrite: false, side: THREE.DoubleSide }),
      );
      disk.rotation.x = -Math.PI / 2;
      root.add(disk);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(Math.max(0.01, r - 0.018), r + 0.018, 96),
        new THREE.MeshBasicMaterial({ color: el.light, transparent: true, opacity: 0.52, depthWrite: false, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.006;
      root.add(ring);
      root.userData.key = key;
      this.scene.add(root);
      this.range = root;
    }
    this.range.visible = true;
    this.range.position.copy(toScene(tower.x, tower.y, 0.115));
  }

  syncPreview(time) {
    const def = TOWER_BY_ID[this.game.buildChoice];
    const point = this.game.hoverPad ?? this.game.hoverWorld;
    if (!def || !point) {
      if (this.preview) this.preview.visible = false;
      return;
    }
    const occupied = this.game.hoverPad && this.game.towers.some((tower) => tower.pad.id === this.game.hoverPad.id);
    const valid = Boolean(this.game.hoverPad) && !occupied;
    const key = `${def.id}-${valid}`;
    if (!this.preview || this.previewKey !== key) {
      if (this.preview) {
        this.scene.remove(this.preview);
        disposeObject(this.preview);
      }
      this.preview = this.createTower(def, 1, true, valid);
      this.previewKey = key;
      this.scene.add(this.preview);
    }
    this.preview.visible = true;
    this.preview.position.copy(toScene(point.x, point.y, 0.15));
    this.preview.rotation.y = Math.sin(time * 1.8) * 0.04;
  }

  setOpacity(root, opacity) {
    root.traverse((node) => {
      if (!node.isMesh) return;
      node.material = node.material.clone();
      node.material.transparent = true;
      node.material.opacity *= opacity;
      node.material.depthWrite = false;
    });
  }
}
