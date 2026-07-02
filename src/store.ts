import { create } from 'zustand'
import { NODE_LANE, PALETTE_BY_KIND } from './data/palette'
import { createDemoProject, createBlankProject } from './data/demo'
import { mergeCalibration } from './lib/calibration'
import { boundingBox, clampToLane, clampToSheet } from './lib/geometry'
import { parseProjectJson } from './lib/exporters'
import { isAnnotationKind } from './types'
import type {
  CalibrationConfig,
  DemandConfig,
  EdgeKind,
  FloorBackground,
  FloorZone,
  NodeKind,
  Scenario,
  TransportMode,
  TravelRoute,
  VsmEdge,
  VsmNode,
  VsmProject,
} from './types'

export type AppTab = 'vsm' | 'spaghetti' | 'analytics' | 'benchmarks' | 'station'
export type VsmTool = 'select' | 'connect'
export type SpaghettiTool = 'select' | 'zone' | 'poly' | 'route' | 'calibrate'

let idSeq = Date.now() % 100000
export const nextId = (prefix: string): string => `${prefix}_${(idSeq++).toString(36)}`

const STORAGE_KEY = 'vstream.project.v1'
const PREFS_KEY = 'vstream.prefs.v1'

/** View preferences — device-local (not part of the project file). */
export interface ViewPrefs {
  /** Show the dot grid on the VSM sheet. */
  vsmGrid: boolean
  /** Snap node positions to the grid step. */
  vsmSnap: boolean
  /** VSM snap step, canvas units. */
  snapStep: number
  /** Show the line grid on the floor map. */
  floorGrid: boolean
  /** Floor grid step, canvas units. */
  floorGridStep: number
  /** Show each object's snap anchor point. */
  showAnchors: boolean
}

const DEFAULT_PREFS: ViewPrefs = {
  vsmGrid: true,
  vsmSnap: false,
  snapStep: 20,
  floorGrid: true,
  floorGridStep: 50,
  showAnchors: false,
}

function loadPrefs(): ViewPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<ViewPrefs>) }
  } catch {
    // corrupted prefs — fall back to defaults
  }
  return { ...DEFAULT_PREFS }
}

interface HistoryShape {
  nodes: VsmNode[]
  edges: VsmEdge[]
  spaghetti: VsmProject['spaghetti']
  demand: DemandConfig
  calibration: CalibrationConfig
}

export interface AppState {
  // project
  projectName: string
  nodes: VsmNode[]
  edges: VsmEdge[]
  demand: DemandConfig
  spaghetti: VsmProject['spaghetti']
  scenarios: Scenario[]
  calibration: CalibrationConfig
  /** The scenario currently loaded in the working view (null = unsaved model). */
  activeScenarioId: string | null
  /** Snapshot of the working model stashed when first entering a scenario. */
  liveBackup: { nodes: VsmNode[]; edges: VsmEdge[]; demand: DemandConfig } | null
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
  /** Station whose deep rate-analysis window is open. */
  stationDetailId: string | null
  /** Polygon-zone draft vertices. */
  draftPoly: { x: number; y: number }[]
  prefs: ViewPrefs
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
  moveRoutePoint: (routeId: string, index: number, x: number, y: number) => void
  pushDraftPolyPoint: (x: number, y: number) => void
  finishDraftPoly: () => void
  cancelDraftPoly: () => void
  moveZonePoint: (zoneId: string, index: number, x: number, y: number) => void
  insertZonePoint: (zoneId: string, index: number, x: number, y: number) => void
  removeZonePoint: (zoneId: string, index: number) => void
  insertRoutePoint: (routeId: string, index: number, x: number, y: number) => void
  removeRoutePoint: (routeId: string, index: number) => void
  deleteFloorSelection: () => void
  setMetersPerUnit: (v: number) => void
  setFloorBackground: (bg: FloorBackground | null) => void
  // scenarios
  saveScenario: (name: string) => void
  applyScenario: (id: string) => void
  /** Rapidly navigate the whole app to a scenario (null = working model). */
  switchScenario: (id: string | null) => void
  deleteScenario: (id: string) => void
  renameScenario: (id: string, name: string) => void
  // calibration
  setCalibration: (cal: CalibrationConfig) => void
  resetCalibration: () => void
  // station drill-down
  openStationDetail: (id: string) => void
  closeStationDetail: () => void
  // view prefs
  setPrefs: (p: Partial<ViewPrefs>) => void
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
  return structuredClone({
    nodes: s.nodes, edges: s.edges, spaghetti: s.spaghetti, demand: s.demand, calibration: s.calibration,
  })
}

