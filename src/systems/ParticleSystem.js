import { ELEMENTS } from '../config/elements.js';

export class ParticleSystem {
  constructor() {
    this.items = [];
    this.pool = [];
    this.beams = [];
    this.rings = [];
    this.texts = [];
    this.bursts = [];
    this.burstPool = [];
    this.maxParticles = 900;
    this.maxBursts = 48;
  }

  acquire() {
    return this.pool.pop() || {};
  }

  spawn(x, y, {
    color = '#fff', count = 1, power = 50, type = 'orb', r = 2, life = 0.5,
    gravity = 0, drag = 0.95, glow = 0, upBias = 0, spread = 1, height = 0.18,
  } = {}) {
    const safeCount = Math.min(48, count);
    for (let i = 0; i < safeCount; i++) {
      const p = this.acquire();
      const angle = Math.random() * Math.PI * 2;
      const speed = power * (0.28 + Math.random() * 0.85) * spread;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - upBias;
      p.r = r * (0.65 + Math.random() * 0.8);
      p.life = life * (0.68 + Math.random() * 0.55);
      p.max = p.life;
      p.color = color;
      p.type = type;
      p.gravity = gravity;
      p.drag = drag;
      p.glow = glow;
      p.height = height;
      p.rot = Math.random() * Math.PI * 2;
      p.spin = (Math.random() - 0.5) * 6;
      this.items.push(p);
    }
    if (this.items.length > this.maxParticles) {
      const excess = this.items.length - this.maxParticles;
      for (let i = 0; i < excess; i++) this.pool.push(this.items.shift());
    }
  }

  muzzle(tower, target) {
    const el = ELEMENTS[tower.def.element];
    const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    const x = tower.x + Math.cos(angle) * 22;
    const y = tower.y + Math.sin(angle) * 22;
    const projectile = tower.def.projectile;
    const type = projectile === 'meteor' || projectile === 'rock' ? 'spark' : tower.def.element === 'nature' ? 'leaf' : tower.def.element === 'ice' ? 'shard' : 'spark';
    const count = projectile === 'meteor' ? 10 : projectile === 'rock' ? 7 : tower.level + 3;
    this.spawn(x, y, { color: el.light, count, power: projectile === 'meteor' ? 72 : 42, type, r: 2.3, life: 0.22, glow: 10, upBias: 3, height: 0.78 });
    if (projectile === 'meteor' || projectile === 'rock') this.spawn(x, y, { color: '#d4c1a4', count: 3, power: 28, type: 'smoke', r: 5, life: 0.45, drag: 0.97, upBias: 12, height: 0.72 });
  }

  impact(element, x, y, kind = 'orb', heavy = false) {
    const el = ELEMENTS[element];
    if (element === 'fire') {
      this.spawn(x, y, { color: '#ffb04a', count: heavy ? 22 : 10, power: heavy ? 125 : 72, type: 'spark', r: 2.5, life: 0.42, glow: 10 });
      this.spawn(x, y, { color: '#6d5b52', count: heavy ? 11 : 4, power: heavy ? 48 : 30, type: 'smoke', r: heavy ? 7 : 5, life: heavy ? 1.05 : 0.7, gravity: -10, drag: 0.975, upBias: 18 });
      if (heavy || kind === 'meteor') this.explosion(x, y, '#ff7a35', heavy ? 1.15 : 0.8);
    } else if (element === 'ice') {
      this.spawn(x, y, { color: el.light, count: heavy ? 20 : 10, power: heavy ? 108 : 64, type: 'shard', r: 3, life: 0.56, gravity: 18, glow: 7 });
      this.burstEvent('ice', x, y, el.light, heavy ? 0.8 : 0.52, 0.42);
    } else if (element === 'lightning') {
      this.spawn(x, y, { color: el.light, count: heavy ? 18 : 8, power: 110, type: 'spark', r: 2.2, life: 0.2, glow: 14 });
      this.burstEvent('flash', x, y, el.light, 0.55, 0.15);
    } else if (element === 'nature') {
      this.spawn(x, y, { color: el.color, count: heavy ? 16 : 9, power: 68, type: 'leaf', r: 3.2, life: 0.55, gravity: 9 });
      this.spawn(x, y, { color: '#bfe39e', count: 4, power: 42, type: 'orb', r: 2.3, life: 0.4, glow: 5 });
    } else if (element === 'earth') {
      this.spawn(x, y, { color: '#c7a478', count: heavy ? 22 : 11, power: heavy ? 105 : 82, type: 'debris', r: 3.5, life: 0.58, gravity: 28 });
      this.spawn(x, y, { color: '#91816d', count: heavy ? 10 : 4, power: 44, type: 'dust', r: 5.5, life: 0.72, drag: 0.97, upBias: 16 });
      if (heavy) this.burstEvent('shock', x, y, '#d9bd91', 0.95, 0.38);
    } else {
      this.spawn(x, y, { color: el.light, count: heavy ? 18 : 9, power: 82, type: 'orb', r: 2.7, life: 0.46, glow: 12 });
      this.burstEvent('flash', x, y, el.light, heavy ? 0.78 : 0.5, 0.18);
    }
    this.ring(x, y, el.color, 4, heavy ? 64 : 34, heavy ? 3.2 : 1.8, 0.3, element === 'earth' ? 0.48 : 1);
  }

  explosion(x, y, color = '#ff7a35', power = 1) {
    this.burstEvent('explosion', x, y, color, power, 0.58);
    this.ring(x, y, '#ffd18a', 7, 88 * power, 4.5, 0.34, 0.55);
    this.ring(x, y, color, 3, 55 * power, 2.4, 0.24, 0.7);
  }

