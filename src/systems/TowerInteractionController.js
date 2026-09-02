import { WORLD_EVENTS } from '../core/EventBus.js';

function refund(state, cost) {
  state.gold += cost;
  state.goldSpent = Math.max(0, (state.goldSpent || 0) - cost);
}

export function performTowerUpgrade(game) {
  const tower = game?.selectedTower;
  if (!tower || !game.towers?.includes?.(tower)) {
    game?.ui?.toast?.('Sélectionnez une tour à améliorer');
    return false;
  }
  if (tower.level >= 3) {
    game?.ui?.toast?.('Cette tour est déjà niveau maximum');
    return false;
  }

  const cost = Number(tower.upgradeCost);
  if (!Number.isFinite(cost) || cost <= 0) {
    game?.ui?.toast?.('Coût d’amélioration invalide');
    return false;
  }
  if (!game.state?.canSpend?.(cost) || !game.state.spend(cost)) {
    game?.ui?.toast?.('Or insuffisant');
    return false;
  }

  const snapshot = {
    level: tower.level,
    totalSpent: tower.totalSpent,
    upgradeFx: tower.upgradeFx,
  };

  let upgraded = false;
  try {
    upgraded = tower.upgrade() === true && tower.level === snapshot.level + 1;
  } catch {
    upgraded = false;
  }

  if (!upgraded) {
    tower.level = snapshot.level;
    tower.totalSpent = snapshot.totalSpent;
    tower.upgradeFx = snapshot.upgradeFx;
    refund(game.state, cost);
    game?.ui?.toast?.('Amélioration annulée · or remboursé');
    game?.ui?.update?.(true);
    return false;
  }

  game.world?.progression?.refreshTower?.(tower);
  game.world?.bus?.emit?.(WORLD_EVENTS.TOWER_UPGRADED, { tower, cost, level: tower.level });
  game.audio?.playUpgrade?.(tower.def.element);
  game.particles?.upgrade?.(tower.x, tower.y, tower.def.element);
  game.renderer?.kickCamera?.(0.01, tower.x, tower.y);
  game.ui?.toast?.(`${tower.def.name} · niveau ${tower.level}`);
  game.ui?.update?.(true);
  return true;
}

export function performTowerSpecialization(game, id) {
  const tower = game?.selectedTower;
  if (!tower || !game.towers?.includes?.(tower) || tower.level < 3 || tower.specialization) return false;
  const cost = Math.round(tower.def.cost * 0.82);
  if (!game.state?.canSpend?.(cost) || !game.state.spend(cost)) {
    game?.ui?.toast?.('Or insuffisant pour la spécialisation');
    return false;
  }

  const snapshot = { specialization: tower.specialization, totalSpent: tower.totalSpent, upgradeFx: tower.upgradeFx };
  let specialized = false;
  try { specialized = tower.specialize(id) === true; } catch { specialized = false; }
  if (!specialized) {
    tower.specialization = snapshot.specialization;
    tower.totalSpent = snapshot.totalSpent;
    tower.upgradeFx = snapshot.upgradeFx;
    refund(game.state, cost);
    game?.ui?.toast?.('Spécialisation invalide · or remboursé');
    game?.ui?.update?.(true);
    return false;
  }

  tower.totalSpent += cost;
  game.world?.progression?.refreshTower?.(tower);
  game.audio?.playUpgrade?.(tower.def.element);
  game.particles?.upgrade?.(tower.x, tower.y, tower.def.element);
  game.renderer?.kickCamera?.(0.018, tower.x, tower.y);
  game.ui?.toast?.(`${tower.def.name} · spécialisation déverrouillée`);
  game.ui?.update?.(true);
  return true;
}

export function installTowerInteractionController(game) {
  game.upgradeSelected = () => performTowerUpgrade(game);
  game.specializeSelected = (id) => performTowerSpecialization(game, id);
  return game;
}
