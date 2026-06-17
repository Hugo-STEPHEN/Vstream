# 01 — Démarrage / Getting started

## Installer & lancer

**Pré-requis :** [Node.js LTS](https://nodejs.org) (fournit `npm`).

**Windows — en un clic :** double-cliquez **`start.bat`** (installe les dépendances
au premier lancement et ouvre le navigateur). `update.bat` récupère les mises à jour.

**Tout OS — terminal :**

```bash
npm install
npm run dev      # serveur de dev sur http://localhost:5173
npm run build    # bundle de production dans dist/
npm test         # suite de tests des moteurs (vitest)
```

Aucun backend. Le projet s'enregistre tout seul dans le navigateur
(localStorage) et s'exporte/réimporte en `.vstream.json`.

## Les cinq espaces de travail

1. **Studio VSM** — la carte du flux de valeur (couloirs information / matière /
   échelle des temps). Voir [02 — Guide VSM](02-vsm-guide.md).
2. **Analyse des taux** — zoom sur un poste : TRS/TRG/TRE. Voir
   [03 — Analyse des taux](03-rate-analysis.md).
3. **Spaghetti** — plan d'usine et déplacements. Voir [04 — Spaghetti](04-spaghetti.md).
4. **Analyse des flux** — goulots, scénarios, sensibilité, kaizen, ESG. Voir
   [05 — Analyse des flux](05-flow-analytics.md).
5. **Benchmarks** — note A–E. Voir [06 — Benchmarks](06-benchmarks.md).

## Premiers pas (5 minutes)

1. L'appli s'ouvre sur la démo **Acme Stamping Line**.
2. Cliquez un procédé (ex. **Spot Weld**) → l'inspecteur à droite montre ses
   paramètres. Bougez un curseur : tout recalcule.
3. **Double-cliquez** ce procédé → vous arrivez dans l'**analyse des taux**.
4. En haut à droite, le bouton **EN/FR** change toute la langue.
5. Le bouton **Exporter** produit un rapport HTML imprimable (→ PDF).

## Raccourcis clavier

| Touche | Action |
|---|---|
| `V` | Outil sélection (VSM) |
| `Suppr` / `Backspace` | Supprimer l'objet sélectionné |
| `Échap` | Annuler une connexion / un tracé |
| `Entrée` | Valider un trajet ou un polygone (Spaghetti) |
| `Ctrl+Z` / `Ctrl+Maj+Z` | Annuler / rétablir |
| Molette | Zoom (centré sur le curseur) |
| Glisser le fond | Déplacer la vue |

Le bouton **livre** 📖 de la barre du haut ouvre les définitions et les raccourcis
dans l'appli, recherchables.
