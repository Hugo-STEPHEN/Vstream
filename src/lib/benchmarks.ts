import { DEFAULT_CALIBRATION } from './calibration'
import type { AppLanguage, BenchmarkKey, CalibrationConfig, SystemMetrics } from '../types'

/** Bilingual presentation of each benchmark KPI (numbers come from calibration). */
type Bilingual = { en: string; fr: string }
export const BENCHMARK_META: Record<
  BenchmarkKey,
  { name: Bilingual; short: Bilingual; unit: Bilingual; comment: Bilingual }
> = {
  pce: {
    name: { en: 'Process cycle efficiency', fr: 'Efficience du cycle (PCE)' },
    short: { en: 'PCE', fr: 'PCE' },
    unit: { en: '%', fr: '%' },
    comment: {
      en: 'Share of lead time that adds value. Discrete-manufacturing world class ≥ 25%.',
      fr: 'Part du délai qui ajoute de la valeur. World class en discret ≥ 25 %.',
    },
  },
  availability: {
    name: { en: 'Average availability (OEE-A)', fr: 'Disponibilité moyenne (OEE-A)' },
    short: { en: 'OEE-A', fr: 'OEE-A' },
    unit: { en: '%', fr: '%' },
    comment: {
      en: 'Mean uptime ratio across stations. World-class OEE programs hold ≥ 90% availability.',
      fr: 'Disponibilité moyenne des postes. Les programmes OEE world-class tiennent ≥ 90 %.',
    },
  },
  fpy: {
    name: { en: 'First pass yield', fr: 'Rendement premier passage' },
    short: { en: 'FPY', fr: 'FPY' },
    unit: { en: '%', fr: '%' },
    comment: {
      en: 'Probability a part passes every station without rework or scrap.',
      fr: 'Probabilité qu’une pièce passe tous les postes sans retouche ni rebut.',
    },
  },
  inventory: {
    name: { en: 'Inventory coverage', fr: 'Couverture de stock' },
    short: { en: 'Inventory', fr: 'Stock' },
    unit: { en: 'days', fr: 'jours' },
    comment: {
      en: 'Total queued WIP expressed in days of demand.',
      fr: 'En-cours total exprimé en jours de demande.',
    },
  },
  setup: {
    name: { en: 'Setup share of processing', fr: 'Part du changement dans le temps' },
    short: { en: 'SMED', fr: 'SMED' },
    unit: { en: '%', fr: '%' },
    comment: {
      en: 'Amortized changeover as share of total station time. SMED targets < 5%.',
      fr: 'Changement amorti en part du temps poste. Cible SMED < 5 %.',
    },
  },
  capacity: {
    name: { en: 'Capacity vs demand', fr: 'Capacité vs demande' },
    short: { en: 'Capacity', fr: 'Capacité' },
    unit: { en: '%', fr: '%' },
    comment: {
      en: 'Bottleneck throughput as a share of demand. < 100% means missed shipments.',
      fr: 'Débit du goulot en part de la demande. < 100 % = livraisons manquées.',
    },
  },
}

export function benchmarkName(key: BenchmarkKey, lang: AppLanguage): string {
  return BENCHMARK_META[key].name[lang]
}

export function benchmarkUnit(key: BenchmarkKey, lang: AppLanguage): string {
  return BENCHMARK_META[key].unit[lang]
}

export interface BenchmarkRow {
  key: BenchmarkKey
  metric: string
  unit: string
  current: number
  /** Typical batch-and-queue plant. */
  typical: number
  /** World-class lean reference. */
  worldClass: number
  /** Higher is better? */
  higherIsBetter: boolean
  /** 0–100 score of current vs world class. */
  score: number
  comment: string
}

function score(current: number, typical: number, worldClass: number, higherIsBetter: boolean): number {
  const lo = higherIsBetter ? Math.min(typical, worldClass) : Math.max(typical, worldClass)
  const span = worldClass - typical
  if (span === 0) return 50
  const t = (current - typical) / span
  return Math.max(0, Math.min(100, t * 100))
}

/**
 * Reference values are widely used lean-manufacturing rules of thumb
 * (Rother/Shook "Learning to See", world-class OEE ≈ 85%) — heuristics for
 * orientation, not certified industry statistics.
 */
export function computeBenchmarks(
  m: SystemMetrics,
  cal: CalibrationConfig = DEFAULT_CALIBRATION,
): BenchmarkRow[] {
  const t = cal.benchmarks
  const inventoryDays =
    m.availableSecondsPerDay > 0 ? m.totalNvaSeconds / m.availableSecondsPerDay : 0
  const avgAvailability =
    m.processes.length > 0
      ? m.processes.reduce((s, p) => s + p.availability, 0) / m.processes.length
      : 1
  const setupShare =
    m.totalProcessingSeconds > 0
      ? (m.processes.reduce((s, p) => s + p.setupPenalty, 0) / m.totalProcessingSeconds) * 100
      : 0
  const capacityMargin =
    m.demandPerDay > 0 ? (m.systemCapacityPerDay / m.demandPerDay) * 100 : 0

  const lang = cal.language
  const meta = (key: BenchmarkKey): { metric: string; unit: string; comment: string } => ({
    metric: BENCHMARK_META[key].name[lang],
    unit: BENCHMARK_META[key].unit[lang],
    comment: BENCHMARK_META[key].comment[lang],
  })

  const rows: Omit<BenchmarkRow, 'score'>[] = [
    { key: 'pce', ...meta('pce'), current: m.pce, typical: t.pce.typical, worldClass: t.pce.worldClass, higherIsBetter: true },
    { key: 'availability', ...meta('availability'), current: avgAvailability * 100, typical: t.availability.typical, worldClass: t.availability.worldClass, higherIsBetter: true },
    { key: 'fpy', ...meta('fpy'), current: m.firstPassYield * 100, typical: t.fpy.typical, worldClass: t.fpy.worldClass, higherIsBetter: true },
    { key: 'inventory', ...meta('inventory'), current: inventoryDays, typical: t.inventory.typical, worldClass: t.inventory.worldClass, higherIsBetter: false },
    { key: 'setup', ...meta('setup'), current: setupShare, typical: t.setup.typical, worldClass: t.setup.worldClass, higherIsBetter: false },
    { key: 'capacity', ...meta('capacity'), current: capacityMargin, typical: t.capacity.typical, worldClass: t.capacity.worldClass, higherIsBetter: true },
  ]

  return rows.map((r) => ({
    ...r,
    score: score(r.current, r.typical, r.worldClass, r.higherIsBetter),
  }))
}

export function overallGrade(rows: BenchmarkRow[]): { score: number; grade: string } {
  const s = rows.length ? rows.reduce((a, r) => a + r.score, 0) / rows.length : 0
  const grade = s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 50 ? 'C' : s >= 30 ? 'D' : 'E'
  return { score: s, grade }
}
