import * as THREE from 'three';
import { toScene } from './drawing.js';

export class EnemyRenderer {
  constructor(game, scene, camera) {
    this.game = game;
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.name = 'enemies-3d';
    scene.add(this.group);
    this.views = new Map();
    this.corpses = [];
    this.pools = new Map();
    this.geometries = new Map();
    this.materials = new Map();
  }

  geometry(key, factory) {
    if (!this.geometries.has(key)) this.geometries.set(key, factory());
    return this.geometries.get(key);
  }

  material(key, color, options = {}) {
    if (!this.materials.has(key)) {
      this.materials.set(key, new THREE.MeshStandardMaterial({
        color,
        roughness: options.roughness ?? 0.72,
        metalness: options.metalness ?? 0.08,
        flatShading: options.flatShading ?? true,
        emissive: options.emissive ?? '#000000',
        emissiveIntensity: options.emissiveIntensity ?? 0,
      }));
    }
    return this.materials.get(key);
  }

  mesh(geoKey, geoFactory, matKey, color, options) {
    const mesh = new THREE.Mesh(this.geometry(geoKey, geoFactory), this.material(matKey, color, options));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  limb(root, name, length, radius, color, position, phase = 0, amplitude = 0.65, axis = 'x') {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(...position);
    const part = this.mesh(
      `limb-${length.toFixed(2)}-${radius.toFixed(2)}`,
      () => new THREE.CylinderGeometry(radius, radius * 0.88, length, 6),
      `limb-${color}`,
      color,
      { roughness: 0.86 },
    );
    part.position.y = -length * 0.5;
    pivot.add(part);
    root.add(pivot);
    root.userData.walkers.push({ object: pivot, phase, amplitude, axis, base: 0 });
    return pivot;
  }

  addBlade(parent, color, length = 0.7) {
    const blade = this.mesh(
      `blade-${length}`,
      () => new THREE.ConeGeometry(0.055, length, 4),
      `blade-${color}`,
      color,
      { roughness: 0.28, metalness: 0.65, emissive: color, emissiveIntensity: 0.18 },
    );
    blade.position.y = -length * 0.45;
    blade.rotation.z = Math.PI;
    parent.add(blade);
    return blade;
  }

  sync(time) {
    const live = new Set(this.game.enemies);
    for (const [enemy, view] of [...this.views]) {
      if (live.has(enemy)) continue;
      this.views.delete(enemy);
      if (enemy.dead && !enemy.escaped) this.startCorpse(view, enemy, time);
      else this.recycle(view);
    }

    this.updateCorpses(time);

    for (const enemy of this.game.enemies) {
      let view = this.views.get(enemy);
      if (!view) {
        view = this.acquire(enemy);
        this.views.set(enemy, view);
      }
      this.updateEnemy(view, enemy, time);
    }
  }

  acquire(enemy) {
    const pool = this.pools.get(enemy.def.id) || [];
    this.pools.set(enemy.def.id, pool);
    const view = pool.pop() || this.createEnemy(enemy);
    view.visible = true;
    view.userData.enemy = enemy;
    view.userData.deathStart = null;
    view.rotation.set(0, 0, 0);
    view.scale.setScalar(1);
    this.group.add(view);
    return view;
  }

  recycle(view) {
    this.group.remove(view);
    view.visible = false;
    const type = view.userData.type;
    const pool = this.pools.get(type) || [];
    this.pools.set(type, pool);
    pool.push(view);
  }

  startCorpse(view, enemy, time) {
    view.userData.enemy = enemy;
    view.userData.deathStart = time;
    view.userData.deathSide = Math.random() > 0.5 ? 1 : -1;
    const health = view.getObjectByName('health');
    if (health) health.visible = false;
    for (const name of ['status-slow', 'status-burn', 'status-poison', 'status-stun', 'shield']) {
      const object = view.getObjectByName(name);
      if (object) object.visible = false;
    }
    this.corpses.push(view);
  }

  updateCorpses(time) {
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const view = this.corpses[i];
      const progress = Math.min(1, (time - view.userData.deathStart) / 0.78);
      const body = view.getObjectByName('body');
      if (body) {
        body.rotation.z = view.userData.deathSide * progress * 1.28;
        body.position.y = -progress * 0.12;
      }
      view.scale.setScalar(1 - progress * 0.17);
      view.position.y -= 0.0015;
      if (progress >= 1) {
        this.corpses.splice(i, 1);
        this.recycle(view);
      }
    }
  }

