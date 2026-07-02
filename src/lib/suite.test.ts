import { describe, expect, it } from 'vitest'
import { computeSystemMetrics } from './analytics'
import { computeBenchmarks, overallGrade } from './benchmarks'
import { generateKaizenSuggestions } from './copilot'
import { sweepSensitivity } from './sensitivity'
import { computeSpaghettiSummary, computeTransportAudit } from './spaghetti'
import { buildHtmlReport } from './report'
import { DEFINITIONS, DEFINITION_CATEGORIES } from '../data/definitions'
import type { DemandConfig, SpaghettiState, VsmNode, VsmProject } from '../types'

const demand: DemandConfig = {
  unitsPerDay: 200,
  shiftsPerDay: 2,
  netMinutesPerShift: 435,
  daysPerYear: 240,
  partWeightKg: 2,
  gridCo2PerKwh: 0.4,
  laborRatePerHour: 40,
}

const station: VsmNode = {
  id: 'p1', kind: 'process', label: 'Mill', x: 0, y: 0,
  ct: 60, setup: 600, batch: 100, availability: 0.7, scrap: 0.05, operators: 1, valueAdd: true,
}

describe('sensitivity sweeps', () => {
  it('re-simulates the engine across the availability range', () => {
    const sweep = sweepSensitivity([station], demand, 'p1', 'availability')
    expect(sweep).not.toBeNull()
    expect(sweep!.points).toHaveLength(25)
    expect(sweep!.current).toBeCloseTo(0.7)
    // Better availability → shorter grand CT → higher PCE and capacity.
    const first = sweep!.points[0]
    const last = sweep!.points[sweep!.points.length - 1]
    expect(first.value).toBeCloseTo(0.1)
    expect(last.value).toBeCloseTo(1)
    expect(last.pce).toBeGreaterThan(first.pce)
    expect(last.capacityPerDay).toBeGreaterThan(first.capacityPerDay)
    expect(last.ctGrand).toBeLessThan(first.ctGrand)
  })

  it('sweep points match a direct engine run', () => {
    const sweep = sweepSensitivity([station], demand, 'p1', 'scrap')!
    const mid = sweep.points[12]
    const direct = computeSystemMetrics(
      [{ ...station, scrap: mid.value }],
      demand,
    )
    expect(mid.pce).toBeCloseTo(direct.pce, 8)
    expect(mid.capacityPerDay).toBeCloseTo(direct.systemCapacityPerDay, 8)
  })

  it('returns null for unknown nodes', () => {
    expect(sweepSensitivity([station], demand, 'nope', 'ct')).toBeNull()
  })
})

describe('transport audit (VSM ↔ spaghetti)', () => {
  const floor: SpaghettiState = {
    metersPerUnit: 0.5,
    zones: [],
    routes: [
      {
        id: 'r1', name: 'Dock → Mill', mode: 'walk', tripsPerShift: 10,
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], // 50 m one-way
        linkedNodeId: 'p1',
      },
      {
        id: 'r2', name: 'Unlinked', mode: 'agv', tripsPerShift: 5,
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
      },
    ],
  }

  it('allocates linked route travel over the parts of a shift', () => {
    const audit = computeTransportAudit(floor, 100)
    expect(audit.rows).toHaveLength(1) // unlinked routes excluded
    const r = audit.rows[0]
    // 50 m × 2 × 10 trips = 1000 m/shift; walk 1.2 m/s → 833.3 s ÷ 100 parts
    expect(r.secondsPerPart).toBeCloseTo(1000 / 1.2 / 100)
    // 1000 m × $0.15 ÷ 100 parts
    expect(r.costPerPart).toBeCloseTo(1.5)
    expect(audit.totalSecondsPerPart).toBeCloseTo(r.secondsPerPart)
  })

  it('is empty when no parts are produced', () => {
    expect(computeTransportAudit(floor, 0).rows).toHaveLength(0)
  })
})