/**
 * Wrap a mutation so it records undo history (capped at 60 entries). Any tracked
 * edit detaches the working view from a loaded scenario, so the scenario switcher
 * shows "(working model)" again and the stashed backup is dropped.
 */
function withHistory(s: AppState, patch: Partial<AppState>): Partial<AppState> {
  return {
    activeScenarioId: null,
    liveBackup: null,
    ...patch,
    past: [...s.past.slice(-59), takeHistory(s)],
    future: [],
  }
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

/** Apply grid snapping when the preference is on. */
function snapTo(s: { prefs: ViewPrefs }, v: number): number {
  return s.prefs.vsmSnap ? Math.round(v / s.prefs.snapStep) * s.prefs.snapStep : v
}

export const useApp = create<AppState>((set, get) => ({
  projectName: init.name,
  nodes: init.nodes,
  edges: init.edges,
  demand: init.demand,
  spaghetti: init.spaghetti,
  scenarios: init.scenarios ?? [],
  activeScenarioId: null,
  liveBackup: null,
  calibration: mergeCalibration(init.calibration),
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
  stationDetailId: null,
  draftPoly: [],
  prefs: loadPrefs(),
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
      const pos = isAnnotationKind(kind)
        ? clampToSheet(snapTo(s, x), snapTo(s, y))
        : clampToLane(lane, snapTo(s, x), snapTo(s, y))
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
        n.id === id
          ? {
              ...n,
              ...(isAnnotationKind(n.kind)
                ? clampToSheet(snapTo(s, x), snapTo(s, y))
                : clampToLane(NODE_LANE[n.kind], snapTo(s, x), snapTo(s, y))),
            }
          : n,
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
  setSpaghettiTool: (spaghettiTool) => set({ spaghettiTool, draftRoute: [], draftPoly: [] }),
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
        zones: s.spaghetti.zones.map((z) => {
          if (z.id !== id) return z
          const dx = x - z.x
          const dy = y - z.y
          return {
            ...z, x, y,
            points: z.points?.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          }
        }),
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
  pushDraftPolyPoint: (x, y) => set((s) => ({ draftPoly: [...s.draftPoly, { x, y }] })),
  finishDraftPoly: () =>
    set((s) => {
      if (s.draftPoly.length < 3) return { draftPoly: [] }
      const box = boundingBox(s.draftPoly)
      const zone = {
        id: nextId('z'),
        name: `Zone ${s.spaghetti.zones.length + 1}`,
        ...box,
        color: '#94A3B8',
        points: s.draftPoly,
      }
      return withHistory(s, {
        spaghetti: { ...s.spaghetti, zones: [...s.spaghetti.zones, zone] },
        draftPoly: [],
        selectedZoneId: zone.id,
        selectedRouteId: null,
      })
    }),
  cancelDraftPoly: () => set({ draftPoly: [] }),
  moveZonePoint: (zoneId, index, x, y) =>
    set((s) => ({
      spaghetti: {
        ...s.spaghetti,
        zones: s.spaghetti.zones.map((z) => {
          if (z.id !== zoneId || !z.points) return z
          const points = z.points.map((p, i) => (i === index ? { x, y } : p))
          return { ...z, ...boundingBox(points), points }
        }),
      },
    })),
  insertZonePoint: (zoneId, index, x, y) =>
    set((s) =>
      withHistory(s, {
        spaghetti: {
          ...s.spaghetti,
          zones: s.spaghetti.zones.map((z) => {
            if (z.id !== zoneId || !z.points) return z
            const points = [...z.points.slice(0, index + 1), { x, y }, ...z.points.slice(index + 1)]
            return { ...z, ...boundingBox(points), points }
          }),
        },
      }),
    ),
  removeZonePoint: (zoneId, index) =>
    set((s) =>
      withHistory(s, {
        spaghetti: {
          ...s.spaghetti,
          zones: s.spaghetti.zones.map((z) => {
            if (z.id !== zoneId || !z.points || z.points.length <= 3) return z
            const points = z.points.filter((_, i) => i !== index)
            return { ...z, ...boundingBox(points), points }
          }),
        },
      }),
    ),
  insertRoutePoint: (routeId, index, x, y) =>
    set((s) =>
      withHistory(s, {
        spaghetti: {
          ...s.spaghetti,
          routes: s.spaghetti.routes.map((r) =>
            r.id === routeId
              ? { ...r, points: [...r.points.slice(0, index + 1), { x, y }, ...r.points.slice(index + 1)] }
              : r,
          ),
        },
      }),
    ),
  removeRoutePoint: (routeId, index) =>
    set((s) =>
      withHistory(s, {
        spaghetti: {
          ...s.spaghetti,
          routes: s.spaghetti.routes.map((r) =>
            r.id === routeId && r.points.length > 2
              ? { ...r, points: r.points.filter((_, i) => i !== index) }
              : r,
          ),
        },
      }),
    ),
  updateRoute: (id, patch) =>
    set((s) =>
      withHistory(s, {
        spaghetti: {
          ...s.spaghetti,
          routes: s.spaghetti.routes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        },
      }),
    ),
  moveRoutePoint: (routeId, index, x, y) =>
    set((s) => ({
      spaghetti: {
        ...s.spaghetti,
        routes: s.spaghetti.routes.map((r) =>
          r.id === routeId
            ? { ...r, points: r.points.map((p, i) => (i === index ? { x, y } : p)) }
            : r,
        ),
      },
    })),
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
  setFloorBackground: (bg) =>
    set((s) =>
      withHistory(s, {
        spaghetti: { ...s.spaghetti, background: bg ?? undefined },
      }),
    ),

  // --- scenarios ---
  saveScenario: (name) =>
    set((s) => {
      const id = nextId('sc')
      return {
        scenarios: [
          ...s.scenarios,
          {
            id,
            name,
            savedAt: new Date().toISOString(),
            nodes: structuredClone(s.nodes),
            edges: structuredClone(s.edges),
            demand: structuredClone(s.demand),
          },
        ],
        // The model just saved becomes the active scenario.
        activeScenarioId: id,
      }
    }),
  applyScenario: (id) => get().switchScenario(id),
  switchScenario: (id) =>
    set((s) => {
      if (id === s.activeScenarioId) return {}
      // Stash the working model the first time we leave it, so "(working model)"
      // and any later switch back restores exactly what the user had.
      const liveBackup =
        s.activeScenarioId === null
          ? structuredClone({ nodes: s.nodes, edges: s.edges, demand: s.demand })
          : s.liveBackup
      const target =
        id === null
          ? liveBackup ?? { nodes: s.nodes, edges: s.edges, demand: s.demand }
          : s.scenarios.find((x) => x.id === id)
      if (!target) return {}
      return {
        nodes: structuredClone(target.nodes),
        edges: structuredClone(target.edges),
        demand: structuredClone(target.demand),
        activeScenarioId: id,
        liveBackup: id === null ? null : liveBackup,
        past: [...s.past.slice(-59), takeHistory(s)],
        future: [],
        selectedNodeId: null,
        selectedEdgeId: null,
        connectFrom: null,
      }
    }),
  deleteScenario: (id) => set((s) => ({ scenarios: s.scenarios.filter((x) => x.id !== id) })),
  renameScenario: (id, name) =>
    set((s) => ({ scenarios: s.scenarios.map((x) => (x.id === id ? { ...x, name } : x)) })),

  // --- calibration ---
  setCalibration: (cal) => set((s) => withHistory(s, { calibration: mergeCalibration(cal) })),
  resetCalibration: () => set((s) => withHistory(s, { calibration: mergeCalibration() })),

  openStationDetail: (stationDetailId) =>
    set({ stationDetailId, selectedNodeId: stationDetailId, selectedEdgeId: null, tab: 'station' }),
  closeStationDetail: () => set({ stationDetailId: null }),

  setPrefs: (p) =>
    set((s) => {
      const prefs = { ...s.prefs, ...p }
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
      } catch {
        // storage full / private mode — non-fatal
      }
      return { prefs }
    }),

  // --- project lifecycle ---
  loadProject: (p) =>
    set({
      projectName: p.name,
      nodes: p.nodes,
      edges: p.edges,
      demand: p.demand,
      spaghetti: p.spaghetti,
      scenarios: p.scenarios ?? [],
      calibration: mergeCalibration(p.calibration),
      selectedNodeId: null,
      selectedEdgeId: null,
      selectedZoneId: null,
      selectedRouteId: null,
      connectFrom: null,
      draftRoute: [],
      draftPoly: [],
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
      scenarios: s.scenarios,
      calibration: s.calibration,
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
          scenarios: s.scenarios,
          calibration: s.calibration,
        } satisfies VsmProject),
      )
    } catch {
      // storage full / private mode — non-fatal
    }
  }, 400)
})
