import { useMemo } from 'react'
import {
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend,
} from 'recharts'
import { useApp } from '../../store'
import { BENCHMARK_META, computeBenchmarks, overallGrade } from '../../lib/benchmarks'
import { useSystemMetrics } from '../../lib/useMetrics'
import { Section } from '../ui'
import { useT } from '../../i18n'

export function BenchmarkView() {
  const { lang, t } = useT()
  const nodes = useApp((s) => s.nodes)
  const demand = useApp((s) => s.demand)
  const calibration = useApp((s) => s.calibration)
  const metrics = useSystemMetrics()
  const rows = useMemo(() => computeBenchmarks(metrics, calibration), [metrics, calibration])
  const grade = overallGrade(rows)

  const wc = t('bench.worldClass')
  const radarData = rows.map((r) => ({
    metric: BENCHMARK_META[r.key].short[lang],
    [t('bench.currentPlant')]: Math.round(r.score),
    [wc]: 100,
  }))

  const gradeColor =
    grade.grade === 'A' ? '#34D399' : grade.grade === 'B' ? '#22D3EE' : grade.grade === 'C' ? '#FBBF24' : '#F87171'

  return (
    <div className="grid h-full grid-cols-1 gap-2 overflow-y-auto p-2 xl:grid-cols-[420px_1fr]">
      <div className="space-y-2">
        <Section title={t('bench.grade')}>
          <div className="flex items-center gap-4 py-2">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-xl border-2 font-display text-5xl font-bold"
              style={{ borderColor: gradeColor, color: gradeColor, boxShadow: `0 0 24px ${gradeColor}33` }}
            >
              {grade.grade}
            </div>
            <div>
              <div className="font-mono text-2xl text-slate-100">{grade.score.toFixed(0)}<span className="text-sm text-slate-500"> / 100</span></div>
              <div className="text-[11px] leading-snug text-slate-500">{t('bench.gradeDesc')}</div>
            </div>
          </div>
        </Section>

        <Section title={t('bench.radar')}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="#1E293B" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'Inter' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name={wc} dataKey={wc} stroke="#334155" fill="#334155" fillOpacity={0.12} />
                <Radar name={t('bench.currentPlant')} dataKey={t('bench.currentPlant')} stroke="#22D3EE" fill="#22D3EE" fillOpacity={0.32} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <Section title={t('bench.detail')}>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="text-left text-slate-500">
                {[t('bench.thMetric'), t('bench.thCurrent'), t('bench.thTypical'), t('bench.thWorldClass'), t('bench.thPosition')].map((h) => (
                  <th key={h} className="pb-2 pr-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const color = r.score >= 70 ? '#34D399' : r.score >= 40 ? '#FBBF24' : '#F87171'
                return (
                  <tr key={r.key} className="border-t border-edge/60 align-top">
                    <td className="py-2.5 pr-3">
                      <div className="text-slate-200">{r.metric}</div>
                      <div className="max-w-[340px] text-[10px] leading-snug text-slate-500">{r.comment}</div>
                    </td>
                    <td className="py-2.5 pr-3 font-mono" style={{ color }}>
                      {fmtVal(r.current, r.unit)}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-slate-500">{fmtVal(r.typical, r.unit)}</td>
                    <td className="py-2.5 pr-3 font-mono text-slate-300">{fmtVal(r.worldClass, r.unit)}</td>
                    <td className="py-2.5 w-44">
                      <div className="h-2 w-40 overflow-hidden rounded bg-edge">
                        <div className="h-full rounded transition-all" style={{ width: `${r.score}%`, background: color }} />
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-slate-500">{Math.round(r.score)} / 100</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10.5px] text-slate-500">{t('bench.note')}</p>
      </Section>
    </div>
  )
}

function fmtVal(v: number, unit: string): string {
  const n = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)
  return `${n} ${unit}`
}
