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
