import { DEFAULT_CALIBRATION } from './calibration'
import type {
  Alert,
  AlertThresholds,
  CalibrationConfig,
  DemandConfig,
  InventoryMetrics,
  LadderStep,
  NodeKind,
  ProcessMetrics,
  SystemMetrics,
  VsmNode,
} from '../types'

/** Node kinds whose cycle time participates in the processing chain. */
const PROCESS_KINDS: ReadonlySet<NodeKind> = new Set(['process', 'qcGate', 'rework'])

/** Node kinds that hold material and therefore accrue NVA dwell time. */
const INVENTORY_KINDS: ReadonlySet<NodeKind> = new Set([
  'inventory',
  'safetyStock',
  'supermarket',
  'fifo',
])

export const isProcessKind = (k: NodeKind): boolean => PROCESS_KINDS.has(k)
export const isInventoryKind = (k: NodeKind): boolean => INVENTORY_KINDS.has(k)

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** OEE-availability adjusted effective cycle time: CT_eff = CT_nominal / A. */
export function effectiveCycleTime(ctNominal: number, availability: number): number {
  return ctNominal / clamp(availability, 0.1, 1)
}

/** Quality adjusted cycle time: CT_q = CT_eff / (1 - SR). */
export function qualityCycleTime(ctEffective: number, scrapRate: number): number {
  return ctEffective / (1 - clamp(scrapRate, 0, 0.95))
}

/** SMED amortization: Setup_penalty = S / B. */
export function setupAmortization(setupSeconds: number, batchSize: number): number {
  return setupSeconds / Math.max(1, batchSize)
}

export function computeProcessMetrics(
  node: VsmNode,
  taktSeconds: number,
  smedFactor: number = DEFAULT_CALIBRATION.alerts.smedFactor,
): ProcessMetrics {
  const ctNominal = Math.max(0, node.ct ?? 0)
  const availability = clamp(node.availability ?? 1, 0.1, 1)
  const performance = clamp(node.performance ?? 1, 0.1, 1)
  const engagement = clamp(node.engagement ?? 1, 0, 1)
  const opening = clamp(node.opening ?? 1, 0, 1)
  const scrap = clamp(node.scrap ?? 0, 0, 0.95)
  const setup = Math.max(0, node.setup ?? 0)
  const batch = Math.max(1, node.batch ?? 1)

  // Speed losses (allure) compound with availability in the effective CT.
  const ctEffective = effectiveCycleTime(ctNominal, availability * performance)
  const ctQuality = qualityCycleTime(ctEffective, scrap)
  const setupPenalty = setupAmortization(setup, batch)
  const ctGrand = ctQuality + setupPenalty

  // NF E 60-182 rates: TRS (OEE) over required time, TRG over opening, TRE over total.
  const qualityRate = 1 - scrap
  const trs = availability * performance * qualityRate
  const trg = trs * engagement
  const tre = trg * opening

  const taktUtilization = taktSeconds > 0 ? ctGrand / taktSeconds : 0
  return {
    nodeId: node.id,
    label: node.label,
    kind: node.kind,
    ctNominal,
    ctEffective,
    ctQuality,
    setupPenalty,
    ctGrand,
    availability,
    performance,
    engagement,
    opening,
    qualityRate,
    trs,
    trg,
    tre,
    scrap,
    setup,
    batch,
    operators: Math.max(0, node.operators ?? 0),
    taktUtilization,
    exceedsTakt: taktSeconds > 0 && ctGrand > taktSeconds,
    smedAlert: ctNominal > 0 && setupPenalty > ctNominal * smedFactor,
    valueAdd: node.valueAdd ?? node.kind === 'process',
  }
}

export function computeInventoryMetrics(node: VsmNode, demandPerDay: number, availableSecondsPerDay: number): InventoryMetrics {
  const qty = Math.max(0, node.qty ?? 0)
  const days = demandPerDay > 0 ? qty / demandPerDay : 0
  return {
    nodeId: node.id,
    label: node.label,
    kind: node.kind,
    qty,
    days,
    nvaSeconds: days * availableSecondsPerDay,
  }
}

