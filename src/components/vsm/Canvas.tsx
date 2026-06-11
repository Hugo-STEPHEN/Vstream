import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../store'
import { NODE_LANE } from '../../data/palette'
import { SHEET, NODE_W, NODE_H } from '../../lib/geometry'
import { computeSystemMetrics, fmtSeconds, isInventoryKind, isProcessKind } from '../../lib/analytics'
import { NodeGlyph } from './NodeGlyph'
import type { NodeKind, SystemMetrics, VsmEdge, VsmNode } from '../../types'

const MONO = 'JetBrains Mono, monospace'
const UI_FONT = 'Inter, sans-serif'
const DISPLAY = 'Space Grotesk, sans-serif'

interface ViewTransform {
  x: number
  y: number
  k: number
}

export function VsmCanvas({ svgRef }: { svgRef: React.RefObject<SVGSVGElement> }) {
  const nodes = useApp((s) => s.nodes)
  const edges = useApp((s) => s.edges)
  const demand = useApp((s) => s.demand)
  const tool = useApp((s) => s.tool)
  const connectFrom = useApp((s) => s.connectFrom)
  const selectedNodeId = useApp((s) => s.selectedNodeId)
  const selectedEdgeId = useApp((s) => s.selectedEdgeId)

  const metrics = useMemo(() => computeSystemMetrics(nodes, demand), [nodes, demand])

  const containerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, k: 0.72 })
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<
    | { type: 'node'; id: string; dx: number; dy: number; moved: boolean }
    | { type: 'pan'; startX: number; startY: number; viewX: number; viewY: number }
    | null
  >(null)

  const fitView = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const k = Math.min(r.width / SHEET.width, r.height / SHEET.height) * 0.98
    setView({
      k,
      x: (r.width - SHEET.width * k) / 2,
      y: (r.height - SHEET.height * k) / 2,
    })
  }, [])

  useEffect(() => {
    fitView()
  }, [fitView])

  const toWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return { x: (clientX - rect.left - view.x) / view.k, y: (clientY - rect.top - view.y) / view.k }
    },
    [view, svgRef],
  )

  const onWheel = (e: React.WheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.2, v.k * factor))
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      // Keep the world point under the cursor fixed while zooming.
      return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k }
    })
  }

  const onPointerDownBg = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    useApp.getState().selectNode(null)
    if (connectFrom) useApp.getState().cancelConnect()
    dragRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const onPointerDownNode = (e: React.PointerEvent, node: VsmNode) => {
    e.stopPropagation()
    if (e.button !== 0) return
    if (tool === 'connect') {
      if (!connectFrom) useApp.getState().beginConnect(node.id)
      else useApp.getState().completeConnect(node.id)
      return
    }
    useApp.getState().selectNode(node.id)
    const w = toWorld(e.clientX, e.clientY)
    dragRef.current = { type: 'node', id: node.id, dx: node.x - w.x, dy: node.y - w.y, moved: false }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const w = toWorld(e.clientX, e.clientY)
    if (tool === 'connect' && connectFrom) setCursor(w)
    const drag = dragRef.current
    if (!drag) return
    if (drag.type === 'pan') {
      setView((v) => ({ ...v, x: drag.viewX + e.clientX - drag.startX, y: drag.viewY + e.clientY - drag.startY }))
    } else {
      if (!drag.moved) {
        drag.moved = true
        // Record one undo entry for the whole drag gesture.
        useApp.getState().updateNode(drag.id, {})
      }
      useApp.getState().moveNode(drag.id, w.x + drag.dx, w.y + drag.dy)
    }
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const kind = e.dataTransfer.getData('vstream/node-kind') as NodeKind | ''
    if (!kind) return
    const w = toWorld(e.clientX, e.clientY)
    useApp.getState().addNode(kind, w.x, w.y)
  }

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const connectSource = connectFrom ? nodeById.get(connectFrom) : undefined

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-ink">
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        onWheel={onWheel}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerDown={onPointerDownBg}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <defs>
          <marker id="arrow-push" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748B" />
          </marker>
          <marker id="arrow-pull" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#34D399" />
          </marker>
          <marker id="arrow-info" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#818CF8" />
          </marker>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#1E293B" />
          </pattern>
        </defs>

        <g data-world transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <Lanes />
          <rect x={0} y={0} width={SHEET.width} height={SHEET.height} fill="url(#grid)" pointerEvents="none" />

          {edges.map((edge) => (
            <EdgeShape
              key={edge.id}
              edge={edge}
              from={nodeById.get(edge.from)}
              to={nodeById.get(edge.to)}
              selected={edge.id === selectedEdgeId}
            />
          ))}

          {tool === 'connect' && connectSource && cursor ? (
            <line
              x1={connectSource.x} y1={connectSource.y} x2={cursor.x} y2={cursor.y}
              stroke="#22D3EE" strokeWidth={1.5} strokeDasharray="5 4" pointerEvents="none"
            />
          ) : null}

          {nodes.map((node) => (
            <NodeShape
              key={node.id}
              node={node}
              metrics={metrics}
              selected={node.id === selectedNodeId}
              connecting={tool === 'connect'}
              isConnectSource={node.id === connectFrom}
              onPointerDown={onPointerDownNode}
            />
          ))}

          <TimelineLadder metrics={metrics} />
        </g>
      </svg>

      {/* zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button className="btn-ghost !px-2 font-mono" onClick={() => setView((v) => ({ ...v, k: Math.min(2.5, v.k * 1.2) }))}>+</button>
        <button className="btn-ghost !px-2 font-mono" onClick={() => setView((v) => ({ ...v, k: Math.max(0.2, v.k / 1.2) }))}>−</button>
        <button className="btn-ghost !px-2 font-mono" onClick={fitView}>⊡</button>
      </div>

      {tool === 'connect' ? (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 panel px-3 py-1.5 text-xs text-flow font-mono">
          {connectFrom ? 'Click target node — Esc to cancel' : 'Click source node'}
        </div>
      ) : null}
    </div>
  )
}

function Lanes() {
  return (
    <g pointerEvents="none">
      <rect x={0} y={SHEET.info.top} width={SHEET.width} height={SHEET.info.bottom - SHEET.info.top} fill="#818CF8" opacity={0.03} />
      <rect x={0} y={SHEET.material.top} width={SHEET.width} height={SHEET.material.bottom - SHEET.material.top} fill="#22D3EE" opacity={0.025} />
      <rect x={0} y={SHEET.timeline.top} width={SHEET.width} height={SHEET.timeline.bottom - SHEET.timeline.top} fill="#FBBF24" opacity={0.02} />
      {[SHEET.info.bottom, SHEET.material.bottom].map((y) => (
        <line key={y} x1={0} y1={y} x2={SHEET.width} y2={y} stroke="#1E293B" strokeWidth={1.5} strokeDasharray="10 8" />
      ))}
      {(
        [
          ['INFORMATION FLOW', SHEET.info.top + 24, '#818CF8'],
          ['MATERIAL FLOW', SHEET.material.top + 24, '#22D3EE'],
          ['TIMELINE LADDER — VA / NVA', SHEET.timeline.top + 24, '#FBBF24'],
        ] as const
      ).map(([label, y, color]) => (
        <text key={label} x={16} y={y} fill={color} opacity={0.55} fontSize={13} fontFamily={DISPLAY} letterSpacing={3}>
          {label}
        </text>
      ))}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

/** Trim the segment between two nodes at each node's bounding box. */
function anchor(from: VsmNode, to: VsmNode): { x1: number; y1: number; x2: number; y2: number } {
  const trim = (cx: number, cy: number, tx: number, ty: number): { x: number; y: number } => {
    const dx = tx - cx
    const dy = ty - cy
    const sx = dx !== 0 ? NODE_W / 2 / Math.abs(dx) : Infinity
    const sy = dy !== 0 ? NODE_H / 2 / Math.abs(dy) : Infinity
    const t = Math.min(sx, sy, 0.5)
    return { x: cx + dx * t, y: cy + dy * t }
  }
  const a = trim(from.x, from.y, to.x, to.y)
  const b = trim(to.x, to.y, from.x, from.y)
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
}

function EdgeShape({ edge, from, to, selected }: { edge: VsmEdge; from?: VsmNode; to?: VsmNode; selected: boolean }) {
  if (!from || !to) return null
  const { x1, y1, x2, y2 } = anchor(from, to)
  const select = (e: React.PointerEvent) => {
    e.stopPropagation()
    useApp.getState().selectEdge(edge.id)
  }

  const halo = selected ? (
    <path d={lineD(x1, y1, x2, y2)} stroke="#22D3EE" strokeWidth={14} opacity={0.18} fill="none" />
  ) : null

  if (edge.kind === 'push') {
    const d = lineD(x1, y1, x2, y2)
    return (
      <g onPointerDown={select} className="cursor-pointer">
        {halo}
        <path d={d} stroke="transparent" strokeWidth={16} fill="none" />
        <path d={d} stroke="#64748B" strokeWidth={8} fill="none" markerEnd="url(#arrow-push)" />
        <path d={d} stroke="#0B0F19" strokeWidth={8} fill="none" strokeDasharray="7 7" />
      </g>
    )
  }
  if (edge.kind === 'pull') {
    // Withdrawal loop: an arc bowing toward the consumer.
    const mx = (x1 + x2) / 2
    const my = Math.min(y1, y2) - 70
    const d = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`
    return (
      <g onPointerDown={select} className="cursor-pointer">
        {halo}
        <path d={d} stroke="transparent" strokeWidth={16} fill="none" />
        <path d={d} stroke="#34D399" strokeWidth={2} fill="none" strokeDasharray="8 5" markerEnd="url(#arrow-pull)" />
        <circle cx={mx} cy={(my + (y1 + y2) / 2) / 2} r={5} fill="none" stroke="#34D399" strokeWidth={1.6} />
      </g>
    )
  }
  if (edge.kind === 'electronicInfo') {
    // Lightning zigzag for EDI / electronic transmissions.
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const nx = -(y2 - y1)
    const ny = x2 - x1
    const len = Math.hypot(nx, ny) || 1
    const ox = (nx / len) * 16
    const oy = (ny / len) * 16
    const d = `M ${x1} ${y1} L ${midX + ox} ${midY + oy} L ${midX - ox} ${midY - oy} L ${x2} ${y2}`
    return (
      <g onPointerDown={select} className="cursor-pointer">
        {halo}
        <path d={d} stroke="transparent" strokeWidth={14} fill="none" />
        <path d={d} stroke="#818CF8" strokeWidth={1.8} fill="none" markerEnd="url(#arrow-info)" />
      </g>
    )
  }
  // manual info
  const d = lineD(x1, y1, x2, y2)
  return (
    <g onPointerDown={select} className="cursor-pointer">
      {halo}
      <path d={d} stroke="transparent" strokeWidth={14} fill="none" />
      <path d={d} stroke="#818CF8" strokeWidth={1.5} fill="none" markerEnd="url(#arrow-info)" />
    </g>
  )
}

const lineD = (x1: number, y1: number, x2: number, y2: number): string => `M ${x1} ${y1} L ${x2} ${y2}`

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

function NodeShape({
  node,
  metrics,
  selected,
  connecting,
  isConnectSource,
  onPointerDown,
}: {
  node: VsmNode
  metrics: SystemMetrics
  selected: boolean
  connecting: boolean
  isConnectSource: boolean
  onPointerDown: (e: React.PointerEvent, node: VsmNode) => void
}) {
  const pm = metrics.processes.find((p) => p.nodeId === node.id)
  const im = metrics.inventories.find((i) => i.nodeId === node.id)
  const isBottleneck = metrics.bottleneck?.nodeId === node.id && metrics.processes.length > 1
  const overTakt = pm?.exceedsTakt ?? false

  const color = overTakt
    ? '#F87171'
    : isBottleneck
      ? '#FBBF24'
      : selected || isConnectSource
        ? '#22D3EE'
        : NODE_LANE[node.kind] === 'information'
          ? '#818CF8'
          : '#94A3B8'

  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      color={color}
      onPointerDown={(e) => onPointerDown(e, node)}
      className={connecting ? 'cursor-crosshair' : 'cursor-grab'}
    >
      {(selected || isConnectSource) && (
        <rect x={-NODE_W / 2 - 6} y={-NODE_H / 2 - 6} width={NODE_W + 12} height={NODE_H + 12} rx={8}
          fill="none" stroke="#22D3EE" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.9} />
      )}
      {overTakt && (
        <rect x={-NODE_W / 2 - 4} y={-NODE_H / 2 - 4} width={NODE_W + 8} height={NODE_H + 8} rx={7}
          fill="none" stroke="#F87171" strokeWidth={2}>
          <animate attributeName="opacity" values="1;0.25;1" dur="1.3s" repeatCount="indefinite" />
        </rect>
      )}
      {/* generous invisible hit area */}
      <rect x={-NODE_W / 2} y={-NODE_H / 2} width={NODE_W} height={NODE_H} fill="transparent" />

      <g transform="translate(0 -4)">
        <NodeGlyph kind={node.kind} />
      </g>

      <text x={0} y={-NODE_H / 2 - 10} textAnchor="middle" fill="#E2E8F0" fontSize={12.5} fontFamily={DISPLAY} fontWeight={600}>
        {node.label}
      </text>

      {pm ? (
        <g fontFamily={MONO} fontSize={9.5}>
          <text x={0} y={NODE_H / 2 + 14} textAnchor="middle" fill="#94A3B8">
            {`CT ${fmtSeconds(pm.ctNominal)} · A ${(pm.availability * 100).toFixed(0)}% · SR ${(pm.scrap * 100).toFixed(1)}%`}
          </text>
          <text x={0} y={NODE_H / 2 + 27} textAnchor="middle" fill={overTakt ? '#F87171' : '#64748B'}>
            {`CT* ${fmtSeconds(pm.ctGrand)} · ${pm.operators.toFixed(1)} FTE${pm.smedAlert ? ' · SMED!' : ''}`}
          </text>
        </g>
      ) : null}
      {im ? (
        <text x={0} y={NODE_H / 2 + 14} textAnchor="middle" fill="#94A3B8" fontFamily={MONO} fontSize={9.5}>
          {`${im.qty.toLocaleString()} pcs · ${im.days.toFixed(1)} d`}
        </text>
      ) : null}
      {node.kind === 'truck' || node.kind === 'ship' || node.kind === 'air' ? (
        <text x={0} y={NODE_H / 2 + 14} textAnchor="middle" fill="#94A3B8" fontFamily={MONO} fontSize={9.5}>
          {`${node.tripsPerWeek ?? 0}×/wk · ${node.distanceKm ?? 0} km`}
        </text>
      ) : null}
      {isBottleneck && !overTakt ? (
        <text x={0} y={-NODE_H / 2 - 26} textAnchor="middle" fill="#FBBF24" fontFamily={MONO} fontSize={9}>
          ▲ BOTTLENECK
        </text>
      ) : null}
      {overTakt ? (
        <text x={0} y={-NODE_H / 2 - 26} textAnchor="middle" fill="#F87171" fontFamily={MONO} fontSize={9}>
          ■ OVER TAKT
        </text>
      ) : null}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Timeline ladder
// ---------------------------------------------------------------------------

function TimelineLadder({ metrics }: { metrics: SystemMetrics }) {
  const { ladder, leadTimeSeconds, totalValueAddSeconds, totalNvaSeconds, pce, availableSecondsPerDay } = metrics
  if (ladder.length === 0) {
    return (
      <text x={SHEET.width / 2} y={(SHEET.timeline.top + SHEET.timeline.bottom) / 2} textAnchor="middle"
        fill="#475569" fontSize={13} fontFamily={UI_FONT}>
        Drop process steps and inventory into the material lane — the VA/NVA ladder builds itself.
      </text>
    )
  }

  const left = 50
  const right = SHEET.width - 320
  const width = right - left
  const topY = SHEET.timeline.top + 70
  const botY = SHEET.timeline.bottom - 80

  const total = Math.max(1, leadTimeSeconds)
  const minW = 36
  // Proportional widths with a readable floor, renormalized to fit.
  const rawW = ladder.map((s) => Math.max(minW, (displaySeconds(s) / total) * width))
  const scale = width / rawW.reduce((a, b) => a + b, 0)
  const widths = rawW.map((w) => w * scale)

  let x = left
  const segs = ladder.map((step, i) => {
    const w = widths[i]
    const seg = { step, x, w }
    x += w
    return seg
  })

  const wave = segs
    .map((s, i) => {
      const y = s.step.type === 'va' ? topY : botY
      const prevY = i === 0 ? botY : segs[i - 1].step.type === 'va' ? topY : botY
      return `${i === 0 ? `M ${s.x} ${y}` : prevY !== y ? `L ${s.x} ${y}` : ''} L ${s.x + s.w} ${y}`
    })
    .join(' ')

  return (
    <g pointerEvents="none">
      <path d={wave} fill="none" stroke="#FBBF24" strokeWidth={2} strokeLinejoin="miter" />
      {segs.map(({ step, x: sx, w }) => {
        const isVa = step.type === 'va'
        const y = isVa ? topY : botY
        return (
          <g key={`${step.nodeId}-${isVa ? 'va' : 'nva'}`}>
            <line x1={sx} y1={y} x2={sx} y2={isVa ? y - 8 : y + 8} stroke="#FBBF24" strokeWidth={1} opacity={0.5} />
            <text x={sx + w / 2} y={isVa ? y - 14 : y + 22} textAnchor="middle"
              fill={isVa ? '#34D399' : '#FBBF24'} fontFamily={MONO} fontSize={10.5}>
              {isVa ? fmtSeconds((step as { seconds: number }).seconds) : fmtDays(step.seconds, availableSecondsPerDay)}
            </text>
            <text x={sx + w / 2} y={isVa ? y - 28 : y + 36} textAnchor="middle" fill="#475569" fontFamily={UI_FONT} fontSize={9}>
              {truncate(step.label, Math.max(6, Math.floor(w / 6)))}
            </text>
          </g>
        )
      })}
      {/* Totals box */}
      <g transform={`translate(${right + 24} ${SHEET.timeline.top + 46})`}>
        <rect x={0} y={0} width={270} height={150} rx={8} fill="#0B0F19" stroke="#1E293B" />
        <text x={16} y={28} fill="#94A3B8" fontFamily={DISPLAY} fontSize={11} letterSpacing={2}>FLOW SUMMARY</text>
        {(
          [
            ['Lead time', fmtDays(leadTimeSeconds, availableSecondsPerDay), '#E2E8F0'],
            ['Value-add', fmtSeconds(totalValueAddSeconds), '#34D399'],
            ['Non-value-add', fmtDays(totalNvaSeconds, availableSecondsPerDay), '#FBBF24'],
            ['PCE', `${pce.toFixed(2)}%`, pce >= 25 ? '#34D399' : pce >= 5 ? '#FBBF24' : '#F87171'],
          ] as const
        ).map(([label, value, color], i) => (
          <g key={label} transform={`translate(16 ${52 + i * 24})`}>
            <text x={0} y={0} fill="#64748B" fontFamily={UI_FONT} fontSize={11}>{label}</text>
            <text x={238} y={0} textAnchor="end" fill={color} fontFamily={MONO} fontSize={13}>{value}</text>
          </g>
        ))}
      </g>
    </g>
  )
}

const displaySeconds = (s: { type: string; seconds: number; ctGrand?: number }): number =>
  s.type === 'va' ? Math.max(s.seconds, s.ctGrand ?? 0) : s.seconds

function fmtDays(seconds: number, availableSecondsPerDay: number): string {
  if (availableSecondsPerDay > 0 && seconds >= availableSecondsPerDay * 0.2) {
    return `${(seconds / availableSecondsPerDay).toFixed(1)}d`
  }
  return fmtSeconds(seconds)
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, Math.max(1, n - 1))}…` : s
}
