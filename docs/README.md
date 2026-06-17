# vStream — Documentation

> Suite de Value Stream Intelligence : VSM, analyse des taux (TRS/TRG/TRE),
> spaghetti, analyse des flux et benchmarking. Application web React/TypeScript,
> 100 % front-end, bilingue 🇫🇷/🇬🇧.

This documentation is bilingual-friendly: conceptual guides are written so a
newcomer to lean can follow them, and a glossary maps every acronym to its
English and French meaning.

## Pour commencer / Getting started

| Doc | Sujet |
|---|---|
| [01 — Démarrage](01-getting-started.md) | Installer, lancer, premiers pas, raccourcis |
| [02 — Guide VSM](02-vsm-guide.md) | Les couloirs, les blocs, les connexions, l'échelle des temps |
| [03 — Analyse des taux (débutants)](03-rate-analysis.md) | **TRS / TRG / TRE expliqués simplement**, la cascade des temps NF E 60-182 |
| [04 — Spaghetti](04-spaghetti.md) | Plan d'usine, zones, trajets, coûts de transport |
| [05 — Analyse des flux](05-flow-analytics.md) | Goulots, scénarios, sensibilité, co-pilote kaizen, ESG |
| [06 — Benchmarks](06-benchmarks.md) | Notation A–E vs typique & world-class |
| [07 — Calibration](07-calibration.md) | Régler tous les seuils, coûts et références par projet |
| [08 — Architecture](08-architecture.md) | Pour développeurs : structure du code, moteurs, tests |
| [09 — Glossaire](09-glossary.md) | Tous les acronymes 🇫🇷/🇬🇧 |

## En un coup d'œil

vStream se compose de **moteurs purs** (calcul, sans interface, testés) et de
**vues** (React) qui les affichent. Chaque paramètre que vous touchez recalcule
tout le flux instantanément — rien n'est figé ni codé en dur dans l'affichage.

```
src/
  lib/        moteurs purs : analytics, sensitivity, spaghetti, benchmarks,
              copilot (kaizen), report, calibration, geometry
  data/       dictionnaire des définitions, palette d'éléments, démo
  components/ les cinq espaces de travail + modales
  i18n.ts     dictionnaire de traduction FR/EN
  store.ts    état global (projet, outils, scénarios, undo/redo, autosave)
```

Voir [08 — Architecture](08-architecture.md) pour le détail.
