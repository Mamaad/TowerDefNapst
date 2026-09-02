import { AudioManager } from './AudioManager.js';

export class BattlefieldAudioManager extends AudioManager {
  scheduleAhead() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const horizon = this.ctx.currentTime + 0.32;
    while (this.nextStepTime < horizon) {
      if (this.step === 0) this.musicState = this.pendingMusicState;
      this.scheduleStep(this.step, this.nextStepTime);
      const targetBpm = this.musicState === 'boss' ? 130 : this.musicState === 'intense' ? 126 : this.musicState === 'wave' ? 122 : 114;
      this.bpm += (targetBpm - this.bpm) * 0.22;
      this.nextStepTime += (60 / this.bpm) / 4;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar += 1;
    }
  }

  scheduleStep(step, time) {
    if (this.musicState === 'intense') {
      const original = this.musicState;
      this.musicState = 'wave';
      super.scheduleStep(step, time);
      this.musicState = original;
      if (step === 2 || step === 10) this.tom(time, step === 10 ? 116 : 142, 0.034);
      if (step === 0 && this.bar % 2 === 1) this.horn(98, time, 0.32, 0.018);
      if (step % 2 === 1) this.hat(time, 0.008, false);
    } else {
      super.scheduleStep(step, time);
    }

    // Subtle battlefield bed. Organic filtered noise, deliberately below the music.
    if (step === 0 && this.bar % 2 === 0 && !['defeat', 'victory'].includes(this.musicState)) {
      this.noiseTap(time, 1.15, 0.0028, 520, 'lowpass', this.musicGain, 0.28);
    }
  }

  setCombatPressure(enemyCount = 0, bossAlive = false, waveActive = false) {
    if (!waveActive) return;
    const desired = bossAlive ? 'boss' : enemyCount >= 30 ? 'intense' : 'wave';
    if (this.pendingMusicState !== desired) this.setMusicState(desired);
  }

  playShot(tower) {
    const projectile = tower?.def?.projectile;
    const heavy = projectile === 'meteor' || projectile === 'rock';
    const rig = this.game.renderer?.cameraRig;
    if (!heavy && rig) {
      const x = (tower.x - 800) * 0.01;
      const z = (tower.y - 450) * 0.01;
      const distance = Math.hypot(x - rig.target.x, z - rig.target.z);
      const density = this.game.enemies?.length || 0;
      if (distance > 6.5 && tower.def.rate > 1.5 && density > 22 && Math.random() < 0.55) return;
      if (distance > 8 && density > 38 && Math.random() < 0.62) return;
    }
    super.playShot(tower);
  }

  playUi(name) {
    if (name !== 'combo') {
      super.playUi(name);
      return;
    }
    if (!this.canPlay('ui-combo', 0.08)) return;
    const now = this.ctx.currentTime;
    this.pluck(740, now, 0.14, 0.04, 0.9, this.sfxGain);
    this.pluck(1110, now + 0.028, 0.16, 0.028, 0.94, this.sfxGain);
    this.noiseTap(now, 0.055, 0.024, 4100, 'bandpass', this.sfxGain, 1.1);
  }
}
