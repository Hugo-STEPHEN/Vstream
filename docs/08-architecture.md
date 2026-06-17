# 08 — Architecture (pour développeurs)

> Principe directeur : **moteurs purs d'un côté, vues de l'autre.** Toute la
> physique lean vit dans des fonctions pures et testées (`src/lib`). Les
> composants React ne font que les appeler et afficher le résultat. Aucune
> métrique n'est codée en dur dans l'affichage.

## Pile technique

React 18 · TypeScript strict (zéro `any`) · Tailwind CSS · Zustand (état) ·
Recharts (graphes) · Motion (animations) · lucide-react (icônes) · Vite (build) ·
Vitest (tests). Aucune dépendance backend.

## Carte du dépôt

```
src/
  types.ts            Modèle de domaine (toutes les interfaces)
  store.ts            État global Zustand : projet, outils, scénarios,
                      calibration, préférences de vue, undo/redo, autosave
  i18n.ts             Dictionnaire de traduction FR/EN + hook useT()
  main.tsx, App.tsx   Point d'entrée + barre du haut + onglets

  lib/                MOTEURS PURS (sans React, testés)
    analytics.ts        Cœur lean : TC effectif/qualité/global, takt, PLT,
                        PCE, goulot, TRS/TRG/TRE, alertes
    sensitivity.ts      Balayage univarié (re-simulation du moteur)
    spaghetti.ts        Distances, coûts, ROI, audit transport
    benchmarks.ts       Notation des KPI + métadonnées bilingues (BENCHMARK_META)
    copilot.ts          Moteur kaizen what-if + prompt de grounding LLM
    report.ts           Rapport HTML autoporté (impression → PDF)
    calibration.ts      Hypothèses réglables : défauts, fusion, profils transport
    exporters.ts        JSON / CSV / SVG / PNG
    geometry.ts         Bornage couloirs / feuille, aires de polygone

  data/
    definitions.ts      Dictionnaire des besoins (bilingue) — source unique
    palette.ts          Catalogue d'éléments + couloir par type
    demo.ts             Flux de démonstration Acme

  components/
    vsm/                Canvas, Toolbox, Inspector, NodeGlyph, StationAnalysis
    spaghetti/          Studio du plan d'usine
    analytics/          Sandbox, scénarios, sensibilité, co-pilote, ESG
    benchmarks/         Note, radar, tableau
    CalibrationModal, HelpModal, ui (primitives)
```

## Le contrat des moteurs

Chaque moteur prend des données **immuables** et rend un résultat **pur** :

```ts
computeSystemMetrics(nodes, demand, calibration): SystemMetrics
computeBenchmarks(metrics, calibration): BenchmarkRow[]
sweepSensitivity(nodes, demand, nodeId, param, steps, calibration): SweepResult
computeSpaghettiSummary(state, shifts, days, calibration): SpaghettiSummary
generateKaizenSuggestions(nodes, demand, base, calibration): KaizenSuggestion[]
```

La **calibration** (seuils, coûts transport, bandes de benchmark, langue, devise)
traverse tous les moteurs. Un fichier projet ancien sans bloc calibration est
toléré : `mergeCalibration()` complète les valeurs manquantes par les défauts.

## L'état (store.ts)

- `nodes`, `edges`, `demand`, `spaghetti`, `calibration` — le **projet**
  (sauvegardé dans le `.vstream.json` et autosauvé en localStorage).
- `scenarios`, `activeScenarioId`, `liveBackup` — la navigation entre scénarios.
- `prefs` — préférences de **vue** (grille, accrochage), locales à l'appareil.
- `past` / `future` — pile d'undo/redo. `withHistory()` enregistre un instantané
  et **détache** tout scénario actif lors d'une édition.

## i18n

`i18n.ts` est un dictionnaire plat `clé → { en, fr }`. `useT()` renvoie
`{ lang, t }` piloté par `calibration.language`, donc la langue voyage avec le
projet et atteint même les moteurs purs (alertes, kaizen, rapport) via un
paramètre `lang`. Les définitions et les benchmarks portent leurs propres champs
bilingues à la source.

## Tests

`src/lib/*.test.ts` couvre les moteurs (math lean, sensibilité, transport,
calibration, rapport, dictionnaire). Lancer : `npm test`.

```bash
npm test          # vitest
npm run build     # tsc --noEmit + vite build
```

## Conventions

- TypeScript strict, pas de `any`.
- Les chaînes visibles passent par `i18n.ts` (pas de texte codé en dur).
- Une nouvelle métrique = une fonction pure testée dans `lib/`, exposée ensuite
  par une vue.
- Un nouveau terme = une entrée dans `data/definitions.ts` (avec sa traduction).