  createEnemy(enemy) {
    const root = new THREE.Group();
    root.name = `enemy-${enemy.def.id}`;
    root.userData.type = enemy.def.id;
    root.userData.walkers = [];
    root.userData.spinners = [];

    const body = new THREE.Group();
    body.name = 'body';
    body.userData.walkers = root.userData.walkers;
    body.userData.spinners = root.userData.spinners;
    root.add(body);

    const scale = enemy.def.size * 0.018;
    const builder = this[enemy.def.id] ?? this.grunt;
    builder.call(this, body, enemy, scale, root);

    this.addHealth(root, scale, enemy);
    this.addShield(root, scale);
    this.addStatusVisuals(root, scale);
    this.addHitShell(root, scale);
    return root;
  }

  addHealth(root, scale, enemy) {
    const health = new THREE.Group();
    health.name = 'health';
    const width = 0.54 + scale * 0.8;
    const back = new THREE.Mesh(
      this.geometry('health-back', () => new THREE.PlaneGeometry(1, 0.065)),
      new THREE.MeshBasicMaterial({ color: '#101714', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
    );
    back.scale.x = width;
    const fill = new THREE.Mesh(
      this.geometry('health-fill', () => new THREE.PlaneGeometry(1, 0.038)),
      new THREE.MeshBasicMaterial({ color: '#82e49b', depthWrite: false, side: THREE.DoubleSide }),
    );
    fill.name = 'health-fill';
    fill.userData.fullWidth = width * 0.95;
    fill.scale.x = width * 0.95;
    fill.position.z = 0.004;
    health.add(back, fill);
    health.position.y = 0.72 + scale * 1.8;
    root.add(health);
  }

  addShield(root, scale) {
    const shield = new THREE.Mesh(
      this.geometry(`shield-${scale.toFixed(2)}`, () => new THREE.IcosahedronGeometry(scale * 1.7, 1)),
      new THREE.MeshBasicMaterial({ color: '#a3e8ff', wireframe: true, transparent: true, opacity: 0.22, depthWrite: false }),
    );
    shield.name = 'shield';
    shield.position.y = scale * 1.15;
    root.add(shield);
  }

  addStatusVisuals(root, scale) {
    const slow = new THREE.Group();
    slow.name = 'status-slow';
    for (let i = 0; i < 4; i++) {
      const shard = new THREE.Mesh(
        this.geometry('status-ice-shard', () => new THREE.ConeGeometry(0.045, 0.28, 4)),
        this.material('status-ice-mat', '#b9f4ff', { emissive: '#78dfff', emissiveIntensity: 0.8, roughness: 0.35 }),
      );
      const angle = i / 4 * Math.PI * 2;
      shard.position.set(Math.cos(angle) * scale * 1.25, 0.16, Math.sin(angle) * scale * 1.25);
      shard.rotation.z = (Math.random() - 0.5) * 0.5;
      slow.add(shard);
    }
    root.add(slow);

    const burn = new THREE.Group();
    burn.name = 'status-burn';
    for (let i = 0; i < 3; i++) {
      const ember = new THREE.Mesh(
        this.geometry('status-ember', () => new THREE.IcosahedronGeometry(0.055, 0)),
        this.material('status-ember-mat', '#ff9b42', { emissive: '#ff5d24', emissiveIntensity: 2.2, roughness: 0.2 }),
      );
      ember.userData.phase = i * 2.1;
      burn.add(ember);
    }
    root.add(burn);

    const poison = new THREE.Group();
    poison.name = 'status-poison';
    for (let i = 0; i < 4; i++) {
      const mote = new THREE.Mesh(
        this.geometry('status-poison-mote', () => new THREE.IcosahedronGeometry(0.04, 0)),
        this.material('status-poison-mat', '#8ce56d', { emissive: '#61b949', emissiveIntensity: 1.4, roughness: 0.25 }),
      );
      mote.userData.phase = i * 1.57;
      poison.add(mote);
    }
    root.add(poison);

    const stun = new THREE.Group();
    stun.name = 'status-stun';
    for (let i = 0; i < 3; i++) {
      const spark = new THREE.Mesh(
        this.geometry('status-stun-spark', () => new THREE.OctahedronGeometry(0.055, 0)),
        this.material('status-stun-mat', '#ffe584', { emissive: '#ffc63f', emissiveIntensity: 2.1, roughness: 0.2 }),
      );
      spark.userData.phase = i * 2.1;
      stun.add(spark);
    }
    root.add(stun);
  }

  addHitShell(root, scale) {
    const shell = new THREE.Mesh(
      this.geometry(`hit-shell-${scale.toFixed(2)}`, () => new THREE.IcosahedronGeometry(scale * 1.45, 1)),
      new THREE.MeshBasicMaterial({ color: '#fff7dc', wireframe: true, transparent: true, opacity: 0, depthWrite: false }),
    );
    shell.name = 'hit-shell';
    shell.position.y = scale * 1.1;
    root.add(shell);
  }

  grunt(root, enemy, s) {
    const torso = this.mesh(`grunt-torso-${s}`, () => new THREE.BoxGeometry(s * 1.1, s * 1.35, s * 0.65), 'grunt-torso', '#7e8e78', { roughness: 0.9 });
    torso.position.y = s * 1.55;
    root.add(torso);
    const chest = this.mesh(`grunt-chest-${s}`, () => new THREE.BoxGeometry(s * 1.2, s * 0.42, s * 0.72), 'grunt-armor', '#a6b39f', { roughness: 0.72, metalness: 0.16 });
    chest.position.y = s * 1.82;
    root.add(chest);
    const head = this.mesh(`head-${s}`, () => new THREE.IcosahedronGeometry(s * 0.5, 1), 'grunt-head', '#9eaa9b', { roughness: 0.88 });
    head.position.y = s * 2.55;
    root.add(head);
    const helm = this.mesh(`grunt-helm-${s}`, () => new THREE.CylinderGeometry(s * 0.5, s * 0.58, s * 0.35, 7), 'grunt-helm', '#56645a', { roughness: 0.7, metalness: 0.2 });
    helm.position.y = s * 2.82;
    root.add(helm);
    this.limb(root, 'leg-left', s * 1.15, s * 0.16, '#56635a', [-s * 0.3, s * 1.03, 0], 0, 0.62);
    this.limb(root, 'leg-right', s * 1.15, s * 0.16, '#56635a', [s * 0.3, s * 1.03, 0], Math.PI, 0.62);
    const arm = this.limb(root, 'arm-right', s * 0.95, s * 0.12, '#758279', [s * 0.66, s * 2.02, 0], Math.PI, 0.42);
    const spear = this.mesh(`spear-${s}`, () => new THREE.CylinderGeometry(s * 0.045, s * 0.045, s * 2.1, 5), 'spear', '#695845', { roughness: 0.75 });
    spear.position.set(0, -s * 0.5, -s * 0.18);
    spear.rotation.z = 0.16;
    arm.add(spear);
    this.limb(root, 'arm-left', s * 0.88, s * 0.12, '#758279', [-s * 0.66, s * 2.02, 0], 0, 0.42);
  }

  swift(root, enemy, s) {
    const torso = this.mesh(`swift-torso-${s}`, () => new THREE.ConeGeometry(s * 0.62, s * 1.65, 6), 'swift-cloth', '#c3a760', { roughness: 0.85 });
    torso.position.y = s * 1.55;
    torso.rotation.z = -0.08;
    root.add(torso);
    const head = this.mesh(`swift-head-${s}`, () => new THREE.IcosahedronGeometry(s * 0.4, 1), 'swift-head', '#d7c17e', { roughness: 0.78 });
    head.position.y = s * 2.48;
    root.add(head);
    const hood = this.mesh(`swift-hood-${s}`, () => new THREE.ConeGeometry(s * 0.48, s * 0.72, 6), 'swift-hood', '#695b43', { roughness: 0.9 });
    hood.position.set(0, s * 2.67, s * 0.05);
    root.add(hood);
    this.limb(root, 'leg-left', s * 1.32, s * 0.12, '#6e644e', [-s * 0.24, s * 1.02, 0], 0, 0.92);
    this.limb(root, 'leg-right', s * 1.32, s * 0.12, '#6e644e', [s * 0.24, s * 1.02, 0], Math.PI, 0.92);
    this.limb(root, 'arm-left', s * 1.0, s * 0.09, '#b09b67', [-s * 0.52, s * 1.96, 0], Math.PI, 0.75);
    this.limb(root, 'arm-right', s * 1.0, s * 0.09, '#b09b67', [s * 0.52, s * 1.96, 0], 0, 0.75);
    for (const side of [-1, 1]) {
      const fin = this.mesh(`swift-fin-${s}`, () => new THREE.ConeGeometry(s * 0.12, s * 1.0, 4), 'swift-fin', '#e7cf81', { roughness: 0.6, emissive: '#d8b95d', emissiveIntensity: 0.2 });
      fin.position.set(side * s * 0.38, s * 1.7, s * 0.4);
      fin.rotation.x = Math.PI / 2;
      fin.rotation.z = side * 0.3;
      root.add(fin);
    }
  }

  tank(root, enemy, s) {
    const torso = this.mesh(`tank-torso-${s}`, () => new THREE.BoxGeometry(s * 1.65, s * 1.7, s * 1.15), 'tank-armor', '#73685d', { roughness: 0.55, metalness: 0.35 });
    torso.position.y = s * 1.55;
    root.add(torso);
    const chest = this.mesh(`tank-chest-${s}`, () => new THREE.BoxGeometry(s * 1.8, s * 0.55, s * 1.25), 'tank-plate', '#a3917b', { roughness: 0.5, metalness: 0.42 });
    chest.position.set(0, s * 1.75, -s * 0.14);
    root.add(chest);
    const head = this.mesh(`tank-head-${s}`, () => new THREE.BoxGeometry(s * 0.82, s * 0.72, s * 0.78), 'tank-helm', '#5e574f', { roughness: 0.55, metalness: 0.38 });
    head.position.y = s * 2.72;
    root.add(head);
    for (const side of [-1, 1]) {
      const shoulder = this.mesh(`tank-shoulder-${s}`, () => new THREE.DodecahedronGeometry(s * 0.5, 0), 'tank-shoulder-mat', '#8c7c6b', { roughness: 0.52, metalness: 0.4 });
      shoulder.position.set(side * s * 1.05, s * 2.05, 0);
      root.add(shoulder);
    }
    this.limb(root, 'leg-left', s * 1.18, s * 0.25, '#5c554d', [-s * 0.48, s * 1.0, 0], 0, 0.38);
    this.limb(root, 'leg-right', s * 1.18, s * 0.25, '#5c554d', [s * 0.48, s * 1.0, 0], Math.PI, 0.38);
    const shieldArm = this.limb(root, 'arm-left', s * 0.92, s * 0.2, '#625b52', [-s * 1.0, s * 2.08, 0], Math.PI, 0.28);
    const shield = this.mesh(`tank-shield-${s}`, () => new THREE.CylinderGeometry(s * 0.82, s * 0.82, s * 0.16, 8), 'tank-shield', '#8f806f', { roughness: 0.48, metalness: 0.45 });
    shield.rotation.x = Math.PI / 2;
    shield.position.set(0, -s * 0.55, -s * 0.52);
    shieldArm.add(shield);
    this.limb(root, 'arm-right', s * 0.88, s * 0.2, '#625b52', [s * 1.0, s * 2.08, 0], 0, 0.28);
  }

  mage(root, enemy, s) {
    const robe = this.mesh(`mage-robe-${s}`, () => new THREE.ConeGeometry(s * 0.88, s * 2.1, 7), 'mage-robe', '#5f4978', { roughness: 0.88 });
    robe.position.y = s * 1.1;
    root.add(robe);
    const collar = this.mesh(`mage-collar-${s}`, () => new THREE.TorusGeometry(s * 0.52, s * 0.1, 6, 16), 'mage-collar', '#9a75be', { roughness: 0.55, metalness: 0.25 });
    collar.position.y = s * 2.05;
    collar.rotation.x = Math.PI / 2;
    root.add(collar);
    const hood = this.mesh(`mage-hood-${s}`, () => new THREE.ConeGeometry(s * 0.55, s * 0.9, 6), 'mage-hood', '#3e3150', { roughness: 0.9 });
    hood.position.y = s * 2.62;
    root.add(hood);
    const staffArm = this.limb(root, 'arm-right', s * 0.82, s * 0.1, '#6f5c85', [s * 0.62, s * 1.95, 0], 0, 0.22);
    const staff = this.mesh(`mage-staff-${s}`, () => new THREE.CylinderGeometry(s * 0.04, s * 0.04, s * 2.2, 6), 'mage-staff', '#6d5541', { roughness: 0.8 });
    staff.position.set(0, -s * 0.7, -s * 0.18);
    staffArm.add(staff);
    const orb = this.mesh(`mage-orb-${s}`, () => new THREE.IcosahedronGeometry(s * 0.22, 1), 'mage-orb', '#caa2ff', { roughness: 0.22, emissive: '#a86dff', emissiveIntensity: 1.8 });
    orb.position.set(0, s * 0.4, -s * 0.18);
    orb.name = 'spin-core';
    staffArm.add(orb);
    this.limb(root, 'arm-left', s * 0.78, s * 0.1, '#6f5c85', [-s * 0.62, s * 1.95, 0], Math.PI, 0.22);
  }

  ember(root, enemy, s) {
    const torso = this.mesh(`ember-body-${s}`, () => new THREE.IcosahedronGeometry(s * 0.95, 1), 'ember-body', '#7b382b', { roughness: 0.7 });
    torso.position.y = s * 1.15;
    torso.scale.set(1.45, 0.72, 0.82);
    root.add(torso);
    const head = this.mesh(`ember-head-${s}`, () => new THREE.ConeGeometry(s * 0.55, s * 1.05, 6), 'ember-head', '#9b4832', { roughness: 0.65 });
    head.position.set(0, s * 1.35, -s * 1.05);
    head.rotation.x = Math.PI / 2;
    root.add(head);
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1;
      const front = i < 2 ? -1 : 1;
      this.limb(root, `leg-${i}`, s * 0.72, s * 0.11, '#5b3028', [side * s * 0.65, s * 0.82, front * s * 0.48], i < 2 ? 0 : Math.PI, 0.55, 'z');
    }
    for (let i = 0; i < 4; i++) {
      const flame = this.mesh(`ember-flame-${s}-${i}`, () => new THREE.ConeGeometry(s * 0.15, s * (0.7 + i * 0.08), 5), 'ember-flame', '#ff7435', { roughness: 0.28, emissive: '#ff4e1f', emissiveIntensity: 1.7 });
      flame.position.set((i - 1.5) * s * 0.28, s * 1.85, s * 0.2);
      root.add(flame);
    }
    const tail = this.mesh(`ember-tail-${s}`, () => new THREE.ConeGeometry(s * 0.28, s * 1.65, 6), 'ember-tail', '#6f3228', { roughness: 0.72 });
    tail.position.set(0, s * 1.0, s * 1.35);
    tail.rotation.x = Math.PI / 2;
    root.add(tail);
  }

  glacial(root, enemy, s) {
    const cloak = this.mesh(`glacial-cloak-${s}`, () => new THREE.ConeGeometry(s * 0.85, s * 2.2, 6), 'glacial-cloak', '#6aa9bd', { roughness: 0.54, emissive: '#4e9bb7', emissiveIntensity: 0.35 });
    cloak.position.y = s * 1.25;
    root.add(cloak);
    const head = this.mesh(`glacial-head-${s}`, () => new THREE.OctahedronGeometry(s * 0.52, 0), 'glacial-head', '#d1f5ff', { roughness: 0.32, emissive: '#8ce8ff', emissiveIntensity: 1.25 });
    head.position.y = s * 2.48;
    root.add(head);
    for (let i = 0; i < 5; i++) {
      const shard = this.mesh(`glacial-spike-${s}-${i}`, () => new THREE.ConeGeometry(s * 0.11, s * (0.85 + i * 0.08), 4), 'glacial-spike', '#b9efff', { roughness: 0.28, emissive: '#71d8f2', emissiveIntensity: 0.7 });
      const angle = i / 5 * Math.PI * 2;
      shard.position.set(Math.cos(angle) * s * 0.62, s * 1.85, Math.sin(angle) * s * 0.62);
      shard.rotation.z = Math.cos(angle) * 0.55;
      shard.rotation.x = -Math.sin(angle) * 0.55;
      root.add(shard);
    }
    root.userData.float = true;
  }

  regen(root, enemy, s) {
    const torso = this.mesh(`regen-torso-${s}`, () => new THREE.DodecahedronGeometry(s * 1.05, 0), 'regen-bark', '#526f43', { roughness: 1 });
    torso.position.y = s * 1.45;
    torso.scale.y = 1.28;
    root.add(torso);
    const head = this.mesh(`regen-head-${s}`, () => new THREE.IcosahedronGeometry(s * 0.48, 1), 'regen-head', '#739459', { roughness: 1 });
    head.position.y = s * 2.55;
    root.add(head);
    this.limb(root, 'leg-left', s * 1.15, s * 0.18, '#455f3c', [-s * 0.36, s * 1.03, 0], 0, 0.46);
    this.limb(root, 'leg-right', s * 1.15, s * 0.18, '#455f3c', [s * 0.36, s * 1.03, 0], Math.PI, 0.46);
    this.limb(root, 'arm-left', s * 1.25, s * 0.16, '#5f7e4a', [-s * 0.78, s * 2.03, 0], Math.PI, 0.38);
    this.limb(root, 'arm-right', s * 1.25, s * 0.16, '#5f7e4a', [s * 0.78, s * 2.03, 0], 0, 0.38);
    for (let i = 0; i < 5; i++) {
      const leaf = this.mesh(`regen-leaf-${s}-${i}`, () => new THREE.ConeGeometry(s * 0.18, s * 0.72, 4), 'regen-leaf', '#86a95f', { roughness: 1 });
      const angle = i / 5 * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * s * 0.46, s * 2.95, Math.sin(angle) * s * 0.46);
      leaf.rotation.z = Math.cos(angle) * 0.6;
      leaf.rotation.x = -Math.sin(angle) * 0.6;
      root.add(leaf);
    }
  }

