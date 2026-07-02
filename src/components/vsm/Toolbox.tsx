import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, MousePointer2, Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { PALETTE, type PaletteEntry } from '../../data/palette'
import { fuzzyFilter } from '../../lib/fuzzy'
import { useApp } from '../../store'
import { useT } from '../../i18n'
import { NodeGlyph } from './NodeGlyph'
import { sheetLayout } from '../../lib/geometry'
import type { EdgeKind } from '../../types'

const EDGE_TOOLS: { kind: EdgeKind; label: string; hint: string }[] = [
  { kind: 'push', label: 'Push', hint: 'Scheduled material transfer (striped arrow)' },
  { kind: 'pull', label: 'Pull', hint: 'Withdrawal loop driven by downstream consumption' },
  { kind: 'manualInfo', label: 'Info', hint: 'Manual / paper information flow' },
  { kind: 'electronicInfo', label: 'EDI', hint: 'Electronic information transmission' },
]

export function Toolbox() {
  const { t } = useT()
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<'simple' | 'full'>('simple')
  const [query, setQuery] = useState('')
  const tool = useApp((s) => s.tool)
  const edgeKind = useApp((s) => s.edgeKind)
  const setTool = useApp((s) => s.setTool)

  const entries = useMemo(() => {
    const base = tab === 'simple' && !query.trim() ? PALETTE.filter((p) => p.simple) : PALETTE
    return fuzzyFilter(query, base, (p) => `${p.label} ${p.keywords} ${p.category}`)
  }, [tab, query])

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteEntry[]>()
    for (const e of entries) {
      const list = map.get(e.category) ?? []
      list.push(e)
      map.set(e.category, list)
    }
    return [...map.entries()]
  }, [entries])

  return (
    <div className="relative flex h-full">
      <AnimatePresence initial={false}>
        {open && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 252, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="h-full overflow-hidden border-r border-edge bg-panel"
          >
            <div className="flex h-full w-[252px] flex-col">
              {/* Tool modes */}
              <div className="flex gap-1 p-2 border-b border-edge">
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs border transition-colors ${
                    tool === 'select' ? 'border-flow/60 text-flow bg-flow/10' : 'border-edge text-slate-400 hover:text-white'
                  }`}
                  onClick={() => setTool('select')}
                  title="Select & move (V)"
                >
                  <MousePointer2 size={13} /> {t('toolbox.select')}
                </button>
                {EDGE_TOOLS.map((et) => (
                  <button
                    key={et.kind}
                    className={`flex-1 rounded-md px-1 py-1.5 text-[11px] font-mono border transition-colors ${
                      tool === 'connect' && edgeKind === et.kind
                        ? 'border-pull/60 text-pull bg-pull/10'
                        : 'border-edge text-slate-400 hover:text-white'
                    }`}
                    onClick={() => setTool('connect', et.kind)}
                    title={et.hint}
                  >
                    {et.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="p-2 border-b border-edge">
                <div className="relative">
                  <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('toolbox.search')}
                    className="w-full bg-ink border border-edge rounded-md pl-7 pr-7 py-1.5 text-xs text-slate-200
                      focus:outline-none focus:border-flow/70 transition-colors"
                  />
                  {query && (
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white" onClick={() => setQuery('')}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="mt-2 flex rounded-md border border-edge overflow-hidden">
                  {(['simple', 'full'] as const).map((mode) => (
                    <button
                      key={mode}
                      className={`flex-1 py-1 text-[11px] font-display uppercase tracking-wider transition-colors ${
                        tab === mode ? 'bg-edge/60 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                      onClick={() => setTab(mode)}
                    >
                      {mode === 'simple' ? t('toolbox.simple') : t('toolbox.full')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Element grid */}
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {grouped.length === 0 && (
                  <p className="text-xs text-slate-500 px-1 pt-2">{t('toolbox.noMatch')} “{query}”.</p>
                )}
                {grouped.map(([category, items]) => (
                  <div key={category}>
                    <div className="field-label px-1 pb-1.5">{category}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {items.map((entry) => (
                        <PaletteItem key={entry.kind} entry={entry} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-edge p-2 text-[10px] text-slate-500 leading-relaxed">
                {t('toolbox.hint')}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <button
        className="absolute -right-5 top-1/2 z-10 flex h-10 w-5 -translate-y-1/2 items-center justify-center
          rounded-r-md border border-l-0 border-edge bg-panel text-slate-400 hover:text-flow transition-colors"
        onClick={() => setOpen((o) => !o)}
        title={open ? 'Collapse toolbox' : 'Expand toolbox'}
      >
        {open ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
      </button>
    </div>
  )
}

function PaletteItem({ entry }: { entry: PaletteEntry }) {
  const addNode = useApp((s) => s.addNode)
  const prefs = useApp((s) => s.prefs)
  const place = () => {
    const sheet = sheetLayout(prefs.laneInfoH, prefs.laneMaterialH)
    const band = entry.lane === 'information' ? sheet.info : sheet.material
    addNode(
      entry.kind,
      300 + Math.random() * 500,
      (band.top + band.bottom) / 2 + (Math.random() - 0.5) * 60,
    )
  }
  return (
    <button
      draggable
      onDragStart={(e) => e.dataTransfer.setData('vstream/node-kind', entry.kind)}
      onClick={place}
      className="group flex flex-col items-center gap-1 rounded-md border border-edge bg-ink px-1 py-2
        hover:border-flow/50 hover:shadow-[0_0_12px_rgba(34,211,238,0.12)] hover:scale-[1.04] active:scale-[0.97]
        transition-all cursor-grab"
      title={`${entry.label} — drag to canvas`}
    >
      <svg viewBox="-60 -42 120 84" className="h-9 w-16 text-titanium group-hover:text-flow transition-colors">
        <NodeGlyph kind={entry.kind} />
      </svg>
      <span className="text-[10px] leading-tight text-slate-400 group-hover:text-slate-200 text-center transition-colors">
        {entry.label}
      </span>
      <span className={`text-[8px] font-mono uppercase ${entry.lane === 'information' ? 'text-info/70' : 'text-flow/60'}`}>
        {entry.lane}
      </span>
    </button>
  )
}
