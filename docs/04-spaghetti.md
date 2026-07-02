# 04 — Studio Spaghetti

Le **diagramme spaghetti** trace les déplacements physiques (de l'opérateur, du
chariot, de l'AGV) sur le plan de l'usine. Plus les lignes s'emmêlent, plus il y a
de gaspillage de transport.

## Construire le plan

1. **Image de fond** (optionnel) — chargez un export CAO ou une photo du sol via
   le panneau de droite, et tracez par-dessus. L'image est stockée dans le projet.
2. **Zones** — délimitez machines, stockages, allées. Outil **Zone** (rectangle)
   ou **Poly** (polygone, pour les formes non rectangulaires : cliquez les
   sommets, double-clic ou `Entrée` pour fermer). Les sommets d'un polygone se
   re-glissent ensuite.
3. **Trajets** — outil **Trajet** : cliquez les étapes, double-clic pour terminer.
   Sélectionnez un trajet pour re-glisser ses points.

## Modes de transport

Chaque trajet a un mode, dont le **coût/m** et la **vitesse** sont réglables dans
la calibration :

| Mode | Coût par défaut | Vitesse |
|---|---|---|
| Marche | 0,15 $/m | 1,2 m/s |
| Chariot | 1,20 $/m | 3,0 m/s |
| AGV | 0,40 $/m | 1,7 m/s |

## Économie

En bas : distance, temps et coût par équipe et par an, plus un **ROI meilleur
mode** (économie si chaque trajet utilisait son mode le moins cher). L'épaisseur
du trait suit le nombre d'allers-retours.

## Lien avec le VSM

Sélectionnez un trajet et choisissez le **poste VSM qu'il alimente**. Le trajet
apparaît alors dans l'**audit transport** (onglet Analyse des flux) en
**secondes et coût par pièce produite** — directement comparable au temps de
cycle du poste. Le transport est du muda pur : ce pont rend ce gaspillage visible
à côté de la production.

## Circuits opérateur → temps de production

Un trajet lié à un poste peut être coché **« Circuit opérateur »**, avec un but :
livrer la production à l'étape suivante, chercher l'information (quoi produire),
ou naviguer entre les étapes. Son **temps de marche est alors imputé au temps
disponible du poste lié** : pendant que l'opérateur marche, le poste ne produit
pas.

L'effet traverse tout le modèle — il baisse le TRS du poste, sa capacité, et donc
le flux entier. Dans l'**analyse des taux**, le circuit apparaît comme une étape
rose « Opérateur présent » dans la cascade et comme une barre dans le Pareto des
pertes (souvent la plus grande !). C'est le pont concret entre l'implantation
physique et la performance : raccourcir un trajet ou changer son mode se traduit
directement en points de TRS et en capacité.

## Étalonnage & édition

- **Échelle au trait** : outil **Échelle** (règle) → tracez une ligne sur un
  élément de taille connue (machine, travée, cote CAO) et saisissez sa longueur
  réelle. L'échelle mètres/unité en est déduite (plus besoin de la saisir à la main).
- **Zones = polygones** : toute zone est un polygone éditable. Glissez les sommets
  cyan pour la déformer, cliquez un **+** vert au milieu d'une arête pour ajouter
  un sommet, **Alt/clic-droit** sur un sommet pour le retirer. L'outil **Zone**
  trace un rectangle rapide (lui aussi éditable ensuite) ; l'outil **Poly** trace
  une forme libre.
- **Trajets** : mêmes gestes d'édition (glisser / + / Alt-clic) sur les points.
