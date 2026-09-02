import * as THREE from 'three';
import { ELEMENTS } from '../config/elements.js';
import { toScene, emissiveMaterial, disposeObject } from './drawing.js';

const SOFT_TYPES = new Set(['smoke', 'dust', 'leaf']);

export class VfxRenderer {
  constructor(game, scene, camera) {
    this.game = game;
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.name = 'vfx-3d';
    scene.add(this.group);
    this.projectiles = new Map();
    this.rings = new Map();
    this.beams = new Map();
    this.texts = new Map();
    this.burstViews = new Map();
    this.burstPools = new Map();
    this.buildParticleClouds();
  }

  makeCloud(size, opacity, blending) {
    const count = this.game.particles.maxParticles;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const mat = new THREE.PointsMaterial({
      size,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity,
      depthWrite: false,
      blending,
    });
    const cloud = new THREE.Points(geometry, mat);
    cloud.frustumCulled = false;
    this.group.add(cloud);
    return cloud;
  }

  buildParticleClouds() {
    this.sparkCloud = this.makeCloud(0.075, 0.95, THREE.AdditiveBlending);
    this.softCloud = this.makeCloud(0.13, 0.52, THREE.NormalBlending);
  }

  sync(time) {
    this.syncProjectiles(time);
    this.syncParticles();
    this.syncRings();
    this.syncBeams();
    this.syncBursts();
    this.syncTexts();
  }

  syncProjectiles(time) {
    const live = new Set(this.game.projectiles);
    for (const [projectile, view] of this.projectiles) {
      if (live.has(projectile)) continue;
      this.group.remove(view);
      disposeObject(view);
      this.projectiles.delete(projectile);
    }

    for (const projectile of this.game.projectiles) {
      let view = this.projectiles.get(projectile);
      if (!view) {
        view = this.createProjectile(projectile);
        this.group.add(view);
        this.projectiles.set(projectile, view);
      }

      const height = projectile.kind === 'meteor' ? 0.92 : projectile.kind === 'rock' ? 0.48 : 0.62;
      const current = toScene(projectile.x, projectile.y, height);
      view.position.copy(current);
      view.rotation.y = projectile.spin;
      view.rotation.z = projectile.spin * 0.45;

      const history = view.userData.history;
      history.push(current.clone());
      const maxHistory = projectile.kind === 'meteor' ? 11 : projectile.kind === 'arc' ? 8 : 5;
      while (history.length > maxHistory) history.shift();
      const relative = history.map((point) => point.clone().sub(current));
      const trail = view.getObjectByName('trail');
      trail.geometry.setFromPoints(relative);
      trail.material.opacity = projectile.kind === 'meteor' ? 0.78 : 0.62;

      const core = view.getObjectByName('projectile-core');
      if (core) core.scale.setScalar(1 + Math.sin(time * 12 + projectile.spin) * 0.08);

      if (time - view.userData.lastParticle > (projectile.kind === 'meteor' ? 0.055 : 0.09)) {
        view.userData.lastParticle = time;
        if (projectile.kind === 'meteor') {
          this.game.particles.spawn(projectile.x, projectile.y, { color: '#77675c', count: 1, power: 7, type: 'smoke', r: 5.5, life: 0.55, drag: 0.98, upBias: 7 });
          this.game.particles.spawn(projectile.x, projectile.y, { color: '#ff9a47', count: 1, power: 16, type: 'spark', r: 2, life: 0.22, glow: 8 });
        } else if (projectile.element === 'ice') {
          this.game.particles.spawn(projectile.x, projectile.y, { color: '#d8fbff', count: 1, power: 8, type: 'shard', r: 1.8, life: 0.22, glow: 5 });
        }
      }
    }
  }

