import { GameState } from './GameState.js';
import { TOWER_BY_ID } from '../config/towers.js';
import { BUILD_PADS, PATH } from '../config/map.js';
import { getDifficulty } from '../config/difficulty.js';
import { Tower } from '../entities/Tower.js';
import { WaveManager } from '../systems/WaveManager.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { BattlefieldAudioManager } from '../systems/BattlefieldAudioManager.js';
import { UIManager } from '../systems/UIManager.js';
import { Renderer } from '../render/Renderer.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.difficulty = localStorage.getItem('towerdefnapst.difficulty') || 'normal';
    this.state = new GameState(this.difficulty);
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.selectedTower = null;
    this.selectedPad = null;
    this.buildChoice = null;
    this.hoverPad = null;
    this.hoverWorld = null;
    this.debug = false;
    this.photoMode = false;
    this.photoPausedBefore = false;
    this.keys = new Set();
    this.nexusPulse = 0;
    this.spawnPulse = 0;
    this.spawnCharge = 0;
    this.waveClearPulse = 0;
    this.hitStop = 0;
    this.bestScore = Number(localStorage.getItem('towerdefnapst.bestScore') || 0);
    this.cameraShake = Number(localStorage.getItem('towerdefnapst.cameraShake') ?? 0.55);
    this.audio = new BattlefieldAudioManager(this);
    this.particles = new ParticleSystem();
    this.waveManager = new WaveManager(this);
    this.combat = new CombatSystem(this);
    this.renderer = new Renderer(this, canvas);
    this.renderer.setCameraShake(this.cameraShake);
    this.ui = new UIManager(this);
    this.last = performance.now();
    this.fps = 60;
    this.frames = 0;
    this.fpsTime = 0;
    this.uiClock = 0;
    this.bindInput();
    requestAnimationFrame((time) => this.loop(time));
  }

  bindInput() {
    this.canvas.addEventListener('mousemove', (event) => {
      if (this.photoMode) return;
      const point = this.renderer.screenToWorld(event.clientX, event.clientY);
      this.hoverWorld = point;
      this.hoverPad = point ? this.findPad(point.x, point.y) : null;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverPad = null;
      this.hoverWorld = null;
    });

    this.canvas.addEventListener('click', (event) => {
      this.audio.ensure();
      if (this.renderer.consumeCameraClick() || this.photoMode) return;

      const picked = this.renderer.pickTower(event.clientX, event.clientY);
      if (picked) {
        this.selectedTower = picked;
        this.selectedPad = null;
        this.buildChoice = null;
        this.ui.update(true);
        return;
      }

      const point = this.renderer.screenToWorld(event.clientX, event.clientY);
      if (!point) return;
      const tower = this.findTower(point.x, point.y);
      if (tower) {
        this.selectedTower = tower;
        this.selectedPad = null;
        this.buildChoice = null;
        this.ui.update(true);
        return;
      }

      const pad = this.findPad(point.x, point.y);
      if (this.buildChoice) {
        this.placeTower(point.x, point.y);
        return;
      }
      if (pad) {
        this.selectedTower = null;
        this.selectedPad = pad;
        this.ui.toast(`Socle tactique · ${pad.role}`);
        this.ui.update(true);
        return;
      }

      this.selectedTower = null;
      this.selectedPad = null;
      this.ui.update(true);
    });

    window.addEventListener('keydown', (event) => {
      const editable = event.target?.matches?.('input, select, textarea, [contenteditable="true"]');
      if (editable) return;
      const key = event.key.toLowerCase();
      this.keys.add(key);
      if (event.code === 'Space') {
        event.preventDefault();
        this.togglePause();
      }
      if (event.key === 'F3') {
        event.preventDefault();
        this.debug = !this.debug;
      }
      if (event.key === 'F10') {
        event.preventDefault();
        this.togglePhotoMode();
      }
      if (event.key === 'Home') {
        event.preventDefault();
        this.renderer.recenterCamera();
      }
      if (event.key === 'Escape') {
        if (this.photoMode) this.togglePhotoMode(false);
        this.buildChoice = null;
        this.selectedTower = null;
        this.selectedPad = null;
        this.ui.update(true);
      }
      if (['1', '2', '3'].includes(event.key) && !this.photoMode) this.setSpeed(Number(event.key));
      if (key === 'q') this.renderer.rotateCamera(-0.12);
      if (key === 'e') this.renderer.rotateCamera(0.12);
      if (key === 'z') this.renderer.setCameraPreset('gameplay');
      if (key === 'x') this.renderer.setCameraPreset('tactical');
      if (key === 'c') this.renderer.setCameraPreset('close');
    });

    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  updateCameraInput() {
    const left = this.keys.has('a') || this.keys.has('arrowleft');
    const right = this.keys.has('d') || this.keys.has('arrowright');
    const up = this.keys.has('w') || this.keys.has('arrowup');
    const down = this.keys.has('s') || this.keys.has('arrowdown');
    this.renderer.setMoveInput((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
  }

  getBuildRange() {
    return this.buildChoice && TOWER_BY_ID[this.buildChoice] ? TOWER_BY_ID[this.buildChoice].range : 140;
  }

  findPad(x, y) {
    return BUILD_PADS.find((pad) => (pad.x - x) ** 2 + (pad.y - y) ** 2 <= pad.r ** 2) || null;
  }

  findTower(x, y) {
    return [...this.towers].reverse().find((tower) => (tower.x - x) ** 2 + (tower.y - y) ** 2 <= 35 ** 2) || null;
  }

  chooseBuild(id) {
    if (this.photoMode) return;
    const def = TOWER_BY_ID[id];
    if (!def) return;
    if (!this.state.canSpend(def.cost)) {
      this.ui.toast('Or insuffisant');
      return;
    }
    this.selectedTower = null;
    this.buildChoice = this.buildChoice === id ? null : id;
    this.ui.update(true);
  }

  placeTower(x, y) {
    const def = TOWER_BY_ID[this.buildChoice];
    const pad = this.findPad(x, y);
    if (!def || !pad) {
      this.ui.toast('Placez la défense sur un socle runique');
      return;
    }
    if (this.towers.some((tower) => tower.pad.id === pad.id)) {
      this.ui.toast('Ce socle est déjà occupé');
      return;
    }
    if (!this.state.spend(def.cost)) {
      this.ui.toast('Or insuffisant');
      return;
    }
    const tower = new Tower(def, pad);
    this.towers.push(tower);
    this.selectedTower = tower;
    this.selectedPad = null;
    this.buildChoice = null;
    this.audio.playBuild(def.element);
    this.particles.build(pad.x, pad.y, def.element);
    this.ui.toast(`${def.name} déployée`);
    this.ui.update(true);
  }

  upgradeSelected() {
    const tower = this.selectedTower;
    if (!tower || tower.level >= 3) return;
    const cost = tower.upgradeCost;
    if (!this.state.spend(cost)) {
      this.ui.toast('Or insuffisant');
      return;
    }
    tower.upgrade();
    this.audio.playUpgrade(tower.def.element);
    this.particles.upgrade(tower.x, tower.y, tower.def.element);
    this.renderer.kickCamera(0.01, tower.x, tower.y);
    this.ui.toast(`${tower.def.name} · niveau ${tower.level}`);
    this.ui.update(true);
  }

  specializeSelected(id) {
    const tower=this.selectedTower;if(!tower||tower.level<3||tower.specialization)return;
    const cost=Math.round(tower.def.cost*.82);if(!this.state.spend(cost)){this.ui.toast('Or insuffisant pour la spécialisation');return;}
    if(!tower.specialize(id)){this.state.gold+=cost;return;}tower.totalSpent+=cost;this.audio.playUpgrade(tower.def.element);this.particles.upgrade(tower.x,tower.y,tower.def.element);this.renderer.kickCamera(.018,tower.x,tower.y);this.ui.toast(`${tower.def.name} · spécialisation déverrouillée`);this.ui.update(true);
  }

  sellSelected() {
    const tower = this.selectedTower;
    if (!tower) return;
    const value = tower.sellValue();
    this.state.gold += value;
    this.particles.sell(tower.x, tower.y);
    this.audio.playUi('sell');
    this.towers = this.towers.filter((item) => item !== tower);
    this.selectedTower = null;
    this.ui.toast(`Défense recyclée · +${value} or`);
    this.ui.update(true);
  }

  togglePause() {
    if (this.state.gameOver || this.photoMode) return;
    this.state.paused = !this.state.paused;
    const bossWave = this.waveManager.current?.groups?.some((group) => group.type === 'boss' || group.type === 'colossus');
    const musicState = this.state.paused ? 'calm' : this.waveManager.active ? (bossWave ? 'boss' : 'wave') : 'calm';
    this.audio.setMusicState(musicState);
    this.ui.update(true);
  }

  togglePhotoMode(force = null) {
    const enabled = force == null ? !this.photoMode : Boolean(force);
    if (enabled === this.photoMode) return;
    if (enabled) {
      this.photoPausedBefore = this.state.paused;
      this.state.paused = true;
      this.photoMode = true;
      this.buildChoice = null;
      this.hoverPad = null;
      document.body.classList.add('photo-mode');
      this.renderer.setPhotoMode(true);
      this.ui.toast('PHOTO MODE · F10 ou Échap pour revenir');
    } else {
      this.photoMode = false;
      this.state.paused = this.photoPausedBefore;
      document.body.classList.remove('photo-mode');
      this.renderer.setPhotoMode(false);
    }
    this.ui.update(true);
  }

  setCameraShake(value) {
    this.cameraShake = Math.max(0, Math.min(1, Number(value) || 0));
    localStorage.setItem('towerdefnapst.cameraShake', String(this.cameraShake));
    this.renderer.setCameraShake(this.cameraShake);
  }

  setDifficulty(id) {
    if (this.state.wave > 0 || this.towers.length || this.waveManager.active) { this.ui.toast('La difficulté se choisit avant la première vague'); return false; }
    const def=getDifficulty(id);this.difficulty=def.id;localStorage.setItem('towerdefnapst.difficulty',def.id);this.state.difficulty=def.id;this.state.reset();this.ui.toast(`${def.name} · ${def.description}`);this.ui.update(true);return true;
  }

  triggerHitStop(seconds = 0.035) { this.hitStop = Math.max(this.hitStop, Math.min(0.07, seconds)); }

  setSpeed(value) {
    this.state.speed = value;
    this.ui.update(true);
  }

  loop(now) {
    const raw = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    this.frames += 1;
    this.fpsTime += raw;
    this.uiClock += raw;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.frames / this.fpsTime);
      this.frames = 0;
      this.fpsTime = 0;
    }

    this.updateCameraInput();
    if (this.waveManager.active) {
      const bossAlive = this.enemies.some((enemy) => enemy.def.boss && !enemy.dead);
      this.audio.setCombatPressure(this.enemies.length, bossAlive, true);
    }
    this.nexusPulse = Math.max(0, this.nexusPulse - raw * 1.7);
    this.spawnPulse = Math.max(0, this.spawnPulse - raw * 2.4);
    if (this.waveManager.active) this.spawnCharge = Math.max(0, this.spawnCharge - raw * 0.9);
    this.waveClearPulse = Math.max(0, this.waveClearPulse - raw * 1.35);

    if (this.hitStop > 0) this.hitStop = Math.max(0, this.hitStop - raw);
    if (!this.state.paused && !this.state.gameOver && this.hitStop <= 0) {
      const dt = raw * this.state.speed;
      this.state.elapsed += dt;
      this.waveManager.update(dt);
      for (const enemy of this.enemies) enemy.update(dt);
      this.handleEscapes();
      this.claimDotDeaths();
      this.combat.update(dt);
      for (const projectile of this.projectiles) projectile.update(dt, (item) => this.combat.impact(item));
      this.projectiles = this.projectiles.filter((projectile) => !projectile.dead);
      this.enemies = this.enemies.filter((enemy) => !enemy.dead);
      this.particles.update(dt);
    } else {
      this.particles.update(raw * 0.3);
    }

    this.renderer.render(raw);
    if (this.uiClock > 0.08) {
      this.uiClock = 0;
      this.ui.update();
      const render = this.renderer.getDebugStats();
      const camera = render.camera;
      this.ui.debug(
        `FPS ${this.fps}\nEnnemis ${this.enemies.length}\nProjectiles ${this.projectiles.length}\n` +
        `Particules ${this.particles.items.length}\nTours ${this.towers.length}\nDraw calls ${render.calls}\nTriangles ${render.triangles}\n` +
        `Meshes ${render.meshes} · Geo ${render.geometries} · Lights ${render.lights}\nPitch ${camera.pitch.toFixed(1)}°\nYaw ${camera.yaw.toFixed(1)}°\n` +
        `Zoom ${camera.zoom.toFixed(2)} · ${camera.preset}\nCible ${camera.x.toFixed(2)}, ${camera.z.toFixed(2)}\n` +
        `Vitesse x${this.state.speed}\nTemps ${this.state.elapsed.toFixed(1)} s`,
      );
    }
    requestAnimationFrame((time) => this.loop(time));
  }

  claimDotDeaths() {
    for (const enemy of this.enemies) {
      if (enemy.dead && !enemy.escaped && !enemy._rewarded) this.combat.kill(enemy.killedBy || null, enemy);
    }
  }

  handleEscapes() {
    for (const enemy of this.enemies) {
      if (!enemy.escaped || enemy._counted) continue;
      enemy._counted = true;
      this.state.lives -= enemy.def.livesDamage || 1;
      this.nexusPulse = 1;
      this.particles.nexus(PATH.at(-1).x, PATH.at(-1).y);
      this.audio.playUi('leak');
      this.renderer.kickCamera(enemy.def.boss ? 0.07 : 0.025, PATH.at(-1).x, PATH.at(-1).y);
      if (this.state.lives <= 0) {
        this.state.lives = 0;
        this.lose();
        break;
      }
    }
  }

  lose() {
    this.state.gameOver = true;
    this.audio.setMusicState('defeat');
    this.persistScore();
    this.ui.gameOver(false);
  }

  campaignComplete() {
    this.state.gameOver = true;this.state.victory = true;this.state.campaignComplete=true;this.state.score += 5000;this.audio.setMusicState('victory');this.persistScore();this.ui.gameOver(true);
  }

  continueEndless() {
    if(!this.state.campaignComplete)return;this.state.gameOver=false;this.state.victory=false;this.state.campaignComplete=false;this.state.endless=true;this.state.paused=false;this.waveManager.active=false;this.waveManager.readyTimer=0;this.audio.setMusicState('calm');this.ui.hideGameOver();this.ui.banner('ENDLESS MODE','La faille reste ouverte · score sans limite');this.ui.update(true);
  }

  win() { this.campaignComplete(); }

  persistScore() {
    if (this.state.score > this.bestScore) {
      this.bestScore = this.state.score;
      localStorage.setItem('towerdefnapst.bestScore', String(this.bestScore));
    }
  }

  restart() {
    if (this.photoMode) this.togglePhotoMode(false);
    this.state.difficulty=this.difficulty;
    this.state.reset();
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.selectedTower = null;
    this.selectedPad = null;
    this.buildChoice = null;
    this.hoverPad = null;
    this.waveManager.active = false;
    this.waveManager.queue = [];
    this.waveManager.current = null;
    this.waveManager.readyTimer = 0;
    this.nexusPulse = 0;
    this.spawnPulse = 0;
    this.spawnCharge = 0;
    this.waveClearPulse = 0;
    this.hitStop = 0;
    this.particles.clear();
    this.renderer.resetCamera();
    this.audio.setMusicState('calm');
    this.ui.hideGameOver();
    this.ui.toast('Le Nexus est de nouveau défendu');
    this.ui.update(true);
  }
}
