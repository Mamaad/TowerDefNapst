import { ENEMIES } from '../config/enemies.js';
import { getWaveForNumber, WAVE_COUNT } from '../config/waves.js';
import { getDifficulty } from '../config/difficulty.js';
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
    this.readyTimer = 0;
    this.prepDuration = 12;
    this.lastEarlyBonus = 0;
  }

  get nextWave() {
    return (!this.game.state.endless && this.game.state.wave >= WAVE_COUNT) ? null : getWaveForNumber(this.game.state.wave + 1, this.game.state.endless);
  }

  get readyRatio() {
    if (this.active || this.game.state.wave <= 0) return 0;
    return Math.max(0, 1 - this.readyTimer / this.prepDuration);
  }

  get earlyBonus() {
    if (this.active || this.game.state.wave <= 0 || (!this.game.state.endless && this.game.state.wave >= WAVE_COUNT)) return 0;
    const cap = Math.min(62, 18 + this.game.state.wave * 1.45);
    return Math.max(0, Math.round(cap * this.readyRatio));
  }

  get timeUntilAuto() {
    if (this.active || this.game.state.wave <= 0 || (!this.game.state.endless && this.game.state.wave >= WAVE_COUNT)) return null;
    return Math.max(0, this.prepDuration - this.readyTimer);
  }

  start(manual = true) {
    if (this.active || this.game.state.gameOver || (!this.game.state.endless && this.game.state.wave >= WAVE_COUNT)) return false;
    const number = this.game.state.wave + 1;
    const wave = getWaveForNumber(number, this.game.state.endless);
    const early = manual ? this.earlyBonus : 0;
    if (early > 0) {
      this.game.state.gold += early;
      this.game.state.score += early * 16;
      this.game.state.earlyBonus += early;
      this.lastEarlyBonus = early;
      this.game.ui.toast(`Appel anticipé · +${early} or`);
    } else {
      this.lastEarlyBonus = 0;
    }

    this.game.state.wave = number;
    this.active = true;
    this.queue = [];
    let cursor = 0;
    for (const group of wave.groups) {
      cursor += group.delay || 0;
      for (let i = 0; i < group.count; i++) {
        this.queue.push({ at: cursor, type: group.type, modifiers: group.modifiers || [] });
        cursor += group.interval;
      }
    }
    this.queue.sort((a, b) => a.at - b.at);
    this.pending = this.queue.length;
    this.timer = 0;
    this.readyTimer = 0;
    this.current = wave;
    this.game.spawnCharge = 1;

    const bossWave = wave.groups.some((group) => ENEMIES[group.type]?.boss);
    this.game.audio.ensure();
    this.game.audio.setMusicState(bossWave ? 'boss' : 'wave');
    if (bossWave) {
      this.game.audio.playUi('boss');
      this.game.renderer.focusOn(PATH[0].x, PATH[0].y, 0.72, 1.12);
      this.game.renderer.kickCamera(0.025, PATH[0].x, PATH[0].y);
    }
    this.game.ui.banner(wave.title, `${wave.subtitle} · ${this.pending} ennemis`);
    return true;
  }

  update(dt) {
    if (!this.active) {
      if (this.game.state.wave > 0 && (this.game.state.endless || this.game.state.wave < WAVE_COUNT) && !this.game.state.gameOver) {
        this.readyTimer += dt;
        const remaining = this.timeUntilAuto ?? this.prepDuration;
        this.game.spawnCharge = remaining < 3.5 ? Math.max(this.game.spawnCharge, 1 - remaining / 3.5) : 0;
        if (this.readyTimer >= this.prepDuration) this.start(false);
      }
      return;
    }

    this.timer += dt;
    while (this.queue.length && this.queue[0].at <= this.timer) {
      const item = this.queue.shift();
      this.spawn(item.type, item.modifiers);
    }

    if (this.queue.length === 0 && this.game.enemies.length === 0) this.completeWave();
  }

  spawn(type, modifiers = []) {
    const def = ENEMIES[type];
    if (!def) return null;
    const difficulty=getDifficulty(this.game.state.difficulty);
    const applied=[...modifiers];
    const bias=difficulty.eliteBias||0;
    if(bias>=1 && this.game.state.wave>=12 && !def.boss && applied.length===0 && (this.pending+this.game.state.wave)%11===0) applied.push('frenzied');
    if(bias>=2 && this.game.state.wave>=8 && !def.boss && !applied.includes('fortified') && (this.pending+this.game.state.wave)%7===0) applied.push('fortified');
    const enemy = new Enemy(def, (this.current?.scale || 1)*difficulty.hp, { modifiers:applied });
    enemy.speed*=difficulty.speed;enemy.reward=Math.round(enemy.reward*difficulty.reward);
    this.game.enemies.push(enemy);
    this.game.spawnPulse = 1;
    this.game.particles.spawnEnemy(PATH[0].x, PATH[0].y, enemy.def.color, enemy.def.boss);
    this.game.audio.playSpawn();
    if (enemy.def.boss) {
      this.game.renderer.focusOn(enemy.x, enemy.y, 0.7, 1.15);
      this.game.ui.banner(enemy.def.name.toUpperCase(), enemy.def.bossKind === 'archon' ? 'Trois plaques · quatre phases' : 'Deux plaques · brisez son armure');
    }
    return enemy;
  }

  enqueueEscort(type, count, interval = 0.28, modifiers = []) {
    for (let i = 0; i < count; i++) this.queue.push({ at: this.timer + 0.18 + i * interval, type, modifiers });
    this.queue.sort((a, b) => a.at - b.at);
  }

  onBossPhase(enemy, phase) {
    if (!enemy?.def?.boss) return;
    const isArchon = enemy.def.bossKind === 'archon';
    if (phase === 2) {
      this.enqueueEscort('swift', isArchon ? 6 : 4, 0.22, ['frenzied']);
      if (isArchon) this.enqueueEscort('mage', 2, 0.44, ['corrupted']);
      this.game.ui.banner('PHASE II', isArchon ? 'L’Archonte invoque ses éclaireurs' : 'Le Colosse appelle une escorte');
    } else if (phase === 3) {
      const recharge = enemy.maxShield * (isArchon ? 0.48 : 0.35);
      enemy.shield = Math.min(enemy.maxShield, enemy.shield + recharge);
      this.enqueueEscort('shield', isArchon ? 4 : 2, 0.38, ['protector']);
      this.game.ui.banner('PHASE III', 'La protection du boss se recompose');
    } else if (phase === 4) {
      enemy.bossEnraged = true;
      enemy.regen += isArchon ? 6 : 3;
      this.game.ui.banner('PHASE FINALE', 'ENRAGE · la ligne doit tenir');
    }
    this.game.audio.setMusicState('boss');
    this.game.audio.playUi('boss');
    this.game.particles.burstEvent('shock', enemy.x, enemy.y, enemy.def.color, 1.25, 0.55);
    this.game.particles.ring(enemy.x, enemy.y, enemy.def.color, 10, 105, 4.5, 0.62, 0.65);
    this.game.renderer.focusOn(enemy.x, enemy.y, 0.58, 1.16);
    this.game.renderer.kickCamera(0.045, enemy.x, enemy.y);
  }

  completeWave() {
    this.active = false;
    const reward = this.current.goldBonus + this.game.state.income;
    this.game.state.gold += reward;
    this.game.state.income += 4;
    this.game.state.score += this.current.number * 120;
    this.game.waveClearPulse = 1;
    this.game.particles.waveClear(PATH.at(-1).x, PATH.at(-1).y);
    this.game.audio.playWaveComplete();
    this.game.audio.setMusicState('calm');
    this.game.ui.banner('VAGUE TERMINÉE', `+${reward} or · prochaine vague dans ${this.prepDuration}s`);
    this.readyTimer = 0;
    if (!this.game.state.endless && this.game.state.wave >= WAVE_COUNT) this.game.campaignComplete();
    else if(this.game.state.endless) this.game.state.maxEndlessWave=Math.max(this.game.state.maxEndlessWave,this.game.state.wave-WAVE_COUNT);
  }
}
