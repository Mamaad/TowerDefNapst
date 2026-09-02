import { levelStats, upgradeCost, getSpecialization } from '../config/towers.js';

export class Tower {
  constructor(def, pad) {
    this.def = def;
    this.pad = pad;
    this.x = pad.x;
    this.y = pad.y;
    this.level = 1;
    this.specialization = null;
    this.cooldown = Math.random() * 0.2;
    this.targetMode = 'first';
    this.totalSpent = def.cost;
    this.kills = 0;
    this.damageDone = 0;
    this.recentDamage = 0;
    this.recentDps = 0;
    this.controlSeconds = 0;
    this.combos = 0;
    this.flash = 0;
    this.angle = -Math.PI / 2;
    this.targetAngle = this.angle;
    this.phase = Math.random() * Math.PI * 2;
    this.recoil = 0;
    this.anticipation = 0;
    this.buildFx = 1;
    this.upgradeFx = 0;
    this._dpsClock = 0;
    this.chargeTimer = 0;
    this.pendingTarget = null;
    this.ultimateTimer = 9 + Math.random() * 5;
    this.ultimateFlash = 0;
  }

  get stats() { return levelStats(this.def, this.level, this.specialization); }
  get upgradeCost() { return upgradeCost(this); }

  upgrade() {
    if (this.level >= 3) return false;
    const cost = this.upgradeCost;
    this.level += 1;
    this.totalSpent += cost;
    this.upgradeFx = 1;
    return true;
  }

  specialize(id) { if(this.level<3||this.specialization||!getSpecialization(this.def.element,id))return false;this.specialization=id;this.upgradeFx=1;return true; }

  sellValue() { return Math.round(this.totalSpent * 0.68); }

  registerDamage(value) {
    this.damageDone += value;
    this.recentDamage += value;
  }

  update(dt) {
    this.cooldown -= dt;
    this.flash = Math.max(0, this.flash - dt * 4.5);
    this.recoil = Math.max(0, this.recoil - dt * 7);
    this.anticipation = Math.max(0, this.anticipation - dt * 5.5);
    this.chargeTimer = Math.max(0, this.chargeTimer - dt);
    if (this.level >= 3) this.ultimateTimer -= dt;
    this.ultimateFlash = Math.max(0, this.ultimateFlash - dt * 2.8);
    this.buildFx = Math.max(0, this.buildFx - dt * 2.3);
    this.upgradeFx = Math.max(0, this.upgradeFx - dt * 1.8);
    this.phase += dt;

    let delta = this.targetAngle - this.angle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.angle += delta * (1 - Math.exp(-12 * dt));

    this._dpsClock += dt;
    if (this._dpsClock >= 1) {
      const alpha = 1 - Math.exp(-2.4 * this._dpsClock);
      this.recentDps += (this.recentDamage / this._dpsClock - this.recentDps) * alpha;
      this.recentDamage = 0;
      this._dpsClock = 0;
    this.chargeTimer = 0;
    this.pendingTarget = null;
    this.ultimateTimer = 9 + Math.random() * 5;
    this.ultimateFlash = 0;
    }
  }
}