  shield(root, enemy, s) {
    const torso = this.mesh(`shield-torso-${s}`, () => new THREE.OctahedronGeometry(s * 0.95, 0), 'shield-armor', '#607f8d', { roughness: 0.42, metalness: 0.38 });
    torso.position.y = s * 1.45;
    torso.scale.y = 1.25;
    root.add(torso);
    const head = this.mesh(`shield-head-${s}`, () => new THREE.OctahedronGeometry(s * 0.42, 0), 'shield-head', '#9dcad8', { roughness: 0.34, metalness: 0.28, emissive: '#5caec6', emissiveIntensity: 0.32 });
    head.position.y = s * 2.55;
    root.add(head);
    this.limb(root, 'leg-left', s * 1.05, s * 0.15, '#526b76', [-s * 0.3, s * 1.0, 0], 0, 0.44);
    this.limb(root, 'leg-right', s * 1.05, s * 0.15, '#526b76', [s * 0.3, s * 1.0, 0], Math.PI, 0.44);
    const orbit = new THREE.Group();
    orbit.name = 'spin-core';
    orbit.position.y = s * 1.6;
    for (let i = 0; i < 3; i++) {
      const panel = this.mesh(`shield-panel-${s}`, () => new THREE.BoxGeometry(s * 0.14, s * 0.9, s * 0.52), 'shield-panel', '#82bdd0', { roughness: 0.3, metalness: 0.32, emissive: '#4ca9c5', emissiveIntensity: 0.55 });
      const angle = i / 3 * Math.PI * 2;
      panel.position.set(Math.cos(angle) * s * 1.35, 0, Math.sin(angle) * s * 1.35);
      panel.rotation.y = -angle;
      orbit.add(panel);
    }
    root.add(orbit);
  }

