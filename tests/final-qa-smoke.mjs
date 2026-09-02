import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { WaveManager } from '../src/systems/WaveManager.js';
import { CombatSystem } from '../src/systems/CombatSystem.js';
import { ParticleSystem } from '../src/systems/ParticleSystem.js';
import { Enemy } from '../src/entities/Enemy.js';
import { Tower } from '../src/entities/Tower.js';
import { ENEMIES } from '../src/config/enemies.js';
import { TOWERS, SPECIALIZATIONS } from '../src/config/towers.js';
import { BUILD_PADS, PATH } from '../src/config/map.js';
import { getWave, getEndlessWave, WAVE_COUNT } from '../src/config/waves.js';

for (let wave = 1; wave <= WAVE_COUNT; wave += 1) {
  const def = getWave(wave);
  assert.equal(def.number, wave);
  assert.ok(def.groups.length > 0);
  assert.ok(def.groups.every((g) => g.count > 0 && g.interval > 0));
}
assert.ok(getWave(14).groups.some((g) => g.type === 'swift'), 'mid-game rush must exist');
assert.ok(getWave(20).groups.some((g) => g.type === 'colossus'), 'wave 20 must contain the break boss');
assert.ok(getWave(30).groups.some((g) => g.type === 'boss'), 'wave 30 must contain Archon');
assert.ok(getEndlessWave(40).groups.some((g) => g.type === 'colossus' || g.type === 'boss'), 'endless milestones need bosses');

const state = new GameState('veteran');
state.wave = 8;
const particles = new ParticleSystem();
const phaseEvents = [];
const stubGame = {
  state,
  particles,
  towers: [], enemies: [], projectiles: [], spawnPulse: 0, spawnCharge: 0, waveClearPulse: 0,
  audio: { ensure() {}, setMusicState() {}, playUi() {}, playSpawn() {}, playWaveComplete() {}, playShot() {}, playImpact() {} },
  renderer: { focusOn() {}, kickCamera() {} },
  ui: { toast() {}, banner() {} },
  triggerHitStop() {},
};
const manager = new WaveManager(stubGame);
stubGame.waveManager = manager;
manager.readyTimer = manager.prepDuration * 0.7;
const early = manager.earlyBonus;
assert.ok(early > 0, 'calling a wave early must have a real reward');
const goldBefore = state.gold;
assert.equal(manager.start(true), true);
assert.ok(state.gold > goldBefore, 'early bonus must be paid immediately');
assert.equal(state.wave, 9);

const boss = new Enemy(ENEMIES.boss, 1);
const tower = new Tower(TOWERS.find((t) => t.element === 'earth'), BUILD_PADS[0]);
tower.upgrade(); tower.upgrade(); tower.specialize(SPECIALIZATIONS.earth[0].id);
stubGame.enemies = [boss]; stubGame.towers = [tower];
stubGame.waveManager = { onBossPhase(enemy, phase) { phaseEvents.push(phase); } };
const combat = new CombatSystem(stubGame);
combat.damage(tower, boss, boss.maxHp * 0.37);
combat.damage(tower, boss, boss.maxHp * 0.28);
combat.damage(tower, boss, boss.maxHp * 0.24);
assert.ok(phaseEvents.includes(2), 'boss must enter phase II');
assert.ok(phaseEvents.includes(3), 'boss must enter phase III');
assert.ok(boss.plates < boss.maxPlates, 'heavy tower pressure must break boss armor over time');

const resetState = new GameState('nightmare');
resetState.wave = 24; resetState.kills = 99; resetState.gold = 1; resetState.reset();
assert.equal(resetState.wave, 0); assert.equal(resetState.kills, 0); assert.equal(resetState.lives, resetState.maxLives);
assert.ok(resetState.gold > 1, 'restart must restore difficulty economy');

for (const pad of BUILD_PADS) {
  const min = Math.min(...PATH.map((p) => Math.hypot(p.x - pad.x, p.y - pad.y)));
  assert.ok(Number.isFinite(min));
}
console.log('Final QA smoke passed · campaign, boss phases, early call, restart, endless');
