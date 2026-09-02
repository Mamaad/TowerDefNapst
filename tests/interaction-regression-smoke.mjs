import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { Tower } from '../src/entities/Tower.js';
import { TOWERS } from '../src/config/towers.js';
import { BUILD_PADS } from '../src/config/map.js';
import { EventBus, WORLD_EVENTS } from '../src/core/EventBus.js';
import { performTowerUpgrade, performTowerSpecialization } from '../src/systems/TowerInteractionController.js';
import { MapStrategyManager } from '../src/systems/MapStrategyManager.js';
import { TowerWorldManager } from '../src/systems/TowerWorldManager.js';
import { EnemyWorldManager } from '../src/systems/EnemyWorldManager.js';

const state = new GameState('normal');
state.gold = 5000;
const tower = new Tower(TOWERS[0], BUILD_PADS[0]);
let refreshes = 0;
let upgradeEvents = 0;
const bus = new EventBus();
bus.on(WORLD_EVENTS.TOWER_UPGRADED, () => upgradeEvents++);
const game = {
  state,
  towers: [tower],
  enemies: [],
  selectedTower: tower,
  world: { progression: { refreshTower() { refreshes++; } }, bus },
  ui: { toast() {}, update() {} },
  audio: { playUpgrade() {} },
  particles: { upgrade() {}, ring() {} },
  renderer: { kickCamera() {} },
};

const gold0 = state.gold;
const cost1 = tower.upgradeCost;
assert.equal(performTowerUpgrade(game), true, 'level I -> II upgrade must succeed');
assert.equal(tower.level, 2);
assert.equal(state.gold, gold0 - cost1, 'upgrade must debit gold exactly once');
assert.equal(state.goldSpent, cost1, 'upgrade must track spend exactly once');

const cost2 = tower.upgradeCost;
assert.equal(performTowerUpgrade(game), true, 'level II -> III upgrade must succeed');
assert.equal(tower.level, 3);
assert.equal(state.gold, gold0 - cost1 - cost2);
assert.equal(upgradeEvents, 2, 'World upgrade event must fire once per successful upgrade');
assert.equal(refreshes, 2, 'World tower modifiers must refresh after upgrades');
assert.equal(performTowerUpgrade(game), false, 'level III must not upgrade again');

const specializationCost = Math.round(tower.def.cost * 0.82);
const goldBeforeBadSpec = state.gold;
const spentBeforeBadSpec = state.goldSpent;
assert.equal(performTowerSpecialization(game, 'invalid-specialization'), false, 'invalid specialization must fail');
assert.equal(state.gold, goldBeforeBadSpec, 'failed specialization must refund gold');
assert.equal(state.goldSpent, spentBeforeBadSpec, 'failed specialization must refund spend analytics');
assert.equal(performTowerSpecialization(game, 'inferno'), true, 'valid specialization must work after failed attempt');
assert.equal(state.gold, goldBeforeBadSpec - specializationCost);

const mapBus = new EventBus();
const mapGame = {
  state: { wave: 20, spend: () => true },
  towers: [tower], enemies: [], waveManager: { active: true },
  particles: { ring() {} }, audio: { playWorldCue() {}, playUi() {} }, ui: { banner() {} },
};
const map = new MapStrategyManager(mapGame, mapBus);
tower.sabotageTimer = 0;
assert.equal(map.disablePad(tower.pad.id, 8), true);
assert.equal(map.disabledPads.get(tower.pad.id), 8);
assert.equal(tower.sabotageTimer, 8, 'disabled occupied pad must neutralize its tower');

const worldGame = {
  towers: [tower], enemies: [],
  world: { map, progression: { refreshTower() {} }, surfaces: { create() {} } },
  particles: {}, renderer: {}, audio: {}, triggerHitStop() {},
};
const towerWorld = new TowerWorldManager(worldGame, { next: () => 0.5 });
tower.sabotageTimer = 4;
map.disabledPads.clear();
towerWorld.update(1);
assert.equal(tower.sabotageTimer, 4, 'World manager must not double-decrement sabotage timer');

let deathEvents = 0;
const deathBus = new EventBus();
deathBus.on(WORLD_EVENTS.ENEMY_KILLED, () => deathEvents++);
const enemyWorld = new EnemyWorldManager({ enemies: [], towers: [], particles: {}, audio: {}, ui: {} }, deathBus, { next: () => 0.5 });
enemyWorld.onDeath({ splitDone: false, modifiers: new Set(), def: { boss: false } });
assert.equal(deathEvents, 0, 'EnemyWorldManager must not double-emit ENEMY_KILLED; combat wrapper owns the event');

console.log('Interaction regression smoke passed · upgrades, specialization refunds, pad neutralization, sabotage timing');
