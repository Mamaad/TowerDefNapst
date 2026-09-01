import assert from 'node:assert/strict';
import { TOWERS, levelStats } from '../src/config/towers.js';
import { ELEMENTS, elementalMultiplier } from '../src/config/elements.js';
import { ENEMIES } from '../src/config/enemies.js';
import { getWave } from '../src/config/waves.js';
import { PATH, BUILD_PADS } from '../src/config/map.js';
import { Enemy } from '../src/entities/Enemy.js';

assert.equal(TOWERS.length, 12, '12 tower archetypes must remain available');
assert.equal(Object.keys(ELEMENTS).length, 6, 'six elemental schools are required');
for (const element of Object.keys(ELEMENTS)) {
  assert.equal(TOWERS.filter((tower) => tower.element === element).length, 2, `${element} needs two towers`);
}
assert.ok(BUILD_PADS.length >= 16, 'the map needs a meaningful number of build pads');
assert.ok(PATH.length >= 10, 'the path must keep multiple tactical turns');
for (const tower of TOWERS) {
  const l1 = levelStats(tower, 1);
  const l3 = levelStats(tower, 3);
  assert.ok(l3.damage > l1.damage);
  assert.ok(l3.rate > l1.rate);
  assert.ok(l3.range > l1.range);
  assert.ok(tower.description);
}

const ember = { resistanceProfile: 'ember' };
assert.ok(elementalMultiplier('fire', ember) < 0.5, 'ember enemies resist fire');
assert.ok(elementalMultiplier('ice', ember) > 1.4, 'ember enemies are weak to ice');
assert.ok(elementalMultiplier('fire', ember, 0.75) > elementalMultiplier('fire', ember), 'penetration must reduce resistance impact');

assert.ok(getWave(30).groups.some((group) => group.type === 'boss'), 'final wave must include the boss');
assert.ok(ENEMIES.boss.boss);

const walker = new Enemy(ENEMIES.grunt, 1);
let previousDistance = walker.distance;
for (let i = 0; i < 200 && !walker.escaped; i++) {
  walker.update(0.025);
  assert.ok(walker.distance >= previousDistance, 'enemy path progress cannot go backwards');
  assert.ok(walker.distance - previousDistance <= walker.speed * 0.025 + 0.001, 'enemy movement cannot teleport');
  previousDistance = walker.distance;
}
assert.ok(walker.distance > 0);

const poisoned = new Enemy(ENEMIES.shield, 1);
const shieldBefore = poisoned.shield;
const hpBefore = poisoned.hp;
poisoned.addEffect('poison', { remaining: 1, dps: 30, stacks: 1 });
poisoned.update(0.5);
assert.equal(poisoned.shield, shieldBefore, 'poison ignores shields');
assert.ok(poisoned.hp < hpBefore, 'poison damages health');

console.log('Core smoke tests passed');
