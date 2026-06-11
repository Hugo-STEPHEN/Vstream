import type { DemandConfig, SpaghettiState, VsmEdge, VsmNode, VsmProject } from '../types'

/**
 * Seed scenario: a classic stamping → welding → assembly stream
 * (in the spirit of Rother & Shook's "Learning to See" Acme case).
 */

export const DEFAULT_DEMAND: DemandConfig = {
  unitsPerDay: 460,
  shiftsPerDay: 2,
  netMinutesPerShift: 435,
  daysPerYear: 240,
  partWeightKg: 1.8,
  gridCo2PerKwh: 0.38,
  laborRatePerHour: 42,
}

const nodes: VsmNode[] = [
  // Information lane
  { id: 'pc', kind: 'productionControl', label: 'Production Control', x: 600, y: 90 },
  { id: 'erp', kind: 'erp', label: 'ERP (MRP run)', x: 880, y: 90 },
  { id: 'sched', kind: 'schedule', label: 'Weekly Schedule', x: 600, y: 210 },
  // Material lane
  { id: 'sup', kind: 'supplier', label: 'Steel Co.', x: 80, y: 420 },
  { id: 'i0', kind: 'inventory', label: 'Coils', x: 270, y: 470, qty: 2300 },
  {
    id: 'p1', kind: 'process', label: 'Stamping', x: 400, y: 410,
    ct: 1.2, setup: 3600, batch: 600, availability: 0.85, scrap: 0.01, operators: 1, powerKw: 45, valueAdd: true,
  },
  { id: 'i1', kind: 'inventory', label: 'Stamped WIP', x: 580, y: 470, qty: 1100 },
  {
    id: 'p2', kind: 'process', label: 'Spot Weld', x: 700, y: 410,
    ct: 39, setup: 600, batch: 300, availability: 0.8, scrap: 0.02, operators: 1, powerKw: 22, valueAdd: true,
  },
  { id: 'i2', kind: 'inventory', label: 'Welded WIP', x: 880, y: 470, qty: 640 },
  {
    id: 'p3', kind: 'process', label: 'Assembly 1', x: 1000, y: 410,
    ct: 46, setup: 0, batch: 1, availability: 0.95, scrap: 0.005, operators: 2, powerKw: 4, valueAdd: true,
  },
  { id: 'i3', kind: 'fifo', label: 'FIFO → Assy 2', x: 1180, y: 470, qty: 60 },
  {
    id: 'p4', kind: 'process', label: 'Assembly 2', x: 1300, y: 410,
    ct: 62, setup: 0, batch: 1, availability: 0.9, scrap: 0.015, operators: 2, powerKw: 4, valueAdd: true,
  },
  { id: 'i4', kind: 'inventory', label: 'Finished Goods', x: 1490, y: 470, qty: 1200 },
  { id: 'ship', kind: 'truck', label: 'Daily Truck', x: 1610, y: 410, tripsPerWeek: 5, distanceKm: 85 },
  { id: 'cust', kind: 'customer', label: 'Vehicle OEM', x: 1750, y: 420 },
]

const edges: VsmEdge[] = [
  { id: 'e1', kind: 'push', from: 'sup', to: 'i0' },
  { id: 'e2', kind: 'push', from: 'i0', to: 'p1' },
  { id: 'e3', kind: 'push', from: 'p1', to: 'i1' },
  { id: 'e4', kind: 'push', from: 'i1', to: 'p2' },
  { id: 'e5', kind: 'push', from: 'p2', to: 'i2' },
  { id: 'e6', kind: 'push', from: 'i2', to: 'p3' },
  { id: 'e7', kind: 'push', from: 'p3', to: 'i3' },
  { id: 'e8', kind: 'push', from: 'i3', to: 'p4' },
  { id: 'e9', kind: 'push', from: 'p4', to: 'i4' },
  { id: 'e10', kind: 'push', from: 'i4', to: 'ship' },
  { id: 'e11', kind: 'push', from: 'ship', to: 'cust' },
  // Information flow
  { id: 'f1', kind: 'electronicInfo', from: 'cust', to: 'pc' },
  { id: 'f2', kind: 'electronicInfo', from: 'pc', to: 'erp' },
  { id: 'f3', kind: 'electronicInfo', from: 'pc', to: 'sup' },
  { id: 'f4', kind: 'manualInfo', from: 'pc', to: 'sched' },
  { id: 'f5', kind: 'manualInfo', from: 'sched', to: 'p1' },
  { id: 'f6', kind: 'manualInfo', from: 'sched', to: 'p3' },
]

const spaghetti: SpaghettiState = {
  metersPerUnit: 0.12,
  zones: [
    { id: 'z1', name: 'Receiving dock', x: 60, y: 80, w: 220, h: 160, color: '#818CF8' },
    { id: 'z2', name: 'Coil storage', x: 60, y: 300, w: 220, h: 200, color: '#94A3B8' },
    { id: 'z3', name: 'Stamping cell', x: 380, y: 120, w: 260, h: 180, color: '#22D3EE' },
    { id: 'z4', name: 'Weld bay', x: 740, y: 120, w: 240, h: 180, color: '#FBBF24' },
    { id: 'z5', name: 'Assembly line', x: 380, y: 400, w: 600, h: 160, color: '#34D399' },
    { id: 'z6', name: 'FG warehouse', x: 1080, y: 320, w: 240, h: 240, color: '#F87171' },
  ],
  routes: [
    {
      id: 'r1', linkedNodeId: 'p1', name: 'Coils → Stamping', mode: 'forklift', tripsPerShift: 12,
      points: [{ x: 170, y: 380 }, { x: 320, y: 380 }, { x: 320, y: 210 }, { x: 400, y: 210 }],
    },
    {
      id: 'r2', linkedNodeId: 'p2', name: 'Stamping → Weld', mode: 'forklift', tripsPerShift: 18,
      points: [{ x: 640, y: 210 }, { x: 740, y: 210 }],
    },
    {
      id: 'r3', linkedNodeId: 'p3', name: 'Weld → Assembly', mode: 'walk', tripsPerShift: 30,
      points: [{ x: 860, y: 300 }, { x: 860, y: 360 }, { x: 620, y: 360 }, { x: 620, y: 420 }],
    },
    {
      id: 'r4', linkedNodeId: 'p4', name: 'Assembly → FG', mode: 'agv', tripsPerShift: 24,
      points: [{ x: 980, y: 480 }, { x: 1080, y: 480 }],
    },
    {
      id: 'r5', name: 'Dock ↔ FG (expedite)', mode: 'walk', tripsPerShift: 8,
      points: [{ x: 280, y: 160 }, { x: 700, y: 60 }, { x: 1150, y: 320 }],
    },
  ],
}

export function createDemoProject(): VsmProject {
  return {
    schema: 'vstream/v1',
    name: 'Acme Stamping Line',
    savedAt: new Date().toISOString(),
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
    demand: { ...DEFAULT_DEMAND },
    spaghetti: structuredClone(spaghetti),
  }
}

export function createBlankProject(): VsmProject {
  return {
    schema: 'vstream/v1',
    name: 'New Value Stream',
    savedAt: new Date().toISOString(),
    nodes: [],
    edges: [],
    demand: { ...DEFAULT_DEMAND },
    spaghetti: { metersPerUnit: 0.12, zones: [], routes: [] },
  }
}
