import { levelStats,upgradeCost } from '../config/towers.js';
export class Tower{
 constructor(def,pad){this.def=def;this.pad=pad;this.x=pad.x;this.y=pad.y;this.level=1;this.cooldown=Math.random()*.2;this.targetMode='first';this.totalSpent=def.cost;this.kills=0;this.damageDone=0;this.flash=0;this.angle=-Math.PI/2;this.phase=Math.random()*Math.PI*2;this.recoil=0;this.buildFx=1;this.upgradeFx=0;}
 get stats(){return levelStats(this.def,this.level)}get upgradeCost(){return upgradeCost(this)}
 upgrade(){if(this.level>=3)return false;const c=this.upgradeCost;this.level++;this.totalSpent+=c;this.upgradeFx=1;return true;}
 sellValue(){return Math.round(this.totalSpent*.68)}
 update(dt){this.cooldown-=dt;this.flash=Math.max(0,this.flash-dt*4.5);this.recoil=Math.max(0,this.recoil-dt*7);this.buildFx=Math.max(0,this.buildFx-dt*2.3);this.upgradeFx=Math.max(0,this.upgradeFx-dt*1.8);this.phase+=dt;}
}
