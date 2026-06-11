import { describe, expect, it } from 'vitest'
import {
  computeProcessMetrics,
  computeSystemMetrics,
  effectiveCycleTime,
  qualityCycleTime,
  setupAmortization,
} from './analytics'
import { computeRouteMetrics, polylineLength } from './spaghetti'
import { generateKaizenSuggestions } from './copilot'
import type { DemandConfig, VsmNode } from '../types'

const demand: DemandConfig = {
  unitsPerDay: 460,
  shiftsPerDay: 2,
  netMinutesPerShift: 435,
  daysPerYear: 240,
  partWeightKg: 2,
  gridCo2PerKwh: 0.4,
  laborRatePerHour: 40,
}

const proc = (over: Partial<VsmNode>): VsmNode => ({
  id: over.id ?? 'p',
  kind: 'process',
  label: over.label ?? 'P',
  x: over.x ?? 0,
  y: 0,
  ct: 30,
  setup: 0,
  batch: 1,
  availability: 1,
  scrap: 0,
  operators: 1,
  valueAdd: true,
  ...over,
})

describe('lean math primitives', () => {
  it('divides nominal CT by availability (OEE-A)', () => {
    expect(effectiveCycleTime(60, 0.8)).toBeCloseTo(75)
    // availability is floored at 10%
    expect(effectiveCycleTime(60, 0.01)).toBeCloseTo(600)
  })

  it('compounds scrap into quality-adjusted CT', () => {
    expect(qualityCycleTime(75, 0.2)).toBeCloseTo(93.75)
    expect(qualityCycleTime(75, 0)).toBeCloseTo(75)
  })

  it('amortizes setup over the batch', () => {
    expect(setupAmortization(3600, 600)).toBeCloseTo(6)
    expect(setupAmortization(3600, 0)).toBeCloseTo(3600) // batch floored at 1
  })

  it('chains the full grand CT waterfall', () => {
    const m = computeProcessMetrics(
      proc({ ct: 60, availability: 0.8, scrap: 0.25, setup: 900, batch: 100 }),
      120,
    )
    expect(m.ctEffective).toBeCloseTo(75) // 60 / 0.8
    expect(m.ctQuality).toBeCloseTo(100) // 75 / 0.75
    expect(m.setupPenalty).toBeCloseTo(9) // 900 / 100
    expect(m.ctGrand).toBeCloseTo(109)
    expect(m.exceedsTakt).toBe(false)
    expect(m.taktUtilization).toBeCloseTo(109 / 120)
  })

  it('flags takt violation and SMED loss', () => {
    const m = computeProcessMetrics(proc({ ct: 10, setup: 600, batch: 50 }), 11)
    expect(m.setupPenalty).toBeCloseTo(12)
    expect(m.smedAlert).toBe(true) // 12 > 0.5 × 10
    expect(m.ctGrand).toBeCloseTo(22)
    expect(m.exceedsTakt).toBe(true)
  })
})

describe('system metrics', () => {
  it('computes takt, PLT, PCE and bottleneck across the chain', () => {
    const nodes: VsmNode[] = [
      proc({ id: 'a', x: 0, ct: 30 }),
      { id: 'q', kind: 'inventory', label: 'WIP', x: 50, y: 0, qty: 460 }, // exactly 1 day
      proc({ id: 'b', x: 100, ct: 50 }),
    ]
    const m = computeSystemMetrics(nodes, demand)
    const daySec = 2 * 435 * 60
    expect(m.availableSecondsPerDay).toBe(daySec)
    expect(m.taktSeconds).toBeCloseTo(daySec / 460)
    expect(m.totalValueAddSeconds).toBeCloseTo(80)
    expect(m.totalNvaSeconds).toBeCloseTo(daySec)
    expect(m.leadTimeSeconds).toBeCloseTo(80 + daySec)
    expect(m.pce).toBeCloseTo((80 / (80 + daySec)) * 100)
    expect(m.bottleneck?.nodeId).toBe('b')
    expect(m.systemCapacityPerDay).toBeCloseTo(daySec / 50)
    // ladder follows x-order: process, inventory, process
    expect(m.ladder.map((l) => l.type)).toEqual(['va', 'nva', 'va'])
  })

  it('excludes non-value-add stations from VA but not from lead time', () => {
    const nodes: VsmNode[] = [
      proc({ id: 'a', ct: 30 }),
      proc({ id: 'qc', x: 10, ct: 20, kind: 'qcGate', valueAdd: false }),
    ]
    const m = computeSystemMetrics(nodes, demand)
    expect(m.totalValueAddSeconds).toBeCloseTo(30)
    expect(m.totalProcessingSeconds).toBeCloseTo(50)
  })

  it('raises alerts for takt violations', () => {
    const m = computeSystemMetrics([proc({ ct: 9999 })], demand)
    expect(m.alerts.some((a) => a.level === 'critical')).toBe(true)
  })
})

describe('spaghetti economics', () => {
  it('measures polylines and prices routes by mode', () => {
    expect(polylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }])).toBeCloseTo(5)
    const r = computeRouteMetrics(
      { id: 'r', name: 'test', mode: 'forklift', tripsPerShift: 10, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] },
      0.5, // 100 units → 50 m one-way
      2,
      240,
    )
    expect(r.meters).toBeCloseTo(50)
    // 50 m × 2 (round trip) × 10 trips × $1.20 = $1200/shift
    expect(r.costPerShift).toBeCloseTo(1200)
    expect(r.costPerYear).toBeCloseTo(1200 * 2 * 240)
    expect(r.steps).toBe(0) // steps only counted for walking
  })
})

describe('kaizen co-pilot', () => {
  it('suggestions reproduce their quoted impact when applied', () => {
    const nodes: VsmNode[] = [
      proc({ id: 'a', ct: 30, availability: 0.6, scrap: 0.1, setup: 1200, batch: 40 }),
      { id: 'q', kind: 'inventory', label: 'WIP', x: 50, y: 0, qty: 4600 },
    ]
    const base = computeSystemMetrics(nodes, demand)
    const suggestions = generateKaizenSuggestions(nodes, demand, base)
    expect(suggestions.length).toBeGreaterThan(0)
    for (const s of suggestions) {
      const applied = nodes.map((n) => (n.id === s.nodeId ? { ...n, ...s.patch } : n))
      const after = computeSystemMetrics(applied, demand)
      expect(after.pce).toBeCloseTo(s.pceAfter, 6)
      expect(after.leadTimeSeconds).toBeCloseTo(s.leadTimeAfter, 4)
    }
  })
})
