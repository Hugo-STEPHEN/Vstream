import { RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useApp } from '../store'
import { DEFAULT_CALIBRATION, transportProfiles } from '../lib/calibration'
import { NumberField, TextField } from './ui'
import { useT } from '../i18n'
import type { BenchmarkKey, CalibrationConfig, TransportMode } from '../types'

const BENCHMARK_LABELS: Record<BenchmarkKey, { label: string; unit: string }> = {
  pce: { label: 'Process cycle efficiency', unit: '%' },
  availability: { label: 'Average availability (OEE-A)', unit: '%' },
  fpy: { label: 'First pass yield', unit: '%' },
  inventory: { label: 'Inventory coverage', unit: 'days' },
  setup: { label: 'Setup share of processing', unit: '%' },
  capacity: { label: 'Capacity vs demand', unit: '%' },
}

/**
 * Every model assumption in one place: alert thresholds, transport economics,
 * benchmark reference bands, currency and step length. Saved with the project,
 * applied through every engine, undoable like any other edit.
 */
export function CalibrationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT()
  const cal = useApp((s) => s.calibration)
  const setCalibration = useApp((s) => s.setCalibration)

  const patch = (p: Partial<CalibrationConfig>) => setCalibration({ ...cal, ...p })

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
              <SlidersHorizontal size={16} className="text-flow" />
              <h2 className="font-display text-sm font-semibold text-white">{t('cal.title')}</h2>
              <span className="text-[10px] text-slate-500">{t('cal.subtitle')}</span>
              <button
                className="btn-ghost ml-auto flex items-center gap-1.5"
                onClick={() => useApp.getState().resetCalibration()}
                title="Restore every assumption to factory defaults"
              >
                <RotateCcw size={12} /> {t('cal.reset')}
              </button>
              <button className="rounded-md p-1.5 text-slate-400 hover:text-white transition-colors" onClick={onClose} title="Close">
                <X size={16} />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
              {/* Units */}
              <section>
                <h3 className="field-label pb-2">{t('cal.units')}</h3>
                <div className="grid grid-cols-3 gap-2">
                  <label className="block space-y-1">
                    <span className="field-label">{t('cal.language')}</span>
                    <select
                      className="select-mini w-full !py-1.5"
                      value={cal.language}
                      onChange={(e) => patch({ language: e.target.value === 'fr' ? 'fr' : 'en' })}
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                    </select>
                  </label>
                  <TextField label={t('cal.currency')} value={cal.currency}
                    onChange={(currency) => patch({ currency: currency.slice(0, 4) || '$' })} />
                  <NumberField label={t('cal.step')} unit="m" value={cal.stepMeters} min={0.3} max={1.2} step={0.05}
                    onChange={(stepMeters) => patch({ stepMeters })} />
                </div>
              </section>

              {/* Alert thresholds */}
              <section>
                <h3 className="field-label pb-2">{t('cal.alerts')}</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <NumberField label="SMED flag above" unit="× CT nominal" value={cal.alerts.smedFactor} min={0.05} max={2} step={0.05}
                    onChange={(smedFactor) => patch({ alerts: { ...cal.alerts, smedFactor } })} />
                  <NumberField label="Scrap warning at" unit="%" value={Math.round(cal.alerts.scrapWarn * 100)} min={1} max={50} step={1}
                    onChange={(v) => patch({ alerts: { ...cal.alerts, scrapWarn: v / 100 } })} />
                  <NumberField label="Availability warning below" unit="%" value={Math.round(cal.alerts.availabilityWarn * 100)} min={10} max={100} step={1}
                    onChange={(v) => patch({ alerts: { ...cal.alerts, availabilityWarn: v / 100 } })} />
                  <NumberField label="Inventory note above" unit="days" value={cal.alerts.inventoryDaysWarn} min={0.5} max={60} step={0.5}
                    onChange={(inventoryDaysWarn) => patch({ alerts: { ...cal.alerts, inventoryDaysWarn } })} />
                  <NumberField label="Low-PCE note below" unit="%" value={cal.alerts.pceLowPct} min={1} max={30} step={0.5}
                    onChange={(pceLowPct) => patch({ alerts: { ...cal.alerts, pceLowPct } })} />
                </div>
                <p className="pt-1 text-[10px] text-slate-500">
                  The over-takt flag is structural (CT grand &gt; takt) and cannot be tuned away.
                </p>
              </section>

              {/* Transport modes */}
              <section>
                <h3 className="field-label pb-2">{t('cal.transport')}</h3>
                <div className="space-y-2">
                  {(Object.keys(cal.transport) as TransportMode[]).map((m) => {
                    const display = transportProfiles(cal)[m]
                    return (
                      <div key={m} className="grid grid-cols-[120px_1fr_1fr] items-end gap-2 rounded-md border border-edge bg-ink p-2">
                        <span className="pb-1.5 text-xs" style={{ color: display.color }}>● {display.label}</span>
                        <NumberField label="Cost" unit={`${cal.currency}/m`} value={cal.transport[m].costPerMeter} min={0} max={20} step={0.05}
                          onChange={(costPerMeter) =>
                            patch({ transport: { ...cal.transport, [m]: { ...cal.transport[m], costPerMeter } } })} />
                        <NumberField label="Speed" unit="m/s" value={cal.transport[m].speedMps} min={0.1} max={15} step={0.1}
                          onChange={(speedMps) =>
                            patch({ transport: { ...cal.transport, [m]: { ...cal.transport[m], speedMps } } })} />
                      </div>
                    )
                  })}
                </div>
                <p className="pt-1 text-[10px] text-slate-500">
                  Calibrate to your plant's loaded rates (driver wage + asset depreciation + energy per meter).
                  Every route cost, ROI figure and transport audit re-computes instantly.
                </p>
              </section>

              {/* Benchmark references */}
              <section>
                <h3 className="field-label pb-2">{t('cal.bench')}</h3>
                <div className="overflow-hidden rounded-lg border border-edge">
                  <div className="grid grid-cols-[1fr_110px_110px] gap-2 border-b border-edge bg-ink px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500">
                    <span>Metric</span><span>Typical (score 0)</span><span>World class (100)</span>
                  </div>
                  {(Object.keys(BENCHMARK_LABELS) as BenchmarkKey[]).map((k) => (
                    <div key={k} className="grid grid-cols-[1fr_110px_110px] items-center gap-2 border-b border-edge/60 px-3 py-1.5 last:border-b-0">
                      <span className="text-[11px] text-slate-300">
                        {BENCHMARK_LABELS[k].label}
                        <span className="ml-1 font-mono text-[9px] text-slate-500">{BENCHMARK_LABELS[k].unit}</span>
                      </span>
                      {(['typical', 'worldClass'] as const).map((side) => (
                        <input
                          key={side}
                          type="number"
                          className="w-full rounded-md border border-edge bg-ink px-2 py-1 font-mono text-xs text-slate-100
                            focus:border-flow/70 focus:outline-none transition-colors"
                          value={cal.benchmarks[k][side]}
                          step={k === 'inventory' ? 0.5 : 1}
                          onChange={(e) => {
                            const v = e.target.valueAsNumber
                            if (Number.isNaN(v)) return
                            patch({ benchmarks: { ...cal.benchmarks, [k]: { ...cal.benchmarks[k], [side]: v } } })
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <p className="pt-1 text-[10px] text-slate-500">
                  Defaults are discrete-manufacturing rules of thumb (Rother &amp; Shook PCE bands, ~90% world-class
                  availability). Calibrate them to your sector — process industry, food, electronics — and the
                  radar, scores and grade follow. Factory defaults: PCE {DEFAULT_CALIBRATION.benchmarks.pce.typical}→
                  {DEFAULT_CALIBRATION.benchmarks.pce.worldClass}%.
                </p>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
