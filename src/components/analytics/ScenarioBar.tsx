import { useMemo, useState } from 'react'
import { Camera, CornerUpLeft, Trash2 } from 'lucide-react'
import { useApp } from '../../store'
import { computeSystemMetrics, fmtSeconds } from '../../lib/analytics'
import { computeBenchmarks, overallGrade } from '../../lib/benchmarks'
import { circuitSecondsByNode } from '../../lib/spaghetti'
import { Badge, Section } from '../ui'
import { useT } from '../../i18n'
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
  circuits: ReadonlyMap<string, number>,
  savedAt?: string,
): ScenarioRow {
  const metrics = computeSystemMetrics(nodes, demand, cal, circuits)
  return { id, name, savedAt, metrics, grade: overallGrade(computeBenchmarks(metrics, cal)).grade }
}

/**
 * Multivariable sandbox: freeze the current model as a named scenario, tweak
 * parameters on the canvas, then compare every saved state side by side and
 * jump back to any of them.
 */
export function ScenarioBar() {
  const { t } = useT()
  const nodes = useApp((s) => s.nodes)
  const demand = useApp((s) => s.demand)
  const scenarios = useApp((s) => s.scenarios)
  const calibration = useApp((s) => s.calibration)
  const spaghetti = useApp((s) => s.spaghetti)
  const [name, setName] = useState('')

  const rows = useMemo<ScenarioRow[]>(() => {
    const circuits = circuitSecondsByNode(spaghetti, demand.shiftsPerDay, calibration)
    return [
      row(null, t('ana.currentModel'), nodes, demand, calibration, circuits),
      ...scenarios.map((sc) => row(sc.id, sc.name, sc.nodes, sc.demand, calibration, circuits, sc.savedAt)),
    ]
  }, [nodes, demand, scenarios, calibration, spaghetti, t])
  const base = rows[0].metrics

  const save = () => {
    useApp.getState().saveScenario(name.trim() || `Scenario ${scenarios.length + 1}`)
    setName('')
  }

  return (
    <Section
      title={t('ana.scenarios')}
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
            title={t('ana.saveHint')}>
            <Camera size={12} /> {t('ana.saveCurrent')}
          </button>
        </div>
      }
    >
      {rows.length === 1 ? (
        <p className="text-xs text-slate-500">{t('ana.noScenarios')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-slate-500">
                {[t('ana.thScenario'), t('ana.thLeadTime'), 'PCE', t('ana.thCapacity'), 'FPY', t('ana.thGrade'), ''].map((h, i) => (
                  <th key={i} className="pb-1.5 pr-3 font-medium">{h}</th>
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
                          <button className="btn-ghost flex items-center gap-1 !py-1" title={t('ana.applyScenarioHint')}
                            onClick={() => useApp.getState().applyScenario(r.id as string)}>
                            <CornerUpLeft size={11} /> {t('ana.apply')}
                          </button>
                          <button className="btn-ghost !py-1 hover:!text-crit" title={t('ana.deleteScenario')}
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
      <p className="text-[10.5px] text-slate-500">{t('ana.scenarioNote')}</p>
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
