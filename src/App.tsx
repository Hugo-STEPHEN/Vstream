import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, BarChart3, BookOpen, Download, FilePlus2, FlaskConical, FolderOpen, Gauge, Map as MapIcon,
  Redo2, SlidersHorizontal, Undo2, Waypoints,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useApp, type AppTab } from './store'
import { useT, type StringKey } from './i18n'
import { computeSystemMetrics, fmtSeconds } from './lib/analytics'
import { useSystemMetrics } from './lib/useMetrics'
import { circuitSecondsByNode } from './lib/spaghetti'
import {
  exportBenchmarksCsv, exportMetricsCsv, exportPng, exportProjectJson, exportSpaghettiCsv, exportSvg,
} from './lib/exporters'
import { computeBenchmarks, overallGrade } from './lib/benchmarks'
import { generateKaizenSuggestions } from './lib/copilot'
import { exportHtmlReport } from './lib/report'
import { computeSpaghettiSummary, computeTransportAudit } from './lib/spaghetti'
import { SHEET } from './lib/geometry'
import { VsmCanvas } from './components/vsm/Canvas'
import { Toolbox } from './components/vsm/Toolbox'
import { Inspector } from './components/vsm/Inspector'
import { StationAnalysisView } from './components/vsm/StationAnalysis'
import { SpaghettiStudio, FLOOR } from './components/spaghetti/SpaghettiStudio'
import { AnalyticsView } from './components/analytics/AnalyticsView'
import { BenchmarkView } from './components/benchmarks/BenchmarkView'
import { HelpModal } from './components/HelpModal'
import { CalibrationModal } from './components/CalibrationModal'

const TABS: { id: AppTab; labelKey: StringKey; icon: typeof Waypoints }[] = [
  { id: 'vsm', labelKey: 'tab.vsm', icon: Waypoints },
  { id: 'station', labelKey: 'tab.station', icon: Gauge },
  { id: 'spaghetti', labelKey: 'tab.spaghetti', icon: MapIcon },
  { id: 'analytics', labelKey: 'tab.analytics', icon: FlaskConical },
  { id: 'benchmarks', labelKey: 'tab.benchmarks', icon: BarChart3 },
]