/** Full closed-loop system computation. Pure; re-runs on every state change. */
export function computeSystemMetrics(
  nodes: VsmNode[],
  demand: DemandConfig,
  cal: CalibrationConfig = DEFAULT_CALIBRATION,
): SystemMetrics {
  const availableSecondsPerDay = demand.shiftsPerDay * demand.netMinutesPerShift * 60
  const demandPerDay = Math.max(0, demand.unitsPerDay)
  const taktSeconds = demandPerDay > 0 ? availableSecondsPerDay / demandPerDay : 0

  // The timeline ladder walks the material lane left → right, the same way a
  // part flows on a classic VSM sheet.
  const chain = nodes
    .filter((n) => isProcessKind(n.kind) || isInventoryKind(n.kind))
    .sort((a, b) => a.x - b.x)

  const processes: ProcessMetrics[] = []
  const inventories: InventoryMetrics[] = []
  const ladder: LadderStep[] = []

  for (const node of chain) {
    if (isProcessKind(node.kind)) {
      const m = computeProcessMetrics(node, taktSeconds, cal.alerts.smedFactor)
      processes.push(m)
      ladder.push({
        type: 'va',
        nodeId: node.id,
        label: node.label,
        seconds: m.valueAdd ? m.ctNominal : 0,
        ctGrand: m.ctGrand,
      })
    } else {
      const m = computeInventoryMetrics(node, demandPerDay, availableSecondsPerDay)
      inventories.push(m)
      ladder.push({ type: 'nva', nodeId: node.id, label: node.label, seconds: m.nvaSeconds })
    }
  }

  const totalValueAddSeconds = processes.reduce((s, p) => s + (p.valueAdd ? p.ctNominal : 0), 0)
  const totalProcessingSeconds = processes.reduce((s, p) => s + p.ctGrand, 0)
  const totalNvaSeconds = inventories.reduce((s, i) => s + i.nvaSeconds, 0)
  const leadTimeSeconds = totalProcessingSeconds + totalNvaSeconds
  const pce = leadTimeSeconds > 0 ? (totalValueAddSeconds / leadTimeSeconds) * 100 : 0

  const bottleneck = processes.reduce<ProcessMetrics | null>(
    (worst, p) => (p.ctGrand > (worst?.ctGrand ?? 0) ? p : worst),
    null,
  )
  const systemCapacityPerDay =
    bottleneck && bottleneck.ctGrand > 0 ? availableSecondsPerDay / bottleneck.ctGrand : 0

  const firstPassYield = processes.reduce((y, p) => y * (1 - p.scrap), 1)

  // ESG: a station is busy ctGrand seconds per part for every good part made.
  const kwhPerDay = nodes.reduce((s, n) => {
    if (!isProcessKind(n.kind) || !n.powerKw) return s
    const m = computeProcessMetrics(n, taktSeconds, cal.alerts.smedFactor)
    const busyHoursPerDay = Math.min(
      (m.ctGrand * demandPerDay) / 3600,
      availableSecondsPerDay / 3600,
    )
    return s + n.powerKw * busyHoursPerDay
  }, 0)
  const scrapUnitsPerDay = processes.reduce((s, p) => {
    // To ship D good units a station must start D / Π(1-SR downstream)… we use
    // the conservative local estimate: starts ≈ demand / (1 - SR).
    const starts = p.scrap > 0 ? demandPerDay / (1 - p.scrap) : demandPerDay
    return s + (starts - demandPerDay)
  }, 0)

  const alerts = buildAlerts(processes, inventories, taktSeconds, pce, cal.alerts, cal.language)

  return {
    taktSeconds,
    availableSecondsPerDay,
    demandPerDay,
    processes,
    inventories,
    ladder,
    totalValueAddSeconds,
    totalProcessingSeconds,
    totalNvaSeconds,
    leadTimeSeconds,
    pce,
    bottleneck,
    alerts,
    systemCapacityPerDay,
    totalOperators: processes.reduce((s, p) => s + p.operators, 0),
    firstPassYield,
    esg: {
      kwhPerDay,
      co2KgPerDay: kwhPerDay * demand.gridCo2PerKwh,
      scrapUnitsPerDay,
      scrapKgPerDay: scrapUnitsPerDay * demand.partWeightKg,
    },
  }
}

