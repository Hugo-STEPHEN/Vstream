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
}

export const DEFINITIONS: NeedDefinition[] = [
  // --- Demand & takt -------------------------------------------------------
  {
    category: 'Demand & takt',
    term: 'Available time',
    formula: 'shifts/day × net min/shift × 60',
    unit: 's/day',
    definition:
      'Net working seconds per day after breaks and planned stops. The denominator of every per-day rate in the suite.',
  },
  {
    category: 'Demand & takt',
    term: 'Customer demand',
    formula: 'input',
    unit: 'units/day',
    definition: 'Good units the customer pulls per working day. Drives takt, inventory coverage and ESG scrap rates.',
  },
  {
    category: 'Demand & takt',
    term: 'Takt time',
    formula: 'available time ÷ demand',
    unit: 's/unit',
    definition:
      'The pace of customer demand: one unit must leave the stream every takt interval. Any station whose grand effective cycle time exceeds takt cannot keep up.',
  },

  // --- Station mathematics -------------------------------------------------
  {
    category: 'Station mathematics',
    term: 'CT nominal',
    formula: 'CT_nominal (input)',
    unit: 's/part',
    definition: 'Machine cycle time per part with no losses — the honest work content of the station.',
  },
  {
    category: 'Station mathematics',
    term: 'OEE availability (A)',
    formula: 'A (input, clamped 0.10–1.00)',
    unit: 'ratio',
    definition:
      'Share of scheduled time the station actually runs: breakdowns, starvation, minor stops and changeover waiting all reduce A.',
  },
  {
    category: 'Station mathematics',
    term: 'Scrap / defect rate (SR)',
    formula: 'SR (input, clamped 0–0.95)',
    unit: 'ratio',
    definition: 'Fraction of parts that fail at the station and must be re-run or discarded.',
  },
  {
    category: 'Station mathematics',
    term: 'Setup / changeover (S, B)',
    formula: 'S = setup seconds; B = batch size (inputs)',
    unit: 's; parts',
    definition: 'Total changeover duration and the production batch run between changeovers.',
  },
  {
    category: 'Station mathematics',
    term: 'CT effective',
    formula: 'CT_nominal ÷ A',
    unit: 's/part',
    definition:
      'OEE-availability adjusted cycle time: downtime stretches the effective duration every part spends at the station.',
  },
  {
    category: 'Station mathematics',
    term: 'CT quality',
    formula: 'CT_effective ÷ (1 − SR)',
    unit: 's/part',
    definition:
      'Quality-adjusted cycle time: the compounding capacity penalty of re-running or discarding defective assemblies.',
  },
  {
    category: 'Station mathematics',
    term: 'Setup penalty',
    formula: 'S ÷ B',
    unit: 's/part',
    definition: 'SMED amortization: the slice of changeover time each part of the batch carries.',
  },
  {
    category: 'Station mathematics',
    term: 'CT grand',
    formula: 'CT_quality + setup penalty',
    unit: 's/part',
    definition:
      'Grand effective operations cycle time — the true average time the station needs per good part, all losses included.',
  },
  {
    category: 'Station mathematics',
    term: 'Takt load',
    formula: 'CT_grand ÷ takt',
    unit: '%',
    definition: 'Station utilization against demand. Above 100% the station is a demand-infeasible bottleneck.',
  },
  {
    category: 'Station mathematics',
    term: 'Value-add flag',
    formula: 'per-station setting',
    unit: '—',
    definition:
      'Whether the station’s nominal cycle time counts as value-add. QC gates and rework default to non-value-add, so inspection-heavy streams are honestly penalized in PCE.',
  },

  // --- System flow ---------------------------------------------------------
  {
    category: 'System flow',
    term: 'NVA dwell',
    formula: 'qty ÷ demand × available time (per queue)',
    unit: 's',
    definition:
      'Non-value-add queue time: how long the current inventory lasts at the demand rate — the valleys of the timeline ladder.',
  },
  {
    category: 'System flow',
    term: 'Lead time (PLT)',
    formula: 'Σ CT_grand + Σ NVA dwell',
    unit: 's (shown in working days)',
    definition: 'Total process lead time: a part’s door-to-door transit through processing and every queue.',
  },
  {
    category: 'System flow',
    term: 'Process cycle efficiency (PCE)',
    formula: 'Σ value-add CT_nominal ÷ PLT × 100',
    unit: '%',
    definition:
      'Share of the lead time that adds value. Rother/Shook discrete-manufacturing world class is ≥ 25%; typical batch-and-queue plants sit below 2%.',
  },
  {
    category: 'System flow',
    term: 'System capacity',
    formula: 'available time ÷ max(CT_grand)',
    unit: 'units/day',
    definition: 'Throughput ceiling set by the bottleneck station at current parameters.',
  },
  {
    category: 'System flow',
    term: 'Bottleneck',
    formula: 'argmax(CT_grand)',
    unit: '—',
    definition: 'The station with the largest grand effective cycle time — it owns the system capacity.',
  },
  {
    category: 'System flow',
    term: 'First pass yield (FPY)',
    formula: 'Π (1 − SR) across stations',
    unit: '%',
    definition: 'Probability a part passes every station without rework or scrap.',
  },
  {
    category: 'System flow',
    term: 'Direct labor cost',
    formula: 'Σ FTE × labor rate × available hours',
    unit: '$/day',
    definition: 'Fully loaded operator cost of running the stream for one day.',
  },

  // --- Alerts & flags ------------------------------------------------------
  {
    category: 'Alerts & flags',
    term: 'Over takt (critical)',
    formula: 'CT_grand > takt',
    unit: '—',
    definition:
      'Demand cannot be met without overtime or capacity. The node pulses red on the canvas and tops the bottleneck audit.',
  },
  {
    category: 'Alerts & flags',
    term: 'SMED loss (warning)',
    formula: 'setup penalty > 0.5 × CT_nominal',
    unit: '—',
    definition:
      'Changeover overhead dominates the station. Run a SMED workshop or revisit batching logic (larger batches trade setup for inventory).',
  },
  {
    category: 'Alerts & flags',
    term: 'Quality flag',
    formula: 'SR ≥ 5%',
    unit: '—',
    definition: 'Scrap inflates effective cycle time and compounds capacity loss upstream — root-cause the top defect mode.',
  },
  {
    category: 'Alerts & flags',
    term: 'Availability flag',
    formula: 'A < 70%',
    unit: '—',
    definition: 'Chronic downtime: investigate breakdowns, starvation and minor stops (TPM).',
  },
  {
    category: 'Alerts & flags',
    term: 'Inventory flag',
    formula: 'coverage > 5 days',
    unit: '—',
    definition: 'A queue holding more than a week of demand is a leading lead-time driver — candidate for pull sizing.',
  },

  // --- Spaghetti & transport ----------------------------------------------
  {
    category: 'Spaghetti & transport',
    term: 'Route distance',
    formula: 'polyline length × meters/unit',
    unit: 'm (one-way)',
    definition: 'Measured length of the drawn travel path at the configured plant scale.',
  },
  {
    category: 'Spaghetti & transport',
    term: 'Travel per shift',
    formula: 'distance × 2 × trips/shift',
    unit: 'm',
    definition: 'Round-trip meters covered per shift on the route.',
  },
  {
    category: 'Spaghetti & transport',
    term: 'Transport cost',
    formula: 'meters/shift × mode cost/m',
    unit: '$/shift, $/year',
    definition:
      'Financial footprint of the route. Mode profiles: manual walk $0.15/m @ 1.2 m/s; forklift $1.20/m @ 3.0 m/s; AGV $0.40/m @ 1.7 m/s.',
  },
  {
    category: 'Spaghetti & transport',
    term: 'Best-mode ROI',
    formula: 'Σ max(0, cost − cheapest-mode cost)',
    unit: '$/year',
    definition: 'Annual saving if every route ran on its cheapest viable transport mode.',
  },
  {
    category: 'Spaghetti & transport',
    term: 'Transport time per part',
    formula: '(meters/shift ÷ speed) ÷ parts/shift',
    unit: 's/part',
    definition:
      'For routes linked to a VSM station: the conveyance seconds each produced part carries — transport waste made visible next to the station’s cycle time.',
  },

  // --- ESG -----------------------------------------------------------------
  {
    category: 'ESG (E-VSM)',
    term: 'Energy',
    formula: 'Σ station kW × busy hours/day',
    unit: 'kWh/day',
    definition: 'Electrical energy of the stream; busy time is the demand-weighted grand cycle time, capped at available time.',
  },
  {
    category: 'ESG (E-VSM)',
    term: 'CO₂e',
    formula: 'energy × grid factor',
    unit: 'kg/day',
    definition: 'Carbon footprint at the configured grid intensity (kg CO₂e per kWh).',
  },
  {
    category: 'ESG (E-VSM)',
    term: 'Scrap mass',
    formula: 'excess starts × part weight',
    unit: 'kg/day',
    definition: 'Material discarded to ship the demanded good units, valued by part weight.',
  },

  // --- Benchmarking --------------------------------------------------------
  {
    category: 'Benchmarking',
    term: 'KPI score',
    formula: '(current − typical) ÷ (world class − typical) × 100, clamped 0–100',
    unit: 'points',
    definition:
      'Linear position of each KPI between a typical batch-and-queue plant (0) and a world-class lean reference (100).',
  },
  {
    category: 'Benchmarking',
    term: 'Performance grade',
    formula: 'mean of six KPI scores → A ≥ 85, B ≥ 70, C ≥ 50, D ≥ 30, else E',
    unit: 'A–E',
    definition:
      'Composite of PCE, availability, FPY, inventory coverage, setup share and capacity margin. Orientation values from established lean rules of thumb, not certified statistics.',
  },

  // --- Scenarios & sensitivity ----------------------------------------------
  {
    category: 'Scenarios & sensitivity',
    term: 'Scenario',
    formula: 'frozen {stations, connections, demand}',
    unit: '—',
    definition:
      'A named snapshot of the whole model. Compare scenarios side by side (lead time, PCE, capacity, FPY) and apply one back to the canvas to continue from it.',
  },
  {
    category: 'Scenarios & sensitivity',
    term: 'Sensitivity sweep',
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
