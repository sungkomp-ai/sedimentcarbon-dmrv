# SedimentCarbon dMRV — Digital MRV Platform

> **ระบบ Digital MRV สำหรับเกษตรดักตะกอนดินบนที่สูง**
>
> A Digital Measurement, Reporting, and Verification (dMRV) platform for
> sediment-trap agriculture carbon projects on highland farms. Supports
> T-VER, VCS, Gold Standard, and ISO 14064-2 standards with bilingual UI
> (TH/EN), IoT sensor integration, biochar carbon credits, and hash-chain
> audit trail.

---

## 📋 สารบัญ / Table of Contents

1. [ภาพรวมโครงการ / Overview](#-ภาพรวมโครงการ--overview)
2. [เทคโนโลยีที่ใช้ / Tech Stack](#-เทคโนโลยีที่ใช้--tech-stack)
3. [การติดตั้งและรัน / Setup](#-การติดตั้งและรัน--setup)
4. [สถาปัตยกรรมระบบ / Architecture](#-สถาปัตยกรรมระบบ--architecture)
5. [โมดูลหลัก / Core Modules](#-โมดูลหลัก--core-modules)
6. [API Endpoints](#-api-endpoints)
7. [ประวัติการพัฒนา / Development History](#-ประวัติการพัฒนา--development-history)
8. [การปรับปรุงล่าสุด / Recent Updates](#-การปรับปรุงล่าสุด--recent-updates)

---

## 🌱 ภาพรวมโครงการ / Overview

SedimentCarbon dMRV เป็นแพลตฟอร์มที่ช่วยให้ชุมชนเกษตรกรบนที่สูงสามารถ
เข้าถึงระบบคาร์บอนเครดิตได้โดยลดค่าใช้จ่ายจากการตรวจประเมิน เพิ่มรายได้จาก
คาร์บอนเครดิต และลดปัญหาการพังทลายหน้าดิน ดินโคลนถล่ม น้ำป่าไหลหลาก
และอุทกภัย พร้อมปรับสภาพแวดล้อมให้ยั่งยืน

### จุดเด่นของระบบ

- **📊 Dashboard ภาพรวม**: แผนที่ OSM/Satellite แสดงทุกแปลง + KPIs +
  กราฟเครดิต + ภาพประกอบแปลงขั้นบรรได
- **🗺️ จัดการแปลงเกษตร**: ฟอร์มลงทะเบียนแปลงใหม่ด้วยแผนที่ Leaflet
  (คลิกวาดขอบเขต + พิกัด GPS) + ข้อมูลพืชผล/ความสูง/มาตรฐาน
- **🧪 ตัวอย่างดิน SOC**: บันทึกผลวิเคราะห์ดินแบบ batch + hash chain
  audit trail (SHA-256) + ตารางดูค่าฐาน vs ปัจจุบัน
- **🏔️ ตะกอนดิน**: คำนวณปริมาณตะกอนสมจริง (USLE erosion × area ×
  efficiency × years) รวมทุกชั้น terrace (7-10 ชั้น) แยกจาก sample
  ในกับดักมอนิเตอร์ริ่ง
- **🧮 เครื่องคำนวณ**: 5 แท็บ (Credits, SOC Stock, Finance, Sample
  Adequacy, Aggregation) + เลือกแปลงเพื่อเติมค่าอัตโนมัติ + Biochar
  + dMRV ลดค่าตรวจปีแรก/ถัดไป
- **📏 มาตรฐาน**: เปรียบเทียบ T-VER/VCS/GS/ISO14064 + แสดงแปลงที่
  ใช้แต่ละมาตรฐาน
- **🔗 Audit Trail**: ตารางสรุปทุกแปลง (สถานะ chain ✓/✗) + ดู chain
  ละเอียดต่อแปลง
- **✅ VVB Verification**: Validation + Verification rounds + Evidence
  Pack + รายงานสมบูรณ์พิมพ์ PDF ได้
- **📡 Import + IoT**: นำเข้าแปลงจาก CSV + รับค่า IoT sensors +
  กฎอัตโนมัติ (เช่น soil_moisture < 20% → log irrigation)
- **📖 แนวทางใช้งาน**: สถิติระบบจริง + ขั้นตอน + บทบาทผู้ใช้

---

## 🔧 เทคโนโลยีที่ใช้ / Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 16 (App Router, Turbopack) | Modern SSR/SSG, API routes |
| **Language** | TypeScript 5 | Type safety throughout |
| **Styling** | Tailwind CSS 4 + shadcn/ui (New York) | Consistent design system |
| **Database** | Prisma ORM + SQLite | Lightweight, no external DB needed |
| **Maps** | Leaflet + react-leaflet (OSM/Esri tiles) | Real interactive maps with satellite toggle |
| **Charts** | Recharts | Dashboard visualizations |
| **i18n** | Custom context provider (TH/EN) | Buddhist Era dates for TH, no external runtime |
| **State** | Zustand (client) + TanStack Query (server) | Lightweight + caching |
| **Auth** | NextAuth.js v4 (available, not yet wired) | RBAC: Farmer/Aggregator/VVB/Admin |
| **Audit** | SHA-256 hash chain (crypto module) | No blockchain needed, append-only |
| **IoT** | HTTP POST endpoint + conditional rules engine | Auto-log activities from sensor data |
| **Carbon** | IPCC 2019 Refinement + VCS Biochar Methodology | Science-based calculations |

---

## 🚀 การติดตั้งและรัน / Setup

```bash
# Install dependencies
bun install

# Push Prisma schema to SQLite
bun run db:push

# Seed demo data (5 farms, 60 soil samples, 38 sediment traps, 3 IoT rules)
bun run src/lib/seed.ts

# Start dev server (port 3000)
bun run dev

# Lint check
bun run lint
```

### Environment

```env
DATABASE_URL=file:/home/z/my-project/db/custom.db
```

### Demo Data Summary

| Item | Count |
|------|-------|
| Farms | 5 (1 lowland + 4 Nan highland) |
| Soil samples | 60 (30 baseline + 30 current) |
| Sediment traps | 38 (7-10 per highland farm) |
| Management activities | 24+ |
| IoT readings | 12+ |
| Activity rules | 3 |
| Verification rounds | 15 (3 per farm) |

---

## 🏗️ สถาปัตยกรรมระบบ / Architecture

```
sedimentcarbon-dmrv/
├── prisma/
│   └── schema.prisma          # 11 models: User, Farm, MonitoringPlot,
│                              #   SoilSample, SedimentMeasurement,
│                              #   ManagementActivity, CreditCalculation,
│                              #   VerificationRound, IoTReading,
│                              #   ActivityRule, ImportLog
├── src/
│   ├── app/
│   │   ├── api/               # 23 API routes
│   │   │   ├── farms/         # CRUD + import CSV
│   │   │   ├── soil-samples/  # Hash chain on create
│   │   │   ├── sediment/      # Per-farm + estimated totals
│   │   │   ├── activities/    # CRUD + rules engine
│   │   │   ├── calculate/     # SOC, credits, financial, aggregation
│   │   │   ├── audit/         # Per-farm + summary endpoint
│   │   │   ├── vvb/           # Rounds + comprehensive report
│   │   │   ├── iot/           # Ingest + list
│   │   │   └── dashboard/     # Aggregated KPIs
│   │   ├── layout.tsx         # I18n + Theme providers
│   │   ├── page.tsx           # SPA entry (all sections)
│   │   └── globals.css        # Tailwind + print styles
│   ├── lib/
│   │   ├── core/              # 7 calculation engines (TS ports)
│   │   │   ├── soc.ts         # SOC stock, ESM, uncertainty, t-table
│   │   │   ├── emissions.ts   # N2O/CH4/fuel/lime (IPCC 2019)
│   │   │   ├── sediment.ts    # Trap volume/mass/carbon, USLE
│   │   │   ├── standards.ts   # 4 standards rules + buffer
│   │   │   ├── credits.ts     # Credit calc + biochar bonus
│   │   │   ├── finance.ts     # NPV/IRR/Payback + split verify costs
│   │   │   └── audit.ts       # SHA-256 hash chain
│   │   ├── i18n/              # Bilingual system
│   │   │   ├── translations.ts # 700+ keys (TH/EN)
│   │   │   ├── provider.tsx   # Context + fmtArea/fmtDate
│   │   │   └── area.ts        # ha↔rai conversion (1 ha = 6.25 rai)
│   │   ├── geo/               # GeoJSON helpers (replaces PostGIS)
│   │   ├── sediment-estimate.ts # USLE erosion × area × efficiency
│   │   ├── db.ts              # Prisma client singleton
│   │   └── seed.ts            # Demo data seeder
│   ├── components/
│   │   ├── layout/            # Sidebar, Topbar, AppShell
│   │   ├── sections/          # 10 section components
│   │   ├── fields/            # LeafletMap, MiniMap
│   │   └── ui/                # shadcn/ui (73 components)
│   └── hooks/                 # use-toast, use-mobile
├── public/
│   ├── plots/                 # AI-generated + SVG illustrations
│   │   ├── cross-section-photo.png  # Realistic terraced farm
│   │   ├── cross-section-overlay.svg # Zigzag water flow arrows
│   │   ├── aerial-view.png
│   │   └── plot-closeup.png
│   └── logo.svg
├── download/
│   └── DMRV-Project-Document.docx # Project proposal document
└── worklog.md                # Full development history
```

---

## 📦 โมดูลหลัก / Core Modules

### 1. Dashboard (ภาพรวม)

- OSM/Satellite map with all farm polygons + tooltips
- KPIs: farms, area (ไร่), samples, sediment (BIG total), credits
- Credit comparison chart by standard (from Nan farm with biochar)
- Plot design gallery (3 illustrations + design params legend)
- Recent activities feed

### 2. Farms (แปลงเกษตร)

- Farm cards with: area, elevation, slope, soil type, crops, trap types
- Farm form with Leaflet map (click to draw boundary + GeoJSON)
- Highland badge + former shifting cultivation badge
- Per-farm: sample count, sediment count, activities

### 3. Soil Samples (ตัวอย่างดิน)

- Batch entry (CSV paste) + single entry
- Hash chain on every sample (prev_hash → record_hash)
- Baseline vs current comparison + ΔSOC
- Links to farm + plot + audit hash

### 4. Sediment (ตะกอนดิน)

- BIG estimated total (USLE: erosion × area × efficiency × years)
- Per-farm breakdown table (ชั้น, traps, ตะกอน/ชั้น, รวม, CO₂e)
- Monitoring trap sample (small, for verification)
- Realistic per-trap data (3.66-6.3 m² area, 5-53 cm depth)
- Farm-specific trap IDs (e.g., NAN04-L07-CD)

### 5. Calculator (เครื่องคำนวณ)

5 sub-tabs:
- **Credits**: Farm selector auto-fills SOC/area/samples + biochar toggle +
  comparison across 4 standards
- **SOC Stock**: Layer-by-layer calculation
- **Finance**: Split verification costs (Year 1 vs subsequent) + dMRV
  adjustment panel (reduction slider + trust premium slider) + before/after
  comparison (MetricCompare)
- **Sample Adequacy**: t-statistic uncertainty + required sample size
- **Aggregation**: Cost/ha solo vs grouped

### 6. Standards (มาตรฐาน)

- 4 standard cards (T-VER/VCS/GS/ISO) with buffer, monitoring, crediting
- Farm count per standard + farm name badges
- Comparison table with additionality/permanence/registry

### 7. Audit (ตรวจสอบ)

- Summary table of ALL farms' chain status (clickable rows)
- Valid/broken badge + record count per farm
- Detailed chain view: #, payload, prev_hash, record_hash

### 8. VVB Verification (ตรวจรับรอง)

3 sub-tabs:
- **Rounds**: Validation (R0) + Verification (R1, R2...) with status,
  findings, VVB statement, credits claimed/verified
- **Evidence**: Audit trail + sediment totals + samples + credit comparison
- **Report**: Full comprehensive report modal with print-to-PDF (7 sections)

### 9. Import + IoT (นำเข้าข้อมูล + IoT)

4 sub-tabs:
- **IoT Data**: Live readings table + "Send simulated IoT" button
- **Auto Rules**: Create conditional rules (sensor + operator + threshold →
  activity) + toggle + fired count
- **Activities**: Log new activity + list with [AUTO] badge for IoT-fired
- **Import Farms**: CSV textarea + import button + result summary

### 10. Guide (แนวทางใช้งาน)

- System statistics card (farms, area, samples, sediment, credits)
- 6-step workflow
- 4 user roles (Farmer, Aggregator, VVB, Admin)

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Aggregated KPIs + map + charts |
| GET/POST | `/api/farms` | List/create farms |
| DELETE | `/api/farms/[id]` | Delete farm |
| POST | `/api/farms/import` | CSV bulk import |
| GET/POST | `/api/soil-samples` | List/create (hash chain on create) |
| GET | `/api/sediment` | List + per-farm totals + estimated |
| POST | `/api/sediment` | Create measurement |
| GET/POST | `/api/activities` | List/create activities |
| GET/POST | `/api/activities/rules` | List/create conditional rules |
| PATCH/DELETE | `/api/activities/rules/[id]` | Update/delete rule |
| POST | `/api/iot/ingest` | Receive IoT readings + fire rules |
| GET | `/api/iot` | List readings |
| POST | `/api/calculate/soc-stock` | SOC stock from layers |
| POST | `/api/calculate/credits` | Credits (single or compare all) |
| POST | `/api/calculate/financial` | NPV/IRR/Payback with dMRV |
| POST | `/api/calculate/sample-adequacy` | Uncertainty + required N |
| POST | `/api/calculate/aggregation` | Solo vs grouped cost |
| GET | `/api/audit/[farmId]` | Chain records + verify |
| GET | `/api/audit/summary` | All farms' audit status |
| GET | `/api/vvb/[farmId]` | Rounds + credit + audit + sediment |
| POST | `/api/vvb/[farmId]` | Create round |
| PATCH/DELETE | `/api/vvb/[farmId]/[roundId]` | Update/delete round |
| GET | `/api/vvb/[farmId]/report` | Comprehensive report data |
| GET | `/api/standards` | 4 standards comparison |
| GET | `/api/activities` | List activities |

---

## 📝 ประวัติการพัฒนา / Development History

### Phase 1 — Foundation (Task 1)

- Prisma schema: 11 models (User, Farm, MonitoringPlot, SoilSample,
  SedimentMeasurement, ManagementActivity, CreditCalculation,
  VerificationRound, IoTReading, ActivityRule, ImportLog)
- 7 core calculation engines ported from Python PDF spec to TypeScript:
  - `soc.ts`: SOC stock, ESM correction, t-table uncertainty, sample size
  - `emissions.ts`: N2O direct/indirect, CH4 from flooding, fuel, lime
  - `sediment.ts`: Trap volume/mass/carbon, USLE soil loss
  - `standards.ts`: 4 standards (T-VER/VCS/GS/ISO14064) rules + buffer
  - `credits.ts`: Credit calculation + biochar bonus + uncertainty deduction
  - `finance.ts`: NPV/IRR (bisection)/Payback/Breakeven/Aggregation
  - `audit.ts`: SHA-256 hash chain (stable JSON stringify)
- Bilingual i18n system (TH/EN) with Buddhist Era date formatting
- Geo utilities (polygon area, centroid, SVG projection)
- Seed script with PDF spec sample (50 ha, SOC 32.4→36.9 t C/ha)
- 9 API routes + 7 SPA sections + layout shell

### Phase 2 — Map + Area Units (Tasks 2-3)

- Real Leaflet map (OSM/Esri satellite/OSM topo tiles) replacing SVG
- Area units: ไร่ for TH, ha for EN (1 ha = 6.25 ไร่)
- Dashboard map showing all farm polygons + tile toggle + tooltips
- MiniMap with click-to-draw boundary (GeoJSON)

### Phase 3 — Nan Province Farms (Tasks 4-5)

- 4 Nan highland farms (tea, coffee, rotation crops, mixed)
- Expanded trap types: terrace_step, vetiver_bund, check_dam,
  alternating_slope
- Crop selection (tea, coffee_arabica, upland_rice, soybean, etc.)
- Plot design params (terrace width 1.5m, bund width 0.8m)
- 3 AI-generated illustrations + hand-crafted SVG cross-section with
  zigzag water flow arrows (L→R, R→L, L→R, R→L)

### Phase 4 — dMRV Financial Adjustment (Task 4-fin)

- dMRV adjustment panel in Finance tab
- 2 sliders: field audit reduction (%) + credit value uplift (%)
- Before/after comparison (MetricCompare component)
- Explainer card: why dMRV lowers cost + lifts credit value

### Phase 5 — VVB Verification (Task 8)

- VerificationRound Prisma model (validation + verification rounds)
- 3 sub-tabs: Rounds, Evidence Pack, Report
- Comprehensive report modal with print-to-PDF (7 sections)
- Validation at project start + verification per cycle

### Phase 6 — Realistic Sediment (Tasks 9, 13)

- USLE-based erosion estimation (slope → erosion rate)
- Trapping efficiency from trap_types (terrace + vetiver + dam + slope)
- BIG estimated total across 7-10 terrace levels
- Per-farm trap data: varying areas (3.66-6.3 m²), farm-specific IDs
  (NAN04-L07-CD), realistic depths (5-53 cm)

### Phase 7 — Biochar (Task 10)

- Biochar credits calculation (VCS Biochar Methodology)
- C_persistent = rate × area × C_pct × BC+100
- Toggle + inputs (rate, source, carbon%, stability)
- Result table: conditional "Biochar" column with Flame icon

### Phase 8 — Import + IoT (Task 12)

- CSV import for bulk farm creation
- IoT ingest endpoint (POST /api/iot/ingest)
- Conditional rules engine (sensor + operator + threshold → activity)
- Auto-logging when IoT data matches rule conditions (with cooldown)
- IoT simulator button for testing

### Phase 9 — Hydration Fix (Task 14)

- Fixed 5 root causes of hydration mismatch:
  1. Math.random() in render → replaced with deterministic text
  2. calendar:"buddhist" → manual +543 year for TH
  3. new Date() in useState → useState("")
  4. new Date().toLocaleString() → API-generatedAt
  5. useI18n() inside JSX → moved to component top

### Phase 10 — Data Connectivity (Task 15)

- Calculator: farm selector auto-fills from real data
- Audit: summary table of ALL farms (not just one)
- Standards: farm count per standard + farm names
- Guide: system statistics (farms/area/samples/sediment/credits)
- Dashboard: credit comparison from Nan farm (with biochar)

### Phase 11 — Split Verification Costs (Task 16)

- Separate Year 1 (Validation) vs Subsequent (Verification) costs
- dMRV reduces only subsequent cycles (Year 1 stays full)
- Financial impact: NPV -10,900 → +73,882 THB (project turns viable)

### Phase 12 — Project Document (Task 17)

- Generated DMRV project proposal as .docx (10 sections, 5 tables)
- Suitable for innovation for social funding applications

---

## 🔄 การปรับปรุงล่าสุด / Recent Updates

### v1.0.0 (Current)

- ✅ 10 menu sections with connected data
- ✅ 5 Nan highland farms (32-40 ha each, 7-10 terrace levels)
- ✅ Real Leaflet maps (OSM + satellite toggle)
- ✅ Area in ไร่ for TH, ha for EN
- ✅ Realistic sediment totals (40,938 t across 38 levels)
- ✅ Biochar option (32.9 tCO₂e bonus for 12.5 t/ha)
- ✅ dMRV split costs (Year 1: 150k, Subsequent: 75k)
- ✅ IoT ingest + conditional rules engine
- ✅ CSV import for new farms
- ✅ VVB verification + comprehensive report (print-to-PDF)
- ✅ Audit trail summary (all farms, 5/5 valid)
- ✅ Hash-chain SHA-256 (no blockchain needed)
- ✅ Bilingual TH/EN with Buddhist Era dates
- ✅ Dark/light theme
- ✅ Project proposal .docx document
- ✅ No hydration errors

### การปรับปรุงในอนาคต / Planned Updates

- [ ] NextAuth.js authentication (RBAC: Farmer/Aggregator/VVB/Admin)
- [ ] Remote sensing (NDVI from Sentinel-2)
- [ ] PDD document generation per standard
- [ ] Aggregation mode (bundle 100+ farms)
- [ ] Carbon credit registry integration (FTIX/Verra)
- [ ] Mobile app (Flutter offline-first)
- [ ] Real IoT device integration (LoRaWAN)
- [ ] Tier 2 emission factors (Thailand-specific)

---

## 📄 License

This project is developed as a social innovation platform for highland
agricultural communities in Thailand.

## 🙏 Acknowledgments

- IPCC 2019 Refinement for SOC methodology
- VCS Biochar Methodology for biochar credits
- T-VER (TGO) for Thailand carbon standard
- OpenStreetMap for map tiles
- Esri for satellite imagery
- shadcn/ui for component library
