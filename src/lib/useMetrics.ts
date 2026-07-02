import { useMemo } from 'react'
import { useApp } from '../store'
import { computeSystemMetrics } from './analytics'
import { circuitSecondsByNode } from './spaghetti'
import type { SystemMetrics } from '../types'

/**
 * The single source of live system metrics for every VSM view. It folds the
 * spaghetti operator-circuit time into the engine so the whole app stays
 * consistent: a circuit drawn on the floor reduces the linked station's
 * available time here, in the ladder, the analytics and the benchmarks.
 */
export function useSystemMetrics(): SystemMetrics {
  const nodes = useApp((s) => s.nodes)
  const demand = useApp((s) => s.demand)
  const calibration = useApp((s) => s.calibration)
  const spaghetti = useApp((s) => s.spaghetti)
  return useMemo(() => {
    const circuits = circuitSecondsByNode(spaghetti, demand.shiftsPerDay, calibration)
    return computeSystemMetrics(nodes, demand, calibration, circuits)
  }, [nodes, demand, calibration, spaghetti])
}
