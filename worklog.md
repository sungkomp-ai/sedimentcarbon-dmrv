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

---
Task ID: 5
Agent: main
Task: Add Nan-province highland farms (formerly shifting cultivation) with the specific sediment-trap design and create plot design illustrations.

Work Log:
- Generated 3 illustrations via image-generation skill (z-ai CLI):
  - /public/plots/cross-section.png — cross-section of terraced plot with vetiver bund and check dam
  - /public/plots/aerial-view.png — aerial view showing alternating slope pattern
  - /public/plots/plot-closeup.png — close-up of tea/coffee growing on terraces
- Extended Prisma schema with 4 new fields on Farm:
  - crops (JSON string array)
  - elevationM (highland elevation)
  - plotDesign (JSON object: terraceWidthM, bundWidthM, alternatingSlope, hasCheckDam, bundCrop)
  - priorLandUse (e.g. "shifting_cultivation")
- Rewrote src/lib/seed.ts with 5 farms total:
  - demo-farm-001 (PDF spec, 50 ha flat field, Nakhon Ratchasima)
  - nan-farm-001 (5.2 ha tea farm, Mae Charim, 1100m, formerly shifting cultivation)
  - nan-farm-002 (4 ha arabica coffee, Pua, 1250m, vetiver + check dams)
  - nan-farm-003 (7 ha rotation crops, Santi Suk, 600m, rice + soybean + cover crop)
  - nan-farm-004 (6.5 ha mixed tea & coffee, Bo Kluea, 1400m, full design package)
- Each Nan farm has the spec's exact design: 1.5 m terrace + 0.8 m vetiver bund + check dam + alternating slope.
- Expanded trap types and added crops picker in farm-form-dialog.tsx:
  - New trap types: terrace_step, vetiver_bund, check_dam (renamed), alternating_slope.
  - Each with TH/EN labels and 1-line description.
  - New crops list: tea, coffee_arabica, upland_rice, soybean, cover_crop, shade_tree, rice.
  - Plot design params card (terrace width, bund width, bund crop, alternating slope, has check dam) with default values matching the user's spec (1.5 m / 0.8 m / vetiver / on / on).
  - Prior land use picker (shifting_cultivation / conventional_tillage / fallow / forest_degraded).
  - Elevation input with Mountain icon.
- Updated /api/farms (GET + POST) and /api/dashboard to round-trip the new fields.
- Updated dashboard-map.tsx tooltip to show: farm name, standard, area (locale-aware rai/ha), elevation, crops, sample/sediment counts, and a "เดิมทำไร่เลื่อนลอย" amber badge for former shifting cultivation.
- Updated farms-section.tsx card to display elevation (Mountain icon), slope %, crops (Leaf icon, badges), and prior-land-use badge.
- Added a new "ภาพประกอบแปลงดักตะกอนดิน / Sediment-Trap Plot Design Gallery" card to the dashboard with the 3 generated images, captions (TH/EN), and a 4-chip legend showing the design params (terrace 1.5 m, vetiver bund 0.8 m, check dam yes, water flow zigzag L↔R).
- Added highland badge to the dashboard map header when any farm is at elevation ≥ 500 m.

Stage Summary:
- Database seeded with 5 farms (1 lowland + 4 Nan highland), 60 soil samples with intact hash-chain audit, 19 sediment measurements, 19 management activities.
- Plot design gallery renders 3 generated illustrations on the dashboard (verified loaded at 1344px width via Agent Browser).
- Dashboard map shows 5 polygons, "พื้นที่สูง" badge, all Nan farms with tooltips showing crops + elevation + "เดิมทำไร่เลื่อนลอย" badge.
- Farm form dialog now exposes all design parameters and the new trap/crop pickers, defaults match the user's spec (1.5 m terrace, 0.8 m vetiver bund, alternating slope on, check dam on).
- Total area: 72.7 ha (~454 ไร่), all credits/sediment/audit calculations still pass through hash-chain verification.
- Lint clean, dev server stable, page renders 200 OK.

---
Task ID: 6
Agent: main
Task: Regenerate the cross-section image so water clearly flows zigzag (top of upper plot → end of plot → start of next plot, alternating L↔R).

Work Log:
- First generation attempt: prompt described the zigzag pattern but the model didn't render it clearly (water flowed down side channels, not across each plot).
- Verified via VLM (z-ai vision with glm-5v-turbo): (1) terraced plots visible — YES; (2) zigzag water flow alternating L↔R — NO.
- Rewrote prompt with explicit numbered arrow sequence:
  - Arrow 1: LEFT end of TOP terrace → RIGHT end of TOP terrace (flowing left-to-right)
  - Arrow 2: drops RIGHT end of top → RIGHT end of second terrace
  - Arrow 3: RIGHT end of second → LEFT end of second (flowing right-to-left)
  - Arrow 4: drops LEFT end of second → LEFT end of third
  - Arrow 5: LEFT end of third → RIGHT end of third (flowing left-to-right)
  - Arrow 6: drops RIGHT end of third → RIGHT end of bottom
  - Arrow 7: RIGHT end of bottom → LEFT end of bottom (flowing right-to-left)
- Regenerated at /public/plots/cross-section.png (125KB, 1344×768).
- Re-verified via VLM:
  - (1) แปลงขั้นบรรไดเรียงซ้อนลงตามลาดเขา 4 แปลง: YES
  - (2) น้ำไหลซิกแซกสลับซ้าย-ขวา (L→R, R→L, L→R, R→L): YES
- Updated the dashboard caption + main description translation (TH and EN) to match the explicit zigzag pattern:
  - TH: "น้ำถูกบังคับให้ไหลจากต้นแปลงบน → ท้ายแปลง → ลงต้นแปลงถัดไป → สลับซ้าย-ขวา"
  - EN: "Water forced: top of upper plot → end of plot → start of next plot, alternating L↔R"
