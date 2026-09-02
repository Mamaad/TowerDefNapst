# TowerDefNapst — World & Strategy Update

Version 0.7 transforme le battlefield en système de jeu : le terrain, la route, les tours, les ennemis et le Nexus réagissent au run.

## Systèmes signature

- **ElementalSurfaceManager** : burning, frozen, wet, charged, poisoned, arcane, fractured et overgrown, avec durée, pooling logique, interactions et Battle Scars.
- **Interactions** : Wet + Lightning, Frozen + Earth, Burning + Poison, Overgrown + Fire, Arcane + élément.
- **MapStrategyManager** : routes prédéfinies, états de map, sanctuaires locaux, socles verrouillés/restaurables et neutralisations temporaires de boss.
- **RunDirector** : wave choices, mutateurs, objectifs, bounties et formations annoncées avant le danger.
- **RunProgressionManager** : artefacts à contreparties, veterancy, traits rares, ascensions légendaires et upgrades Nexus.
- **EnemyWorldManager** : Commanders, Saboteurs, Armored Shell, Splitters, weak points, projectiles interceptables et adaptation boss télégraphiée.
- **TowerWorldManager** : attaques combinées rares entre tours niveau III compatibles.
- **NexusStrategyManager** : shield rechargeable, upgrades, Last Stand et pulse défensif à long cooldown.
- **RunAnalytics** : dégâts élémentaires, tower MVP, boss damage, heatmaps, perfect waves, objectifs, plus gros hit et seed.
- **PerformanceBudgetManager** : priorité gameplay, caps dynamiques et réduction des détails secondaires avant les feedbacks critiques.

## Règle UX

Tout danger important suit : **anticipation → signal → action → impact**. Les gros systèmes exposent gameplay + VFX + SFX + feedback UI. Les surfaces et auras restent sous les unités et ne doivent jamais masquer un boss, un projectile majeur ou un télégraphe.

## Rejouabilité

Chaque run possède une seed. Elle pilote les artefacts, objectifs, bounties, mutateurs, événements de map et choix de vague. Le Battle Report affiche la seed et permet de rejouer la même configuration.

## Tests 0.7

`pixi run check` exécute les suites Battlefield historiques plus :

- `world-systems-smoke.mjs`
- `world-architecture-smoke.mjs`
- `world-stress-smoke.mjs`

Le stress World cible 150 ennemis, 30 tours, surfaces persistantes, rôles ennemis et budgets dynamiques.
