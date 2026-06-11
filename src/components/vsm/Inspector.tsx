import { useMemo } from 'react'
import { AlertTriangle, Gauge, Info, Link2, OctagonAlert, Trash2 } from 'lucide-react'
import { useApp } from '../../store'
import { computeProcessMetrics, computeSystemMetrics, fmtSeconds, isInventoryKind, isProcessKind } from '../../lib/analytics'
import { Badge, NumberField, Section, TextField } from '../ui'
import type { Alert, EdgeKind } from '../../types'

const EDGE_LABEL: Record<EdgeKind, string> = {
  push: 'Push — scheduled transfer',
  pull: 'Pull — withdrawal loop',
  manualInfo: 'Manual information',
  electronicInfo: 'Electronic information (EDI)',
}

export function Inspector() {
  const nodes = useApp((s) => s.nodes)
  const edges = useApp((s) => s.edges)
  const demand = useApp((s) => s.demand)
  const selectedNodeId = useApp((s) => s.selectedNodeId)
  const selectedEdgeId = useApp((s) => s.selectedEdgeId)
  const updateNode = useApp((s) => s.updateNode)
  const updateDemand = useApp((s) => s.updateDemand)
  const deleteSelection = useApp((s) => s.deleteSelection)
  const calibration = useApp((s) => s.calibration)

  const metrics = useMemo(() => computeSystemMetrics(nodes, demand, calibration), [nodes, demand, calibration])
  const node = nodes.find((n) => n.id === selectedNodeId)
  const edge = edges.find((e) => e.id === selectedEdgeId)

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col gap-2 overflow-y-auto border-l border-edge bg-ink p-2">
      {node ? (
        <Section
          title={node.label}
          right={
            <button className="text-slate-500 hover:text-crit transition-colors" title="Delete (Del)" onClick={deleteSelection}>
              <Trash2 size={14} />
            </button>
          }
        >
          <TextField label="Label" value={node.label} onChange={(label) => updateNode(node.id, { label })} />

          {isProcessKind(node.kind) && (
            <>
              <NumberField label="Cycle time (CT nominal)" unit="s/part" value={node.ct ?? 0} min={0} max={600} step={1} slider
                onChange={(ct) => updateNode(node.id, { ct })} />
              <NumberField label="OEE availability" unit="%" value={Math.round((node.availability ?? 1) * 100)} min={10} max={100} step={1} slider
                onChange={(v) => updateNode(node.id, { availability: v / 100 })} />
              <NumberField label="Scrap / defect rate" unit="%" value={Math.round((node.scrap ?? 0) * 1000) / 10} min={0} max={60} step={0.1} slider
                onChange={(v) => updateNode(node.id, { scrap: v / 100 })} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Setup time" unit="s" value={node.setup ?? 0} min={0} step={10}
                  onChange={(setup) => updateNode(node.id, { setup })} />
                <NumberField label="Batch size" unit="pcs" value={node.batch ?? 1} min={1} step={1}
                  onChange={(batch) => updateNode(node.id, { batch })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="Headcount" unit="FTE" value={node.operators ?? 0} min={0} step={0.5}
                  onChange={(operators) => updateNode(node.id, { operators })} />
                <NumberField label="Power draw" unit="kW" value={node.powerKw ?? 0} min={0} step={1}
                  onChange={(powerKw) => updateNode(node.id, { powerKw })} />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  className="accent-cyan-400"
                  checked={node.valueAdd ?? node.kind === 'process'}
                  onChange={(e) => updateNode(node.id, { valueAdd: e.target.checked })}
                />
                Cycle time counts as value-add
              </label>
              <ProcessReadout nodeId={node.id} />
            </>
          )}

          {isInventoryKind(node.kind) && (
            <>
              <NumberField label="Quantity on hand" unit="pcs" value={node.qty ?? 0} min={0} max={20000} step={10} slider
                onChange={(qty) => updateNode(node.id, { qty })} />
              <div className="font-mono text-xs text-slate-400">
                Coverage:{' '}
                <span className="text-warn">
                  {metrics.demandPerDay > 0 ? ((node.qty ?? 0) / metrics.demandPerDay).toFixed(2) : '—'} days
                </span>{' '}
                of demand — pure NVA dwell.
              </div>
            </>
          )}

          {(node.kind === 'truck' || node.kind === 'ship' || node.kind === 'air' || node.kind === 'forklift') && (
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Trips" unit="/week" value={node.tripsPerWeek ?? 0} min={0} step={0.25}
                onChange={(tripsPerWeek) => updateNode(node.id, { tripsPerWeek })} />
              <NumberField label="Distance" unit="km" value={node.distanceKm ?? 0} min={0} step={1}
                onChange={(distanceKm) => updateNode(node.id, { distanceKm })} />
            </div>
          )}

          {node.kind === 'operator' && (
            <NumberField label="Headcount" unit="FTE" value={node.operators ?? 1} min={0} step={0.5}
              onChange={(operators) => updateNode(node.id, { operators })} />
          )}
        </Section>
      ) : edge ? (
        <Section
          title="Connection"
          right={
            <button className="text-slate-500 hover:text-crit transition-colors" title="Delete (Del)" onClick={deleteSelection}>
              <Trash2 size={14} />
            </button>
          }
        >
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Link2 size={13} className="text-flow" />
            {nodes.find((n) => n.id === edge.from)?.label ?? '?'} → {nodes.find((n) => n.id === edge.to)?.label ?? '?'}
          </div>
          <div className="space-y-1">
            <span className="field-label">Connection type</span>
            {(Object.keys(EDGE_LABEL) as EdgeKind[]).map((k) => (
              <button
                key={k}
                className={`block w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                  edge.kind === k ? 'border-flow/60 bg-flow/10 text-flow' : 'border-edge text-slate-400 hover:text-white'
                }`}
                onClick={() =>
                  useApp.setState((s) => ({ edges: s.edges.map((e) => (e.id === edge.id ? { ...e, kind: k } : e)) }))
                }
              >
                {EDGE_LABEL[k]}
              </button>
            ))}
          </div>
        </Section>
      ) : (
        <Section title="Takt & demand">
          <NumberField label="Customer demand" unit="units/day" value={demand.unitsPerDay} min={1} max={5000} step={10} slider
            onChange={(unitsPerDay) => updateDemand({ unitsPerDay })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Shifts" unit="/day" value={demand.shiftsPerDay} min={1} max={4} step={1}
              onChange={(shiftsPerDay) => updateDemand({ shiftsPerDay })} />
            <NumberField label="Net time" unit="min/shift" value={demand.netMinutesPerShift} min={60} max={720} step={5}
              onChange={(netMinutesPerShift) => updateDemand({ netMinutesPerShift })} />
          </div>
          <div className="panel flex items-center justify-between bg-ink px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Gauge size={13} className="text-flow" /> Takt time
            </span>
            <span className="font-mono text-lg text-flow">{fmtSeconds(metrics.taktSeconds)}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Select a node to tune its parameters — every slider recomputes the whole stream:
            OEE-adjusted cycle times, SMED amortization, ladder, PCE and alerts.
          </p>
        </Section>
      )}

      <Section title={`Alerts (${metrics.alerts.length})`}>
        {metrics.alerts.length === 0 ? (
          <p className="text-xs text-slate-500">No active flags. The stream meets takt with current parameters.</p>
        ) : (
          <div className="space-y-1.5">
            {metrics.alerts.map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        )}
      </Section>
    </aside>
  )
}

function ProcessReadout({ nodeId }: { nodeId: string }) {
  const nodes = useApp((s) => s.nodes)
  const demand = useApp((s) => s.demand)
  const calibration = useApp((s) => s.calibration)
  const metrics = useMemo(() => computeSystemMetrics(nodes, demand, calibration), [nodes, demand, calibration])
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return null
  const m = computeProcessMetrics(node, metrics.taktSeconds, calibration.alerts.smedFactor)

  const rows: [string, string, string][] = [
    ['CT nominal', fmtSeconds(m.ctNominal), 'text-slate-200'],
    ['÷ availability → CT effective', fmtSeconds(m.ctEffective), 'text-slate-200'],
    ['÷ (1−SR) → CT quality', fmtSeconds(m.ctQuality), 'text-slate-200'],
    ['+ setup/batch → penalty', fmtSeconds(m.setupPenalty), m.smedAlert ? 'text-warn' : 'text-slate-200'],
    ['= CT grand', fmtSeconds(m.ctGrand), m.exceedsTakt ? 'text-crit' : 'text-pull'],
    ['Takt load', `${Math.round(m.taktUtilization * 100)}%`, m.exceedsTakt ? 'text-crit' : m.taktUtilization > 0.85 ? 'text-warn' : 'text-pull'],
  ]
  return (
    <div className="panel bg-ink p-2 space-y-1">
      <div className="field-label">Computed waterfall</div>
      {rows.map(([label, value, cls]) => (
        <div key={label} className="flex justify-between text-[11px]">
          <span className="text-slate-500">{label}</span>
          <span className={`font-mono ${cls}`}>{value}</span>
        </div>
      ))}
      <div className="flex gap-1 pt-1">
        {m.exceedsTakt && <Badge tone="crit">OVER TAKT</Badge>}
        {m.smedAlert && <Badge tone="warn">SMED LOSS</Badge>}
        {!m.exceedsTakt && !m.smedAlert && <Badge tone="good">WITHIN TAKT</Badge>}
      </div>
    </div>
  )
}

function AlertRow({ alert }: { alert: Alert }) {
  const selectNode = useApp((s) => s.selectNode)
  const icon =
    alert.level === 'critical' ? (
      <OctagonAlert size={13} className="mt-0.5 shrink-0 text-crit" />
    ) : alert.level === 'warning' ? (
      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warn" />
    ) : (
      <Info size={13} className="mt-0.5 shrink-0 text-info" />
    )
  return (
    <button
      className="flex w-full gap-2 rounded-md border border-edge bg-ink p-2 text-left transition-colors hover:border-steel"
      onClick={() => alert.nodeId && selectNode(alert.nodeId)}
    >
      {icon}
      <span>
        <span className="block text-[11px] font-medium text-slate-200">{alert.title}</span>
        <span className="block text-[10px] leading-snug text-slate-500">{alert.detail}</span>
      </span>
    </button>
  )
}