- Updated aerial-view caption to emphasise the zigzag as well.
- Verified in browser: new image loaded (cache-busted) at 1344×768.

Stage Summary:
- Cross-section image now clearly shows the zigzag water flow: top-of-plot → end-of-plot → next-plot-start, alternating left↔right.
- Both terraced slope and zigzag flow confirmed by VLM vision verification.
- All captions and the gallery description in TH/EN updated to describe the explicit zigzag pattern.

---
Task ID: 7
Agent: main
Task: Regenerate the cross-section image so each plot shows clearly alternating water flow direction (Plot 1 L→R, Plot 2 R→L, Plot 3 L→R, Plot 4 R→L).

Work Log:
- First attempt with image-generation AI: model kept rendering all arrows pointing right, didn't alternate directions.
- Verified via VLM: only (1) and (2) passed; (3), (4), (5), (6) all failed because arrows all pointed right.
- Second attempt with explicit directional text "L→R" and "R→L" labels above arrows: model still didn't alternate.
- Switched approach: hand-crafted an SVG diagram (`/public/plots/cross-section.svg`) with:
  - 4 terraced plots stacked vertically down the slope.
  - Plot 1 (top): blue arrow #1 going LEFT→RIGHT with label "1 → น้ำไหลซ้าย→ขวา (L→R)".
  - Drop arrow #2 from right end of plot 1 down to right end of plot 2.
  - Plot 2: blue arrow #3 going RIGHT→LEFT with label "← 3 น้ำไหลขวา→ซ้าย (R→L)".
  - Drop arrow #4 from left end of plot 2 down to left end of plot 3.
  - Plot 3: blue arrow #5 going LEFT→RIGHT.
  - Drop arrow #6 from right end of plot 3 down to right end of plot 4.
  - Plot 4 (bottom): blue arrow #7 going RIGHT→LEFT.
  - Vetiver grass bunds (deep green) on the outer edge of each plot (alternating sides for zigzag).
  - Tea/coffee bushes inside each plot.
  - Summary legend at the bottom listing all 4 plot directions + design params.
- Converted SVG → PNG (1344×768, 66KB) via sharp library at high density (200).
- Re-verified via VLM:
  - (1) 4 terraced plots: YES
  - (2) Plot 1 L→R: YES
  - (3) Plot 2 R→L (alternating): YES
  - (4) Plot 3 L→R (alternating): YES
  - (5) Plot 4 R→L (alternating): YES
  - (6) Overall zigzag pattern L→R, R→L, L→R, R→L: YES
- Verified in browser via Agent Browser: new image loads at 1344×768.
- Lint clean, dev server stable.

Stage Summary:
- Cross-section now shows the EXACT zigzag water flow the user requested: Plot 1 (L→R) → drop → Plot 2 (R→L) → drop → Plot 3 (L→R) → drop → Plot 4 (R→L).
- All 6 verification points pass via VLM vision analysis.
- Image is now hand-crafted SVG → PNG (66KB) instead of AI-generated (125KB), so the directional arrows are perfectly accurate.
- The SVG source is also saved at /public/plots/cross-section.svg for future edits.

---
Task ID: 8
Agent: main
Task: (1) Make sediment-trapping amounts realistic per plot area + shape; (2) Add VVB verification menu covering project start + per-cycle verifications; (3) Build a comprehensive verification report.

Work Log:
- Added VerificationRound Prisma model (roundType validation/verification, roundNumber, status planned/in_review/verified/rejected, vvbName/email, creditsClaimed/Verified, deductionsPct, findings JSON, statement, evidenceHashes).
- Linked Farm → verifications[] relation.
- Rewrote sediment trap computation in seed.ts as a physical model:
  - Per-trap catchment ~50-100 m² (small sub-plot draining into trap, NOT the whole farm).
  - trap_physical_area = clamp 3-6 m² (≈0.5% of per-plot catchment).
  - sediment_mass_t = erosion_rate_t_per_ha_yr × trap_catchment_ha × trapping_efficiency × years × ±15% variation.
  - sediment_volume_m³ = mass / bulk_density (1.3).
  - deltaHcm = volume / trap_area × 100 (rounded to 1 dp, min 5 cm).
- Per-farm erosion inputs (USLE-style baseline + design efficiency):
  - Demo (50 ha, 3.5% slope, flat): 8 t/ha/yr, 0.45 efficiency → 5 cm traps (min, realistic for flat field).
  - Tea farm (5.2 ha, 28% slope, terrace+vetiver+dam): 55 t/ha/yr, 0.75 → 14-17 cm traps.
  - Coffee (4 ha, 35% slope, full design): 75 t/ha/yr, 0.78 → 19-24 cm traps.
  - Rotation crops (7 ha, 18% slope): 35 t/ha/yr, 0.65 → 8-10 cm traps.
  - Mixed tea+coffee (6.5 ha, 40% slope, full design): 95 t/ha/yr, 0.82 → 27-34 cm traps.
  - Numbers correlate realistically with slope and design — verified via debug script.
- Added 3 verification rounds per farm in seed:
  - R0 (validation): at project start, status verified, with 4 findings (boundary, baseline, additionality, methodology).
  - R1 (verification): 5 years later, status verified, with 4 findings (soil_samples, sediment, uncertainty, audit) + 5% deduction.
  - R2 (verification): planned, future date range (showing the per-cycle workflow).
- Built 3 API routes:
  - GET/POST /api/vvb/[farmId] — list + create verification rounds, with credit comparison + audit trail + sediment totals.
  - PATCH/DELETE /api/vvb/[farmId]/[roundId] — update/delete a round.
  - GET /api/vvb/[farmId]/report — comprehensive report data: project, baseline, current, sediment, activities, credit calc, finance (with dMRV benefit), audit, all verification rounds.
