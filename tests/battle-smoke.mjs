import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { Tower } from '../src/entities/Tower.js';
import { Enemy } from '../src/entities/Enemy.js';
import { CombatSystem } from '../src/systems/CombatSystem.js';
import { ParticleSystem } from '../src/systems/ParticleSystem.js';
import { TOWERS } from '../src/config/towers.js';
import { ENEMIES } from '../src/config/enemies.js';
import { BUILD_PADS } from '../src/config/map.js';

let seed = 0x5eed1234;
const previousRandom = Math.random;
Math.random = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
};

try {
  const state = new GameState();
  state.gold = 0;
  const particles = new ParticleSystem();
  const game = {
    state,
    particles,
    towers: [],
    enemies: [],
    projectiles: [],
    audio: {
      shots: 0,
      impacts: 0,
      playShot() { this.shots += 1; },
      playImpact() { this.impacts += 1; },
    },
    renderer: {
      kicks: 0,
      kickCamera() { this.kicks += 1; },
    },
    ui: { banner() {} },
  };

  game.towers = TOWERS.map((def, index) => {
    const tower = new Tower(def, BUILD_PADS[index]);
    if (index % 3 === 1) tower.upgrade();
    if (index % 4 === 2) {
      tower.upgrade();
      tower.upgrade();
    }
    return tower;
  });

  const combat = new CombatSystem(game);
  const enemyDefs = [
    ENEMIES.grunt,
    ENEMIES.swift,
    ENEMIES.tank,
    ENEMIES.mage,
    ENEMIES.ember,
    ENEMIES.glacial,
    ENEMIES.regen,
    ENEMIES.shield,
    ENEMIES.elite,
  ];

  const dt = 1 / 60;
  let spawned = 0;
  let maxProjectiles = 0;
  let maxParticles = 0;
  let maxBursts = 0;
  let totalHpSpawned = 0;
  let escaped = 0;

  for (let frame = 0; frame < 60 * 48; frame += 1) {
    if (frame % 20 === 0 && spawned < 120) {
      const def = enemyDefs[spawned % enemyDefs.length];
      const enemy = new Enemy(def, 0.95 + (spawned % 5) * 0.11);
      game.enemies.push(enemy);
      totalHpSpawned += enemy.maxHp + enemy.maxShield;
      spawned += 1;
    }

    for (const enemy of game.enemies) {
      const wasEscaped = enemy.escaped;
      enemy.update(dt);
      if (!wasEscaped && enemy.escaped) escaped += 1;
      assert.ok(Number.isFinite(enemy.x) && Number.isFinite(enemy.y), 'enemy position must stay finite');
      assert.ok(Number.isFinite(enemy.hp) && Number.isFinite(enemy.shield), 'enemy health must stay finite');
    }

    combat.update(dt);
    for (const projectile of game.projectiles) projectile.update(dt, (hit) => combat.impact(hit));
    game.projectiles = game.projectiles.filter((projectile) => !projectile.dead);
    particles.update(dt);

    maxProjectiles = Math.max(maxProjectiles, game.projectiles.length);
    maxParticles = Math.max(maxParticles, particles.items.length);
    maxBursts = Math.max(maxBursts, particles.bursts.length);

    assert.ok(game.projectiles.length < 240, 'projectile count must stay bounded in a dense battle');
    assert.ok(particles.items.length <= particles.maxParticles, 'particle pool cap must hold');
    assert.ok(particles.bursts.length <= particles.maxBursts, 'burst pool cap must hold');
  }

  const survivingHp = game.enemies.reduce((sum, enemy) => sum + Math.max(0, enemy.hp) + Math.max(0, enemy.shield), 0);
  const damageResolved = totalHpSpawned - survivingHp;

  assert.equal(spawned, 120, 'dense battle should spawn the full stress wave');
  assert.ok(game.audio.shots > 150, 'towers should actively fire during the stress wave');
  assert.ok(game.audio.impacts > 100, 'projectiles and chains should resolve visible impacts');
  assert.ok(damageResolved > totalHpSpawned * 0.35, 'strategic pads should allow substantial lane coverage');
  assert.ok(state.kills > 20, 'the defense should secure meaningful kills');
  assert.ok(escaped < spawned, 'the defense should not be strategically disconnected from the route');
  assert.ok(maxProjectiles < 120, `projectile peak should stay practical, got ${maxProjectiles}`);
  assert.ok(maxParticles <= particles.maxParticles, `particle peak exceeded cap: ${maxParticles}`);
  assert.ok(maxBursts <= particles.maxBursts, `burst peak exceeded cap: ${maxBursts}`);

  console.log(`Battle stress test passed · ${state.kills} kills · ${escaped} escaped · projectile peak ${maxProjectiles} · particle peak ${maxParticles} · burst peak ${maxBursts}`);
} finally {
  Math.random = previousRandom;
}
