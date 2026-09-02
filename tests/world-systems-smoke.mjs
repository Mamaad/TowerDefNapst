import assert from 'node:assert/strict';
import { EventBus, WORLD_EVENTS } from '../src/core/EventBus.js';
import { SeededRandom } from '../src/core/SeededRandom.js';
import { ElementalSurfaceManager } from '../src/systems/ElementalSurfaceManager.js';
import { MapStrategyManager } from '../src/systems/MapStrategyManager.js';
import { NexusStrategyManager } from '../src/systems/NexusStrategyManager.js';
import { RunDirector } from '../src/systems/RunDirector.js';
import { RunProgressionManager } from '../src/systems/RunProgressionManager.js';
import { Tower } from '../src/entities/Tower.js';
import { TOWERS } from '../src/config/towers.js';
import { BUILD_PADS, PATH } from '../src/config/map.js';

const a=new SeededRandom('TDN-TEST'),b=new SeededRandom('TDN-TEST');
assert.deepEqual(Array.from({length:8},()=>a.next()),Array.from({length:8},()=>b.next()),'same seed must reproduce choices');
const bus=new EventBus();let surfaceEvents=0;bus.on(WORLD_EVENTS.SURFACE_CREATED,()=>surfaceEvents++);
const game={state:{gold:500,wave:6,score:0,combos:0,lives:20,maxLives:20,gameOver:false,spend(v){if(this.gold<v)return false;this.gold-=v;return true;}},enemies:[],towers:[],particles:{damageText(){},burstEvent(){},ring(){},spawn(){},nexus(){}},audio:{playUi(){},playWorldCue(){},setMusicState(){}},ui:{toast(){},banner(){}},renderer:{kickCamera(){}},waveManager:{active:false}};
const surfaces=new ElementalSurfaceManager(game,bus);game.world={surfaces};
const enemy={x:500,y:355,def:{size:20},escaped:false,dead:false,maxHp:1000,hp:1000,shield:0,spawnAge:2,effects:new Map([['poison',{remaining:4,stacks:2}]]),takeRawDamage(v){this.hp-=v;if(this.hp<=0)this.dead=true;return v;}};
const tower={level:3,def:{element:'fire'},registerDamage(){}};
surfaces.create('burning',500,355,{duration:.15,power:1.3,persistent:true,source:tower});
surfaces.onElementHit({tower,enemy,element:'fire',dealt:80,kind:'meteor'});
assert.ok(surfaces.stats.reactions>=1,'burning + poison must react');assert.ok(surfaceEvents>=1);
for(let i=0;i<80;i++)surfaces.update(.1);
assert.ok(surfaces.scars.length>=1,'persistent battlefield action must leave scars');assert.ok(surfaces.surfaces.length<=surfaces.maxSurfaces);

const map=new MapStrategyManager(game,bus);const original=PATH.map(p=>[p.x,p.y]);assert.ok(map.announceRoute('breach'));assert.ok(map.applyPendingRoute());assert.equal(map.activeRoute,'breach');map.restoreStandard();assert.deepEqual(PATH.map(p=>[p.x,p.y]),original,'route reset must restore canonical path');assert.ok(map.lockedPads.size>0);const gold0=game.state.gold;assert.ok(map.activateShrine('flame'));assert.ok(game.state.gold<gold0);

const nexus=new NexusStrategyManager(game,bus);nexus.addPermanentShield(6);assert.equal(nexus.absorb(4),0);assert.equal(nexus.shield,2);game.enemies=[{addEffect(){}}];assert.equal(nexus.activateAbility(),true);assert.ok(nexus.abilityCooldown>0);

const director=new RunDirector(game,bus,new SeededRandom('director'));const plan=director.prepareBetweenWaves(8);assert.ok(plan.objective);assert.ok(plan.waveChoice);assert.equal(director.chooseWave(plan.waveChoice.options[0].id),true);const queue=Array.from({length:20},(_,i)=>({at:i*.4,type:i%3?'grunt':'swift',modifiers:[]}));director.applyQueue(queue);assert.ok(queue.some(x=>x.modifiers.some(m=>m==='commander'||m==='saboteur'||String(m).startsWith('formation')))||queue.length>=20);

const progression=new RunProgressionManager(game,bus,new SeededRandom('progression'));game.world.progression=progression;game.world.map=map;game.world.nexus=nexus;const t=new Tower(TOWERS[0],BUILD_PADS[0]);t.kills=100;t.damageDone=30000;game.towers=[t];progression.refreshTower(t);assert.equal(t.veterancy,'master');const choices=progression.artifactChoices();assert.equal(choices.length,3);assert.ok(progression.chooseArtifact(choices[0].id));assert.equal(progression.artifacts.length,1);
console.log('World systems smoke passed · seed, surfaces, scars, routes, shrine, Nexus, director, artifacts, veterancy');