- Added 50+ new translation keys for VVB section (TH/EN): title, desc, tab labels, round type, status, period, VVB name, credits claimed/verified, deductions, findings, statement, evidence labels, report labels.
- Added `vvb` to SectionId type, sidebar nav (BadgeCheck icon), topbar label map, and app-shell section switching.
- Built src/components/sections/vvb-section.tsx (~700 lines):
  - 3 sub-tabs: Rounds | Evidence | Report.
  - Rounds tab: card list of validation + verification rounds with status badges, VVB info, findings (with severity-colored badges), VVB statement (border-l-4 emerald), credits claimed/verified.
  - Evidence tab: audit trail status (valid/broken), sediment totals (volume/mass/C/CO2e), samples + activities counts, credit comparison table (highlighting the farm's standard).
  - Report tab: button to open full report modal.
- Built VvbReportDialog modal with comprehensive report body:
  - 7 sections: Project info | Baseline | Monitoring (sediment + activities) | Credit calculation (table) | Financial (NPV/IRR/Payback/Breakeven) | Audit trail (valid/broken) | Verification rounds.
  - Print header (only visible when printing) with generation date + farm ID.
  - Action bar: Print/Download PDF button (uses window.print()) + Close.
  - Print CSS added to globals.css (hide everything except modal, page margins 1.5cm, break-inside: avoid).

Stage Summary:
- Sediment trap amounts now scale realistically with farm area, slope, and design efficiency (5-34 cm depending on conditions).
- VVB section added to nav menu (9 sections now: Dashboard, Farms, Samples, Sediment, Calculator, Standards, Audit, VVB, Guide).
- VVB section has 3 sub-tabs: Rounds (validation + per-cycle verifications), Evidence (audit trail + sediment + samples + activities + credit calc), Report (full comprehensive modal).
- Comprehensive report modal supports print-to-PDF via window.print(), with all project data, baseline + current samples, monitoring data, credit calculation table, financial analysis (with dMRV benefit), audit trail status, and all verification rounds with VVB findings + statements.
- Lint clean, dev server stable, page renders 200 OK, all API endpoints return correct data.

---
Task ID: 9
Agent: main
Task: Make sediment-trap amounts realistic per plot area + slope + design. The displayed totals should be the BIG total across all 7-10 terrace levels, not just the small sample captured in monitoring traps.

Work Log:
- Created `src/lib/sediment-estimate.ts` with helpers:
  - `estimateErosionFromSlope()` — USLE-style lookup: 5 t/ha/yr (flat) → 120 t/ha/yr (extreme slope).
  - `estimateTrappingEfficiency()` — sum of design components (terrace_step +0.18, vetiver_bund +0.15, check_dam +0.10, alternating_slope +0.08, etc.), capped at 0.85.
  - `computeNumTerraceLevels()` — flat: 1-2; gentle: 2-4; highland: 7-10 based on slope.
  - `computeEstimatedSedimentTotal()` — computes the BIG total = erosion × area × efficiency × project_age (covers all 7-10 levels) + the small monitoring-trap sample.
- Updated seed.ts:
  - Increased Nan farm areas (more realistic for community-managed highland): tea 5.2→32 ha, coffee 4→25 ha, rotation 7→40 ha, mixed 6.5→28 ha. Demo stays 50 ha (flat).
  - Rewrote `computeRealisticSedimentTraps()`:
    - numTraps = 7-10 for highland (one per terrace level), 2-4 for gentle, 1-2 for flat.
    - Per-trap physical area: 4 m² (small monitoring structure).
    - Per-trap monitoring catchment: 50 m² (small sub-catchment at level's outlet).
    - Per-trap depth = erosion × small_catchment × efficiency × years × variation / (bulk_density × trap_area) → realistic 5-43 cm range.
    - Trap IDs: `DE-L01-TRAP`, `NA-L09-TRAP` etc. (L = level number).
- Updated `/api/sediment/route.ts` GET to return:
  - `measurements` (per-trap data with depths — small sample)
  - `farmTotals` (per-farm breakdown: sample + estimated BIG total + terrace levels)
  - `aggregate` (cross-farm totals: sample volume/mass + estimated BIG total)
- Updated `/api/dashboard/route.ts` to also return `estimatedSediment` (BIG totals across all farms).
- Rewrote `sediment-section.tsx` UI:
  - Top card: BIG estimated total (gradient emerald→violet) with 4 KPIs (volume/mass/C/CO2e) + "38 ชั้น terrace" badge.
  - Middle card: per-farm breakdown table (8 columns: แปลง, พื้นที่, ความชัน, ชั้น, Traps, ตะกอน/ชั้น, รวม (t), CO₂e (t)).
  - Bottom card (dashed border): "ตัวอย่างที่จับในกับดักมอนิเตอร์ริ่ง" — small sample with note explaining it's a verification sample.
  - Trap detail table unchanged.

Stage Summary:
- All farms now show realistic BIG totals (computed via USLE erosion × area × efficiency × years, summing all 7-10 terrace levels):
  - Demo (50 ha, 3.5% slope): 1,816 t = 1,397 m³ (across 2 levels)
  - Tea (32 ha, 28%): 8,275 t = 6,366 m³ (across 9 levels, 920 t/level)
  - Coffee (25 ha, 35%): 9,951 t = 7,654 m³ (across 10 levels, 995 t/level)
  - Rotation (40 ha, 18%): 5,527 t = 4,251 m³ (across 7 levels, 790 t/level)
  - Mixed (28 ha, 40%): 15,370 t = 11,823 m³ (across 10 levels, 1,537 t/layer)
  - **Total: 40,938 t = 31,491 m³, 573.1 t C = 2,102 tCO₂e across 38 levels**
- Per-trap depths remain realistic (5-43 cm), scaling with slope and erosion.
- Sample captured in monitoring traps (small): 36.27 m³ = 47 t — clearly labeled as verification sample.
- Lint clean, dev server stable, page renders 200 OK.

---
Task ID: 10
Agent: main
Task: Add biochar option to the credit calculator + management activities for permanent carbon storage boost.

Work Log:
- Extended `src/lib/core/credits.ts` with biochar calculation:
  - Added 3 new optional fields to `CreditInput`: `biocharRateTPerHa`, `biocharCarbonPct` (default 70), `biocharStabilityFactor` (default 0.8).
  - Added 3 new fields to `CreditResult`: `biocharCo2eT`, `biocharCStockT`, `socGrossCo2eT`.
  - Exported new `computeBiocharCredits()` helper: C_persistent = rate × area × C_pct × BC+100, CO2e = C × 44/12 (per VCS Biochar Methodology + IPCC 2019 Refinement).
  - In `computeForRule()`: gross = socGross + biochar.co2eT — biochar adds to total credits before emissions/leakage/buffer/uncertainty deductions.
- Updated `/api/calculate/credits` route — automatically picks up the new fields via the CreditInput type.
- Updated `/api/dashboard/route.ts` — checks for `biochar_application` activity on the first farm and passes biocharRateTPerHa + carbonPct + stability to `compareAllStandards()` so the dashboard creditComparison reflects the biochar bonus when present.
- Updated Prisma schema comment for `ManagementActivity.activity` to include `biochar_application`.
- Added 25 new bilingual translations for biochar: title, enable toggle, full description (TH/EN), rate/source/carbonPct/stability inputs, stability hint, preview labels (C/ha, CO2e/ha, total), feedstock options (rice husk, wood, corn cob, manure).
- Updated `calculator-section.tsx` CreditsTab:
  - Added biochar state: `biocharEnabled`, `biocharRate`, `biocharCarbonPct`, `biocharStability`, `biocharSource`.
  - Built amber-themed biochar panel below the SOC sample field, with toggle switch + 4 inputs (rate, source, carbon%, stability).
  - Live preview box (gradient amber→emerald) showing C/ha, CO2e/ha, and total biochar CO2e based on current area.
  - Passes biochar fields to API when computing.
  - Updated result table: conditionally shows a new "Biochar" column (with Flame icon + amber text) when any standard's `biocharCo2eT > 0`. The cell shows `+32.853` (added) or `—` (none).
- Updated `seed.ts` to add a `biochar_application` activity to Nan-4 (Mixed Tea & Coffee — steepest slope, full design): applied 12.5 t/ha biochar from rice husk, with note "ใส่ biochar จากแกลบข้าว อัตรา 12.5 t/ha (C 70%, BC+100 = 0.80)".

Stage Summary:
- Biochar option now available in the Credits tab of the Calculator:
  - Toggle switch (default OFF) — when ON, shows 4 inputs + live preview.
  - Default: 2 t/rai (= 12.5 t/ha), 70% C, 0.80 BC+100 stability.
  - For 50 ha farm (312.5 rai): adds 32.853 tCO₂e to total credits.
- Verified end-to-end via Agent Browser (TH mode):
  - Switch ON: live preview shows "C ถาวร/ไร่ 0.179 t C", "CO₂e/ไร่ 0.657 tCO₂e", "CO₂e รวมจาก biochar 32.9 tCO₂e".
  - Compute with biochar ON: result table shows new "Biochar" column with `+32.853` for all 4 standards.
  - T-VER net = 678.993 tCO₂e (up from 649.425 without biochar — gain of 29.568 tCO₂e after 10% buffer deduction).
  - Switch OFF: biochar column disappears, credits return to original values.
- Lint clean, dev server stable, page renders 200 OK.

---
Task ID: 11
Agent: main
Task: Replace the hand-drawn SVG cross-section diagram with a realistic color photo + transparent SVG arrow overlay showing zigzag water flow.

Work Log:
- Generated a photorealistic cross-section image of a highland terraced farm via z-ai image (1344×768, 276KB):
  - 4 terrace levels descending a mountain slope.
  - Brown loam soil terraces 1.5 m wide.
  - Dense deep-green vetiver grass clumps on outer bunds.
  - Small tea bushes and arabica coffee plants inside each terrace.
  - Mountain topographic background with golden hour lighting.
  - NO text, NO arrows, NO labels (arrows come from the overlay).
  - Saved as /public/plots/cross-section-photo.png.
- Created a transparent SVG overlay /public/plots/cross-section-overlay.svg (8.9KB) with:
  - Title strip at top: "ภาพตัดขวางของแปลงขั้นบรรได — น้ำไหลซิกแซกสลับซ้าย-ขวา"
  - 4 numbered arrows with badges 1, 3, 5, 7 (each on its own plot):
    - Plot 1 (top, y≈155): arrow #1 L→R + label "น้ำไหลซ้าย→ขวา (L→R)"
    - Plot 2 (y≈285): arrow #3 R→L + label "น้ำไหลขวา→ซ้าย (R→L)"
    - Plot 3 (y≈415): arrow #5 L→R + label "น้ำไหลซ้าย→ขวา (L→R)"
    - Plot 4 (bottom, y≈545): arrow #7 R→L + label "น้ำไหลขวา→ซ้าย (R→L)"
  - Drop arrows #2, #4, #6 with badges between plots:
    - #2: right side (from end of plot 1 down to start of plot 2)
    - #4: left side (from end of plot 2 down to start of plot 3)
    - #6: right side (from end of plot 3 down to start of plot 4)
  - Each arrow + badge has white outline for contrast against the photo.
  - Bottom legend strip (semi-transparent dark background) with full summary of all 4 plot directions.
- Updated `PlotDesignImage` helper in dashboard-section.tsx to accept an optional `overlaySrc` prop — renders the overlay as a second <img> absolutely positioned on top of the base image.
- Updated the cross-section PlotDesignImage call:
  - src: "/plots/cross-section-photo.png" (was "/plots/cross-section.png")
  - overlaySrc: "/plots/cross-section-overlay.svg"
  - title + caption unchanged.
- Old hand-drawn SVG + PNG kept on disk for reference (not referenced in UI anymore).

Stage Summary:
- Cross-section gallery card now shows a photorealistic image of terraced highland farm (tea/coffee + vetiver grass + brown soil + mountain backdrop) with overlaid blue numbered arrows showing the exact zigzag water-flow pattern (L→R, R→L, L→R, R→L).
- Verified end-to-end via VLM (z-ai vision, glm-5v-turbo) using a screenshot of the gallery card from the browser:
  - (1) Photorealistic terraced farm image: YES
  - (2) Blue numbered arrows 1-7 visible: YES
  - (3) Plot 1 (top) arrow points right (L→R): YES
  - (4) Plot 2 arrow points left (R→L), alternating: YES
  - (5) Overall zigzag pattern L→R, R→L, L→R, R→L: YES
- Lint clean, dev server stable, page renders 200 OK, both image files served correctly (photo 281KB, overlay 8.9KB).

---
Task ID: 12
Agent: main
Task: Add import menu for new farms/projects + conditional activity recording + IoT sensor data integration.

Work Log:
- Added 3 new Prisma models:
  - IoTReading (sensorId, sensorType, value, unit, measuredAt, metadata, farmId FK)
  - ActivityRule (name, sensorType, operator, threshold, activity, enabled, cooldownHr, lastFiredAt, firedCount)
  - ImportLog (filename, source, rowsTotal/Ok/Failed, errors)
  - Linked all to Farm model via relations (iotReadings[], activityRules[]).
- Created 5 new API routes:
  - POST /api/iot/ingest — accepts single or batch IoT readings, evaluates all active rules, and auto-logs management activities when conditions are met (with cooldown check).
  - GET /api/iot — lists recent readings (filter by farmId/sensorType).
  - GET/POST /api/activities/rules — list and create conditional rules.
  - PATCH/DELETE /api/activities/rules/[ruleId] — toggle/update/delete rules.
  - POST /api/activities — manually log a new activity.
  - POST /api/farms/import — CSV text or JSON array → bulk-create farms (auto-detects header, builds GeoJSON from bbox, validates).
- Added 'import' to SectionId, sidebar nav (Upload icon), topbar labels, app-shell section switching.
- Built src/components/sections/import-section.tsx with 4 sub-tabs:
  1. **ข้อมูล IoT** — live readings table + "ส่งค่าจำลอง IoT" button (sends soil_moisture=15% to trigger the low-moisture rule) + endpoint info.
  2. **กฎอัตโนมัติ** — create new rule form (name, sensorType, operator, threshold, activity, cooldown) + existing rules list with toggle switch + firedCount/lastFired display.
  3. **กิจกรรมการจัดการ** — log new activity form + activities list (auto-fired activities tagged with [AUTO] badge).
  4. **นำเข้าแปลง** — CSV textarea (pre-filled with sample) + import button + result summary (total/ok/failed + error details).
- Seeded demo data: 12 IoT readings across 5 farms (soil_moisture, temperature, rainfall, humidity, ec) + 3 conditional rules (low moisture < 20%, heavy rainfall > 30mm, high temp > 35°C).
- Fixed Prisma client naming: model `IoTReading` → property `ioTReading` (capital T in camelCase conversion).

Stage Summary:
- Full IoT pipeline works end-to-end:
  1. IoT sensor sends reading → POST /api/iot/ingest
  2. System saves reading + evaluates all active rules
  3. If condition matches + cooldown expired → auto-logs management activity with [IoT auto-fired] note
  4. Activity appears in Activities tab with [AUTO] badge
- Verified via Agent Browser:
  - 12 IoT readings visible in the IoT tab
  - 3 rules visible in the Rules tab (all enabled)
  - "ส่งค่าจำลอง IoT" button → sends soil_moisture=15% → toast "saved: 1, fired rules: 1"
  - API verification: new activity "fertiliser" on demo-farm-001 with note "[IoT auto-fired] Low soil moisture → auto-irrigation alert — soil_moisture = 15% (< 20)"
  - Rule firedCount incremented to 1, lastFiredAt set.
- CSV import: pre-filled with sample CSV (2 demo farms), import button creates farms via /api/farms/import.
- Lint clean, dev server stable, page renders 200 OK.

---
Task ID: 13
Agent: main
Task: (1) Remove "add farm" button from Dashboard top — should be in sidebar only. (2) Clarify "พื้นที่กับดัก (m²)" label. (3) Fix per-farm trap data to be realistic.

Work Log:
- Removed the "เพิ่มแปลงใหม่" button from the Dashboard's empty-state card. Replaced with a text-only message: "ไปที่เมนู 'แปลงเกษตร' ทางซ้ายเพื่อเพิ่มแปลงใหม่ พร้อมระบุพิกัดขอบเขตแปลงบนแผนที่" (EN: "Go to 'Farms' in the left sidebar to add a new farm with GPS boundary"). The Farms section remains the primary entry point for adding farms (accessible via sidebar nav).
- Updated sediment labels in translations (TH + EN):
  - "พื้นที่กับดัก (m²)" → "พื้นที่กับดักมอนิเตอร์ริ่ง (m²)" (Monitoring Trap Area — clarifies this is the physical monitoring structure, NOT the farm's total sediment-trap area)
  - "ความสูงตะกอน (cm)" → "ความสูงตะกอนสะสม (cm)" (Accumulated Sediment Depth — clearer that it's the depth of sediment accumulated in the trap)
  - EN equivalents updated too.
- Rewrote `computeRealisticSedimentTraps()` in seed.ts:
  - Trap physical area now VARIES per farm: `baseTrapArea = clamp(3, 6.5, 3 + areaHa/20)` — bigger farms have slightly bigger monitoring structures. Each trap also gets ±15% variation.
  - Monitoring catchment now varies per level: `(50 + i*3) / 10000` ha — upper levels have slightly larger catchments.
  - Trap IDs now use farm-specific codes: `DEMO`, `NAN01`, `NAN02`, `NAN03`, `NAN04` + level number (L01-L10) + trap type code (CD=CheckDam, VB=VetiverBund). Example: `NAN04-L07-CD` = Nan farm 4, Level 7, Check Dam trap.
  - Removed generic prefix "NA" / "DE" that was used before.

Stage Summary:
- Dashboard no longer has any "add farm" button — the sidebar "แปลงเกษตร" nav item is the sole entry point.
- Sediment table column headers clarified:
  - "พื้นที่กับดักมอนิเตอร์ริ่ง (m²)" = physical monitoring trap area (3-6 m²)
  - "ความสูงตะกอนสะสม (cm)" = accumulated sediment depth in the trap (5-53 cm)
- Per-farm trap data is now realistic and unique per farm:
  - Demo (50 ha): 2 traps, DEMO-L01~L02-CD, area 4.7-6.3 m², depth 5 cm (min, flat)
  - Tea (32 ha): 9 traps, NAN01-L01~L09-CD, area 3.96-5.24 m², depth 17-26 cm
  - Coffee (25 ha): 10 traps, NAN02-L01~L10-CD, area 3.66-4.85 m², depth 27-41 cm
  - Rotation (40 ha): 7 traps, NAN03-L01~L07-CD, area 4.3-5.45 m², depth 9-12 cm
  - Mixed (28 ha): 10 traps, NAN04-L01~L10-CD, area 3.78-5.02 m², depth 34-53 cm
- Lint clean, dev server stable, page renders 200 OK.

---
Task ID: 14
Agent: main
Task: Fix hydration mismatch error — "server rendered HTML didn't match the client".

Work Log:
- Found 3 root causes of hydration mismatch:
  1. **`Math.random()` in vvb-section.tsx** (line 432) — generating a fake "chain head" hash during render. Server and client produce different random values → mismatch.
  2. **`calendar: "buddhist"` in i18n provider's `fmtDate`** — Node.js server doesn't support Buddhist calendar, causing it to silently fall back to Gregorian. Browser supports it. Server renders Gregorian year (2024), client renders Buddhist year (2567) → mismatch.
  3. **`new Date()` in useState initializers** — `useState(new Date().toISOString().slice(0, 10))` in 3 dialog components (import-section, sediment-form-dialog, sample-form-dialog). Server and client compute different dates if timezones differ.
  4. **`new Date().toLocaleString()` in vvb-section print header** — renders differently on server vs client.
  5. **`useI18n()` called inside JSX** in import-section.tsx (lines 68, 71, 74, 77) — violating React's Rules of Hooks. Each `useI18n()` call inside JSX creates a separate hook invocation, causing inconsistent render output.

- Fixes applied:
  1. Replaced `Math.random()` hash display with deterministic text: `${audit.totalRecords} records verified`.
  2. Replaced `calendar: "buddhist"` with `calendar: "gregory"` + manual year adjustment (+543 for Thai). This produces the same Buddhist Era year on both server and client without relying on ICU calendar support.
  3. Replaced all `useState(new Date().toISOString().slice(0, 10))` with `useState("")` — the date is set later via user input or API response, not during initialization.
  4. Replaced `new Date().toLocaleString()` in print header with `data?.meta?.generatedAt ?? "—"` (from API response, consistent server/client).
  5. Moved `useI18n()` call from inside JSX to the top of `ImportSection` component: `const { t } = useI18n();` then used `t("import.tab.iot")` etc. in JSX.

Stage Summary:
- All hydration errors eliminated — verified via Agent Browser with fresh browser session:
  - No errors in `agent-browser errors` output.
  - No hydration/mismatch messages in console.
  - All 9 sections (Dashboard, Farms, Samples, Sediment, Calculator, Standards, Audit, VVB, Import+IoT, Guide) navigate cleanly without errors.
- Lint clean, dev server stable, page renders 200 OK.

---
Task ID: 1
Agent: subagent
Task: Add farm selector to calculator CreditsTab

Work Log:
- Read prior worklog (Tasks 1-14) to understand the codebase context, especially Tasks 2 (rai/ha conversion + i18n helpers), 4 (dMRV finance panel), and 10 (biochar panel in CreditsTab).
- Inspected `/api/farms` (GET returns `{ farms: [{ id, nameTh, nameEn, areaHa, ... }] }`) and `/api/soil-samples?farmId=X` (GET returns `{ samples: [{ id, socPct, bulkDensity, coarseFragPct, isBaseline, ... }] }`).
- Confirmed `useQuery` from `@tanstack/react-query` is already wired up project-wide via `src/components/query-provider.tsx` and used in `farms-section.tsx` + `samples-section.tsx` with query keys `["farms"]` and `["soil-samples", farmId]` — reused the same cache keys.
- Confirmed the SOC stock formula `(socPct/100) × BD × depthCm × (1 − cf/100) × 100` matches the existing engine in `src/lib/core/soc.ts` (`stockPerHa`).
- Added 8 new bilingual translation keys to `src/lib/i18n/translations.ts` (in both `th` and `en` blocks, inserted right after `calc.credits.result` and before `calc.biochar.*`):
  - `calc.farmSelect`         — TH: "เลือกแปลงเพื่อเติมค่าอัตโนมัติ" / EN: "Select farm to auto-fill" (placeholder, per task spec)
  - `calc.farmSelectLabel`    — TH: "เลือกแปลง" / EN: "Select farm" (label, per task spec)
  - `calc.farmSelectCalc`     — TH: "คำนวณจากข้อมูลแปลงจริง" / EN: "Calculate from actual farm data" (button, per task spec)
  - `calc.farmSelectEmpty`    — TH: "— ยังไม่เลือกแปลง —" / EN: "— No farm selected —" (de-select option)
  - `calc.farmSelectLoading`  — TH: "กำลังโหลดแปลง…" / EN: "Loading farms…"
  - `calc.farmSelectNoSamples`— TH: "แปลงนี้ยังไม่มีตัวอย่างดิน ไม่สามารถเติมค่าอัตโนมัติได้" / EN: "No soil samples for this farm — cannot auto-fill"
  - `calc.farmSelectFilled`   — TH: "เติมค่าจากข้อมูลแปลงจริงแล้ว" / EN: "Filled with actual farm data"
  - `calc.farmSelectHint`     — TH/EN descriptive hint pointing user to pick a farm then click the button.
- Modified `src/components/sections/calculator-section.tsx`:
  - Imported `useQuery` from `@tanstack/react-query`, the shadcn `Select` family (`Select, SelectContent, SelectItem, SelectTrigger, SelectValue`), and two new lucide icons (`MapPin`, `Database`).
  - Added two new module-level interfaces above the `CreditsTab` function: `FarmOption` (id/nameTh/nameEn/areaHa) and `SoilSampleOption` (id/socPct/bulkDensity/coarseFragPct/isBaseline) — typed narrowly to only the fields the tab actually consumes.
  - Added `selectedFarmId` state + two `useQuery` calls inside `CreditsTab`:
    - `["farms"]` query (reuses the shared cache key, so navigating to Farms first warms this tab too).
    - `["soil-samples", selectedFarmId]` query (gated with `enabled: !!selectedFarmId` so we only hit the API after the user picks a farm).
  - Added `socStockFromSamples(group)` helper that applies the exact formula the task specified: `(mean_soc_pct / 100) × mean_bulk_density × 30 × (1 − mean_coarse_frag_pct/100) × 100` — means are computed across all samples in the group (baseline vs current).
  - Refactored `compute()` to accept an optional `overrides?: { baseline?, current?, area?, samples? }` argument. When called with no args it reads from state (preserves the existing "Compare All Standards" button behavior). When called from `applyFarmData()` it receives the freshly-computed values so it doesn't have to wait a React render cycle for state to flush — this avoids the classic race where `setBaseline(x); compute();` would compute with the stale value.
  - Added `applyFarmData()` async function that:
    1. Guards against empty `selectedFarmId`, missing farm, missing samples, or missing baseline/current sub-groups (each path shows a localized toast).
    2. Computes `newArea = isThai ? haToRai(farm.areaHa) : farm.areaHa` (so TH shows rai, EN shows ha — matches the locale-aware pattern already used throughout the app).
    3. Computes `baselineStock` and `currentStock` via `socStockFromSamples()` for the baseline and current sample groups respectively.
    4. Builds `samplesStr` as a comma-separated list of the current samples' `socPct` values.
    5. `setBaseline/setCurrent/setArea/setSamples` with the new values (so the user sees the auto-filled inputs).
    6. Fires a success toast, then `await compute({ baseline, current, area, samples })` to immediately compute credits from the auto-filled values.
  - Inserted a new emerald-accented "farm selector" panel at the very top of the CreditsTab form `CardContent`, above the existing inputs grid. The panel contains:
    - A `MapPin` icon + label "เลือกแปลง / Select farm".
    - A shadcn `Select` dropdown with placeholder `calc.farmSelect`, a "— No farm selected —" de-select item (value `"none"`, mapped to `""` in state), and one item per farm showing `{farmName} · {areaHa fmtArea}`. Loading and empty states render inline text inside the dropdown content.
    - A descriptive hint paragraph (`calc.farmSelectHint`).
    - A `variant="secondary"` button labeled "คำนวณจากข้อมูลแปลงจริง / Calculate from actual farm data" with the `Database` icon. Button is disabled until a farm is selected, while samples are fetching, or while compute is running. Clicking it calls `applyFarmData()`.
  - Updated the existing "Compare All Standards" button's `onClick={compute}` to `onClick={() => compute()}` because `compute()` now accepts an optional overrides object that doesn't accept the React `MouseEvent` (TypeScript's `MouseEventHandler` was incompatible with the overrides param). All four other tab `compute()` functions are unaffected (they take no args).
  - Left the existing biochar panel and finance dMRV panel completely untouched — the farm selector is purely additive and sits above the existing input grid.

Stage Summary:
- Calculator's CreditsTab now offers an optional farm selector dropdown at the top of the form.
- Picking a farm and clicking "คำนวณจากข้อมูลแปลงจริง" auto-fills:
  - `area` with the farm's areaHa converted to the locale unit (rai for TH, ha for EN).
  - `baseline` SOC stock computed from the farm's `isBaseline:true` samples using the project's standard IPCC formula `(mean_soc_pct/100) × mean_BD × 30 × (1 − mean_CF/100) × 100`.
  - `current` SOC stock from the farm's `isBaseline:false` samples using the same formula.
  - `samples` field with the comma-separated SOC %C values from the current samples.
- Auto-fill triggers `compute()` immediately (via overrides, so no stale-state race), so the right-hand results panel updates in a single click.
- All four input fields remain fully editable after auto-fill; selecting "— No farm selected —" clears the dropdown without disturbing the inputs.
- Added 8 bilingual translation keys (TH + EN) covering the dropdown placeholder, label, button, empty/loading/no-samples/filled/hint states.
- Lint (`bun run lint`) passes clean. TypeScript check (`bunx tsc --noEmit`) reports no errors in `calculator-section.tsx` or `translations.ts` (the pre-existing errors in unrelated files like `iot/ingest/route.ts`, `dashboard-section.tsx`, `sample-form-dialog.tsx` were there before this task — verified by stashing the changes and re-running `tsc`).
- Dev server left untouched (per task instructions); the modified module is client-side and Next.js will hot-reload on next request.

---
Task ID: 15
Agent: main + subagent
Task: Make every menu have connected data — all sections should reference real farm data and cross-link to each other.

Work Log:
- **Calculator** (via subagent): Added farm selector dropdown to CreditsTab. When a farm is selected, auto-fills SOC baseline, current values, area (locale-aware rai/ha), and SOC samples from the farm's actual soil-sample data via /api/farms + /api/soil-samples. Added "คำนวณจากข้อมูลแปลงจริง" button that triggers compute with the filled values.
- **Dashboard**: Fixed credit comparison to prefer nan-farm-004 (has biochar + full design) instead of demo-farm-001 (flat, no biochar). Now shows realistic Nan highland credits with biochar bonus.
- **Audit**: Added `/api/audit/summary` endpoint that returns all farms' audit chain status in one query. Updated AuditSection UI to show a summary table at the top with ALL farms (name, standard, area, samples, status icon, record count). Clicking a row selects that farm for the detailed chain view below. Shows "5/5 ผ่าน" badge.
- **Standards**: Added `useQuery` to fetch all farms. Each standard card now shows a green badge with farm count (e.g., "3 แปลง" for TVER) + lists the farm names that use that standard as secondary badges.
- **Guide**: Added `useQuery` to fetch dashboard data. Shows a "สถิติระบบปัจจุบัน" (Current System Statistics) card at the top with 5 KPIs: farms (5), total area (175 ha), soil samples (60), sediment retained (40,940 t), total credits (tCO₂e).

Stage Summary:
- All 10 menu sections now have data that's connected and cross-referenced:
  - Dashboard → shows all 5 farms on map + KPIs + charts + credit comparison from Nan farm
  - Farms → each card shows samples, sediment, activities, crops, elevation
  - Samples → linked to farm + plot + audit hash
  - Sediment → per-farm breakdown table + per-trap detail with farm-specific IDs
  - Calculator → farm selector auto-fills from real farm data
  - Standards → each standard shows farm count + farm names using it
  - Audit → summary table of ALL farms' chain status + detailed view per farm
  - VVB → verification rounds + evidence (audit + sediment + credits) per farm
  - Import+IoT → IoT readings link to farms + rules fire activities
  - Guide → shows actual system statistics (farms/area/samples/sediment/credits)
- Lint clean, dev server stable, page renders 200 OK, all sections verified via Agent Browser.

---
Task ID: 16
Agent: main
Task: Allow separate verification costs for Year 1 (Validation) vs subsequent years (Verification) — dMRV reduces cost over time.

Work Log:
- Updated `src/lib/core/finance.ts` FinanceInput interface:
  - Added `verificationCostYear1` (first cycle, full cost)
  - Added `verificationCostSubsequent` (subsequent cycles, dMRV-reduced)
  - Kept `verificationCost` as deprecated fallback for backward compat.
- Updated `projectCashflow()`:
  - First verification cycle (y == verificationEveryYr) uses `costYear1`
  - Subsequent cycles use `costSubsequent`
  - `verificationCycleCount` tracks which cycle we're in.
- Updated FinanceTab UI in calculator-section.tsx:
  - Replaced single `verifyCost` field with two fields: `verifyCostY1` (150,000) + `verifyCostSub` (75,000)
  - dMRV reduction slider now auto-computes `adjCostSub = min(userInput, costY1 × (1 - reduction%))`
  - Baseline (no dMRV) uses costY1 for ALL cycles; adjusted uses costY1 for cycle 1 + adjCostSub for cycles 2+
  - Preview box shows "ค่าตรวจปีแรก (Validation)" = 150,000 (amber, "ยังไม่มีข้อมูล dMRV → ตรวจเต็มรอบ") + "ค่าตรวจปีถัดไป (Verification)" = 75,000 (emerald, with strikethrough on 150,000)
  - Cumulative benefit: "2 รอบถัดไป × 75,000" = 150,000 THB saved (not 3 cycles × save)
- Added translation keys: calc.fin.verifyCostY1 + calc.fin.verifyCostSub (TH + EN)
- API route passes through automatically (FinanceInput type handles new fields).

Stage Summary:
- Year 1 (Validation): 150,000 THB — full cost, no dMRV benefit (system just starting)
- Subsequent (Verification): 75,000 THB — 50% reduction from dMRV data
- Financial impact (28 ha, 10 yr, verify every 3 yr):
  - With split costs: NPV +73,882 THB, IRR 18.85%, total cost 650,000 THB
  - Without (all 150k): NPV -10,900 THB, IRR 5.59%, total cost 800,000 THB
  - dMRV saves 150,000 THB (2 subsequent cycles × 75k) → project turns viable!
- Lint clean, dev server stable, all fields verified in browser.

---
Task ID: 18
Agent: main
Task: Fix recurring hydration mismatch error — replaced all Intl-based formatting with manual formatting.

Work Log:
- Root cause: `Intl.DateTimeFormat("th-TH", ...)` and `Intl.NumberFormat("th-TH", ...)` can produce different output on Node.js server vs browser (different ICU versions, different month name abbreviations, different digit grouping).
- Previous fix (Task 14) changed `calendar: "buddhist"` to `calendar: "gregory"` + manual +543 year — but still used `Intl.DateTimeFormat("th-TH")` for month names, which can differ.
- This fix eliminates ALL Intl dependency from the render path:
  1. **fmtDate**: Replaced `Intl.DateTimeFormat("th-TH", {calendar:"gregory"})` with manual formatting using hardcoded Thai month abbreviations array (`TH_MONTHS_SHORT`) + English months (`EN_MONTHS_SHORT`). Format: `DD {month} {BE_year}`. Identical on server and client.
  2. **fmt**: Replaced `Intl.NumberFormat("th-TH")` with manual `formatNumber()` using `toFixed()` + regex comma insertion. Identical on server and client.
  3. **fmtArea**: Replaced `Intl.NumberFormat("th-TH")` in area.ts with same manual `toFixed()` + comma insertion.

Stage Summary:
- Zero Intl calls in the render path — all date/number formatting is manual and deterministic.
- Verified via Agent Browser: fresh session, all 10 sections navigated, no hydration errors, no console errors.
- Date formatting verified: "01 ธ.ค. 2567" (Buddhist Era) shows correctly in sediment table + dashboard activity feed.
- Number formatting verified: "312.50", "40,940", "6,882" all display correctly.
- Lint clean, dev server stable.
