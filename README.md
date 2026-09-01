# TowerDefNapst — Arcane Bastion 3D

TowerDefNapst est un tower defense fantasy élémentaire jouable dans le navigateur. Depuis la version 0.3, le champ de bataille a été reconstruit en **Three.js/WebGL** : terrain, route, socles, portails, tours, ennemis, projectiles et VFX sont de vrais objets 3D. Le HUD reste en HTML/CSS afin de conserver une interface nette et accessible.

## Stack

- **Three.js 0.185.1** — scène 3D, géométries, matériaux, éclairage, ombres, Raycaster et rendu WebGL.
- **JavaScript ES Modules** — simulation, combat, vagues, entités et synchronisation 3D.
- **HTML/CSS** — HUD, arsenal, panneau de tour, boss bar et écrans de fin.
- **Web Audio API** — SFX procéduraux et ambiance synthétique légère.
- **Node.js** — serveur statique de développement.
- **Pixi (prefix.dev)** — environnement reproductible Ubuntu/Linux et tâches de développement.
- **GitHub Actions / Ubuntu 24.04** — smoke tests et test HTTP sur le port obligatoire `4425`.

Three.js est chargé via un import map versionné dans `index.html`. Le jeu n'utilise plus Canvas2D pour son rendu de gameplay.

## Lancer le projet

Avec Pixi :

```bash
pixi run dev
```

Ou directement avec Node :

```bash
npm run dev
```

Puis ouvrir `http://localhost:4425`.

## Vérifications

```bash
pixi run check
```

Les checks couvrent la syntaxe JS, les invariants du gameplay et la présence de l'architecture Three.js/WebGL complète.

## Architecture

```text
src/
├── config/          # éléments, tours, ennemis, vagues, carte
├── core/            # boucle de jeu et état global
├── entities/        # Tower, Enemy, Projectile
├── render/          # moteur Three.js/WebGL
│   ├── Renderer.js
│   ├── EnvironmentRenderer.js
│   ├── TowerRenderer.js
│   ├── EnemyRenderer.js
│   ├── VfxRenderer.js
│   └── drawing.js   # primitives et conversion simulation -> scène 3D
├── systems/         # combat, vagues, particules, UI, audio
└── ui/              # icônes SVG du HUD
```

La simulation conserve des coordonnées tactiques 2D simples et déterministes. Le renderer les convertit en coordonnées X/Z dans Three.js. Cette séparation permet de garder l'équilibrage et les règles de combat indépendants de la caméra et du moteur graphique.

## Rendu 3D

- Caméra orthographique isométrique avec zoom molette.
- Éclairage Hemisphere + Directional, ombres PCF et tone mapping ACES.
- Terrain low-poly avec vertex colors et herbe instanciée.
- Route 3D en segments avec bordures et pavés irréguliers.
- 18 socles hexagonaux animés, avec feedback de placement.
- Portail d'entrée et Nexus arcanique animés.
- 12 silhouettes de tours réellement distinctes, 2 par élément et détails supplémentaires par niveau.
- 10 profils d'ennemis 3D avec boucliers, barres de vie et états élémentaires.
- Projectiles 3D, trails, particules GPU via `THREE.Points`, chaînes de foudre, anneaux d'impact et damage numbers en sprites.
- Sélection des tours via `THREE.Raycaster`.

## Gameplay conservé

- 6 éléments : Feu, Glace, Foudre, Nature, Terre et Arcane.
- 12 tours, 3 niveaux chacune.
- Résistances/faiblesses élémentaires et pénétration.
- Brûlure, poison, slow, freeze, stun, mark, boucliers et régénération.
- 30 vagues, élites et boss final.
- Ciblage configurable, vente, amélioration, vitesse ×1/×2/×3, score et meilleur score local.

## Déploiement portfolio / WordPress

Le projet reste une application web statique. Il peut être servi dans un sous-dossier ou un sous-domaine, puis intégré à une landing page WordPress dans un `iframe` responsive. Le HUD et la scène Three.js restent isolés du thème WordPress.