function buildAlerts(
  processes: ProcessMetrics[],
  inventories: InventoryMetrics[],
  taktSeconds: number,
  pce: number,
  t: AlertThresholds,
  lang: CalibrationConfig['language'] = 'en',
): Alert[] {
  const fr = lang === 'fr'
  const alerts: Alert[] = []
  for (const p of processes) {
    if (p.exceedsTakt) {
      alerts.push({
        id: `takt-${p.nodeId}`,
        nodeId: p.nodeId,
        level: 'critical',
        title: fr ? `${p.label} dépasse le takt` : `${p.label} exceeds takt`,
        detail: fr
          ? `TC effectif global ${fmtSeconds(p.ctGrand)} vs takt ${fmtSeconds(taktSeconds)} (${Math.round(p.taktUtilization * 100)}% de charge). La demande ne peut être tenue sans heures sup ou capacité.`
          : `Grand effective CT ${fmtSeconds(p.ctGrand)} vs takt ${fmtSeconds(taktSeconds)} (${Math.round(p.taktUtilization * 100)}% loaded). Demand cannot be met without overtime or capacity.`,
      })
    }
    if (p.smedAlert) {
      alerts.push({
        id: `smed-${p.nodeId}`,
        nodeId: p.nodeId,
        level: 'warning',
        title: fr ? `Forte pénalité de changement sur ${p.label}` : `High setup penalty at ${p.label}`,
        detail: fr
          ? `Le changement amorti ajoute ${fmtSeconds(p.setupPenalty)}/pièce — plus de ${Math.round(t.smedFactor * 100)}% du TC nominal de ${fmtSeconds(p.ctNominal)}. Lancez un chantier SMED ou revoyez les lots.`
          : `Amortized changeover adds ${fmtSeconds(p.setupPenalty)}/part — over ${Math.round(t.smedFactor * 100)}% of its ${fmtSeconds(p.ctNominal)} nominal CT. Run a SMED workshop or raise batch size (at the cost of inventory).`,
      })
    }
    if (p.scrap >= t.scrapWarn) {
      alerts.push({
        id: `scrap-${p.nodeId}`,
        nodeId: p.nodeId,
        level: 'warning',
        title: fr ? `Rebut ${Math.round(p.scrap * 100)}% sur ${p.label}` : `Scrap ${Math.round(p.scrap * 100)}% at ${p.label}`,
        detail: fr
          ? `Les pertes qualité gonflent le TC effectif à ${fmtSeconds(p.ctQuality)}. Traitez la cause racine du premier mode de défaut.`
          : `Quality losses inflate effective CT to ${fmtSeconds(p.ctQuality)}. Root-cause the top defect mode.`,
      })
    }
    if (p.availability < t.availabilityWarn) {
      alerts.push({
        id: `oee-${p.nodeId}`,
        nodeId: p.nodeId,
        level: 'warning',
        title: fr ? `Disponibilité ${Math.round(p.availability * 100)}% sur ${p.label}` : `Availability ${Math.round(p.availability * 100)}% at ${p.label}`,
        detail: fr
          ? `Les arrêts allongent chaque pièce à ${fmtSeconds(p.ctEffective)}. Analysez pannes, famine matière et micro-arrêts.`
          : `Downtime stretches each part to ${fmtSeconds(p.ctEffective)}. Investigate breakdowns, starvation and minor stops.`,
      })
    }
  }
  for (const inv of inventories) {
    if (inv.days > t.inventoryDaysWarn) {
      alerts.push({
        id: `inv-${inv.nodeId}`,
        nodeId: inv.nodeId,
        level: 'info',
        title: fr
          ? `${inv.label} : ${inv.days.toFixed(1)} jours de stock`
          : `${inv.label}: ${inv.days.toFixed(1)} days of inventory`,
        detail: fr
          ? `${inv.qty.toLocaleString()} pièces en attente — un moteur majeur du temps de traversée. Envisagez un supermarché dimensionné en tiré.`
          : `${inv.qty.toLocaleString()} parts queued — a leading driver of the lead time. Consider a supermarket with pull sizing.`,
      })
    }
  }
  if (pce > 0 && pce < t.pceLowPct) {
    alerts.push({
      id: 'pce-low',
      level: 'info',
      title: fr ? `PCE ${pce.toFixed(1)}% — gisement de flux` : `PCE ${pce.toFixed(1)}% — flow opportunity`,
      detail: fr
        ? `Moins de ${t.pceLowPct}% du délai ajoute de la valeur. Attaquez d'abord les plus grandes vallées NVA.`
        : `Less than ${t.pceLowPct}% of the lead time adds value. Attack the largest NVA valleys first.`,
    })
  }
  return alerts
}

// ---------------------------------------------------------------------------
// Formatting helpers (kept here so every panel renders durations identically)
// ---------------------------------------------------------------------------

export function fmtSeconds(s: number): string {
  if (!Number.isFinite(s)) return '—'
  if (s < 0.05) return '0s'
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)}s`
  if (s < 3600) return `${(s / 60).toFixed(1)}min`
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`
  return `${(s / 86400).toFixed(1)}d`
}

/** Lead-time style formatting using working days. */
export function fmtLeadTime(s: number, availableSecondsPerDay: number): string {
  if (availableSecondsPerDay <= 0) return fmtSeconds(s)
  const days = s / availableSecondsPerDay
  if (days >= 0.5) return `${days.toFixed(1)}d`
  return fmtSeconds(s)
}

export function fmtPct(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`
}
