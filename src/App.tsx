import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, BarChart3, Download, FilePlus2, FlaskConical, FolderOpen, Map as MapIcon,
  Redo2, Undo2, Waypoints,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useApp, type AppTab } from './store'
import { computeSystemMetrics, fmtSeconds } from './lib/analytics'
import {
  exportMetricsCsv, exportPng, exportProjectJson, exportSpaghettiCsv, exportSvg,
} from './lib/exporters'
import { computeSpaghettiSummary } from './lib/spaghetti'
import { SHEET } from './lib/geometry'
import { VsmCanvas } from './components/vsm/Canvas'
import { Toolbox } from './components/vsm/Toolbox'
import { Inspector } from './components/vsm/Inspector'
import { SpaghettiStudio, FLOOR } from './components/spaghetti/SpaghettiStudio'
import { AnalyticsView } from './components/analytics/AnalyticsView'
import { BenchmarkView } from './components/benchmarks/BenchmarkView'

const TABS: { id: AppTab; label: string; icon: typeof Waypoints }[] = [
  { id: 'vsm', label: 'VSM Studio', icon: Waypoints },
  { id: 'spaghetti', label: 'Spaghetti', icon: MapIcon },
  { id: 'analytics', label: 'Flow Analytics', icon: FlaskConical },
  { id: 'benchmarks', label: 'Benchmarks', icon: BarChart3 },
]

export default function App() {
  const tab = useApp((s) => s.tab)
  const setTab = useApp((s) => s.setTab)
  const projectName = useApp((s) => s.projectName)
  const nodes = useApp((s) => s.nodes)
  const demand = useApp((s) => s.demand)
  const past = useApp((s) => s.past)
  const future = useApp((s) => s.future)

  const metrics = useMemo(() => computeSystemMetrics(nodes, demand), [nodes, demand])
  const vsmSvgRef = useRef<SVGSVGElement>(null)
  const floorSvgRef = useRef<SVGSVGElement>(null)

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      const s = useApp.getState()
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (s.tab === 'vsm') s.deleteSelection()
        if (s.tab === 'spaghetti') s.deleteFloorSelection()
      } else if (e.key === 'Escape') {
        s.cancelConnect()
        s.cancelDraftRoute()
        s.setTool('select')
      } else if (e.key === 'Enter' && s.tab === 'spaghetti' && s.draftRoute.length >= 2) {
        s.finishDraftRoute()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        s.undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault()
        s.redo()
      } else if (e.key.toLowerCase() === 'v' && s.tab === 'vsm') {
        s.setTool('select')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <TopBar metricsLead={fmtLead(metrics.leadTimeSeconds, metrics.availableSecondsPerDay)}
        pce={metrics.pce} takt={metrics.taktSeconds}
        canUndo={past.length > 0} canRedo={future.length > 0}
        vsmSvgRef={vsmSvgRef} floorSvgRef={floorSvgRef} />

      <main className="min-h-0 flex-1">
        {tab === 'vsm' && (
          <div className="flex h-full min-h-0">
            <Toolbox />
            <div className="min-w-0 flex-1">
              <VsmCanvas svgRef={vsmSvgRef} />
            </div>
            <Inspector />
          </div>
        )}
        {tab === 'spaghetti' && <SpaghettiStudio svgRef={floorSvgRef} />}
        {tab === 'analytics' && <AnalyticsView />}
        {tab === 'benchmarks' && <BenchmarkView />}
      </main>
      <footer className="flex items-center justify-between border-t border-edge bg-panel px-3 py-1 text-[10px] text-slate-600">
        <span className="font-mono">{projectName} · autosaved locally</span>
        <span>vStream Suite — VSM · spaghetti · flow analytics · benchmarking</span>
      </footer>
    </div>
  )
}

