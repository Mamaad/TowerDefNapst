import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderer = readFileSync(new URL('../src/render/Renderer.js', import.meta.url), 'utf8');
const environment = readFileSync(new URL('../src/render/EnvironmentRenderer.js', import.meta.url), 'utf8');
const towers = readFileSync(new URL('../src/render/TowerRenderer.js', import.meta.url), 'utf8');
const enemies = readFileSync(new URL('../src/render/EnemyRenderer.js', import.meta.url), 'utf8');
const vfx = readFileSync(new URL('../src/render/VfxRenderer.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(renderer, /new THREE\.WebGLRenderer/);
assert.match(renderer, /new THREE\.OrthographicCamera/);
assert.match(renderer, /new THREE\.Raycaster/);
assert.match(environment, /new THREE\.PlaneGeometry/);
assert.match(environment, /new THREE\.InstancedMesh/);
assert.match(enemies, /new THREE\.Group/);
assert.match(vfx, /new THREE\.Points/);
assert.match(vfx, /THREE\.AdditiveBlending/);
assert.match(index, /three@0\.185\.1\/build\/three\.module\.js/);

const towerMethods = [
  'ember_spire', 'magma_forge', 'frost_obelisk', 'cryo_prism',
  'spark_coil', 'tempest_pylon', 'thorn_nest', 'bloom_sanctum',
  'stone_bastion', 'seismic_hammer', 'arcane_eye', 'rift_weaver',
];
for (const method of towerMethods) assert.match(towers, new RegExp(`\\b${method}\\(`), `missing 3D tower builder ${method}`);
for (const source of [renderer, environment, towers, enemies]) {
  assert.doesNotMatch(source, /getContext\(['"]2d['"]\)/, 'primary 3D render modules must not fall back to Canvas2D');
}
console.log('Three.js renderer structure tests passed');
