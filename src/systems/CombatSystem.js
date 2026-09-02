import { Projectile } from '../entities/Projectile.js';
import { elementalMultiplier, ELEMENTS } from '../config/elements.js';

export class CombatSystem {
  constructor(game) {
    this.game = game;
  }

  update(dt) {
    for (const tower of this.game.towers) {
      tower.update(dt);
      if (tower.cooldown > 0) continue;
      const target = this.pickTarget(tower);
      if (target) this.fire(tower, target);
    }
  }

  pickTarget(tower) {
    const rangeSquared = tower.stats.range ** 2;
    const list = this.game.enemies.filter((enemy) => !enemy.dead && (enemy.x - tower.x) ** 2 + (enemy.y - tower.y) ** 2 <= rangeSquared);
    if (!list.length) return null;
    switch (tower.targetMode) {
      case 'last': list.sort((a, b) => a.distance - b.distance); break;
      case 'strong': list.sort((a, b) => b.hp - a.hp); break;
      case 'weak': list.sort((a, b) => a.hp - b.hp); break;
      case 'closest': list.sort((a, b) => ((a.x - tower.x) ** 2 + (a.y - tower.y) ** 2) - ((b.x - tower.x) ** 2 + (b.y - tower.y) ** 2)); break;
      default: list.sort((a, b) => b.distance - a.distance);
    }
    return list[0];
  }

  fire(tower, target) {
    const stats = tower.stats;
    const def = tower.def;
    let rate = stats.rate;
    for (const ally of this.game.towers) {
      if (ally === tower || !ally.def.auraRate) continue;
      if ((ally.x - tower.x) ** 2 + (ally.y - tower.y) ** 2 <= (ally.def.auraRadius || 0) ** 2) rate *= 1 + ally.def.auraRate;
    }

    tower.cooldown = 1 / rate;
    tower.flash = 1;
    tower.recoil = 1;
    tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    this.game.audio.playShot(tower);
    this.game.particles.muzzle(tower, target);

    if (def.projectile === 'bolt') {
      this.chain(tower, target, stats.damage);
      return;
    }

    const speed = def.projectile === 'arc' ? 900
      : def.projectile === 'meteor' ? 340
        : def.projectile === 'rock' ? 430
          : def.projectile === 'prism' ? 610
            : 565;

    this.game.projectiles.push(new Projectile({
      tower,
      target,
      damage: stats.damage,
      element: def.element,
      kind: def.projectile,
      splash: stats.splash,
      meta: def,
      speed,
    }));
  }

  chain(tower, target, damage) {
    const hit = [];
    let current = target;
    let amount = damage;
    const max = tower.def.chain || 3;
    for (let i = 0; i < max && current; i++) {
      hit.push(current);
      this.damage(tower, current, amount);
      const next = this.game.enemies
        .filter((enemy) => !enemy.dead && !hit.includes(enemy) && Math.hypot(enemy.x - current.x, enemy.y - current.y) < 105)
        .sort((a, b) => Math.hypot(a.x - current.x, a.y - current.y) - Math.hypot(b.x - current.x, b.y - current.y))[0];
      amount *= tower.def.chainFalloff || 0.72;
      current = next;
    }
    this.game.particles.beam([{ x: tower.x, y: tower.y - 25 }, ...hit.map((enemy) => ({ x: enemy.x, y: enemy.y - 4 }))], ELEMENTS.lightning.color);
    for (const enemy of hit) this.game.particles.impact('lightning', enemy.x, enemy.y, 'bolt', false);
    if (hit.length) this.game.audio.playImpact({ element: 'lightning', splash: 0, kind: 'bolt' }, hit[0]);
  }

  impact(projectile) {
    const tower = projectile.tower;
    const target = projectile.target;
    if (!target || target.dead) return;
    this.damage(tower, target, projectile.damage);
    if (projectile.splash > 0) {
      for (const enemy of this.game.enemies) {
        if (enemy !== target && !enemy.dead && Math.hypot(enemy.x - target.x, enemy.y - target.y) <= projectile.splash) {
          this.damage(tower, enemy, projectile.damage * 0.55, true);
        }
      }
    }

    const heavy = projectile.splash > 45 || projectile.kind === 'meteor';
    this.game.particles.impact(projectile.element, target.x, target.y, projectile.kind, heavy);
    this.game.audio.playImpact(projectile, target);
    if (heavy) this.game.renderer.kickCamera(projectile.kind === 'meteor' ? 0.035 : 0.018);
  }

  damage(tower, enemy, base, isSplash = false) {
    if (enemy.dead) return;
    const def = tower.def;
    const multiplier = elementalMultiplier(def.element, enemy, def.penetration || 0);
    let amount = base * multiplier;
    if (def.pureFraction) {
      const pure = base * def.pureFraction;
      amount = base * (1 - def.pureFraction) * multiplier + pure;
    }
    if (enemy.effects.has('mark')) amount *= enemy.effects.get('mark').amount || 1;

    const before = enemy.hp + enemy.shield;
    const dealt = enemy.takeRawDamage(amount);
    tower.damageDone += dealt;

    if (enemy._damageTextCooldown <= 0 && (!isSplash || this.game.enemies.length < 45)) {
      const critical = multiplier > 1.2;
      const color = multiplier > 1.12 ? ELEMENTS[def.element].light : multiplier < 0.82 ? '#b9bdbc' : '#f5f0df';
      this.game.particles.damageText(enemy.x, enemy.y - enemy.def.size - 5, Math.max(1, Math.round(dealt)), color, critical, critical ? 15 : 11);
      enemy._damageTextCooldown = this.game.enemies.length > 70 ? 0.36 : 0.2;
    }

    if (def.burn && !enemy.dead) enemy.addEffect('burn', { remaining: def.burnDuration || 3, dps: def.burn * (0.8 + tower.level * 0.2), source: tower });
    if (def.poison && !enemy.dead) enemy.addEffect('poison', { remaining: def.poisonDuration || 4, dps: def.poison * (0.8 + tower.level * 0.2), stacks: 1, source: tower });
    if (def.slow && !enemy.dead) enemy.addEffect('slow', { remaining: def.slowDuration || 2, amount: def.slow });
    if (def.freezeChance && !enemy.dead && Math.random() < def.freezeChance) enemy.addEffect('freeze', { remaining: 0.55 + 0.12 * tower.level });
    if (def.stunChance && !enemy.dead && Math.random() < def.stunChance) enemy.addEffect('stun', { remaining: def.stunDuration || 0.5 });
    if (def.mark && !enemy.dead) enemy.addEffect('mark', { remaining: def.markDuration || 3, amount: def.mark });
    if (def.conductive && enemy.effects.has('slow')) {
      enemy.takeRawDamage(base * 0.2);
      this.game.particles.impact('lightning', enemy.x, enemy.y, 'bolt');
    }
    if (enemy.dead && before > 0) this.kill(tower, enemy);
  }

  kill(tower, enemy) {
    if (enemy.escaped || enemy._rewarded) return;
    enemy._rewarded = true;
    if (tower) tower.kills += 1;
    this.game.state.kills += 1;
    this.game.state.reward(enemy.reward);
    this.game.state.score += Math.round(enemy.maxHp);
    this.game.particles.death(enemy);
    if (enemy.def.boss) {
      this.game.renderer.kickCamera(0.075);
      this.game.ui.banner('ARCHONTE ABATTU', 'Le Nexus respire à nouveau');
    }
  }
}
