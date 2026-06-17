/**
 * The complete need / metric dictionary of the vStream suite — single source
 * of truth for the in-app help, the CSV data dictionary export and the
 * executive report appendix. Every quantity computed by the engine is
 * defined here with its formula and operational meaning.
 */

export type DefinitionCategory =
  | 'Demand & takt'
  | 'Station mathematics'
  | 'System flow'
  | 'Alerts & flags'
  | 'Spaghetti & transport'
  | 'ESG (E-VSM)'
  | 'Benchmarking'
  | 'Scenarios & sensitivity'

export interface NeedDefinition {
  category: DefinitionCategory
  term: string
  /** Symbol or formula in plain text (CSV / report safe). */
  formula: string
  unit: string
  definition: string
  /** French term (when it differs from the English one). */
  termFr?: string
  /** French definition — the suite is fully bilingual. */
  definitionFr?: string
}

/** Localized category headings. */
export const CATEGORY_FR: Record<DefinitionCategory, string> = {
  'Demand & takt': 'Demande & takt',
  'Station mathematics': 'Mathématiques du poste',
  'System flow': 'Flux système',
  'Alerts & flags': 'Alertes & drapeaux',
  'Spaghetti & transport': 'Spaghetti & transport',
  'ESG (E-VSM)': 'ESG (E-VSM)',
  'Benchmarking': 'Benchmarking',
  'Scenarios & sensitivity': 'Scénarios & sensibilité',
}

