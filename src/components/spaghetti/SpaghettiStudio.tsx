import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Footprints, Forklift, Grid3X3, ImagePlus, MousePointer2, Pentagon, Route as RouteIcon,
  Ruler, Square, Trash2, Bot, X,
} from 'lucide-react'
import { useApp } from '../../store'
import { isProcessKind } from '../../lib/analytics'
import { transportProfiles } from '../../lib/calibration'
import { polygonArea } from '../../lib/geometry'
import { computeSpaghettiSummary, computeTransportAudit, fmtMoney } from '../../lib/spaghetti'
import { NumberField, Section, Stat, TextField } from '../ui'
import { useT, type StringKey } from '../../i18n'
import type { RoutePurpose, TransportMode, TravelRoute } from '../../types'

export const FLOOR = { width: 1400, height: 720 } as const
const MONO = 'JetBrains Mono, monospace'

const MODE_ICON: Record<TransportMode, typeof Footprints> = {
  walk: Footprints,
  forklift: Forklift,
  agv: Bot,
}

export function SpaghettiStudio({ svgRef }: { svgRef: React.RefObject<SVGSVGElement> }) {
  const { t } = useT()
  const spaghetti = useApp((s) => s.spaghetti)
  const demand = useApp((s) => s.demand)
  const tool = useApp((s) => s.spaghettiTool)
  const routeMode = useApp((s) => s.routeMode)
  const draft = useApp((s) => s.draftRoute)
  const draftPoly = useApp((s) => s.draftPoly)
  const selectedZoneId = useApp((s) => s.selectedZoneId)
  const selectedRouteId = useApp((s) => s.selectedRouteId)
  const prefs = useApp((s) => s.prefs)

  const calibration = useApp((s) => s.calibration)
  const profiles = useMemo(() => transportProfiles(calibration), [calibration])
  const summary = useMemo(
    () => computeSpaghettiSummary(spaghetti, demand.shiftsPerDay, demand.daysPerYear, calibration),
    [spaghetti, demand.shiftsPerDay, demand.daysPerYear, calibration],
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [gridOpen, setGridOpen] = useState(false)
  const [calib, setCalib] = useState<{ a: { x: number; y: number }; b?: { x: number; y: number } } | null>(null)
  const [calibMeters, setCalibMeters] = useState('10')
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const [zoneDraft, setZoneDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const dragZone = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null)
  const dragPoint = useRef<{ routeId: string; index: number; moved: boolean } | null>(null)
  const dragZonePt = useRef<{ zoneId: string; index: number; moved: boolean } | null>(null)
  const dragPan = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null)

  const fitView = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const k = Math.min(r.width / FLOOR.width, r.height / FLOOR.height) * 0.98
    setView({ k, x: (r.width - FLOOR.width * k) / 2, y: (r.height - FLOOR.height * k) / 2 })
  }, [])

  useEffect(() => {
    fitView()
  }, [fitView])

  // Drop the calibration line whenever we leave the ruler tool.
  useEffect(() => {
    if (tool !== 'calibrate') setCalib(null)
  }, [tool])

  const toWorld = (e: React.PointerEvent | React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const r = svg.getBoundingClientRect()
    return { x: (e.clientX - r.left - view.x) / view.k, y: (e.clientY - r.top - view.y) / view.k }
  }

  const onWheel = (e: React.WheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    setView((v) => {
      const k = Math.min(4, Math.max(0.2, v.k * factor))
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      // Keep the world point under the cursor fixed while zooming.
      return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k }
    })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const w = toWorld(e)
    if (tool === 'route') {
      useApp.getState().pushDraftPoint(w.x, w.y)
      return
    }
    if (tool === 'poly') {
      useApp.getState().pushDraftPolyPoint(w.x, w.y)
      return
    }
    if (tool === 'calibrate') {
      if (!calib || calib.b) setCalib({ a: w })
      else setCalib({ a: calib.a, b: w })
      return
    }
    if (tool === 'zone') {
      setZoneDraft({ x0: w.x, y0: w.y, x1: w.x, y1: w.y })
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      return
    }
    useApp.getState().selectZone(null)
    useApp.getState().selectRoute(null)
    dragPan.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const w = toWorld(e)
    setHover(w)
    if (zoneDraft) setZoneDraft({ ...zoneDraft, x1: w.x, y1: w.y })
    const pan = dragPan.current
    if (pan) {
      setView((v) => ({ ...v, x: pan.viewX + e.clientX - pan.startX, y: pan.viewY + e.clientY - pan.startY }))
      return
    }
    const dz = dragZone.current
    if (dz) {
      if (!dz.moved) {
        dz.moved = true
        useApp.getState().updateZone(dz.id, {}) // one undo entry per gesture
      }
      useApp.getState().moveZone(dz.id, w.x + dz.dx, w.y + dz.dy)
    }
    const dp = dragPoint.current
    if (dp) {
      if (!dp.moved) {
        dp.moved = true
        useApp.getState().updateRoute(dp.routeId, {}) // one undo entry per gesture
      }
      useApp.getState().moveRoutePoint(dp.routeId, dp.index, w.x, w.y)
    }
    const dzp = dragZonePt.current
    if (dzp) {
      if (!dzp.moved) {
        dzp.moved = true
        useApp.getState().updateZone(dzp.zoneId, {}) // one undo entry per gesture
      }
      useApp.getState().moveZonePoint(dzp.zoneId, dzp.index, w.x, w.y)
    }
  }

  const onPointerUp = () => {
    dragZone.current = null
    dragPoint.current = null
    dragZonePt.current = null
    dragPan.current = null
    if (zoneDraft) {
      const x = Math.min(zoneDraft.x0, zoneDraft.x1)
      const y = Math.min(zoneDraft.y0, zoneDraft.y1)
      const w = Math.abs(zoneDraft.x1 - zoneDraft.x0)
      const h = Math.abs(zoneDraft.y1 - zoneDraft.y0)
      if (w > 24 && h > 24) {
        // Store rectangles as 4-vertex polygons so every zone is vertex-editable.
        useApp.getState().addZone({
          name: `Zone ${spaghetti.zones.length + 1}`,
          x, y, w, h,
          color: '#94A3B8',
          points: [
            { x, y },
            { x: x + w, y },
            { x: x + w, y: y + h },
            { x, y: y + h },
          ],
        })
      }
      setZoneDraft(null)
    }
  }

  const onDoubleClick = () => {
    if (tool === 'route') useApp.getState().finishDraftRoute()
    if (tool === 'poly') useApp.getState().finishDraftPoly()
  }

  const selectedRoute = spaghetti.routes.find((r) => r.id === selectedRouteId)
  const selectedZone = spaghetti.zones.find((z) => z.id === selectedZoneId)

  return (
    <div className="flex h-full min-h-0">
      {/* Left: tools + canvas */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5 border-b border-edge bg-panel px-2 py-1.5">
          <ToolButton active={tool === 'select'} onClick={() => useApp.getState().setSpaghettiTool('select')} title={t('floor.selectHint')}>
            <MousePointer2 size={13} /> {t('floor.select')}
          </ToolButton>
          <ToolButton active={tool === 'zone'} onClick={() => useApp.getState().setSpaghettiTool('zone')} title={t('floor.zoneHint')}>
            <Square size={13} /> {t('floor.zone')}
          </ToolButton>
          <ToolButton active={tool === 'poly'} onClick={() => useApp.getState().setSpaghettiTool('poly')} title={t('floor.polyHint')}>
            <Pentagon size={13} /> {t('floor.poly')}
          </ToolButton>
          <ToolButton active={tool === 'route'} onClick={() => useApp.getState().setSpaghettiTool('route')} title={t('floor.routeHint')}>
            <RouteIcon size={13} /> {t('floor.route')}
          </ToolButton>
          <ToolButton active={tool === 'calibrate'} onClick={() => { setCalib(null); useApp.getState().setSpaghettiTool('calibrate') }} title={t('floor.calibrateHint')}>
            <Ruler size={13} /> {t('floor.calibrate')}
          </ToolButton>
          <div className="mx-2 h-5 w-px bg-edge" />
          {(Object.keys(profiles) as TransportMode[]).map((m) => {
            const p = profiles[m]
            const Icon = MODE_ICON[m]
            return (
              <ToolButton key={m} active={routeMode === m} onClick={() => useApp.getState().setRouteMode(m)}
                title={`${p.label} — ${calibration.currency}${p.costPerMeter.toFixed(2)}/m @ ${p.speedMps} m/s`}>
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
          {tool === 'poly' && draftPoly.length > 0 && (
            <span className="ml-auto flex items-center gap-2 text-[11px] font-mono text-flow">
              {draftPoly.length} vertices — double-click / Enter to close
              <button className="btn-ghost" onClick={() => useApp.getState().cancelDraftPoly()}>cancel</button>
            </span>
          )}
        </div>

        <div ref={containerRef} className="relative min-h-0 flex-1 bg-ink">
          <svg
            ref={svgRef}
            className="h-full w-full touch-none select-none"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onDoubleClick={onDoubleClick}
          >
            <defs>
              <pattern id="floorgrid" width={prefs.floorGridStep} height={prefs.floorGridStep} patternUnits="userSpaceOnUse">
                <path d={`M ${prefs.floorGridStep} 0 H 0 V ${prefs.floorGridStep}`} fill="none" stroke="#1E293B" strokeWidth="0.6" />
              </pattern>
            </defs>
            <g data-world transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {spaghetti.background && (
              <image
                href={spaghetti.background.dataUrl}
                x={0} y={0} width={FLOOR.width} height={FLOOR.height}
                preserveAspectRatio="xMidYMid meet"
                opacity={spaghetti.background.opacity}
                pointerEvents="none"
              />
            )}
            {prefs.floorGrid && (
              <rect width={FLOOR.width} height={FLOOR.height} fill="url(#floorgrid)" pointerEvents="none" />
            )}
            <rect x={1} y={1} width={FLOOR.width - 2} height={FLOOR.height - 2} fill="none" stroke="#334155" strokeWidth={2} />
            <text x={14} y={FLOOR.height - 14} fill="#475569" fontFamily={MONO} fontSize={11}>
              scale: 1 unit = {spaghetti.metersPerUnit} m · {prefs.floorGridStep}-unit grid = {(prefs.floorGridStep * spaghetti.metersPerUnit).toFixed(1)} m
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
                {z.points ? (
                  <polygon points={z.points.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill={z.color} fillOpacity={0.07}
                    stroke={selectedZoneId === z.id ? '#22D3EE' : z.color} strokeOpacity={selectedZoneId === z.id ? 1 : 0.5}
                    strokeWidth={selectedZoneId === z.id ? 2 : 1.2} strokeLinejoin="round" />
                ) : (
                  <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={4}
                    fill={z.color} fillOpacity={0.07}
                    stroke={selectedZoneId === z.id ? '#22D3EE' : z.color} strokeOpacity={selectedZoneId === z.id ? 1 : 0.5}
                    strokeWidth={selectedZoneId === z.id ? 2 : 1.2} />
                )}
                <text x={z.x + 10} y={z.y + 20} fill={z.color} fontFamily={'Space Grotesk, sans-serif'} fontSize={13} opacity={0.85}>
                  {z.name}
                </text>
                <text x={z.x + 10} y={z.y + 36} fill="#64748B" fontFamily={MONO} fontSize={10}>
                  {z.points
                    ? `${(polygonArea(z.points) * spaghetti.metersPerUnit * spaghetti.metersPerUnit).toFixed(0)} m²`
                    : `${(z.w * spaghetti.metersPerUnit).toFixed(0)}×${(z.h * spaghetti.metersPerUnit).toFixed(0)} m`}
                </text>
              </g>
            ))}

            {/* Vertex handles of the selected polygon zone: drag to move,
                alt/right-click to remove, and "+" midpoints to insert. */}
            {tool === 'select' && selectedZone?.points && (
              <g>
                {selectedZone.points.map((pt, i) => {
                  const next = selectedZone.points![(i + 1) % selectedZone.points!.length]
                  const mid = { x: (pt.x + next.x) / 2, y: (pt.y + next.y) / 2 }
                  return (
                    <g key={`${selectedZone.id}-v-${i}`}>
                      <circle cx={mid.x} cy={mid.y} r={5} fill="#0B0F19" stroke="#34D399" strokeWidth={1.5}
                        className="cursor-copy"
                        onPointerDown={(e) => {
                          if (e.button !== 0) return
                          e.stopPropagation()
                          useApp.getState().insertZonePoint(selectedZone.id, i, mid.x, mid.y)
                        }} />
                      <text x={mid.x} y={mid.y + 3} textAnchor="middle" fill="#34D399" fontSize={8} pointerEvents="none">+</text>
                      <circle cx={pt.x} cy={pt.y} r={7} fill="#0B0F19" stroke="#22D3EE" strokeWidth={2}
                        className="cursor-move"
                        onContextMenu={(e) => { e.preventDefault(); useApp.getState().removeZonePoint(selectedZone.id, i) }}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return
                          e.stopPropagation()
                          if (e.altKey) { useApp.getState().removeZonePoint(selectedZone.id, i); return }
                          dragZonePt.current = { zoneId: selectedZone.id, index: i, moved: false }
                          ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                        }} />
                    </g>
                  )
                })}
              </g>
            )}

            {spaghetti.routes.map((r) => {
              const p = profiles[r.mode]
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

            {/* Route waypoints: drag to move, alt/right-click to remove,
                "+" midpoints to insert a new waypoint. */}
            {tool === 'select' && selectedRoute && (
              <g>
                {selectedRoute.points.slice(0, -1).map((pt, i) => {
                  const next = selectedRoute.points[i + 1]
                  const mid = { x: (pt.x + next.x) / 2, y: (pt.y + next.y) / 2 }
                  return (
                    <g key={`${selectedRoute.id}-mid-${i}`}>
                      <circle cx={mid.x} cy={mid.y} r={5} fill="#0B0F19" stroke="#34D399" strokeWidth={1.5}
                        className="cursor-copy"
                        onPointerDown={(e) => {
                          if (e.button !== 0) return
                          e.stopPropagation()
                          useApp.getState().insertRoutePoint(selectedRoute.id, i, mid.x, mid.y)
                        }} />
                      <text x={mid.x} y={mid.y + 3} textAnchor="middle" fill="#34D399" fontSize={8} pointerEvents="none">+</text>
                    </g>
                  )
                })}
                {selectedRoute.points.map((pt, i) => (
                  <circle key={`${selectedRoute.id}-pt-${i}`} cx={pt.x} cy={pt.y} r={7}
                    fill="#0B0F19" stroke="#22D3EE" strokeWidth={2} className="cursor-move"
                    onContextMenu={(e) => { e.preventDefault(); useApp.getState().removeRoutePoint(selectedRoute.id, i) }}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return
                      e.stopPropagation()
                      if (e.altKey) { useApp.getState().removeRoutePoint(selectedRoute.id, i); return }
                      dragPoint.current = { routeId: selectedRoute.id, index: i, moved: false }
                      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
                    }} />
                ))}
              </g>
            )}

            {/* Calibration ruler line */}
            {calib && (
              <g pointerEvents="none">
                {(() => {
                  const b = calib.b ?? hover ?? calib.a
                  return (
                    <>
                      <line x1={calib.a.x} y1={calib.a.y} x2={b.x} y2={b.y} stroke="#F472B6" strokeWidth={2} />
                      <circle cx={calib.a.x} cy={calib.a.y} r={4} fill="#F472B6" />
                      <circle cx={b.x} cy={b.y} r={4} fill="#F472B6" />
                    </>
                  )
                })()}
              </g>
            )}

            {draft.length > 0 && (
              <g pointerEvents="none">
                <path
                  d={`M ${draft.map((pt) => `${pt.x} ${pt.y}`).join(' L ')}${hover ? ` L ${hover.x} ${hover.y}` : ''}`}
                  fill="none" stroke={profiles[routeMode].color} strokeWidth={2} strokeDasharray="6 5" />
                {draft.map((pt, i) => (
                  <circle key={i} cx={pt.x} cy={pt.y} r={3.5} fill={profiles[routeMode].color} />
                ))}
              </g>
            )}

            {draftPoly.length > 0 && (
              <g pointerEvents="none">
                <polygon
                  points={[...draftPoly, ...(hover ? [hover] : [])].map((pt) => `${pt.x},${pt.y}`).join(' ')}
                  fill="#22D3EE" fillOpacity={0.05} stroke="#22D3EE" strokeWidth={1.5} strokeDasharray="6 4" />
                {draftPoly.map((pt, i) => (
                  <circle key={i} cx={pt.x} cy={pt.y} r={3.5} fill="#22D3EE" />
                ))}
              </g>
            )}

            {zoneDraft && (
              <rect
                x={Math.min(zoneDraft.x0, zoneDraft.x1)} y={Math.min(zoneDraft.y0, zoneDraft.y1)}
                width={Math.abs(zoneDraft.x1 - zoneDraft.x0)} height={Math.abs(zoneDraft.y1 - zoneDraft.y0)}
                fill="#22D3EE" fillOpacity={0.06} stroke="#22D3EE" strokeDasharray="6 4" pointerEvents="none" />
            )}
            </g>
          </svg>

          {/* View controls */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1">
            <button className="btn-ghost !px-2 font-mono" onClick={() => setView((v) => ({ ...v, k: Math.min(4, v.k * 1.2) }))}>+</button>
            <button className="btn-ghost !px-2 font-mono" onClick={() => setView((v) => ({ ...v, k: Math.max(0.2, v.k / 1.2) }))}>−</button>
            <button className="btn-ghost !px-2 font-mono" onClick={fitView}>⊡</button>
            <button className={`btn-ghost !px-2 ${gridOpen ? '!text-flow' : ''}`} onClick={() => setGridOpen((o) => !o)} title={t('floor.gridSettings')}>
              <Grid3X3 size={13} />
            </button>
          </div>
          {gridOpen && (
            <div className="panel absolute bottom-3 right-12 w-44 space-y-2 p-2.5">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" className="accent-cyan-400" checked={prefs.floorGrid}
                  onChange={(e) => useApp.getState().setPrefs({ floorGrid: e.target.checked })} />
                {t('canvas.gridShow')}
              </label>
              <NumberField label={t('canvas.gridStep')} unit="units" value={prefs.floorGridStep} min={10} max={200} step={10}
                onChange={(floorGridStep) => useApp.getState().setPrefs({ floorGridStep })} />
            </div>
          )}

          {/* Calibration prompt: enter the real length of the drawn line */}
          {tool === 'calibrate' && calib?.b && (
            <div className="panel absolute left-1/2 top-3 w-64 -translate-x-1/2 space-y-2 p-3">
              <div className="field-label">{t('floor.calibrate')}</div>
              <p className="text-[10.5px] leading-relaxed text-slate-400">{t('floor.calibratePrompt')}</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" autoFocus min={0.01} step={0.1}
                  className="w-full rounded-md border border-edge bg-ink px-2 py-1 font-mono text-sm text-slate-100 focus:border-flow/70 focus:outline-none"
                  value={calibMeters}
                  onChange={(e) => setCalibMeters(e.target.value)}
                />
                <span className="text-xs text-slate-400">m</span>
              </div>
              <div className="flex gap-1.5">
                <button className="btn-ghost flex-1 !text-flow hover:!border-flow/50"
                  onClick={() => {
                    const meters = parseFloat(calibMeters)
                    const px = Math.hypot(calib.b!.x - calib.a.x, calib.b!.y - calib.a.y)
                    if (meters > 0 && px > 1) useApp.getState().setMetersPerUnit(meters / px)
                    setCalib(null)
                    useApp.getState().setSpaghettiTool('select')
                  }}>
                  {t('ana.apply')}
                </button>
                <button className="btn-ghost" onClick={() => setCalib(null)}>{t('floor.recalibrate')}</button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom: travel cost ledger */}
        <div className="flex shrink-0 items-stretch gap-2 border-t border-edge bg-panel p-2 overflow-x-auto">
          <Stat label={t('floor.travelShift')} value={`${Math.round(summary.totalMetersPerShift).toLocaleString()} m`} tone="flow" />
          <Stat label={t('floor.timeShift')} value={`${summary.totalMinutesPerShift.toFixed(0)} min`} />
          <Stat label={t('floor.costShift')} value={fmtMoney(summary.totalCostPerShift, calibration.currency)} tone="warn" />
          <Stat label={t('floor.costYear')} value={fmtMoney(summary.totalCostPerYear, calibration.currency)} tone="crit"
            sub={`${demand.shiftsPerDay} shifts × ${demand.daysPerYear} days`} />
          <Stat label={t('floor.roi')} value={fmtMoney(summary.bestModeSavingPerYear, calibration.currency)} tone="good" sub={t('floor.roiSub')} />
        </div>
      </div>

      {/* Right: inspector */}
      <aside className="flex w-[300px] shrink-0 flex-col gap-2 overflow-y-auto border-l border-edge bg-ink p-2">
        {selectedRoute ? (
          <Section
            title={t('floor.routeSection')}
            right={
              <button className="text-slate-500 hover:text-crit" title="Delete" onClick={() => useApp.getState().deleteFloorSelection()}>
                <Trash2 size={14} />
              </button>
            }
          >
            <TextField label={t('floor.name')} value={selectedRoute.name} onChange={(name) => useApp.getState().updateRoute(selectedRoute.id, { name })} />
            <div className="space-y-1">
              <span className="field-label">{t('floor.mode')}</span>
              {(Object.keys(profiles) as TransportMode[]).map((m) => {
                const p = profiles[m]
                return (
                  <button key={m}
                    className={`block w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                      selectedRoute.mode === m ? 'border-flow/60 bg-flow/10 text-white' : 'border-edge text-slate-400 hover:text-white'
                    }`}
                    onClick={() => useApp.getState().updateRoute(selectedRoute.id, { mode: m })}>
                    <span style={{ color: p.color }}>●</span> {p.label}
                    <span className="float-right font-mono text-slate-500">{calibration.currency}{p.costPerMeter.toFixed(2)}/m</span>
                  </button>
                )
              })}
            </div>
            <NumberField label={t('floor.roundTrips')} unit="/shift" value={selectedRoute.tripsPerShift} min={0} max={200} step={1} slider
              onChange={(tripsPerShift) => useApp.getState().updateRoute(selectedRoute.id, { tripsPerShift })} />
            <RouteLink routeId={selectedRoute.id} linkedNodeId={selectedRoute.linkedNodeId} />
            <CircuitControls route={selectedRoute} />
            <RouteReadout routeId={selectedRoute.id} />
            <p className="text-[10px] leading-relaxed text-slate-500">
              {t('floor.dragHandles')}
            </p>
          </Section>
        ) : selectedZone ? (
          <Section
            title={t('floor.zoneSection')}
            right={
              <button className="text-slate-500 hover:text-crit" title="Delete" onClick={() => useApp.getState().deleteFloorSelection()}>
                <Trash2 size={14} />
              </button>
            }
          >
            <TextField label={t('floor.name')} value={selectedZone.name} onChange={(name) => useApp.getState().updateZone(selectedZone.id, { name })} />
            {selectedZone.points ? (
              <div className="font-mono text-xs text-slate-400">
                Polygon · {selectedZone.points.length} {t('floor.vertices')} ·{' '}
                <span className="text-flow">
                  {(polygonArea(selectedZone.points) * spaghetti.metersPerUnit * spaghetti.metersPerUnit).toFixed(0)} m²
                </span>
                <p className="pt-1 font-ui text-[10px] leading-relaxed text-slate-500">
                  {t('floor.dragVertices')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <NumberField label={t('floor.width')} unit="units" value={Math.round(selectedZone.w)} min={20} step={10}
                  onChange={(w) => useApp.getState().updateZone(selectedZone.id, { w })} />
                <NumberField label={t('floor.height')} unit="units" value={Math.round(selectedZone.h)} min={20} step={10}
                  onChange={(h) => useApp.getState().updateZone(selectedZone.id, { h })} />
              </div>
            )}
            <div className="space-y-1">
              <span className="field-label">{t('floor.color')}</span>
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
          <>
            <Section title={t('floor.plantScale')}>
              <button
                className="btn-ghost flex w-full items-center justify-center gap-1.5 !text-flow hover:!border-flow/50"
                onClick={() => { setCalib(null); useApp.getState().setSpaghettiTool('calibrate') }}
              >
                <Ruler size={13} /> {t('floor.calibrateDraw')}
              </button>
              <div className="panel flex items-center justify-between bg-ink px-3 py-2">
                <span className="text-xs text-slate-400">{t('floor.currentScale')}</span>
                <span className="font-mono text-sm text-flow">
                  {(spaghetti.metersPerUnit * prefs.floorGridStep).toFixed(2)} m / {prefs.floorGridStep} u
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">{t('floor.calibrateExplain')}</p>
              <p className="text-[11px] leading-relaxed text-slate-500">{t('floor.plantHint')}</p>
            </Section>
            <FloorPlanPanel />
          </>
        )}

        <Section title={`${t('floor.routes')} (${summary.routes.length})`}>
          {summary.routes.length === 0 ? (
            <p className="text-xs text-slate-500">{t('floor.noRoutes')}</p>
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

const PURPOSE_KEY: Record<RoutePurpose, StringKey> = {
  delivery: 'floor.purpose.delivery',
  info: 'floor.purpose.info',
  navigation: 'floor.purpose.navigation',
}

/** Toggle whether a linked route is an operator circuit that eats production time. */
function CircuitControls({ route }: { route: TravelRoute }) {
  const { t } = useT()
  if (!route.linkedNodeId) return null
  return (
    <div className="space-y-1.5 rounded-md border border-edge bg-ink p-2">
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          className="accent-cyan-400"
          checked={route.operatorCircuit ?? false}
          onChange={(e) => useApp.getState().updateRoute(route.id, { operatorCircuit: e.target.checked })}
        />
        {t('floor.operatorCircuit')}
      </label>
      {route.operatorCircuit && (
        <>
          <select
            className="select-mini w-full !py-1.5"
            value={route.purpose ?? 'delivery'}
            onChange={(e) => useApp.getState().updateRoute(route.id, { purpose: e.target.value as RoutePurpose })}
          >
            {(['delivery', 'info', 'navigation'] as RoutePurpose[]).map((p) => (
              <option key={p} value={p}>{t(PURPOSE_KEY[p])}</option>
            ))}
          </select>
          <p className="text-[10px] leading-relaxed text-slate-500">{t('floor.circuitHint')}</p>
        </>
      )}
    </div>
  )
}

/** Link a floor route to the VSM station it feeds — enables the transport audit. */
function RouteLink({ routeId, linkedNodeId }: { routeId: string; linkedNodeId?: string }) {
  const { t } = useT()
  const nodes = useApp((s) => s.nodes)
  const stations = nodes.filter((n) => isProcessKind(n.kind))
  return (
    <label className="block space-y-1">
      <span className="field-label">{t('floor.feeds')}</span>
      <select
        className="select-mini w-full !py-1.5"
        value={linkedNodeId ?? ''}
        onChange={(e) =>
          useApp.getState().updateRoute(routeId, { linkedNodeId: e.target.value || undefined })
        }
      >
        <option value="">{t('floor.notLinked')}</option>
        {stations.map((n) => (
          <option key={n.id} value={n.id}>{n.label}</option>
        ))}
      </select>
    </label>
  )
}

/** Upload / tune the plant-floor drawing rendered under the grid. */
function FloorPlanPanel() {
  const { t } = useT()
  const background = useApp((s) => s.spaghetti.background)
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <Section
      title={t('floor.underlay')}
      right={
        background ? (
          <button className="text-slate-500 hover:text-crit transition-colors" title={t('floor.removePlan')}
            onClick={() => useApp.getState().setFloorBackground(null)}>
            <X size={14} />
          </button>
        ) : undefined
      }
    >
      <input
        ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              useApp.getState().setFloorBackground({ dataUrl: reader.result, opacity: 0.35 })
            }
          }
          reader.readAsDataURL(file)
          e.target.value = ''
        }}
      />
      <button className="btn-ghost flex w-full items-center justify-center gap-1.5" onClick={() => fileRef.current?.click()}>
        <ImagePlus size={13} /> {background ? t('floor.replace') : t('floor.upload')}
      </button>
      {background && (
        <NumberField label={t('floor.opacity')} unit="%" value={Math.round(background.opacity * 100)} min={5} max={100} step={5} slider
          onChange={(v) => useApp.getState().setFloorBackground({ ...background, opacity: v / 100 })} />
      )}
      <p className="text-[10px] leading-relaxed text-slate-500">{t('floor.underlayHint')}</p>
    </Section>
  )
}

function RouteReadout({ routeId }: { routeId: string }) {
  const { t } = useT()
  const spaghetti = useApp((s) => s.spaghetti)
  const demand = useApp((s) => s.demand)
  const calibration = useApp((s) => s.calibration)
  const summary = useMemo(
    () => computeSpaghettiSummary(spaghetti, demand.shiftsPerDay, demand.daysPerYear, calibration),
    [spaghetti, demand.shiftsPerDay, demand.daysPerYear, calibration],
  )
  const audit = useMemo(
    () => computeTransportAudit(spaghetti, demand.unitsPerDay / Math.max(1, demand.shiftsPerDay), calibration),
    [spaghetti, demand.unitsPerDay, demand.shiftsPerDay, calibration],
  )
  const m = summary.routes.find((r) => r.routeId === routeId)
  if (!m) return null
  const perPart = audit.rows.find((r) => r.routeId === routeId)
  const rows: [string, string][] = [
    [t('floor.oneWay'), `${m.meters.toFixed(1)} m`],
    [t('floor.steps'), m.steps > 0 ? String(m.steps) : '—'],
    [t('floor.travelTime'), `${m.minutesPerShift.toFixed(1)} min`],
    [t('floor.costShift'), fmtMoney(m.costPerShift, calibration.currency)],
    [t('floor.costYear'), fmtMoney(m.costPerYear, calibration.currency)],
    ...(perPart
      ? ([[t('floor.transportPart'), `${perPart.secondsPerPart.toFixed(1)} s · ${calibration.currency}${perPart.costPerPart.toFixed(3)}`]] as [string, string][])
      : []),
  ]
  return (
    <div className="panel bg-ink p-2 space-y-1">
      <div className="field-label">{t('floor.economics')}</div>
      {rows.map(([l, v]) => (
        <div key={l} className="flex justify-between text-[11px]">
          <span className="text-slate-500">{l}</span>
          <span className="font-mono text-slate-200">{v}</span>
        </div>
      ))}
    </div>
  )
}
