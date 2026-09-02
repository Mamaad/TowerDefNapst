import assert from 'node:assert/strict';
import { TOWERS, levelStats } from '../src/config/towers.js';
import { ELEMENTS, elementalMultiplier } from '../src/config/elements.js';
import { ENEMIES } from '../src/config/enemies.js';
import { getWave } from '../src/config/waves.js';
import { PATH, BUILD_PADS, PAD_BASELINE_RANGE, distanceToPath, pathCoverageAt } from '../src/config/map.js';
import { Enemy } from '../src/entities/Enemy.js';

assert.equal(TOWERS.length, 12);
assert.equal(Object.keys(ELEMENTS).length, 6);
for (const element of Object.keys(ELEMENTS)) assert.equal(TOWERS.filter((tower)=>tower.element===element).length,2);
assert.equal(BUILD_PADS.length,18);
assert.ok(PATH.length>=10);
for(const pad of BUILD_PADS){const coverage=pathCoverageAt(pad.x,pad.y,PAD_BASELINE_RANGE);assert.ok(pad.role);assert.ok(coverage.nearest>=50&&coverage.nearest<=125);assert.ok(coverage.length>=145);assert.equal(Math.round(distanceToPath(pad.x,pad.y)),Math.round(coverage.nearest));}
for(let i=1;i<PATH.length;i++){const a=PATH[i-1],b=PATH[i],length=Math.hypot(b.x-a.x,b.y-a.y),count=Math.max(1,Math.ceil(length/5));for(let j=0;j<=count;j++){const t=j/count,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,nearest=Math.min(...BUILD_PADS.map((pad)=>Math.hypot(pad.x-x,pad.y-y)));assert.ok(nearest<=PAD_BASELINE_RANGE);}}
for(const tower of TOWERS){const l1=levelStats(tower,1),l3=levelStats(tower,3);assert.ok(l3.damage>l1.damage);assert.ok(l3.rate>l1.rate);assert.ok(l3.range>l1.range);assert.ok(tower.description);}
const ember={resistanceProfile:'ember'};assert.ok(elementalMultiplier('fire',ember)<.5);assert.ok(elementalMultiplier('ice',ember)>1.4);assert.ok(elementalMultiplier('fire',ember,.75)>elementalMultiplier('fire',ember));
assert.ok(getWave(30).groups.some((group)=>group.type==='boss'));assert.ok(ENEMIES.boss.boss);
const walker=new Enemy(ENEMIES.grunt,1);let previousDistance=walker.distance;for(let i=0;i<200&&!walker.escaped;i++){walker.update(.025);assert.ok(walker.distance>=previousDistance);assert.ok(walker.distance-previousDistance<=walker.speed*.025+.001);previousDistance=walker.distance;}assert.ok(walker.distance>0);assert.ok(walker.spawnAge>0);
const poisoned=new Enemy(ENEMIES.shield,1);const shieldBefore=poisoned.shield,hpBefore=poisoned.hp;poisoned.addEffect('poison',{remaining:1,dps:30,stacks:1});poisoned.update(.5);assert.equal(poisoned.shield,shieldBefore);assert.ok(poisoned.hp<hpBefore);
const crowd=Array.from({length:120},(_,index)=>new Enemy(index%8===0?ENEMIES.tank:ENEMIES.grunt,2));for(let frame=0;frame<120;frame++)for(const enemy of crowd)enemy.update(1/60);assert.ok(crowd.every((enemy)=>Number.isFinite(enemy.x)&&Number.isFinite(enemy.y)));
console.log('Core smoke tests passed');
