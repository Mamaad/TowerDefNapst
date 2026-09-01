import * as THREE from 'three';
import { BUILD_PADS, DECOR, PATH } from '../config/map.js';
import { ELEMENTS } from '../config/elements.js';
import {
  SCENE_SCALE,
  GROUND_Y,
  toScene,
  material,
  emissiveMaterial,
  cylinder,
  box,
  crystal,
  torus,
  seeded,
  setShadow,
} from './drawing.js';

const TERRAIN_W = 18.8;
const TERRAIN_D = 11.2;

export class EnvironmentRenderer {
  constructor(game, scene) {
    this.game = game;
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'environment-3d';
    this.padViews = new Map();
    this.animated = [];
    scene.add(this.group);
    this.build();
  }

  build() {
    this.buildTerrain();
    this.buildRoad();
    this.buildPads();
    this.buildDecor();
    this.buildPortal(PATH[0], 'entry');
    this.buildPortal(PATH.at(-1), 'nexus');
  }

  buildTerrain() {
    const geometry = new THREE.PlaneGeometry(TERRAIN_W, TERRAIN_D, 42, 26);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.attributes.position;
    const colors = [];
    const rand = seeded(70421);
    const low = new THREE.Color('#244638');
    const high = new THREE.Color('#42664a');
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const ripple = Math.sin(x * 1.13) * 0.022 + Math.cos(z * 1.47) * 0.018 + (rand() - 0.5) * 0.025;
      position.setY(i, ripple - 0.04);
      const mix = THREE.MathUtils.clamp(0.28 + rand() * 0.42 + ripple * 3, 0, 1);
      const c = low.clone().lerp(high, mix);
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const terrain = new THREE.Mesh(geometry, material('#ffffff', { vertexColors: true, roughness: 1 }));
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.group.add(terrain);

    const under = box(TERRAIN_W + 0.25, 0.42, TERRAIN_D + 0.25, '#17251f', { roughness: 1 });
    under.position.y = -0.28;
    under.castShadow = false;
    this.group.add(under);

    const randTuft = seeded(5119);
    const grassMaterial = material('#496f4e', { roughness: 1 });
    const tuftGeometry = new THREE.ConeGeometry(0.035, 0.18, 3);
    const grass = new THREE.InstancedMesh(tuftGeometry, grassMaterial, 240);
    grass.castShadow = false;
    grass.receiveShadow = false;
    const temp = new THREE.Object3D();
    for (let i = 0; i < 240; i++) {
      temp.position.set((randTuft() - 0.5) * 17.3, 0.08, (randTuft() - 0.5) * 9.8);
      temp.rotation.y = randTuft() * Math.PI;
      const scale = 0.7 + randTuft() * 0.8;
      temp.scale.set(scale, scale, scale);
      temp.updateMatrix();
      grass.setMatrixAt(i, temp.matrix);
    }
    grass.instanceMatrix.needsUpdate = true;
    this.group.add(grass);
  }

