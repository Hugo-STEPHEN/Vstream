import { useMemo } from 'react'
import { Gauge } from 'lucide-react'
import { useApp } from '../../store'
import { computeSystemMetrics, fmtSeconds, isProcessKind } from '../../lib/analytics'
import { Badge, NumberField, Section } from '../ui'
import { useT } from '../../i18n'
import type { SystemMetrics } from '../../types'

/**
 * The "Rate Analysis" tab — one layer deeper than the standard VSM. Pick a
 * station on the left; tune its parameters live in the middle; read the
 * NF E 60-182 time cascade, TRS / TRG / TRE, loss Pareto and CT waterfall on
 * the right. Every edit writes to the real model: the canvas, ladder, alerts
 * and benchmarks follow, and Ctrl+Z undoes it.
 */
export function StationAnalysisView() {
  const { t } = useT()
  const nodes = useApp((s) => s.nodes)
  const demand = useApp((s) => s.demand)
  const calibration = useApp((s) => s.calibration)
  const stationDetailId = useApp((s) => s.stationDetailId)
  const updateNode = useApp((s) => s.updateNode)

  const stations = useMemo(() => nodes.filter((n) => isProcessKind(n.kind)), [nodes])
  const metrics = useMemo(() => computeSystemMetrics(nodes, demand, calibration), [nodes, demand, calibration])

  const activeId = stations.some((n) => n.id === stationDetailId)
    ? (stationDetailId as string)
    : stations[0]?.id ?? null
  const node = stations.find((n) => n.id === activeId)
  const m = metrics.processes.find((p) => p.nodeId === activeId)

  if (!node || !m) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-500">{t('station.empty')}</p>
      </div>
    )
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[220px_280px_1fr] gap-0">
      {/* Station list */}
      <aside className="flex min-h-0 flex-col border-r border-edge bg-panel">
        <div className="border-b border-edge px-3 py-2">
          <h3 className="field-label flex items-center gap-1.5"><Gauge size={12} className="text-flow" /> {t('station.stations')}</h3>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {stations.map((n) => {
            const pm = metrics.processes.find((p) => p.nodeId === n.id)
            const active = n.id === activeId
            return (
              <button
                key={n.id}
                className={`mb-1 block w-full rounded-md border px-2.5 py-2 text-left transition-colors ${
                  active ? 'border-flow/60 bg-flow/10' : 'border-edge hover:border-steel'
                }`}
                onClick={() => useApp.getState().openStationDetail(n.id)}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${active ? 'text-white' : 'text-slate-300'}`}>{n.label}</span>
                  {pm && (
                    <span className={`font-mono text-[11px] ${pm.trs >= 0.85 ? 'text-pull' : pm.trs >= 0.6 ? 'text-warn' : 'text-crit'}`}>
                      {(pm.trs * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded bg-edge">
                  {pm && (
                    <div className="h-full rounded"
                      style={{ width: `${pm.trs * 100}%`, background: pm.trs >= 0.85 ? '#34D399' : pm.trs >= 0.6 ? '#FBBF24' : '#F87171' }} />
                  )}
                </div>
                <div className="mt-0.5 flex gap-1">
                  {pm?.exceedsTakt && <Badge tone="crit">TAKT</Badge>}
                  {metrics.bottleneck?.nodeId === n.id && <Badge tone="warn">BNECK</Badge>}
                </div>
              </button>
            )
          })}
        </div>
        <div className="border-t border-edge p-2 text-[10px] leading-relaxed text-slate-500">
          {t('station.listHint')}
        </div>
      </aside>

      {/* Live parameters */}
      <aside className="min-h-0 space-y-2 overflow-y-auto border-r border-edge bg-ink p-2">
        <Section title={`${node.label} — ${t('station.params')}`}>
          <NumberField label={t('insp.ct')} unit="s/part" value={node.ct ?? 0} min={0} max={600} step={1} slider
            onChange={(ct) => updateNode(node.id, { ct })} />
          <NumberField label={t('insp.availability')} unit="%" value={Math.round((node.availability ?? 1) * 100)} min={10} max={100} step={1} slider
            onChange={(v) => updateNode(node.id, { availability: v / 100 })} />
          <NumberField label={t('insp.performance')} unit="%" value={Math.round((node.performance ?? 1) * 100)} min={10} max={100} step={1} slider
            onChange={(v) => updateNode(node.id, { performance: v / 100 })} />
          <NumberField label={t('insp.scrap')} unit="%" value={Math.round((node.scrap ?? 0) * 1000) / 10} min={0} max={60} step={0.1} slider
            onChange={(v) => updateNode(node.id, { scrap: v / 100 })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label={t('insp.setup')} unit="s" value={node.setup ?? 0} min={0} step={10}
              onChange={(setup) => updateNode(node.id, { setup })} />
            <NumberField label={t('insp.batch')} unit="pcs" value={node.batch ?? 1} min={1} step={1}
              onChange={(batch) => updateNode(node.id, { batch })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label={t('insp.engagement')} unit="%" value={Math.round((node.engagement ?? 1) * 100)} min={0} max={100} step={1}
              onChange={(v) => updateNode(node.id, { engagement: v / 100 })} />
            <NumberField label={t('insp.opening')} unit="%" value={Math.round((node.opening ?? 1) * 100)} min={0} max={100} step={1}
              onChange={(v) => updateNode(node.id, { opening: v / 100 })} />
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">
            {t('station.editsHint')}
          </p>
        </Section>
      </aside>

      {/* Analysis */}
      <div className="min-h-0 space-y-3 overflow-y-auto p-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-base font-semibold text-white">{node.label}</h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">rate analysis · {node.kind}</span>
          {m.exceedsTakt && <Badge tone="crit">OVER TAKT</Badge>}
          {metrics.bottleneck?.nodeId === m.nodeId && <Badge tone="warn">BOTTLENECK</Badge>}
          {m.smedAlert && <Badge tone="warn">SMED</Badge>}
        </div>
        <RatePanel m={m} />
        <TimeCascade m={m} requiredSec={metrics.availableSecondsPerDay} />
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <LossPareto m={m} requiredSec={metrics.availableSecondsPerDay} />
          <CtWaterfall m={m} taktSeconds={metrics.taktSeconds} />
        </div>
        <Economics m={m} metrics={metrics} />
      </div>
    </div>
  )
}

type PM = SystemMetrics['processes'][number]

function RatePanel({ m }: { m: PM }) {
  const rates: { label: string; value: number; formula: string }[] = [
    { label: 'TRS (OEE)', value: m.trs, formula: 'A × P × Q — useful ÷ required time' },
    { label: 'TRG', value: m.trg, formula: 'TRS × engagement — useful ÷ opening' },
    { label: 'TRE', value: m.tre, formula: 'TRG × opening — useful ÷ total (24/7)' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2">
      {rates.map((r) => (
        <div key={r.label} className="rounded-md border border-edge bg-panel px-3 py-2 text-center">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">{r.label}</div>
          <div className={`font-mono text-2xl ${r.value >= 0.85 ? 'text-pull' : r.value >= 0.6 ? 'text-warn' : 'text-crit'}`}>
            {(r.value * 100).toFixed(1)}%
          </div>
          <div className="text-[9px] leading-snug text-slate-600">{r.formula}</div>
        </div>
      ))}
    </div>
  )
}

function TimeCascade({ m, requiredSec }: { m: PM; requiredSec: number }) {
  const { t } = useT()
  const openingSec = m.engagement > 0 ? requiredSec / m.engagement : requiredSec
  const totalSec = m.opening > 0 ? openingSec / m.opening : openingSec
  const runningSec = requiredSec * m.availability
  const netSec = runningSec * m.performance
  const usefulSec = netSec * m.qualityRate
  const maxSec = Math.max(1, totalSec)

  const rows: { label: string; seconds: number; rate?: string; color: string }[] = [
    { label: t('station.totalTime'), seconds: totalSec, color: '#334155' },
    { label: t('station.openingTime'), seconds: openingSec, rate: `× opening ${(m.opening * 100).toFixed(0)}%`, color: '#475569' },
    { label: t('station.requiredTime'), seconds: requiredSec, rate: `× engagement ${(m.engagement * 100).toFixed(0)}%`, color: '#64748B' },
    { label: t('station.runningTime'), seconds: runningSec, rate: `× availability ${(m.availability * 100).toFixed(0)}%`, color: '#818CF8' },
    { label: t('station.netTime'), seconds: netSec, rate: `× performance ${(m.performance * 100).toFixed(0)}%`, color: '#22D3EE' },
    { label: t('station.usefulTime'), seconds: usefulSec, rate: `× quality ${(m.qualityRate * 100).toFixed(1)}%`, color: '#34D399' },
  ]
  return (
    <Section title={t('station.cascade')}>
      <div className="space-y-1">
        {rows.map((c) => (
          <div key={c.label} className="grid grid-cols-[150px_1fr_70px] items-center gap-2">
            <span className="text-[10.5px] text-slate-400">{c.label}</span>
            <span className="relative h-4 overflow-hidden rounded bg-edge/40">
              <span className="absolute inset-y-0 left-0 rounded transition-all"
                style={{ width: `${(c.seconds / maxSec) * 100}%`, background: c.color }} />
              {c.rate && (
                <span className="absolute inset-y-0 right-1.5 flex items-center font-mono text-[9px] text-slate-400">{c.rate}</span>
              )}
            </span>
            <span className="text-right font-mono text-[10.5px] text-slate-300">{fmtSeconds(c.seconds)}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function LossPareto({ m, requiredSec }: { m: PM; requiredSec: number }) {
  const { t } = useT()
  const downtime = requiredSec * (1 - m.availability)
  const speed = requiredSec * m.availability * (1 - m.performance)
  const quality = requiredSec * m.availability * m.performance * m.scrap
  const losses = [
    { label: t('station.downtime'), seconds: downtime, color: '#818CF8' },
    { label: t('station.speedLoss'), seconds: speed, color: '#22D3EE' },
    { label: t('station.defects'), seconds: quality, color: '#F87171' },
  ].sort((a, b) => b.seconds - a.seconds)
  const max = Math.max(1, ...losses.map((l) => l.seconds))
  const total = losses.reduce((s, l) => s + l.seconds, 0)
  return (
    <Section title={`${t('station.pareto')} — ${fmtSeconds(total)} ${t('station.paretoUnit')}`}>
      <div className="space-y-1">
        {losses.map((l) => (
          <div key={l.label} className="grid grid-cols-[170px_1fr_70px] items-center gap-2">
            <span className="text-[10.5px] text-slate-400">{l.label}</span>
            <span className="h-3 overflow-hidden rounded bg-edge/40">
              <span className="block h-full rounded" style={{ width: `${(l.seconds / max) * 100}%`, background: l.color }} />
            </span>
            <span className="text-right font-mono text-[10.5px] text-slate-300">{fmtSeconds(l.seconds)}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500">{t('station.paretoHint')}</p>
    </Section>
  )
}

function CtWaterfall({ m, taktSeconds }: { m: PM; taktSeconds: number }) {
  const { t } = useT()
  const rows: [string, number, string][] = [
    ['CT nominal', m.ctNominal, '#34D399'],
    ['CT effective  (÷ A×P)', m.ctEffective, '#FBBF24'],
    ['CT quality  (÷ 1−SR)', m.ctQuality, '#F87171'],
    ['CT grand  (+ setup/batch)', m.ctGrand, m.exceedsTakt ? '#F87171' : '#E2E8F0'],
  ]
  const max = Math.max(1, m.ctGrand, taktSeconds)
  return (
    <Section title={t('station.waterfallTitle')}>
      <div className="relative space-y-1">
        {rows.map(([label, v, color]) => (
          <div key={label} className="grid grid-cols-[170px_1fr_70px] items-center gap-2">
            <span className="text-[10.5px] text-slate-400">{label}</span>
            <span className="relative h-3 overflow-hidden rounded bg-edge/40">
              <span className="block h-full rounded" style={{ width: `${(v / max) * 100}%`, background: color }} />
              {taktSeconds > 0 && (
                <span className="absolute inset-y-0 w-px bg-crit" style={{ left: `${(taktSeconds / max) * 100}%` }} />
              )}
            </span>
            <span className="text-right font-mono text-[10.5px] text-slate-300">{fmtSeconds(v)}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500">
        Red marker = takt {fmtSeconds(taktSeconds)}. CT grand beyond it cannot meet demand.
      </p>
    </Section>
  )
}

function Economics({ m, metrics }: { m: PM; metrics: SystemMetrics }) {
  const { t } = useT()
  const usefulSec = metrics.availableSecondsPerDay * m.trs
  const goodPartsPerDay = m.ctNominal > 0 ? usefulSec / m.ctNominal : 0
  const stats: [string, string, string][] = [
    [t('station.output'), `${Math.floor(goodPartsPerDay).toLocaleString()} u/day`, 'text-pull'],
    [t('station.demandShare'), metrics.demandPerDay > 0 && goodPartsPerDay > 0 ? `${Math.round((metrics.demandPerDay / goodPartsPerDay) * 100)}%` : '—', 'text-flow'],
    [t('station.taktLoad'), `${Math.round(m.taktUtilization * 100)}%`, m.exceedsTakt ? 'text-crit' : 'text-slate-200'],
    [t('station.wastePart'), fmtSeconds(m.ctGrand - m.ctNominal), 'text-warn'],
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map(([label, value, cls]) => (
        <div key={label} className="rounded-md border border-edge bg-panel px-2 py-1.5">
          <div className="text-[9.5px] uppercase tracking-wider text-slate-500">{label}</div>
          <div className={`font-mono text-sm ${cls}`}>{value}</div>
        </div>
      ))}
    </div>
  )
}
