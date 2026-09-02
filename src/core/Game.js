import { GameState } from './GameState.js';
import { TOWER_BY_ID } from '../config/towers.js';
import { BUILD_PADS, PATH } from '../config/map.js';
import { Tower } from '../entities/Tower.js';
import { WaveManager } from '../systems/WaveManager.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { AudioManager } from '../systems/AudioManager.js';
import { UIManager } from '../systems/UIManager.js';
import { Renderer } from '../render/Renderer.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = new GameState();
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.selectedTower = null;
    this.selectedPad = null;
    this.buildChoice = null;
    this.hoverPad = null;
    this.hoverWorld = null;
    this.debug = false;
    this.nexusPulse = 0;
    this.spawnPulse = 0;
    this.waveClearPulse = 0;
    this.bestScore = Number(localStorage.getItem('towerdefnapst.bestScore') || 0);
    this.audio = new AudioManager(this);
    this.particles = new ParticleSystem();
    this.waveManager = new WaveManager(this);
    this.combat = new CombatSystem(this);
    this.renderer = new Renderer(this, canvas);
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
      if (this.renderer.consumeCameraClick()) return;

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
      if (event.code === 'Space') {
        event.preventDefault();
        this.togglePause();
      }
      if (event.key === 'F3') {
        event.preventDefault();
        this.debug = !this.debug;
      }
      if (event.key === 'Escape') {
        this.buildChoice = null;
        this.selectedTower = null;
        this.selectedPad = null;
        this.ui.update(true);
      }
      if (['1', '2', '3'].includes(event.key)) this.setSpeed(Number(event.key));
      if (key === 'q') this.renderer.rotateCamera(-0.16);
      if (key === 'e') this.renderer.rotateCamera(0.16);
      if (key === 'w' || event.key === 'ArrowUp') this.renderer.panCamera(0, -1);
      if (key === 's' || event.key === 'ArrowDown') this.renderer.panCamera(0, 1);
      if (key === 'a' || event.key === 'ArrowLeft') this.renderer.panCamera(-1, 0);
      if (key === 'd' || event.key === 'ArrowRight') this.renderer.panCamera(1, 0);
      if (key === 'r') this.renderer.resetCamera();
    });
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
    this.ui.toast(`${tower.def.name} · niveau ${tower.level}`);
    this.ui.update(true);
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
    if (this.state.gameOver) return;
    this.state.paused = !this.state.paused;
    const bossWave = this.waveManager.current?.groups?.some((group) => group.type === 'boss');
    const musicState = this.state.paused
      ? 'calm'
      : this.waveManager.active
        ? (bossWave ? 'boss' : 'wave')
        : 'calm';
    this.audio.setMusicState(musicState);
    this.ui.update(true);
  }

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

    this.nexusPulse = Math.max(0, this.nexusPulse - raw * 1.7);
    this.spawnPulse = Math.max(0, this.spawnPulse - raw * 2.4);
    this.waveClearPulse = Math.max(0, this.waveClearPulse - raw * 1.35);

    if (!this.state.paused && !this.state.gameOver) {
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
      this.ui.debug(
        `FPS ${this.fps}\nEnnemis ${this.enemies.length}\nProjectiles ${this.projectiles.length}\n` +
        `Particules ${this.particles.items.length}\nTours ${this.towers.length}\nMoteur Three.js/WebGL\n` +
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

  win() {
    this.state.gameOver = true;
    this.state.victory = true;
    this.state.score += 5000;
    this.audio.setMusicState('victory');
    this.persistScore();
    this.ui.gameOver(true);
  }

  persistScore() {
    if (this.state.score > this.bestScore) {
      this.bestScore = this.state.score;
      localStorage.setItem('towerdefnapst.bestScore', String(this.bestScore));
    }
  }

  restart() {
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
    this.nexusPulse = 0;
    this.spawnPulse = 0;
    this.waveClearPulse = 0;
    this.particles.clear();
    this.audio.setMusicState('calm');
    this.ui.hideGameOver();
    this.ui.toast('Le Nexus est de nouveau défendu');
    this.ui.update(true);
  }
}
