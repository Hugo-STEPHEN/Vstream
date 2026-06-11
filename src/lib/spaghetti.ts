import type { RouteMetrics, SpaghettiState, TransportMode, TransportProfile, TravelRoute } from '../types'

export const TRANSPORT_PROFILES: Record<TransportMode, TransportProfile> = {
  walk: { mode: 'walk', label: 'Manual walk', costPerMeter: 0.15, speedMps: 1.2, color: '#FBBF24' },
  forklift: { mode: 'forklift', label: 'Forklift carrier', costPerMeter: 1.2, speedMps: 3.0, color: '#F87171' },
  agv: { mode: 'agv', label: 'AGV routing', costPerMeter: 0.4, speedMps: 1.7, color: '#22D3EE' },
}

const AVG_STEP_METERS = 0.75

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
): RouteMetrics {
  const profile = TRANSPORT_PROFILES[route.mode]
  // A trip covers the route out and back.
  const metersOneWay = polylineLength(route.points) * metersPerUnit
  const metersPerShift = metersOneWay * 2 * Math.max(0, route.tripsPerShift)
  const costPerShift = metersPerShift * profile.costPerMeter
  return {
    routeId: route.id,
    name: route.name,
    mode: route.mode,
    meters: metersOneWay,
    steps: route.mode === 'walk' ? Math.round(metersOneWay / AVG_STEP_METERS) : 0,
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
export function computeTransportAudit(state: SpaghettiState, partsPerShift: number): TransportAudit {
  const rows: TransportAuditRow[] = []
  if (partsPerShift > 0) {
    for (const route of state.routes) {
      if (!route.linkedNodeId) continue
      const profile = TRANSPORT_PROFILES[route.mode]
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
): SpaghettiSummary {
  const pairs = state.routes.map((route) => ({
    route,
    metrics: computeRouteMetrics(route, state.metersPerUnit, shiftsPerDay, daysPerYear),
  }))
  const cheapest = Math.min(...Object.values(TRANSPORT_PROFILES).map((p) => p.costPerMeter))
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

export function fmtMoney(v: number): string {
  if (!Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 10_000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(v < 100 ? 2 : 0)}`
}
