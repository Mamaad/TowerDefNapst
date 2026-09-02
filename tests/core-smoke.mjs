import assert from 'node:assert/strict';
import { TOWERS, levelStats } from '../src/config/towers.js';
import { ELEMENTS, elementalMultiplier } from '../src/config/elements.js';
import { ENEMIES } from '../src/config/enemies.js';
import { getWave } from '../src/config/waves.js';
import { PATH, BUILD_PADS, PAD_BASELINE_RANGE, distanceToPath, pathCoverageAt } from '../src/config/map.js';
import { Enemy } from '../src/entities/Enemy.js';

assert.equal(TOWERS.length, 12, '12 tower archetypes must remain available');
assert.equal(Object.keys(ELEMENTS).length, 6, 'six elemental schools are required');
for (const element of Object.keys(ELEMENTS)) {
  assert.equal(TOWERS.filter((tower) => tower.element === element).length, 2, `${element} needs two towers`);
}

assert.equal(BUILD_PADS.length, 18, 'the tactical pass intentionally uses 18 build pads');
assert.ok(PATH.length >= 10, 'the path must keep multiple tactical turns');
for (const pad of BUILD_PADS) {
  const coverage = pathCoverageAt(pad.x, pad.y, PAD_BASELINE_RANGE);
  assert.ok(pad.role, `pad ${pad.id} needs a strategic role label`);
  assert.ok(coverage.nearest >= 50 && coverage.nearest <= 125, `pad ${pad.id} must sit near but not on the lane`);
  assert.ok(coverage.length >= 145, `pad ${pad.id} must cover meaningful travel distance at short range`);
  assert.equal(Math.round(distanceToPath(pad.x, pad.y)), Math.round(coverage.nearest));
}

// Every point on the route must be reachable by at least one baseline short-range tower.
for (let i = 1; i < PATH.length; i++) {
  const a = PATH[i - 1];
  const b = PATH[i];
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const count = Math.max(1, Math.ceil(length / 5));
  for (let j = 0; j <= count; j++) {
    const t = j / count;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const nearest = Math.min(...BUILD_PADS.map((pad) => Math.hypot(pad.x - x, pad.y - y)));
    assert.ok(nearest <= PAD_BASELINE_RANGE, `route sample ${i}:${j} must be defendable at range ${PAD_BASELINE_RANGE}`);
  }
}

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
assert.ok(walker.spawnAge > 0, 'spawn animation timing must advance with gameplay');

const poisoned = new Enemy(ENEMIES.shield, 1);
const shieldBefore = poisoned.shield;
const hpBefore = poisoned.hp;
poisoned.addEffect('poison', { remaining: 1, dps: 30, stacks: 1 });
poisoned.update(0.5);
assert.equal(poisoned.shield, shieldBefore, 'poison ignores shields');
assert.ok(poisoned.hp < hpBefore, 'poison damages health');

// A dense wave update remains deterministic enough for the simulation layer.
const crowd = Array.from({ length: 120 }, (_, index) => new Enemy(index % 8 === 0 ? ENEMIES.tank : ENEMIES.grunt, 2));
for (let frame = 0; frame < 120; frame++) for (const enemy of crowd) enemy.update(1 / 60);
assert.ok(crowd.every((enemy) => Number.isFinite(enemy.x) && Number.isFinite(enemy.y)));

console.log('Core smoke tests passed');
