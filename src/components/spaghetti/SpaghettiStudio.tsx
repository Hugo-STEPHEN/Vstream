import { useMemo, useRef, useState } from 'react'
import { Footprints, Forklift, MousePointer2, Route as RouteIcon, Square, Trash2, Bot } from 'lucide-react'
import { useApp } from '../../store'
import { computeSpaghettiSummary, fmtMoney, TRANSPORT_PROFILES } from '../../lib/spaghetti'
import { NumberField, Section, Stat, TextField } from '../ui'
import type { TransportMode } from '../../types'

export const FLOOR = { width: 1400, height: 720 } as const
const MONO = 'JetBrains Mono, monospace'

const MODE_ICON: Record<TransportMode, typeof Footprints> = {
  walk: Footprints,
  forklift: Forklift,
  agv: Bot,
}

export function SpaghettiStudio({ svgRef }: { svgRef: React.RefObject<SVGSVGElement> }) {
  const spaghetti = useApp((s) => s.spaghetti)
  const demand = useApp((s) => s.demand)
  const tool = useApp((s) => s.spaghettiTool)
  const routeMode = useApp((s) => s.routeMode)
  const draft = useApp((s) => s.draftRoute)
  const selectedZoneId = useApp((s) => s.selectedZoneId)
  const selectedRouteId = useApp((s) => s.selectedRouteId)

  const summary = useMemo(
    () => computeSpaghettiSummary(spaghetti, demand.shiftsPerDay, demand.daysPerYear),
    [spaghetti, demand.shiftsPerDay, demand.daysPerYear],
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const [zoneDraft, setZoneDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const dragZone = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null)

  const toWorld = (e: React.PointerEvent | React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const r = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * FLOOR.width,
      y: ((e.clientY - r.top) / r.height) * FLOOR.height,
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const w = toWorld(e)
    if (tool === 'route') {
      useApp.getState().pushDraftPoint(w.x, w.y)
      return
    }
    if (tool === 'zone') {
      setZoneDraft({ x0: w.x, y0: w.y, x1: w.x, y1: w.y })
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      return
    }
    useApp.getState().selectZone(null)
    useApp.getState().selectRoute(null)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const w = toWorld(e)
    setHover(w)
    if (zoneDraft) setZoneDraft({ ...zoneDraft, x1: w.x, y1: w.y })
    const dz = dragZone.current
    if (dz) {
      if (!dz.moved) {
        dz.moved = true
        useApp.getState().updateZone(dz.id, {}) // one undo entry per gesture
      }
      useApp.getState().moveZone(dz.id, w.x + dz.dx, w.y + dz.dy)
    }
  }

  const onPointerUp = () => {
    dragZone.current = null
    if (zoneDraft) {
      const x = Math.min(zoneDraft.x0, zoneDraft.x1)
      const y = Math.min(zoneDraft.y0, zoneDraft.y1)
      const w = Math.abs(zoneDraft.x1 - zoneDraft.x0)
      const h = Math.abs(zoneDraft.y1 - zoneDraft.y0)
      if (w > 24 && h > 24) {
        useApp.getState().addZone({
          name: `Zone ${spaghetti.zones.length + 1}`,
          x, y, w, h,
          color: '#94A3B8',
        })
      }
      setZoneDraft(null)
    }
  }

  const onDoubleClick = () => {
    if (tool === 'route') useApp.getState().finishDraftRoute()
  }

  const selectedRoute = spaghetti.routes.find((r) => r.id === selectedRouteId)
  const selectedZone = spaghetti.zones.find((z) => z.id === selectedZoneId)

  return (
    <div className="flex h-full min-h-0">
      {/* Left: tools + canvas */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5 border-b border-edge bg-panel px-2 py-1.5">
          <ToolButton active={tool === 'select'} onClick={() => useApp.getState().setSpaghettiTool('select')} title="Select & move zones">
            <MousePointer2 size={13} /> Select
          </ToolButton>
          <ToolButton active={tool === 'zone'} onClick={() => useApp.getState().setSpaghettiTool('zone')} title="Drag to draw a floor zone (machine, storage, aisle)">
            <Square size={13} /> Zone
          </ToolButton>
          <ToolButton active={tool === 'route'} onClick={() => useApp.getState().setSpaghettiTool('route')} title="Click waypoints, double-click to finish">
            <RouteIcon size={13} /> Route
          </ToolButton>
          <div className="mx-2 h-5 w-px bg-edge" />
          {(Object.keys(TRANSPORT_PROFILES) as TransportMode[]).map((m) => {
            const p = TRANSPORT_PROFILES[m]
            const Icon = MODE_ICON[m]
            return (
              <ToolButton key={m} active={routeMode === m} onClick={() => useApp.getState().setRouteMode(m)}
                title={`${p.label} — $${p.costPerMeter.toFixed(2)}/m @ ${p.speedMps} m/s`}>
                <Icon size={13} style={{ color: p.color }} /> {p.label.split(' ')[0]}
              </ToolButton>
            )
          })}
          {tool === 'route' && draft.length > 0 && (
            <span className="ml-auto flex items-center gap-2 text-[11px] font-mono text-flow">
              {draft.length} pts — double-click to commit
              <button className="btn-ghost" onClick={() => useApp.getState().cancelDraftRoute()}>cancel</button>
            </span>
          )}
        </div>

        <div ref={containerRef} className="relative min-h-0 flex-1 bg-ink">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${FLOOR.width} ${FLOOR.height}`}
            className="h-full w-full touch-none select-none"
            preserveAspectRatio="xMidYMid meet"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onDoubleClick={onDoubleClick}
          >
            <defs>
              <pattern id="floorgrid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 H 0 V 50" fill="none" stroke="#1E293B" strokeWidth="0.6" />
              </pattern>
            </defs>
            <rect width={FLOOR.width} height={FLOOR.height} fill="url(#floorgrid)" />
            <rect x={1} y={1} width={FLOOR.width - 2} height={FLOOR.height - 2} fill="none" stroke="#334155" strokeWidth={2} />
            <text x={14} y={FLOOR.height - 14} fill="#475569" fontFamily={MONO} fontSize={11}>
              scale: 1 unit = {spaghetti.metersPerUnit} m · 50-unit grid = {(50 * spaghetti.metersPerUnit).toFixed(1)} m
            </text>

            {spaghetti.zones.map((z) => (
              <g
                key={z.id}
                className={tool === 'select' ? 'cursor-grab' : undefined}
                onPointerDown={(e) => {
                  if (tool !== 'select' || e.button !== 0) return
                  e.stopPropagation()
                  useApp.getState().selectZone(z.id)
                  const w = toWorld(e)
                  dragZone.current = { id: z.id, dx: z.x - w.x, dy: z.y - w.y, moved: false }
                  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                }}
              >
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={4}
                  fill={z.color} fillOpacity={0.07}
                  stroke={selectedZoneId === z.id ? '#22D3EE' : z.color} strokeOpacity={selectedZoneId === z.id ? 1 : 0.5}
                  strokeWidth={selectedZoneId === z.id ? 2 : 1.2} />
                <text x={z.x + 10} y={z.y + 20} fill={z.color} fontFamily={'Space Grotesk, sans-serif'} fontSize={13} opacity={0.85}>
                  {z.name}
                </text>
                <text x={z.x + 10} y={z.y + 36} fill="#64748B" fontFamily={MONO} fontSize={10}>
                  {(z.w * spaghetti.metersPerUnit).toFixed(0)}×{(z.h * spaghetti.metersPerUnit).toFixed(0)} m
                </text>
              </g>
            ))}

            {spaghetti.routes.map((r) => {
              const p = TRANSPORT_PROFILES[r.mode]
              const d = `M ${r.points.map((pt) => `${pt.x} ${pt.y}`).join(' L ')}`
              const width = 1.5 + Math.min(6, r.tripsPerShift / 6)
              const selected = selectedRouteId === r.id
              return (
                <g key={r.id} className="cursor-pointer"
                  onPointerDown={(e) => {
                    if (tool !== 'select') return
                    e.stopPropagation()
                    useApp.getState().selectRoute(r.id)
                  }}>
                  {selected && <path d={d} fill="none" stroke="#22D3EE" strokeWidth={width + 8} opacity={0.15} />}
                  <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
                  <path d={d} fill="none" stroke={p.color} strokeWidth={width} strokeLinejoin="round" strokeLinecap="round"
                    opacity={0.8} strokeDasharray={r.mode === 'agv' ? '10 6' : undefined} />
                  <circle cx={r.points[0].x} cy={r.points[0].y} r={4} fill={p.color} />
                  <circle cx={r.points[r.points.length - 1].x} cy={r.points[r.points.length - 1].y} r={4}
                    fill="none" stroke={p.color} strokeWidth={2} />
                </g>
              )
            })}

            {draft.length > 0 && (
              <g pointerEvents="none">
                <path
                  d={`M ${draft.map((pt) => `${pt.x} ${pt.y}`).join(' L ')}${hover ? ` L ${hover.x} ${hover.y}` : ''}`}
                  fill="none" stroke={TRANSPORT_PROFILES[routeMode].color} strokeWidth={2} strokeDasharray="6 5" />
                {draft.map((pt, i) => (
                  <circle key={i} cx={pt.x} cy={pt.y} r={3.5} fill={TRANSPORT_PROFILES[routeMode].color} />
                ))}
              </g>
            )}

            {zoneDraft && (
              <rect
                x={Math.min(zoneDraft.x0, zoneDraft.x1)} y={Math.min(zoneDraft.y0, zoneDraft.y1)}
                width={Math.abs(zoneDraft.x1 - zoneDraft.x0)} height={Math.abs(zoneDraft.y1 - zoneDraft.y0)}
                fill="#22D3EE" fillOpacity={0.06} stroke="#22D3EE" strokeDasharray="6 4" pointerEvents="none" />
            )}
          </svg>
        </div>

        {/* Bottom: travel cost ledger */}
        <div className="flex shrink-0 items-stretch gap-2 border-t border-edge bg-panel p-2 overflow-x-auto">
          <Stat label="Travel / shift" value={`${Math.round(summary.totalMetersPerShift).toLocaleString()} m`} tone="flow" />
          <Stat label="Time / shift" value={`${summary.totalMinutesPerShift.toFixed(0)} min`} />
          <Stat label="Cost / shift" value={fmtMoney(summary.totalCostPerShift)} tone="warn" />
          <Stat label="Cost / year" value={fmtMoney(summary.totalCostPerYear)} tone="crit"
            sub={`${demand.shiftsPerDay} shifts × ${demand.daysPerYear} days`} />
          <Stat label="Best-mode ROI" value={fmtMoney(summary.bestModeSavingPerYear)} tone="good" sub="potential saving / year" />
        </div>
      </div>

      {/* Right: inspector */}
      <aside className="flex w-[300px] shrink-0 flex-col gap-2 overflow-y-auto border-l border-edge bg-ink p-2">
        {selectedRoute ? (
          <Section
            title="Route"
            right={
              <button className="text-slate-500 hover:text-crit" title="Delete" onClick={() => useApp.getState().deleteFloorSelection()}>
                <Trash2 size={14} />
              </button>
            }
          >
            <TextField label="Name" value={selectedRoute.name} onChange={(name) => useApp.getState().updateRoute(selectedRoute.id, { name })} />
            <div className="space-y-1">
              <span className="field-label">Transport mode</span>
              {(Object.keys(TRANSPORT_PROFILES) as TransportMode[]).map((m) => {
                const p = TRANSPORT_PROFILES[m]
                return (
                  <button key={m}
                    className={`block w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                      selectedRoute.mode === m ? 'border-flow/60 bg-flow/10 text-white' : 'border-edge text-slate-400 hover:text-white'
                    }`}
                    onClick={() => useApp.getState().updateRoute(selectedRoute.id, { mode: m })}>
                    <span style={{ color: p.color }}>●</span> {p.label}
                    <span className="float-right font-mono text-slate-500">${p.costPerMeter.toFixed(2)}/m</span>
                  </button>
                )
              })}
            </div>
            <NumberField label="Round trips" unit="/shift" value={selectedRoute.tripsPerShift} min={0} max={200} step={1} slider
              onChange={(tripsPerShift) => useApp.getState().updateRoute(selectedRoute.id, { tripsPerShift })} />
            <RouteReadout routeId={selectedRoute.id} />
          </Section>
        ) : selectedZone ? (
          <Section
            title="Floor zone"
            right={
              <button className="text-slate-500 hover:text-crit" title="Delete" onClick={() => useApp.getState().deleteFloorSelection()}>
                <Trash2 size={14} />
              </button>
            }
          >
            <TextField label="Name" value={selectedZone.name} onChange={(name) => useApp.getState().updateZone(selectedZone.id, { name })} />
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Width" unit="units" value={Math.round(selectedZone.w)} min={20} step={10}
                onChange={(w) => useApp.getState().updateZone(selectedZone.id, { w })} />
              <NumberField label="Height" unit="units" value={Math.round(selectedZone.h)} min={20} step={10}
                onChange={(h) => useApp.getState().updateZone(selectedZone.id, { h })} />
            </div>
            <div className="space-y-1">
              <span className="field-label">Color</span>
              <div className="flex gap-1.5">
                {['#94A3B8', '#22D3EE', '#34D399', '#FBBF24', '#F87171', '#818CF8'].map((c) => (
                  <button key={c} className={`h-6 w-6 rounded border-2 transition-transform hover:scale-110 ${selectedZone.color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ background: c }}
                    onClick={() => useApp.getState().updateZone(selectedZone.id, { color: c })} />
                ))}
              </div>
            </div>
          </Section>
        ) : (
          <Section title="Plant scale">
            <NumberField label="Meters per canvas unit" unit="m" value={spaghetti.metersPerUnit} min={0.01} max={2} step={0.01}
              onChange={(v) => useApp.getState().setMetersPerUnit(v)} />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Draw the plant footprint with <b>Zone</b>, then trace material travel with <b>Route</b> —
              click waypoints, double-click to commit. Line weight scales with trips per shift; every
              meter is costed by transport mode.
            </p>
          </Section>
        )}

        <Section title={`Routes (${summary.routes.length})`}>
          {summary.routes.length === 0 ? (
            <p className="text-xs text-slate-500">No routes yet.</p>
          ) : (
            <table className="w-full text-[10.5px]">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-1 font-medium">Route</th>
                  <th className="pb-1 text-right font-medium">m</th>
                  <th className="pb-1 text-right font-medium">$/shift</th>
                  <th className="pb-1 text-right font-medium">$/yr</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {summary.routes.map((r) => (
                  <tr key={r.routeId}
                    className={`cursor-pointer border-t border-edge/60 hover:bg-edge/30 ${selectedRouteId === r.routeId ? 'text-flow' : 'text-slate-300'}`}
                    onClick={() => useApp.getState().selectRoute(r.routeId)}>
                    <td className="py-1 pr-1 font-ui">{r.name}</td>
                    <td className="py-1 text-right">{r.meters.toFixed(0)}</td>
                    <td className="py-1 text-right">{r.costPerShift.toFixed(0)}</td>
                    <td className="py-1 text-right">{(r.costPerYear / 1000).toFixed(1)}k</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </aside>
    </div>
  )
}

function ToolButton({ active, onClick, title, children }: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors ${
        active ? 'border-flow/60 bg-flow/10 text-flow' : 'border-edge text-slate-400 hover:text-white'
      }`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  )
}

function RouteReadout({ routeId }: { routeId: string }) {
  const spaghetti = useApp((s) => s.spaghetti)
  const demand = useApp((s) => s.demand)
  const summary = useMemo(
    () => computeSpaghettiSummary(spaghetti, demand.shiftsPerDay, demand.daysPerYear),
    [spaghetti, demand.shiftsPerDay, demand.daysPerYear],
  )
  const m = summary.routes.find((r) => r.routeId === routeId)
  if (!m) return null
  const rows: [string, string][] = [
    ['One-way distance', `${m.meters.toFixed(1)} m`],
    ['Steps (if walked)', m.steps > 0 ? String(m.steps) : '—'],
    ['Travel time / shift', `${m.minutesPerShift.toFixed(1)} min`],
    ['Cost / shift', fmtMoney(m.costPerShift)],
    ['Cost / year', fmtMoney(m.costPerYear)],
  ]
  return (
    <div className="panel bg-ink p-2 space-y-1">
      <div className="field-label">Route economics</div>
      {rows.map(([l, v]) => (
        <div key={l} className="flex justify-between text-[11px]">
          <span className="text-slate-500">{l}</span>
          <span className="font-mono text-slate-200">{v}</span>
        </div>
      ))}
    </div>
  )
}
