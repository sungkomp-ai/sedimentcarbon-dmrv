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
