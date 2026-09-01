# TowerDefNapst — Arcane Bastion

TowerDefNapst est un Tower Defense fantasy/élémentaire jouable dans le navigateur. La direction vise une lecture stratégique claire, une carte pseudo-isométrique, des tours très identifiables et des combats riches en feedback visuel, sans reprendre d'assets propriétaires d'autres jeux.

La première version est volontairement **sans dépendance npm runtime** : le rendu est procédural sur Canvas 2D, l'UI est en HTML/CSS et le serveur de développement est un petit serveur Node natif. Cela garde le projet rapide à lancer, facile à profiler et simple à faire évoluer vers WebGL/Three/PixiJS si la direction artistique l'exige plus tard.

## Installation

Prérequis : Ubuntu 24.04 et [Pixi](https://pixi.sh/) installé.

```bash
cd /home/mamad/towerdefnapst
pixi install
```

`pixi install` résout Node.js 20–22 depuis conda-forge et génère/met à jour `pixi.lock` si nécessaire.

## Lancement

Le serveur écoute sur `0.0.0.0:4425` et est accessible via :

- http://localhost:4425
- http://127.0.0.1:4425

Commande Pixi portable :

```bash
cd /home/mamad/towerdefnapst
pixi run dev
```

La commande demandée pour l'environnement cible est :

```bash
cd /home/mamad/towerdefnapst
pixi dev
```

> **Note Pixi** — le manifeste expose bien une tâche `dev`. Dans Pixi standard, la syntaxe documentée pour invoquer une tâche est `pixi run dev`. Un `pixi dev` littéral n'est pas un alias de tâche défini par `pixi.toml` ; il ne peut être garanti depuis le dépôt seul sans extension/alias Pixi installé globalement. Le projet garde donc `pixi run dev` comme commande officiellement reproductible, tout en réservant le nom de tâche `dev` attendu.

## Gameplay

Boucle principale : préparation → construction/amélioration → lancement manuel d'une vague → combat → récompense → nouvelle décision stratégique.

Le jeu contient actuellement :

- 30 vies initiales, économie en or, revenu croissant, score et meilleur score local ;
- 30 vagues configurables avec compositions mixtes et boss aux paliers importants ;
- 10 profils ennemis : normal, rapide, tank, mage résistant, résistances élémentaires, régénération, bouclier, élite et boss ;
- 12 archétypes de tours, soit 2 par élément ;
- 3 niveaux par tour, amélioration et revente ;
- ciblage `Premier`, `Dernier`, `Plus fort`, `Plus faible`, `Plus proche` ;
- projectiles, splash, chain lightning, burn, poison, slow, freeze, stun et marque arcanique ;
- pause et vitesses ×1 / ×2 / ×3 ;
- game over, victoire et redémarrage ;
- sauvegarde locale du meilleur score et des réglages audio ;
- mode debug avec FPS et compteurs d'entités.

### Éléments

Le système n'utilise pas un bonus uniforme. Chaque profil ennemi possède une matrice de multiplicateurs significatifs et les mécaniques changent réellement la façon de jouer :

| Élément | Identité | Exemples de mécanique |
| --- | --- | --- |
| Feu | burst / attrition | brûlure, explosions |
| Glace | contrôle | ralentissement, gel |
| Foudre | cadence / multi-cible | chaîne, synergie sur cible ralentie |
| Nature | DoT | poison cumulable qui ignore le bouclier |
| Terre | impact | splash, stun, cadence lente |
| Arcane | anti-résistance | pénétration, dégâts purs partiels, marque amplificatrice |

Les profils `ember`, `glacial`, `storm`, `verdant`, `stone` et `warded` créent des résistances et faiblesses allant approximativement de ×0,32 à ×1,50. La pénétration arcanique réduit les résistances au lieu d'ajouter simplement un bonus de dégâts fixe.

## Contrôles

- **Clic sur une carte de tour** : choisit une construction.
- **Clic sur un socle runique** : construit si l'emplacement est libre et l'or suffisant.
- **Clic sur une tour** : ouvre ses statistiques et actions.
- **Échap** : annule la construction / désélectionne.
- **Espace** : pause / reprise.
- **1 / 2 / 3** : vitesse ×1 / ×2 / ×3.
- **D** : affiche/masque le debug.
- **Lancer vague** : démarre manuellement la vague suivante.

Pendant le placement, les socles valides sont mis en évidence, les emplacements occupés deviennent rouges et l'aperçu de portée change de couleur selon la validité du placement.

## Architecture

```text
TowerDefNapst/
├── index.html
├── styles.css
├── pixi.toml
├── package.json
├── scripts/
│   ├── dev-server.mjs        # serveur statique 0.0.0.0:4425
│   └── check-modules.mjs     # import/syntax smoke check
├── src/
│   ├── main.js
│   ├── config/
│   │   ├── elements.js       # identité élémentaire + résistances
│   │   ├── towers.js         # 12 archétypes + progression
│   │   ├── enemies.js        # profils ennemis
│   │   ├── waves.js          # difficulté et compositions
│   │   └── map.js            # chemin, socles, décor
│   ├── core/
│   │   ├── Game.js           # orchestration et boucle principale
│   │   └── GameState.js      # économie / vies / score / vitesse
│   ├── entities/
│   │   ├── Enemy.js
│   │   ├── Tower.js
│   │   └── Projectile.js
│   ├── systems/
│   │   ├── WaveManager.js
│   │   ├── CombatSystem.js
│   │   ├── ParticleSystem.js
│   │   ├── AudioManager.js
│   │   └── UIManager.js
│   └── render/
│       └── Renderer.js       # map + entités + effets Canvas 2D
├── tests/
│   └── core-smoke.mjs
└── .github/workflows/ci.yml
```

La logique de balance est séparée du runtime. Les fichiers de `src/config/` sont le point d'entrée pour ajuster coûts, dégâts, cadence, portée, résistances, compositions de vagues ou layout de carte sans réécrire les systèmes.

## Configuration

### Ajouter ou équilibrer une tour

Modifier `src/config/towers.js`. Une tour définit notamment :

```js
{
  id,
  name,
  element,
  cost,
  damage,
  rate,
  range,
  projectile,
  special,
  // options : burn, poison, slow, chain, splash, stunChance,
  // penetration, mark, auraRate, pureFraction, etc.
}
```

### Ajouter un ennemi

Modifier `src/config/enemies.js`, puis l'utiliser dans `src/config/waves.js`.

### Modifier les résistances

`src/config/elements.js` contient les profils de multiplicateurs. Une résistance inférieure à 1 réduit réellement le canal concerné ; une valeur supérieure à 1 matérialise une faiblesse. L'Arcane peut pénétrer une partie de la résistance.

### Modifier les vagues

`src/config/waves.js` contient un générateur de 30 vagues. La difficulté fait varier la composition, les timings, les profils résistants, les élites et les boss, en plus de la montée de statistiques.

## Développement

Vérifications locales :

```bash
cd /home/mamad/towerdefnapst
pixi run check
```

Ou, avec un Node système compatible :

```bash
npm run check
```

Le smoke test vérifie entre autres :

- les 12 tours et les 6 éléments ;
- la progression niveau 1 → 3 ;
- les résistances/faiblesses ;
- la présence du boss final ;
- la continuité du déplacement ennemi sur le chemin ;
- le comportement du poison face aux boucliers.

La CI GitHub tourne sur **Ubuntu 24.04**, exécute `pixi run check`, lance le serveur et vérifie une réponse HTTP réelle sur le port **4425**.

## Performance

La version actuelle limite les coûts inutiles de plusieurs façons :

- boucle de jeu au delta time avec borne maximale de frame ;
- suppression systématique des projectiles et ennemis morts ;
- cap de particules ;
- calculs de portée en distance au carré avant ciblage ;
- aucune allocation d'asset par frame ;
- rendu procédural sans chargement de texture externe ;
- compteurs debug pour surveiller ennemis, projectiles et particules.

Pour des vagues de plusieurs centaines d'ennemis, l'étape suivante recommandée serait un index spatial uniforme pour le ciblage et un pool d'objets pour projectiles/particules.

## Direction artistique et assets

L'identité visuelle est originale : terrain végétal, pierre, ruines, cristaux, portails, glows et palette élémentaire sont dessinés procéduralement. Aucun modèle, texture, son ou élément d'UI propriétaire d'Element TD n'est inclus.

## État de la référence fournie

Aucun fichier image n'était attaché aux ressources accessibles de cette session au moment de l'implémentation. La composition a donc été construite à partir de la description détaillée du brief (vue stratégique, chemin lisible, fantasy élémentaire, portails, cristaux et attaques lumineuses). Une image de référence réellement jointe pourra servir à un second passage d'art direction sans modifier les systèmes de gameplay.
