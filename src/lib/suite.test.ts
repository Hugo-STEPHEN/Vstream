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