  elite(root, enemy, s) {
    const torso = this.mesh(`elite-torso-${s}`, () => new THREE.DodecahedronGeometry(s * 1.0, 0), 'elite-armor', '#573e67', { roughness: 0.4, metalness: 0.48 });
    torso.position.y = s * 1.5;
    torso.scale.y = 1.25;
    root.add(torso);
    const chest = this.mesh(`elite-chest-${s}`, () => new THREE.BoxGeometry(s * 1.35, s * 0.42, s * 0.75), 'elite-chest', '#8a5aa5', { roughness: 0.35, metalness: 0.52, emissive: '#713d94', emissiveIntensity: 0.25 });
    chest.position.y = s * 1.85;
    root.add(chest);
    const helm = this.mesh(`elite-helm-${s}`, () => new THREE.ConeGeometry(s * 0.54, s * 0.86, 6), 'elite-helm', '#3d2d48', { roughness: 0.38, metalness: 0.5 });
    helm.position.y = s * 2.72;
    root.add(helm);
    for (const side of [-1, 1]) {
      const horn = this.mesh(`elite-horn-${s}`, () => new THREE.ConeGeometry(s * 0.11, s * 0.7, 4), 'elite-horn', '#c68df0', { roughness: 0.25, emissive: '#a35bd4', emissiveIntensity: 0.9 });
      horn.position.set(side * s * 0.42, s * 3.12, 0);
      horn.rotation.z = side * 0.45;
      root.add(horn);
    }
    this.limb(root, 'leg-left', s * 1.18, s * 0.17, '#44364c', [-s * 0.34, s * 1.03, 0], 0, 0.5);
    this.limb(root, 'leg-right', s * 1.18, s * 0.17, '#44364c', [s * 0.34, s * 1.03, 0], Math.PI, 0.5);
    const left = this.limb(root, 'arm-left', s * 1.0, s * 0.13, '#684a79', [-s * 0.76, s * 2.08, 0], Math.PI, 0.55);
    const right = this.limb(root, 'arm-right', s * 1.0, s * 0.13, '#684a79', [s * 0.76, s * 2.08, 0], 0, 0.55);
    this.addBlade(left, '#dba8ff', s * 1.0);
    this.addBlade(right, '#dba8ff', s * 1.0);
  }

