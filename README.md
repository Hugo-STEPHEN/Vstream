# vStream — Value Stream Intelligence Suite

A living, analytical, closed-loop decision cockpit for plant directors and operational
executives: **Value Stream Mapping**, **spaghetti diagrams**, **flow analytics** and
**industrial performance benchmarking** in one premium, high-density React application.

Unlike static mapping tools (Visio, PDFs), every parameter you touch — a cycle time
slider, an OEE percentage, a batch size — re-runs the entire mathematical engine and
instantly updates the canvas, the VA/NVA timeline ladder, the alerts, the kaizen
suggestions and the benchmark grade.

## Quick start

```bash
npm install
npm run dev       # development server on :5173
npm run build     # production bundle in dist/
npm test          # analytics engine test suite (vitest)
```

No backend required. Projects autosave to the browser's local storage and can be
exported / re-imported as JSON.

---

## The four workspaces

### 1. VSM Studio
A spatiotemporal canvas split into three enforced lanes:

- **Information flow** (top) — production control, ERP/MES, schedules, go-see loops,
  kanban cards, heijunka boxes. Physical nodes cannot be dragged here.
- **Material flow** (middle) — processes, inventory triangles, supermarkets, FIFO
  lanes, QC gates, rework loops, scrap bins, logistics (truck / ship / air / forklift).
- **Timeline ladder** (bottom) — auto-generated square-wave graph: value-add peaks,
  non-value-add valleys, with live lead time, VA time and PCE totals.

Toolbox: *Simple flow* tab for the essential five elements, *Full suite* tab with the
complete catalog grouped by category, and fuzzy search (type `kanban` and the list
collapses to kanban elements). Drag onto the canvas or click to place.

Connections: **Push** (striped scheduling arrow), **Pull** (withdrawal loop),
**manual info** and **electronic info (EDI)** — select a connection to retype it.

Stations breaching takt pulse red on the canvas; the system bottleneck is flagged amber.

### 2. Spaghetti Studio
Draw the plant footprint as colored zones, then trace material travel as routes with
three transport profiles:

| Mode | Cost | Speed |
|---|---|---|
| Manual walk | $0.15 / m | 1.2 m/s |
| Forklift carrier | $1.20 / m | 3.0 m/s |
| AGV routing | $0.40 / m | 1.7 m/s |

Each route is costed live (distance × trips × mode) per shift and per year, with a
best-mode ROI estimate. Line weight scales with traffic intensity. Plant scale
(meters per canvas unit) is configurable.

### 3. Flow Analytics
The scenario sandbox: station load vs takt with full **loss decomposition**
(nominal work / availability loss / quality loss / setup penalty), a sortable
**bottleneck audit** with audited waste per part, the **ESG carbon & waste auditor**
(kWh, CO₂e, scrap mass per day), REST/webhook connector contracts, and the
**ValueStream co-pilot**: deterministic kaizen suggestions whose quoted impact is a
real re-simulation of the whole model — one click applies the countermeasure.

### 4. Benchmarks
Six lean KPIs scored against *typical batch-and-queue* (0) and *world-class lean*
(100) references, with a composite A–E grade and positioning radar.

---

## Need definitions — the mathematical contract

All quantities below are computed in `src/lib/analytics.ts` and covered by tests.

### Demand & takt
| Term | Definition | Formula |
|---|---|---|
| Available time | Net working seconds per day | `shifts/day × net min/shift × 60` |
| **Takt time** | Pace of customer demand | `available time ÷ demand (units/day)` |

### Station-level (each process, QC gate, rework loop)
| Term | Definition | Formula |
|---|---|---|
| `CT_nominal` | Machine cycle time per part, seconds | input |
| `A` | OEE availability ratio, clamped 0.10–1.00 | input |
| `SR` | Scrap / defect rate, clamped 0–0.95 | input |
| `S`, `B` | Total changeover time (s); batch size between changeovers | input |
| **CT_effective** | Downtime-adjusted cycle time | `CT_nominal ÷ A` |
| **CT_quality** | Defect-compounded cycle time | `CT_effective ÷ (1 − SR)` |
| **Setup penalty** | SMED amortization per part | `S ÷ B` |
| **CT_grand** | Grand effective operations cycle time | `CT_quality + Setup penalty` |
| Takt load | Station utilization against demand | `CT_grand ÷ takt` |

### Flags
- **Bottleneck exceeds takt** (critical, red pulse): `CT_grand > takt` — demand cannot be met.
- **High setup penalty / SMED loss** (amber): `Setup penalty > 0.5 × CT_nominal`.
- Secondary flags: scrap ≥ 5%, availability < 70%, inventory > 5 days, PCE < 5%.

### System-level
| Term | Definition | Formula |
|---|---|---|
| NVA time | Inventory dwell at demand rate | `qty ÷ demand × available time` per queue |
| **Lead time (PLT)** | Total process lead time | `Σ CT_grand + Σ NVA` |
| **PCE** | Process cycle efficiency | `Σ value-add CT_nominal ÷ PLT × 100` |
| Capacity | Demand-feasible throughput | `available time ÷ max(CT_grand)` |
| First pass yield | Probability of zero-defect pass-through | `Π (1 − SR)` |

QC gates and rework loops count toward lead time but **not** toward value-add (configurable
per station), so inspection-heavy streams are honestly penalized in PCE.

### ESG (E-VSM)
Energy = `Σ station kW × busy hours/day`; CO₂e = energy × grid factor; scrap mass =
excess starts × part weight. Grid factor, part weight and labor rate are project settings.

---

## Export & data

- **Project file** `.vstream.json` — full model, versioned schema (`vstream/v1`), re-importable.
- **VSM metrics CSV** — the audited PCE report: every station's CT waterfall, flags, totals.
- **Spaghetti CSV** — route distances, steps, time and cost per shift/year, ROI.
- **SVG / PNG** — print-ready vector or 2× raster snapshot of the VSM sheet or floor map.
- Autosave to `localStorage` after every change; undo/redo (Ctrl+Z / Ctrl+Shift+Z).

## Integration roadmap (hooks shipped)

- **REST/Webhook connectors** — `MetricsUpdatePayload` contract for
  `POST /api/v1/metrics/update` lets IoT devices, scanners and MES pipe measured cycle
  times into the model (typed in `src/types.ts`, documented in-app with a copyable curl).
- **Generative co-pilot** — `buildCopilotPrompt()` serializes the live model as grounding
  context for an LLM; the deterministic kaizen engine doubles as its evaluation oracle.
- **E-VSM** — per-station power and scrap telemetry already feed the ESG auditor.

## Architecture

```
src/
  types.ts                 Domain model (strict TS, no `any`)
  store.ts                 Zustand store: project, tools, undo/redo, autosave
  lib/
    analytics.ts           Lean math engine (pure, tested)
    spaghetti.ts           Travel distance / cost / ROI engine
    benchmarks.ts          KPI scoring vs typical & world-class references
    copilot.ts             What-if kaizen engine + LLM grounding prompt
    exporters.ts           JSON / CSV / SVG / PNG exporters
    fuzzy.ts, geometry.ts  Toolbox search, lane clamping
  components/
    vsm/                   Canvas, toolbox, inspector, node glyphs
    spaghetti/             Floor studio
    analytics/             Sandbox, co-pilot, ESG, connectors
    benchmarks/            Grade, radar, detail table
```

Stack: React 18 + TypeScript (strict), Tailwind CSS (industrial dark theme:
Space Grotesk / JetBrains Mono / Inter), zustand, recharts, motion, lucide-react,
SVG canvas engines with pan/zoom. Built with Vite.
