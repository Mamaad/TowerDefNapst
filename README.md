# TowerDefNapst — Arcane Bastion 3D

TowerDefNapst est un tower defense fantasy élémentaire jouable dans le navigateur. Le champ de bataille est rendu en **Three.js/WebGL** tandis que la simulation de combat reste séparée du rendu 3D. La passe 0.4 transforme la première migration Three.js en expérience beaucoup plus lisible et tactique : caméra libre, socles réellement utiles, ennemis identifiables par leur silhouette, animations, VFX poolés et bande-son de bataille organique à intensité variable.

## Stack

- **Three.js 0.185.1** — scène 3D, géométries, matériaux, caméra orthographique, éclairage, ombres, Raycaster et rendu WebGL.
- **JavaScript ES Modules** — simulation, combat, vagues, entités et synchronisation 3D.
- **HTML/CSS** — HUD, arsenal, panneau de tour, boss bar et écrans de fin.
- **Web Audio API** — musique procédurale rock/orchestrale légère et sound design des tours/impacts.
- **Node.js** — serveur statique de développement.
- **Pixi (prefix.dev)** — environnement reproductible Ubuntu/Linux et tâches de développement.
- **GitHub Actions / Ubuntu 24.04** — smoke tests et test HTTP sur le port obligatoire `4425`.

Three.js est chargé via un import map versionné dans `index.html`. Le jeu n'utilise plus Canvas2D pour son rendu de gameplay ; un petit CanvasTexture reste utilisé uniquement pour les damage numbers 3D.

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

## Contrôles caméra

- **Drag gauche sur le terrain** : rotation orbitale quand aucun placement n'est en cours.
- **Drag droit / molette pressée / Alt + drag** : rotation orbitale.
- **Shift + drag** : déplacement de la cible caméra.
- **Molette** : zoom.
- **Q / E** : rotation par pas.
- **WASD / flèches** : pan de la caméra.
- **R** ou le bouton caméra du HUD : recentrer la vue.

Les clics de sélection sont neutralisés après un vrai drag caméra pour éviter de placer ou sélectionner une tour involontairement.

## Gameplay et lisibilité

La carte conserve le même chemin et le même concept général, mais les 18 socles ont été repositionnés autour des virages, doubles voies et zones de recouvrement. La portée tactique de référence est de **140 unités** :

- chaque socle se trouve à une distance utile du chemin ;
- chaque socle couvre une longueur de trajet significative avec une tour courte portée ;
- chaque portion échantillonnée du chemin est couverte par au moins un socle à cette portée de référence ;
- les socles plus éloignés des virages conservent un intérêt pour les tours à longue portée.

Sélectionner un socle ou une tour affiche un disque de portée semi-transparent avec contour et repères subtils. Le HUD indique aussi le rôle tactique du socle.

La scène a été ré-éclairée pour préserver le style fantasy tout en améliorant la lecture : exposition ACES relevée, lumière ambiante et hemisphere renforcées, key/fill/rim lights mieux équilibrées, terrain plus coloré, route plus claire, marqueurs de voie et halos de spawn/Nexus. Les ombres restent limitées à la lumière principale.

## Ennemis et animations

Les dix profils ne reposent plus sur une simple variation de couleur. Ils ont des silhouettes et équipements distincts :

- soldat standard avec arme et armure légère ;
- runner plus petit avec membres longs et pose rapide ;
- tank massif avec plaques et bouclier ;
- mage en robe avec bâton et orbe ;
- salamandre de braise quadrupède ;
- spectre de givre flottant et cristallin ;
- brute verdoyante en bois/vignes ;
- gardien prismatique avec panneaux de protection ;
- élite à double lame et armure du Néant ;
- boss géant multi-bras avec noyau et couronne.

La locomotion est liée à la distance réellement parcourue : slow, freeze et stun se reflètent donc directement dans l'animation. Les ennemis réagissent aux impacts, ont une animation d'apparition, puis une courte chute/disparition à la mort avant retour dans un pool. Les barres de vie sont billboardées vers la caméra et restent cachées à pleine vie, sauf pour le boss.

