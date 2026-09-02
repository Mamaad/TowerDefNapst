import { PATH } from '../config/map.js';

const WARDABLE = new Set(['slow', 'freeze', 'stun', 'burn', 'poison', 'mark']);

export class Enemy {
  constructor(def, scale = 1, options = {}) {
    this.def = def;
    this.id = crypto.randomUUID?.() || Math.random().toString(36);
    this.modifiers = new Set(options.modifiers || []);

    let hpScale = scale;
    let speedScale = 1 + Math.min(0.28, (scale - 1) * 0.08);
    if (this.modifiers.has('fortified')) hpScale *= 1.24;
    if (this.modifiers.has('frenzied')) speedScale *= 1.12;

    this.maxHp = def.hp * hpScale;
    this.hp = this.maxHp;
    this.speed = def.speed * speedScale;
    this.reward = Math.round(def.reward * (0.9 + scale * 0.1) * (1 + this.modifiers.size * 0.09));
    this.x = PATH[0].x;
    this.y = PATH[0].y;
    this.pathIndex = 0;
    this.progress = 0;
    this.dead = false;
    this.escaped = false;

    this.maxShield = (def.shield || 0) * Math.sqrt(scale) * (this.modifiers.has('fortified') ? 1.18 : 1);
    this.shield = this.maxShield;
    this.effects = new Map();
    this.comboCooldowns = new Map();
    this.distance = 0;
    this.resistanceProfile = def.resistanceProfile;
    this.angle = 0;
    this.hitFlash = 0;
    this.hitPulse = 0;
    this.wardFlash = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.spawnAge = 0;
    this._damageTextCooldown = 0;
    this.lastDamageAge = 999;
    this.lastDamageElement = null;
    this.lastDamageKind = null;

    this.armor = (def.armor || 0) + (this.modifiers.has('fortified') ? 0.05 : 0);
    this.armorFlat = (def.armorFlat || 0) + (this.modifiers.has('fortified') ? 2.5 : 0);
    this.regen = (def.regen || 0) + (this.modifiers.has('regenerating') ? Math.max(3, def.hp * 0.012) : 0);
    this.wardCharges = (def.ward || 0) + (this.modifiers.has('corrupted') ? 1 : 0);
    this.maxWardCharges = this.wardCharges;
    this.protectorAura = Math.max(def.protectorAura || 0, this.modifiers.has('protector') ? 0.18 : 0);
    this.protectorRadius = Math.max(def.protectorRadius || 0, this.modifiers.has('protector') ? 115 : 0);

    this.bossPhase = 1;
    this.bossEnraged = false;
    this.maxPlates = def.breakablePlates || 0;
    this.plates = this.maxPlates;
    this.plateMaxHp = this.maxPlates ? this.maxHp * (def.bossKind === 'archon' ? 0.065 : 0.085) : 0;
    this.plateHp = this.plateMaxHp;
  }

  addEffect(name, data) {
    if (this.dead) return false;
    if (WARDABLE.has(name) && this.wardCharges > 0 && !data?.bypassWard) {
      this.wardCharges -= 1;
      this.wardFlash = 1;
      return false;
    }
    const old = this.effects.get(name);
    if (old && name === 'poison') {
      old.stacks = Math.min(6, (old.stacks || 1) + (data.stacks || 1));
      old.remaining = Math.max(old.remaining, data.remaining);
      old.dps = Math.max(old.dps, data.dps);
      old.source = data.source || old.source;
      return true;
    }
    if (old) {
      old.remaining = Math.max(old.remaining, data.remaining ?? old.remaining);
      Object.assign(old, data);
      return true;
    }
    this.effects.set(name, { ...data });
    return true;
  }

  canCombo(id) {
    return (this.comboCooldowns.get(id) || 0) <= 0;
  }

  lockCombo(id, duration = 0.42) {
    this.comboCooldowns.set(id, duration);
  }

