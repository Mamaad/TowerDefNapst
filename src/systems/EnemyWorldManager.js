import { ENEMIES } from '../config/enemies.js';
import { PATH } from '../config/map.js';
import { ENEMY_ROLES } from '../config/worldStrategy.js';
import { Enemy } from '../entities/Enemy.js';
import { WORLD_EVENTS } from '../core/EventBus.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class EnemyWorldManager {
  constructor(game,bus,rng){this.game=game;this.bus=bus;this.rng=rng;this.enemyProjectiles=[];this.clock=0;this.serial=0;}
  onSpawn(enemy,item={}){
    if(!enemy)return enemy;
    enemy.formationId=item.formationId||[...enemy.modifiers].find(m=>String(m).startsWith('formation:'))?.slice(10)||null;
    enemy.worldRole=enemy.modifiers.has('commander')?'commander':enemy.modifiers.has('saboteur')?'saboteur':enemy.modifiers.has('shell')?'shell':enemy.modifiers.has('splitter')?'splitter':null;
    enemy.roleTriggered=false;enemy.transformed=false;enemy.splitDone=false;enemy.projectileClock=1.5+this.rng.next()*2.5;enemy.weakPointClock=this.rng.next()*2;enemy.weakPointOpen=Boolean(enemy.def.boss||enemy.def.id==='tank'||enemy.def.id==='elite'||enemy.modifiers.has('fortified'));
    if(enemy.worldRole==='commander'){this.game.ui?.banner?.('COMMANDER','Éliminez son aura avant qu’elle ne renforce la ligne');this.game.audio?.playWorldCue?.('commander');}
    if(enemy.worldRole==='saboteur')this.game.audio?.playWorldCue?.('saboteur');
    return enemy;
  }
  update(dt){
    this.clock+=dt;
    for(const enemy of this.game.enemies||[]){if(enemy.dead)continue;this.updateWeakPoint(enemy,dt);this.updateRole(enemy,dt);this.updateEnemyProjectileFire(enemy,dt);}
    if(this.clock>=.18){this.clock=0;this.applyCommanderAuras();}
    this.updateProjectiles(dt);
  }
  updateWeakPoint(enemy,dt){
    if(!(enemy.def.boss||enemy.def.id==='tank'||enemy.def.id==='elite'||enemy.modifiers.has('fortified')))return;
    enemy.weakPointClock=(enemy.weakPointClock||0)-dt;
    if(enemy.weakPointClock<=0){enemy.weakPointOpen=!enemy.weakPointOpen;enemy.weakPointClock=enemy.weakPointOpen?(1.7+this.rng.next()*1.1):(2.4+this.rng.next()*1.8);}
  }
  applyCommanderAuras(){
    const commanders=(this.game.enemies||[]).filter(e=>!e.dead&&e.modifiers.has('commander'));
    for(const commander of commanders){
      const role=ENEMY_ROLES.commander;
      for(const enemy of this.game.enemies||[]){if(enemy===commander||enemy.dead||dist(enemy,commander)>role.auraRadius)continue;enemy.commanderGuard=Math.max(enemy.commanderGuard||0,role.guard);enemy.commanderGuardLife=.35;enemy.addEffect('haste',{remaining:.35,amount:role.haste,bypassWard:true});}
    }
  }
  updateRole(enemy,dt){
    if(enemy.modifiers.has('saboteur')&&!enemy.roleTriggered&&enemy.distance/10000>=ENEMY_ROLES.saboteur.triggerProgress){
      const candidates=(this.game.towers||[]).filter(t=>!t.sabotageTimer).sort((a,b)=>dist(a,enemy)-dist(b,enemy));const tower=candidates.find(t=>dist(t,enemy)<270)||candidates[0];
      if(tower){tower.sabotageTimer=ENEMY_ROLES.saboteur.duration;tower.ultimateTimer+=2.5;enemy.roleTriggered=true;this.game.particles?.ring?.(tower.x,tower.y,'#ff8b75',8,62,3,.65,.66);this.game.particles?.damageText?.(tower.x,tower.y-24,'SABOTAGE','#ffb09c',true,10);this.game.audio?.playWorldCue?.('saboteur');}
    }
    if(enemy.modifiers.has('shell')&&!enemy.transformed&&enemy.hp/enemy.maxHp<=ENEMY_ROLES.shell.transformAt){enemy.transformed=true;enemy.armor=Math.max(0,enemy.armor-.14);enemy.armorFlat=Math.max(0,enemy.armorFlat-4);enemy.speed*=ENEMY_ROLES.shell.speedBoost;enemy.modifiers.add('frenzied');this.game.particles?.burstEvent?.('shock',enemy.x,enemy.y,'#d8b17a',.8,.34);this.game.particles?.damageText?.(enemy.x,enemy.y-enemy.def.size-10,'COQUE BRISÉE','#ffe0ae',true,10);}
  }
  updateEnemyProjectileFire(enemy,dt){
    if(!(enemy.def.boss||enemy.modifiers.has('commander')||enemy.def.id==='mage'))return;
    enemy.projectileClock-=dt;if(enemy.projectileClock>0||enemy.distance<1800)return;
    enemy.projectileClock=(enemy.def.boss?3.2:5.8)+this.rng.next()*2.4;
    const target=PATH.at(-1);this.enemyProjectiles.push({id:++this.serial,x:enemy.x,y:enemy.y,fromX:enemy.x,fromY:enemy.y,targetX:target.x,targetY:target.y,t:0,speed:enemy.def.boss?.24:.17,damage:enemy.def.boss?2:1,color:enemy.def.boss?'#d9a6ff':'#ffa88c',source:enemy});
    this.game.audio?.playWorldCue?.('enemy-projectile');
  }
  updateProjectiles(dt){
    for(let i=this.enemyProjectiles.length-1;i>=0;i--){const p=this.enemyProjectiles[i];p.t+=dt*p.speed;const e=Math.min(1,p.t),smooth=e*e*(3-2*e);p.x=p.fromX+(p.targetX-p.fromX)*smooth;p.y=p.fromY+(p.targetY-p.fromY)*smooth;
      const interceptor=(this.game.towers||[]).find(t=>!t.sabotageTimer&&['lightning','arcane'].includes(t.def.element)&&Math.hypot(t.x-p.x,t.y-p.y)<=Math.min(105,t.stats.range*.55));
      if(interceptor){this.game.particles?.burstEvent?.('flash',p.x,p.y,'#dff8ff',.45,.18);this.game.particles?.damageText?.(p.x,p.y-12,'INTERCEPT','#dff8ff',false,9);this.enemyProjectiles.splice(i,1);continue;}
      if(p.t>=1){this.game.world?.damageNexus?.(p.damage,{source:'enemy-projectile',enemy:p.source});this.game.particles?.nexus?.(p.targetX,p.targetY);this.enemyProjectiles.splice(i,1);}
    }
    const cap=this.game.world?.performance?.projectileLimit||12;if(this.enemyProjectiles.length>cap)this.enemyProjectiles.splice(0,this.enemyProjectiles.length-cap);
  }
  onDeath(enemy){
    if(!enemy||enemy.splitDone)return;
    if(enemy.modifiers.has('splitter')&&!enemy.def.boss){enemy.splitDone=true;const def=ENEMIES.swift||ENEMIES.grunt;for(let i=0;i<ENEMY_ROLES.splitter.children;i++){const child=new Enemy(def,Math.max(.72,enemy.maxHp/Math.max(1,def.hp)*.23),{modifiers:['frenzied']});child.x=enemy.x+(i-1)*7;child.y=enemy.y+(i%2?5:-5);child.pathIndex=enemy.pathIndex;child.distance=enemy.distance;child.progress=enemy.progress;child.reward=Math.max(1,Math.round(enemy.reward*.08));this.game.enemies.push(child);this.onSpawn(child,{formationId:enemy.formationId});}this.game.particles?.burstEvent?.('shock',enemy.x,enemy.y,'#b9df9a',.58,.25);}
    this.bus.emit(WORLD_EVENTS.ENEMY_KILLED,{enemy});
  }
  adaptBoss(enemy,phase){if(!enemy?.def?.boss||phase<2)return null;const element=this.game.world?.analytics?.dominantElement?.();if(!element)return null;enemy.adaptiveResistance={element,multiplier:.78,phase,remaining:18};this.game.ui?.banner?.('ADAPTATION DU BOSS',`Résistance temporaire : ${element.toUpperCase()}`);this.game.audio?.playWorldCue?.('boss-adapt');return enemy.adaptiveResistance;}
  reset(){this.enemyProjectiles.length=0;this.clock=0;this.serial=0;}
}
