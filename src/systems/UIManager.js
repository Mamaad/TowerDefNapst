import { TOWERS, TOWER_BY_ID } from '../config/towers.js';
import { ELEMENTS } from '../config/elements.js';
import { PAD_BASELINE_RANGE } from '../config/map.js';
import { getWave } from '../config/waves.js';
import { uiIcon, elementIcon, towerIcon } from '../ui/icons.js';

const elementOrder = ['fire', 'ice', 'lightning', 'nature', 'earth', 'arcane'];

export class UIManager {
  constructor(game) {
    this.game = game;
    this.$ = (id) => document.getElementById(id);
    this.activeElement = 'fire';
    this.cache = {};
    this.installIcons();
    this.buildTabs();
    this.buildMenu();
    this.bind();
    this.update(true);
  }

  installIcons() {
    this.$('brandIcon').innerHTML = elementIcon('arcane');
    this.$('lifeIcon').innerHTML = uiIcon('heart');
    this.$('goldIcon').innerHTML = uiIcon('coin');
    this.$('waveIcon').innerHTML = uiIcon('wave');
    this.$('scoreIcon').innerHTML = uiIcon('score');
    this.$('incomeIcon').innerHTML = uiIcon('income');
    this.$('panelRune').innerHTML = elementIcon('arcane');
    this.$('defeatIcon').innerHTML = elementIcon('arcane');
    this.$('targetIcon').innerHTML = uiIcon('target');
    this.$('playIcon').innerHTML = uiIcon('play');
    this.$('cameraBtn').innerHTML = uiIcon('camera');
    this.updateAudioIcon();
  }

  buildTabs() {
    const nav = this.$('elementTabs');
    nav.innerHTML = '';
    for (const id of elementOrder) {
      const element = ELEMENTS[id];
      const button = document.createElement('button');
      button.className = 'element-tab';
      button.type = 'button';
      button.dataset.element = id;
      button.style.setProperty('--tab-color', element.color);
      button.title = element.name;
      button.innerHTML = elementIcon(id);
      nav.appendChild(button);
    }
  }

  buildMenu() {
    const menu = this.$('buildMenu');
    menu.innerHTML = '';
    for (const tower of TOWERS.filter((item) => item.element === this.activeElement)) {
      const element = ELEMENTS[tower.element];
      const button = document.createElement('button');
      button.className = 'tower-card';
      button.dataset.tower = tower.id;
      button.style.setProperty('--element', element.color);
      button.title = `${tower.name}\n${tower.description}\n${tower.damage} dégâts · ${tower.range} portée · ${tower.rate}/s`;
      button.innerHTML = `
        <span class="tower-illustration">${towerIcon(tower.id, tower.element)}</span>
        <span class="tower-card-copy"><strong>${tower.name}</strong><small>${tower.special}</small></span>
        <span class="tower-cost">${uiIcon('coin')} ${tower.cost}</span>
      `;
      menu.appendChild(button);
    }
    this.updateCards();
  }

  bind() {
    const game = this.game;
    this.$('elementTabs').addEventListener('click', (event) => {
      const button = event.target.closest('[data-element]');
      if (!button) return;
      this.activeElement = button.dataset.element;
      this.buildMenu();
      this.updateTabs();
      game.audio.ensure();
      game.audio.playUi('click');
    });
    this.$('buildMenu').addEventListener('click', (event) => {
      const button = event.target.closest('[data-tower]');
      if (!button) return;
      game.audio.ensure();
      game.audio.playUi('click');
      game.chooseBuild(button.dataset.tower);
    });
    this.$('pauseBtn').onclick = () => game.togglePause();
    this.$('cameraBtn').onclick = () => {
      game.renderer.resetCamera();
      game.audio.ensure();
      game.audio.playUi('click');
    };
    document.querySelectorAll('[data-speed]').forEach((button) => {
      button.onclick = () => game.setSpeed(Number(button.dataset.speed));
    });
    this.$('waveBtn').onclick = () => game.waveManager.start();
    this.$('upgradeBtn').onclick = () => game.upgradeSelected();
    this.$('sellBtn').onclick = () => game.sellSelected();
    this.$('targetSelect').onchange = (event) => {
      if (game.selectedTower) game.selectedTower.targetMode = event.target.value;
    };
    this.$('restartBtn').onclick = () => game.restart();
    this.$('muteBtn').onclick = () => {
      game.audio.ensure();
      game.audio.toggleMute();
      this.updateAudioIcon();
    };
    this.$('musicVolume').oninput = (event) => {
      game.audio.ensure();
      game.audio.setMusic(event.target.value);
    };
    this.$('sfxVolume').oninput = (event) => {
      game.audio.ensure();
      game.audio.setSfx(event.target.value);
    };
    this.$('musicVolume').value = game.audio.music;
    this.$('sfxVolume').value = game.audio.sfx;
  }

