# 05 — Analyse des flux

L'onglet sandbox réunit les outils de décision au-dessus du moteur lean.

## Atelier de scénarios
Figez le modèle courant comme **scénario nommé**, modifiez le canevas, puis
comparez tous les états côte à côte (temps de traversée, PCE, capacité, FPY,
note, avec écarts). Le menu déroulant de la **barre du haut** bascule toute
l'appli entre scénarios. Les scénarios sont sauvegardés dans le projet.

## Charge des postes vs takt
Barres empilées par poste : travail nominal (vert) + pertes (disponibilité,
qualité, changement). Les barres qui franchissent la ligne takt rouge ne tiennent
pas la demande.

## Audit des goulots
Tableau trié par charge : TC, TC global, charge takt, gaspillage par pièce,
drapeaux. Cliquez une ligne pour ouvrir le poste ; l'icône loupe ouvre l'analyse
des taux.

## Co-pilote kaizen
Suggestions déterministes (SMED, TPM, qualité, supermarché tiré). **Chaque impact
est une vraie re-simulation** du moteur complet, pas du texte inventé. « Appliquer »
écrit le changement simulé dans le modèle. « Copier le prompt » exporte le
contexte pour un LLM (le co-pilote génératif n'est pas encore câblé).

## Explorateur de sensibilité
Balaye **un** paramètre d'un poste sur sa plage ; les courbes PCE et capacité sont
25 re-simulations honnêtes, sans interpolation.

## Audit transport (VSM ↔ Spaghetti)
Trajets liés à un poste, alloués par pièce produite — voir [04](04-spaghetti.md).

## ESG (E-VSM)
Énergie (kWh/j), CO₂e (kg/j) et masse de rebut, à partir du profil kW et du rebut
de chaque poste, au facteur réseau et au poids pièce du projet.

## Connecteurs REST/Webhook
Contrat typé `POST /api/v1/metrics/update` pour piper des temps de cycle mesurés
(IoT, scanners, MES) — point d'amorce d'intégration.
