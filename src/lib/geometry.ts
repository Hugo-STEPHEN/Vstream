import type { Lane } from '../types'

export interface SheetLayout {
  width: number
  height: number
  info: { top: number; bottom: number }
  material: { top: number; bottom: number }
  timeline: { top: number; bottom: number }
}

const SHEET_TOP = 30
const TIMELINE_H = 290
export const DEFAULT_INFO_H = 270
export const DEFAULT_MATERIAL_H = 340

/** Build the sheet layout from adjustable lane heights (auto-flows the timeline). */
export function sheetLayout(infoH: number = DEFAULT_INFO_H, materialH: number = DEFAULT_MATERIAL_H): SheetLayout {
  const infoBottom = SHEET_TOP + Math.max(120, infoH)
  const matBottom = infoBottom + Math.max(160, materialH)
  const tlBottom = matBottom + TIMELINE_H
  return {
    width: 1900,
    height: tlBottom + 10,
    info: { top: SHEET_TOP, bottom: infoBottom },
    material: { top: infoBottom, bottom: matBottom },
    timeline: { top: matBottom, bottom: tlBottom },
  }
}

/** Default layout (kept for callers that don't have prefs). */
export const SHEET: SheetLayout = sheetLayout()

export const NODE_W = 116
export const NODE_H = 84

/** Clamp a node's centre into its authorized lane. */
export function clampToLane(lane: Lane, x: number, y: number, sheet: SheetLayout = SHEET): { x: number; y: number } {
  const band = lane === 'information' ? sheet.info : sheet.material
  return {
    x: Math.min(sheet.width - NODE_W / 2 - 10, Math.max(NODE_W / 2 + 10, x)),
    y: Math.min(band.bottom - NODE_H / 2 - 6, Math.max(band.top + NODE_H / 2 + 6, y)),
  }
}

/** Annotations float freely — only keep them inside the sheet bounds. */
export function clampToSheet(x: number, y: number, sheet: SheetLayout = SHEET): { x: number; y: number } {
  return {
    x: Math.min(sheet.width - 20, Math.max(20, x)),
    y: Math.min(sheet.height - 20, Math.max(20, y)),
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
