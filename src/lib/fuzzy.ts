/** Tiny dependency-free fuzzy matcher for the toolbox search. */
export function fuzzyScore(query: string, target: string): number {
  const q = query.trim().toLowerCase()
  const t = target.toLowerCase()
  if (!q) return 1
  if (t.includes(q)) return 100 - t.indexOf(q)
  // Subsequence match: every query char must appear in order.
  let ti = 0
  let score = 0
  for (const ch of q) {
    const found = t.indexOf(ch, ti)
    if (found === -1) return 0
    score += found === ti ? 3 : 1 // contiguous runs score higher
    ti = found + 1
  }
  return score
}

export function fuzzyFilter<T>(query: string, items: T[], keyOf: (item: T) => string): T[] {
  if (!query.trim()) return items
  return items
    .map((item) => ({ item, s: fuzzyScore(query, keyOf(item)) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.item)
}
