import assert from 'node:assert/strict';
import { ENEMIES, ELITE_MODIFIERS } from '../src/config/enemies.js';
import { ELEMENTAL_COMBOS } from '../src/config/elements.js';
import { getWave, summarizeWave } from '../src/config/waves.js';
import { Enemy } from '../src/entities/Enemy.js';

assert.equal(Object.keys(ELITE_MODIFIERS).length, 6, 'elite modifier vocabulary should stay curated');
assert.deepEqual(Object.keys(ELEMENTAL_COMBOS).sort(), ['overload','resonance','shatter','toxicIgnition'].sort());

const wave20 = getWave(20);
assert.equal(wave20.title, 'LE COLOSSE');
assert.ok(wave20.groups.some((group) => group.type === 'colossus'));
assert.ok(getWave(30).groups.some((group) => group.type === 'boss'));
const wave27 = summarizeWave(getWave(27));
assert.ok(wave27.some((entry) => entry.modifiers.includes('corrupted')), 'late waves should expose readable elite modifiers');

const warded = new Enemy(ENEMIES.mage, 1);
assert.equal(warded.wardCharges, 1);
assert.equal(warded.addEffect('slow', { remaining: 2, amount: 0.35 }), false, 'ward blocks the first control status');
assert.equal(warded.wardCharges, 0);
assert.equal(warded.addEffect('slow', { remaining: 2, amount: 0.35 }), true, 'status applies after ward is broken');

const chipped = new Enemy(ENEMIES.tank, 1);
const burst = new Enemy(ENEMIES.tank, 1);
const smallDamage = chipped.takeRawDamage(10) + chipped.takeRawDamage(10);
const largeDamage = burst.takeRawDamage(20);
assert.ok(largeDamage > smallDamage, 'flat armor should reward heavy hits over many small hits');

const colossus = new Enemy(ENEMIES.colossus, 1);
const armorBefore = colossus.armor;
while (colossus.plates === colossus.maxPlates) colossus.damagePlate(colossus.plateMaxHp);
assert.equal(colossus.plates, colossus.maxPlates - 1);
assert.ok(colossus.armor < armorBefore, 'breaking a boss plate must create a real tactical weakness');
assert.equal(ENEMIES.colossus.model, 'tank', 'colossus intentionally reuses the heavy procedural rig, not the grunt fallback');

console.log('Battlefield gameplay systems passed');
