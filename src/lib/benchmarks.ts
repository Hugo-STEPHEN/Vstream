import type { SystemMetrics } from '../types'

export interface BenchmarkRow {
  key: string
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
export function computeBenchmarks(m: SystemMetrics): BenchmarkRow[] {
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

  const rows: Omit<BenchmarkRow, 'score'>[] = [
    {
      key: 'pce',
      metric: 'Process cycle efficiency',
      unit: '%',
      current: m.pce,
      typical: 2,
      worldClass: 25,
      higherIsBetter: true,
      comment: 'Share of lead time that adds value. Discrete-manufacturing world class ≥ 25%.',
    },
    {
      key: 'availability',
      metric: 'Average availability (OEE-A)',
      unit: '%',
      current: avgAvailability * 100,
      typical: 75,
      worldClass: 90,
      higherIsBetter: true,
      comment: 'Mean uptime ratio across stations. World-class OEE programs hold ≥ 90% availability.',
    },
    {
      key: 'fpy',
      metric: 'First pass yield',
      unit: '%',
      current: m.firstPassYield * 100,
      typical: 90,
      worldClass: 99,
      higherIsBetter: true,
      comment: 'Probability a part passes every station without rework or scrap.',
    },
    {
      key: 'inventory',
      metric: 'Inventory coverage',
      unit: 'days',
      current: inventoryDays,
      typical: 15,
      worldClass: 2,
      higherIsBetter: false,
      comment: 'Total queued WIP expressed in days of demand.',
    },
    {
      key: 'setup',
      metric: 'Setup share of processing',
      unit: '%',
      current: setupShare,
      typical: 20,
      worldClass: 5,
      higherIsBetter: false,
      comment: 'Amortized changeover as share of total station time. SMED targets < 5%.',
    },
    {
      key: 'capacity',
      metric: 'Capacity vs demand',
      unit: '%',
      current: capacityMargin,
      typical: 100,
      worldClass: 120,
      higherIsBetter: true,
      comment: 'Bottleneck throughput as a share of demand. < 100% means missed shipments.',
    },
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
