# 02 — Guide du Studio VSM

Le **Value Stream Mapping** (cartographie de la chaîne de valeur) dessine le
parcours d'un produit, du fournisseur au client, avec ses procédés, ses stocks et
ses flux d'information.

## Les trois couloirs

La feuille est divisée en trois bandes horizontales **imposées** :

1. **Flux d'information** (haut) — pilotage : contrôle de production, ERP/MES,
   planning, kanban, heijunka, go-see. Les nœuds physiques ne peuvent pas y entrer.
2. **Flux matière** (milieu) — procédés, triangles de stock, supermarchés, FIFO,
   contrôles qualité, boucles de retouche, rebut, logistique (camion / bateau /
   avion / chariot).
3. **Échelle des temps** (bas) — un graphe en créneaux : sommets = temps à valeur
   ajoutée (VA), creux = temps de non-valeur ajoutée (NVA, l'attente en stock).
   En direct : temps de traversée, temps VA et **PCE**.

## La boîte à outils

- Onglet **Flux simple** : les cinq éléments essentiels.
- Onglet **Suite complète** : le catalogue complet, par catégorie, dont la
  catégorie **Annotations** (post-it, éclat kaizen, bloc personnalisable).
- **Recherche floue** : tapez `kanban` et la liste se réduit aux éléments kanban.
- Glissez sur le canevas, ou cliquez pour placer.

## Les annotations

Trois blocs **flottent librement** (hors couloirs, hors calculs) :

- **Post-it** — une note jaune. Tapez le texte dans l'inspecteur.
- **Éclat kaizen** — l'étoile rouge classique pour marquer une opportunité.
- **Bloc personnalisable** — renommez-le, ou chargez une **image** (photo, logo,
  schéma). Idéal pour ce que le catalogue standard ne couvre pas.

Redimensionnez-les via l'inspecteur (largeur / hauteur).

## Les connexions

Sélectionnez une connexion pour changer son type :

- **Poussé** (flèche rayée) — transfert planifié.
- **Tiré** (boucle) — prélèvement déclenché par l'aval.
- **Information manuelle** / **électronique (EDI)**.

## Paramètres d'un procédé

Cliquez un procédé. L'inspecteur expose : temps de cycle, disponibilité, allure,
rebut, changement de série, taille de lot, effectif, puissance (kW), engagement,
ouverture, et une couleur d'accent. **Chaque curseur recalcule tout le flux.**

Un poste qui dépasse le takt **clignote en rouge** ; le goulot du système est
signalé en orange. Le bouton **Analyse des taux** (ou un double-clic) ouvre le
détail TRS/TRG/TRE — voir [03](03-rate-analysis.md).

## Grille & accrochage

Le bouton grille (en bas à droite) permet d'afficher/masquer la grille,
d'**aimanter les nœuds** à la grille, et de régler le pas. Utile pour aligner
proprement les blocs.

## Export

Le menu **Exporter** produit : rapport HTML, projet `.vstream.json`, CSV des
métriques, SVG/PNG de la feuille.
