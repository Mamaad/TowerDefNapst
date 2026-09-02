const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const midi = (note) => 440 * 2 ** ((note - 69) / 12);

export class AudioManager {
  constructor(game) {
    this.game = game;
    const saved = JSON.parse(localStorage.getItem('towerdefnapst.settings') || '{}');
    this.music = saved.music ?? 0.42;
    this.sfx = saved.sfx ?? 0.7;
    this.muted = saved.muted ?? false;
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicState = 'calm';
    this.pendingMusicState = 'calm';
    this.scheduler = null;
    this.nextStepTime = 0;
    this.step = 0;
    this.bar = 0;
    this.bpm = 116;
    this.noiseBuffer = null;
    this.pluckCache = new Map();
    this.lastSfx = new Map();
  }

  ensure() {
    if (!this.ctx) this.setupContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.scheduler) this.startScore();
  }

  setupContext() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    const master = this.ctx.createDynamicsCompressor();
    master.threshold.value = -8;
    master.knee.value = 10;
    master.ratio.value = 4;
    master.attack.value = 0.004;
    master.release.value = 0.16;
    master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.gain.value = this.muted ? 0 : this.music * 0.5;
    this.sfxGain.gain.value = this.muted ? 0 : this.sfx * 0.72;
    this.musicGain.connect(master);
    this.sfxGain.connect(master);
    this.noiseBuffer = this.makeNoiseBuffer(1.5);
  }

  makeNoiseBuffer(seconds) {
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.72 + white * 0.28;
      data[i] = last;
    }
    return buffer;
  }

  startScore() {
    this.nextStepTime = this.ctx.currentTime + 0.08;
    this.scheduler = window.setInterval(() => this.scheduleAhead(), 80);
    this.scheduleAhead();
  }

  scheduleAhead() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const horizon = this.ctx.currentTime + 0.32;
    while (this.nextStepTime < horizon) {
      if (this.step === 0) this.musicState = this.pendingMusicState;
      this.scheduleStep(this.step, this.nextStepTime);
      const targetBpm = this.musicState === 'boss' ? 128 : this.musicState === 'wave' ? 122 : 114;
      this.bpm += (targetBpm - this.bpm) * 0.22;
      this.nextStepTime += (60 / this.bpm) / 4;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar += 1;
    }
  }

  scheduleStep(step, time) {
    const state = this.musicState;
    if (state === 'defeat') {
      if (step === 0) this.pluck(midi(38), time, 0.9, 0.045, 0.25, this.musicGain);
      return;
    }
    if (state === 'victory') {
      const motif = [62, 65, 69, 74];
      if (step % 4 === 0) this.pluck(midi(motif[(step / 4) % motif.length]), time, 0.65, 0.05, 0.62, this.musicGain);
      if (step === 0 || step === 8) this.horn(midi(step === 0 ? 50 : 55), time, 0.5, 0.045);
      return;
    }

    const progression = [50, 46, 48, 45]; // Dm · Bb · C · Am
    const root = progression[this.bar % progression.length];
    const chord = [root, root + 3, root + 7, root + 12];
    const intense = state === 'boss';
    const wave = state === 'wave' || intense;

    if (step === 0 || step === 8 || (wave && (step === 6 || step === 14)) || (intense && (step === 3 || step === 11))) {
      this.kick(time, intense ? 0.105 : wave ? 0.09 : 0.065);
    }
    if (step === 4 || step === 12) this.snare(time, intense ? 0.075 : wave ? 0.062 : 0.045);
    if ((wave && step % 2 === 0) || (!wave && [2, 6, 10, 14].includes(step))) this.hat(time, wave ? 0.022 : 0.014, step % 4 === 2);
    if (intense && (step === 7 || step === 15)) this.tom(time, step === 15 ? 104 : 128, 0.05);

    if (step % (wave ? 2 : 4) === 0) {
      const note = chord[(step / (wave ? 2 : 4) + this.bar) % chord.length];
      this.pluck(midi(note + 12), time, 0.46, wave ? 0.03 : 0.025, 0.78, this.musicGain);
      if (wave && step % 4 === 0) this.pluck(midi(note + 19), time + 0.018, 0.35, 0.014, 0.85, this.musicGain);
    }

    if (step % 4 === 0) {
      const bassNote = step === 12 ? root + 7 : root;
      this.pluck(midi(bassNote - 12), time, 0.62, wave ? 0.045 : 0.032, 0.28, this.musicGain);
    }

    if (wave && step === 0 && this.bar % 2 === 0) this.horn(midi(root), time, 0.42, intense ? 0.04 : 0.026);
    if (intense && step === 8) this.horn(midi(root + 7), time, 0.36, 0.034);
  }

  makePluckBuffer(freq, duration = 0.75, brightness = 0.65) {
    const key = `${Math.round(freq)}-${Math.round(duration * 10)}-${Math.round(brightness * 10)}`;
    if (this.pluckCache.has(key)) return this.pluckCache.get(key);
    const length = Math.floor(this.ctx.sampleRate * duration);
    const delay = Math.max(2, Math.floor(this.ctx.sampleRate / freq));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < Math.min(delay, length); i++) data[i] = (Math.random() * 2 - 1) * (0.7 + brightness * 0.3);
    const damping = 0.988 - brightness * 0.006;
    for (let i = delay; i < length; i++) {
      const previous = data[i - delay];
      const neighbor = data[i - delay + 1] || previous;
      data[i] = (previous * 0.55 + neighbor * 0.45) * damping;
    }
    this.pluckCache.set(key, buffer);
    if (this.pluckCache.size > 70) this.pluckCache.delete(this.pluckCache.keys().next().value);
    return buffer;
  }

  pluck(freq, time, duration, gain, brightness, output) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.makePluckBuffer(freq, Math.max(0.45, duration), brightness);
    source.playbackRate.value = 0.985 + Math.random() * 0.03;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100 + brightness * 3800;
    filter.Q.value = 0.35;
    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter).connect(envelope).connect(output);
    source.start(time);
    source.stop(time + duration + 0.04);
  }

  kick(time, gain) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(138, time);
    osc.frequency.exponentialRampToValueAtTime(52, time + 0.095);
    env.gain.setValueAtTime(gain, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.17);
    osc.connect(env).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.18);
    this.noiseTap(time, 0.025, gain * 0.22, 1800, 'highpass', this.musicGain);
  }

  snare(time, gain) {
    this.noiseTap(time, 0.16, gain, 1450, 'bandpass', this.musicGain, 0.8);
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 185;
    env.gain.setValueAtTime(gain * 0.28, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
    osc.connect(env).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  hat(time, gain, open = false) {
    this.noiseTap(time, open ? 0.11 : 0.045, gain, 6100, 'highpass', this.musicGain, 0.25);
  }

  tom(time, freq, gain) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.35, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.12);
    env.gain.setValueAtTime(gain, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    osc.connect(env).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  horn(freq, time, duration, gain) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1900;
    filter.Q.value = 0.6;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.035);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    filter.connect(env).connect(this.musicGain);
    [1, 2, 3].forEach((harmonic, index) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * harmonic;
      const partial = this.ctx.createGain();
      partial.gain.value = [1, 0.32, 0.13][index];
      osc.connect(partial).connect(filter);
      osc.start(time);
      osc.stop(time + duration + 0.02);
    });
  }

  noiseTap(time, duration, gain, frequency, type, output, q = 0.5) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(Math.max(0.0001, gain), time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter).connect(env).connect(output);
    source.start(time, Math.random() * 0.8);
    source.stop(time + duration + 0.02);
  }

  setMusicState(state) {
    this.pendingMusicState = state;
    if (!this.ctx) return;
    if (state === 'boss') this.playUi('boss');
    if (state === 'victory') this.playUi('victory');
  }

  canPlay(key, gap) {
    if (this.muted || this.sfx <= 0) return false;
    this.ensure();
    const now = this.ctx.currentTime;
    if (now - (this.lastSfx.get(key) ?? -999) < gap) return false;
    this.lastSfx.set(key, now);
    return true;
  }

  sfxOsc(freq, duration, type, gain, drop = 0.72, when = 0) {
    const time = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(45, freq * drop), time + duration);
    env.gain.setValueAtTime(gain, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(env).connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  playShot(tower) {
    const def = tower.def;
    const jitter = 0.94 + Math.random() * 0.12;
    if (!this.canPlay(`shot-${def.id}`, def.rate > 1.8 ? 0.045 : 0.025)) return;
    if (def.projectile === 'meteor') {
      this.sfxOsc(92 * jitter, 0.18, 'triangle', 0.16, 0.45);
      this.noiseTap(this.ctx.currentTime, 0.12, 0.085, 700, 'lowpass', this.sfxGain, 0.8);
    } else if (def.projectile === 'rock') {
      this.sfxOsc(128 * jitter, 0.12, 'triangle', 0.12, 0.55);
      this.noiseTap(this.ctx.currentTime, 0.075, 0.055, 1100, 'bandpass', this.sfxGain, 0.9);
    } else if (def.projectile === 'arc') {
      this.noiseTap(this.ctx.currentTime, 0.035, 0.065, 5200, 'highpass', this.sfxGain, 0.4);
      this.sfxOsc(680 * jitter, 0.055, 'sine', 0.055, 0.42);
    } else if (def.projectile === 'bolt') {
      this.noiseTap(this.ctx.currentTime, 0.045, 0.05, 3400, 'bandpass', this.sfxGain, 2.2);
      this.sfxOsc(920 * jitter, 0.04, 'triangle', 0.035, 0.3);
    } else if (def.element === 'ice') {
      this.pluck(980 * jitter, this.ctx.currentTime, 0.16, 0.055, 0.95, this.sfxGain);
      this.sfxOsc(1500 * jitter, 0.045, 'sine', 0.025, 0.72);
    } else if (def.element === 'nature') {
      this.pluck(320 * jitter, this.ctx.currentTime, 0.12, 0.07, 0.5, this.sfxGain);
    } else {
      this.noiseTap(this.ctx.currentTime, 0.045, 0.048, 2400, 'bandpass', this.sfxGain, 0.7);
      this.sfxOsc(330 * jitter, 0.07, 'triangle', 0.055, 0.62);
    }
  }

  playImpact(projectile, enemy) {
    const key = projectile.splash > 45 || projectile.kind === 'meteor' ? 'impact-heavy' : `impact-${projectile.element}`;
    if (!this.canPlay(key, projectile.splash > 45 ? 0.07 : 0.035)) return;
    const armor = (enemy?.def?.armor || 0) > 0.07;
    if (projectile.splash > 45 || projectile.kind === 'meteor') {
      this.sfxOsc(72, 0.24, 'sine', 0.17, 0.45);
      this.noiseTap(this.ctx.currentTime, 0.24, 0.12, 620, 'lowpass', this.sfxGain, 0.55);
      return;
    }
    if (projectile.element === 'ice') {
      this.pluck(1320, this.ctx.currentTime, 0.16, 0.05, 0.96, this.sfxGain);
      this.noiseTap(this.ctx.currentTime, 0.06, 0.035, 5200, 'highpass', this.sfxGain);
    } else if (projectile.element === 'fire') {
      this.noiseTap(this.ctx.currentTime, 0.095, 0.065, 1100, 'bandpass', this.sfxGain, 0.5);
    } else if (armor) {
      this.sfxOsc(245, 0.055, 'square', 0.035, 0.8);
      this.noiseTap(this.ctx.currentTime, 0.055, 0.04, 3200, 'bandpass', this.sfxGain, 2.5);
    } else {
      this.noiseTap(this.ctx.currentTime, 0.055, 0.04, 1900, 'bandpass', this.sfxGain, 0.8);
    }
  }

  playBuild(element) {
    if (!this.canPlay('build', 0.08)) return;
    this.pluck(midi(60), this.ctx.currentTime, 0.24, 0.075, 0.7, this.sfxGain);
    this.pluck(midi(67), this.ctx.currentTime + 0.055, 0.28, 0.055, 0.75, this.sfxGain);
  }

  playUpgrade() {
    if (!this.canPlay('upgrade', 0.12)) return;
    [62, 67, 74].forEach((note, index) => this.pluck(midi(note), this.ctx.currentTime + index * 0.055, 0.3, 0.055, 0.82, this.sfxGain));
  }

  playSpawn() {
    if (!this.canPlay('spawn', 0.11)) return;
    this.noiseTap(this.ctx.currentTime, 0.18, 0.035, 850, 'lowpass', this.sfxGain, 0.7);
  }

  playWaveComplete() {
    if (!this.canPlay('wave-complete', 0.4)) return;
    [62, 65, 69].forEach((note, index) => this.pluck(midi(note), this.ctx.currentTime + index * 0.075, 0.4, 0.052, 0.75, this.sfxGain));
  }

  playUi(name) {
    if (!this.canPlay(`ui-${name}`, 0.08)) return;
    const presets = {
      sell: [310, 0.1, 'triangle', 0.055, 0.72],
      leak: [105, 0.18, 'triangle', 0.095, 0.52],
      boss: [78, 0.38, 'triangle', 0.12, 0.4],
      victory: [520, 0.24, 'sine', 0.075, 1.35],
      click: [440, 0.045, 'sine', 0.03, 0.82],
    };
    const preset = presets[name] ?? presets.click;
    this.sfxOsc(...preset);
  }

  save() {
    localStorage.setItem('towerdefnapst.settings', JSON.stringify({ music: this.music, sfx: this.sfx, muted: this.muted }));
  }

  setMusic(value) {
    this.music = clamp01(value);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(this.muted ? 0 : this.music * 0.5, this.ctx.currentTime, 0.08);
    this.save();
  }

  setSfx(value) {
    this.sfx = clamp01(value);
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : this.sfx * 0.72, this.ctx.currentTime, 0.05);
    this.save();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(this.muted ? 0 : this.music * 0.5, this.ctx.currentTime, 0.05);
    if (this.sfxGain) this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : this.sfx * 0.72, this.ctx.currentTime, 0.05);
    this.save();
    return this.muted;
  }
}
