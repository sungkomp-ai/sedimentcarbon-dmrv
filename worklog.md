# SedimentCarbon dMRV - Worklog

## Project Overview
Building a Digital MRV (Measurement, Reporting, Verification) system for
Sediment-Trap Agriculture Carbon Projects. Adapted from a Python FastAPI +
PostgreSQL architecture (PDF spec) to Next.js 16 + TypeScript + Prisma (SQLite)
+ shadcn/ui, with bilingual UI (TH/EN) and all calculation engines ported to
TypeScript.

## Architecture decisions
- Single SPA on `/` route (per project rules), internal tab/section navigation.
- API routes under `/api/*` (Next.js Route Handlers).
- Core engines as pure TypeScript modules under `src/lib/core/`.
- Prisma + SQLite for persistence (PostGIS geospatial replaced with GeoJSON
  strings + client-side rendering).
- i18n via custom lightweight context (TH/EN), no external runtime needed.
- Hash chain audit trail stored alongside each soil sample record.

---
Task ID: 1
Agent: main
Task: Build the full SedimentCarbon dMRV Next.js application adapted from the PDF Python spec.

Work Log:
- Read PDF spec (sedimentcarbon_dmrv_codebase.pdf) — FastAPI + PostgreSQL/PostGIS design.
- Adapted architecture: Next.js 16 + TypeScript + Prisma (SQLite) + shadcn/ui, single SPA on `/`.
- Defined Prisma schema (User, Farm, MonitoringPlot, SoilSample, SedimentMeasurement, ManagementActivity, CreditCalculation) with GeoJSON-as-string geospatial fields.
- Ported all 7 calculation engines from Python to TypeScript under src/lib/core/:
  - soc.ts: SOC stock, ESM correction, t-table uncertainty, required sample size.
  - emissions.ts: N2O direct/indirect, CH4 from flooding, fuel + lime emissions.
  - sediment.ts: trap volume/mass/carbon, USLE soil loss.
  - standards.ts: 4 standards (TVER/VCS/GS/ISO14064) with buffer/uncertainty rules.
  - credits.ts: credit comparison + uncertainty deduction + buffer pool.
  - finance.ts: NPV, IRR (bisection), Payback, Break-even, Aggregation benefit.
  - audit.ts: SHA-256 hash chain (stable JSON stringify).
