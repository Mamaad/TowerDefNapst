import { TowerRenderer } from './TowerRenderer.js';
import { ELEMENTS } from '../config/elements.js';

export class BattlefieldTowerRenderer extends TowerRenderer {
  updateTower(view, tower, time) {
    super.updateTower(view, tower, time);
    const head = view.getObjectByName('head');
    if (head) {
      const anticipation = tower.anticipation || 0;
      head.position.z -= anticipation * 0.025;
      const brace = 1 - anticipation * 0.025;
      head.scale.set(brace, 1 + anticipation * 0.018, brace);
    }

    const crown = view.getObjectByName('level-crown');
    if (crown) {
      const upgrade = tower.upgradeFx || 0;
      crown.material.opacity = Math.min(0.95, 0.66 + upgrade * 0.26 + Math.sin(time * 2.5 + tower.phase) * 0.06);
      crown.scale.setScalar(1 + upgrade * 0.16);
    }

    const pulse = view.getObjectByName('pulse-core');
    if (pulse?.material && tower.level >= 2) {
      const element = ELEMENTS[tower.def.element];
      if (pulse.material.emissive) pulse.material.emissive.set(element.color);
      if (pulse.userData.baseEmissive == null) pulse.userData.baseEmissive = pulse.material.emissiveIntensity || 0.8;
      pulse.material.emissiveIntensity = Math.min(3.2, pulse.userData.baseEmissive + tower.flash * 0.5 + tower.upgradeFx * 0.45);
    }

    const interval = tower.level >= 3 ? 0.32 : 0.52;
    if ((view.userData.lastIdleParticle ?? -999) + interval <= time && this.game.particles.items.length < this.game.particles.maxParticles * 0.72) {
      view.userData.lastIdleParticle = time + tower.phase * 0.01;
      const element = ELEMENTS[tower.def.element];
      const type = tower.def.element === 'fire' ? 'spark'
        : tower.def.element === 'ice' ? 'shard'
          : tower.def.element === 'nature' ? 'leaf'
            : tower.def.element === 'earth' ? 'dust'
              : 'orb';
      this.game.particles.spawn(tower.x, tower.y, {
        color: element.light,
        count: 1,
        power: 12,
        type,
        r: tower.level >= 3 ? 1.8 : 1.35,
        life: 0.38,
        glow: tower.def.element === 'lightning' || tower.def.element === 'arcane' ? 5 : 2,
        upBias: 8,
        height: 0.58,
      });
    }
  }
}
