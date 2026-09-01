# TowerDefNapst — Arcane Bastion

TowerDefNapst est un Tower Defense fantasy/élémentaire jouable dans le navigateur. La version `0.2` conserve la boucle de gameplay et remplace la direction artistique de prototype par un rendu Canvas 2.5D procédural plus dense : terrain multicouche, chemin pavé, silhouettes de tours dédiées, ennemis distincts, VFX élémentaires et HUD de jeu compact.

Aucun asset propriétaire d'Element TD n'est utilisé. La référence sert uniquement de niveau d'ambition pour la lisibilité, la densité, la profondeur et le feedback de combat.

## Installation

Prérequis : Ubuntu 24.04 et Pixi.

```bash
cd /home/mamad/towerdefnapst
pixi install
```

## Lancement

La tâche de développement écoute sur `0.0.0.0:4425` :

```bash
cd /home/mamad/towerdefnapst
pixi run dev
```

Puis ouvrir :

```text
http://localhost:4425
```

Le manifeste expose une tâche nommée `dev`. La CLI Pixi standard exécute les tâches via `pixi run dev`; `pixi dev` n'est pas une sous-commande configurable depuis `pixi.toml` seul.

Avec Node.js 20+ déjà installé :

```bash
npm run dev
```

## Gameplay

Boucle : préparation → construction/amélioration → lancement manuel d'une vague → combat → récompenses → nouvelle décision stratégique.

Le jeu comprend :

- vies, or, vague, score et revenu ;
- pause et vitesses ×1 / ×2 / ×3 ;
- 30 vagues configurables ;
- boss aux paliers majeurs ;
- 12 tours, soit deux archétypes par élément ;
- niveaux 1 → 2 → 3 ;
- amélioration et revente ;
- cinq priorités de ciblage ;
- résistances/faiblesses élémentaires ;
- burn, poison, slow, freeze, stun, splash, chain lightning et pénétration arcanique ;
- game over, victoire, redémarrage et meilleur score local.

## Direction artistique

La carte est générée sans texture externe :

- terrain naturel à variations de teinte, herbe, fleurs, pierres et micro-détails ;
- chemin composé de couches d'ombre, bordure, terre et pavés irréguliers ;
- arbres, buissons, rochers, ruines et cristaux avec ombres et faces éclairées ;
- portail d'entrée et Nexus construits en pierre avec énergie animée ;
- socles de construction discrets au repos et runes actives uniquement en mode placement ;
- lumière magique localisée pour conserver un terrain naturel plutôt qu'un écran « néon ».

### Tours

Chaque archétype possède désormais sa silhouette propre dans `src/render/TowerRenderer.js` :

- **Spire de Braise** : obélisque noir fissuré et flamme ;
- **Forge Magmatique** : four massif et cuve de magma ;
- **Obélisque Givré** : pierre froide et cristal vertical ;
- **Prisme Cryo** : prisme flottant en rotation ;
- **Bobine Volt** : double bobine métallique ;
- **Pylône Tempête** : pylon conducteur et arcs ;
- **Nid d'Épines** : racines radiales ;
- **Sanctuaire Sylvestre** : tige et corolle magique ;
- **Bastion Tellurique** : fortin lourd ;
- **Marteau Sismique** : masse mécanique en pierre ;
- **Œil Arcanique** : œil/orbite énergétique ;
- **Tisseur de Faille** : deux pylônes et faille centrale.

Le niveau modifie la taille, les ornements et l'intensité énergétique. Construction, tir et amélioration possèdent leurs propres micro-animations.

### Ennemis

`src/render/EnemyRenderer.js` dessine des silhouettes spécifiques pour les familles normal, rapide, tank, mage, élémentaires, régénération, bouclier, élite et boss. Les statuts sont visibles directement sur les unités, sans dépendre uniquement de la couleur.

### VFX

Le système de particules gère :

