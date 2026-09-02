import { Projectile } from '../entities/Projectile.js';
import { elementalMultiplier, ELEMENTS, ELEMENTAL_COMBOS } from '../config/elements.js';
import { ULTIMATES, getSpecialization } from '../config/towers.js';

export class CombatSystem {
  constructor(game) {
    this.game = game;
  }

  update(dt) {
    for (const tower of this.game.towers) {
      tower.update(dt);
      if (tower.level >= 3 && tower.ultimateTimer <= 0) this.tryUltimate(tower);
      if (tower.pendingTarget) {
        if (tower.pendingTarget.dead) { tower.pendingTarget = null; tower.chargeTimer = 0; tower.anticipation = 0; }
        else if (tower.chargeTimer <= 0) { const target=tower.pendingTarget;tower.pendingTarget=null;this.releaseFire(tower,target); }
        continue;
      }
      if (tower.cooldown > 0) continue;
      const target = this.pickTarget(tower);
      if (target) this.beginAttack(tower, target);
    }
  }

  beginAttack(tower,target){
    const kind=tower.def.projectile;const windup=kind==='meteor'?0.18:kind==='rock'?0.13:kind==='arc'?0.07:kind==='bolt'?0.035:0.055;
    tower.pendingTarget=target;tower.chargeTimer=windup;tower.anticipation=1;tower.targetAngle=Math.atan2(target.y-tower.y,target.x-tower.x);
  }

  pickTarget(tower) {
    const rangeSquared = tower.stats.range ** 2;
    const list = this.game.enemies.filter((enemy) => !enemy.dead && (enemy.x - tower.x) ** 2 + (enemy.y - tower.y) ** 2 <= rangeSquared);
    if (!list.length) return null;
    switch (tower.targetMode) {
      case 'last': list.sort((a, b) => a.distance - b.distance); break;
      case 'strong': list.sort((a, b) => (b.hp + b.shield) - (a.hp + a.shield)); break;
      case 'weak': list.sort((a, b) => (a.hp + a.shield) - (b.hp + b.shield)); break;
      case 'closest': list.sort((a, b) => ((a.x - tower.x) ** 2 + (a.y - tower.y) ** 2) - ((b.x - tower.x) ** 2 + (b.y - tower.y) ** 2)); break;
      default: list.sort((a, b) => b.distance - a.distance);
    }
    return list[0];
  }