describe('need definitions dictionary', () => {
  it('covers every category with unique, complete terms', () => {
    const terms = DEFINITIONS.map((d) => d.term)
    expect(new Set(terms).size).toBe(terms.length)
    for (const cat of DEFINITION_CATEGORIES) {
      expect(DEFINITIONS.some((d) => d.category === cat)).toBe(true)
    }
    for (const d of DEFINITIONS) {
      expect(d.formula.length).toBeGreaterThan(0)
      expect(d.definition.length).toBeGreaterThan(20)
    }
  })

  it('documents the core engine quantities', () => {
    for (const term of ['Takt time', 'CT effective', 'CT quality', 'Setup penalty', 'CT grand',
      'Lead time (PLT)', 'Process cycle efficiency (PCE)', 'Transport time per part']) {
      expect(DEFINITIONS.some((d) => d.term === term)).toBe(true)
    }
  })
})

describe('executive report', () => {
  it('renders a self-contained, escaped HTML audit', () => {
    const nodes: VsmNode[] = [station, { id: 'q', kind: 'inventory', label: 'WIP <queue>', x: 50, y: 0, qty: 400 }]
    const project: VsmProject = {
      schema: 'vstream/v1',
      name: 'Line <A> & B',
      savedAt: new Date().toISOString(),
      nodes,
      edges: [],
      demand,
      spaghetti: { metersPerUnit: 0.5, zones: [], routes: [] },
    }
    const metrics = computeSystemMetrics(nodes, demand)
    const benchmarks = computeBenchmarks(metrics)
    const html = buildHtmlReport({
      project,
      metrics,
      benchmarks,
      grade: overallGrade(benchmarks),
      spaghetti: computeSpaghettiSummary(project.spaghetti, demand.shiftsPerDay, demand.daysPerYear),
      transport: computeTransportAudit(project.spaghetti, 100),
      suggestions: generateKaizenSuggestions(nodes, demand, metrics),
    })
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Line &lt;A&gt; &amp; B') // escaped project name
    expect(html).toContain('WIP &lt;queue&gt;') // escaped node label
    expect(html).toContain('Mill') // station audit row
    expect(html).toContain(metrics.pce.toFixed(2)) // computed PCE figure
    expect(html).toContain('need definitions') // appendix present
    expect(html).toContain('Setup penalty') // dictionary term in appendix
  })
})

