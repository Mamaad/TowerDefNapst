import * as THREE from 'three';
import { ELEMENTS } from '../config/elements.js';
import { toScene, emissiveMaterial, disposeObject } from './drawing.js';

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
    this.buildParticleCloud();
  }

  buildParticleCloud() {
    const count = this.game.particles.maxParticles;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const material = new THREE.PointsMaterial({
      size: 0.075,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particleCloud = new THREE.Points(geometry, material);
    this.particleCloud.frustumCulled = false;
    this.group.add(this.particleCloud);
  }

  sync(time) {
    this.syncProjectiles(time);
    this.syncParticles();
    this.syncRings();
    this.syncBeams();
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
      const previous = toScene(projectile.prevX, projectile.prevY, height * 0.96);
      view.position.copy(current);
      view.rotation.y = projectile.spin;
      view.rotation.z = projectile.spin * 0.7;
      const trail = view.getObjectByName('trail');
      const localPrev = previous.sub(current);
      trail.geometry.setFromPoints([new THREE.Vector3(), localPrev]);
      trail.geometry.attributes.position.needsUpdate = true;
      const core = view.getObjectByName('projectile-core');
      if (core) core.scale.setScalar(1 + Math.sin(time * 12 + projectile.spin) * 0.08);
    }
  }

  createProjectile(projectile) {
    const root = new THREE.Group();
    const el = ELEMENTS[projectile.element];
    let geometry;
    if (projectile.kind === 'shard' || projectile.kind === 'prism') geometry = new THREE.OctahedronGeometry(projectile.kind === 'prism' ? 0.13 : 0.1);
    else if (projectile.kind === 'rock') geometry = new THREE.DodecahedronGeometry(0.13, 0);
    else if (projectile.kind === 'meteor') geometry = new THREE.IcosahedronGeometry(0.18, 1);
    else if (projectile.kind === 'thorn' || projectile.kind === 'seed') geometry = new THREE.ConeGeometry(0.075, 0.26, 5);
    else geometry = new THREE.IcosahedronGeometry(0.1, 1);
    const core = new THREE.Mesh(geometry, emissiveMaterial(el.color, projectile.kind === 'meteor' ? 2.2 : 1.65));
    core.name = 'projectile-core';
    root.add(core);
    const trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -0.2)]),
      new THREE.LineBasicMaterial({ color: el.light, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    trail.name = 'trail';
    root.add(trail);
    return root;
  }

  syncParticles() {
    const items = this.game.particles.items;
    const positions = this.particleCloud.geometry.attributes.position;
    const colors = this.particleCloud.geometry.attributes.color;
    const temp = new THREE.Color();
    const count = Math.min(items.length, positions.count);
    for (let i = 0; i < count; i++) {
      const p = items[i];
      const progress = 1 - p.life / Math.max(0.001, p.max);
      const lift = p.type === 'smoke' ? 0.28 + progress * 0.55 : Math.sin(progress * Math.PI) * 0.32 + 0.16;
      const v = toScene(p.x, p.y, lift);
      positions.setXYZ(i, v.x, v.y, v.z);
      temp.set(p.color || '#ffffff');
      const fade = THREE.MathUtils.clamp(p.life / Math.max(0.001, p.max), 0, 1);
      colors.setXYZ(i, temp.r * fade, temp.g * fade, temp.b * fade);
    }
    for (let i = count; i < positions.count; i++) positions.setXYZ(i, 999, -999, 999);
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    this.particleCloud.geometry.setDrawRange(0, count);
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
        view = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({ color: beam.color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }),
        );
        this.group.add(view);
        this.beams.set(beam, view);
      }
      view.geometry.setFromPoints(beam.points.map((point, index) => toScene(point.x, point.y, index === 0 ? 0.72 : 0.5)));
      view.material.opacity = Math.max(0, beam.life / beam.max);
    }
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
      view.material.opacity = Math.min(1, text.life / 0.18);
      const scale = text.critical ? 0.72 : 0.56;
      view.scale.set(scale * 1.8, scale, 1);
    }
  }

  makeTextSprite(value, color, critical) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${critical ? 800 : 700} ${critical ? 66 : 54}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(9, 14, 12, .88)';
    ctx.strokeText(value, 128, 66);
    ctx.fillStyle = color;
    ctx.fillText(value, 128, 66);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    return new THREE.Sprite(material);
  }
}
