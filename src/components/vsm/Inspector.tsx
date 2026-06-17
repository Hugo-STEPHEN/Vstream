import { useMemo } from 'react'
import { AlertTriangle, Gauge, Info, Link2, Microscope, OctagonAlert, Trash2 } from 'lucide-react'
import { useApp } from '../../store'
import { computeProcessMetrics, computeSystemMetrics, fmtSeconds, isInventoryKind, isProcessKind } from '../../lib/analytics'
import { Badge, NumberField, Section, TextField } from '../ui'
import { useT, type StringKey } from '../../i18n'
import type { Alert, EdgeKind } from '../../types'

const EDGE_LABEL: Record<EdgeKind, StringKey> = {
  push: 'edge.push',
  pull: 'edge.pull',
  manualInfo: 'edge.manualInfo',
  electronicInfo: 'edge.electronicInfo',
}

export function Inspector() {
  const { t } = useT()
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
            <button className="text-slate-500 hover:text-crit transition-colors" title={t('insp.delete')} onClick={deleteSelection}>
              <Trash2 size={14} />
            </button>
          }
        >
          <TextField label={t('insp.label')} value={node.label} onChange={(label) => updateNode(node.id, { label })} />

          <div className="space-y-1">
            <span className="field-label">{t('insp.accent')}</span>
            <div className="flex items-center gap-1.5">
              {['#94A3B8', '#22D3EE', '#34D399', '#FBBF24', '#F87171', '#818CF8', '#F472B6', '#A3E635'].map((c) => (
                <button key={c}
                  className={`h-5 w-5 rounded border-2 transition-transform hover:scale-110 ${node.color === c ? 'border-white' : 'border-transparent'}`}
                  style={{ background: c }} title={c}
                  onClick={() => updateNode(node.id, { color: c })} />
              ))}
              {node.color && (
                <button className="btn-ghost !px-1.5 !py-0.5 text-[10px]" title={t('insp.resetColor')}
                  onClick={() => updateNode(node.id, { color: undefined })}>
                  auto
                </button>
              )}
            </div>
          </div>

          {isProcessKind(node.kind) && (
            <>
              <NumberField label={t('insp.ct')} unit="s/part" value={node.ct ?? 0} min={0} max={600} step={1} slider
                onChange={(ct) => updateNode(node.id, { ct })} />
              <NumberField label={t('insp.availability')} unit="%" value={Math.round((node.availability ?? 1) * 100)} min={10} max={100} step={1} slider
                onChange={(v) => updateNode(node.id, { availability: v / 100 })} />
              <NumberField label={t('insp.scrap')} unit="%" value={Math.round((node.scrap ?? 0) * 1000) / 10} min={0} max={60} step={0.1} slider
                onChange={(v) => updateNode(node.id, { scrap: v / 100 })} />
              <NumberField label={t('insp.performance')} unit="%" value={Math.round((node.performance ?? 1) * 100)} min={10} max={100} step={1} slider
                onChange={(v) => updateNode(node.id, { performance: v / 100 })} />
              <div className="grid grid-cols-2 gap-2">
                <NumberField label={t('insp.engagement')} unit="%" value={Math.round((node.engagement ?? 1) * 100)} min={0} max={100} step={1}
                  onChange={(v) => updateNode(node.id, { engagement: v / 100 })} />
                <NumberField label={t('insp.opening')} unit="%" value={Math.round((node.opening ?? 1) * 100)} min={0} max={100} step={1}
                  onChange={(v) => updateNode(node.id, { opening: v / 100 })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label={t('insp.setup')} unit="s" value={node.setup ?? 0} min={0} step={10}
                  onChange={(setup) => updateNode(node.id, { setup })} />
                <NumberField label={t('insp.batch')} unit="pcs" value={node.batch ?? 1} min={1} step={1}
                  onChange={(batch) => updateNode(node.id, { batch })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label={t('insp.headcount')} unit="FTE" value={node.operators ?? 0} min={0} step={0.5}
                  onChange={(operators) => updateNode(node.id, { operators })} />
                <NumberField label={t('insp.power')} unit="kW" value={node.powerKw ?? 0} min={0} step={1}
                  onChange={(powerKw) => updateNode(node.id, { powerKw })} />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  className="accent-cyan-400"
                  checked={node.valueAdd ?? node.kind === 'process'}
                  onChange={(e) => updateNode(node.id, { valueAdd: e.target.checked })}
                />
                {t('insp.valueAdd')}
              </label>
              <ProcessReadout nodeId={node.id} />
              <button
                className="btn-ghost flex w-full items-center justify-center gap-1.5 !text-flow hover:!border-flow/50"
                onClick={() => useApp.getState().openStationDetail(node.id)}
                title={t('insp.rateAnalysisHint')}
              >
                <Microscope size={13} /> {t('insp.rateAnalysis')}
              </button>
            </>
          )}

          {isInventoryKind(node.kind) && (
            <>
              <NumberField label={t('insp.qty')} unit="pcs" value={node.qty ?? 0} min={0} max={20000} step={10} slider
                onChange={(qty) => updateNode(node.id, { qty })} />
              <div className="font-mono text-xs text-slate-400">
                {t('insp.coverage')}{' '}
                <span className="text-warn">
                  {metrics.demandPerDay > 0 ? ((node.qty ?? 0) / metrics.demandPerDay).toFixed(2) : '—'} days
                </span>{' '}
                {t('insp.coverageNote')}
              </div>
            </>
          )}

          {(node.kind === 'truck' || node.kind === 'ship' || node.kind === 'air' || node.kind === 'forklift') && (
            <div className="grid grid-cols-2 gap-2">
              <NumberField label={t('insp.trips')} unit="/week" value={node.tripsPerWeek ?? 0} min={0} step={0.25}
                onChange={(tripsPerWeek) => updateNode(node.id, { tripsPerWeek })} />
              <NumberField label={t('insp.distance')} unit="km" value={node.distanceKm ?? 0} min={0} step={1}
                onChange={(distanceKm) => updateNode(node.id, { distanceKm })} />
            </div>
          )}

          {node.kind === 'operator' && (
            <NumberField label={t('insp.headcount')} unit="FTE" value={node.operators ?? 1} min={0} step={0.5}
              onChange={(operators) => updateNode(node.id, { operators })} />
          )}
        </Section>
      ) : edge ? (
        <Section
          title={t('insp.connection')}
          right={
            <button className="text-slate-500 hover:text-crit transition-colors" title={t('insp.delete')} onClick={deleteSelection}>
              <Trash2 size={14} />
            </button>
          }
        >
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Link2 size={13} className="text-flow" />
            {nodes.find((n) => n.id === edge.from)?.label ?? '?'} → {nodes.find((n) => n.id === edge.to)?.label ?? '?'}
          </div>
          <div className="space-y-1">
            <span className="field-label">{t('insp.connectionType')}</span>
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
                {t(EDGE_LABEL[k])}
              </button>
            ))}
          </div>
        </Section>
      ) : (
        <Section title={t('insp.taktDemand')}>
          <NumberField label={t('insp.demand')} unit="units/day" value={demand.unitsPerDay} min={1} max={5000} step={10} slider
            onChange={(unitsPerDay) => updateDemand({ unitsPerDay })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label={t('insp.shifts')} unit="/day" value={demand.shiftsPerDay} min={1} max={4} step={1}
              onChange={(shiftsPerDay) => updateDemand({ shiftsPerDay })} />
            <NumberField label={t('insp.netTime')} unit="min/shift" value={demand.netMinutesPerShift} min={60} max={720} step={5}
              onChange={(netMinutesPerShift) => updateDemand({ netMinutesPerShift })} />
          </div>
          <div className="panel flex items-center justify-between bg-ink px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Gauge size={13} className="text-flow" /> {t('insp.takt')}
            </span>
            <span className="font-mono text-lg text-flow">{fmtSeconds(metrics.taktSeconds)}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">{t('insp.taktHint')}</p>
        </Section>
      )}

      <Section title={`${t('insp.alerts')} (${metrics.alerts.length})`}>
        {metrics.alerts.length === 0 ? (
          <p className="text-xs text-slate-500">{t('insp.noAlerts')}</p>
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
    ['÷ (avail × perf) → CT effective', fmtSeconds(m.ctEffective), 'text-slate-200'],
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
      <div className="mt-1 grid grid-cols-3 gap-1 border-t border-edge/60 pt-1.5">
        {([
          ['TRS', m.trs, 'OEE: avail × perf × quality'],
          ['TRG', m.trg, 'TRS × engagement'],
          ['TRE', m.tre, 'TRG × opening'],
        ] as const).map(([label, v, hint]) => (
          <div key={label} className="rounded bg-edge/30 px-1.5 py-1 text-center" title={hint}>
            <div className="text-[9px] tracking-wider text-slate-500">{label}</div>
            <div className={`font-mono text-[12px] ${v >= 0.85 ? 'text-pull' : v >= 0.6 ? 'text-warn' : 'text-crit'}`}>
              {(v * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
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
