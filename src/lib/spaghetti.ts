import { DEFAULT_CALIBRATION, transportProfiles } from './calibration'
import type { CalibrationConfig, RouteMetrics, SpaghettiState, TransportMode, TransportProfile, TravelRoute } from '../types'

/** Factory-default display profiles; pass a calibration for project-tuned ones. */
export const TRANSPORT_PROFILES: Record<TransportMode, TransportProfile> =
  transportProfiles(DEFAULT_CALIBRATION)

export function polylineLength(points: { x: number; y: number }[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    len += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return len
}

export function computeRouteMetrics(
  route: TravelRoute,
  metersPerUnit: number,
  shiftsPerDay: number,
  daysPerYear: number,
  cal: CalibrationConfig = DEFAULT_CALIBRATION,
): RouteMetrics {
  const profile = transportProfiles(cal)[route.mode]
  // A trip covers the route out and back.
  const metersOneWay = polylineLength(route.points) * metersPerUnit
  const metersPerShift = metersOneWay * 2 * Math.max(0, route.tripsPerShift)
  const costPerShift = metersPerShift * profile.costPerMeter
  return {
    routeId: route.id,
    name: route.name,
    mode: route.mode,
    meters: metersOneWay,
    steps: route.mode === 'walk' ? Math.round(metersOneWay / Math.max(0.1, cal.stepMeters)) : 0,
    minutesPerShift: profile.speedMps > 0 ? metersPerShift / profile.speedMps / 60 : 0,
    costPerShift,
    costPerYear: costPerShift * shiftsPerDay * daysPerYear,
    linkedNodeId: route.linkedNodeId,
  }
}

// ---------------------------------------------------------------------------
// VSM ↔ spaghetti transport audit
// ---------------------------------------------------------------------------

export interface TransportAuditRow {
  routeId: string
  routeName: string
  nodeId: string
  mode: TransportMode
  /** Conveyance seconds each produced part carries on this route. */
  secondsPerPart: number
  costPerPart: number
}

export interface TransportAudit {
  rows: TransportAuditRow[]
  totalSecondsPerPart: number
  totalCostPerPart: number
}

/**
 * For every route linked to a VSM station, allocate its travel time and cost
 * over the parts produced per shift — transport waste expressed per part,
 * directly comparable to a station's cycle time.
 */
export function computeTransportAudit(
  state: SpaghettiState,
  partsPerShift: number,
  cal: CalibrationConfig = DEFAULT_CALIBRATION,
): TransportAudit {
  const rows: TransportAuditRow[] = []
  const profiles = transportProfiles(cal)
  if (partsPerShift > 0) {
    for (const route of state.routes) {
      if (!route.linkedNodeId) continue
      const profile = profiles[route.mode]
      const metersPerShift = polylineLength(route.points) * state.metersPerUnit * 2 * Math.max(0, route.tripsPerShift)
      rows.push({
        routeId: route.id,
        routeName: route.name,
        nodeId: route.linkedNodeId,
        mode: route.mode,
        secondsPerPart: metersPerShift / profile.speedMps / partsPerShift,
        costPerPart: (metersPerShift * profile.costPerMeter) / partsPerShift,
      })
    }
  }
  return {
    rows,
    totalSecondsPerPart: rows.reduce((s, r) => s + r.secondsPerPart, 0),
    totalCostPerPart: rows.reduce((s, r) => s + r.costPerPart, 0),
  }
}

export interface SpaghettiSummary {
  routes: RouteMetrics[]
  totalMetersPerShift: number
  totalCostPerShift: number
  totalCostPerYear: number
  totalMinutesPerShift: number
  /** Annual saving if every route ran on its cheapest viable mode. */
  bestModeSavingPerYear: number
}

export function computeSpaghettiSummary(
  state: SpaghettiState,
  shiftsPerDay: number,
  daysPerYear: number,
  cal: CalibrationConfig = DEFAULT_CALIBRATION,
): SpaghettiSummary {
  const pairs = state.routes.map((route) => ({
    route,
    metrics: computeRouteMetrics(route, state.metersPerUnit, shiftsPerDay, daysPerYear, cal),
  }))
  const cheapest = Math.min(...Object.values(transportProfiles(cal)).map((p) => p.costPerMeter))
  const bestModeSavingPerYear = pairs.reduce((s, { route, metrics }) => {
    const bestCost = metrics.meters * 2 * route.tripsPerShift * cheapest * shiftsPerDay * daysPerYear
    return s + Math.max(0, metrics.costPerYear - bestCost)
  }, 0)
  return {
    routes: pairs.map((p) => p.metrics),
    totalMetersPerShift: pairs.reduce((s, p) => s + p.metrics.meters * 2 * p.route.tripsPerShift, 0),
    totalCostPerShift: pairs.reduce((s, p) => s + p.metrics.costPerShift, 0),
    totalCostPerYear: pairs.reduce((s, p) => s + p.metrics.costPerYear, 0),
    totalMinutesPerShift: pairs.reduce((s, p) => s + p.metrics.minutesPerShift, 0),
    bestModeSavingPerYear,
  }
}

export function fmtMoney(v: number, currency = '$'): string {
  if (!Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1_000_000) return `${currency}${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 10_000) return `${currency}${(v / 1000).toFixed(1)}k`
  return `${currency}${v.toFixed(v < 100 ? 2 : 0)}`
}
