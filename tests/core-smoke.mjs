import assert from 'node:assert/strict';
import { TOWERS, levelStats } from '../src/config/towers.js';
import { ELEMENTS, elementalMultiplier } from '../src/config/elements.js';
import { ENEMIES } from '../src/config/enemies.js';
import { getWave } from '../src/config/waves.js';
import { PATH, BUILD_PADS } from '../src/config/map.js';
import { Enemy } from '../src/entities/Enemy.js';

assert.equal(TOWERS.length, 12, '12 archétypes de tours attendus');
for (const element of Object.keys(ELEMENTS)) {
  assert.equal(TOWERS.filter(t => t.element === element).length, 2, `2 tours attendues pour ${element}`);
}
for (const tower of TOWERS) {
  assert.ok(tower.cost > 0 && tower.damage > 0 && tower.rate > 0 && tower.range > 0);
  const l1 = levelStats(tower, 1), l3 = levelStats(tower, 3);
  assert.ok(l3.damage > l1.damage && l3.rate > l1.rate && l3.range > l1.range);
}
assert.ok(BUILD_PADS.length >= 12);
assert.ok(PATH.length >= 8);
const bossWave = getWave(30);
assert.ok(bossWave.groups.some(g => g.type === 'boss'));

const ember = new Enemy(ENEMIES.ember, 1);
const fireVsEmber = elementalMultiplier('fire', ember, 0);
const iceVsEmber = elementalMultiplier('ice', ember, 0);
assert.ok(fireVsEmber < 0.5, 'la résistance Feu doit être structurelle');
assert.ok(iceVsEmber > 1.4, 'la faiblesse Glace doit être significative');
assert.ok(elementalMultiplier('fire', ember, .75) > fireVsEmber, 'la pénétration doit réduire la résistance');

const walker = new Enemy(ENEMIES.grunt, 1);
let lastX = walker.x, lastY = walker.y, lastIndex = walker.pathIndex;
let ticks = 0;
while (!walker.escaped && ticks < 5000) {
  walker.update(.025);
  const delta = Math.hypot(walker.x - lastX, walker.y - lastY);
  assert.ok(delta <= walker.speed * .025 + 0.01, `déplacement incohérent: ${delta}`);
  assert.ok(walker.pathIndex >= lastIndex, 'le chemin ne doit jamais repartir en arrière');
  lastX = walker.x; lastY = walker.y; lastIndex = walker.pathIndex; ticks++;
}
assert.ok(walker.escaped, 'un ennemi doit atteindre la fin du chemin');

const poisoned = new Enemy(ENEMIES.tank, 1);
const initialShield = poisoned.shield = 50;
poisoned.addEffect('poison', { remaining: 2, dps: 20, stacks: 2 });
poisoned.update(.5);
assert.equal(poisoned.shield, initialShield, 'le poison doit ignorer le bouclier');
assert.ok(poisoned.hp < poisoned.maxHp, 'le poison doit infliger des dégâts persistants');

console.log('Core smoke tests passed:', {
  towers: TOWERS.length,
  enemies: Object.keys(ENEMIES).length,
  pads: BUILD_PADS.length,
  pathNodes: PATH.length,
  bossWave: bossWave.title
});
