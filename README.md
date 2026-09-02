# TowerDefNapst — The Battlefield Update

TowerDefNapst est un tower defense fantasy élémentaire en **Three.js/WebGL**. La simulation reste volontairement simple en coordonnées tactiques 2D, tandis que le champ de bataille est présenté comme un monde 2.5D lisible et composable. **The Battlefield Update (0.6)** renforce surtout la caméra, la profondeur de map, les interactions élémentaires, les boss et l'information tactique sans retirer les systèmes déjà fonctionnels.

## Lancer

```bash
pixi run dev
```

ou :

```bash
npm run dev
```

Le serveur écoute sur **http://localhost:4425**.

Checks :

```bash
pixi run check
```

## Stack

- Three.js 0.185.1 / WebGL
- JavaScript ES Modules
- HTML/CSS pour le HUD contextuel
- Web Audio API pour musique et SFX procéduraux
- Node.js pour le serveur statique
- Pixi (prefix.dev) pour l'environnement reproductible
- GitHub Actions sur Ubuntu 24.04

## Caméra gameplay

La caméra normale n'est plus une caméra d'éditeur 3D.

- pitch gameplay limité à une plage sûre d'environ **41–49°** ;
- yaw volontairement borné pour préserver la composition de la map ;
- zoom amorti et borné ;
- pan avec inertie et limites de terrain ;
- `Home` recentre avec transition ;
- presets `Z` Gameplay, `X` Tactique, `C` Close ;
- `Q/E` ajuste le yaw sans permettre une orientation destructrice ;
- molette : zoom ;
- `Shift + drag` ou bouton milieu : pan ;
- drag / clic droit : rotation contrôlée.

### Photo Mode

`F10` active le Photo Mode. Le jeu est mis en pause, le HUD disparaît et la caméra récupère une plage de rotation/pitch/zoom beaucoup plus large. `F10` ou `Échap` revient au gameplay contrôlé.

Le camera shake possède un réglage 0–100 % et reste réservé aux impacts lourds, phases boss, plaques brisées et dégâts Nexus.

## Battlefield

La scène conserve le terrain procédural existant et ajoute une couche de composition légère :

- bord de plateau rocheux instancié pour éviter l'impression de planche flottante ;
- terrasses et relief périphérique ;
- contact shadow sous le chemin ;
- mousse latérale ;
- cailloux et fleurs instanciés hors des zones tactiques ;
- marqueurs directionnels subtils ;
- bannières sur les virages ;
- points lumineux importants sans multiplier les vraies lights.

Les **18 socles tactiques** restent ceux validés par les tests de couverture. Les socles restent discrets hors construction, s'illuminent en mode build et le ghost de tour + portée apparaît au survol.

## Tours et combat

Les 12 archétypes restent disponibles, trois niveaux chacun. Les modèles procéduraux conservent leurs silhouettes par élément et gagnent une couche de game feel : anticipation légère, ciblage interpolé, recoil, récupération, idle élémentaire limité et feedback d'upgrade.

La sélection affiche maintenant :

- dégâts totaux ;
- DPS récent ;
- kills ;
- temps de contrôle ;
- combos déclenchés ;
- comparaison avant/après de l'upgrade au hover.

Au **niveau III**, chaque école propose désormais deux spécialisations verrouillantes. Le choix modifie réellement les stats et le comportement (zone/mono-cible, contrôle, chaîne, support, dégâts purs…) et ajoute un accent de silhouette visible autour de la tour. Les niveaux III disposent aussi d'une **ultimate automatique** à long cooldown — Meteor Storm, Absolute Zero, Tempest, Ancient Roots, Earthquake ou Singularity — pour créer des pics spectaculaires sans transformer le jeu en MOBA.

## Combos élémentaires

Quatre interactions restent volontairement simples et lisibles :

- **Poison + Feu → Combustion toxique** : burst supplémentaire et consommation du poison ;
- **Gel/slow fort + Terre → Shatter** : gros impact qui ignore l'armure ;
- **Slow + Foudre → Surcharge** : bonus conducteur ;
- **Marque Arcane + élément → Résonance** : amplification ponctuelle.

Chaque combo possède cooldown anti-spam, texte court, VFX et son distinct.

## Ennemis, élites et boss

Les silhouettes/animations existantes sont préservées. Le système de défense est maintenant plus lisible et plus tactique :

- armure pourcentage + armure plate ;
- shield séparé avec recharge pour certains ennemis ;
- ward qui bloque les premiers status ;
- régénération ;
- enrage ;
- protecteurs de proximité.

Modificateurs élites disponibles : **Fortifié, Frénétique, Régénérant, Protecteur, Instable, Corrompu**.

Deux combats boss structurent désormais la campagne :

- vague 20 : **Le Colosse**, deux plaques destructibles ;
- vague 30 : **Archonte du Nexus**, trois plaques et quatre phases.

Les seuils 70 %, 40 % et 15 % déclenchent escortes, reprise de bouclier/protecteurs puis enrage. Les plaques détruites réduisent réellement l'armure et sont visibles autour du boss.

## Vagues et anticipation

Les vagues importantes portent maintenant un nom et les compositions alternent rush, lignes lourdes, résistances élémentaires, groupes mixtes et élites. L'interface affiche la prochaine composition et une indication élémentaire simple.

Après une vague, un délai de préparation de 12 secondes commence. Lancer plus tôt accorde un **bonus d'appel anticipé** proportionnel au temps restant. Sans action, la vague suivante part automatiquement.

Trois difficultés modifient aussi la pression autrement qu'avec un simple multiplicateur de PV : vies du Nexus, économie de départ, vitesse, récompenses et fréquence des élites changent entre **Normal, Veteran et Nightmare**. Après la vague 30, le joueur peut conserver son build et entrer en **Endless** ; les compositions cyclent, les élites montent en pression et des menaces majeures reviennent sur les paliers.

## Audio

La direction précédente reste : **rock/orchestral organique**, sans EDM générique. La musique procédurale dispose maintenant de quatre densités :

- build/calme ;
- wave ;
- intense quand la densité ennemie monte ;
- boss.

Les changements sont appliqués sur les frontières musicales plutôt qu'en coupure brutale. Les tirs lointains et rapides sont réduits sous forte densité pour éviter la cacophonie. Les combos ont un feedback sonore spécifique. Un lit d'ambiance filtré extrêmement discret complète la scène.

Options : volume musique, volume SFX, mute, camera shake.

## Performance

La passe continue à privilégier :

- `InstancedMesh` pour le décor répétitif ;
- pools ennemis/cadavres/bursts ;
- plafond de particules ;
- pas de création de dizaines de PointLights pour les explosions ;
- pas de géométrie/material créée dans les boucles critiques du gameplay ;
- audio répétitif limité ;
- debug F3 avec FPS, ennemis, projectiles, particules, draw calls, triangles, meshes, géométries, lights, pitch/yaw/zoom et cible caméra.

Les smoke tests incluent couverture stratégique, simulation dense, défenses/wards/boss plates, architecture caméra/Photo Mode, couche battlefield, combos et rendu Three.js. Le QA final couvre également campagne 1–30, appels anticipés, phases boss, spécialisations, ultimates, restart par difficulté et bascule Endless.

Le Nexus possède enfin un état de danger visuel sous environ 42 % de vies, et les morts utilisent une variante courte liée au dernier élément ayant porté le coup (glace, feu, foudre, terre, nature ou arcane).
