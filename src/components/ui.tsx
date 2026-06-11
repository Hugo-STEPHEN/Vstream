import { type ReactNode } from 'react'

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="panel p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[11px] uppercase tracking-[0.14em] text-slate-400">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  /** Render a slider underneath for tactile what-if sweeps. */
  slider?: boolean
}

export function NumberField({ label, value, onChange, min = 0, max, step = 1, unit, slider }: NumberFieldProps) {
  const clamp = (v: number): number => {
    if (Number.isNaN(v)) return min
    let out = Math.max(min, v)
    if (max !== undefined) out = Math.min(max, out)
    return out
  }
  return (
    <label className="block space-y-1">
      <span className="field-label flex justify-between">
        <span>{label}</span>
        {unit ? <span className="text-slate-500 normal-case tracking-normal">{unit}</span> : null}
      </span>
      <input
        type="number"
        className="w-full bg-ink border border-edge rounded-md px-2 py-1.5 font-mono text-sm text-slate-100
          focus:outline-none focus:border-flow/70 focus:ring-1 focus:ring-flow/30 transition-colors"
        value={Number.isFinite(value) ? Math.round(value * 1000) / 1000 : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clamp(e.target.valueAsNumber))}
      />
      {slider && max !== undefined ? (
        <input
          type="range"
          className="w-full h-1.5 cursor-pointer"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(clamp(e.target.valueAsNumber))}
        />
      ) : null}
    </label>
  )
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="field-label">{label}</span>
      <input
        type="text"
        className="w-full bg-ink border border-edge rounded-md px-2 py-1.5 text-sm text-slate-100
          focus:outline-none focus:border-flow/70 focus:ring-1 focus:ring-flow/30 transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function Stat({ label, value, tone = 'default', sub }: {
  label: string
  value: string
  tone?: 'default' | 'good' | 'warn' | 'crit' | 'flow'
  sub?: string
}) {
  const tones = {
    default: 'text-slate-100',
    good: 'text-pull',
    warn: 'text-warn',
    crit: 'text-crit',
    flow: 'text-flow',
  } as const
  return (
    <div className="panel px-3 py-2 min-w-[108px]">
      <div className="field-label">{label}</div>
      <div className={`font-mono text-lg leading-tight ${tones[tone]}`}>{value}</div>
      {sub ? <div className="text-[10px] text-slate-500 font-mono">{sub}</div> : null}
    </div>
  )
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'warn' | 'crit' | 'good' | 'flow' }) {
  const tones = {
    default: 'border-edge text-slate-300',
    warn: 'border-warn/50 text-warn bg-warn/10',
    crit: 'border-crit/50 text-crit bg-crit/10',
    good: 'border-pull/50 text-pull bg-pull/10',
    flow: 'border-flow/50 text-flow bg-flow/10',
  } as const
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono ${tones[tone]}`}>
      {children}
    </span>
  )
}
