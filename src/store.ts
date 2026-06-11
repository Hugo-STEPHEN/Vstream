import { create } from 'zustand'
import { NODE_LANE, PALETTE_BY_KIND } from './data/palette'
import { createDemoProject, createBlankProject } from './data/demo'
import { clampToLane } from './lib/geometry'
import { parseProjectJson } from './lib/exporters'
import type {
  DemandConfig,
  EdgeKind,
  FloorZone,
  NodeKind,
  TransportMode,
  TravelRoute,
  VsmEdge,
  VsmNode,
  VsmProject,
} from './types'

export type AppTab = 'vsm' | 'spaghetti' | 'analytics' | 'benchmarks'
export type VsmTool = 'select' | 'connect'
export type SpaghettiTool = 'select' | 'zone' | 'route'

let idSeq = Date.now() % 100000
export const nextId = (prefix: string): string => `${prefix}_${(idSeq++).toString(36)}`

const STORAGE_KEY = 'vstream.project.v1'

interface HistoryShape {
  nodes: VsmNode[]
  edges: VsmEdge[]
  spaghetti: VsmProject['spaghetti']
  demand: DemandConfig
}

export interface AppState {
  // project
  projectName: string
  nodes: VsmNode[]
  edges: VsmEdge[]
  demand: DemandConfig
  spaghetti: VsmProject['spaghetti']
  // ui
  tab: AppTab
  tool: VsmTool
  edgeKind: EdgeKind
  connectFrom: string | null
  selectedNodeId: string | null
  selectedEdgeId: string | null
  spaghettiTool: SpaghettiTool
  routeMode: TransportMode
  draftRoute: { x: number; y: number }[]
  selectedZoneId: string | null
  selectedRouteId: string | null
  // history
  past: HistoryShape[]
  future: HistoryShape[]

  // actions
  setTab: (t: AppTab) => void
  setTool: (t: VsmTool, edgeKind?: EdgeKind) => void
  setProjectName: (n: string) => void
  addNode: (kind: NodeKind, x: number, y: number) => void
  moveNode: (id: string, x: number, y: number) => void
  updateNode: (id: string, patch: Partial<VsmNode>) => void
  deleteSelection: () => void
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  beginConnect: (nodeId: string) => void
  completeConnect: (nodeId: string) => void
  cancelConnect: () => void
  updateDemand: (patch: Partial<DemandConfig>) => void
  // spaghetti
  setSpaghettiTool: (t: SpaghettiTool) => void
  setRouteMode: (m: TransportMode) => void
  addZone: (z: Omit<FloorZone, 'id'>) => void
  updateZone: (id: string, patch: Partial<FloorZone>) => void
  moveZone: (id: string, x: number, y: number) => void
  selectZone: (id: string | null) => void
  selectRoute: (id: string | null) => void
  pushDraftPoint: (x: number, y: number) => void
  finishDraftRoute: () => void
  cancelDraftRoute: () => void
  updateRoute: (id: string, patch: Partial<TravelRoute>) => void
  deleteFloorSelection: () => void
  setMetersPerUnit: (v: number) => void
  // project lifecycle
  loadProject: (p: VsmProject) => void
  loadDemo: () => void
  newProject: () => void
  importJson: (text: string) => string | null
  snapshot: () => VsmProject
  undo: () => void
  redo: () => void
}

function takeHistory(s: AppState): HistoryShape {
  return structuredClone({ nodes: s.nodes, edges: s.edges, spaghetti: s.spaghetti, demand: s.demand })
}

/** Wrap a mutation so it records undo history (capped at 60 entries). */
function withHistory(s: AppState, patch: Partial<AppState>): Partial<AppState> {
  return { ...patch, past: [...s.past.slice(-59), takeHistory(s)], future: [] }
}

function initialProject(): VsmProject {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return parseProjectJson(raw)
  } catch {
    // fall through to demo
  }
  return createDemoProject()
}

const init = initialProject()

