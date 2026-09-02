import { ENEMIES } from '../config/enemies.js';
import { PATH } from '../config/map.js';
import { ENEMY_ROLES } from '../config/worldStrategy.js';
import { Enemy } from '../entities/Enemy.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class EnemyWorldManager {
  constructor(game, bus, rng) { this.game = game; this.bus = bus; this.rng = rng; this.enemyProjectiles = []; this.clock = 0; this.serial = 0; }

  onSpawn(enemy, item = {}) {
    if (!enemy) return enemy;
    enemy.formationId = item.formationId || [...enemy.modifiers].find((modifier) => String(modifier).startsWith('formation:'))?.slice(10) || null;
    enemy.worldRole = enemy.modifiers.has('commander') ? 'commander' : enemy.modifiers.has('saboteur') ? 'saboteur' : enemy.modifiers.has('shell') ? 'shell' : enemy.modifiers.has('splitter') ? 'splitter' : null;
    enemy.roleTriggered = false;
    enemy.transformed = false;
    enemy.splitDone = false;
    enemy.projectileClock = 1.5 + this.rng.next() * 2.5;
    enemy.weakPointClock = this.rng.next() * 2;
    enemy.weakPointOpen = Boolean(enemy.def.boss || enemy.def.id === 'tank' || enemy.def.id === 'elite' || enemy.modifiers.has('fortified'));
    if (enemy.worldRole === 'commander') { this.game.ui?.banner?.('COMMANDER', 'Éliminez son aura avant qu’elle ne renforce la ligne'); this.game.audio?.playWorldCue?.('commander'); }
    if (enemy.worldRole === 'saboteur') this.game.audio?.playWorldCue?.('saboteur');
    return enemy;
  }

  update(dt) {
    this.clock += dt;
    for (const enemy of this.game.enemies || []) {
      if (enemy.dead) continue;
      this.updateWeakPoint(enemy, dt);
      this.updateRole(enemy, dt);
      this.updateEnemyProjectileFire(enemy, dt);
    }
    if (this.clock >= 0.18) { this.clock = 0; this.applyCommanderAuras(); }
    this.updateProjectiles(dt);
  }

  updateWeakPoint(enemy, dt) {
    if (!(enemy.def.boss || enemy.def.id === 'tank' || enemy.def.id === 'elite' || enemy.modifiers.has('fortified'))) return;
    enemy.weakPointClock = (enemy.weakPointClock || 0) - dt;
    if (enemy.weakPointClock <= 0) {
      enemy.weakPointOpen = !enemy.weakPointOpen;
      enemy.weakPointClock = enemy.weakPointOpen ? 1.7 + this.rng.next() * 1.1 : 2.4 + this.rng.next() * 1.8;
    }
  }

  applyCommanderAuras() {
    const commanders = (this.game.enemies || []).filter((enemy) => !enemy.dead && enemy.modifiers.has('commander'));
    for (const commander of commanders) {
      const role = ENEMY_ROLES.commander;
      for (const enemy of this.game.enemies || []) {
        if (enemy === commander || enemy.dead || dist(enemy, commander) > role.auraRadius) continue;
        enemy.commanderGuard = Math.max(enemy.commanderGuard || 0, role.guard);
        enemy.commanderGuardLife = 0.35;
        enemy.addEffect('haste', { remaining: 0.35, amount: role.haste, bypassWard: true });
      }
    }
  }

  updateRole(enemy) {
    if (enemy.modifiers.has('saboteur') && !enemy.roleTriggered && enemy.distance / 10000 >= ENEMY_ROLES.saboteur.triggerProgress) {
      const candidates = (this.game.towers || []).filter((tower) => !tower.sabotageTimer).sort((a, b) => dist(a, enemy) - dist(b, enemy));
      const tower = candidates.find((item) => dist(item, enemy) < 270) || candidates[0];
      if (tower) {
        tower.sabotageTimer = ENEMY_ROLES.saboteur.duration;
        tower.ultimateTimer += 2.5;
        enemy.roleTriggered = true;
        this.game.particles?.ring?.(tower.x, tower.y, '#ff8b75', 8, 62, 3, 0.65, 0.66);
        this.game.particles?.damageText?.(tower.x, tower.y - 24, 'SABOTAGE', '#ffb09c', true, 10);
        this.game.audio?.playWorldCue?.('saboteur');
      }
    }
    if (enemy.modifiers.has('shell') && !enemy.transformed && enemy.hp / enemy.maxHp <= ENEMY_ROLES.shell.transformAt) {
      enemy.transformed = true;
      enemy.armor = Math.max(0, enemy.armor - 0.14);
      enemy.armorFlat = Math.max(0, enemy.armorFlat - 4);
      enemy.speed *= ENEMY_ROLES.shell.speedBoost;
      enemy.modifiers.add('frenzied');
      this.game.particles?.burstEvent?.('shock', enemy.x, enemy.y, '#d8b17a', 0.8, 0.34);
      this.game.particles?.damageText?.(enemy.x, enemy.y - enemy.def.size - 10, 'COQUE BRISÉE', '#ffe0ae', true, 10);
    }
  }

  updateEnemyProjectileFire(enemy, dt) {
    if (!(enemy.def.boss || enemy.modifiers.has('commander') || enemy.def.id === 'mage')) return;
    enemy.projectileClock -= dt;
    if (enemy.projectileClock > 0 || enemy.distance < 1800) return;
    enemy.projectileClock = (enemy.def.boss ? 3.2 : 5.8) + this.rng.next() * 2.4;
    const target = PATH.at(-1);
    this.enemyProjectiles.push({ id: ++this.serial, x: enemy.x, y: enemy.y, fromX: enemy.x, fromY: enemy.y, targetX: target.x, targetY: target.y, t: 0, speed: enemy.def.boss ? 0.24 : 0.17, damage: enemy.def.boss ? 2 : 1, color: enemy.def.boss ? '#d9a6ff' : '#ffa88c', source: enemy });
    this.game.audio?.playWorldCue?.('enemy-projectile');
  }

  updateProjectiles(dt) {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.enemyProjectiles[i];
      projectile.t += dt * projectile.speed;
      const e = Math.min(1, projectile.t);
      const smooth = e * e * (3 - 2 * e);
      projectile.x = projectile.fromX + (projectile.targetX - projectile.fromX) * smooth;
      projectile.y = projectile.fromY + (projectile.targetY - projectile.fromY) * smooth;
      const interceptor = (this.game.towers || []).find((tower) => !tower.sabotageTimer && ['lightning', 'arcane'].includes(tower.def.element) && Math.hypot(tower.x - projectile.x, tower.y - projectile.y) <= Math.min(105, tower.stats.range * 0.55));
      if (interceptor) {
        this.game.particles?.burstEvent?.('flash', projectile.x, projectile.y, '#dff8ff', 0.45, 0.18);
        this.game.particles?.damageText?.(projectile.x, projectile.y - 12, 'INTERCEPT', '#dff8ff', false, 9);
        this.enemyProjectiles.splice(i, 1);
        continue;
      }
      if (projectile.t >= 1) {
        this.game.world?.damageNexus?.(projectile.damage, { source: 'enemy-projectile', enemy: projectile.source });
        this.game.particles?.nexus?.(projectile.targetX, projectile.targetY);
        this.enemyProjectiles.splice(i, 1);
      }
    }
    const cap = this.game.world?.performance?.projectileLimit || 12;
    if (this.enemyProjectiles.length > cap) this.enemyProjectiles.splice(0, this.enemyProjectiles.length - cap);
  }

  onDeath(enemy) {
    if (!enemy || enemy.splitDone) return;
    if (enemy.modifiers.has('splitter') && !enemy.def.boss) {
      enemy.splitDone = true;
      const def = ENEMIES.swift || ENEMIES.grunt;
      for (let i = 0; i < ENEMY_ROLES.splitter.children; i++) {
        const child = new Enemy(def, Math.max(0.72, enemy.maxHp / Math.max(1, def.hp) * 0.23), { modifiers: ['frenzied'] });
        child.x = enemy.x + (i - 1) * 7;
        child.y = enemy.y + (i % 2 ? 5 : -5);
        child.pathIndex = enemy.pathIndex;
        child.distance = enemy.distance;
        child.progress = enemy.progress;
        child.reward = Math.max(1, Math.round(enemy.reward * 0.08));
        this.game.enemies.push(child);
        this.onSpawn(child, { formationId: enemy.formationId });
      }
      this.game.particles?.burstEvent?.('shock', enemy.x, enemy.y, '#b9df9a', 0.58, 0.25);
    }
    // ENEMY_KILLED is emitted once by WorldStrategyManager's combat wrapper,
    // with both tower and enemy context. Emitting here used to double-fire it.
  }

  adaptBoss(enemy, phase) {
    if (!enemy?.def?.boss || phase < 2) return null;
    const element = this.game.world?.analytics?.dominantElement?.();
    if (!element) return null;
    enemy.adaptiveResistance = { element, multiplier: 0.78, phase, remaining: 18 };
    this.game.ui?.banner?.('ADAPTATION DU BOSS', `Résistance temporaire : ${element.toUpperCase()}`);
    this.game.audio?.playWorldCue?.('boss-adapt');
    return enemy.adaptiveResistance;
  }

  reset() { this.enemyProjectiles.length = 0; this.clock = 0; this.serial = 0; }
}
