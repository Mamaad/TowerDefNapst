import * as THREE from 'three';
import { EnemyRenderer } from './EnemyRenderer.js';

export class BattlefieldEnemyRenderer extends EnemyRenderer {
  createEnemy(enemy) {
    const root = new THREE.Group();
    root.name = `enemy-${enemy.def.id}`;
    root.userData.type = enemy.def.id;
    root.userData.walkers = [];
    root.userData.spinners = [];

    const body = new THREE.Group();
    body.name = 'body';
    body.userData.walkers = root.userData.walkers;
    body.userData.spinners = root.userData.spinners;
    root.add(body);

    const scale = enemy.def.size * 0.018;
    const builder = this[enemy.def.model || enemy.def.id] ?? this.grunt;
    builder.call(this, body, enemy, scale, root);

    this.addHealth(root, scale, enemy);
    this.addShield(root, scale);
    this.addStatusVisuals(root, scale);
    this.addHitShell(root, scale);
    this.addDefenseReadability(root, scale, enemy);
    return root;
  }

  addDefenseReadability(root, scale, enemy) {
    const ward = new THREE.Group();
    ward.name = 'ward-indicator';
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(
        this.geometry(`ward-ring-${i}`, () => new THREE.TorusGeometry(scale * (0.95 + i * 0.18), scale * 0.045, 6, 20)),
        new THREE.MeshBasicMaterial({ color: '#d9b5ff', transparent: true, opacity: 0.26, depthWrite: false }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = i * 0.72;
      ward.add(ring);
    }
    ward.position.y = scale * 1.45;
    root.add(ward);

    const plates = new THREE.Group();
    plates.name = 'armor-plates';
    const count = Math.max(0, enemy.maxPlates || 0);
    for (let i = 0; i < count; i += 1) {
      const angle = i / Math.max(1, count) * Math.PI * 2;
      const plate = this.mesh(
        `boss-plate-${scale.toFixed(2)}`,
        () => new THREE.BoxGeometry(scale * 0.62, scale * 0.18, scale * 0.38),
        `boss-plate-mat-${enemy.def.bossKind || 'generic'}`,
        enemy.def.bossKind === 'archon' ? '#d987bd' : '#b49772',
        { roughness: 0.42, metalness: 0.5, emissive: enemy.def.bossKind === 'archon' ? '#8a386e' : '#5f482e', emissiveIntensity: 0.28 },
      );
      plate.position.set(Math.cos(angle) * scale * 1.45, scale * 2.35, Math.sin(angle) * scale * 1.45);
      plate.rotation.y = -angle;
      plates.add(plate);
    }
    root.add(plates);

    const eliteRing = new THREE.Mesh(
      new THREE.RingGeometry(scale * 1.15, scale * 1.25, 32),
      new THREE.MeshBasicMaterial({ color: '#f0b7ff', transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false }),
    );
    eliteRing.name = 'elite-modifier-ring';
    eliteRing.rotation.x = -Math.PI / 2;
    eliteRing.position.y = 0.02;
    root.add(eliteRing);
  }

  updateEnemy(view, enemy, time) {
    super.updateEnemy(view, enemy, time);

    const ward = view.getObjectByName('ward-indicator');
    if (ward) {
      ward.visible = enemy.wardCharges > 0 || enemy.wardFlash > 0.02;
      if (ward.visible) {
        ward.rotation.y = time * 0.55;
        const ratio = enemy.maxWardCharges ? enemy.wardCharges / enemy.maxWardCharges : 0;
        ward.children.forEach((ring, index) => {
          ring.visible = index < Math.max(1, enemy.wardCharges);
          ring.material.opacity = Math.min(0.78, 0.15 + ratio * 0.22 + enemy.wardFlash * 0.48);
          ring.rotation.z = time * (0.18 + index * 0.08) + index * 0.8;
        });
      }
    }

    const plates = view.getObjectByName('armor-plates');
    if (plates) {
      plates.visible = enemy.plates > 0;
      plates.rotation.y = time * 0.18 + enemy.phase;
      plates.children.forEach((plate, index) => {
        plate.visible = index < enemy.plates;
        if (plate.visible) {
          const damaged = enemy.plateMaxHp > 0 ? 1 - enemy.plateHp / enemy.plateMaxHp : 0;
          plate.rotation.z = Math.sin(time * 2.2 + index) * 0.025 + damaged * 0.08;
        }
      });
    }

    const shield = view.getObjectByName('shield');
    if (shield?.visible && enemy.maxShield > 0) {
      const ratio = enemy.shield / enemy.maxShield;
      shield.material.color.set(ratio > 0.55 ? '#a3e8ff' : ratio > 0.22 ? '#d5b3ff' : '#ff9ea0');
      shield.material.opacity = 0.08 + ratio * 0.19 + (ratio < 0.22 ? Math.sin(time * 18) * 0.035 : 0);
    }

    const eliteRing = view.getObjectByName('elite-modifier-ring');
    if (eliteRing) {
      eliteRing.visible = enemy.modifiers?.size > 0;
      if (eliteRing.visible) {
        eliteRing.rotation.z = time * 0.35;
        eliteRing.material.opacity = 0.18 + Math.sin(time * 3 + enemy.phase) * 0.05;
      }
    }

    const body = view.getObjectByName('body');
    if (body && enemy.def.boss) {
      const pressure = Math.max(0, (enemy.bossPhase || 1) - 1);
      body.scale.setScalar(1 + pressure * 0.018 + (enemy.bossEnraged ? Math.sin(time * 7) * 0.014 : 0));
    }
  }
}
