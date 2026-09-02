import { COMBINED_ATTACKS } from '../config/worldStrategy.js';

export class TowerWorldManager {
  constructor(game, rng) {
    this.game = game;
    this.rng = rng;
    this.comboCooldowns = new Map();
    this.clock = 0;
  }

  update(dt) {
    this.clock += dt;
    for (const [key, value] of [...this.comboCooldowns]) {
      const next = value - dt;
      if (next <= 0) this.comboCooldowns.delete(key);
      else this.comboCooldowns.set(key, next);
    }

    for (const tower of this.game.towers) {
      // Tower.update() is the single owner of sabotage countdown. The World layer
      // only synchronizes map neutralization so the timer is never consumed twice.
      const padDisabledFor = this.game.world?.map?.disabledPads?.get?.(tower.pad?.id) || 0;
      if (padDisabledFor > 0) tower.sabotageTimer = Math.max(tower.sabotageTimer || 0, padDisabledFor);
      this.game.world?.progression?.refreshTower?.(tower);
    }

    if (this.clock >= 0.55) {
      this.clock = 0;
      this.tryCombinedAttack();
    }
  }

  tryCombinedAttack() {
    const towers = this.game.towers.filter((tower) => tower.level >= 3 && !tower.sabotageTimer);
    if (towers.length < 2) return false;
    for (const attack of COMBINED_ATTACKS) {
      if (this.comboCooldowns.has(attack.id)) continue;
      const a = towers.find((tower) => tower.def.element === attack.elements[0]);
      if (!a) continue;
      const b = towers.find((tower) => tower !== a && tower.def.element === attack.elements[1] && Math.hypot(tower.x - a.x, tower.y - a.y) <= 235);
      if (!b) continue;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const targets = this.game.enemies.filter((enemy) => !enemy.dead && Math.hypot(enemy.x - cx, enemy.y - cy) <= 205);
      if (targets.length < 4) continue;
      const base = (a.stats.damage + b.stats.damage) * attack.damage * 0.5;
      for (const enemy of targets.slice(0, 12)) {
        const dealt = enemy.takeRawDamage(base, false, true, attack.id === 'volcanic-strike');
        a.registerDamage(dealt * 0.5);
        b.registerDamage(dealt * 0.5);
        if (attack.control) enemy.addEffect('stun', { remaining: attack.control, bypassWard: true });
        if (enemy.dead) enemy.killedBy = a;
      }
      this.game.world.surfaces.create(attack.surface, cx, cy, { radius: 102, duration: 11, power: 1.45, source: a, persistent: true });
      this.game.particles?.damageText?.(cx, cy - 30, attack.name, attack.color, true, 12);
      this.game.particles?.burstEvent?.(attack.id === 'volcanic-strike' ? 'explosion' : 'shock', cx, cy, attack.color, 1.15, 0.55);
      this.game.particles?.beam?.([{ x: a.x, y: a.y }, { x: cx, y: cy }, { x: b.x, y: b.y }], attack.color);
      this.game.renderer?.kickCamera?.(0.035, cx, cy);
      this.game.triggerHitStop?.(0.025);
      this.game.audio?.playUi?.('combo');
      this.comboCooldowns.set(attack.id, attack.cooldown);
      return true;
    }
    return false;
  }

  reset() {
    this.comboCooldowns.clear();
    this.clock = 0;
  }
}
