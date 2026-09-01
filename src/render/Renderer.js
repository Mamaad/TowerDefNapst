import { WORLD,PATH,BUILD_PADS } from '../config/map.js';
import { TOWER_BY_ID } from '../config/towers.js';
import { EnvironmentRenderer } from './EnvironmentRenderer.js';
import { TowerRenderer } from './TowerRenderer.js';
import { EnemyRenderer } from './EnemyRenderer.js';
import { VfxRenderer } from './VfxRenderer.js';
import { ELEMENTS } from '../config/elements.js';
import { ellipse,glow,noGlow,colorWithAlpha } from './drawing.js';

export class Renderer{
 constructor(game,canvas){this.game=game;this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.time=0;this.env=new EnvironmentRenderer(game);this.towerArt=new TowerRenderer(game);this.enemyArt=new EnemyRenderer(game);this.vfx=new VfxRenderer(game);this.staticLayer=document.createElement('canvas');this.staticLayer.width=WORLD.width;this.staticLayer.height=WORLD.height;this.drawables=[];this.buildStatic();}
 buildStatic(){const c=this.staticLayer.getContext('2d',{alpha:false});c.clearRect(0,0,WORLD.width,WORLD.height);this.env.drawStatic(c);}
 screenToWorld(clientX,clientY){const r=this.canvas.getBoundingClientRect();return{x:(clientX-r.left)/r.width*WORLD.width,y:(clientY-r.top)/r.height*WORLD.height};}
 render(dt){this.time+=dt;const c=this.ctx;c.save();c.clearRect(0,0,WORLD.width,WORLD.height);c.drawImage(this.staticLayer,0,0);this.env.ambient(c,this.time);this.env.portals(c,this.time);this.env.padsDynamic(c,this.time,this.game.buildChoice,this.game.hoverPad,this.game.towers);this.buildPreview(c);this.drawEntities(c);this.vfx.projectiles(c,this.time);this.vfx.particles(c);this.debugPath(c);c.restore();}
 drawEntities(c){this.drawables.length=0;for(const tower of this.game.towers)this.drawables.push({kind:'tower',y:tower.y,ref:tower});for(const enemy of this.game.enemies)this.drawables.push({kind:'enemy',y:enemy.y+enemy.def.size*.4,ref:enemy});this.drawables.sort((a,b)=>a.y-b.y);for(const d of this.drawables){if(d.kind==='tower'){if(this.game.selectedTower===d.ref||this.game.debug)this.towerArt.drawRange(c,d.ref,this.time);this.towerArt.draw(c,d.ref,this.time);}else this.enemyArt.draw(c,d.ref,this.time);}}
 buildPreview(c){if(!this.game.buildChoice||!this.game.hoverWorld)return;const def=TOWER_BY_ID[this.game.buildChoice],pad=this.game.hoverPad,occupied=pad&&this.game.towers.some(t=>t.pad.id===pad.id),valid=!!pad&&!occupied;const p=pad||this.game.hoverWorld,el=ELEMENTS[def.element];c.save();const r=def.range,g=c.createRadialGradient(p.x,p.y,10,p.x,p.y,r);g.addColorStop(0,colorWithAlpha(valid?el.color:'#ff6d67',.035));g.addColorStop(1,'#0000');c.fillStyle=g;c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.fill();c.strokeStyle=colorWithAlpha(valid?el.color:'#ff6d67',.48);c.lineWidth=1.3;c.setLineDash([8,10]);c.lineDashOffset=-this.time*12;c.stroke();c.setLineDash([]);c.restore();const ghost={def,x:p.x,y:p.y,level:1,phase:0,recoil:0,flash:0,angle:-Math.PI/2,buildFx:0,upgradeFx:0,pad:pad||{x:p.x,y:p.y}};this.towerArt.draw(c,ghost,this.time,true,valid);}
 debugPath(c){if(!this.game.debug)return;c.save();c.strokeStyle='#ffd773aa';c.fillStyle='#ffd773';c.lineWidth=1;PATH.forEach((p,i)=>{c.beginPath();c.arc(p.x,p.y,4,0,Math.PI*2);c.fill();if(i){c.beginPath();c.moveTo(PATH[i-1].x,PATH[i-1].y);c.lineTo(p.x,p.y);c.stroke();}});for(const pad of BUILD_PADS){c.strokeStyle='#6effc0aa';c.beginPath();c.arc(pad.x,pad.y,pad.r,0,Math.PI*2);c.stroke();}c.restore();}
}
