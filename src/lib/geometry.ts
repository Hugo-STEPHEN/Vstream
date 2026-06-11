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