  updateAudioIcon() {
    if (this.$('muteBtn')) this.$('muteBtn').innerHTML = uiIcon(this.game.audio.muted ? 'mute' : 'audio');
  }

  text(id, value) {
    if (this.cache[id] === value) return;
    this.cache[id] = value;
    this.$(id).textContent = value;
  }

  update(force = false) {
    const state = this.game.state;
    this.text('lives', String(state.lives));
    this.text('gold', String(Math.floor(state.gold)));
    this.text('wave', `${state.wave} / 30`);
    this.text('score', state.score.toLocaleString('fr-FR'));
    this.text('income', `+${state.income}`);

    const pauseKey = `pause-${state.paused}`;
    if (force || this.cache.pause !== pauseKey) {
      this.cache.pause = pauseKey;
      this.$('pauseBtn').innerHTML = uiIcon(state.paused ? 'play' : 'pause');
      this.$('pauseBtn').setAttribute('aria-label', state.paused ? 'Reprendre' : 'Pause');
    }

    const canWave = !this.game.waveManager.active && state.wave < 30;
    const next = state.wave < 30 ? getWave(state.wave + 1) : null;
    this.$('waveBtn').disabled = !canWave;
    this.$('waveBtn').classList.toggle('ready', canWave);
    this.$('waveBonus').textContent = next ? `+${next.goldBonus + state.income} OR` : 'TERMINÉ';
    this.$('waveBtn').querySelector('strong').textContent = this.game.waveManager.active ? 'VAGUE EN COURS' : state.wave >= 30 ? 'DERNIÈRE VAGUE' : 'LANCER VAGUE';
    document.querySelectorAll('[data-speed]').forEach((button) => button.classList.toggle('active', Number(button.dataset.speed) === state.speed));

    this.updateTabs();
    this.updateCards();
    this.updateTowerPanel();
    this.updatePadHud();
    this.updateBoss();
  }

  updateTabs() {
    document.querySelectorAll('.element-tab').forEach((button) => button.classList.toggle('active', button.dataset.element === this.activeElement));
  }

  updateCards() {
    document.querySelectorAll('.tower-card').forEach((button) => {
      const def = TOWERS.find((tower) => tower.id === button.dataset.tower);
      if (!def) return;
      button.classList.toggle('selected', this.game.buildChoice === button.dataset.tower);
      button.classList.toggle('locked', this.game.state.gold < def.cost);
    });
  }

  updateTowerPanel() {
    const tower = this.game.selectedTower;
    const root = this.$('towerPanel');
    const selection = root.querySelector('.tower-selection');
    root.classList.toggle('hidden', !tower);
    selection.classList.toggle('hidden', !tower);
    if (!tower) return;

    const element = ELEMENTS[tower.def.element];
    const stats = tower.stats;
    root.style.setProperty('--element', element.color);
    this.$('towerPortrait').style.setProperty('--element', element.color);
    const portraitKey = `${tower.def.id}-${tower.level}`;
    if (this.cache.portrait !== portraitKey) {
      this.cache.portrait = portraitKey;
      this.$('towerPortrait').innerHTML = towerIcon(tower.def.id, tower.def.element);
    }
    this.text('towerElement', element.name.toUpperCase());
    this.$('towerElement').style.color = element.color;
    this.text('towerName', tower.def.name);
    this.text('towerLevel', `NIVEAU ${tower.level} · ${tower.kills} ÉLIMINATIONS`);
    this.text('towerDescription', tower.def.description);
    this.text('towerDamage', String(Math.round(stats.damage)));
    this.text('towerDps', (stats.damage * stats.rate).toFixed(1));
    this.text('towerRange', String(Math.round(stats.range)));
    this.text('towerRate', `${stats.rate.toFixed(2)}/s`);
    this.text('towerSpecial', `${tower.def.special} · ${Math.round(tower.damageDone).toLocaleString('fr-FR')} dégâts infligés`);
    this.$('targetSelect').value = tower.targetMode;
    const cost = tower.upgradeCost;
    const upgrade = this.$('upgradeBtn');
    upgrade.disabled = tower.level >= 3 || !this.game.state.canSpend(cost);
    upgrade.innerHTML = tower.level >= 3 ? 'NIVEAU MAX' : `${uiIcon('upgrade')} AMÉLIORER · ${cost}`;
    this.$('sellBtn').innerHTML = `${uiIcon('sell')} VENDRE · +${tower.sellValue()}`;
  }

