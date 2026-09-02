import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const audio = readFileSync(new URL('../src/systems/AudioManager.js', import.meta.url), 'utf8');
const wave = readFileSync(new URL('../src/systems/WaveManager.js', import.meta.url), 'utf8');
const combat = readFileSync(new URL('../src/systems/CombatSystem.js', import.meta.url), 'utf8');

for (const feature of ['kick(', 'snare(', 'hat(', 'pluck(', 'horn(', 'scheduleStep(', "'calm'", "'wave'", "'boss'"]) {
  assert.ok(audio.includes(feature), `organic score layer missing ${feature}`);
}
assert.match(audio, /playShot\(tower\)/);
assert.match(audio, /playImpact\(projectile, enemy\)/);
assert.match(audio, /lastSfx/);
assert.match(wave, /setMusicState\(bossWave \? 'boss' : 'wave'\)/);
assert.match(wave, /playWaveComplete/);
assert.match(combat, /audio\.playShot\(tower\)/);
assert.match(combat, /audio\.playImpact\(projectile, target\)/);
console.log('Audio direction structure tests passed');
