/** Core domain model for the vStream Value Stream Intelligence Suite. */

// ---------------------------------------------------------------------------
// VSM canvas
// ---------------------------------------------------------------------------

/** Vertical sectors of the VSM canvas. Nodes are constrained to their lane. */
export type Lane = 'information' | 'material'

export type NodeKind =
  // Material flow
  | 'process'
  | 'inventory'
  | 'safetyStock'
  | 'supermarket'
  | 'fifo'
  | 'supplier'
  | 'customer'
  | 'qcGate'
  | 'rework'
  | 'scrapBin'
  | 'operator'
  // Logistics
  | 'truck'
  | 'ship'
  | 'air'
  | 'forklift'
  // Pull & kanban
  | 'kanbanPost'
  | 'kanbanProduction'
  | 'kanbanWithdrawal'
  | 'heijunka'
  // Information flow
  | 'productionControl'
  | 'erp'
  | 'schedule'
  | 'goSee'

export type EdgeKind = 'push' | 'pull' | 'manualInfo' | 'electronicInfo'

export interface VsmNode {
  id: string
  kind: NodeKind
  label: string
  x: number
  y: number
  /** Nominal machine cycle time per part, seconds (process-like nodes). */
  ct?: number
  /** Total changeover / setup time, seconds. */
  setup?: number
  /** Production batch size between changeovers, parts. */
  batch?: number
  /** OEE availability ratio, 0.10 – 1.00. */
  availability?: number
  /** Scrap / defect rate, 0 – 0.95. */
  scrap?: number
  /** Full-time-equivalent headcount at the station. */
  operators?: number
  /** Average electrical power draw, kW (ESG auditor). */
  powerKw?: number
  /** Whether the station's cycle time counts as value-add. QC/rework do not. */
  valueAdd?: boolean
  /** Inventory on hand, parts (inventory-like nodes). */
  qty?: number
  /** Logistics: shipment frequency per week. */
  tripsPerWeek?: number
  /** Logistics: route distance in km. */
  distanceKm?: number
  note?: string
}

export interface VsmEdge {
  id: string
  kind: EdgeKind
  from: string
  to: string
}

// ---------------------------------------------------------------------------
// Demand / takt configuration
// ---------------------------------------------------------------------------

export interface DemandConfig {
  /** Customer demand, units per day. */
  unitsPerDay: number
  /** Shifts worked per day. */
  shiftsPerDay: number
  /** Net working minutes per shift (breaks removed). */
  netMinutesPerShift: number
  /** Working days per year, for annualized ROI. */
  daysPerYear: number
  /** Part weight (kg) for scrap-by-weight ESG telemetry. */
  partWeightKg: number
  /** Grid carbon intensity, kg CO2e per kWh. */
  gridCo2PerKwh: number
  /** Fully loaded labor rate, currency per operator-hour. */
  laborRatePerHour: number
}

// ---------------------------------------------------------------------------
// Analytics outputs
// ---------------------------------------------------------------------------

export type AlertLevel = 'critical' | 'warning' | 'info'

export interface Alert {
  id: string
  nodeId?: string
  level: AlertLevel
  title: string
  detail: string
}

export interface ProcessMetrics {
  nodeId: string
  label: string
  kind: NodeKind
  ctNominal: number
  /** CT_nominal / availability. */
  ctEffective: number
  /** CT_effective / (1 - scrap). */
  ctQuality: number
  /** setup / batch. */
  setupPenalty: number
  /** ctQuality + setupPenalty. */
  ctGrand: number
  availability: number
  scrap: number
  setup: number
  batch: number
  operators: number
  /** ctGrand / takt. >1 means the station cannot keep up. */
  taktUtilization: number
  exceedsTakt: boolean
  smedAlert: boolean
  valueAdd: boolean
}

export interface InventoryMetrics {
  nodeId: string
  label: string
  kind: NodeKind
  qty: number
  /** Queue dwell time in seconds at current demand. */
  nvaSeconds: number
  days: number
}

export type LadderStep =
  | { type: 'va'; nodeId: string; label: string; seconds: number; ctGrand: number }
  | { type: 'nva'; nodeId: string; label: string; seconds: number }

export interface SystemMetrics {
  taktSeconds: number
  availableSecondsPerDay: number
  demandPerDay: number
  processes: ProcessMetrics[]
  inventories: InventoryMetrics[]
  /** Ordered left→right walk of the material lane for the timeline ladder. */
  ladder: LadderStep[]
  /** Σ value-add nominal cycle time, seconds. */
  totalValueAddSeconds: number
  /** Σ grand effective cycle time across stations, seconds. */
  totalProcessingSeconds: number
  /** Σ inventory dwell, seconds. */
  totalNvaSeconds: number
  /** Total process lead time = processing + NVA, seconds. */
  leadTimeSeconds: number
  /** Process cycle efficiency, % = VA / PLT × 100. */
  pce: number
  bottleneck: ProcessMetrics | null
  alerts: Alert[]
  /** Throughput limited by the bottleneck, units/day. */
  systemCapacityPerDay: number
  totalOperators: number
  /** First pass yield through every station, 0-1. */
  firstPassYield: number
  esg: EsgMetrics
}

