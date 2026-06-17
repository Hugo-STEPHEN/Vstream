import type { Lane } from '../types'

/** World-coordinate layout of the VSM sheet (canvas units). */
export const SHEET = {
  width: 1900,
  height: 940,
  info: { top: 30, bottom: 300 },
  material: { top: 300, bottom: 640 },
  timeline: { top: 640, bottom: 930 },
} as const

export const NODE_W = 116
export const NODE_H = 84

/** Clamp a node's centre into its authorized lane. */
export function clampToLane(lane: Lane, x: number, y: number): { x: number; y: number } {
  const band = lane === 'information' ? SHEET.info : SHEET.material
  return {
    x: Math.min(SHEET.width - NODE_W / 2 - 10, Math.max(NODE_W / 2 + 10, x)),
    y: Math.min(band.bottom - NODE_H / 2 - 6, Math.max(band.top + NODE_H / 2 + 6, y)),
  }
}

/** Annotations float freely — only keep them inside the sheet bounds. */
export function clampToSheet(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(SHEET.width - 20, Math.max(20, x)),
    y: Math.min(SHEET.height - 20, Math.max(20, y)),
  }
}

/** Shoelace area of a polygon, canvas units². */
export function polygonArea(points: { x: number; y: number }[]): number {
  let a = 0
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    a += p1.x * p2.y - p2.x * p1.y
  }
  return Math.abs(a / 2)
}

/** Axis-aligned bounding box of a point set. */
export function boundingBox(points: { x: number; y: number }[]): { x: number; y: number; w: number; h: number } {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}