  damagePlate(amount) {
    if (!this.plates || this.dead) return false;
    this.plateHp -= Math.max(0, amount);
    if (this.plateHp > 0) return false;
    this.plates -= 1;
    this.armor = Math.max(0, this.armor - 0.025);
    this.armorFlat = Math.max(0, this.armorFlat - 1.35);
    this.plateHp = this.plates > 0 ? this.plateMaxHp : 0;
    return true;
  }

  update(dt) {
    this.spawnAge += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 8);
    this.hitPulse = Math.max(0, this.hitPulse - dt * 6);
    this.wardFlash = Math.max(0, this.wardFlash - dt * 5);
    this._damageTextCooldown = Math.max(0, this._damageTextCooldown - dt);
    this.lastDamageAge += dt;
    for (const [key, value] of this.comboCooldowns) {
      const next = value - dt;
      if (next <= 0) this.comboCooldowns.delete(key);
      else this.comboCooldowns.set(key, next);
    }

    let speedMul = 1;
    let stunned = false;
    let burn = 0;
    let poison = 0;
    let source = null;
    for (const [name, effect] of this.effects) {
      effect.remaining -= dt;
      if (name === 'slow') speedMul *= 1 - effect.amount;
      if (name === 'haste') speedMul *= 1 + effect.amount;
      if (name === 'freeze' || name === 'stun') stunned = true;
      if (name === 'burn') {
        burn += (effect.dps || 0) * (effect.stacks || 1);
        source = effect.source || source;
      }
      if (name === 'poison') {
        poison += (effect.dps || 0) * (effect.stacks || 1);
        source = effect.source || source;
      }
      if (effect.remaining <= 0) this.effects.delete(name);
    }

    if (burn > 0 && !this.dead) this.takeRawDamage(burn * dt, true, false, true);
    if (poison > 0 && !this.dead) this.takeRawDamage(poison * dt, true, false, true);
    if (this.dead && source) this.killedBy = source;

    if (this.regen && !this.dead) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    if (this.maxShield > 0 && this.shield < this.maxShield && this.lastDamageAge >= (this.def.shieldDelay || 999)) {
      this.shield = Math.min(this.maxShield, this.shield + (this.def.shieldRegen || 0) * dt);
    }

    const hpRatio = this.hp / Math.max(1, this.maxHp);
    if (this.def.enrageAt && hpRatio <= this.def.enrageAt) speedMul *= 1 + (this.def.enrageSpeed || 0.15);
    if (this.modifiers.has('frenzied')) speedMul *= 1 + Math.min(0.18, this.distance / 13000);
    if (this.bossEnraged) speedMul *= 1.22;

    if (stunned || this.dead) return;
    let move = this.speed * speedMul * dt;
    while (move > 0 && this.pathIndex < PATH.length - 1) {
      const next = PATH[this.pathIndex + 1];
      const dx = next.x - this.x;
      const dy = next.y - this.y;
      const distance = Math.hypot(dx, dy);
      this.angle = Math.atan2(dy, dx);
      if (distance <= move) {
        this.x = next.x;
        this.y = next.y;
        move -= distance;
        this.distance += distance;
        this.pathIndex += 1;
      } else {
        this.x += dx / distance * move;
        this.y += dy / distance * move;
        this.distance += move;
        move = 0;
      }
    }
    if (this.pathIndex >= PATH.length - 1) {
      this.escaped = true;
      this.dead = true;
    }
    this.progress = this.pathIndex + this.distance / 10000;
  }

  takeRawDamage(amount, ignoreShield = false, feedback = true, ignoreArmor = false) {
    if (this.dead) return 0;
    this.lastDamageAge = 0;
    if (feedback) {
      this.hitFlash = 1;
      this.hitPulse = 1;
    }
    let dealt = 0;
    if (!ignoreShield && this.shield > 0) {
      const absorb = Math.min(this.shield, amount);
      this.shield -= absorb;
      amount -= absorb;
      dealt += absorb;
    }
    if (amount > 0) {
      const afterFlat = ignoreArmor ? amount : Math.max(0.5, amount - this.armorFlat);
      const reduced = ignoreArmor ? afterFlat : afterFlat * (1 - this.armor);
      this.hp -= reduced;
      dealt += reduced;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    return dealt;
  }
}
