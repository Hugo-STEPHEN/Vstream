import type { SystemMetrics, VsmProject } from '../types'
import type { SpaghettiSummary } from './spaghetti'
import type { BenchmarkRow } from './benchmarks'
import { DEFINITIONS } from '../data/definitions'

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const stamp = (): string => new Date().toISOString().slice(0, 10)

export function exportProjectJson(project: VsmProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' })
  download(blob, `${project.name.replace(/\s+/g, '_')}_${stamp()}.vstream.json`)
}

export function parseProjectJson(text: string): VsmProject {
  const data = JSON.parse(text) as unknown
  if (
    typeof data !== 'object' || data === null ||
    (data as { schema?: string }).schema !== 'vstream/v1'
  ) {
    throw new Error('Not a vStream v1 project file')
  }
  const p = data as VsmProject
  if (!Array.isArray(p.nodes) || !Array.isArray(p.edges)) {
    throw new Error('Project file is missing nodes/edges')
  }
  return p
}

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((c) => (typeof c === 'string' && /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : String(c)))
        .join(','),
    )
    .join('\n')
}

export function exportMetricsCsv(name: string, m: SystemMetrics): void {
  const rows: (string | number)[][] = [
    ['Station', 'Kind', 'CT nominal (s)', 'Availability', 'Performance', 'Scrap rate', 'Setup (s)', 'Batch',
      'CT effective (s)', 'CT quality (s)', 'Setup penalty (s)', 'CT grand (s)', 'Takt load (%)',
      'TRS (%)', 'TRG (%)', 'TRE (%)',
      'Operators', 'Over takt', 'SMED alert'],
    ...m.processes.map((p) => [
      p.label, p.kind, p.ctNominal, p.availability, p.performance, p.scrap, p.setup, p.batch,
      round2(p.ctEffective), round2(p.ctQuality), round2(p.setupPenalty), round2(p.ctGrand),
      round2(p.taktUtilization * 100),
      round2(p.trs * 100), round2(p.trg * 100), round2(p.tre * 100),
      p.operators, p.exceedsTakt ? 'YES' : 'no',
      p.smedAlert ? 'YES' : 'no',
    ]),
    [],
    ['Inventory', 'Kind', 'Qty (pcs)', 'Coverage (days)', 'Dwell (s)'],
    ...m.inventories.map((i) => [i.label, i.kind, i.qty, round2(i.days), Math.round(i.nvaSeconds)]),
    [],
    ['System summary'],
    ['Takt (s)', round2(m.taktSeconds)],
    ['Demand (units/day)', m.demandPerDay],
    ['Capacity (units/day)', round2(m.systemCapacityPerDay)],
    ['Lead time (s)', Math.round(m.leadTimeSeconds)],
    ['Lead time (days)', round2(m.leadTimeSeconds / Math.max(1, m.availableSecondsPerDay))],
    ['Value-add time (s)', round2(m.totalValueAddSeconds)],
    ['PCE (%)', round2(m.pce)],
    ['First pass yield (%)', round2(m.firstPassYield * 100)],
    ['Bottleneck', m.bottleneck?.label ?? '—'],
  ]
  download(new Blob([toCsv(rows)], { type: 'text/csv' }), `${name}_metrics_${stamp()}.csv`)
}

export function exportSpaghettiCsv(name: string, s: SpaghettiSummary): void {
  const rows: (string | number)[][] = [
    ['Route', 'Mode', 'One-way distance (m)', 'Steps', 'Travel (min/shift)', 'Cost/shift ($)', 'Cost/year ($)'],
    ...s.routes.map((r) => [
      r.name, r.mode, round2(r.meters), r.steps, round2(r.minutesPerShift),
      round2(r.costPerShift), Math.round(r.costPerYear),
    ]),
    [],
    ['Total cost/shift ($)', round2(s.totalCostPerShift)],
    ['Total cost/year ($)', Math.round(s.totalCostPerYear)],
    ['Best-mode saving/year ($)', Math.round(s.bestModeSavingPerYear)],
  ]
  download(new Blob([toCsv(rows)], { type: 'text/csv' }), `${name}_spaghetti_${stamp()}.csv`)
}

export function exportBenchmarksCsv(name: string, rows: BenchmarkRow[], grade: { score: number; grade: string }): void {
  const table: (string | number)[][] = [
    ['Metric', 'Unit', 'Current', 'Typical', 'World class', 'Score (0-100)', 'Comment'],
    ...rows.map((r) => [r.metric, r.unit, round2(r.current), r.typical, r.worldClass, Math.round(r.score), r.comment]),
    [],
    ['Composite score', round2(grade.score)],
    ['Grade', grade.grade],
  ]
  download(new Blob([toCsv(table)], { type: 'text/csv' }), `${name}_benchmarks_${stamp()}.csv`)
}

export function exportDefinitionsCsv(): void {
  const table: (string | number)[][] = [
    ['Category', 'Term', 'Formula', 'Unit', 'Definition'],
    ...DEFINITIONS.map((d) => [d.category, d.term, d.formula, d.unit, d.definition]),
  ]
  download(new Blob([toCsv(table)], { type: 'text/csv' }), `vstream_data_dictionary_${stamp()}.csv`)
}

export interface SnapshotOptions {
  /** Frame the export on this world box instead of the current pan/zoom. */
  worldBox?: { width: number; height: number }
}

function cleanClone(svg: SVGSVGElement, opts?: SnapshotOptions): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.removeAttribute('class')
  clone.style.background = '#020617'
  if (opts?.worldBox) {
    clone.setAttribute('viewBox', `0 0 ${opts.worldBox.width} ${opts.worldBox.height}`)
    clone.setAttribute('width', String(opts.worldBox.width))
    clone.setAttribute('height', String(opts.worldBox.height))
    // Undo interactive pan/zoom on the world group so the full sheet is framed.
    clone.querySelector('[data-world]')?.removeAttribute('transform')
  }
  return clone
}

/** Snapshot any SVG canvas to a standalone .svg file. */
export function exportSvg(svg: SVGSVGElement, filename: string, opts?: SnapshotOptions): void {
  const text = new XMLSerializer().serializeToString(cleanClone(svg, opts))
  download(new Blob([text], { type: 'image/svg+xml' }), filename)
}

/** Snapshot any SVG canvas to a PNG at 2× resolution. */
export function exportPng(svg: SVGSVGElement, filename: string, opts?: SnapshotOptions): void {
  const clone = cleanClone(svg, opts)
  const rect = opts?.worldBox ?? svg.getBoundingClientRect()
  clone.setAttribute('width', String(rect.width))
  clone.setAttribute('height', String(rect.height))
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#020617'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((png) => {
        if (png) download(png, filename)
      })
    }
    URL.revokeObjectURL(url)
  }
  img.src = url
}

const round2 = (v: number): number => Math.round(v * 100) / 100
