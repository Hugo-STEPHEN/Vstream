# vStream — Value Stream Intelligence Suite

A living, analytical, closed-loop decision cockpit for plant directors and operational
executives: **Value Stream Mapping**, **spaghetti diagrams**, **flow analytics** and
**industrial performance benchmarking** in one premium, high-density React application.

Unlike static mapping tools (Visio, PDFs), every parameter you touch — a cycle time
slider, an OEE percentage, a batch size — re-runs the entire mathematical engine and
instantly updates the canvas, the VA/NVA timeline ladder, the alerts, the kaizen
suggestions and the benchmark grade.

## 📚 Documentation

Full guides live in **[`docs/`](docs/README.md)** (bilingual-friendly), including a
beginner's walkthrough of the **[Rate Analysis / TRS·TRG·TRE](docs/03-rate-analysis.md)**,
a **[VSM guide](docs/02-vsm-guide.md)**, an **[architecture overview](docs/08-architecture.md)**
for developers, and a **[FR/EN glossary](docs/09-glossary.md)** of every acronym.

## Quick start

**Windows — one click:** install [Node.js LTS](https://nodejs.org), then
double-click **`start.bat`**. It installs dependencies on first run and opens the
app in your browser. Use **`update.bat`** to pull later versions.

**Any OS — terminal:**

```bash
npm install
npm run dev       # development server on :5173 (add -- --open to launch the browser)
npm run build     # production bundle in dist/
npm test          # analytics engine test suite (vitest)
```

No backend required. Projects autosave to the browser's local storage and can be
exported / re-imported as JSON.

---

## The five workspaces

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

### 2. Rate Analysis — a layer deeper than the VSM
Double-click any station on the canvas (or use the tab) to drill into its
**NF E 60-182 performance analysis**: the time cascade from total calendar time
down to useful time, **TRS (OEE) / TRG / TRE** with live color-graded scores per
station, the **loss Pareto** (downtime vs speed vs defects, in seconds lost per
day), the per-part CT waterfall against takt, and theoretical good output.
Parameters (CT, availability, **performance/allure**, scrap, setup, batch,
engagement, opening) are edited live — the whole model follows, undoably.

### 3. Spaghetti Studio
Draw the plant footprint as colored zones — optionally over an **uploaded floor-plan
image** (CAD export or photo, stored in the project file with adjustable opacity) —
then trace material travel as routes with three transport profiles:

| Mode | Cost | Speed |
|---|---|---|
| Manual walk | $0.15 / m | 1.2 m/s |
| Forklift carrier | $1.20 / m | 3.0 m/s |
| AGV routing | $0.40 / m | 1.7 m/s |

Each route is costed live (distance × trips × mode) per shift and per year, with a
best-mode ROI estimate. Line weight scales with traffic intensity. Plant scale
(meters per canvas unit) is configurable. Select a route to **drag its waypoints**,
and **link it to the VSM station it feeds** — linked routes appear in the transport
audit as conveyance seconds and dollars per produced part.

Layout tools match real plants: **polygon zones** (click vertices, double-click or
Enter to close, drag vertices afterwards — m² area computed) for non-rectangular
footprints, rectangle zones, **pan & cursor-anchored wheel zoom**, and a
configurable grid.

### 4. Flow Analytics
The scenario sandbox: station load vs takt with full **loss decomposition**
(nominal work / availability loss / quality loss / setup penalty), a sortable
**bottleneck audit** with audited waste per part, the **ESG carbon & waste auditor**
(kWh, CO₂e, scrap mass per day), REST/webhook connector contracts, and the
**ValueStream co-pilot**: deterministic kaizen suggestions whose quoted impact is a
real re-simulation of the whole model — one click applies the countermeasure.

Two simulation instruments complete the sandbox:

- **Scenario workbench** — freeze the current model (stations, connections, demand)
  as a named scenario, keep tweaking the canvas, and compare every saved state side
  by side (lead time, PCE, capacity, FPY, grade, with deltas). Apply any scenario
  back to the canvas (undoable). Scenarios are saved in the project file.
- **Sensitivity explorer** — sweep one station parameter (CT, availability, scrap,
  setup, batch) across its range; PCE and capacity response curves are 25 honest
  re-simulations of the whole engine, with the current value marked.
- **Transport audit** — spaghetti routes linked to VSM stations are allocated per
  produced part, making conveyance muda directly comparable to cycle times.

### Calibration — your plant, your assumptions
Every built-in assumption is tunable per project (sliders icon in the top bar):

| Knob | Default | Why calibrate |
|---|---|---|
| Alert thresholds | SMED > 0.5×CT, scrap ≥ 5%, OEE-A < 70%, inventory > 5 d, PCE < 5% | Match your escalation policy |
| Transport economics | walk $0.15/m @ 1.2 m/s · forklift $1.20/m @ 3.0 m/s · AGV $0.40/m @ 1.7 m/s | Use loaded local rates |
| Benchmark bands | Rother/Shook-style typical → world-class per KPI | Score against *your* sector |
| Currency & step length | `$`, 0.75 m | Sites outside the US, ergonomic step counts |

Calibration is saved in the project file, applied through every engine (flags,
kaizen, sensitivity, scenarios, spaghetti costs, benchmark grade), printed in the
executive report ("Model calibration in force"), undoable like any other edit,
and resettable to factory defaults in one click. Old project files without a
calibration block import cleanly — defaults are merged in.

**Language / Langue** — the entire suite is bilingual **English / Français**
(top-bar toggle or calibration setting, saved with the project): UI, canvas
labels, alerts, kaizen suggestions, the data dictionary and the executive
report all switch. TRS/TRG/TRE terminology follows NF E 60-182.

Further per-user customization: node **accent colors**, VSM grid show/hide +
**snap-to-grid** with adjustable step, floor-map grid step — view preferences
persist on the device.

### 5. Benchmarks
Six lean KPIs scored against *typical batch-and-queue* (0) and *world-class lean*
(100) references, with a composite A–E grade and positioning radar.

---

## Need definitions — the mathematical contract

The **complete data dictionary lives in `src/data/definitions.ts`** — one source of
truth rendered in-app (book icon in the top bar, searchable, with keyboard shortcuts),
exportable as CSV, and appended to every executive report. The core quantities:

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

### Spaghetti & transport
| Term | Definition | Formula |
|---|---|---|
| Route distance | One-way path length at plant scale | `polyline length × m/unit` |
| Transport cost | Financial footprint of a route | `m/shift × mode $/m` |
| **Transport / part** | Conveyance waste per produced part (linked routes) | `(m/shift ÷ speed) ÷ parts/shift` |
| Best-mode ROI | Saving if every route ran its cheapest mode | `Σ max(0, cost − cheapest)` |

### ESG (E-VSM)
Energy = `Σ station kW × busy hours/day`; CO₂e = energy × grid factor; scrap mass =
excess starts × part weight. Grid factor, part weight and labor rate are project settings.

### Scenarios & sensitivity
A **scenario** is a frozen `{stations, connections, demand}` snapshot compared on
lead time, PCE, capacity, FPY and grade. A **sensitivity sweep** re-runs the entire
engine at each of 25 points across one parameter's range — no interpolation.

---

## Export & data

- **Executive report** `.html` — self-contained, print-to-PDF ready audit: KPI summary,
  station & inventory audits, alerts, kaizen countermeasures, benchmarks with grade,
  spaghetti economics, transport audit, ESG, the calibration in force and the full
  definitions appendix.
- **Project file** `.vstream.json` — full model incl. scenarios and floor-plan underlay,
  versioned schema (`vstream/v1`), re-importable.
- **VSM metrics CSV** — the audited PCE report: every station's CT waterfall, flags, totals.
- **Spaghetti CSV** — route distances, steps, time and cost per shift/year, ROI.
- **Benchmarks CSV** — six KPIs vs typical & world class with scores and grade.
- **Data dictionary CSV** — every defined term with formula, unit and meaning.
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
  store.ts                 Zustand store: project, tools, scenarios, calibration, undo/redo, autosave
  data/
    definitions.ts         The complete need/metric dictionary (single source of truth)
    palette.ts, demo.ts    Element catalog, Acme demo stream
  lib/
    analytics.ts           Lean math engine (pure, tested)
    calibration.ts         Tunable assumptions: defaults, merge, transport profiles (tested)
    sensitivity.ts         Single-variable sweep engine (pure, tested)
    spaghetti.ts           Travel distance / cost / ROI + transport audit (tested)
    benchmarks.ts          KPI scoring vs typical & world-class references
    copilot.ts             What-if kaizen engine + LLM grounding prompt
    report.ts              Self-contained executive HTML report builder (tested)
    exporters.ts           JSON / CSV / SVG / PNG exporters
    fuzzy.ts, geometry.ts  Toolbox search, lane clamping
  components/
    HelpModal.tsx          Searchable in-app definitions & shortcuts
    CalibrationModal.tsx   Thresholds, transport economics, benchmark bands, units
    vsm/                   Canvas, toolbox, inspector, node glyphs
    spaghetti/             Floor studio (image underlay, waypoint editing, VSM links)
    analytics/             Sandbox, scenarios, sensitivity, co-pilot, ESG, connectors
    benchmarks/            Grade, radar, detail table
```

Stack: React 18 + TypeScript (strict), Tailwind CSS (industrial dark theme:
Space Grotesk / JetBrains Mono / Inter), zustand, recharts, motion, lucide-react,
SVG canvas engines with pan/zoom. Built with Vite.