  updatePadHud() {
    const root = this.$('padHud');
    const buildDef = TOWER_BY_ID[this.game.buildChoice];
    const pad = (buildDef && this.game.hoverPad) || this.game.selectedPad;
    if (!pad || this.game.selectedTower) {
      root.classList.add('hidden');
      return;
    }
    root.classList.remove('hidden');
    if (buildDef) {
      this.text('padHudKicker', 'PORTÉE DE DÉPLOIEMENT');
      this.text('padHudTitle', buildDef.name);
      this.text('padHudMeta', `${pad.role} · portée ${buildDef.range}`);
      root.style.setProperty('--pad-accent', ELEMENTS[buildDef.element].color);
    } else {
      this.text('padHudKicker', 'SOCLE TACTIQUE');
      this.text('padHudTitle', pad.role);
      this.text('padHudMeta', `couverture courte vérifiée · portée ${PAD_BASELINE_RANGE}`);
      root.style.setProperty('--pad-accent', '#8ff2c9');
    }
  }

  updateBoss() {
    const boss = this.game.enemies.find((enemy) => enemy.def.boss && !enemy.dead);
    const root = this.$('bossHud');
    root.classList.toggle('hidden', !boss);
    if (!boss) return;
    this.text('bossName', boss.def.name);
    const ratio = Math.max(0, boss.hp / boss.maxHp);
    this.$('bossHealth').style.width = `${ratio * 100}%`;
    this.text('bossValue', `${Math.ceil(boss.hp).toLocaleString('fr-FR')} / ${Math.ceil(boss.maxHp).toLocaleString('fr-FR')} PV`);
  }

  banner(title, subtitle = '') {
    const element = this.$('waveBanner');
    this.text('waveBannerTitle', title);
    this.text('waveBannerSubtitle', subtitle);
    this.$('waveBannerKicker').textContent = title.includes('TERMINÉ') ? 'RÉCOMPENSE' : title.includes('ARCHONTE') ? 'MENACE' : 'VAGUE';
    element.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => element.classList.remove('show'), 1900);
  }

  toast(text) {
    const element = this.$('toast');
    element.textContent = text;
    element.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => element.classList.remove('show'), 1500);
  }

  gameOver(victory = false) {
    this.$('gameOver').classList.remove('hidden');
    this.text('gameOverKicker', victory ? 'LE NEXUS EST SAUVÉ' : 'LE NEXUS EST TOMBÉ');
    this.text('gameOverTitle', victory ? 'VICTOIRE' : 'DÉFAITE');
    const state = this.game.state;
    const best = Math.max(this.game.bestScore, state.score);
    this.$('gameOverStats').innerHTML = `
      <div class="end-stat"><small>VAGUE</small><b>${state.wave}</b></div>
      <div class="end-stat"><small>SCORE</small><b>${state.score.toLocaleString('fr-FR')}</b></div>
      <div class="end-stat"><small>ÉLIMINATIONS</small><b>${state.kills}</b></div>
      <div class="end-stat"><small>MEILLEUR</small><b>${best.toLocaleString('fr-FR')}</b></div>
    `;
  }

  hideGameOver() {
    this.$('gameOver').classList.add('hidden');
  }

  debug(text) {
    const element = this.$('debug');
    element.textContent = text;
    element.classList.toggle('hidden', !this.game.debug);
  }
}
