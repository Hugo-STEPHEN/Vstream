import { useMemo, useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useApp } from '../../store'
import { isProcessKind } from '../../lib/analytics'
import { SWEEP_PARAMS, SWEEP_PARAM_BY_KEY, sweepSensitivity, type SweepParam } from '../../lib/sensitivity'
import { Section } from '../ui'

/**
 * Single-variable sensitivity curves: sweep one station parameter across its
 * range and watch PCE and capacity respond — the full engine runs at every
 * point of the curve.
 */
export function SensitivityExplorer() {
  const nodes = useApp((s) => s.nodes)
  const demand = useApp((s) => s.demand)

  const stations = useMemo(() => nodes.filter((n) => isProcessKind(n.kind)), [nodes])
  const [nodeId, setNodeId] = useState<string>('')
  const [param, setParam] = useState<SweepParam>('availability')

  const activeId = stations.some((n) => n.id === nodeId) ? nodeId : stations[0]?.id ?? ''
  const def = SWEEP_PARAM_BY_KEY.get(param)

  const sweep = useMemo(
    () => (activeId ? sweepSensitivity(nodes, demand, activeId, param) : null),
    [nodes, demand, activeId, param],
  )

  const data = useMemo(
    () =>
      sweep?.points.map((p) => ({
        x: round1(p.value * (def?.displayFactor ?? 1)),
        PCE: round1(p.pce),
        'Capacity (u/day)': Math.floor(p.capacityPerDay),
      })) ?? [],
    [sweep, def],
  )

  if (stations.length === 0) {
    return (
      <Section title="Sensitivity explorer">
        <p className="py-6 text-center text-xs text-slate-500">Add process steps on the VSM canvas to sweep parameters.</p>
      </Section>
    )
  }

  return (
    <Section
      title="Sensitivity explorer — single-variable sweep"
      right={
        <div className="flex gap-1.5">
          <select className="select-mini" value={activeId} onChange={(e) => setNodeId(e.target.value)}>
            {stations.map((n) => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
          <select className="select-mini" value={param} onChange={(e) => setParam(e.target.value as SweepParam)}>
            {SWEEP_PARAMS.map((p) => (
              <option key={p.param} value={p.param}>{p.label}</option>
            ))}
          </select>
        </div>
      }
    >
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#1E293B" vertical={false} />
            <XAxis dataKey="x" tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#334155' }} tickLine={false}
              label={{ value: `${def?.label ?? ''} (${def?.unit ?? ''})`, position: 'insideBottom', offset: -2, fill: '#475569', fontSize: 10 }} />
            <YAxis yAxisId="pce" tick={{ fill: '#34D399', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false}
              label={{ value: 'PCE %', angle: -90, position: 'insideLeft', fill: '#34D399', fontSize: 10 }} />
            <YAxis yAxisId="cap" orientation="right" tick={{ fill: '#22D3EE', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12, fontFamily: 'JetBrains Mono' }}
              labelFormatter={(v) => `${def?.label ?? ''}: ${v} ${def?.unit ?? ''}`}
              labelStyle={{ color: '#E2E8F0', fontFamily: 'Inter' }}
            />
            {sweep && def && (
              <ReferenceLine
                yAxisId="pce"
                x={nearestTick(data.map((d) => d.x), sweep.current * def.displayFactor)}
                stroke="#E2E8F0" strokeDasharray="4 4"
                label={{ value: 'now', fill: '#E2E8F0', fontSize: 9, position: 'top' }}
              />
            )}
            <Line yAxisId="pce" type="monotone" dataKey="PCE" stroke="#34D399" strokeWidth={2} dot={false} />
            <Line yAxisId="cap" type="monotone" dataKey="Capacity (u/day)" stroke="#22D3EE" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10.5px] text-slate-500">
        25 honest re-simulations of the whole stream — no interpolation. The dashed marker is the
        current value; everything else on the model is held constant.
      </p>
    </Section>
  )
}

const round1 = (v: number): number => Math.round(v * 10) / 10

/** Recharts needs an existing category tick for the reference line. */
function nearestTick(ticks: number[], value: number): number {
  return ticks.reduce((best, t) => (Math.abs(t - value) < Math.abs(best - value) ? t : best), ticks[0] ?? 0)
}