export default function App() {
  const { t } = useT()
  const tab = useApp((s) => s.tab)
  const setTab = useApp((s) => s.setTab)
  const projectName = useApp((s) => s.projectName)
  const nodes = useApp((s) => s.nodes)
  const demand = useApp((s) => s.demand)
  const calibration = useApp((s) => s.calibration)
  const past = useApp((s) => s.past)
  const future = useApp((s) => s.future)

  const metrics = useSystemMetrics()
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
        s.cancelDraftPoly()
        s.setTool('select')
      } else if (e.key === 'Enter' && s.tab === 'spaghetti') {
        if (s.draftRoute.length >= 2) s.finishDraftRoute()
        if (s.draftPoly.length >= 3) s.finishDraftPoly()
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
        {tab === 'station' && <StationAnalysisView />}
        {tab === 'spaghetti' && <SpaghettiStudio svgRef={floorSvgRef} />}
        {tab === 'analytics' && <AnalyticsView />}
        {tab === 'benchmarks' && <BenchmarkView />}
      </main>
      <footer className="flex items-center justify-between border-t border-edge bg-panel px-3 py-1 text-[10px] text-slate-600">
        <span className="font-mono">{projectName} · {t('footer.autosaved')}</span>
        <span>{t('footer.tagline')}</span>
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
  const { lang, t } = useT()
  const [exportOpen, setExportOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [calibrationOpen, setCalibrationOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const doExport = (what: 'report' | 'json' | 'csv' | 'csv-floor' | 'csv-bench' | 'svg' | 'png') => {
    const s = useApp.getState()
    const name = s.projectName.replace(/\s+/g, '_')
    const circuits = circuitSecondsByNode(s.spaghetti, s.demand.shiftsPerDay, s.calibration)
    if (what === 'report') {
      const metrics = computeSystemMetrics(s.nodes, s.demand, s.calibration, circuits)
      const benchmarks = computeBenchmarks(metrics, s.calibration)
      exportHtmlReport({
        project: s.snapshot(),
        metrics,
        benchmarks,
        grade: overallGrade(benchmarks),
        spaghetti: computeSpaghettiSummary(s.spaghetti, s.demand.shiftsPerDay, s.demand.daysPerYear, s.calibration),
        transport: computeTransportAudit(s.spaghetti, s.demand.unitsPerDay / Math.max(1, s.demand.shiftsPerDay), s.calibration),
        suggestions: generateKaizenSuggestions(s.nodes, s.demand, metrics, s.calibration),
        calibration: s.calibration,
      })
    }
    if (what === 'json') exportProjectJson(s.snapshot())
    if (what === 'csv') exportMetricsCsv(name, computeSystemMetrics(s.nodes, s.demand, s.calibration, circuits))
    if (what === 'csv-floor')
      exportSpaghettiCsv(name, computeSpaghettiSummary(s.spaghetti, s.demand.shiftsPerDay, s.demand.daysPerYear, s.calibration))
    if (what === 'csv-bench') {
      const rows = computeBenchmarks(computeSystemMetrics(s.nodes, s.demand, s.calibration, circuits), s.calibration)
      exportBenchmarksCsv(name, rows, overallGrade(rows))
    }
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

      <ScenarioSwitcher />

      {/* Tabs */}
      <nav className="ml-2 flex rounded-lg border border-edge p-0.5">
        {TABS.map((tabDef) => {
          const Icon = tabDef.icon
          const active = tab === tabDef.id
          return (
            <button
              key={tabDef.id}
              className={`relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${
                active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setTab(tabDef.id)}
            >
              {active && (
                <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-md bg-edge/70"
                  transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }} />
              )}
              <Icon size={13} className={`relative ${active ? 'text-flow' : ''}`} />
              <span className="relative font-display">{t(tabDef.labelKey)}</span>
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
        <IconBtn title={t('topbar.undo')} disabled={!canUndo} onClick={() => useApp.getState().undo()}><Undo2 size={14} /></IconBtn>
        <IconBtn title={t('topbar.redo')} disabled={!canRedo} onClick={() => useApp.getState().redo()}><Redo2 size={14} /></IconBtn>
        <IconBtn title={t('topbar.new')} onClick={() => { if (confirm(t('confirm.new'))) useApp.getState().newProject() }}>
          <FilePlus2 size={14} />
        </IconBtn>
        <IconBtn title={t('topbar.demo')} onClick={() => { if (confirm(t('confirm.demo'))) useApp.getState().loadDemo() }}>
          <FlaskConical size={14} />
        </IconBtn>
        <IconBtn title={t('topbar.import')} onClick={() => fileRef.current?.click()}><FolderOpen size={14} /></IconBtn>
        <IconBtn title={t('topbar.calibration')} onClick={() => setCalibrationOpen(true)}>
          <SlidersHorizontal size={14} />
        </IconBtn>
        <IconBtn title={t('topbar.help')} onClick={() => setHelpOpen(true)}><BookOpen size={14} /></IconBtn>
        <button
          className="rounded-md border border-edge px-1.5 py-1 font-mono text-[10px] text-slate-400 transition-colors hover:border-steel hover:text-white"
          title={t('topbar.language')}
          onClick={() => {
            const st = useApp.getState()
            st.setCalibration({ ...st.calibration, language: lang === 'fr' ? 'en' : 'fr' })
          }}
        >
          {lang === 'fr' ? 'FR' : 'EN'}
        </button>
        <CalibrationModal open={calibrationOpen} onClose={() => setCalibrationOpen(false)} />
        <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
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
            <Download size={13} /> {t('topbar.export')}
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
                    ['report', t('export.report'), t('export.report.hint')],
                    ['json', t('export.json'), t('export.json.hint')],
                    ['csv', t('export.csv'), t('export.csv.hint')],
                    ['csv-floor', t('export.csvFloor'), t('export.csvFloor.hint')],
                    ['csv-bench', t('export.csvBench'), t('export.csvBench.hint')],
                    ['svg', tab === 'spaghetti' ? t('export.svgFloor') : t('export.svgVsm'), t('export.svg.hint')],
                    ['png', tab === 'spaghetti' ? t('export.pngFloor') : t('export.pngVsm'), t('export.png.hint')],
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

/** Top-bar pull-down to flip the whole app between the working model and saved scenarios. */
function ScenarioSwitcher() {
  const { t } = useT()
  const scenarios = useApp((s) => s.scenarios)
  const activeScenarioId = useApp((s) => s.activeScenarioId)
  if (scenarios.length === 0) return null
  return (
    <select
      className="ml-2 max-w-[180px] rounded-md border border-edge bg-ink px-2 py-1.5 font-display text-xs text-slate-300
        hover:border-steel focus:border-flow/60 focus:outline-none transition-colors"
      title={t('topbar.scenarioPick')}
      value={activeScenarioId ?? ''}
      onChange={(e) => useApp.getState().switchScenario(e.target.value || null)}
    >
      <option value="">{t('topbar.workingModel')}</option>
      {scenarios.map((sc) => (
        <option key={sc.id} value={sc.id}>◆ {sc.name}</option>
      ))}
    </select>
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
