import assert from 'node:assert/strict';
import { DIFFICULTIES } from '../src/config/difficulty.js';
import { getEndlessWave, getWaveForNumber, WAVE_COUNT } from '../src/config/waves.js';
import { ULTIMATES, TOWERS, SPECIALIZATIONS, levelStats } from '../src/config/towers.js';
import { Tower } from '../src/entities/Tower.js';
import { Enemy } from '../src/entities/Enemy.js';
import { ENEMIES } from '../src/config/enemies.js';
import { BUILD_PADS } from '../src/config/map.js';
import { CombatSystem } from '../src/systems/CombatSystem.js';
import { ParticleSystem } from '../src/systems/ParticleSystem.js';
import { GameState } from '../src/core/GameState.js';
assert.equal(Object.keys(DIFFICULTIES).length,3);assert.ok(DIFFICULTIES.nightmare.hp>DIFFICULTIES.veteran.hp);assert.ok(DIFFICULTIES.veteran.hp>DIFFICULTIES.normal.hp);
assert.equal(getWaveForNumber(30,false).number,30);const endless=getEndlessWave(31);assert.equal(endless.number,31);assert.ok(endless.groups.length>=2);assert.ok(getEndlessWave(40).groups.some(g=>g.type==='colossus'||g.type==='boss'));
assert.equal(Object.keys(ULTIMATES).length,6);
assert.equal(Object.keys(SPECIALIZATIONS).length,6);for(const [element,choices] of Object.entries(SPECIALIZATIONS)){assert.equal(choices.length,2,`${element} needs two specialization paths`);const def=TOWERS.find(t=>t.element===element);const base=levelStats(def,3);for(const spec of choices){const changed=levelStats(def,3,spec.id);assert.ok(changed.damage!==base.damage||changed.rate!==base.rate||changed.range!==base.range||changed.splash!==base.splash,`${spec.id} must visibly change gameplay stats`);}}
const specialized=new Tower(TOWERS[0],BUILD_PADS[1]);specialized.upgrade();specialized.upgrade();assert.ok(specialized.specialize(SPECIALIZATIONS.fire[0].id));assert.equal(specialized.specialization,SPECIALIZATIONS.fire[0].id);assert.equal(specialized.specialize(SPECIALIZATIONS.fire[1].id),false,'specialization choice must lock once selected');

const state=new GameState('normal'),particles=new ParticleSystem(),tower=new Tower(TOWERS.find(t=>t.element==='earth'),BUILD_PADS[0]);tower.upgrade();tower.upgrade();tower.ultimateTimer=0;const enemy=new Enemy(ENEMIES.grunt,1);enemy.x=tower.x+20;enemy.y=tower.y;const game={state,particles,towers:[tower],enemies:[enemy],projectiles:[],audio:{playShot(){},playImpact(){},playUi(){}},renderer:{kickCamera(){},focusOn(){}},ui:{toast(){},banner(){}},triggerHitStop(){},waveManager:{onBossPhase(){}}};const combat=new CombatSystem(game);combat.update(1/60);assert.ok(tower.ultimateTimer>0,'level III tower should consume automatic ultimate cooldown');assert.equal(state.ultimates,1);assert.ok(enemy.hp<enemy.maxHp||enemy.effects.has('stun'));
console.log('Campaign, difficulty, endless, specialization and ultimate systems passed');

