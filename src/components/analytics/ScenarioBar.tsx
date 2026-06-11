import { useMemo, useState } from 'react'
import { Camera, CornerUpLeft, Trash2 } from 'lucide-react'
import { useApp } from '../../store'
import { computeSystemMetrics, fmtSeconds } from '../../lib/analytics'
import { computeBenchmarks, overallGrade } from '../../lib/benchmarks'
import { Badge, Section } from '../ui'
import type { CalibrationConfig, DemandConfig, SystemMetrics, VsmNode } from '../../types'

interface ScenarioRow {
  id: string | null
  name: string
  savedAt?: string
  metrics: SystemMetrics
  grade: string
}

function row(
  id: string | null,
  name: string,
  nodes: VsmNode[],
  demand: DemandConfig,
  cal: CalibrationConfig,
  savedAt?: string,
): ScenarioRow {
  const metrics = computeSystemMetrics(nodes, demand, cal)
  return { id, name, savedAt, metrics, grade: overallGrade(computeBenchmarks(metrics, cal)).grade }
}

/**
 * Multivariable sandbox: freeze the current model as a named scenario, tweak
 * parameters on the canvas, then compare every saved state side by side and
 * jump back to any of them.
 */
export function ScenarioBar() {
  const nodes = useApp((s) => s.nodes)
  const demand = useApp((s) => s.demand)
  const scenarios = useApp((s) => s.scenarios)
  const calibration = useApp((s) => s.calibration)
  const [name, setName] = useState('')

  const rows = useMemo<ScenarioRow[]>(
    () => [
      row(null, 'Current model', nodes, demand, calibration),
      ...scenarios.map((sc) => row(sc.id, sc.name, sc.nodes, sc.demand, calibration, sc.savedAt)),
    ],
    [nodes, demand, scenarios, calibration],
  )
  const base = rows[0].metrics

  const save = () => {
    useApp.getState().saveScenario(name.trim() || `Scenario ${scenarios.length + 1}`)
    setName('')
  }

  return (
    <Section
      title="Scenario workbench — what-if comparison"
      right={
        <div className="flex items-center gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder={`Scenario ${scenarios.length + 1}`}
            className="w-36 rounded-md border border-edge bg-ink px-2 py-1 text-[11px] text-slate-200
              focus:border-flow/70 focus:outline-none transition-colors"
          />
          <button className="btn-ghost flex items-center gap-1 !text-flow hover:!border-flow/50" onClick={save}
            title="Freeze the current stations, connections and demand as a named scenario">
            <Camera size={12} /> Save current
          </button>
        </div>
      }
    >
      {rows.length === 1 ? (
        <p className="text-xs text-slate-500">
          No scenarios yet. Save the current model as a baseline, then change parameters on the canvas
          (or apply kaizen suggestions) and save again — every saved state is compared here side by side.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-slate-500">
                {['Scenario', 'Lead time', 'PCE', 'Capacity', 'FPY', 'Grade', ''].map((h) => (
                  <th key={h} className="pb-1.5 pr-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono">
              {rows.map((r) => {
                const isBase = r.id === null
                const dPce = r.metrics.pce - base.pce
                const dLead = r.metrics.leadTimeSeconds - base.leadTimeSeconds
                const dCap = r.metrics.systemCapacityPerDay - base.systemCapacityPerDay
                return (
                  <tr key={r.id ?? 'current'} className="border-t border-edge/60">
                    <td className="py-1.5 pr-3 font-ui text-slate-200">
                      {r.name}
                      {isBase && <Badge tone="flow">LIVE</Badge>}
                      {r.savedAt && (
                        <span className="ml-1.5 text-[9px] text-slate-600">{r.savedAt.slice(0, 10)}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-300">
                      {fmtDays(r.metrics.leadTimeSeconds, r.metrics.availableSecondsPerDay)}
                      {!isBase && <Delta value={-dLead} fmt={(v) => fmtSeconds(Math.abs(v))} />}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-300">
                      {r.metrics.pce.toFixed(2)}%
                      {!isBase && <Delta value={dPce} fmt={(v) => `${Math.abs(v).toFixed(2)}pp`} />}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-300">
                      {Math.floor(r.metrics.systemCapacityPerDay)} u/d
                      {!isBase && <Delta value={dCap} fmt={(v) => `${Math.abs(v).toFixed(0)}`} />}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-300">{(r.metrics.firstPassYield * 100).toFixed(1)}%</td>
                    <td className="py-1.5 pr-3 text-slate-200">{r.grade}</td>
                    <td className="py-1.5 text-right">
                      {!isBase && r.id && (
                        <span className="flex justify-end gap-1">
                          <button className="btn-ghost flex items-center gap-1 !py-1" title="Apply this scenario to the canvas (undoable)"
                            onClick={() => useApp.getState().applyScenario(r.id as string)}>
                            <CornerUpLeft size={11} /> Apply
                          </button>
                          <button className="btn-ghost !py-1 hover:!text-crit" title="Delete scenario"
                            onClick={() => useApp.getState().deleteScenario(r.id as string)}>
                            <Trash2 size={11} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10.5px] text-slate-500">
        Deltas are measured against the live model. Scenarios freeze stations, connections and demand —
        they are saved with the project file and survive export/import.
      </p>
    </Section>
  )
}

/** Signed delta chip: green when the change is an improvement. */
function Delta({ value, fmt }: { value: number; fmt: (v: number) => string }) {
  if (Math.abs(value) < 1e-6) return null
  const better = value > 0
  return (
    <span className={`ml-1.5 text-[9.5px] ${better ? 'text-pull' : 'text-crit'}`}>
      {better ? '▲' : '▼'}{fmt(value)}
    </span>
  )
}

function fmtDays(seconds: number, perDay: number): string {
  return perDay > 0 ? `${(seconds / perDay).toFixed(1)}d` : fmtSeconds(seconds)
}