  buildRoad() {
    const road = new THREE.Group();
    road.name = 'road';
    const rand = seeded(8192);
    const roadMat = material('#6e6248', { roughness: 0.98 });
    const borderMat = material('#3d493a', { roughness: 1 });
    const tileMats = [
      material('#8c7f62', { roughness: 1 }),
      material('#776d56', { roughness: 1 }),
      material('#9b8c6c', { roughness: 1 }),
    ];

    for (let i = 1; i < PATH.length; i++) {
      const a = toScene(PATH[i - 1].x, PATH[i - 1].y);
      const b = toScene(PATH[i].x, PATH[i].y);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      const yaw = Math.atan2(dz, dx);
      const center = a.clone().lerp(b, 0.5);

      const border = new THREE.Mesh(new THREE.BoxGeometry(length + 0.28, 0.055, 1.04), borderMat);
      border.position.set(center.x, 0.035, center.z);
      border.rotation.y = -yaw;
      border.receiveShadow = true;
      road.add(border);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(length + 0.12, 0.07, 0.84), roadMat);
      strip.position.set(center.x, 0.075, center.z);
      strip.rotation.y = -yaw;
      strip.receiveShadow = true;
      road.add(strip);

      const tileCount = Math.max(2, Math.floor(length / 0.26));
      for (let j = 0; j < tileCount; j++) {
        const t = (j + 0.5) / tileCount;
        const lateral = (rand() - 0.5) * 0.48;
        const px = THREE.MathUtils.lerp(a.x, b.x, t) - Math.sin(yaw) * lateral;
        const pz = THREE.MathUtils.lerp(a.z, b.z, t) + Math.cos(yaw) * lateral;
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(0.11 + rand() * 0.1, 0.025 + rand() * 0.018, 0.14 + rand() * 0.12),
          tileMats[j % tileMats.length],
        );
        tile.position.set(px, 0.12, pz);
        tile.rotation.y = -yaw + (rand() - 0.5) * 0.36;
        tile.receiveShadow = true;
        road.add(tile);
      }
    }
    this.group.add(road);
  }

  buildPads() {
    const stone = material('#55645d', { roughness: 0.88 });
    const inset = material('#273a32', { roughness: 0.78, metalness: 0.12 });
    for (const pad of BUILD_PADS) {
      const root = new THREE.Group();
      const p = toScene(pad.x, pad.y, 0.1);
      root.position.copy(p);
      root.name = `pad-${pad.id}`;
      root.userData.pad = pad;

      const slab = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.45, 0.13, 6), stone);
      slab.receiveShadow = true;
      slab.castShadow = true;
      root.add(slab);

      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.035, 6), inset);
      core.position.y = 0.08;
      root.add(core);

      const ring = torus(0.245, 0.014, '#79e8bf', { intensity: 0.35, opacity: 0.28 });
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.11;
      ring.material.depthWrite = false;
      root.add(ring);

      for (let i = 0; i < 6; i++) {
        const rune = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.014, 0.09), emissiveMaterial('#75c9a8', 0.25, 0.45));
        const angle = (i / 6) * Math.PI * 2;
        rune.position.set(Math.cos(angle) * 0.22, 0.115, Math.sin(angle) * 0.22);
        rune.rotation.y = -angle;
        root.add(rune);
      }

      this.padViews.set(pad.id, { root, ring, core });
      this.group.add(root);
    }
  }

  buildDecor() {
    for (const item of DECOR) {
      const root = this[item.type]?.(item) ?? this.rock(item);
      const p = toScene(item.x, item.y, 0.07);
      root.position.copy(p);
      root.scale.setScalar(item.scale ?? 1);
      root.rotation.y = item.variant * 0.78;
      setShadow(root, true, true);
      this.group.add(root);
    }
  }

  tree(item) {
    const root = new THREE.Group();
    const trunk = cylinder(0.08, 0.11, 0.72, '#4b3528', 7, { roughness: 1 });
    trunk.position.y = 0.36;
    root.add(trunk);
    const palette = ['#335b3c', '#416f45', '#294b35'];
    for (let i = 0; i < 3; i++) {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38 - i * 0.035, 1), material(palette[(item.variant + i) % palette.length], { roughness: 1 }));
      crown.position.set((i - 1) * 0.14, 0.74 + i * 0.19, (i % 2 ? 1 : -1) * 0.06);
      crown.scale.y = 1.2;
      root.add(crown);
    }
    return root;
  }

  bush(item) {
    const root = new THREE.Group();
    const palette = ['#3b663d', '#4c7848', '#2e5536'];
    for (let i = 0; i < 4; i++) {
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + (i % 2) * 0.045, 0), material(palette[(item.variant + i) % palette.length], { roughness: 1 }));
      crown.position.set((i - 1.5) * 0.14, 0.2 + (i % 2) * 0.09, Math.sin(i * 2) * 0.09);
      root.add(crown);
    }
    return root;
  }

  rock(item) {
    const root = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), material(item.variant % 2 ? '#59645f' : '#4a5650', { roughness: 1 }));
    rock.position.y = 0.24;
    rock.scale.set(1.15, 0.72, 0.9);
    root.add(rock);
    return root;
  }

  crystal(item) {
    const root = new THREE.Group();
    const colors = ['#ad78ff', '#71dcff', '#d0a0ff'];
    for (let i = 0; i < 4; i++) {
      const shard = crystal(0.11 + i * 0.012, 0.55 + i * 0.12, colors[(item.variant + i) % colors.length], { intensity: 0.7 });
      shard.position.set((i - 1.5) * 0.13, 0.28 + i * 0.05, (i % 2 ? 1 : -1) * 0.08);
      shard.rotation.z = (i - 1.5) * 0.08;
      root.add(shard);
    }
    return root;
  }

  ruin(item) {
    const root = new THREE.Group();
    const stone = '#5e665f';
    for (const side of [-1, 1]) {
      const column = cylinder(0.095, 0.12, 0.7 - (side > 0 ? 0.18 : 0), stone, 6, { roughness: 1 });
      column.position.set(side * 0.22, 0.35 - (side > 0 ? 0.09 : 0), 0);
      root.add(column);
    }
    const cap = box(0.58, 0.11, 0.18, '#6d746d', { roughness: 1 });
    cap.position.set(-0.03, 0.73, 0);
    cap.rotation.z = item.variant % 2 ? 0.12 : -0.08;
    root.add(cap);
    return root;
  }

  buildPortal(point, kind) {
    const root = new THREE.Group();
    const p = toScene(point.x, point.y, 0.08);
    root.position.copy(p);
    root.name = `${kind}-portal`;
    const isNexus = kind === 'nexus';
    const glowColor = isNexus ? '#bd78ff' : '#63efb1';
    const stoneColor = isNexus ? '#42364d' : '#34463d';

    const plinth = cylinder(0.56, 0.7, 0.18, stoneColor, 8, { roughness: 0.9 });
    plinth.position.y = 0.08;
    root.add(plinth);

    if (isNexus) {
      const core = crystal(0.22, 1.15, glowColor, { intensity: 1.2 });
      core.position.y = 0.72;
      core.name = 'portal-core';
      root.add(core);
      for (let i = 0; i < 3; i++) {
        const ring = torus(0.42 + i * 0.12, 0.025, glowColor, { intensity: 1.2, opacity: 0.78 });
        ring.position.y = 0.72;
        ring.rotation.set(Math.PI / 2, i * 0.65, i * 0.85);
        ring.name = 'portal-ring';
        root.add(ring);
        this.animated.push({ type: 'nexus-ring', object: ring, speed: 0.35 + i * 0.18, phase: i });
      }
    } else {
      const ring = torus(0.48, 0.075, glowColor, { intensity: 1.25, opacity: 0.86 });
      ring.position.y = 0.58;
      ring.name = 'portal-ring';
      root.add(ring);
      const inner = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), emissiveMaterial(glowColor, 0.8, 0.24));
      inner.position.y = 0.58;
      inner.position.z = 0.005;
      inner.material.side = THREE.DoubleSide;
      inner.name = 'portal-core';
      root.add(inner);
      this.animated.push({ type: 'entry-ring', object: ring, speed: 0.55, phase: 0 });
    }

    setShadow(root, true, true);
    this.group.add(root);
    this.animated.push({ type: kind, object: root, speed: 1, phase: isNexus ? 1.4 : 0.2 });
  }

  update(time, buildChoice, hoverPad, towers) {
    const occupied = new Set(towers.map((tower) => tower.pad.id));
    for (const [id, view] of this.padViews) {
      const isHover = hoverPad?.id === id;
      const isOccupied = occupied.has(id);
      const active = Boolean(buildChoice) && !isOccupied;
      view.ring.material.opacity = isHover ? 0.9 : active ? 0.48 : 0.18;
      view.ring.material.emissiveIntensity = isHover ? 1.8 : active ? 0.85 : 0.25;
      view.ring.scale.setScalar(isHover ? 1.1 + Math.sin(time * 5) * 0.04 : 1);
      view.core.material.color.set(isOccupied ? '#27312d' : active ? '#315244' : '#273a32');
    }

    for (const item of this.animated) {
      if (item.type === 'nexus-ring') {
        item.object.rotation.y = time * item.speed + item.phase;
        item.object.rotation.z = time * item.speed * 0.72 + item.phase;
      } else if (item.type === 'entry-ring') {
        item.object.rotation.z = Math.sin(time * item.speed) * 0.08;
      } else {
        const core = item.object.getObjectByName('portal-core');
        if (core) {
          const pulse = 1 + Math.sin(time * 2.2 + item.phase) * 0.06 + (item.type === 'nexus' ? this.game.nexusPulse * 0.2 : 0);
          core.scale.setScalar(pulse);
        }
      }
    }
  }
}