  createProjectile(projectile) {
    const root = new THREE.Group();
    const el = ELEMENTS[projectile.element];
    let geometry;
    if (projectile.kind === 'shard' || projectile.kind === 'prism') geometry = new THREE.OctahedronGeometry(projectile.kind === 'prism' ? 0.14 : 0.105);
    else if (projectile.kind === 'rock') geometry = new THREE.DodecahedronGeometry(0.14, 0);
    else if (projectile.kind === 'meteor') geometry = new THREE.IcosahedronGeometry(0.2, 1);
    else if (projectile.kind === 'thorn' || projectile.kind === 'seed') geometry = new THREE.ConeGeometry(0.075, 0.28, 5);
    else if (projectile.kind === 'arc') geometry = new THREE.OctahedronGeometry(0.09, 0);
    else geometry = new THREE.IcosahedronGeometry(0.105, 1);

    const core = new THREE.Mesh(geometry, emissiveMaterial(el.color, projectile.kind === 'meteor' ? 2.7 : 1.9));
    core.name = 'projectile-core';
    if (projectile.kind === 'arc') core.scale.set(0.7, 0.7, 1.6);
    root.add(core);

    const trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -0.2)]),
      new THREE.LineBasicMaterial({
        color: projectile.kind === 'meteor' ? '#ffb85c' : el.light,
        transparent: true,
        opacity: 0.66,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    trail.name = 'trail';
    root.add(trail);
    root.userData.history = [];
    root.userData.lastParticle = -999;
    return root;
  }

  syncParticles() {
    const spark = [];
    const soft = [];
    for (const particle of this.game.particles.items) (SOFT_TYPES.has(particle.type) ? soft : spark).push(particle);
    this.writeCloud(this.sparkCloud, spark, false);
    this.writeCloud(this.softCloud, soft, true);
  }

  writeCloud(cloud, items, soft) {
    const positions = cloud.geometry.attributes.position;
    const colors = cloud.geometry.attributes.color;
    const temp = new THREE.Color();
    const count = Math.min(items.length, positions.count);
    for (let i = 0; i < count; i++) {
      const particle = items[i];
      const progress = 1 - particle.life / Math.max(0.001, particle.max);
      const baseHeight = particle.height ?? (soft ? 0.22 : 0.15);
      const lift = soft ? baseHeight + progress * 0.52 : baseHeight + Math.sin(progress * Math.PI) * 0.3;
      const point = toScene(particle.x, particle.y, lift);
      positions.setXYZ(i, point.x, point.y, point.z);
      temp.set(particle.color || '#ffffff');
      const fade = THREE.MathUtils.clamp(particle.life / Math.max(0.001, particle.max), 0, 1);
      const multiplier = soft ? fade * 0.72 : fade;
      colors.setXYZ(i, temp.r * multiplier, temp.g * multiplier, temp.b * multiplier);
    }
    for (let i = count; i < positions.count; i++) positions.setXYZ(i, 999, -999, 999);
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    cloud.geometry.setDrawRange(0, count);
  }

  syncRings() {
    const live = new Set(this.game.particles.rings);
    for (const [ring, view] of this.rings) {
      if (live.has(ring)) continue;
      this.group.remove(view);
      disposeObject(view);
      this.rings.delete(ring);
    }
    for (const ring of this.game.particles.rings) {
      let view = this.rings.get(ring);
      if (!view) {
        view = new THREE.Mesh(
          new THREE.RingGeometry(0.97, 1.03, 48),
          new THREE.MeshBasicMaterial({ color: ring.color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        view.rotation.x = -Math.PI / 2;
        this.group.add(view);
        this.rings.set(ring, view);
      }
      const progress = 1 - ring.life / ring.max;
      const radius = THREE.MathUtils.lerp(ring.from, ring.to, progress) * 0.01;
      view.position.copy(toScene(ring.x, ring.y, 0.14));
      view.scale.set(radius, radius * (ring.aspect || 1), radius);
      view.material.opacity = Math.max(0, ring.life / ring.max) * 0.72;
    }
  }

  syncBeams() {
    const live = new Set(this.game.particles.beams);
    for (const [beam, view] of this.beams) {
      if (live.has(beam)) continue;
      this.group.remove(view);
      disposeObject(view);
      this.beams.delete(beam);
    }
    for (const beam of this.game.particles.beams) {
      let view = this.beams.get(beam);
      if (!view) {
        const root = new THREE.Group();
        const halo = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: beam.color, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
        const core = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#f4ffff', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
        halo.name = 'beam-halo';
        core.name = 'beam-core';
        root.add(halo, core);
        this.group.add(root);
        view = root;
        this.beams.set(beam, view);
      }
      const points = beam.points.map((point, index) => toScene(point.x, point.y, index === 0 ? 0.72 : 0.5));
      view.getObjectByName('beam-halo').geometry.setFromPoints(points);
      view.getObjectByName('beam-core').geometry.setFromPoints(points);
      const fade = Math.max(0, beam.life / beam.max);
      view.getObjectByName('beam-halo').material.opacity = fade * 0.36;
      view.getObjectByName('beam-core').material.opacity = fade;
    }
  }

  syncBursts() {
    const live = new Set(this.game.particles.bursts);
    for (const [burst, view] of this.burstViews) {
      if (live.has(burst)) continue;
      this.releaseBurstView(burst.kind, view);
      this.burstViews.delete(burst);
    }
    for (const burst of this.game.particles.bursts) {
      let view = this.burstViews.get(burst);
      if (!view) {
        view = this.acquireBurstView(burst.kind);
        this.burstViews.set(burst, view);
      }
      this.updateBurstView(view, burst);
    }
  }

  acquireBurstView(kind) {
    const pool = this.burstPools.get(kind) || [];
    this.burstPools.set(kind, pool);
    const pooled = pool.pop();
    if (pooled) {
      pooled.visible = true;
      this.group.add(pooled);
      return pooled;
    }
    const root = new THREE.Group();
    root.userData.kind = kind;

    const flash = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.26, 1),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    flash.name = 'burst-flash';
    root.add(flash);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, 2),
      new THREE.MeshBasicMaterial({ color: '#ff8b3d', transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    core.name = 'burst-core';
    root.add(core);

    const shock = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.05, 64),
      new THREE.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }),
    );
    shock.name = 'burst-shock';
    shock.rotation.x = -Math.PI / 2;
    root.add(shock);

    this.group.add(root);
    return root;
  }

  releaseBurstView(kind, view) {
    this.group.remove(view);
    view.visible = false;
    const pool = this.burstPools.get(kind) || [];
    this.burstPools.set(kind, pool);
    if (pool.length < 16) pool.push(view);
    else disposeObject(view);
  }

  updateBurstView(view, burst) {
    const progress = 1 - burst.life / burst.max;
    const fade = Math.max(0, burst.life / burst.max);
    const power = burst.power || 1;
    view.position.copy(toScene(burst.x, burst.y, burst.kind === 'spawn' ? 0.32 : 0.34));
    const flash = view.getObjectByName('burst-flash');
    const core = view.getObjectByName('burst-core');
    const shock = view.getObjectByName('burst-shock');
    flash.material.color.set(burst.kind === 'explosion' ? '#fff2c8' : burst.color);
    core.material.color.set(burst.color);
    shock.material.color.set(burst.kind === 'explosion' ? '#ffd18a' : burst.color);

    const flashScale = power * (0.35 + Math.sin(Math.min(1, progress * 2) * Math.PI) * 0.72);
    flash.scale.setScalar(flashScale);
    flash.material.opacity = fade * (burst.kind === 'shock' ? 0.28 : 0.78);

    const coreScale = power * (0.18 + progress * (burst.kind === 'explosion' ? 0.95 : 0.55));
    core.scale.setScalar(coreScale);
    core.material.opacity = fade * (burst.kind === 'explosion' ? 0.58 : burst.kind === 'spawn' ? 0.28 : 0.4);

    const shockScale = power * (0.18 + progress * (burst.kind === 'explosion' ? 1.45 : 0.95));
    shock.scale.setScalar(shockScale);
    shock.material.opacity = fade * (burst.kind === 'explosion' || burst.kind === 'shock' ? 0.58 : 0.34);
  }

  syncTexts() {
    const live = new Set(this.game.particles.texts);
    for (const [text, view] of this.texts) {
      if (live.has(text)) continue;
      this.group.remove(view);
      view.material.map?.dispose();
      view.material.dispose();
      this.texts.delete(text);
    }
    for (const text of this.game.particles.texts) {
      let view = this.texts.get(text);
      if (!view) {
        view = this.makeTextSprite(text.text, text.color, text.critical);
        this.group.add(view);
        this.texts.set(text, view);
      }
      const progress = 1 - text.life / text.max;
      view.position.copy(toScene(text.x, text.y, 0.62 + progress * 0.45));
      view.material.opacity = Math.min(1, text.life / 0.16);
      const scale = text.critical ? 0.66 : 0.5;
      view.scale.set(scale * 1.8, scale, 1);
    }
  }

  makeTextSprite(value, color, critical) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${critical ? 800 : 700} ${critical ? 62 : 50}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 11;
    ctx.strokeStyle = 'rgba(9, 14, 12, .8)';
    ctx.strokeText(value, 128, 66);
    ctx.fillStyle = color;
    ctx.fillText(value, 128, 66);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    return new THREE.Sprite(material);
  }
}