- particules typées : sparks, fumée, éclats de glace, feuilles, poussière ;
- impacts élémentaires dédiés ;
- anneaux/shockwaves ;
- chaînes d'éclairs stables ;
- nombres de dégâts limités en forte densité ;
- effets de construction, amélioration, vente, mort et fuite au Nexus ;
- pooling des particules pour limiter les allocations.

## Interface

La map occupe l'intégralité de la fenêtre. Le HUD et le panneau de construction sont des overlays compacts afin de conserver l'essentiel de l'écran pour le combat.

L'arsenal est filtré par élément avec un mini icon set SVG original. Les anciens emoji et cartes de dashboard ont été supprimés. Le panneau d'une tour sélectionnée montre uniquement les informations utiles : dégâts, DPS, portée, cadence, trait, ciblage, amélioration et revente.

Un boss actif affiche une barre de vie dédiée au centre supérieur.

## Contrôles

- clic sur un élément puis une tour : choix de construction ;
- clic sur un socle runique : construction ;
- clic sur une tour : sélection ;
- `Échap` : annuler / désélectionner ;
- `Espace` : pause ;
- `1`, `2`, `3` : vitesse ;
- `D` : debug ;
- `Lancer vague` : démarrage manuel.

## Architecture

```text
src/
├── config/
│   ├── elements.js
│   ├── enemies.js
│   ├── map.js
│   ├── towers.js
│   └── waves.js
├── core/
│   ├── Game.js
│   └── GameState.js
├── entities/
│   ├── Enemy.js
│   ├── Projectile.js
│   └── Tower.js
├── render/
│   ├── drawing.js
│   ├── EnvironmentRenderer.js
│   ├── EnemyRenderer.js
│   ├── Renderer.js
│   ├── TowerRenderer.js
│   └── VfxRenderer.js
├── systems/
│   ├── AudioManager.js
│   ├── CombatSystem.js
│   ├── ParticleSystem.js
│   ├── UIManager.js
│   └── WaveManager.js
└── ui/
    └── icons.js
```

`Renderer.js` orchestre uniquement les couches. Le terrain, les tours, les ennemis et les VFX sont séparés afin de pouvoir améliorer un système visuel sans transformer le moteur en fichier monolithique.

Le terrain statique est pré-rendu sur un canvas cache. Les entités dynamiques sont triées par profondeur Y, puis rendues au-dessus. Les calculs de gameplay restent séparés du dessin.

## Configuration

### Tours

Modifier `src/config/towers.js` pour les coûts, dégâts, cadence, portée et mécaniques.

### Ennemis

Modifier `src/config/enemies.js` pour les statistiques, boucliers, régénération, armure et profils de résistance.

### Éléments

`src/config/elements.js` définit les couleurs fonctionnelles et la matrice de résistances. La couleur vive est réservée aux attaques et aux points d'attention.

### Vagues

`src/config/waves.js` définit la composition, les timings, titres, sous-titres, récompenses et boss.

### Map

`src/config/map.js` contient le chemin, les socles et les props. Le rendu détaillé reste dans `EnvironmentRenderer.js`.

## Développement et tests

```bash
cd /home/mamad/towerdefnapst
pixi run check
```

ou :

```bash
npm run check
```

Les tests vérifient :

- les 12 tours et 6 éléments ;
- les améliorations ;
- les résistances ;
- les vagues et le boss final ;
- la carte et ses socles ;
- l'exécution de toutes les familles de rendu avec un contexte Canvas simulé ;
- la syntaxe/import des modules sans dépendance runtime externe.

## Performance

Mesures prises dans la version actuelle :

- terrain et décor statiques mis en cache ;
- Canvas unique pour la scène ;
- pooling des particules ;
- plafond de particules ;
- dégâts flottants limités selon le nombre d'ennemis ;
- DOM du HUD rafraîchi à environ 12 Hz et écrit uniquement lorsque les valeurs changent ;
- delta time borné ;
- nettoyage explicite des projectiles, ennemis et effets ;
- aucun asset recréé par frame.

Le prochain palier de performance, si les vagues dépassent régulièrement plusieurs centaines d'unités, est un index spatial uniforme pour le ciblage.
