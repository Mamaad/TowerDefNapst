import { ENEMIES } from '../config/enemies.js';
import { getWave, WAVE_COUNT } from '../config/waves.js';
import { PATH } from '../config/map.js';
import { Enemy } from '../entities/Enemy.js';

export class WaveManager {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.queue = [];
    this.timer = 0;
    this.pending = 0;
    this.current = null;
  }

  start() {
    if (this.active || this.game.state.gameOver || this.game.state.wave >= WAVE_COUNT) return false;
    const number = this.game.state.wave + 1;
    const wave = getWave(number);
    this.game.state.wave = number;
    this.active = true;
    this.queue = [];
    let cursor = 0;
    for (const group of wave.groups) {
      cursor += group.delay || 0;
      for (let i = 0; i < group.count; i++) {
        this.queue.push({ at: cursor, type: group.type });
        cursor += group.interval;
      }
    }
    this.pending = this.queue.length;
    this.timer = 0;
    this.current = wave;
    const bossWave = wave.groups.some((group) => ENEMIES[group.type]?.boss);
    this.game.audio.ensure();
    this.game.audio.setMusicState(bossWave ? 'boss' : 'wave');
    if (bossWave) this.game.audio.playUi('boss');
    this.game.ui.banner(wave.title, `${wave.subtitle} · ${this.pending} ennemis`);
    return true;
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;
    while (this.queue.length && this.queue[0].at <= this.timer) {
      const item = this.queue.shift();
      const enemy = new Enemy(ENEMIES[item.type], this.current.scale);
      this.game.enemies.push(enemy);
      this.game.spawnPulse = 1;
      this.game.particles.spawnEnemy(PATH[0].x, PATH[0].y, enemy.def.color, enemy.def.boss);
      this.game.audio.playSpawn();
    }

    if (this.queue.length === 0 && this.game.enemies.length === 0) {
      this.active = false;
      const reward = this.current.goldBonus + this.game.state.income;
      this.game.state.gold += reward;
      this.game.state.income += 4;
      this.game.state.score += this.current.number * 120;
      this.game.waveClearPulse = 1;
      this.game.particles.waveClear(PATH.at(-1).x, PATH.at(-1).y);
      this.game.audio.playWaveComplete();
      this.game.audio.setMusicState('calm');
      this.game.ui.banner('VAGUE TERMINÉE', `+${reward} or · revenu renforcé`);
      if (this.game.state.wave >= WAVE_COUNT) this.game.win();
    }
  }
}