function TopBar({
  metricsLead, pce, takt, canUndo, canRedo, vsmSvgRef, floorSvgRef,
}: {
  metricsLead: string
  pce: number
  takt: number
  canUndo: boolean
  canRedo: boolean
  vsmSvgRef: React.RefObject<SVGSVGElement>
  floorSvgRef: React.RefObject<SVGSVGElement>
}) {
  const tab = useApp((s) => s.tab)
  const setTab = useApp((s) => s.setTab)
  const projectName = useApp((s) => s.projectName)
  const setProjectName = useApp((s) => s.setProjectName)
  const [exportOpen, setExportOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const doExport = (what: 'json' | 'csv' | 'csv-floor' | 'svg' | 'png') => {
    const s = useApp.getState()
    const name = s.projectName.replace(/\s+/g, '_')
    if (what === 'json') exportProjectJson(s.snapshot())
    if (what === 'csv') exportMetricsCsv(name, computeSystemMetrics(s.nodes, s.demand))
    if (what === 'csv-floor')
      exportSpaghettiCsv(name, computeSpaghettiSummary(s.spaghetti, s.demand.shiftsPerDay, s.demand.daysPerYear))
    if (what === 'svg' || what === 'png') {
      const onFloor = s.tab === 'spaghetti'
      const svg = onFloor ? floorSvgRef.current : vsmSvgRef.current
      const box = onFloor ? { width: FLOOR.width, height: FLOOR.height } : { width: SHEET.width, height: SHEET.height }
      const suffix = onFloor ? 'spaghetti' : 'vsm'
      if (svg) {
        if (what === 'svg') exportSvg(svg, `${name}_${suffix}.svg`, { worldBox: box })
        else exportPng(svg, `${name}_${suffix}.png`, { worldBox: box })
      }
    }
    setExportOpen(false)
  }

  return (
    <header className="flex items-center gap-2 border-b border-edge bg-panel px-3 py-2">
      {/* Brand */}
      <div className="flex items-center gap-2 pr-1">
        <Activity size={18} className="text-flow" />
        <span className="font-display text-base font-bold tracking-tight text-white">
          v<span className="text-flow">Stream</span>
        </span>
      </div>

      <input
        className="w-44 rounded-md border border-transparent bg-transparent px-2 py-1 font-display text-sm text-slate-300
          hover:border-edge focus:border-flow/60 focus:outline-none transition-colors"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        title="Project name"
      />

      {/* Tabs */}
      <nav className="ml-2 flex rounded-lg border border-edge p-0.5">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              className={`relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
                active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setTab(t.id)}
            >
              {active && (
                <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-md bg-edge/70"
                  transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }} />
              )}
              <Icon size={13} className={`relative ${active ? 'text-flow' : ''}`} />
              <span className="relative font-display">{t.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Live KPIs */}
      <div className="ml-auto hidden items-center gap-3 font-mono text-[11px] md:flex">
        <Kpi label="TAKT" value={fmtSeconds(takt)} color="#22D3EE" />
        <Kpi label="LEAD" value={metricsLead} color="#E2E8F0" />
        <Kpi label="PCE" value={`${pce.toFixed(1)}%`} color={pce >= 25 ? '#34D399' : pce >= 5 ? '#FBBF24' : '#F87171'} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 border-l border-edge pl-2">
        <IconBtn title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => useApp.getState().undo()}><Undo2 size={14} /></IconBtn>
        <IconBtn title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => useApp.getState().redo()}><Redo2 size={14} /></IconBtn>
        <IconBtn title="New blank project" onClick={() => { if (confirm('Start a blank project? Current work stays in your last export.')) useApp.getState().newProject() }}>
          <FilePlus2 size={14} />
        </IconBtn>
        <IconBtn title="Load demo value stream" onClick={() => { if (confirm('Load the Acme demo stream? This replaces the current project.')) useApp.getState().loadDemo() }}>
          <FlaskConical size={14} />
        </IconBtn>
        <IconBtn title="Import project JSON" onClick={() => fileRef.current?.click()}><FolderOpen size={14} /></IconBtn>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            void file.text().then((text) => {
              const err = useApp.getState().importJson(text)
              if (err) alert(`Import failed: ${err}`)
            })
            e.target.value = ''
          }} />

        <div className="relative">
          <button
            className="flex items-center gap-1.5 rounded-md border border-flow/50 bg-flow/10 px-2.5 py-1.5 text-xs text-flow
              hover:bg-flow/20 transition-colors"
            onClick={() => setExportOpen((o) => !o)}
          >
            <Download size={13} /> Export
          </button>
          <AnimatePresence>
            {exportOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full z-30 mt-1 w-60 rounded-lg border border-edge bg-panel p-1 shadow-xl shadow-black/50"
              >
                {(
                  [
                    ['json', 'Project file (.vstream.json)', 'Full model — re-importable'],
                    ['csv', 'VSM metrics (.csv)', 'Audited cycle times, PCE report'],
                    ['csv-floor', 'Spaghetti economics (.csv)', 'Distances, costs, ROI per route'],
                    ['svg', `${tab === 'spaghetti' ? 'Floor map' : 'VSM sheet'} (.svg)`, 'Vector — print & slide ready'],
                    ['png', `${tab === 'spaghetti' ? 'Floor map' : 'VSM sheet'} (.png)`, '2× raster snapshot'],
                  ] as const
                ).map(([key, label, hint]) => (
                  <button key={key}
                    className="block w-full rounded-md px-2.5 py-2 text-left text-xs text-slate-300 hover:bg-edge/50 transition-colors"
                    onClick={() => doExport(key)}>
                    <span className="block font-medium text-slate-200">{label}</span>
                    <span className="block text-[10px] text-slate-500">{hint}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[9px] tracking-widest text-slate-500">{label}</span>
      <span style={{ color }}>{value}</span>
    </span>
  )
}

function IconBtn({ title, onClick, disabled, children }: {
  title: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      className="rounded-md border border-edge p-1.5 text-slate-400 transition-colors hover:border-steel hover:text-white
        disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-edge disabled:hover:text-slate-400"
      title={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function fmtLead(seconds: number, perDay: number): string {
  return perDay > 0 ? `${(seconds / perDay).toFixed(1)}d` : fmtSeconds(seconds)
}
