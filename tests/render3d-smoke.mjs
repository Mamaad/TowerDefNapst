import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const renderer = read('../src/render/Renderer.js');
const environment = read('../src/render/EnvironmentRenderer.js');
const towers = read('../src/render/TowerRenderer.js');
const enemies = read('../src/render/EnemyRenderer.js');
const vfx = read('../src/render/VfxRenderer.js');
const index = read('../index.html');

assert.match(renderer, /new THREE\.WebGLRenderer/);
assert.match(renderer, /new THREE\.OrthographicCamera/);
assert.match(renderer, /new THREE\.Raycaster/);
assert.match(renderer, /cameraYaw/);
assert.match(renderer, /cameraPitch/);
assert.match(renderer, /pointerdown/);
assert.match(renderer, /event\.button === 2/);
assert.match(renderer, /panCamera/);
assert.match(renderer, /resetCamera/);
assert.match(renderer, /new THREE\.AmbientLight/);
assert.match(renderer, /toneMappingExposure = 1\.34/);
assert.match(environment, /new THREE\.PlaneGeometry/);
assert.match(environment, /new THREE\.InstancedMesh/);
assert.match(environment, /laneMat/);
assert.match(towers, /selectedPad/);
assert.match(towers, /PAD_BASELINE_RANGE/);
assert.match(enemies, /this\.pools/);
assert.match(enemies, /status-burn/);
assert.match(enemies, /status-poison/);
assert.match(enemies, /status-stun/);
assert.match(enemies, /startCorpse/);
assert.match(vfx, /burstPools/);
assert.match(vfx, /syncBursts/);
assert.match(vfx, /THREE\.AdditiveBlending/);
assert.match(index, /three@0\.185\.1\/build\/three\.module\.js/);
assert.match(index, /cameraBtn/);

const towerMethods = [
  'ember_spire', 'magma_forge', 'frost_obelisk', 'cryo_prism',
  'spark_coil', 'tempest_pylon', 'thorn_nest', 'bloom_sanctum',
  'stone_bastion', 'seismic_hammer', 'arcane_eye', 'rift_weaver',
];
for (const method of towerMethods) assert.match(towers, new RegExp(`\\b${method}\\(`), `missing 3D tower builder ${method}`);

const enemyMethods = ['grunt', 'swift', 'tank', 'mage', 'ember', 'glacial', 'regen', 'shield', 'elite', 'boss'];
for (const method of enemyMethods) assert.match(enemies, new RegExp(`\\b${method}\\(`), `missing enemy silhouette builder ${method}`);

for (const source of [renderer, environment, towers, enemies]) {
  assert.doesNotMatch(source, /getContext\(['"]2d['"]\)/, 'primary 3D render modules must not fall back to Canvas2D');
}
console.log('Three.js renderer structure tests passed');