- Built bilingual i18n system (TH/EN) with Buddhist Era date formatting for TH.
- Built geo utilities (polygon area, centroid, bounds, SVG projection) to replace PostGIS.
- Wrote seed script with the PDF's sample scenario (50 ha farm, 32.4→36.9 t C/ha over 5 yrs).
- Built 9 API routes (farms, soil-samples, sediment, activities, calculate/*, audit, standards, dashboard).
- Built 7 SPA sections + layout shell (sidebar/topbar/footer with TH/EN toggle + dark mode).
- Built a custom SVG-based GeoJSON map (replaces MapLibre for offline rendering).
- Fixed two lint issues (setState-in-effect in ThemeToggle + MiniMap).
- Fixed audit hash chain bug (seed payload was missing `method` field).
- Verified end-to-end with Agent Browser:
  - Dashboard renders KPIs (1 farm, 50 ha, 10 samples, 1.5 m³ sediment, ~2,560 tCO₂e credits).
  - Calculator outputs match PDF spec: ΔSOC=0.9 t C/ha/yr, Gross=825, T-VER net=649 tCO₂e.
  - Audit trail valid: 10 records verified, SHA-256 chain intact.
  - Language toggle (TH↔EN) and mobile drawer navigation work.

Stage Summary:
- Application is fully functional and self-verified via Agent Browser.
- Core engines are a faithful TypeScript port of the PDF Python spec, results match within rounding.
- Bilingual UI (TH/EN) with BE/CE date handling, dark/light theme toggle, sticky footer.
- Hash-chain audit trail intact and verifiable.
- All 9 API routes return correct data; lint passes clean.

---
Task ID: 2
Agent: main
Task: Add real Leaflet map + convert area units to "ไร่" when UI is in Thai.

Work Log:
- Installed `leaflet`, `react-leaflet` (v5, React 19-compatible), `@types/leaflet`.
- Added bilingual area unit helper `src/lib/i18n/area.ts`:
  - HA_TO_RAI = 6.25 (1 ha = 6.25 rai, 1 rai = 1600 m²).
  - `fmtArea(ha, locale)` → TH shows "312.50 ไร่", EN shows "50.00 ha".
  - `areaValue`, `haToRai`, `raiToHa` helpers.
- Extended `useI18n()` hook with `fmtArea`, `areaValue`, `haToRai`, `raiToHa`, `isThai`.
- Added new translation keys: `unit.rai`, `farms.areaRai`, `farms.areaHelp`, `dashboard.totalAreaRai`.
- Replaced the SVG-only MiniMap with a real `LeafletMap` component:
  - OpenStreetMap / Esri satellite / OpenTopoMap tile layers.
  - Click to add vertices, double-click to clear, auto-fit-to-bounds.
  - Polygon + Polyline + CircleMarker overlays with green accent.
  - HUD shows locale-aware area (rai for TH, ha for EN).
  - Loaded via `next/dynamic` with `ssr: false` (Leaflet needs `window`).
- Updated all area displays across the app:
  - Dashboard KPI hint: `fmtArea(totalAreaHa)`.
  - Farms section: total area KPI + per-farm card area.
  - Farm form dialog: switched to satellite map style + area help text.
  - Calculator credits tab: input field is "พื้นที่ (ไร่)" in TH, default 312.5; converts back to ha for API.
  - Calculator finance tab: same rai/ha conversion.
  - Calculator aggregation tab: input list in rai (TH) / ha (EN), output uses fmtArea.
- Fixed seed polygon to be ~50 ha (was ~478 ha) so it matches the stored `areaHa: 50`.
- Added `key={locale}` to all calculator tab panels so they remount when the language toggles, resetting inputs to locale-appropriate defaults (312.5 rai for TH vs 50 ha for EN).
- Fixed lint issues: removed dead `canonical` variable in audit.ts, removed unused eslint-disable directive, refactored map drawing-state to use derived `parsedPoints` + `draft` (no setState in effect).

Stage Summary:
- Real Leaflet map (with OSM/satellite/topo tile options) replaces the SVG-only approach.
- Area displays in ไร่ for Thai UI, ha for English — both display and input fields.
- All calculations stay in ha internally; only the UI layer converts.
- Verified end-to-end via Agent Browser:
  - Dashboard shows "312.50 ไร่" (was previously "50 ha").
  - Farms section card shows "312.50 ไร่" and the Leaflet HUD shows "316.04 ไร่ · 4 pts".
  - Calculator: TH shows "พื้นที่ (ไร่)" default 312.5; EN shows "Project Area (ha)" default 50.
  - Computing credits with 312.5 rai input yields correct results (T-VER net 649.425 tCO₂e) — proving the rai→ha conversion works.
  - Lint clean, page renders 200 OK, dev server stable.

---
Task ID: 3
Agent: main
Task: Add an overview map to the Dashboard showing farm locations + boundaries with OSM/satellite toggle.

Work Log:
- Extended `/api/dashboard` to include `geomGeojson` and `soilType` for each farm.
- Created `src/components/sections/dashboard-map.tsx`:
  - Multi-polygon Leaflet map that renders every farm boundary.
  - Auto-fit bounds across all farms (or default to Thai NE region if no farms).
  - Tile toggle button group: "ดาวเทียม" (Esri World Imagery, default) ↔ "ถนน" (OpenStreetMap).
  - Each polygon colored by its standard accent (T-VER green, VCS teal, GS yellow, ISO purple).
  - Sticky tooltip per polygon shows farm name + standard + area (locale-aware rai/ha) + sample/sediment counts.
  - Empty-state hint when no farms registered.
  - Loaded via `next/dynamic` `ssr: false` to avoid `window is not defined` SSR error.
- Updated `dashboard-section.tsx`:
  - Added `MapPin` import + `Badge` import.
  - Updated `DashboardData.farms` type to include `geomGeojson` + `soilType`.
  - Inserted a new "ที่ตั้งและขอบเขตแปลง / Farm Locations & Boundaries" Card above the KPI grid.

Stage Summary:
- Dashboard now leads with a 380px interactive map showing all farm polygons.
- Tile toggle works verified via Agent Browser:
  - Default satellite: 12/12 Esri tiles loaded, polygon stroke `#16a34a` (T-VER green).
  - Toggle to streets: switches to `c.tile.openstreetmap.org` tiles.
  - Toggle back to satellite: switches to `server.arcgisonline.com` tiles.
  - Tooltip on polygon hover shows: "แปลงสาธิตทุ่งกะเฉดา · TVER · 312.50 ไร่ · ตัวอย่างดิน: 10 · ตะกอน: 3".
- Mobile (390×844): map renders at 354×380px, footer correctly pushed down by content.
- Lint clean, dev server stable, page renders 200 OK.

---
Task ID: 4
Agent: main
Task: Add dMRV adjustment panel in the Finance tab to let users model how the dMRV system lowers verification cost and lifts carbon credit value.

Work Log:
- Added 17 new bilingual translation keys (calc.fin.dmrv* — title, enable toggle, reduction/premium labels, hints, base/adjusted preview, cumulative savings, premium revenue, benefit summary, full descriptive text).
- Refactored FinanceTab in calculator-section.tsx:
  - Added dMRV explainer card at the top with full Thai/English description of why dMRV lowers verification cost and lifts credit value (per the user's prompt).
  - Added a "ปรับค่าตรวจประเมินด้วย dMRV" panel with:
    - Switch toggle to enable/disable dMRV adjustment (default ON).
    - "ลดขั้นตอนตรวจสอบภาคสนาม (%)" slider 0-90% (default 50%).
    - "เพิ่มมูลค่าเครดิตจากความน่าเชื่อถือ (%)" slider 0-40% (default +10%).
    - Live preview of "ค่าตรวจประเมินพื้นฐาน → ค่าตรวจประเมินที่ปรับแล้ว" with strikethrough on base value and emerald accent on adjusted.
    - Live preview of "ราคาเครดิตพื้นฐาน → ราคาเครดิตที่ปรับแล้ว" with violet accent on adjusted.
    - Cumulative dMRV benefit box (gradient emerald→violet) showing total savings and total premium revenue over the project.
    - Panel auto-dims (opacity-50 + pointer-events-none) when switch is off.
  - Modified the compute flow to run BOTH baseline (no dMRV) and adjusted (with dMRV) financial analyses in parallel via Promise.all.
- Added a MetricCompare helper component that shows the adjusted value + the baseline→delta when dMRV is on (e.g. "NPV -80,722 → +174,190 (+254,912)") and falls back to a plain Metric when off.
- Lower-is-better flag for Payback and Breakeven so the delta arrow turns emerald when the value drops.
- Imported Switch, Slider, Sparkles, ArrowUpRight, ArrowDownRight from shadcn/ui and lucide-react.

Stage Summary:
- The Finance tab now models the user's reasoning: dMRV's evidence-backed data → reduced verifier site time → lower verification cost; auditable hash chain → trust → higher credit price.
- Verified end-to-end via Agent Browser (TH mode, default sliders):
  - Base verify 150,000 THB → adjusted 75,000 THB (save 75,000/cycle).
  - Base price 350 THB → adjusted 385 THB (+35/ton).
  - Cumulative savings 225,000 THB over the 10-year project (3 verify cycles).
  - Baseline NPV -80,722 THB (NOT viable) → adjusted +174,190 THB (viable).
  - Baseline IRR -1.96% → adjusted +18.68%.
  - Baseline breakeven 950.99 → adjusted 751.95 THB/tCO₂e (-199.04 delta, emerald).
- Slider drag from 50% → 90% reduction: adjusted verify dropped to 15,000 THB, savings/cycle up to 135,000 THB.
- Toggle off switch: panel dims (opacity-50 + pointer-events-none), aria-checked=false confirmed via JS.
- English version mirrors all labels correctly.
- Lint clean, page renders 200 OK, dev server stable.
