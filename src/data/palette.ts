import type { Lane, NodeKind, VsmNode } from '../types'

export interface PaletteEntry {
  kind: NodeKind
  label: string
  lane: Lane
  category: 'Flow essentials' | 'Pull & Kanban' | 'Logistics' | 'Resources & Quality' | 'Information'
  keywords: string
  simple: boolean
  defaults: Partial<VsmNode>
}

export const NODE_LANE: Record<NodeKind, Lane> = {
  process: 'material',
  inventory: 'material',
  safetyStock: 'material',
  supermarket: 'material',
  fifo: 'material',
  supplier: 'material',
  customer: 'material',
  qcGate: 'material',
  rework: 'material',
  scrapBin: 'material',
  operator: 'material',
  truck: 'material',
  ship: 'material',
  air: 'material',
  forklift: 'material',
  kanbanPost: 'material',
  kanbanProduction: 'information',
  kanbanWithdrawal: 'information',
  heijunka: 'information',
  productionControl: 'information',
  erp: 'information',
  schedule: 'information',
  goSee: 'information',
}

export const PALETTE: PaletteEntry[] = [
  // --- Flow essentials (Simple tab) ---
  {
    kind: 'process', label: 'Process step', lane: 'material', category: 'Flow essentials',
    keywords: 'process step machine operation station workcell manufacturing', simple: true,
    defaults: { ct: 60, setup: 600, batch: 100, availability: 0.9, scrap: 0.01, operators: 1, powerKw: 8, valueAdd: true },
  },
  {
    kind: 'inventory', label: 'Inventory triangle', lane: 'material', category: 'Flow essentials',
    keywords: 'inventory triangle wip stock queue buffer', simple: true,
    defaults: { qty: 500 },
  },
  {
    kind: 'supplier', label: 'Supplier', lane: 'material', category: 'Flow essentials',
    keywords: 'supplier vendor source factory external', simple: true, defaults: {},
  },
  {
    kind: 'customer', label: 'Customer', lane: 'material', category: 'Flow essentials',
    keywords: 'customer client demand market external', simple: true, defaults: {},
  },
  // --- Pull & Kanban ---
  {
    kind: 'supermarket', label: 'Supermarket', lane: 'material', category: 'Pull & Kanban',
    keywords: 'supermarket pull store kanban shelf', simple: false, defaults: { qty: 200 },
  },
  {
    kind: 'fifo', label: 'FIFO lane', lane: 'material', category: 'Pull & Kanban',
    keywords: 'fifo lane first in first out sequenced flow', simple: false, defaults: { qty: 50 },
  },
  {
    kind: 'kanbanPost', label: 'Kanban post', lane: 'material', category: 'Pull & Kanban',
    keywords: 'kanban post signal card collection box', simple: false, defaults: {},
  },
  {
    kind: 'kanbanProduction', label: 'Production kanban', lane: 'information', category: 'Pull & Kanban',
    keywords: 'kanban production card signal instruction slot', simple: false, defaults: {},
  },
  {
    kind: 'kanbanWithdrawal', label: 'Withdrawal kanban', lane: 'information', category: 'Pull & Kanban',
    keywords: 'kanban withdrawal move card signal conveyance', simple: false, defaults: {},
  },
  {
    kind: 'heijunka', label: 'Heijunka box', lane: 'information', category: 'Pull & Kanban',
    keywords: 'heijunka level loading box leveling schedule sequencing', simple: false, defaults: {},
  },
  // --- Logistics ---
  {
    kind: 'truck', label: 'Road truck', lane: 'material', category: 'Logistics',
    keywords: 'truck road shipment freight delivery milk run', simple: false,
    defaults: { tripsPerWeek: 5, distanceKm: 120 },
  },
  {
    kind: 'ship', label: 'Container ship', lane: 'material', category: 'Logistics',
    keywords: 'ship sea container ocean freight import', simple: false,
    defaults: { tripsPerWeek: 0.25, distanceKm: 9000 },
  },
  {
    kind: 'air', label: 'Air shipment', lane: 'material', category: 'Logistics',
    keywords: 'air plane shipment express freight emergency', simple: false,
    defaults: { tripsPerWeek: 1, distanceKm: 1500 },
  },
  {
    kind: 'forklift', label: 'Forklift route', lane: 'material', category: 'Logistics',
    keywords: 'forklift internal transport pallet move tugger', simple: false,
    defaults: { tripsPerWeek: 50, distanceKm: 0.2 },
  },
  // --- Resources & Quality ---
  {
    kind: 'operator', label: 'Operator (FTE)', lane: 'material', category: 'Resources & Quality',
    keywords: 'operator fte headcount labor people resource', simple: false, defaults: { operators: 1 },
  },
  {
    kind: 'qcGate', label: 'QC inspection gate', lane: 'material', category: 'Resources & Quality',
    keywords: 'qc quality inspection gate check test audit', simple: false,
    defaults: { ct: 25, availability: 0.98, scrap: 0.02, operators: 1, valueAdd: false },
  },
  {
    kind: 'rework', label: 'Rework loop', lane: 'material', category: 'Resources & Quality',
    keywords: 'rework loop repair fix touch up defect', simple: false,
    defaults: { ct: 120, availability: 0.95, scrap: 0.05, operators: 1, valueAdd: false },
  },
  {
    kind: 'scrapBin', label: 'Scrap bin', lane: 'material', category: 'Resources & Quality',
    keywords: 'scrap bin waste discard defect red bin', simple: false, defaults: { qty: 0 },
  },
  {
    kind: 'safetyStock', label: 'Safety stock', lane: 'material', category: 'Resources & Quality',
    keywords: 'safety stock buffer insurance emergency inventory', simple: false, defaults: { qty: 100 },
  },
  // --- Information ---
  {
    kind: 'productionControl', label: 'Production control', lane: 'information', category: 'Information',
    keywords: 'production control planning central pc mrp office', simple: true, defaults: {},
  },
  {
    kind: 'erp', label: 'ERP / MES system', lane: 'information', category: 'Information',
    keywords: 'erp mes sap system database it software', simple: false, defaults: {},
  },
  {
    kind: 'schedule', label: 'Schedule', lane: 'information', category: 'Information',
    keywords: 'schedule weekly daily plan timetable order list', simple: false, defaults: {},
  },
  {
    kind: 'goSee', label: 'Go-see / verbal', lane: 'information', category: 'Information',
    keywords: 'go see verbal gemba walk eyeball expedite', simple: false, defaults: {},
  },
]

export const PALETTE_BY_KIND = new Map(PALETTE.map((p) => [p.kind, p]))
