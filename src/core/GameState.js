import { getDifficulty } from '../config/difficulty.js';
export class GameState{
 constructor(difficulty='normal'){this.difficulty=difficulty;this.reset();}
 reset(){const d=getDifficulty(this.difficulty);this.lives=d.lives;this.maxLives=d.lives;this.gold=d.gold;this.wave=0;this.score=0;this.income=d.income;this.speed=1;this.paused=false;this.gameOver=false;this.victory=false;this.campaignComplete=false;this.endless=false;this.elapsed=0;this.kills=0;this.goldSpent=0;this.earlyBonus=0;this.bossesKilled=0;this.combos=0;this.ultimates=0;this.maxEndlessWave=0;}
 canSpend(v){return this.gold>=v}spend(v){if(!this.canSpend(v))return false;this.gold-=v;this.goldSpent+=v;return true}reward(v){this.gold+=v;this.score+=v*10;}
}
