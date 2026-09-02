import { PATH, BUILD_PADS } from '../config/map.js';
import { ROUTES, MAP_STATES, SHRINES, LOCKED_PAD_IDS } from '../config/worldStrategy.js';
import { WORLD_EVENTS } from '../core/EventBus.js';

const routePoints = (id) => ROUTES[id].map(([x, y]) => ({ x, y }));

export class MapStrategyManager {
  constructor(game, bus) {
    this.game = game;
    this.bus = bus;
    this.activeRoute = 'standard';
    this.pendingRoute = null;
    this.mapState = 0;
    this.shrines = new Map(SHRINES.map((shrine) => [shrine.id, { ...shrine, active: false }]));
    this.lockedPads = new Set(LOCKED_PAD_IDS);
    this.disabledPads = new Map();
    this.hazards = [];
    this.routeHistory = ['standard'];
  }

  update(dt) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hazard = this.hazards[i];
      hazard.delay -= dt;
      if (hazard.delay <= 0) {
        this.disablePad(hazard.padId, hazard.duration);
        this.hazards.splice(i, 1);
      }
    }
    for (const [id, time] of [...this.disabledPads]) {
      const next = time - dt;
      if (next <= 0) this.disabledPads.delete(id);
      else this.disabledPads.set(id, next);
    }
    const wave = this.game.state.wave;
    const state = [...MAP_STATES].reverse().find((item) => wave >= item.minWave) || MAP_STATES[0];
    if (state.id !== this.mapState) {
      this.mapState = state.id;
      this.game.ui?.banner?.(state.label.toUpperCase(), 'Le champ de bataille évolue');
    }
  }

  isPadUsable(id) { return !this.lockedPads.has(id) && !this.disabledPads.has(id); }

  unlockPad(id) {
    if (!this.lockedPads.has(id)) return false;
    this.lockedPads.delete(id);
    const pad = BUILD_PADS[id];
    if (pad) this.game.particles?.ring?.(pad.x, pad.y, '#9ff3c6', 8, 58, 3, 0.6, 0.7);
    return true;
  }

  unlockAnyPad() {
    const id = [...this.lockedPads][0];
    return id == null ? false : this.unlockPad(id);
  }

  disablePad(id, duration = 7) {
    if (id == null) return false;
    const pad = BUILD_PADS[id];
    if (!pad) return false;
    const current = this.disabledPads.get(id) || 0;
    const applied = Math.max(current, duration);
    this.disabledPads.set(id, applied);
    const tower = this.game.towers?.find?.((item) => item.pad?.id === id);
    if (tower) tower.sabotageTimer = Math.max(tower.sabotageTimer || 0, applied);
    this.game.particles?.ring?.(pad.x, pad.y, '#ff8c55', 10, 66, 4, 0.8, 0.65);
    return true;
  }

  announceRoute(id) {
    if (!ROUTES[id] || id === this.activeRoute) return false;
    this.pendingRoute = id;
    this.game.ui?.banner?.('ROUTE EN MUTATION', `Prochaine vague · ${id.toUpperCase()}`);
    return true;
  }

  applyPendingRoute() {
    if (!this.pendingRoute || this.game.waveManager.active || this.game.enemies.length) return false;
    return this.setRoute(this.pendingRoute);
  }

  setRoute(id) {
    if (!ROUTES[id]) return false;
    const points = routePoints(id);
    PATH.splice(0, PATH.length, ...points);
    this.activeRoute = id;
    this.pendingRoute = null;
    this.routeHistory.push(id);
    this.bus.emit(WORLD_EVENTS.ROUTE_CHANGED, { id, path: points });
    return true;
  }

  restoreStandard() {
    this.pendingRoute = null;
    this.setRoute('standard');
  }

  activateShrine(id) {
    const shrine = this.shrines.get(id);
    if (!shrine || shrine.active) return false;
    if (!this.game.state.spend(shrine.cost)) return false;
    shrine.active = true;
    this.game.particles?.ring?.(shrine.x, shrine.y, '#c9f5d8', 10, shrine.radius, 4, 0.8, 0.68);
    this.game.audio?.playUi?.('upgrade');
    return shrine;
  }

  shrineModifierFor(tower) {
    const out = { damage: 1, rate: 1, range: 1, ultimate: 1 };
    for (const shrine of this.shrines.values()) {
      if (!shrine.active || shrine.element !== tower.def.element || Math.hypot(shrine.x - tower.x, shrine.y - tower.y) > shrine.radius) continue;
      for (const key of Object.keys(out)) out[key] *= shrine.mods[key] || 1;
    }
    return out;
  }

  bossMapAttack(enemy, phase) {
    if (phase === 2) {
      const candidate = BUILD_PADS
        .filter((pad) => !this.lockedPads.has(pad.id))
        .sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y))[0];
      if (candidate) {
        this.game.ui?.banner?.('FRAPPE DU BOSS', `${candidate.role} sera neutralisé temporairement`);
        this.hazards.push({ padId: candidate.id, delay: 0.65, duration: 8 });
        this.game.audio?.playWorldCue?.('boss-map');
      }
    }
    if (phase === 3) {
      const next = this.activeRoute === 'standard' ? 'breach' : this.activeRoute === 'breach' ? 'highland' : 'emergency';
      this.announceRoute(next);
    }
    if (phase === 4) this.game.world?.surfaces?.create?.('arcane', enemy.x, enemy.y, { radius: 95, duration: 12, power: 1.25, persistent: true });
  }

  reset() {
    this.restoreStandard();
    this.mapState = 0;
    this.shrines = new Map(SHRINES.map((shrine) => [shrine.id, { ...shrine, active: false }]));
    this.lockedPads = new Set(LOCKED_PAD_IDS);
    this.disabledPads.clear();
    this.hazards.length = 0;
    this.routeHistory = ['standard'];
  }
}