export interface EsgMetrics {
  /** Electrical energy across stations, kWh per day. */
  kwhPerDay: number
  co2KgPerDay: number
  scrapUnitsPerDay: number
  scrapKgPerDay: number
}

// ---------------------------------------------------------------------------
// Spaghetti diagram
// ---------------------------------------------------------------------------

export type TransportMode = 'walk' | 'forklift' | 'agv'

export interface TransportProfile {
  mode: TransportMode
  label: string
  costPerMeter: number
  speedMps: number
  color: string
}

export interface FloorZone {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  color: string
}

export interface TravelRoute {
  id: string
  name: string
  mode: TransportMode
  points: { x: number; y: number }[]
  /** Round trips per shift. */
  tripsPerShift: number
  /** Optional link to the VSM station this route feeds — enables the transport audit. */
  linkedNodeId?: string
}

/** Uploaded plant-floor drawing rendered under the grid. */
export interface FloorBackground {
  dataUrl: string
  /** 0.05 – 1. */
  opacity: number
}

export interface SpaghettiState {
  zones: FloorZone[]
  routes: TravelRoute[]
  /** Plant scale: real-world meters represented by one canvas unit (px). */
  metersPerUnit: number
  background?: FloorBackground
}

export interface RouteMetrics {
  routeId: string
  name: string
  mode: TransportMode
  meters: number
  steps: number
  minutesPerShift: number
  costPerShift: number
  costPerYear: number
  linkedNodeId?: string
}

// ---------------------------------------------------------------------------
// Calibration (per-project customization of every model assumption)
// ---------------------------------------------------------------------------

/** Thresholds that trigger canvas flags and alert rows. */
export interface AlertThresholds {
  /** SMED flag when setup penalty > factor × CT nominal. */
  smedFactor: number
  /** Quality warning when scrap rate ≥ this ratio. */
  scrapWarn: number
  /** Availability warning when OEE-A < this ratio. */
  availabilityWarn: number
  /** Inventory note when coverage exceeds this many days of demand. */
  inventoryDaysWarn: number
  /** Flow-opportunity note when PCE falls below this percentage. */
  pceLowPct: number
}

/** Tunable economics of a transport mode (label & color stay built-in). */
export interface TransportCalibration {
  costPerMeter: number
  speedMps: number
}

export type BenchmarkKey = 'pce' | 'availability' | 'fpy' | 'inventory' | 'setup' | 'capacity'

/** Reference band one KPI is scored against. */
export interface BenchmarkTargetCalibration {
  typical: number
  worldClass: number
}

/** Every assumption of the suite, calibratable per project. */
export interface CalibrationConfig {
  /** Currency symbol used across costs and reports. */
  currency: string
  /** Average walking step length, meters (spaghetti step counts). */
  stepMeters: number
  alerts: AlertThresholds
  transport: Record<TransportMode, TransportCalibration>
  benchmarks: Record<BenchmarkKey, BenchmarkTargetCalibration>
}

// ---------------------------------------------------------------------------
// Scenario workbench (multivariable sandbox)
// ---------------------------------------------------------------------------

/** A named, frozen what-if state of the value stream model. */
export interface Scenario {
  id: string
  name: string
  savedAt: string
  nodes: VsmNode[]
  edges: VsmEdge[]
  demand: DemandConfig
}

// ---------------------------------------------------------------------------
// Project container (export / import / persistence)
// ---------------------------------------------------------------------------

export interface VsmProject {
  schema: 'vstream/v1'
  name: string
  savedAt: string
  nodes: VsmNode[]
  edges: VsmEdge[]
  demand: DemandConfig
  spaghetti: SpaghettiState
  /** Saved what-if scenarios (optional — absent in early v1 files). */
  scenarios?: Scenario[]
  /** Model calibration (optional — defaults are merged in on import). */
  calibration?: CalibrationConfig
}

// ---------------------------------------------------------------------------
// Integration hooks (REST / Webhook connectors, roadmap pillar)
// ---------------------------------------------------------------------------

/** Payload shape accepted by the (future) `/api/v1/metrics/update` endpoint. */
export interface MetricsUpdatePayload {
  source: 'iot' | 'mes' | 'barcode' | 'manual'
  nodeLabel: string
  timestamp: string
  measurements: Partial<{
    cycleTimeSeconds: number
    availability: number
    scrapRate: number
    setupSeconds: number
    inventoryQty: number
  }>
}