Les effets de statut ont leurs propres lectures 3D : éclats de glace, braises, motes de poison et sparks de stun, sans recolorer entièrement les personnages.

## Tours, impacts et VFX

Les 12 tours conservent leur gameplay et leur identité élémentaire. Les tirs ont maintenant des vitesses, trails et feedbacks différents selon la famille : arcs très rapides, roches lourdes, météores visibles avec fumée, cristaux de glace, chaînes de foudre et projectiles élémentaires.

Les impacts combinent plusieurs couches en restant bornés : flash, particules, anneaux, shockwaves, fumée, debris ou fragments selon l'élément. Les explosions lourdes utilisent une séquence flash / cœur / shockwave / sparks / fumée plutôt qu'un simple disque orange.

Le renderer VFX réutilise les vues d'explosion et l'historique des trails. Le système de particules possède un pool et des plafonds explicites : **900 particules** et **48 bursts** maximum. Les damage numbers sont petits, courts et limités afin d'éviter un écran de type MMORPG.

Le portail d'entrée joue un feedback de spawn, et la fin de vague déclenche une notification, un feedback lumineux autour du Nexus et un son de réussite.

## Audio

La précédente nappe synthétique continue a été remplacée par un score procédural conçu comme une bataille fantasy/rock légère, sans structure EDM, dubstep ou synthwave :

- batterie acoustique simulée : kick, caisse claire, charley et toms ;
- basse et cordes/guitare pincées via synthèse de corde de type Karplus-Strong ;
- stabs de cuivres/harmoniques pour la tension ;
- progression harmonique en Ré mineur avec motifs courts pour éviter la fatigue.

Trois intensités principales sont utilisées : **construction**, **vague** et **boss**. Les changements sont appliqués aux frontières de mesure pour éviter les transitions brutales. Victoire et défaite ont leur propre résolution.

Le sound design différencie les tirs et impacts selon le projectile/élément, avec variation légère de pitch et throttling par famille afin qu'une grande quantité de tours rapides ne crée pas de cacophonie.

Les options du HUD exposent :

- volume musique ;
- volume effets sonores ;
- mute.

## Performance

La passe 0.4 évite de créer/détruire en boucle les objets coûteux :

- géométries et matériaux ennemis partagés ;
- pools par famille d'ennemis et cleanup court des cadavres ;
- pool de particules ;
- pool des bursts VFX ;
- herbe instanciée ;
- une seule lumière directionnelle projette des ombres ;
- plafonds explicites pour particules, bursts, damage numbers et trails.

Le smoke test de bataille simule 120 ennemis avec les 12 familles de tours, met à jour la simulation à 60 Hz et vérifie que les positions/HP restent finis, que le chemin est effectivement défendu et que projectiles/VFX restent bornés.

## Vérifications

```bash
pixi run check
```

Les checks couvrent :

- syntaxe de tous les modules JavaScript ;
- invariants élémentaires et 30 vagues ;
- couverture stratégique de chaque socle et du chemin complet ;
- déplacement, poison/bouclier et simulation dense d'ennemis ;
- architecture Three.js, caméra libre, éclairage, pooling et 12 builders de tours / 10 builders d'ennemis ;
- direction musicale organique et états construction/vague/boss ;
- stress test de combat avec plafonds VFX.

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

La simulation conserve des coordonnées tactiques 2D déterministes. Le renderer les convertit en coordonnées X/Z dans Three.js. Cette séparation garde l'équilibrage et les règles de combat indépendants de la caméra et du moteur graphique.

## Gameplay conservé

- 6 éléments : Feu, Glace, Foudre, Nature, Terre et Arcane.
- 12 tours, 3 niveaux chacune.
- Résistances/faiblesses élémentaires et pénétration.
- Brûlure, poison, slow, freeze, stun, mark, boucliers et régénération.
- 30 vagues, élites et boss final.
- Ciblage configurable, vente, amélioration, vitesse ×1/×2/×3, score et meilleur score local.

## Déploiement portfolio / WordPress

Le projet reste une application web statique. Il peut être servi dans un sous-dossier ou un sous-domaine, puis intégré à une landing page WordPress dans un `iframe` responsive. Le HUD et la scène Three.js restent isolés du thème WordPress.