export const useApp = create<AppState>((set, get) => ({
  projectName: init.name,
  nodes: init.nodes,
  edges: init.edges,
  demand: init.demand,
  spaghetti: init.spaghetti,
  tab: 'vsm',
  tool: 'select',
  edgeKind: 'push',
  connectFrom: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  spaghettiTool: 'select',
  routeMode: 'walk',
  draftRoute: [],
  selectedZoneId: null,
  selectedRouteId: null,
  past: [],
  future: [],

  setTab: (tab) => set({ tab }),
  setTool: (tool, edgeKind) =>
    set((s) => ({ tool, edgeKind: edgeKind ?? s.edgeKind, connectFrom: null })),
  setProjectName: (projectName) => set({ projectName }),

  addNode: (kind, x, y) =>
    set((s) => {
      const entry = PALETTE_BY_KIND.get(kind)
      const lane = NODE_LANE[kind]
      const pos = clampToLane(lane, x, y)
      const node: VsmNode = {
        id: nextId('n'),
        kind,
        label: entry?.label ?? kind,
        ...entry?.defaults,
        ...pos,
      }
      return withHistory(s, { nodes: [...s.nodes, node], selectedNodeId: node.id, selectedEdgeId: null })
    }),

  moveNode: (id, x, y) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, ...clampToLane(NODE_LANE[n.kind], x, y) } : n,
      ),
    })),

  updateNode: (id, patch) =>
    set((s) =>
      withHistory(s, {
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      }),
    ),

  deleteSelection: () =>
    set((s) => {
      if (s.selectedNodeId) {
        return withHistory(s, {
          nodes: s.nodes.filter((n) => n.id !== s.selectedNodeId),
          edges: s.edges.filter((e) => e.from !== s.selectedNodeId && e.to !== s.selectedNodeId),
          selectedNodeId: null,
        })
      }
      if (s.selectedEdgeId) {
        return withHistory(s, {
          edges: s.edges.filter((e) => e.id !== s.selectedEdgeId),
          selectedEdgeId: null,
        })
      }
      return {}
    }),

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  beginConnect: (nodeId) => set({ connectFrom: nodeId }),
  completeConnect: (nodeId) =>
    set((s) => {
      if (!s.connectFrom || s.connectFrom === nodeId) return { connectFrom: null }
      const dup = s.edges.some(
        (e) => e.from === s.connectFrom && e.to === nodeId && e.kind === s.edgeKind,
      )
      if (dup) return { connectFrom: null }
      const edge: VsmEdge = { id: nextId('e'), kind: s.edgeKind, from: s.connectFrom, to: nodeId }
      return withHistory(s, { edges: [...s.edges, edge], connectFrom: null, selectedEdgeId: edge.id, selectedNodeId: null })
    }),
  cancelConnect: () => set({ connectFrom: null }),

  updateDemand: (patch) => set((s) => withHistory(s, { demand: { ...s.demand, ...patch } })),

  // --- spaghetti ---
  setSpaghettiTool: (spaghettiTool) => set({ spaghettiTool, draftRoute: [] }),
  setRouteMode: (routeMode) => set({ routeMode }),
  addZone: (z) =>
    set((s) =>
      withHistory(s, {
        spaghetti: { ...s.spaghetti, zones: [...s.spaghetti.zones, { ...z, id: nextId('z') }] },
      }),
    ),
  updateZone: (id, patch) =>
    set((s) =>
      withHistory(s, {
        spaghetti: {
          ...s.spaghetti,
          zones: s.spaghetti.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
        },
      }),
    ),
  moveZone: (id, x, y) =>
    set((s) => ({
      spaghetti: {
        ...s.spaghetti,
        zones: s.spaghetti.zones.map((z) => (z.id === id ? { ...z, x, y } : z)),
      },
    })),
  selectZone: (id) => set({ selectedZoneId: id, selectedRouteId: null }),
  selectRoute: (id) => set({ selectedRouteId: id, selectedZoneId: null }),
  pushDraftPoint: (x, y) => set((s) => ({ draftRoute: [...s.draftRoute, { x, y }] })),
  finishDraftRoute: () =>
    set((s) => {
      if (s.draftRoute.length < 2) return { draftRoute: [] }
      const route: TravelRoute = {
        id: nextId('r'),
        name: `Route ${s.spaghetti.routes.length + 1}`,
        mode: s.routeMode,
        points: s.draftRoute,
        tripsPerShift: 10,
      }
      return withHistory(s, {
        spaghetti: { ...s.spaghetti, routes: [...s.spaghetti.routes, route] },
        draftRoute: [],
        selectedRouteId: route.id,
        selectedZoneId: null,
      })
    }),
  cancelDraftRoute: () => set({ draftRoute: [] }),
  updateRoute: (id, patch) =>
    set((s) =>
      withHistory(s, {
        spaghetti: {
          ...s.spaghetti,
          routes: s.spaghetti.routes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        },
      }),
    ),
  deleteFloorSelection: () =>
    set((s) => {
      if (s.selectedZoneId) {
        return withHistory(s, {
          spaghetti: { ...s.spaghetti, zones: s.spaghetti.zones.filter((z) => z.id !== s.selectedZoneId) },
          selectedZoneId: null,
        })
      }
      if (s.selectedRouteId) {
        return withHistory(s, {
          spaghetti: { ...s.spaghetti, routes: s.spaghetti.routes.filter((r) => r.id !== s.selectedRouteId) },
          selectedRouteId: null,
        })
      }
      return {}
    }),
  setMetersPerUnit: (metersPerUnit) =>
    set((s) => withHistory(s, { spaghetti: { ...s.spaghetti, metersPerUnit } })),

  // --- project lifecycle ---
  loadProject: (p) =>
    set({
      projectName: p.name,
      nodes: p.nodes,
      edges: p.edges,
      demand: p.demand,
      spaghetti: p.spaghetti,
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedZoneId: null,
      selectedRouteId: null,
      connectFrom: null,
      draftRoute: [],
      past: [],
      future: [],
    }),
  loadDemo: () => get().loadProject(createDemoProject()),
  newProject: () => get().loadProject(createBlankProject()),
  importJson: (text) => {
    try {
      get().loadProject(parseProjectJson(text))
      return null
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid file'
    }
  },
  snapshot: () => {
    const s = get()
    return {
      schema: 'vstream/v1',
      name: s.projectName,
      savedAt: new Date().toISOString(),
      nodes: s.nodes,
      edges: s.edges,
      demand: s.demand,
      spaghetti: s.spaghetti,
    }
  },

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1]
      if (!prev) return {}
      return {
        ...prev,
        past: s.past.slice(0, -1),
        future: [takeHistory(s), ...s.future.slice(0, 59)],
        selectedNodeId: null,
        selectedEdgeId: null,
      }
    }),
  redo: () =>
    set((s) => {
      const next = s.future[0]
      if (!next) return {}
      return {
        ...next,
        future: s.future.slice(1),
        past: [...s.past, takeHistory(s)],
        selectedNodeId: null,
        selectedEdgeId: null,
      }
    }),
}))

// Debounced autosave to localStorage.
let saveTimer: ReturnType<typeof setTimeout> | undefined
useApp.subscribe((s) => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          schema: 'vstream/v1',
          name: s.projectName,
          savedAt: new Date().toISOString(),
          nodes: s.nodes,
          edges: s.edges,
          demand: s.demand,
          spaghetti: s.spaghetti,
        } satisfies VsmProject),
      )
    } catch {
      // storage full / private mode — non-fatal
    }
  }, 400)
})
