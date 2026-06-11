import { computeSystemMetrics } from './analytics'
import type { DemandConfig, SystemMetrics, VsmNode } from '../types'

export interface KaizenSuggestion {
  id: string
  nodeId: string
  action: string
  rationale: string
  /** The exact parameter change that was simulated — applying it reproduces the quoted impact. */
  patch: Partial<VsmNode>
  /** Recomputed metric deltas — real what-if math, not canned text. */
  pceAfter: number
  pceDelta: number
  leadTimeAfter: number
  leadTimeDelta: number
  capacityAfter: number
}

/**
 * Deterministic kaizen engine: each candidate countermeasure is applied to a
 * cloned model and the full system metrics are recomputed, so every quoted
 * impact is an honest simulation. This is also the grounding payload for the
 * (roadmap) LLM co-pilot — see buildCopilotPrompt below.
 */
export function generateKaizenSuggestions(
  nodes: VsmNode[],
  demand: DemandConfig,
  base: SystemMetrics,
): KaizenSuggestion[] {
  const out: KaizenSuggestion[] = []

  const evaluate = (
    id: string,
    nodeId: string,
    action: string,
    rationale: string,
    patch: Partial<VsmNode>,
  ): void => {
    const clone = nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : { ...n }))
    const after = computeSystemMetrics(clone, demand)
    const pceDelta = after.pce - base.pce
    const leadTimeDelta = after.leadTimeSeconds - base.leadTimeSeconds
    // Keep only countermeasures that actually move the system.
    if (pceDelta > 0.05 || leadTimeDelta < -1 || after.systemCapacityPerDay > base.systemCapacityPerDay * 1.02) {
      out.push({
        id,
        nodeId,
        action,
        rationale,
        patch,
        pceAfter: after.pce,
        pceDelta,
        leadTimeAfter: after.leadTimeSeconds,
        leadTimeDelta,
        capacityAfter: after.systemCapacityPerDay,
      })
    }
  }

  for (const p of base.processes) {
    if (p.setupPenalty > p.ctNominal * 0.25 && p.setup > 0) {
      evaluate(
        `smed-${p.nodeId}`,
        p.nodeId,
        `SMED workshop at ${p.label}: halve setup to ${Math.round(p.setup / 2)}s`,
        `Changeover currently amortizes to ${p.setupPenalty.toFixed(1)}s per part.`,
        { setup: p.setup / 2 },
      )
    }
    if (p.availability < 0.85) {
      evaluate(
        `tpm-${p.nodeId}`,
        p.nodeId,
        `TPM program at ${p.label}: raise availability ${Math.round(p.availability * 100)}% → 90%`,
        `Downtime stretches each part from ${p.ctNominal.toFixed(1)}s to ${p.ctEffective.toFixed(1)}s.`,
        { availability: 0.9 },
      )
    }
    if (p.scrap >= 0.03) {
      evaluate(
        `quality-${p.nodeId}`,
        p.nodeId,
        `Quality kaizen at ${p.label}: cut scrap ${Math.round(p.scrap * 100)}% → 1%`,
        `Defects compound capacity loss across every upstream station.`,
        { scrap: 0.01 },
      )
    }
  }

  // Inventory pull-down: halve the largest queues.
  const biggest = [...base.inventories].sort((a, b) => b.nvaSeconds - a.nvaSeconds).slice(0, 3)
  for (const inv of biggest) {
    if (inv.days < 1) continue
    evaluate(
      `pull-${inv.nodeId}`,
      inv.nodeId,
      `Convert ${inv.label} to pull supermarket: cap at ${Math.max(1, Math.round(inv.qty / 2)).toLocaleString()} pcs`,
      `${inv.days.toFixed(1)} days of WIP is pure lead time with zero value-add.`,
      { qty: Math.round(inv.qty / 2) },
    )
  }

  return out.sort((a, b) => b.pceDelta - a.pceDelta).slice(0, 8)
}

/**
 * Roadmap hook: grounding prompt for a generative ValueStream-AI co-pilot.
 * Pipe this to an LLM endpoint together with the user's question.
 */
export function buildCopilotPrompt(metrics: SystemMetrics): string {
  const lines = metrics.processes.map(
    (p) =>
      `${p.label}: CT ${p.ctNominal}s, avail ${(p.availability * 100).toFixed(0)}%, scrap ${(p.scrap * 100).toFixed(1)}%, setup ${p.setup}s/batch ${p.batch}, grand CT ${p.ctGrand.toFixed(1)}s${p.exceedsTakt ? ' [OVER TAKT]' : ''}`,
  )
  return [
    'You are a lean manufacturing sensei. Current value stream:',
    `Takt ${metrics.taktSeconds.toFixed(1)}s · Lead time ${(metrics.leadTimeSeconds / 86400).toFixed(2)}d · PCE ${metrics.pce.toFixed(1)}%`,
    ...lines,
    'Propose the three highest-leverage kaizen actions with quantified impact.',
  ].join('\n')
}
