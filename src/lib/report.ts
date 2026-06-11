import { DEFINITIONS, DEFINITION_CATEGORIES } from '../data/definitions'
import { fmtSeconds } from './analytics'
import { DEFAULT_CALIBRATION, transportProfiles } from './calibration'
import { download } from './exporters'
import { fmtMoney, type SpaghettiSummary, type TransportAudit } from './spaghetti'
import type { BenchmarkRow } from './benchmarks'
import type { KaizenSuggestion } from './copilot'
import type { CalibrationConfig, SystemMetrics, TransportMode, VsmProject } from '../types'

export interface ReportInput {
  project: VsmProject
  metrics: SystemMetrics
  benchmarks: BenchmarkRow[]
  grade: { score: number; grade: string }
  spaghetti: SpaghettiSummary
  transport: TransportAudit
  suggestions: KaizenSuggestion[]
  calibration?: CalibrationConfig
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const pct = (v: number, digits = 1): string => `${v.toFixed(digits)}%`

function days(seconds: number, perDay: number): string {
  return perDay > 0 ? `${(seconds / perDay).toFixed(1)} d` : fmtSeconds(seconds)
}

function table(headers: string[], rows: (string | number)[][]): string {
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('')
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${typeof c === 'number' ? c : esc(c)}</td>`).join('')}</tr>`)
    .join('\n')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

/**
 * Self-contained, print-ready (File → Print → PDF) executive report:
 * everything a steering committee needs without opening the app.
 */
export function buildHtmlReport(input: ReportInput): string {
  const { project, metrics: m, benchmarks, grade, spaghetti, transport, suggestions } = input
  const cal = input.calibration ?? DEFAULT_CALIBRATION
  const cur = cal.currency
  const generated = new Date().toLocaleString()

  const kpis: [string, string][] = [
    ['Takt time', fmtSeconds(m.taktSeconds)],
    ['Demand', `${m.demandPerDay} units/day`],
    ['System capacity', `${Math.floor(m.systemCapacityPerDay)} units/day`],
    ['Lead time', days(m.leadTimeSeconds, m.availableSecondsPerDay)],
    ['Value-add time', fmtSeconds(m.totalValueAddSeconds)],
    ['PCE', pct(m.pce, 2)],
    ['First pass yield', pct(m.firstPassYield * 100)],
    ['Direct labor', `${m.totalOperators.toFixed(1)} FTE`],
    ['Bottleneck', m.bottleneck?.label ?? '—'],
    ['Performance grade', `${grade.grade} (${grade.score.toFixed(0)}/100)`],
  ]

  const stationRows = [...m.processes]
    .sort((a, b) => b.taktUtilization - a.taktUtilization)
    .map((p) => [
      p.label,
      fmtSeconds(p.ctNominal),
      `${Math.round(p.availability * 100)}%`,
      pct(p.scrap * 100),
      `${p.setup}s / ${p.batch}`,
      fmtSeconds(p.ctGrand),
      `${Math.round(p.taktUtilization * 100)}%`,
      [p.exceedsTakt ? 'OVER TAKT' : '', p.smedAlert ? 'SMED' : '', m.bottleneck?.nodeId === p.nodeId ? 'BOTTLENECK' : '']
        .filter(Boolean)
        .join(', ') || '—',
    ])

  const inventoryRows = m.inventories.map((i) => [
    i.label,
    i.qty.toLocaleString(),
    `${i.days.toFixed(1)} d`,
    days(i.nvaSeconds, m.availableSecondsPerDay),
  ])

  const alertRows = m.alerts.map((a) => [a.level.toUpperCase(), a.title, a.detail])

  const kaizenRows = suggestions.map((s) => [
    s.action,
    `+${s.pceDelta.toFixed(2)} pp`,
    s.leadTimeDelta < -1 ? `−${fmtSeconds(-s.leadTimeDelta)}` : '—',
    `${Math.floor(s.capacityAfter)} u/day`,
  ])

  const benchmarkRows = benchmarks.map((r) => [
    r.metric,
    `${r.current.toFixed(1)} ${r.unit}`,
    `${r.typical} ${r.unit}`,
    `${r.worldClass} ${r.unit}`,
    `${Math.round(r.score)} / 100`,
  ])

  const routeRows = spaghetti.routes.map((r) => [
    r.name,
    r.mode,
    `${r.meters.toFixed(0)} m`,
    `${r.minutesPerShift.toFixed(1)} min`,
    fmtMoney(r.costPerShift, cur),
    fmtMoney(r.costPerYear, cur),
  ])

  const transportRows = transport.rows.map((r) => [
    r.routeName,
    r.mode,
    `${r.secondsPerPart.toFixed(1)} s/part`,
    `${cur}${r.costPerPart.toFixed(3)}/part`,
  ])

  const calProfiles = transportProfiles(cal)
  const calibrationRows: (string | number)[][] = [
    ['SMED flag', `setup penalty > ${cal.alerts.smedFactor} × CT nominal`],
    ['Scrap warning', `SR ≥ ${Math.round(cal.alerts.scrapWarn * 100)}%`],
    ['Availability warning', `A < ${Math.round(cal.alerts.availabilityWarn * 100)}%`],
    ['Inventory note', `coverage > ${cal.alerts.inventoryDaysWarn} days`],
    ['Low-PCE note', `PCE < ${cal.alerts.pceLowPct}%`],
    ...(['walk', 'forklift', 'agv'] as TransportMode[]).map((mode): (string | number)[] => [
      calProfiles[mode].label,
      `${cur}${cal.transport[mode].costPerMeter.toFixed(2)}/m @ ${cal.transport[mode].speedMps} m/s`,
    ]),
    ['Walking step length', `${cal.stepMeters} m`],
    ...benchmarks.map((b): (string | number)[] => [
      `Benchmark band — ${b.metric}`,
      `typical ${b.typical} ${b.unit} → world class ${b.worldClass} ${b.unit}`,
    ]),
  ]

  const definitionSections = DEFINITION_CATEGORIES.map((cat) => {
    const rows = DEFINITIONS.filter((d) => d.category === cat).map((d) => [d.term, d.formula, d.unit, d.definition])
    return `<h3>${esc(cat)}</h3>${table(['Term', 'Formula', 'Unit', 'Definition'], rows)}`
  }).join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(project.name)} — vStream value stream report</title>
<style>
  :root { --ink:#0B0F19; --accent:#0891B2; --warn:#B45309; --crit:#B91C1C; --line:#D8DEE6; }
  * { box-sizing: border-box; }
  body { font: 13px/1.5 'Segoe UI', system-ui, sans-serif; color: var(--ink); margin: 0; padding: 36px 44px; }
  h1 { font-size: 24px; margin: 0; letter-spacing: -0.02em; }
  h2 { font-size: 15px; margin: 28px 0 8px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent);
       border-bottom: 2px solid var(--line); padding-bottom: 4px; }
  h3 { font-size: 12.5px; margin: 16px 0 4px; }
  .meta { color: #5B6675; font-size: 11.5px; margin: 4px 0 0; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0 4px; font-size: 11.5px; }
  th { text-align: left; background: #F1F4F8; padding: 5px 8px; border: 1px solid var(--line); font-weight: 600; }
  td { padding: 4px 8px; border: 1px solid var(--line); vertical-align: top; }
  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 10px; }
  .kpi { border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; }
  .kpi .l { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #5B6675; }
  .kpi .v { font-size: 15px; font-weight: 600; font-family: Consolas, monospace; }
  .grade { display: inline-block; border: 2px solid var(--accent); color: var(--accent); border-radius: 8px;
           font-size: 26px; font-weight: 700; padding: 4px 14px; margin-right: 10px; }
  .footer { margin-top: 32px; padding-top: 8px; border-top: 1px solid var(--line); color: #8893A1; font-size: 10.5px; }
  @media print { body { padding: 0; } h2 { break-after: avoid; } table { break-inside: auto; } }
</style>
</head>
<body>
  <h1>${esc(project.name)}</h1>
  <p class="meta">vStream value stream intelligence report · generated ${esc(generated)} ·
    ${project.demand.shiftsPerDay} shift(s) × ${project.demand.netMinutesPerShift} net min · ${project.demand.daysPerYear} days/year</p>

  <h2>Executive summary</h2>
  <div class="kpis">
    ${kpis.map(([l, v]) => `<div class="kpi"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div></div>`).join('\n    ')}
  </div>

  <h2>Station audit — grand effective cycle times</h2>
  ${stationRows.length ? table(['Station', 'CT nominal', 'Avail.', 'Scrap', 'Setup/Batch', 'CT grand', 'Takt load', 'Flags'], stationRows) : '<p>No stations modeled.</p>'}

  <h2>Inventory & queues</h2>
  ${inventoryRows.length ? table(['Queue', 'Qty', 'Coverage', 'Dwell'], inventoryRows) : '<p>No inventory modeled.</p>'}

  <h2>Active alerts</h2>
  ${alertRows.length ? table(['Level', 'Alert', 'Detail'], alertRows) : '<p>No active flags — the stream meets takt with current parameters.</p>'}

  <h2>Kaizen countermeasures (simulated impact)</h2>
  ${kaizenRows.length ? table(['Action', 'PCE impact', 'Lead time', 'Capacity after'], kaizenRows) : '<p>No high-leverage countermeasure found.</p>'}

  <h2>Benchmark position <span class="grade">${esc(grade.grade)}</span>${grade.score.toFixed(0)} / 100</h2>
  ${table(['Metric', 'Current', 'Typical', 'World class', 'Score'], benchmarkRows)}

  <h2>Spaghetti economics</h2>
  ${routeRows.length ? table(['Route', 'Mode', 'One-way', 'Travel/shift', 'Cost/shift', 'Cost/year'], routeRows) : '<p>No routes drawn.</p>'}
  <p>Total ${fmtMoney(spaghetti.totalCostPerShift, cur)}/shift · ${fmtMoney(spaghetti.totalCostPerYear, cur)}/year ·
     best-mode ROI ${fmtMoney(spaghetti.bestModeSavingPerYear, cur)}/year.</p>
  ${transportRows.length ? `<h3>Transport waste per part (routes linked to VSM stations)</h3>${table(['Route', 'Mode', 'Time/part', 'Cost/part'], transportRows)}<p>Total conveyance: ${transport.totalSecondsPerPart.toFixed(1)} s and ${cur}${transport.totalCostPerPart.toFixed(3)} per produced part.</p>` : ''}

  <h2>ESG (E-VSM)</h2>
  ${table(['Energy', 'CO₂e', 'Scrap units', 'Scrap mass'], [[`${m.esg.kwhPerDay.toFixed(0)} kWh/day`, `${m.esg.co2KgPerDay.toFixed(0)} kg/day`, `${m.esg.scrapUnitsPerDay.toFixed(0)} u/day`, `${m.esg.scrapKgPerDay.toFixed(0)} kg/day`]])}

  <h2>Model calibration in force</h2>
  ${table(['Assumption', 'Calibrated value'], calibrationRows)}
  <p>All flags, costs and scores in this report were computed with these settings (tunable in-app).</p>

  <h2>Appendix — need definitions & formulas</h2>
  ${definitionSections}

  <p class="footer">vStream Suite — every figure in this report is recomputed from the model parameters through the
  documented formulas; no value is hand-entered. Benchmark references are lean rules of thumb for orientation.</p>
</body>
</html>`
}

export function exportHtmlReport(input: ReportInput): void {
  const html = buildHtmlReport(input)
  const name = input.project.name.replace(/\s+/g, '_')
  download(new Blob([html], { type: 'text/html' }), `${name}_report_${new Date().toISOString().slice(0, 10)}.html`)
}