describe('calibration', () => {
  it('merges partial or missing configs onto factory defaults', async () => {
    const { mergeCalibration, DEFAULT_CALIBRATION } = await import('./calibration')
    expect(mergeCalibration()).toEqual(DEFAULT_CALIBRATION)
    const merged = mergeCalibration({
      currency: '€',
      alerts: { scrapWarn: 0.1 },
      transport: { walk: { costPerMeter: 0.5 } },
      benchmarks: { pce: { worldClass: 40 } },
    })
    expect(merged.currency).toBe('€')
    expect(merged.alerts.scrapWarn).toBeCloseTo(0.1)
    expect(merged.alerts.availabilityWarn).toBeCloseTo(0.7) // default kept
    expect(merged.transport.walk.costPerMeter).toBeCloseTo(0.5)
    expect(merged.transport.walk.speedMps).toBeCloseTo(1.2) // default kept
    expect(merged.transport.forklift).toEqual(DEFAULT_CALIBRATION.transport.forklift)
    expect(merged.benchmarks.pce).toEqual({ typical: 2, worldClass: 40 })
  })

  it('alert thresholds drive which flags fire', async () => {
    const { mergeCalibration } = await import('./calibration')
    const node: VsmNode = { ...station, scrap: 0.04, availability: 0.75, setup: 0 }
    const loose = computeSystemMetrics([node], demand) // defaults: 4% scrap < 5%, 75% ≥ 70%
    expect(loose.alerts.filter((a) => a.id.startsWith('scrap-'))).toHaveLength(0)
    expect(loose.alerts.filter((a) => a.id.startsWith('oee-'))).toHaveLength(0)
    const strict = computeSystemMetrics(
      [node],
      demand,
      mergeCalibration({ alerts: { scrapWarn: 0.02, availabilityWarn: 0.8 } }),
    )
    expect(strict.alerts.some((a) => a.id === `scrap-${node.id}`)).toBe(true)
    expect(strict.alerts.some((a) => a.id === `oee-${node.id}`)).toBe(true)
  })

  it('SMED factor calibrates the setup flag', async () => {
    const { mergeCalibration } = await import('./calibration')
    // setup penalty = 600/100 = 6s on a 60s CT → 10% share
    const def = computeSystemMetrics([station], demand)
    expect(def.processes[0].smedAlert).toBe(false) // 6 < 0.5 × 60
    const tight = computeSystemMetrics([station], demand, mergeCalibration({ alerts: { smedFactor: 0.05 } }))
    expect(tight.processes[0].smedAlert).toBe(true) // 6 > 0.05 × 60
  })

  it('transport cost calibration reprices routes and audits', async () => {
    const { mergeCalibration } = await import('./calibration')
    const floor: SpaghettiState = {
      metersPerUnit: 0.5,
      zones: [],
      routes: [{
        id: 'r1', name: 'R', mode: 'walk', tripsPerShift: 10,
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], linkedNodeId: 'p1',
      }],
    }
    const cal = mergeCalibration({ transport: { walk: { costPerMeter: 0.3, speedMps: 2.4 } } })
    const summary = computeSpaghettiSummary(floor, 2, 240, cal)
    expect(summary.routes[0].costPerShift).toBeCloseTo(1000 * 0.3) // 1000 m/shift × $0.30
    const audit = computeTransportAudit(floor, 100, cal)
    expect(audit.rows[0].secondsPerPart).toBeCloseTo(1000 / 2.4 / 100) // calibrated speed
  })

  it('benchmark bands recalibrate scores and grade', async () => {
    const { mergeCalibration } = await import('./calibration')
    const m = computeSystemMetrics([{ ...station, availability: 0.8 }], demand)
    const defRow = computeBenchmarks(m).find((r) => r.key === 'availability')!
    // band 75→90: 80% scores 33
    expect(defRow.score).toBeCloseTo(((80 - 75) / 15) * 100, 0)
    const cal = mergeCalibration({ benchmarks: { availability: { typical: 60, worldClass: 80 } } })
    const calRow = computeBenchmarks(m, cal).find((r) => r.key === 'availability')!
    expect(calRow.score).toBeCloseTo(100) // 80% hits the calibrated world class
  })

  it('report renders the calibration in force with its currency', async () => {
    const { mergeCalibration } = await import('./calibration')
    const cal = mergeCalibration({ currency: '€', alerts: { inventoryDaysWarn: 3 } })
    const nodes: VsmNode[] = [station]
    const project: VsmProject = {
      schema: 'vstream/v1', name: 'Cal plant', savedAt: new Date().toISOString(),
      nodes, edges: [], demand,
      spaghetti: { metersPerUnit: 0.5, zones: [], routes: [] },
      calibration: cal,
    }
    const metrics = computeSystemMetrics(nodes, demand, cal)
    const benchmarks = computeBenchmarks(metrics, cal)
    const html = buildHtmlReport({
      project, metrics, benchmarks, grade: overallGrade(benchmarks),
      spaghetti: computeSpaghettiSummary(project.spaghetti, 2, 240, cal),
      transport: computeTransportAudit(project.spaghetti, 100, cal),
      suggestions: [], calibration: cal,
    })
    expect(html).toContain('Model calibration in force')
    expect(html).toContain('coverage &gt; 3 days')
    expect(html).toContain('€1.20/m') // forklift default priced in calibrated currency
  })
})

