import { ENEMIES } from '../config/enemies.js';
import { getWave,WAVE_COUNT } from '../config/waves.js';
import { Enemy } from '../entities/Enemy.js';
export class WaveManager{
 constructor(game){this.game=game;this.active=false;this.queue=[];this.timer=0;this.pending=0;}
 start(){if(this.active||this.game.state.gameOver||this.game.state.wave>=WAVE_COUNT)return false;const n=this.game.state.wave+1,w=getWave(n);this.game.state.wave=n;this.active=true;this.queue=[];let cursor=0;for(const g of w.groups){cursor+=g.delay||0;for(let i=0;i<g.count;i++){this.queue.push({at:cursor,type:g.type});cursor+=g.interval;}}this.pending=this.queue.length;this.timer=0;this.current=w;this.game.ui.banner(`${w.title} · ${this.pending} ennemis`);this.game.audio.play(n%10===0?'boss':'wave');return true;}
 update(dt){if(!this.active)return;this.timer+=dt;while(this.queue.length&&this.queue[0].at<=this.timer){const item=this.queue.shift();this.game.enemies.push(new Enemy(ENEMIES[item.type],this.current.scale));}if(this.queue.length===0&&this.game.enemies.length===0){this.active=false;this.game.state.gold+=this.current.goldBonus+this.game.state.income;this.game.state.income+=4;this.game.state.score+=this.current.number*120;this.game.ui.toast(`Vague nettoyée · +${this.current.goldBonus+this.game.state.income-4} or`);if(this.game.state.wave>=WAVE_COUNT)this.game.win();}}
}
