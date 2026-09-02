import assert from 'node:assert/strict';
import { EventBus } from '../src/core/EventBus.js';
import { SeededRandom } from '../src/core/SeededRandom.js';
import { ElementalSurfaceManager } from '../src/systems/ElementalSurfaceManager.js';
import { EnemyWorldManager } from '../src/systems/EnemyWorldManager.js';
import { PerformanceBudgetManager } from '../src/systems/PerformanceBudgetManager.js';
import { TowerWorldManager } from '../src/systems/TowerWorldManager.js';
import { Enemy } from '../src/entities/Enemy.js';
import { Tower } from '../src/entities/Tower.js';
import { ENEMIES } from '../src/config/enemies.js';
import { TOWERS } from '../src/config/towers.js';
import { BUILD_PADS } from '../src/config/map.js';

const rng=new SeededRandom('stress'),bus=new EventBus();const game={fps:60,state:{wave:24,lives:30,maxLives:30,gameOver:false,score:0,kills:0,gold:9999,goldSpent:0,spend(v){this.gold-=v;this.goldSpent+=v;return true;}},enemies:[],towers:[],particles:{damageText(){},burstEvent(){},ring(){},beam(){},nexus(){}},audio:{playUi(){},playWorldCue(){}},ui:{toast(){},banner(){}},renderer:{kickCamera(){}},triggerHitStop(){},waveManager:{active:true}};
const surfaces=new ElementalSurfaceManager(game,bus),performance=new PerformanceBudgetManager(game),enemies=new EnemyWorldManager(game,bus,rng.fork('enemy')),towers=new TowerWorldManager(game,rng.fork('tower'));game.world={surfaces,performance,enemies,towers,progression:{refreshTower(){},artifacts:[]},analytics:{dominantElement(){return'fire';}},damageNexus(){}};
for(let i=0;i<150;i++){const keys=Object.keys(ENEMIES).filter(k=>!ENEMIES[k].boss),def=ENEMIES[keys[i%keys.length]],mods=[];if(i%17===0)mods.push('commander');if(i%23===0)mods.push('saboteur');if(i%19===0)mods.push('shell');if(i%29===0)mods.push('splitter');const e=new Enemy(def,1.55,{modifiers:mods});e.x=180+(i%25)*42;e.y=170+Math.floor(i/25)*65;e.distance=2600+(i%10)*470;game.enemies.push(e);enemies.onSpawn(e);}
for(let i=0;i<30;i++){const tower=new Tower(TOWERS[i%TOWERS.length],BUILD_PADS[i%BUILD_PADS.length]);tower.level=3;game.towers.push(tower);}
for(let i=0;i<60;i++){surfaces.create(['burning','frozen','wet','charged','poisoned','arcane','fractured','overgrown'][i%8],180+(i%15)*72,190+Math.floor(i/15)*130,{power:1+(i%4)*.1,persistent:i%3===0});}
let peakProjectiles=0;for(let frame=0;frame<600;frame++){const dt=1/60;performance.update(dt);surfaces.maxSurfaces=Math.min(42,performance.surfaceLimit+10);surfaces.maxScars=Math.min(48,performance.scarLimit+8);surfaces.update(dt);enemies.update(dt);towers.update(dt);for(const e of game.enemies)e.update(dt);peakProjectiles=Math.max(peakProjectiles,enemies.enemyProjectiles.length);}
assert.ok(surfaces.surfaces.length<=42);assert.ok(surfaces.scars.length<=48);assert.ok(enemies.enemyProjectiles.length<=performance.projectileLimit);assert.ok(peakProjectiles<=performance.projectileLimit);assert.equal(game.enemies.length,150);assert.equal(game.towers.length,30);surfaces.reset();enemies.reset();towers.reset();performance.reset();assert.equal(surfaces.surfaces.length,0);assert.equal(enemies.enemyProjectiles.length,0);
console.log(`World stress passed · 150 enemies · 30 towers · surfaces ${surfaces.maxSurfaces} cap · enemy projectile peak ${peakProjectiles}`);