  releaseFire(tower, target) {
    const stats = tower.stats;
    const def = tower.def;
    let rate = stats.rate;
    for (const ally of this.game.towers) {
      if (ally === tower || !ally.def.auraRate) continue;
      const allySpec=getSpecialization(ally.def.element,ally.specialization);const aura=(ally.def.auraRate||0)*(allySpec?.mods.aura||1);
      if ((ally.x - tower.x) ** 2 + (ally.y - tower.y) ** 2 <= (ally.def.auraRadius || 0) ** 2) rate *= 1 + aura;
    }

    tower.cooldown = 1 / rate;
    tower.flash = 1;
    tower.recoil = 1;
    tower.anticipation = 0;
    tower.targetAngle = Math.atan2(target.y - tower.y, target.x - tower.x);
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


  tryUltimate(tower){
    const ultimate=ULTIMATES[tower.def.element];if(!ultimate)return false;
    const range=tower.stats.range*1.08;const targets=this.game.enemies.filter(e=>!e.dead&&Math.hypot(e.x-tower.x,e.y-tower.y)<=range);if(!targets.length)return false;
    tower.ultimateTimer=ultimate.cooldown;tower.ultimateFlash=1;this.game.state.ultimates+=1;this.game.audio.playUi?.('ultimate');
    const center=targets[Math.min(targets.length-1,Math.floor(targets.length*.38))];this.game.particles.damageText(tower.x,tower.y-26,ultimate.name,ultimate.color,true,10);
    if(tower.def.element==='fire'){
      for(const enemy of targets.slice(0,5)){const dealt=enemy.takeRawDamage(tower.stats.damage*1.5,false,true,true);tower.registerDamage(dealt);enemy.addEffect('burn',{remaining:4,dps:tower.stats.damage*.22,source:tower,bypassWard:true});this.game.particles.explosion(enemy.x,enemy.y,'#ff7a35',.82);if(enemy.dead)this.kill(tower,enemy);}this.game.renderer.kickCamera(.048,center.x,center.y);this.game.triggerHitStop?.(.035);
    }else if(tower.def.element==='ice'){
      for(const enemy of targets){enemy.addEffect('slow',{remaining:4.5,amount:.62,bypassWard:true});if(Math.random()<.42)enemy.addEffect('freeze',{remaining:.8,bypassWard:true});}this.game.particles.ring(tower.x,tower.y,'#c9f8ff',10,range,5,.7,.72);
    }else if(tower.def.element==='lightning'){
      const hit=targets.sort((a,b)=>b.distance-a.distance).slice(0,8);for(const enemy of hit){const dealt=enemy.takeRawDamage(tower.stats.damage*.95,false,true,true);tower.registerDamage(dealt);this.game.particles.impact('lightning',enemy.x,enemy.y,'bolt',true);if(enemy.dead)this.kill(tower,enemy);}this.game.particles.beam([{x:tower.x,y:tower.y},...hit.map(e=>({x:e.x,y:e.y}))],ultimate.color);
    }else if(tower.def.element==='nature'){
      for(const enemy of targets){enemy.addEffect('poison',{remaining:6,dps:tower.stats.damage*.18,stacks:2,source:tower,bypassWard:true});enemy.addEffect('slow',{remaining:2.4,amount:.28,bypassWard:true});}this.game.particles.ring(tower.x,tower.y,ultimate.color,8,range*.85,4,.65,.7);
    }else if(tower.def.element==='earth'){
      for(const enemy of targets){const dealt=enemy.takeRawDamage(tower.stats.damage*1.18,false,true,true);tower.registerDamage(dealt);enemy.addEffect('stun',{remaining:.72,bypassWard:true});this.game.particles.impact('earth',enemy.x,enemy.y,'rock',true);if(enemy.dead)this.kill(tower,enemy);}this.game.renderer.kickCamera(.052,center.x,center.y);this.game.triggerHitStop?.(.04);
    }else{
      for(const enemy of targets.slice(0,7)){enemy.addEffect('mark',{remaining:5,amount:1.28,bypassWard:true});const dealt=enemy.takeRawDamage(tower.stats.damage*.72,true,true,true);tower.registerDamage(dealt);this.game.particles.combo('resonance',enemy.x,enemy.y,ultimate.color);if(enemy.dead)this.kill(tower,enemy);}this.game.particles.ring(tower.x,tower.y,ultimate.color,8,range*.72,3.5,.58,.8);
    }
    this.game.ui.toast(`${ultimate.name} · ${tower.def.name}`);return true;
  }

  chain(tower, target, damage) {
    const hit = [];
    let current = target;
    let amount = damage;
    const spec=getSpecialization(tower.def.element,tower.specialization);const max=(tower.def.chain||3)+(spec?.mods.chain||0);
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

    const heavy = projectile.splash > 45 || projectile.kind === 'meteor' || projectile.kind === 'rock';
    this.game.particles.impact(projectile.element, target.x, target.y, projectile.kind, heavy);
    this.game.audio.playImpact(projectile, target);
    if (heavy) this.game.renderer.kickCamera(projectile.kind === 'meteor' ? 0.035 : 0.018, target.x, target.y);
  }

  protectorMultiplier(enemy) {
    let reduction = 0;
    for (const protector of this.game.enemies) {
      if (protector === enemy || protector.dead || !protector.protectorAura) continue;
      if (Math.hypot(protector.x - enemy.x, protector.y - enemy.y) <= protector.protectorRadius) reduction = Math.max(reduction, protector.protectorAura);
    }
    return 1 - Math.min(0.28, reduction);
  }

  applyStatus(tower, enemy, name, data) {
    const applied = enemy.addEffect(name, data);
    if (applied) return true;
    if (enemy.wardFlash > 0.85 && enemy.canCombo('ward-feedback')) {
      enemy.lockCombo('ward-feedback', 0.7);
      this.game.particles.damageText(enemy.x, enemy.y - enemy.def.size - 9, 'WARD', '#e7c8ff', false, 10);
      this.game.particles.burstEvent('flash', enemy.x, enemy.y, '#d4a7ff', 0.42, 0.16);
    }
    return false;
  }

  triggerCombo(id, tower, enemy, bonusDamage = 0, ignoreArmor = false) {
    const combo = ELEMENTAL_COMBOS[id];
    if (!combo || !enemy.canCombo(id) || enemy.dead) return 0;
    enemy.lockCombo(id, id === 'resonance' ? 0.48 : 0.65);
    const dealt = bonusDamage > 0 ? enemy.takeRawDamage(bonusDamage, false, true, ignoreArmor) : 0;
    if (dealt > 0) tower.registerDamage(dealt);
    tower.combos += 1;
    this.game.state.combos += 1;
    this.game.particles.damageText(enemy.x, enemy.y - enemy.def.size - 11, combo.name, combo.color, true, 10);
    this.game.particles.burstEvent(id === 'toxicIgnition' ? 'explosion' : id === 'shatter' ? 'ice' : 'shock', enemy.x, enemy.y, combo.color, id === 'toxicIgnition' ? 0.72 : 0.52, 0.28);
    this.game.audio.playUi?.('combo');
    return dealt;
  }

  resolveCombos(tower, enemy, base) {
    const element = tower.def.element;
    if (element === 'fire' && enemy.effects.has('poison')) {
      const poison = enemy.effects.get('poison');
      const stacks = Math.max(1, poison.stacks || 1);
      const bonus = base * (0.24 + stacks * 0.065);
      if (this.triggerCombo('toxicIgnition', tower, enemy, bonus, true) > 0) {
        enemy.effects.delete('poison');
        this.game.particles.spawn(enemy.x, enemy.y, { color: '#8fe66d', count: 7, power: 48, type: 'smoke', r: 4, life: 0.48, upBias: 8 });
      }
    }

    if (element === 'earth' && (enemy.effects.has('freeze') || (enemy.effects.get('slow')?.amount || 0) >= 0.34)) {
      const dealt = this.triggerCombo('shatter', tower, enemy, base * 0.52, true);
      if (dealt > 0) {
        enemy.effects.delete('freeze');
        const slow = enemy.effects.get('slow');
        if (slow) slow.remaining *= 0.55;
        this.game.particles.spawn(enemy.x, enemy.y, { color: '#dffcff', count: 12, power: 92, type: 'shard', r: 3, life: 0.48, gravity: 22, glow: 7 });
      }
    }

    if (element === 'lightning' && enemy.effects.has('slow')) {
      this.triggerCombo('overload', tower, enemy, base * 0.24, false);
    }

    if (element !== 'arcane' && enemy.effects.has('mark')) {
      this.triggerCombo('resonance', tower, enemy, base * 0.1, false);
    }
  }

  damage(tower, enemy, base, isSplash = false) {
    if (enemy.dead) return;
    const def = tower.def;
    enemy.lastDamageElement = def.element;
    enemy.lastDamageKind = def.projectile;
    const multiplier = elementalMultiplier(def.element, enemy, def.penetration || 0);
    let amount = base * multiplier;
    const spec=getSpecialization(def.element,tower.specialization);const pureFraction=(def.pureFraction||0)+(spec?.mods.pure||0);
    if (pureFraction) { const pure=base*pureFraction;amount=base*(1-pureFraction)*multiplier+pure; }
    if (enemy.effects.has('mark')) amount *= enemy.effects.get('mark').amount || 1;
    amount *= this.protectorMultiplier(enemy);

    const before = enemy.hp + enemy.shield;
    const dealt = enemy.takeRawDamage(amount);
    tower.registerDamage(dealt);

    if (enemy.def.boss && enemy.plates > 0) {
      const pressure = def.projectile === 'rock' || def.projectile === 'meteor' ? 0.5 : def.projectile === 'arc' ? 0.32 : 0.13;
      if (enemy.damagePlate(base * pressure)) {
        this.game.particles.damageText(enemy.x, enemy.y - enemy.def.size - 16, 'ARMURE BRISÉE', '#ffe0a8', true, 11);
        this.game.particles.burstEvent('shock', enemy.x, enemy.y, '#d8aa72', 1.0, 0.42);
        this.game.renderer.kickCamera(0.035, enemy.x, enemy.y);
        this.game.audio.playUi?.('boss');
      }
    }

    if (enemy._damageTextCooldown <= 0 && (!isSplash || this.game.enemies.length < 45)) {
      const critical = multiplier > 1.2;
      const color = multiplier > 1.12 ? ELEMENTS[def.element].light : multiplier < 0.82 ? '#b9bdbc' : '#f5f0df';
      this.game.particles.damageText(enemy.x, enemy.y - enemy.def.size - 5, Math.max(1, Math.round(dealt)), color, critical, critical ? 15 : 11);
      enemy._damageTextCooldown = this.game.enemies.length > 70 ? 0.36 : 0.2;
    }

    this.resolveCombos(tower, enemy, base);
    if (!enemy.dead && def.burn) this.applyStatus(tower, enemy, 'burn', { remaining: def.burnDuration || 3, dps: def.burn * (spec?.mods.burn||1) * (0.8 + tower.level * 0.2), source: tower });
    if (!enemy.dead && def.poison) this.applyStatus(tower, enemy, 'poison', { remaining: def.poisonDuration || 4, dps: def.poison * (spec?.mods.poison||1) * (0.8 + tower.level * 0.2), stacks: 1, source: tower });
    if (!enemy.dead && def.slow) {
      if (this.applyStatus(tower, enemy, 'slow', { remaining: def.slowDuration || 2, amount: Math.min(.72,def.slow*(spec?.mods.slow||1)) })) tower.controlSeconds += (def.slowDuration || 2) * Math.min(1, def.slow + 0.35);
    }
    if (!enemy.dead && def.freezeChance && Math.random() < Math.min(.5,def.freezeChance*(spec?.mods.freeze||1))) this.applyStatus(tower, enemy, 'freeze', { remaining: 0.55 + 0.12 * tower.level });
    if (!enemy.dead && def.stunChance && Math.random() < Math.min(.55,def.stunChance*(spec?.mods.stun||1))) {
      if (this.applyStatus(tower, enemy, 'stun', { remaining: def.stunDuration || 0.5 })) tower.controlSeconds += def.stunDuration || 0.5;
    }
    if (!enemy.dead && def.mark) this.applyStatus(tower, enemy, 'mark', { remaining: def.markDuration || 3, amount: def.mark, bypassWard: false });

    this.checkBossPhase(enemy);
    if (enemy.dead && before > 0) this.kill(tower, enemy);
  }

  checkBossPhase(enemy) {
    if (!enemy.def.boss || enemy.dead) return;
    const ratio = enemy.hp / Math.max(1, enemy.maxHp);
    const phase = ratio <= 0.15 ? 4 : ratio <= 0.4 ? 3 : ratio <= 0.7 ? 2 : 1;
    if (phase <= enemy.bossPhase) return;
    for (let next = enemy.bossPhase + 1; next <= phase; next++) this.game.waveManager?.onBossPhase?.(enemy, next);
    enemy.bossPhase = phase;
  }

  kill(tower, enemy) {
    if (enemy.escaped || enemy._rewarded) return;
    enemy._rewarded = true;
    if (tower) tower.kills += 1;
    this.game.state.kills += 1;
    this.game.state.reward(enemy.reward);
    this.game.state.score += Math.round(enemy.maxHp);
    this.game.particles.death(enemy);

    if (enemy.modifiers?.has('unstable')) {
      for (const nearby of this.game.enemies) {
        if (nearby === enemy || nearby.dead || Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) > 120) continue;
        nearby.addEffect('haste', { remaining: 2.2, amount: 0.18, bypassWard: true });
      }
      this.game.particles.ring(enemy.x, enemy.y, '#ffb86c', 8, 85, 3.2, 0.5, 0.7);
    }

    if (enemy.def.boss) {
      this.game.state.bossesKilled += 1;
      this.game.renderer.kickCamera(0.075, enemy.x, enemy.y);
      this.game.triggerHitStop?.(0.055);
      this.game.renderer.focusOn?.(enemy.x, enemy.y, 0.76, 1.18);
      this.game.ui.banner(`${enemy.def.name.toUpperCase()} ABATTU`, `+${enemy.reward} or · ligne sécurisée`);
    }
  }
}
