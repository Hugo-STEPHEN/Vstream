import type {
  BenchmarkKey,
  CalibrationConfig,
  TransportMode,
  TransportProfile,
} from '../types'

/**
 * Factory defaults for every tunable assumption. A project file may carry a
 * partial (or no) calibration block — mergeCalibration() always yields a
 * complete config, so the engines never see a missing knob.
 */
export const DEFAULT_CALIBRATION: CalibrationConfig = {
  currency: '$',
  stepMeters: 0.75,
  alerts: {
    smedFactor: 0.5,
    scrapWarn: 0.05,
    availabilityWarn: 0.7,
    inventoryDaysWarn: 5,
    pceLowPct: 5,
  },
  transport: {
    walk: { costPerMeter: 0.15, speedMps: 1.2 },
    forklift: { costPerMeter: 1.2, speedMps: 3.0 },
    agv: { costPerMeter: 0.4, speedMps: 1.7 },
  },
  benchmarks: {
    pce: { typical: 2, worldClass: 25 },
    availability: { typical: 75, worldClass: 90 },
    fpy: { typical: 90, worldClass: 99 },
    inventory: { typical: 15, worldClass: 2 },
    setup: { typical: 20, worldClass: 5 },
    capacity: { typical: 100, worldClass: 120 },
  },
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

/** Fill any missing knob with its factory default (tolerates old/partial files). */
export function mergeCalibration(partial?: DeepPartial<CalibrationConfig>): CalibrationConfig {
  const d = DEFAULT_CALIBRATION
  const modes: TransportMode[] = ['walk', 'forklift', 'agv']
  const keys: BenchmarkKey[] = ['pce', 'availability', 'fpy', 'inventory', 'setup', 'capacity']
  return {
    currency: partial?.currency ?? d.currency,
    stepMeters: partial?.stepMeters ?? d.stepMeters,
    alerts: { ...d.alerts, ...partial?.alerts },
    transport: Object.fromEntries(
      modes.map((m) => [m, { ...d.transport[m], ...partial?.transport?.[m] }]),
    ) as Record<TransportMode, typeof d.transport.walk>,
    benchmarks: Object.fromEntries(
      keys.map((k) => [k, { ...d.benchmarks[k], ...partial?.benchmarks?.[k] }]),
    ) as Record<BenchmarkKey, typeof d.benchmarks.pce>,
  }
}

/** Built-in presentation of the transport modes (numbers come from calibration). */
const TRANSPORT_PRESENTATION: Record<TransportMode, { label: string; color: string }> = {
  walk: { label: 'Manual walk', color: '#FBBF24' },
  forklift: { label: 'Forklift carrier', color: '#F87171' },
  agv: { label: 'AGV routing', color: '#22D3EE' },
}

/** Full display profiles: built-in label/color + calibrated cost/speed. */
export function transportProfiles(cal: CalibrationConfig): Record<TransportMode, TransportProfile> {
  const modes: TransportMode[] = ['walk', 'forklift', 'agv']
  return Object.fromEntries(
    modes.map((m) => [
      m,
      { mode: m, ...TRANSPORT_PRESENTATION[m], ...cal.transport[m] },
    ]),
  ) as Record<TransportMode, TransportProfile>
}
