import { useMemo, useState } from 'react'
import { BookOpen, Download, Keyboard, Search, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { DEFINITIONS, DEFINITION_CATEGORIES } from '../data/definitions'
import { exportDefinitionsCsv } from '../lib/exporters'
import { fuzzyFilter } from '../lib/fuzzy'

const SHORTCUTS: [string, string][] = [
  ['V', 'Select & move tool (VSM)'],
  ['Del / Backspace', 'Delete selected node, connection, zone or route'],
  ['Esc', 'Cancel connection / draft route, back to select'],
  ['Enter', 'Commit the draft route (Spaghetti)'],
  ['Ctrl+Z / Ctrl+Shift+Z', 'Undo / redo'],
  ['Mouse wheel', 'Zoom the VSM sheet (cursor-centered)'],
  ['Drag background', 'Pan the VSM sheet'],
]

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => fuzzyFilter(query, DEFINITIONS, (d) => `${d.term} ${d.category} ${d.definition}`),
    [query],
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 8 }}
            transition={{ duration: 0.15 }}
            className="flex max-h-full w-full max-w-3xl flex-col rounded-xl border border-edge bg-panel shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-2 border-b border-edge px-4 py-3">
              <BookOpen size={16} className="text-flow" />
              <h2 className="font-display text-sm font-semibold text-white">Need definitions & formulas</h2>
              <button
                className="btn-ghost ml-auto flex items-center gap-1.5"
                onClick={exportDefinitionsCsv}
                title="Download the full data dictionary as CSV"
              >
                <Download size={12} /> Data dictionary (.csv)
              </button>
              <button className="rounded-md p-1.5 text-slate-400 hover:text-white transition-colors" onClick={onClose} title="Close (Esc)">
                <X size={16} />
              </button>
            </header>

            <div className="border-b border-edge p-3">
              <div className="relative">
                <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a term… (takt, PCE, setup penalty)"
                  className="w-full rounded-md border border-edge bg-ink py-1.5 pl-7 pr-2 text-xs text-slate-200
                    focus:border-flow/70 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {DEFINITION_CATEGORIES.map((cat) => {
                const items = filtered.filter((d) => d.category === cat)
                if (items.length === 0) return null
                return (
                  <section key={cat}>
                    <h3 className="field-label pb-1.5">{cat}</h3>
                    <div className="overflow-hidden rounded-lg border border-edge">
                      {items.map((d, i) => (
                        <div key={d.term} className={`grid grid-cols-[170px_1fr] gap-3 px-3 py-2 ${i > 0 ? 'border-t border-edge/60' : ''}`}>
                          <div>
                            <div className="text-[11.5px] font-medium text-slate-200">{d.term}</div>
                            <div className="font-mono text-[10px] text-flow/80">{d.formula}</div>
                            {d.unit !== '—' && <div className="font-mono text-[9.5px] text-slate-500">{d.unit}</div>}
                          </div>
                          <p className="text-[11px] leading-relaxed text-slate-400">{d.definition}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-xs text-slate-500">No definition matches “{query}”.</p>
              )}

              {!query && (
                <section>
                  <h3 className="field-label flex items-center gap-1.5 pb-1.5">
                    <Keyboard size={12} /> Keyboard shortcuts
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-edge">
                    {SHORTCUTS.map(([key, what], i) => (
                      <div key={key} className={`flex items-center gap-3 px-3 py-1.5 ${i > 0 ? 'border-t border-edge/60' : ''}`}>
                        <kbd className="rounded border border-edge bg-ink px-1.5 py-0.5 font-mono text-[10px] text-flow">{key}</kbd>
                        <span className="text-[11px] text-slate-400">{what}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
