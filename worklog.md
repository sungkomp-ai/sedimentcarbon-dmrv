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
