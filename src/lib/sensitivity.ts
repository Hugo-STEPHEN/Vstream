import { computeSystemMetrics } from './analytics'
import { DEFAULT_CALIBRATION } from './calibration'
import type { CalibrationConfig, DemandConfig, VsmNode } from '../types'

/** Station parameters that can be swept in the sensitivity explorer. */
export type SweepParam = 'ct' | 'availability' | 'performance' | 'scrap' | 'setup' | 'batch'

export interface SweepParamDef {
  param: SweepParam
  label: string
  unit: string
  /** Sweep range derived from the node's current value. */
  range: (node: VsmNode) => { min: number; max: number }
  read: (node: VsmNode) => number
  write: (value: number) => Partial<VsmNode>
  /** Display scaling (ratios are shown as %). */
  displayFactor: number
}

export const SWEEP_PARAMS: SweepParamDef[] = [
  {
    param: 'ct',
    label: 'Cycle time',
    unit: 's',
    range: (n) => ({ min: Math.max(1, (n.ct ?? 30) * 0.25), max: Math.max(10, (n.ct ?? 30) * 2) }),
    read: (n) => n.ct ?? 0,
    write: (ct) => ({ ct }),
    displayFactor: 1,
  },
  {
    param: 'availability',
    label: 'OEE availability',
    unit: '%',
    range: () => ({ min: 0.1, max: 1 }),
    read: (n) => n.availability ?? 1,
    write: (availability) => ({ availability }),
    displayFactor: 100,
  },
  {
    param: 'performance',
    label: 'Performance rate',
    unit: '%',
    range: () => ({ min: 0.1, max: 1 }),
    read: (n) => n.performance ?? 1,
    write: (performance) => ({ performance }),
    displayFactor: 100,
  },
  {
    param: 'scrap',
    label: 'Scrap rate',
    unit: '%',
    range: () => ({ min: 0, max: 0.3 }),
    read: (n) => n.scrap ?? 0,
    write: (scrap) => ({ scrap }),
    displayFactor: 100,
  },
  {
    param: 'setup',
    label: 'Setup time',
    unit: 's',
    range: (n) => ({ min: 0, max: Math.max(600, (n.setup ?? 0) * 2) }),
    read: (n) => n.setup ?? 0,
    write: (setup) => ({ setup }),
    displayFactor: 1,
  },
  {
    param: 'batch',
    label: 'Batch size',
    unit: 'pcs',
    range: (n) => ({ min: 1, max: Math.max(100, (n.batch ?? 1) * 4) }),
    read: (n) => n.batch ?? 1,
    write: (batch) => ({ batch: Math.max(1, Math.round(batch)) }),
    displayFactor: 1,
  },
]

export const SWEEP_PARAM_BY_KEY = new Map(SWEEP_PARAMS.map((p) => [p.param, p]))

export interface SweepPoint {
  /** Raw parameter value (display with the param's displayFactor). */
  value: number
  pce: number
  leadTimeSeconds: number
  capacityPerDay: number
  ctGrand: number
}

export interface SweepResult {
  nodeId: string
  param: SweepParam
  current: number
  points: SweepPoint[]
}

/**
 * Sweep one station parameter across its range, re-running the full system
 * engine at every step — honest discrete simulation, no interpolation.
 */
export function sweepSensitivity(
  nodes: VsmNode[],
  demand: DemandConfig,
  nodeId: string,
  param: SweepParam,
  steps = 25,
  cal: CalibrationConfig = DEFAULT_CALIBRATION,
): SweepResult | null {
  const def = SWEEP_PARAM_BY_KEY.get(param)
  const node = nodes.find((n) => n.id === nodeId)
  if (!def || !node) return null

  const { min, max } = def.range(node)
  const points: SweepPoint[] = []
  for (let i = 0; i < steps; i++) {
    const value = min + ((max - min) * i) / (steps - 1)
    const clone = nodes.map((n) => (n.id === nodeId ? { ...n, ...def.write(value) } : n))
    const m = computeSystemMetrics(clone, demand, cal)
    const pm = m.processes.find((p) => p.nodeId === nodeId)
    points.push({
      value,
      pce: m.pce,
      leadTimeSeconds: m.leadTimeSeconds,
      capacityPerDay: m.systemCapacityPerDay,
      ctGrand: pm?.ctGrand ?? 0,
    })
  }
  return { nodeId, param, current: def.read(node), points }
}