  boss(root, enemy, s) {
    const lower = this.mesh(`boss-lower-${s}`, () => new THREE.CylinderGeometry(s * 0.9, s * 1.15, s * 1.25, 8), 'boss-lower', '#432d43', { roughness: 0.42, metalness: 0.42 });
    lower.position.y = s * 1.0;
    root.add(lower);
    const torso = this.mesh(`boss-torso-${s}`, () => new THREE.DodecahedronGeometry(s * 1.2, 0), 'boss-armor', '#67405f', { roughness: 0.36, metalness: 0.5 });
    torso.position.y = s * 2.0;
    torso.scale.y = 1.25;
    root.add(torso);
    const core = this.mesh(`boss-core-${s}`, () => new THREE.IcosahedronGeometry(s * 0.38, 1), 'boss-core', '#ffd8f2', { roughness: 0.15, emissive: '#e35aac', emissiveIntensity: 2.4 });
    core.position.set(0, s * 2.12, -s * 1.05);
    core.name = 'pulse-core';
    root.add(core);
    const head = this.mesh(`boss-head-${s}`, () => new THREE.IcosahedronGeometry(s * 0.62, 1), 'boss-head', '#3b2738', { roughness: 0.38, metalness: 0.42 });
    head.position.y = s * 3.42;
    root.add(head);
    const crown = new THREE.Group();
    crown.name = 'spin-core';
    crown.position.y = s * 4.05;
    for (let i = 0; i < 6; i++) {
      const spike = this.mesh(`boss-crown-${s}`, () => new THREE.ConeGeometry(s * 0.12, s * 0.82, 4), 'boss-crown', '#ef93d0', { roughness: 0.24, emissive: '#c84f99', emissiveIntensity: 1.15 });
      const angle = i / 6 * Math.PI * 2;
      spike.position.set(Math.cos(angle) * s * 0.62, 0, Math.sin(angle) * s * 0.62);
      spike.rotation.z = Math.cos(angle) * 0.55;
      spike.rotation.x = -Math.sin(angle) * 0.55;
      crown.add(spike);
    }
    root.add(crown);
    this.limb(root, 'leg-left', s * 1.42, s * 0.23, '#3e313d', [-s * 0.48, s * 1.12, 0], 0, 0.34);
    this.limb(root, 'leg-right', s * 1.42, s * 0.23, '#3e313d', [s * 0.48, s * 1.12, 0], Math.PI, 0.34);
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1;
      const upper = i < 2;
      const arm = this.limb(root, `arm-${i}`, s * (upper ? 1.22 : 1.05), s * 0.17, '#573d54', [side * s * 1.1, s * (upper ? 2.65 : 1.9), (upper ? -1 : 1) * s * 0.18], i * 1.4, upper ? 0.36 : 0.28);
      if (upper) this.addBlade(arm, '#f0a0d4', s * 1.05);
    }
    for (let i = 0; i < 5; i++) {
      const spike = this.mesh(`boss-back-${s}-${i}`, () => new THREE.ConeGeometry(s * 0.15, s * (0.95 + i * 0.08), 5), 'boss-back', '#8b537f', { roughness: 0.34, emissive: '#6a315e', emissiveIntensity: 0.28 });
      spike.position.set((i - 2) * s * 0.38, s * 2.35, s * 0.88);
      spike.rotation.x = -0.85;
      root.add(spike);
    }
  }

  updateEnemy(view, enemy, time) {
    const base = toScene(enemy.x, enemy.y, 0.13);
    view.position.copy(base);
    view.rotation.y = Math.PI / 2 - enemy.angle;

    const spawn = Math.min(1, (enemy.spawnAge ?? 0) / (enemy.def.boss ? 0.55 : 0.3));
    const eased = 1 - (1 - spawn) ** 3;
    view.scale.setScalar(0.24 + eased * 0.76);
    view.position.y += (1 - eased) * -0.18;

    const body = view.getObjectByName('body');
    const slow = enemy.effects.has('slow');
    const frozen = enemy.effects.has('freeze');
    const stunned = enemy.effects.has('stun');
    const cycle = enemy.distance * (enemy.def.id === 'swift' ? 0.13 : enemy.def.id === 'tank' || enemy.def.boss ? 0.055 : 0.085);
    const locomotion = frozen || stunned ? 0 : slow ? 0.62 : 1;
    for (const walker of view.userData.walkers) {
      const value = walker.base + Math.sin(cycle + walker.phase) * walker.amplitude * locomotion;
      walker.object.rotation[walker.axis] = value;
    }

    const bobAmp = enemy.def.boss || enemy.def.id === 'tank' ? 0.012 : enemy.def.id === 'swift' ? 0.045 : 0.025;
    body.position.y = (body.userData.float ? 0.07 : 0) + Math.sin(cycle * 2) * bobAmp;
    body.rotation.x = -enemy.hitPulse * 0.14;
    body.rotation.z = stunned ? Math.sin(time * 28) * 0.025 : Math.sin(cycle) * (enemy.def.boss ? 0.012 : 0.025);

    const health = view.getObjectByName('health');
    const localCamera = view.quaternion.clone().invert().multiply(this.camera.quaternion);
    health.quaternion.copy(localCamera);
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    health.visible = enemy.def.boss || ratio < 0.995 || enemy.shield < enemy.maxShield;
    const fill = health.getObjectByName('health-fill');
    fill.scale.x = fill.userData.fullWidth * ratio;
    fill.position.x = -(1 - ratio) * fill.userData.fullWidth * 0.5;
    fill.material.color.set(ratio > 0.55 ? '#83e29a' : ratio > 0.25 ? '#f2c56b' : '#f06f67');

    const shield = view.getObjectByName('shield');
    shield.visible = enemy.shield > 0.01;
    if (shield.visible) {
      shield.rotation.y = time * 0.75;
      shield.rotation.x = Math.sin(time * 0.7) * 0.2;
      shield.material.opacity = 0.12 + 0.13 * (enemy.shield / Math.max(1, enemy.maxShield));
    }

    this.updateStatuses(view, enemy, time);

    const spin = view.getObjectByName('spin-core');
    if (spin) spin.rotation.y = time * (enemy.def.boss ? 0.72 : 1.65) + enemy.phase;
    const pulse = view.getObjectByName('pulse-core');
    if (pulse) {
      const factor = 1 + Math.sin(time * 4 + enemy.phase) * 0.055 + enemy.hitPulse * 0.12;
      pulse.scale.setScalar(factor);
    }

    const shell = view.getObjectByName('hit-shell');
    shell.material.opacity = enemy.hitFlash * 0.34;
    shell.scale.setScalar(1 + enemy.hitPulse * 0.18);
  }

  updateStatuses(view, enemy, time) {
    const slow = view.getObjectByName('status-slow');
    slow.visible = enemy.effects.has('slow') || enemy.effects.has('freeze');
    if (slow.visible) slow.rotation.y = time * 0.55;

    const burn = view.getObjectByName('status-burn');
    burn.visible = enemy.effects.has('burn');
    if (burn.visible) {
      burn.children.forEach((ember, index) => {
        const phase = ember.userData.phase + time * 5;
        ember.position.set(Math.cos(phase) * 0.18, 0.42 + (Math.sin(phase * 1.7) + 1) * 0.18, Math.sin(phase) * 0.18);
      });
    }

    const poison = view.getObjectByName('status-poison');
    poison.visible = enemy.effects.has('poison');
    if (poison.visible) {
      poison.children.forEach((mote) => {
        const phase = mote.userData.phase + time * 1.8;
        mote.position.set(Math.cos(phase) * 0.25, 0.28 + (Math.sin(phase * 1.3) + 1) * 0.2, Math.sin(phase) * 0.25);
      });
    }

    const stun = view.getObjectByName('status-stun');
    stun.visible = enemy.effects.has('stun');
    if (stun.visible) {
      stun.children.forEach((spark) => {
        const phase = spark.userData.phase + time * 5.5;
        spark.position.set(Math.cos(phase) * 0.3, 0.72, Math.sin(phase) * 0.3);
      });
    }
  }
}