export const DEFINITIONS: NeedDefinition[] = [
  // --- Demand & takt -------------------------------------------------------
  {
    category: 'Demand & takt',
    term: 'Available time',
    termFr: 'Temps disponible',
    definitionFr: 'Secondes de travail nettes par jour, pauses et arrêts planifiés déduits. Le dénominateur de tous les taux journaliers de la suite.',
    formula: 'shifts/day × net min/shift × 60',
    unit: 's/day',
    definition:
      'Net working seconds per day after breaks and planned stops. The denominator of every per-day rate in the suite.',
  },
  {
    category: 'Demand & takt',
    term: 'Customer demand',
    termFr: 'Demande client',
    definitionFr: 'Unités bonnes tirées par le client par jour ouvré. Pilote le takt, la couverture de stock et les taux de rebut ESG.',
    formula: 'input',
    unit: 'units/day',
    definition: 'Good units the customer pulls per working day. Drives takt, inventory coverage and ESG scrap rates.',
  },
  {
    category: 'Demand & takt',
    term: 'Takt time',
    termFr: 'Temps takt',
    definitionFr: 'Le rythme de la demande client : une unité doit sortir du flux à chaque intervalle takt. Tout poste dont le TC effectif global dépasse le takt ne peut pas suivre.',
    formula: 'available time ÷ demand',
    unit: 's/unit',
    definition:
      'The pace of customer demand: one unit must leave the stream every takt interval. Any station whose grand effective cycle time exceeds takt cannot keep up.',
  },

  // --- Station mathematics -------------------------------------------------
  {
    category: 'Station mathematics',
    term: 'CT nominal',
    termFr: 'TC nominal',
    definitionFr: 'Temps de cycle machine par pièce sans aucune perte — le contenu de travail honnête du poste.',
    formula: 'CT_nominal (input)',
    unit: 's/part',
    definition: 'Machine cycle time per part with no losses — the honest work content of the station.',
  },
  {
    category: 'Station mathematics',
    term: 'OEE availability (A)',
    termFr: 'Disponibilité OEE (A)',
    definitionFr: 'Part du temps planifié où le poste tourne réellement : pannes, famine matière, micro-arrêts et attentes de changement réduisent A.',
    formula: 'A (input, clamped 0.10–1.00)',
    unit: 'ratio',
    definition:
      'Share of scheduled time the station actually runs: breakdowns, starvation, minor stops and changeover waiting all reduce A.',
  },
  {
    category: 'Station mathematics',
    term: 'Scrap / defect rate (SR)',
    termFr: 'Taux de rebut / défaut (SR)',
    definitionFr: 'Fraction des pièces qui échouent au poste et doivent être refaites ou jetées.',
    formula: 'SR (input, clamped 0–0.95)',
    unit: 'ratio',
    definition: 'Fraction of parts that fail at the station and must be re-run or discarded.',
  },
  {
    category: 'Station mathematics',
    term: 'Setup / changeover (S, B)',
    termFr: 'Changement de série (S, B)',
    definitionFr: 'Durée totale du changement et taille du lot produit entre deux changements.',
    formula: 'S = setup seconds; B = batch size (inputs)',
    unit: 's; parts',
    definition: 'Total changeover duration and the production batch run between changeovers.',
  },
  {
    category: 'Station mathematics',
    term: 'CT effective',
    termFr: 'TC effectif',
    definitionFr: 'Temps de cycle ajusté de la disponibilité OEE : les arrêts allongent la durée effective de chaque pièce au poste.',
    formula: 'CT_nominal ÷ A',
    unit: 's/part',
    definition:
      'OEE-availability adjusted cycle time: downtime stretches the effective duration every part spends at the station.',
  },
  {
    category: 'Station mathematics',
    term: 'CT quality',
    termFr: 'TC qualité',
    definitionFr: 'Temps de cycle ajusté qualité : la pénalité de capacité composée des pièces à refaire ou à jeter.',
    formula: 'CT_effective ÷ (1 − SR)',
    unit: 's/part',
    definition:
      'Quality-adjusted cycle time: the compounding capacity penalty of re-running or discarding defective assemblies.',
  },
  {
    category: 'Station mathematics',
    term: 'Setup penalty',
    termFr: 'Pénalité de changement',
    definitionFr: 'Amortissement SMED : la part de changement de série que porte chaque pièce du lot.',
    formula: 'S ÷ B',
    unit: 's/part',
    definition: 'SMED amortization: the slice of changeover time each part of the batch carries.',
  },
  {
    category: 'Station mathematics',
    term: 'CT grand',
    termFr: 'TC global',
    definitionFr: 'Temps de cycle opérationnel effectif global — le vrai temps moyen par pièce bonne, toutes pertes incluses.',
    formula: 'CT_quality + setup penalty',
    unit: 's/part',
    definition:
      'Grand effective operations cycle time — the true average time the station needs per good part, all losses included.',
  },
  {
    category: 'Station mathematics',
    term: 'Takt load',
    termFr: 'Charge takt',
    definitionFr: 'Utilisation du poste face à la demande. Au-dessus de 100 %, le poste est un goulot incompatible avec la demande.',
    formula: 'CT_grand ÷ takt',
    unit: '%',
    definition: 'Station utilization against demand. Above 100% the station is a demand-infeasible bottleneck.',
  },
  {
    category: 'Station mathematics',
    term: 'Performance rate (allure)',
    termFr: 'Taux de performance (allure)',
    definitionFr: "Pertes de cadence : micro-arrêts et cycles plus lents que l'allure nominale. Se compose avec la disponibilité dans le TC effectif.",
    formula: 'P (input, clamped 0.10–1.00)',
    unit: 'ratio',
    definition:
      'Speed losses: micro-stoppages and cycles slower than the nominal rate. Compounds with availability in the effective cycle time.',
  },
  {
    category: 'Station mathematics',
    term: 'TRS (OEE)',
    termFr: 'TRS (OEE)',
    definitionFr: "Taux de rendement synthétique (NF E 60-182) — l'OEE international : temps utile sur temps requis. World class ≈ 85 %.",
    formula: 'A × P × (1 − SR)',
    unit: '%',
    definition:
      'Taux de rendement synthétique (NF E 60-182) — the international OEE: useful time over required time. World class ≈ 85%.',
  },
  {
    category: 'Station mathematics',
    term: 'TRG',
    termFr: 'TRG',
    definitionFr: "Taux de rendement global : temps utile sur temps d'ouverture. Ajoute la perte d'engagement planning — créneaux ouverts mais non programmés.",
    formula: 'TRS × engagement (TR ÷ TO)',
    unit: '%',
    definition:
      'Taux de rendement global: useful time over opening time. Adds the planning engagement loss — shifts the machine was open but not scheduled to produce.',
  },
  {
    category: 'Station mathematics',
    term: 'TRE',
    termFr: 'TRE',
    definitionFr: "Taux de rendement économique : temps utile sur le calendrier 24/7 complet — l'intensité d'usage de l'actif face à son coût capital.",
    formula: 'TRG × opening (TO ÷ TT)',
    unit: '%',
    definition:
      'Taux de rendement économique: useful time over the full 24/7 calendar — how hard the asset works for its capital cost.',
  },
  {
    category: 'Station mathematics',
    term: 'Value-add flag',
    termFr: 'Drapeau valeur ajoutée',
    definitionFr: 'Indique si le temps de cycle nominal du poste compte en valeur ajoutée. Contrôles et retouches sont non-VA par défaut : les flux chargés en inspection sont honnêtement pénalisés dans le PCE.',
    formula: 'per-station setting',
    unit: '—',
    definition:
      'Whether the station’s nominal cycle time counts as value-add. QC gates and rework default to non-value-add, so inspection-heavy streams are honestly penalized in PCE.',
  },

  // --- System flow ---------------------------------------------------------
  {
    category: 'System flow',
    term: 'NVA dwell',
    termFr: 'Attente NVA',
    definitionFr: "Temps de file non-valeur ajoutée : durée d'écoulement du stock actuel au rythme de la demande — les vallées de l'échelle des temps.",
    formula: 'qty ÷ demand × available time (per queue)',
    unit: 's',
    definition:
      'Non-value-add queue time: how long the current inventory lasts at the demand rate — the valleys of the timeline ladder.',
  },
  {
    category: 'System flow',
    term: 'Lead time (PLT)',
    termFr: 'Temps de traversée (PLT)',
    definitionFr: "Délai total de traversée : transit d'une pièce porte à porte, procédés et files comprises.",
    formula: 'Σ CT_grand + Σ NVA dwell',
    unit: 's (shown in working days)',
    definition: 'Total process lead time: a part’s door-to-door transit through processing and every queue.',
  },
  {
    category: 'System flow',
    term: 'Process cycle efficiency (PCE)',
    termFr: 'Efficience du cycle (PCE)',
    definitionFr: 'Part du délai qui ajoute de la valeur. World class Rother/Shook en discret ≥ 25 % ; les usines lot-et-file typiques sont sous 2 %.',
    formula: 'Σ value-add CT_nominal ÷ PLT × 100',
    unit: '%',
    definition:
      'Share of the lead time that adds value. Rother/Shook discrete-manufacturing world class is ≥ 25%; typical batch-and-queue plants sit below 2%.',
  },
  {
    category: 'System flow',
    term: 'System capacity',
    termFr: 'Capacité système',
    definitionFr: 'Plafond de débit fixé par le poste goulot aux paramètres actuels.',
    formula: 'available time ÷ max(CT_grand)',
    unit: 'units/day',
    definition: 'Throughput ceiling set by the bottleneck station at current parameters.',
  },
  {
    category: 'System flow',
    term: 'Bottleneck',
    termFr: 'Goulot',
    definitionFr: 'Le poste au plus grand TC effectif global — il détient la capacité du système.',
    formula: 'argmax(CT_grand)',
    unit: '—',
    definition: 'The station with the largest grand effective cycle time — it owns the system capacity.',
  },
  {
    category: 'System flow',
    term: 'First pass yield (FPY)',
    termFr: 'Rendement au premier passage (FPY)',
    definitionFr: "Probabilité qu'une pièce traverse tous les postes sans retouche ni rebut.",
    formula: 'Π (1 − SR) across stations',
    unit: '%',
    definition: 'Probability a part passes every station without rework or scrap.',
  },
  {
    category: 'System flow',
    term: 'Direct labor cost',
    termFr: 'Coût main-d’œuvre directe',
    definitionFr: 'Coût opérateurs chargé pour faire tourner le flux une journée.',
    formula: 'Σ FTE × labor rate × available hours',
    unit: '$/day',
    definition: 'Fully loaded operator cost of running the stream for one day.',
  },

  // --- Alerts & flags ------------------------------------------------------
  {
    category: 'Alerts & flags',
    term: 'Over takt (critical)',
    termFr: 'Takt dépassé (critique)',
    definitionFr: "La demande ne peut être tenue sans heures supplémentaires ou capacité. Le nœud pulse en rouge sur le canevas et domine l'audit des goulots.",
    formula: 'CT_grand > takt',
    unit: '—',
    definition:
      'Demand cannot be met without overtime or capacity. The node pulses red on the canvas and tops the bottleneck audit.',
  },
  {
    category: 'Alerts & flags',
    term: 'SMED loss (warning)',
    termFr: 'Perte SMED (alerte)',
    definitionFr: 'Le changement de série domine le poste. Lancez un chantier SMED ou revoyez la logique de lots (de plus gros lots échangent du changement contre du stock).',
    formula: 'setup penalty > 0.5 × CT_nominal',
    unit: '—',
    definition:
      'Changeover overhead dominates the station. Run a SMED workshop or revisit batching logic (larger batches trade setup for inventory).',
  },
  {
    category: 'Alerts & flags',
    term: 'Quality flag',
    termFr: 'Drapeau qualité',
    definitionFr: 'Le rebut gonfle le temps de cycle effectif et compose la perte de capacité en amont — traitez la cause racine du premier mode de défaut.',
    formula: 'SR ≥ 5%',
    unit: '—',
    definition: 'Scrap inflates effective cycle time and compounds capacity loss upstream — root-cause the top defect mode.',
  },
  {
    category: 'Alerts & flags',
    term: 'Availability flag',
    termFr: 'Drapeau disponibilité',
    definitionFr: 'Arrêts chroniques : analysez pannes, famine matière et micro-arrêts (TPM).',
    formula: 'A < 70%',
    unit: '—',
    definition: 'Chronic downtime: investigate breakdowns, starvation and minor stops (TPM).',
  },
  {
    category: 'Alerts & flags',
    term: 'Inventory flag',
    termFr: 'Drapeau stock',
    definitionFr: "Une file de plus d'une semaine de demande est un moteur majeur du délai — candidate au dimensionnement en tiré.",
    formula: 'coverage > 5 days',
    unit: '—',
    definition: 'A queue holding more than a week of demand is a leading lead-time driver — candidate for pull sizing.',
  },

  // --- Spaghetti & transport ----------------------------------------------
  {
    category: 'Spaghetti & transport',
    term: 'Route distance',
    termFr: 'Distance du trajet',
    definitionFr: "Longueur mesurée du chemin tracé à l'échelle configurée de l'usine.",
    formula: 'polyline length × meters/unit',
    unit: 'm (one-way)',
    definition: 'Measured length of the drawn travel path at the configured plant scale.',
  },
  {
    category: 'Spaghetti & transport',
    term: 'Travel per shift',
    termFr: 'Distance par équipe',
    definitionFr: 'Mètres aller-retour parcourus par équipe sur le trajet.',
    formula: 'distance × 2 × trips/shift',
    unit: 'm',
    definition: 'Round-trip meters covered per shift on the route.',
  },
  {
    category: 'Spaghetti & transport',
    term: 'Transport cost',
    termFr: 'Coût de transport',
    definitionFr: 'Empreinte financière du trajet. Profils par défaut : marche 0,15 $/m à 1,2 m/s ; chariot 1,20 $/m à 3,0 m/s ; AGV 0,40 $/m à 1,7 m/s — calibrables.',
    formula: 'meters/shift × mode cost/m',
    unit: '$/shift, $/year',
    definition:
      'Financial footprint of the route. Mode profiles: manual walk $0.15/m @ 1.2 m/s; forklift $1.20/m @ 3.0 m/s; AGV $0.40/m @ 1.7 m/s.',
  },
  {
    category: 'Spaghetti & transport',
    term: 'Best-mode ROI',
    termFr: 'ROI meilleur mode',
    definitionFr: 'Économie annuelle si chaque trajet utilisait son mode de transport viable le moins cher.',
    formula: 'Σ max(0, cost − cheapest-mode cost)',
    unit: '$/year',
    definition: 'Annual saving if every route ran on its cheapest viable transport mode.',
  },
  {
    category: 'Spaghetti & transport',
    term: 'Transport time per part',
    termFr: 'Temps de transport par pièce',
    definitionFr: 'Pour les trajets liés à un poste VSM : les secondes de manutention que porte chaque pièce produite — le gaspillage transport rendu visible à côté du temps de cycle.',
    formula: '(meters/shift ÷ speed) ÷ parts/shift',
    unit: 's/part',
    definition:
      'For routes linked to a VSM station: the conveyance seconds each produced part carries — transport waste made visible next to the station’s cycle time.',
  },

  // --- ESG -----------------------------------------------------------------
  {
    category: 'ESG (E-VSM)',
    term: 'Energy',
    termFr: 'Énergie',
    definitionFr: 'Énergie électrique du flux ; le temps occupé est le TC global pondéré par la demande, plafonné au temps disponible.',
    formula: 'Σ station kW × busy hours/day',
    unit: 'kWh/day',
    definition: 'Electrical energy of the stream; busy time is the demand-weighted grand cycle time, capped at available time.',
  },
  {
    category: 'ESG (E-VSM)',
    term: 'CO₂e',
    termFr: 'CO₂e',
    definitionFr: "Empreinte carbone à l'intensité réseau configurée (kg CO₂e par kWh).",
    formula: 'energy × grid factor',
    unit: 'kg/day',
    definition: 'Carbon footprint at the configured grid intensity (kg CO₂e per kWh).',
  },
  {
    category: 'ESG (E-VSM)',
    term: 'Scrap mass',
    termFr: 'Masse de rebut',
    definitionFr: 'Matière jetée pour livrer les unités bonnes demandées, valorisée au poids pièce.',
    formula: 'excess starts × part weight',
    unit: 'kg/day',
    definition: 'Material discarded to ship the demanded good units, valued by part weight.',
  },

  // --- Benchmarking --------------------------------------------------------
  {
    category: 'Benchmarking',
    term: 'KPI score',
    termFr: 'Score KPI',
    definitionFr: 'Position linéaire de chaque KPI entre une usine lot-et-file typique (0) et une référence lean world class (100).',
    formula: '(current − typical) ÷ (world class − typical) × 100, clamped 0–100',
    unit: 'points',
    definition:
      'Linear position of each KPI between a typical batch-and-queue plant (0) and a world-class lean reference (100).',
  },
  {
    category: 'Benchmarking',
    term: 'Performance grade',
    termFr: 'Note de performance',
    definitionFr: 'Composite de PCE, disponibilité, FPY, couverture de stock, part de changement et marge de capacité. Repères issus des règles lean usuelles, pas des statistiques certifiées.',
    formula: 'mean of six KPI scores → A ≥ 85, B ≥ 70, C ≥ 50, D ≥ 30, else E',
    unit: 'A–E',
    definition:
      'Composite of PCE, availability, FPY, inventory coverage, setup share and capacity margin. Orientation values from established lean rules of thumb, not certified statistics.',
  },

  // --- Scenarios & sensitivity ----------------------------------------------
  {
    category: 'Scenarios & sensitivity',
    term: 'Scenario',
    termFr: 'Scénario',
    definitionFr: 'Un instantané nommé du modèle complet. Comparez les scénarios côte à côte (délai, PCE, capacité, FPY) et réappliquez-en un au canevas pour repartir de là.',
    formula: 'frozen {stations, connections, demand}',
    unit: '—',
    definition:
      'A named snapshot of the whole model. Compare scenarios side by side (lead time, PCE, capacity, FPY) and apply one back to the canvas to continue from it.',
  },
  {
    category: 'Scenarios & sensitivity',
    term: 'Sensitivity sweep',
    termFr: 'Balayage de sensibilité',
    definitionFr: 'Un paramètre de poste (TC, dispo, rebut, changement, lot) est balayé sur sa plage, tout le reste constant ; les courbes de réponse montrent PCE et capacité à chaque point — simulation discrète honnête, sans interpolation.',
    formula: 're-run engine over a parameter range',
    unit: '—',
    definition:
      'One station parameter (CT, availability, scrap, setup, batch) is swept across its range while everything else is held constant; the response curves show PCE and capacity at every point — honest discrete simulation, no interpolation.',
  },
]

export const DEFINITION_CATEGORIES: DefinitionCategory[] = [
  'Demand & takt',
  'Station mathematics',
  'System flow',
  'Alerts & flags',
  'Spaghetti & transport',
  'ESG (E-VSM)',
  'Benchmarking',
  'Scenarios & sensitivity',
]
