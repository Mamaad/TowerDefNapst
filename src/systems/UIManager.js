import { TOWERS, TOWER_BY_ID, levelStats, ULTIMATES, SPECIALIZATIONS, getSpecialization } from '../config/towers.js';
import { ELEMENTS, RESISTANCE_PROFILES } from '../config/elements.js';
import { ENEMIES, ELITE_MODIFIERS } from '../config/enemies.js';
import { PAD_BASELINE_RANGE } from '../config/map.js';
import { getWaveForNumber, summarizeWave, WAVE_COUNT } from '../config/waves.js';
import { DIFFICULTIES } from '../config/difficulty.js';
import { uiIcon, elementIcon, towerIcon } from '../ui/icons.js';

const elementOrder = ['fire', 'ice', 'lightning', 'nature', 'earth', 'arcane'];
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

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
    this.$('specializationChoices').addEventListener('click', (event) => {
      const button = event.target.closest('[data-specialization]');
      if (!button || button.disabled) return;
      game.audio.ensure();
      game.audio.playUi('click');
      game.specializeSelected(button.dataset.specialization);
    });
    this.$('pauseBtn').onclick = () => game.togglePause();
    this.$('cameraBtn').onclick = () => {
      game.renderer.recenterCamera();
      game.audio.ensure();
      game.audio.playUi('click');
    };
    document.querySelectorAll('[data-camera-preset]').forEach((button) => {
      button.onclick = () => {
        game.renderer.setCameraPreset(button.dataset.cameraPreset);
        document.querySelectorAll('[data-camera-preset]').forEach((item) => item.classList.toggle('active', item === button));
        game.audio.ensure();
        game.audio.playUi('click');
      };
    });
    this.$('photoBtn').onclick = () => game.togglePhotoMode();
    document.querySelectorAll('[data-speed]').forEach((button) => {
      button.onclick = () => game.setSpeed(Number(button.dataset.speed));
    });
    this.$('waveBtn').onclick = () => game.waveManager.start(true);
    this.$('upgradeBtn').onclick = () => game.upgradeSelected();
    this.$('upgradeBtn').addEventListener('pointerenter', () => {
      if (game.selectedTower?.level < 3) this.$('upgradePreview').classList.remove('hidden');
    });
    this.$('upgradeBtn').addEventListener('pointerleave', () => this.$('upgradePreview').classList.add('hidden'));
    this.$('sellBtn').onclick = () => game.sellSelected();
    this.$('targetSelect').onchange = (event) => {
      if (game.selectedTower) game.selectedTower.targetMode = event.target.value;
    };
    this.$('restartBtn').onclick = () => game.restart();
    this.$('endlessBtn').onclick = () => game.continueEndless();
    this.$('difficultySelect').value=game.state.difficulty;
    this.$('difficultySelect').onchange=(event)=>{game.setDifficulty(event.target.value);event.target.value=game.state.difficulty;};
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
    this.$('cameraShake').oninput = (event) => game.setCameraShake(event.target.value);
    this.$('musicVolume').value = game.audio.music;
    this.$('sfxVolume').value = game.audio.sfx;
    this.$('cameraShake').value = game.cameraShake;
  }

  updateAudioIcon() {
    if (this.$('muteBtn')) this.$('muteBtn').innerHTML = uiIcon(this.game.audio.muted ? 'mute' : 'audio');
  }

  text(id, value) {
    if (this.cache[id] === value) return;
    this.cache[id] = value;
    const element = this.$(id);
    if (element) element.textContent = value;
  }

  update(force = false) {
    const state = this.game.state;
    this.text('lives', String(state.lives));
    this.text('gold', String(Math.floor(state.gold)));
    this.text('wave', state.endless ? `${state.wave} · ∞` : `${state.wave} / ${WAVE_COUNT}`);
    this.text('score', state.score.toLocaleString('fr-FR'));
    this.text('income', `+${state.income}`);

    const pauseKey = `pause-${state.paused}-${this.game.photoMode}`;
    if (force || this.cache.pause !== pauseKey) {
      this.cache.pause = pauseKey;
      this.$('pauseBtn').innerHTML = uiIcon(state.paused ? 'play' : 'pause');
      this.$('pauseBtn').setAttribute('aria-label', state.paused ? 'Reprendre' : 'Pause');
      this.$('photoBtn').classList.toggle('active', this.game.photoMode);
      this.$('photoBadge').classList.toggle('hidden', !this.game.photoMode);
    }

    const canWave = !this.game.waveManager.active && (state.endless || state.wave < WAVE_COUNT) && !this.game.photoMode;
    const next = (state.endless || state.wave < WAVE_COUNT) ? getWaveForNumber(state.wave + 1,state.endless) : null;
    this.$('waveBtn').disabled = !canWave;
    this.$('waveBtn').classList.toggle('ready', canWave);
    const early = this.game.waveManager.earlyBonus;
    const reward = next ? next.goldBonus + state.income + early : 0;
    this.$('waveBonus').textContent = next ? `${early > 0 ? `+${early} EARLY · ` : ''}+${reward - early} OR` : 'TERMINÉ';
    this.$('waveBtn').querySelector('strong').textContent = this.game.waveManager.active ? 'VAGUE EN COURS' : state.endless ? 'LANCER ENDLESS' : state.wave >= WAVE_COUNT ? 'CAMPAGNE TERMINÉE' : 'LANCER VAGUE';
    this.text('waveCtaKicker', early > 0 ? 'APPEL ANTICIPÉ' : 'PROCHAINE');
    document.querySelectorAll('[data-speed]').forEach((button) => button.classList.toggle('active', Number(button.dataset.speed) === state.speed));

    this.updateTabs();
    this.updateCards();
    this.updateTowerPanel();
    this.updatePadHud();
    this.updateBoss();
    this.updateWavePreview();
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
    const portraitKey = `${tower.def.id}-${tower.level}-${tower.specialization || 'base'}`;
    if (this.cache.portrait !== portraitKey) {
      this.cache.portrait = portraitKey;
      this.$('towerPortrait').innerHTML = towerIcon(tower.def.id, tower.def.element);
    }
    this.text('towerElement', element.name.toUpperCase());
    this.$('towerElement').style.color = element.color;
    this.text('towerName', tower.def.name);
    const activeSpec = getSpecialization(tower.def.element, tower.specialization);
    this.text('towerLevel', `NIVEAU ${tower.level}${activeSpec ? ` · ${activeSpec.name}` : ''} · ${tower.kills} ÉLIMINATIONS`);
    this.text('towerDescription', tower.def.description);
    this.text('towerDamage', String(Math.round(stats.damage)));
    this.text('towerDps', tower.recentDps.toFixed(1));
    this.text('towerRange', String(Math.round(stats.range)));
    this.text('towerRate', `${stats.rate.toFixed(2)}/s`);
    this.text('towerSpecial', `${tower.def.special} · ${Math.round(tower.damageDone).toLocaleString('fr-FR')} dégâts totaux`);
    this.$('towerBattleStats').innerHTML = `
      <span class="tower-battle-stat">COMBOS <b>${tower.combos}</b></span>
      <span class="tower-battle-stat">CONTRÔLE <b>${tower.controlSeconds.toFixed(1)}s</b></span>
      <span class="tower-battle-stat">KILLS <b>${tower.kills}</b></span>
      <span class="tower-battle-stat ultimate-stat">ULT <b>${tower.level>=3?(tower.ultimateTimer<=0?'PRÊT':Math.max(0,tower.ultimateTimer).toFixed(0)+'s'):'NIV.III'}</b></span>
    `;
    this.$('targetSelect').value = tower.targetMode;
    const cost = tower.upgradeCost;
    const upgrade = this.$('upgradeBtn');
    upgrade.disabled = tower.level >= 3 || !this.game.state.canSpend(cost);
    upgrade.innerHTML = tower.level >= 3 ? 'NIVEAU MAX' : `${uiIcon('upgrade')} AMÉLIORER · ${cost}`;
    this.$('sellBtn').innerHTML = `${uiIcon('sell')} VENDRE · +${tower.sellValue()}`;

    if (tower.level < 3) {
      const next = levelStats(tower.def, tower.level + 1, tower.specialization);
      const delta = (a, b, digits = 0) => `+${(b - a).toFixed(digits)}`;
      this.$('upgradePreviewStats').innerHTML = `
        <div class="upgrade-delta"><span>DÉGÂTS</span><b>${Math.round(stats.damage)} → ${Math.round(next.damage)}</b><em>${delta(stats.damage, next.damage)}</em></div>
        <div class="upgrade-delta"><span>CADENCE</span><b>${stats.rate.toFixed(2)} → ${next.rate.toFixed(2)}</b><em>${delta(stats.rate, next.rate, 2)}</em></div>
        <div class="upgrade-delta"><span>PORTÉE</span><b>${Math.round(stats.range)} → ${Math.round(next.range)}</b><em>${delta(stats.range, next.range)}</em></div>
      `;
    } else {
      this.$('upgradePreview').classList.add('hidden');
    }

    this.updateSpecializationPanel(tower);
  }

  updateSpecializationPanel(tower) {
    const panel = this.$('specializationPanel');
    const choices = this.$('specializationChoices');
    if (!tower || tower.level < 3) {
      panel.classList.add('hidden');
      choices.innerHTML = '';
      return;
    }

    panel.classList.remove('hidden');
    const current = getSpecialization(tower.def.element, tower.specialization);
    if (current) {
      choices.innerHTML = `<div class="specialization-active"><strong>${current.name}</strong><span>${current.hint}</span><em>Voie verrouillée</em></div>`;
      return;
    }

    const cost = Math.round(tower.def.cost * 0.82);
    const specs = SPECIALIZATIONS[tower.def.element] || [];
    choices.innerHTML = specs.map((spec) => {
      const next = levelStats(tower.def, tower.level, spec.id);
      const canBuy = this.game.state.canSpend(cost);
      const stat = next.damage > tower.stats.damage * 1.12
        ? `Dégâts ${Math.round(tower.stats.damage)} → ${Math.round(next.damage)}`
        : next.range > tower.stats.range + 8
          ? `Portée ${Math.round(tower.stats.range)} → ${Math.round(next.range)}`
          : next.splash > tower.stats.splash + 10
            ? `Zone ${Math.round(tower.stats.splash)} → ${Math.round(next.splash)}`
            : `Cadence ${tower.stats.rate.toFixed(2)} → ${next.rate.toFixed(2)}`;
      return `<button class="specialization-choice" data-specialization="${spec.id}" ${canBuy ? '' : 'disabled'}><strong>${spec.name}</strong><span>${spec.hint}</span><small>${stat}</small><em>${cost} OR</em></button>`;
    }).join('');
  }

  updatePadHud() {
    const root = this.$('padHud');
    const buildDef = TOWER_BY_ID[this.game.buildChoice];
    const pad = (buildDef && this.game.hoverPad) || this.game.selectedPad;
    if (!pad || this.game.selectedTower || this.game.photoMode) {
      root.classList.add('hidden');
      return;
    }
    root.classList.remove('hidden');
    if (buildDef) {
      this.text('padHudKicker', 'PORTÉE DE DÉPLOIEMENT');
      this.text('padHudTitle', buildDef.name);
      this.text('padHudMeta', `${pad.role} · portée ${buildDef.range} · ${buildDef.cost} or`);
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
    root.classList.toggle('hidden', !boss || this.game.photoMode);
    if (!boss) return;
    this.text('bossName', boss.def.name);
    this.text('bossPhase', `PHASE ${['I', 'II', 'III', 'IV'][Math.max(0, boss.bossPhase - 1)]}`);
    const ratio = Math.max(0, boss.hp / boss.maxHp);
    this.$('bossHealth').style.width = `${ratio * 100}%`;
    this.text('bossValue', `${Math.ceil(boss.hp).toLocaleString('fr-FR')} / ${Math.ceil(boss.maxHp).toLocaleString('fr-FR')} PV${boss.shield > 0 ? ` · ${Math.ceil(boss.shield)} bouclier` : ''}`);
    this.text('bossArmor', boss.maxPlates ? `${'◆'.repeat(boss.plates)}${'◇'.repeat(Math.max(0, boss.maxPlates - boss.plates))} ARMURE` : 'WARD MAJEUR');
  }

  updateWavePreview() {
    const root = this.$('wavePreview');
    if (this.game.photoMode || (!this.game.state.endless && this.game.state.wave >= WAVE_COUNT)) {
      root.classList.add('hidden');
      return;
    }
    root.classList.remove('hidden');
    const wave = getWaveForNumber(this.game.state.wave + 1,this.game.state.endless);
    this.text('nextWaveName', wave.title);
    const until = this.game.waveManager.timeUntilAuto;
    this.text('nextWaveTimer', this.game.waveManager.active ? 'EN ATTENTE' : until == null ? 'PRÊTE' : `${until.toFixed(1)}s`);
    const summary = summarizeWave(wave);
    this.$('nextWaveUnits').innerHTML = summary.map((item) => {
      const def = ENEMIES[item.type];
      const mods = item.modifiers.map((id) => ELITE_MODIFIERS[id]?.name ?? id).join(' · ');
      return `<span class="wave-unit-chip" style="--unit-color:${def?.color || '#c9ddcf'}"><i></i>${item.count}× ${def?.name || item.type}${mods ? `<em>${mods}</em>` : ''}</span>`;
    }).join('');

    const profiles = summary.map((item) => ENEMIES[item.type]?.resistanceProfile).filter(Boolean);
    let hint = wave.subtitle;
    if (profiles.length) {
      const values = Object.fromEntries(elementOrder.map((element) => [element, 0]));
      for (const profileName of profiles) {
        const profile = RESISTANCE_PROFILES[profileName];
        if (!profile) continue;
        for (const element of elementOrder) values[element] += profile[element] || 1;
      }
      const best = [...elementOrder].sort((a, b) => values[b] - values[a])[0];
      const worst = [...elementOrder].sort((a, b) => values[a] - values[b])[0];
      hint = `${wave.subtitle} · avantage ${ELEMENTS[best].name} · résistance probable ${ELEMENTS[worst].name}`;
    }
    this.text('nextWaveHint', hint);
  }

  banner(title, subtitle = '') {
    const element = this.$('waveBanner');
    this.text('waveBannerTitle', title);
    this.text('waveBannerSubtitle', subtitle);
    this.$('waveBannerKicker').textContent = title.includes('TERMINÉ') ? 'RÉCOMPENSE' : title.includes('PHASE') || title.includes('ARCHONTE') || title.includes('COLOSSE') ? 'MENACE' : 'VAGUE';
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
    this.$('endlessBtn').classList.toggle('hidden', !victory || !this.game.state.campaignComplete);
    this.text('gameOverKicker', victory ? 'LE NEXUS EST SAUVÉ' : 'LE NEXUS EST TOMBÉ');
    this.text('gameOverTitle', victory ? 'VICTOIRE' : 'DÉFAITE');
    const state = this.game.state;
    const best = Math.max(this.game.bestScore, state.score);
    const bestTower = [...this.game.towers].sort((a, b) => b.damageDone - a.damageDone)[0];
    const elementSpend = new Map();
    for (const tower of this.game.towers) elementSpend.set(tower.def.element, (elementSpend.get(tower.def.element) || 0) + tower.totalSpent);
    const dominant = [...elementSpend.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    this.$('gameOverStats').innerHTML = `
      <div class="end-stat"><small>VAGUE</small><b>${state.wave}</b></div>
      <div class="end-stat"><small>SCORE</small><b>${state.score.toLocaleString('fr-FR')}</b></div>
      <div class="end-stat"><small>ÉLIMINATIONS</small><b>${state.kills}</b></div>
      <div class="end-stat"><small>TEMPS</small><b>${formatTime(state.elapsed)}</b></div>
      <div class="end-stat"><small>OR DÉPENSÉ</small><b>${Math.round(state.goldSpent)}</b></div>
      <div class="end-stat"><small>COMBOS</small><b>${state.combos}</b></div>
      <div class="end-stat"><small>BOSS</small><b>${state.bossesKilled}</b></div>
      <div class="end-stat"><small>ULTIMATES</small><b>${state.ultimates}</b></div>
      <div class="end-stat"><small>DIFFICULTÉ</small><b>${DIFFICULTIES[state.difficulty]?.name||state.difficulty}</b></div>
      <div class="end-stat"><small>MEILLEUR</small><b>${best.toLocaleString('fr-FR')}</b></div>
      <div class="end-stat"><small>TOUR MVP</small><b>${bestTower ? bestTower.def.name : '—'}</b></div>
      <div class="end-stat"><small>ÉLÉMENT</small><b>${dominant ? ELEMENTS[dominant].name : '—'}</b></div>
    `;
  }

  hideGameOver() {
    this.$('gameOver').classList.add('hidden');
  }

  debug(text) {
    const element = this.$('debug');
    element.textContent = text;
    element.classList.toggle('hidden', !this.game.debug || this.game.photoMode);
  }
}
