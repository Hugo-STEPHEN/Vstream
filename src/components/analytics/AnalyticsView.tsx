import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Check, Copy, Leaf, Plug, Sparkles, Truck, Zap } from 'lucide-react'
import { useApp } from '../../store'
import { computeSystemMetrics, fmtSeconds } from '../../lib/analytics'
import { buildCopilotPrompt, generateKaizenSuggestions } from '../../lib/copilot'
import { computeTransportAudit } from '../../lib/spaghetti'
import { Badge, Section, Stat } from '../ui'
import { ScenarioBar } from './ScenarioBar'
import { SensitivityExplorer } from './SensitivityExplorer'
import type { MetricsUpdatePayload } from '../../types'

export function AnalyticsView() {
  const nodes = useApp((s) => s.nodes)
  const demand = useApp((s) => s.demand)
  const spaghetti = useApp((s) => s.spaghetti)
  const calibration = useApp((s) => s.calibration)
  const updateNode = useApp((s) => s.updateNode)

  const metrics = useMemo(() => computeSystemMetrics(nodes, demand, calibration), [nodes, demand, calibration])
  const transport = useMemo(
    () => computeTransportAudit(spaghetti, demand.unitsPerDay / Math.max(1, demand.shiftsPerDay), calibration),
    [spaghetti, demand.unitsPerDay, demand.shiftsPerDay, calibration],
  )
  const suggestions = useMemo(
    () => generateKaizenSuggestions(nodes, demand, metrics, calibration),
    [nodes, demand, metrics, calibration],
  )

  const chartData = metrics.processes.map((p) => ({
    name: p.label,
    nodeId: p.nodeId,
    'Nominal CT': round1(p.ctNominal),
    'Availability loss': round1(p.ctEffective - p.ctNominal),
    'Quality loss': round1(p.ctQuality - p.ctEffective),
    'Setup penalty': round1(p.setupPenalty),
    over: p.exceedsTakt,
  }))

  return (
    <div className="grid h-full grid-cols-1 content-start gap-2 overflow-y-auto p-2 xl:grid-cols-2">
      {/* Sandbox summary header spans both columns */}
      <div className="xl:col-span-2 flex flex-wrap gap-2">
        <Stat label="Takt" value={fmtSeconds(metrics.taktSeconds)} tone="flow" sub={`${metrics.demandPerDay} u/day demand`} />
        <Stat label="Capacity" value={`${Math.floor(metrics.systemCapacityPerDay)} u/day`}
          tone={metrics.systemCapacityPerDay >= metrics.demandPerDay ? 'good' : 'crit'}
          sub={metrics.bottleneck ? `limited by ${metrics.bottleneck.label}` : '—'} />
        <Stat label="Lead time" value={fmtDaysStat(metrics.leadTimeSeconds, metrics.availableSecondsPerDay)} />
        <Stat label="PCE" value={`${metrics.pce.toFixed(2)}%`} tone={metrics.pce >= 25 ? 'good' : metrics.pce >= 5 ? 'warn' : 'crit'} />
        <Stat label="First pass yield" value={`${(metrics.firstPassYield * 100).toFixed(1)}%`}
          tone={metrics.firstPassYield > 0.97 ? 'good' : 'warn'} />
        <Stat label="Direct labor" value={`${metrics.totalOperators.toFixed(1)} FTE`}
          sub={`≈ $${Math.round(metrics.totalOperators * demand.laborRatePerHour * (metrics.availableSecondsPerDay / 3600)).toLocaleString()}/day`} />
        {transport.rows.length > 0 && (
          <Stat label="Transport / part" value={fmtSeconds(transport.totalSecondsPerPart)} tone="warn"
            sub={`${calibration.currency}${transport.totalCostPerPart.toFixed(2)}/part conveyance`} />
        )}
      </div>

      {/* Scenario workbench spans both columns */}
      <div className="xl:col-span-2">
        <ScenarioBar />
      </div>

      {/* Station load vs takt */}
      <Section title="Station load vs takt — loss decomposition">
        {chartData.length === 0 ? (
          <Empty msg="Add process steps on the VSM canvas to populate the audit." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#1E293B" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'Inter' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false}
                  label={{ value: 'sec/part', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: '#1E293B', opacity: 0.4 }}
                  contentStyle={{ background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  labelStyle={{ color: '#E2E8F0', fontFamily: 'Inter' }}
                />
                <ReferenceLine y={metrics.taktSeconds} stroke="#F87171" strokeDasharray="6 4"
                  label={{ value: `takt ${fmtSeconds(metrics.taktSeconds)}`, fill: '#F87171', fontSize: 10, position: 'right' }} />
                <Bar dataKey="Nominal CT" stackId="ct" fill="#34D399" />
                <Bar dataKey="Availability loss" stackId="ct" fill="#FBBF24" />
                <Bar dataKey="Quality loss" stackId="ct" fill="#F87171" />
                <Bar dataKey="Setup penalty" stackId="ct" fill="#818CF8" radius={[3, 3, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell key={d.nodeId} stroke={d.over ? '#F87171' : 'none'} strokeWidth={d.over ? 1.5 : 0} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-[10.5px] text-slate-500">
          Green is honest work; everything above it is overhead from downtime, defects and changeovers.
          Bars crossing the red line cannot meet demand.
        </p>
      </Section>

      {/* Bottleneck audit */}
      <Section title="Bottleneck audit — audited PCE report">
        {metrics.processes.length === 0 ? (
          <Empty msg="No stations to audit yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-slate-500">
                  {['Station', 'CT', 'CT*', 'Load', 'Waste/part', 'Flags'].map((h) => (
                    <th key={h} className="pb-1.5 pr-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                {[...metrics.processes]
                  .sort((a, b) => b.taktUtilization - a.taktUtilization)
                  .map((p) => (
                    <tr key={p.nodeId} className="cursor-pointer border-t border-edge/60 hover:bg-edge/30"
                      onClick={() => {
                        useApp.getState().selectNode(p.nodeId)
                        useApp.getState().setTab('vsm')
                      }}>
                      <td className="py-1.5 pr-2 font-ui text-slate-200">{p.label}</td>
                      <td className="py-1.5 pr-2 text-slate-400">{fmtSeconds(p.ctNominal)}</td>
                      <td className={`py-1.5 pr-2 ${p.exceedsTakt ? 'text-crit' : 'text-slate-200'}`}>{fmtSeconds(p.ctGrand)}</td>
                      <td className="py-1.5 pr-2">
                        <LoadBar value={p.taktUtilization} />
                      </td>
                      <td className="py-1.5 pr-2 text-warn">{fmtSeconds(p.ctGrand - p.ctNominal)}</td>
                      <td className="py-1.5 space-x-1">
                        {p.exceedsTakt && <Badge tone="crit">TAKT</Badge>}
                        {p.smedAlert && <Badge tone="warn">SMED</Badge>}
                        {metrics.bottleneck?.nodeId === p.nodeId && <Badge tone="warn">BNECK</Badge>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10.5px] text-slate-500">
          Waste/part = CT* − nominal CT: the audited overhead each part carries through the station.
          Click a row to open it on the canvas.
        </p>
      </Section>

      {/* Kaizen co-pilot */}
      <Section
        title="ValueStream co-pilot — quantified kaizen"
        right={<CopyPromptButton prompt={buildCopilotPrompt(metrics)} />}
      >
        {suggestions.length === 0 ? (
          <Empty msg="No high-leverage countermeasure found — this stream is already tight." />
        ) : (
          <div className="space-y-1.5">
            {suggestions.map((sug) => (
              <div key={sug.id} className="flex items-start gap-2 rounded-md border border-edge bg-ink p-2">
                <Sparkles size={13} className="mt-0.5 shrink-0 text-flow" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-medium text-slate-200">{sug.action}</div>
                  <div className="text-[10px] text-slate-500">{sug.rationale}</div>
                  <div className="mt-1 flex flex-wrap gap-1 font-mono text-[10px]">
                    <Badge tone="good">PCE +{sug.pceDelta.toFixed(2)} pp</Badge>
                    {sug.leadTimeDelta < -1 && (
                      <Badge tone="flow">lead −{fmtSeconds(-sug.leadTimeDelta)}</Badge>
                    )}
                    <Badge>cap {Math.floor(sug.capacityAfter)} u/day</Badge>
                  </div>
                </div>
                <button
                  className="btn-ghost shrink-0 !text-pull hover:!border-pull/50"
                  title="Apply this parameter change to the model"
                  onClick={() => updateNode(sug.nodeId, sug.patch)}
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10.5px] text-slate-500">
          Every impact is recomputed through the full engine — apply a countermeasure and the canvas,
          ladder and benchmarks update instantly. “Copy prompt” exports the grounding context for an LLM co-pilot.
        </p>
      </Section>

      {/* Sensitivity curves */}
      <SensitivityExplorer />

      <div className="space-y-2">
        {/* VSM ↔ spaghetti transport audit */}
        {transport.rows.length > 0 && (
          <Section title="Transport audit — spaghetti routes per part">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-slate-500">
                  {['Route → station', 'Mode', 'Time/part', '$/part'].map((h) => (
                    <th key={h} className="pb-1 pr-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                {transport.rows.map((r) => (
                  <tr key={r.routeId} className="cursor-pointer border-t border-edge/60 hover:bg-edge/30"
                    onClick={() => {
                      useApp.getState().selectNode(r.nodeId)
                      useApp.getState().setTab('vsm')
                    }}>
                    <td className="py-1 pr-2 font-ui text-slate-200">
                      <Truck size={11} className="mr-1 inline text-warn" />
                      {r.routeName} → {nodes.find((n) => n.id === r.nodeId)?.label ?? '?'}
                    </td>
                    <td className="py-1 pr-2 text-slate-400">{r.mode}</td>
                    <td className="py-1 pr-2 text-warn">{r.secondsPerPart.toFixed(1)}s</td>
                    <td className="py-1 text-slate-300">{calibration.currency}{r.costPerPart.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10.5px] text-slate-500">
              Conveyance seconds each produced part carries on floor routes linked to VSM stations
              (link routes in the Spaghetti inspector). Transport is pure muda — compare it to the
              stations' cycle times.
            </p>
          </Section>
        )}

        {/* ESG auditor */}
        <Section title="ESG carbon & waste auditor (E-VSM)">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat icon={<Zap size={12} className="text-warn" />} label="Energy" value={`${metrics.esg.kwhPerDay.toFixed(0)} kWh/d`} />
            <MiniStat icon={<Leaf size={12} className="text-pull" />} label="CO₂e" value={`${metrics.esg.co2KgPerDay.toFixed(0)} kg/d`} />
            <MiniStat icon={<Leaf size={12} className="text-crit" />} label="Scrap" value={`${metrics.esg.scrapUnitsPerDay.toFixed(0)} u/d`} />
            <MiniStat icon={<Leaf size={12} className="text-crit" />} label="Scrap mass" value={`${metrics.esg.scrapKgPerDay.toFixed(0)} kg/d`} />
          </div>
          <p className="text-[10.5px] text-slate-500">
            Driven by each station's kW profile and scrap rate at {demand.partWeightKg} kg/part and{' '}
            {demand.gridCo2PerKwh} kg CO₂e/kWh (set per station in the inspector).
          </p>
        </Section>

        {/* Integration hooks */}
        <IntegrationsPanel />
      </div>
    </div>
  )
}

function IntegrationsPanel() {
  const example: MetricsUpdatePayload = {
    source: 'iot',
    nodeLabel: 'Spot Weld',
    timestamp: new Date().toISOString(),
    measurements: { cycleTimeSeconds: 41.2, availability: 0.83 },
  }
  const [copied, setCopied] = useState(false)
  const curl = `curl -X POST https://plant.example.com/api/v1/metrics/update \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(example)}'`
  return (
    <Section
      title="REST / Webhook connectors"
      right={
        <button
          className="btn-ghost flex items-center gap-1"
          onClick={() => {
            void navigator.clipboard.writeText(curl).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy curl'}
        </button>
      }
    >
      <div className="flex items-start gap-2">
        <Plug size={14} className="mt-0.5 shrink-0 text-info" />
        <p className="text-[11px] leading-relaxed text-slate-400">
          Edge IoT devices, barcode scanners and MES databases can pipe measured cycle times straight
          into this model via <span className="font-mono text-flow">POST /api/v1/metrics/update</span>.
          The typed payload contract ships with the app (<span className="font-mono">MetricsUpdatePayload</span>).
        </p>
      </div>
      <pre className="overflow-x-auto rounded-md border border-edge bg-ink p-2 font-mono text-[10px] leading-relaxed text-slate-400">
        {JSON.stringify(example, null, 2)}
      </pre>
    </Section>
  )
}

function LoadBar({ value }: { value: number }) {
  const pct = Math.min(1.5, value)
  const color = value > 1 ? '#F87171' : value > 0.85 ? '#FBBF24' : '#34D399'
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-1.5 w-16 overflow-hidden rounded bg-edge">
        <span className="block h-full rounded" style={{ width: `${(pct / 1.5) * 100}%`, background: color }} />
      </span>
      <span style={{ color }}>{Math.round(value * 100)}%</span>
    </span>
  )
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-edge bg-ink px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] text-slate-500">{icon}{label}</div>
      <div className="font-mono text-sm text-slate-100">{value}</div>
    </div>
  )
}

function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="btn-ghost flex items-center gap-1"
      onClick={() => {
        void navigator.clipboard.writeText(prompt).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy prompt'}
    </button>
  )
}

function Empty({ msg }: { msg: string }) {
  return <p className="py-6 text-center text-xs text-slate-500">{msg}</p>
}

const round1 = (v: number): number => Math.round(v * 10) / 10

function fmtDaysStat(seconds: number, perDay: number): string {
  return perDay > 0 ? `${(seconds / perDay).toFixed(1)} d` : fmtSeconds(seconds)
}