  burstEvent(kind, x, y, color, power = 1, life = 0.4) {
    const burst = this.burstPool.pop() || {};
    Object.assign(burst, { kind, x, y, color, power, life, max: life, seed: Math.random() * 1000 });
    this.bursts.push(burst);
    if (this.bursts.length > this.maxBursts) this.burstPool.push(this.bursts.shift());
  }

  build(x, y, element) {
    const el = ELEMENTS[element];
    this.ring(x, y, el.color, 8, 48, 2.5, 0.5, 0.5);
    this.spawn(x, y, { color: el.light, count: 16, power: 62, type: 'spark', r: 2.4, life: 0.6, glow: 8, upBias: 32 });
    this.burstEvent('build', x, y, el.light, 0.75, 0.5);
  }

  upgrade(x, y, element) {
    const el = ELEMENTS[element];
    this.ring(x, y, el.light, 10, 72, 4, 0.7, 0.5);
    this.spawn(x, y, { color: el.light, count: 28, power: 82, type: 'spark', r: 2.8, life: 0.72, glow: 10, upBias: 45 });
    this.burstEvent('build', x, y, el.light, 1.05, 0.65);
  }

  sell(x, y) {
    this.spawn(x, y, { color: '#d6c49b', count: 20, power: 75, type: 'dust', r: 2.7, life: 0.55, gravity: -3, upBias: 18 });
    this.ring(x, y, '#d6c49b', 10, 42, 2, 0.36, 0.5);
  }

  spawnEnemy(x, y, color, boss = false) {
    this.spawn(x, y, { color, count: boss ? 22 : 8, power: boss ? 78 : 42, type: 'smoke', r: boss ? 6 : 4, life: 0.72, drag: 0.97, upBias: 18 });
    this.spawn(x, y, { color: '#b7ffd9', count: boss ? 18 : 7, power: 54, type: 'spark', r: 2.1, life: 0.36, glow: 9 });
    this.ring(x, y, '#7cf2b8', 8, boss ? 72 : 42, boss ? 4 : 2.4, 0.42, 0.62);
    this.burstEvent('spawn', x, y, color, boss ? 1.25 : 0.68, boss ? 0.72 : 0.42);
  }

  death(enemy) {
    const color = enemy.def.color;
    this.spawn(enemy.x, enemy.y, {
      color,
      count: enemy.def.boss ? 38 : 13,
      power: enemy.def.boss ? 155 : 76,
      type: enemy.def.id === 'glacial' ? 'shard' : enemy.def.id === 'tank' ? 'debris' : 'dust',
      r: enemy.def.boss ? 4 : 2.8,
      life: enemy.def.boss ? 0.85 : 0.52,
      gravity: 18,
      glow: enemy.def.boss ? 8 : 2,
    });
    this.ring(enemy.x, enemy.y, color, 4, enemy.def.boss ? 92 : 38, enemy.def.boss ? 4 : 2, 0.45, 0.55);
    if (enemy.def.boss) this.burstEvent('explosion', enemy.x, enemy.y, color, 1.45, 0.78);
  }

  waveClear(x, y) {
    this.ring(x, y, '#9ff5c4', 10, 110, 3.5, 0.75, 0.55);
    this.spawn(x, y, { color: '#d9ffe7', count: 22, power: 88, type: 'spark', r: 2.5, life: 0.65, glow: 8, upBias: 35 });
    this.burstEvent('wave-clear', x, y, '#b6ffd0', 1, 0.72);
  }

  nexus(x, y) {
    this.ring(x, y, '#d08cff', 12, 92, 5, 0.65, 0.65);
    this.spawn(x, y, { color: '#e7c4ff', count: 24, power: 110, type: 'spark', r: 3, life: 0.6, glow: 10 });
    this.burstEvent('flash', x, y, '#e7c4ff', 1.05, 0.28);
  }

  ring(x, y, color, from = 5, to = 40, width = 2, life = 0.35, aspect = 1) {
    this.rings.push({ x, y, color, from, to, width, life, max: life, aspect });
  }

  beam(points, color) {
    if (points.length < 2) return;
    const zigzag = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const parts = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 34));
      for (let j = 1; j < parts; j++) {
        const t = j / parts;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const off = (Math.random() - 0.5) * 9;
        zigzag.push({ x: a.x + dx * t - dy / len * off, y: a.y + dy * t + dx / len * off });
      }
      zigzag.push(b);
    }
    this.beams.push({ points: zigzag, life: 0.13, max: 0.13, color, width: 3 });
  }

  damageText(x, y, text, color = '#fff', critical = false, size = 12) {
    if (this.texts.length > 44) return;
    this.texts.push({ x, y, text: String(text), color, critical, size: critical ? Math.max(15, size + 3) : size, life: 0.56, max: 0.56 });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.push(p);
        this.items.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.rot += p.spin * dt;
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].life -= dt;
      if (this.beams[i].life <= 0) this.beams.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].life -= dt;
      if (this.rings[i].life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      this.texts[i].life -= dt;
      if (this.texts[i].life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.life -= dt;
      if (burst.life <= 0) {
        this.burstPool.push(burst);
        this.bursts.splice(i, 1);
      }
    }
  }

  clear() {
    while (this.items.length) this.pool.push(this.items.pop());
    while (this.bursts.length) this.burstPool.push(this.bursts.pop());
    this.beams.length = 0;
    this.rings.length = 0;
    this.texts.length = 0;
  }
}