describe('TRS / TRG / TRE (NF E 60-182)', () => {
  it('chains performance into the CT waterfall and the three rates', async () => {
    const { computeProcessMetrics } = await import('./analytics')
    const m = computeProcessMetrics(
      {
        id: 'x', kind: 'process', label: 'X', x: 0, y: 0,
        ct: 36, availability: 0.8, performance: 0.9, scrap: 0.1,
        engagement: 0.8, opening: 0.5, setup: 0, batch: 1,
      },
      120,
    )
    expect(m.ctEffective).toBeCloseTo(36 / (0.8 * 0.9)) // 50s — speed losses included
    expect(m.ctQuality).toBeCloseTo(50 / 0.9)
    expect(m.trs).toBeCloseTo(0.8 * 0.9 * 0.9) // 64.8%
    expect(m.trg).toBeCloseTo(m.trs * 0.8)
    expect(m.tre).toBeCloseTo(m.trg * 0.5)
  })

  it('defaults keep legacy models unchanged (P = engagement = opening = 1)', async () => {
    const { computeProcessMetrics } = await import('./analytics')
    const m = computeProcessMetrics(station, 120)
    expect(m.performance).toBe(1)
    expect(m.ctEffective).toBeCloseTo(60 / 0.7)
    expect(m.trs).toBeCloseTo(0.7 * 1 * 0.95)
    expect(m.trg).toBeCloseTo(m.trs)
    expect(m.tre).toBeCloseTo(m.trs)
  })
})

describe('operator circuits (spaghetti → VSM)', () => {
  it('charges circuit seconds against a station as availability loss', async () => {
    const { computeProcessMetrics } = await import('./analytics')
    const base = computeProcessMetrics(station, 120, 0.5, 0)
    const withCircuit = computeProcessMetrics(station, 120, 0.5, 0.2)
    // TRS drops by exactly the (1 - loss) factor on availability.
    expect(withCircuit.trs).toBeCloseTo(base.trs * 0.8)
    expect(withCircuit.circuitLoss).toBeCloseTo(0.2)
    // Effective cycle time stretches, so grand CT grows.
    expect(withCircuit.ctGrand).toBeGreaterThan(base.ctGrand)
  })

  it('circuitSecondsByNode sums only flagged, linked routes', async () => {
    const { circuitSecondsByNode } = await import('./spaghetti')
    const floor: SpaghettiState = {
      metersPerUnit: 0.5,
      zones: [],
      routes: [
        { id: 'a', name: 'A', mode: 'walk', tripsPerShift: 10, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], linkedNodeId: 'p1', operatorCircuit: true },
        { id: 'b', name: 'B', mode: 'walk', tripsPerShift: 10, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], linkedNodeId: 'p1' }, // not a circuit
        { id: 'c', name: 'C', mode: 'walk', tripsPerShift: 5, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], operatorCircuit: true }, // not linked
      ],
    }
    const map = circuitSecondsByNode(floor, 2)
    // route a: 50m ×2 ×10 = 1000 m/shift ÷ 1.2 m/s × 2 shifts
    expect(map.get('p1')).toBeCloseTo((1000 / 1.2) * 2)
    expect(map.size).toBe(1)
  })

  it('a linked operator circuit lowers the whole-system capacity', async () => {
    const { circuitSecondsByNode } = await import('./spaghetti')
    const nodes: VsmNode[] = [station]
    const floor: SpaghettiState = {
      metersPerUnit: 1, zones: [],
      routes: [{ id: 'r', name: 'R', mode: 'walk', tripsPerShift: 60, points: [{ x: 0, y: 0 }, { x: 200, y: 0 }], linkedNodeId: 'p1', operatorCircuit: true }],
    }
    const noCircuit = computeSystemMetrics(nodes, demand)
    const withCircuit = computeSystemMetrics(nodes, demand, undefined, circuitSecondsByNode(floor, demand.shiftsPerDay))
    expect(withCircuit.systemCapacityPerDay).toBeLessThan(noCircuit.systemCapacityPerDay)
  })
})
