export class AudioManager {
  constructor() {
    const saved = JSON.parse(localStorage.getItem('towerdefnapst.settings') || '{}');
    this.music = saved.music ?? 0.3;
    this.sfx = saved.sfx ?? 0.65;
    this.muted = saved.muted ?? false;
    this.ctx = null;
    this.musicGain = null;
    this.ambienceStarted = false;
  }

  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.muted ? 0 : this.music * 0.045;
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.ambienceStarted) this.startAmbience();
  }

  startAmbience() {
    if (!this.ctx || this.ambienceStarted) return;
    this.ambienceStarted = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.45;
    filter.connect(this.musicGain);

    const voices = [73.42, 110, 146.83];
    voices.forEach((frequency, index) => {
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = index === 1 ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = [0.5, 0.28, 0.18][index];
      oscillator.connect(gain).connect(filter);
      oscillator.start();
    });

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
  }

  save() {
    localStorage.setItem('towerdefnapst.settings', JSON.stringify({ music: this.music, sfx: this.sfx, muted: this.muted }));
  }

  tone(freq = 300, duration = 0.08, type = 'sine', gain = 0.05) {
    if (this.muted || this.sfx <= 0) return;
    this.ensure();
    const oscillator = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, this.ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.55), this.ctx.currentTime + duration);
    envelope.gain.setValueAtTime(gain * this.sfx, this.ctx.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    oscillator.connect(envelope).connect(this.ctx.destination);
    oscillator.start();
    oscillator.stop(this.ctx.currentTime + duration);
  }

  play(name) {
    const sounds = {
      shoot: [420, 0.055, 'triangle', 0.025],
      impact: [150, 0.09, 'square', 0.035],
      build: [620, 0.13, 'sine', 0.06],
      upgrade: [860, 0.2, 'sine', 0.07],
      wave: [260, 0.35, 'triangle', 0.06],
      boss: [92, 0.55, 'sawtooth', 0.06],
      leak: [120, 0.2, 'square', 0.05],
    };
    if (sounds[name]) this.tone(...sounds[name]);
  }

  setMusic(value) {
    this.music = Number(value);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(this.muted ? 0 : this.music * 0.045, this.ctx.currentTime, 0.08);
    this.save();
  }

  setSfx(value) {
    this.sfx = Number(value);
    this.save();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(this.muted ? 0 : this.music * 0.045, this.ctx.currentTime, 0.05);
    this.save();
    return this.muted;
  }
}
