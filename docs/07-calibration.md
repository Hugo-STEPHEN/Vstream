# 07 — Calibration

Le bouton **réglages** (curseurs) de la barre du haut ouvre la calibration : tout
ce que l'appli supposait « par défaut » devient réglable **par projet**, sauvegardé
dans le fichier, appliqué à travers tous les moteurs, annulable (Ctrl+Z), et
réinitialisable en un clic.

## Ce qu'on peut régler

- **Langue** (FR/EN) et **devise** (symbole), **longueur de pas** (pour le compte
  de pas du spaghetti).
- **Seuils d'alerte** : facteur SMED, alerte rebut, alerte disponibilité, note
  stock (jours), note PCE faible. (Le drapeau « takt dépassé » est structurel et
  non réglable.)
- **Économie des modes de transport** : coût/m et vitesse de marche / chariot / AGV.
- **Bandes de référence des benchmarks** : typique → world-class, par KPI, pour
  coller à votre secteur (process, agroalimentaire, électronique…).

## Pourquoi c'est important

Les valeurs par défaut sont des repères de fabrication discrète. Une usine de
process, un atelier 3×8 ou un site hors zone dollar ont d'autres références.
Calibrez une fois, et les flags, les coûts, les scores, la note et le rapport
suivent — toujours cohérents, jamais codés en dur.

La calibration en vigueur est imprimée dans le **rapport de direction** (section
« Calibration du modèle en vigueur »).
