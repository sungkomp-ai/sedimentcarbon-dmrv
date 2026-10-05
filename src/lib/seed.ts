/**
 * Seed script for SedimentCarbon dMRV demo data.
 *
 * Initial farm: 50 ha flat field near Nakhon Ratchasima (PDF spec sample).
 * Plus three highland farms in Nan province, northern Thailand — formerly
 * shifting cultivation (ไร่เลื่อนลอย) converted to sediment-trap
 * agriculture with terraced plots, vetiver bunds, and check dams.
 *
 * Run with: bun run src/lib/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { recordHash } from "./core/audit";

const db = new PrismaClient();

interface SeedFarm {
  id: string;
  nameTh: string;
  nameEn: string;
  groupId: string;
  // [minLon, minLat, maxLon, maxLat] in degrees; we expand to a closed polygon
  bbox: [number, number, number, number];
  areaHa: number;
  slopePct: number;
  elevationM: number;
  soilType: string;
  trapTypes: string[];
  crops: string[];
  plotDesign: {
    terraceWidthM: number;
    bundWidthM: number;
    alternatingSlope: boolean;
    hasCheckDam: boolean;
    bundCrop: string;
  };
  priorLandUse: string;
  projectStart: string;
  standard: string;
  creditingYears: number;
  baselineSoc: number[]; // %C baseline values
  currentSoc: number[]; // %C current values
  baselineBd: number;
  currentBd: number;
  coarseFragPct: number;
  // erosionRateTPerHaYr is computed from slope + design (USLE-style).
  // Sediment traps are computed realistically from area × erosion × design.
  erosionRateTPerHaYr: number; // baseline (pre-project) erosion
  trappingEfficiency: number; // 0-1 fraction retained by the design
  // Management activities for the past year
  activities: { date: string; activity: string; nRate: number; note: string }[];
  // VVB info for verification rounds
  vvbName: string;
}

const FARMS: SeedFarm[] = [
  // ----- Original demo farm (PDF spec) -----
  {
    id: "demo-farm-001",
    nameTh: "แปลงสาธิตทุ่งกะเฉดา",
    nameEn: "Demo Field — Tung Kacha Daeng",
    groupId: "demo-group-001",
    bbox: [102.102, 14.97, 102.1086, 14.9764],
    areaHa: 50.0,
    slopePct: 3.5,
    elevationM: 280,
    soilType: "Sandy loam (Typic Haplustalfs)",
    trapTypes: ["contour_bund", "vegetative_strip"],
    crops: ["rice", "cover_crop"],
    plotDesign: {
      terraceWidthM: 0,
      bundWidthM: 0,
      alternatingSlope: false,
      hasCheckDam: false,
      bundCrop: "vetiver",
    },
    priorLandUse: "conventional_tillage",
    projectStart: "2020-01-15",
    standard: "TVER",
    creditingYears: 10,
    baselineSoc: [1.92, 1.95, 1.88, 1.99, 1.94],
    currentSoc: [2.19, 2.24, 2.15, 2.30, 2.17],
    baselineBd: 1.35,
    currentBd: 1.34,
    coarseFragPct: 5,
    // Erosion ~ flat field with minimal slope. Trapping low because no major slope.
    erosionRateTPerHaYr: 8,
    trappingEfficiency: 0.45,
    activities: [
      { date: "2024-06-15", activity: "fertiliser", nRate: 60, note: "Urea application 130 kg/ha" },
      { date: "2024-07-10", activity: "tillage", nRate: 0, note: "Light contour tillage" },
      { date: "2024-10-05", activity: "harvest", nRate: 0, note: "Rice harvest, residue retained" },
      { date: "2024-11-20", activity: "trap_maintenance", nRate: 0, note: "Cleaned sediment traps" },
    ],
    vvbName: "TGO — Thailand Greenhouse Gas Management Organization",
  },
  // ----- Nan farm 1: Tea + terraced plots, Mae Charim -----
  {
    id: "nan-farm-001",
    nameTh: "แปลงชาภูเขา บ้านป่าค้อ อ.แม่จริม",
    nameEn: "Highland Tea Farm — Ban Pa Kho, Mae Charim, Nan",
    groupId: "nan-group-001",
    // ~5 ha block at ~19.05°N, 100.85°E, elevation ~1100m
    bbox: [100.8180, 19.0320, 100.8510, 19.0580],
    areaHa: 32.0,
    slopePct: 28,
    elevationM: 1100,
    soilType: "Haplic Acrisols (highland red-yellow loam)",
    trapTypes: ["terrace_step", "vetiver_bund", "check_dam"],
    crops: ["tea", "cover_crop"],
    plotDesign: {
      terraceWidthM: 1.5,
      bundWidthM: 0.8,
      alternatingSlope: true,
      hasCheckDam: true,
      bundCrop: "vetiver",
    },
    priorLandUse: "shifting_cultivation",
    projectStart: "2021-05-01",
    standard: "TVER",
    creditingYears: 10,
    baselineSoc: [1.45, 1.52, 1.38, 1.49, 1.41, 1.47],
    currentSoc: [1.83, 1.91, 1.75, 1.88, 1.79, 1.85],
    baselineBd: 1.28,
    currentBd: 1.26,
    coarseFragPct: 12,
    // Highland, 28% slope with full sediment-trap design. Baseline erosion ~ 55 t/ha/yr.
    erosionRateTPerHaYr: 55,
    trappingEfficiency: 0.75, // terrace + vetiver + check dam + alternating slope = high
    activities: [
      { date: "2024-04-15", activity: "trap_maintenance", nRate: 0, note: "บำรุงคันหญ้าแฝกและทำความสะอาดฝายชะลอน้ำ" },
      { date: "2024-05-20", activity: "cover_crop", nRate: 0, note: "ปลูกปอเทืองเป็นพืชคลุมดินระหว่างแถวชา" },
      { date: "2024-08-10", activity: "harvest", nRate: 0, note: "เก็บใบชารอบ 1 ปี" },
      { date: "2024-11-05", activity: "fertiliser", nRate: 25, note: "ปุ๋ยอินทรีย์ชาอัตรา 50 kg/ha" },
    ],
    vvbName: "Verra — VCS Program",
  },
  // ----- Nan farm 2: Coffee + vetiver bunds, Pua -----
  {
    id: "nan-farm-002",
    nameTh: "แปลงกาแฟอราบิก้า บ้านบ่อ อ.ปัว",
    nameEn: "Arabica Coffee Farm — Ban Bo, Pua, Nan",
    groupId: "nan-group-001",
    // ~4 ha block at ~19.70°N, 100.62°E, elevation ~1250m
    bbox: [100.6090, 19.6840, 100.6320, 19.7030],
    areaHa: 25.0,
    slopePct: 35,
    elevationM: 1250,
    soilType: "Humic Acrisols (highland dark loam)",
    trapTypes: ["terrace_step", "vetiver_bund", "alternating_slope"],
    crops: ["coffee_arabica", "shade_tree"],
    plotDesign: {
      terraceWidthM: 1.5,
      bundWidthM: 0.8,
      alternatingSlope: true,
      hasCheckDam: true,
      bundCrop: "vetiver",
    },
    priorLandUse: "shifting_cultivation",
    projectStart: "2020-06-01",
    standard: "VCS",
    creditingYears: 20,
    baselineSoc: [1.62, 1.58, 1.71, 1.65, 1.69, 1.60],
    currentSoc: [2.08, 2.02, 2.18, 2.11, 2.15, 2.05],
    baselineBd: 1.18,
    currentBd: 1.17,
    coarseFragPct: 8,
    // Highland, 35% slope with full design. Baseline erosion ~ 75 t/ha/yr.
    erosionRateTPerHaYr: 75,
    trappingEfficiency: 0.78,
    vvbName: "Verra — VCS Program",
    activities: [
      { date: "2024-03-10", activity: "cover_crop", nRate: 0, note: "ปลูกพืชคลุมดินและต้นไม้ให้ร่มเงา (Gliricidia)" },
      { date: "2024-06-15", activity: "trap_maintenance", nRate: 0, note: "ซ่อมแซมคันหญ้าแฝกและฝายชะลอน้ำ" },
      { date: "2024-12-01", activity: "harvest", nRate: 0, note: "เก็บเกี่ยผลกาแฟ ปี 2024" },
    ],
  },
  // ----- Nan farm 3: Rotation crops (rice + soybean) with check dams, Santi Suk -----
  {
    id: "nan-farm-003",
    nameTh: "แปลงพืชหมุนเวียน บ้านนาใน อ.สันติสุข",
    nameEn: "Rotation Crops Farm — Ban Nai, Santi Suk, Nan",
    groupId: "nan-group-001",
    // ~7 ha block at ~18.88°N, 100.75°E, elevation ~600m
    bbox: [100.7310, 18.8640, 100.7650, 18.8920],
    areaHa: 40.0,
    slopePct: 18,
    elevationM: 600,
    soilType: "Ferric Acrisols (rolling upland loam)",
    trapTypes: ["contour_bund", "vetiver_bund", "check_dam", "alternating_slope"],
    crops: ["upland_rice", "soybean", "cover_crop"],
    plotDesign: {
      terraceWidthM: 1.5,
      bundWidthM: 0.8,
      alternatingSlope: true,
      hasCheckDam: true,
      bundCrop: "vetiver",
    },
    priorLandUse: "shifting_cultivation",
    projectStart: "2022-04-01",
    standard: "GOLD_STANDARD",
    creditingYears: 10,
    baselineSoc: [1.28, 1.31, 1.22, 1.35, 1.27, 1.30, 1.29],
    currentSoc: [1.55, 1.58, 1.49, 1.62, 1.54, 1.57, 1.56],
    baselineBd: 1.32,
    currentBd: 1.30,
    coarseFragPct: 15,
    // Upland 18% slope with rotation crops. Baseline erosion ~ 35 t/ha/yr.
    erosionRateTPerHaYr: 35,
    trappingEfficiency: 0.65,
    vvbName: "Gold Standard Foundation",
    activities: [
      { date: "2024-05-01", activity: "cover_crop", nRate: 0, note: "ปลูกโสนเป็นปุ๋ยพืชสดก่อนนาปี" },
      { date: "2024-07-15", activity: "harvest", nRate: 0, note: "เก็บเกี่ยข้าวไร่" },
      { date: "2024-08-20", activity: "residue_retention", nRate: 0, note: "ทิ้งตอซังไว้คลุมดิน ไม่เผา" },
      { date: "2024-09-15", activity: "cover_crop", nRate: 0, note: "ปลูกถั่วเหลืองหลังนาปี" },
      { date: "2024-11-30", activity: "harvest", nRate: 0, note: "เก็บเกี่ยถั่วเหลือง" },
      { date: "2024-12-10", activity: "trap_maintenance", nRate: 0, note: "บำรุงฝายชะลอน้ำและคันหญ้าแฝก" },
    ],
  },
  // ----- Nan farm 4: Mixed tea + coffee highland, Bo Kluea -----
  {
    id: "nan-farm-004",
    nameTh: "แปลงผสมชา-กาแฟ บ้านภูคา อ.บ่อเกลือ",
    nameEn: "Mixed Tea & Coffee — Ban Phu Ka, Bo Kluea, Nan",
    groupId: "nan-group-001",
    // ~6 ha block at ~19.18°N, 101.05°E, elevation ~1400m
    bbox: [101.0280, 19.1650, 101.0620, 19.1930],
    areaHa: 28.0,
    slopePct: 40,
    elevationM: 1400,
    soilType: "Andic Acrisols (volcanic-derived highland soil)",
    trapTypes: ["terrace_step", "vetiver_bund", "check_dam", "alternating_slope"],
    crops: ["tea", "coffee_arabica", "shade_tree"],
    plotDesign: {
      terraceWidthM: 1.5,
      bundWidthM: 0.8,
      alternatingSlope: true,
      hasCheckDam: true,
      bundCrop: "vetiver",
    },
    priorLandUse: "shifting_cultivation",
    projectStart: "2019-03-01",
    standard: "TVER",
    creditingYears: 10,
    baselineSoc: [1.75, 1.82, 1.68, 1.78, 1.71, 1.80],
    currentSoc: [2.25, 2.34, 2.18, 2.29, 2.21, 2.32],
    baselineBd: 1.15,
    currentBd: 1.13,
    coarseFragPct: 10,
    // Highland, 40% slope with full design. Baseline erosion ~ 95 t/ha/yr (very steep).
    erosionRateTPerHaYr: 95,
    trappingEfficiency: 0.82,
    vvbName: "TGO — Thailand Greenhouse Gas Management Organization",
    activities: [
      { date: "2024-02-15", activity: "cover_crop", nRate: 0, note: "ปลูกพืชคลุมดินระหว่างแถวชา-กาแฟ" },
      { date: "2024-04-10", activity: "trap_maintenance", nRate: 0, note: "ซ่อมแซมคันหญ้าแฝกและฝายชะลอน้ำ" },
      { date: "2024-05-20", activity: "biochar_application", nRate: 12500, note: "ใส่ biochar จากแกลบข้าว อัตรา 12.5 t/ha (C 70%, BC+100 = 0.80)" },
      { date: "2024-07-01", activity: "harvest", nRate: 0, note: "เก็บใบชาและผลกาแฟ" },
      { date: "2024-10-15", activity: "residue_retention", nRate: 0, note: "ทิ้งใบชา-กาแฟแก่คลุมดิน" },
      { date: "2024-12-20", activity: "fertiliser", nRate: 15, note: "ปุ๋ยคอกชาอัตรา 30 kg/ha" },
    ],
  },
];

function buildPolygonFromBbox(bbox: [number, number, number, number]): string {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return JSON.stringify({
    type: "Polygon",
    coordinates: [
      [
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat],
      ],
    ],
  });
}

/**
 * Compute realistic sediment trap measurements for a farm.
 *
 * Each highland farm has 7-10 terrace LEVELS (one per contour band), and
 * we place one sediment trap per level. The trap is a small physical
 * structure (3-6 m²) monitoring a small sub-catchment (~50-100 m²) at the
 * level's outlet. The trap's deltaH is the realistic depth of sediment
 * accumulated in the trap structure (5-35 cm range).
 *
 * The TOTAL farm sediment (across all 7-10 levels) is computed separately
 * using erosion × area × efficiency × years — see sediment-estimate.ts.
 * That's the BIG realistic total. The trap measurements here are just a
 * SAMPLE for monitoring/verification.
 */
function computeRealisticSedimentTraps(farm: SeedFarm): {
  trapId: string;
  areaM2: number;
  deltaHcm: number;
}[] {
  // Determine number of terrace levels (= number of traps)
  let numTraps: number;
  if ((farm.slopePct ?? 0) < 8) {
    // Flat lowland — no terraces, just a few check dams
    numTraps = Math.max(1, Math.min(2, Math.floor(farm.areaHa / 25)));
  } else if ((farm.slopePct ?? 0) < 15) {
    // Gentle slope — 2-4 traps
    numTraps = Math.max(2, Math.min(4, Math.floor(farm.areaHa / 8)));
  } else {
    // Highland — 7-10 levels based on slope
    const base = 7;
    const bonus = Math.floor(((farm.slopePct ?? 0) - 15) / 5);
    numTraps = Math.min(10, base + bonus);
  }

  // Trap physical area: small structure (3-6 m²) at the level outlet
  const trapPhysicalM2 = 4;

  // Each trap monitors a SMALL sub-catchment (~50-100 m²) at its level's
  // outlet. This is the standard sediment-trap monitoring design — the
  // trap's catchment is small, so depth stays realistic (5-35 cm).
  // The trap captures only a sample; the BIG farm total is computed
  // separately in sediment-estimate.ts.
  const trapCatchmentHa = 0.005; // 50 m²
  const sedBulkDensity = 1.3;
  const years = 5;

  const traps: { trapId: string; areaM2: number; deltaHcm: number }[] = [];
  const farmPrefix =
    farm.id === "demo-farm-001"
      ? "DE"
      : farm.id.split("-")[0].toUpperCase().slice(0, 2) || "T";

  for (let i = 0; i < numTraps; i++) {
    // ±15% per-trap variation for realism
    const variation = 1 + ((i * 7 + 3) % 30 - 15) / 100;
    // Mass of sediment captured by this trap's small monitoring catchment
    const sampleMassT =
      farm.erosionRateTPerHaYr *
      trapCatchmentHa *
      farm.trappingEfficiency *
      years *
      variation;
    const sampleVolumeM3 = sampleMassT / sedBulkDensity;
    // Depth = volume / trap_physical_area (in cm), capped at minimum 5 cm
    const deltaHcm = Math.max(
      5,
      Math.round((sampleVolumeM3 / trapPhysicalM2) * 100 * 10) / 10
    );
    traps.push({
      trapId: `${farmPrefix}-L${String(i + 1).padStart(2, "0")}-TRAP`,
      areaM2: trapPhysicalM2,
      deltaHcm,
    });
  }
  return traps;
}

async function seedFarm(farm: SeedFarm, user: { id: string }) {
  // Upsert the farm
  const polygon = buildPolygonFromBbox(farm.bbox);
  const plotDesignJson = JSON.stringify(farm.plotDesign);
  const cropsJson = JSON.stringify(farm.crops);
  const trapTypesJson = JSON.stringify(farm.trapTypes);

  await db.farm.upsert({
    where: { id: farm.id },
    update: {
      nameTh: farm.nameTh,
      nameEn: farm.nameEn,
      geomGeojson: polygon,
      areaHa: farm.areaHa,
      slopePct: farm.slopePct,
      elevationM: farm.elevationM,
      soilType: farm.soilType,
      trapTypes: trapTypesJson,
      crops: cropsJson,
      plotDesign: plotDesignJson,
      priorLandUse: farm.priorLandUse,
      projectStart: new Date(farm.projectStart),
      standard: farm.standard,
      creditingYears: farm.creditingYears,
    },
    create: {
      id: farm.id,
      ownerId: user.id,
      groupId: farm.groupId,
      nameTh: farm.nameTh,
      nameEn: farm.nameEn,
      geomGeojson: polygon,
      areaHa: farm.areaHa,
      slopePct: farm.slopePct,
      elevationM: farm.elevationM,
      soilType: farm.soilType,
      trapTypes: trapTypesJson,
      crops: cropsJson,
      plotDesign: plotDesignJson,
      priorLandUse: farm.priorLandUse,
      projectStart: new Date(farm.projectStart),
      standard: farm.standard,
      creditingYears: farm.creditingYears,
    },
  });

  // Create monitoring plots (P-01, P-02 etc.)
  const numPlots = Math.min(farm.baselineSoc.length, 6);
  const [minLon, minLat, maxLon, maxLat] = farm.bbox;
  for (let i = 0; i < numPlots; i++) {
    const plotCode = `P-0${i + 1}`;
    const plotId = `${farm.id}-plot-0${i + 1}`;
    // Distribute plots in a grid within the bbox
    const col = i % 3;
    const row = Math.floor(i / 3);
    const lon = minLon + ((col + 0.5) / 3) * (maxLon - minLon);
    const lat = minLat + ((row + 0.5) / 2) * (maxLat - minLat);
    await db.monitoringPlot.upsert({
      where: { id: plotId },
      update: {},
      create: {
        id: plotId,
        farmId: farm.id,
        plotCode,
        stratum: `stratum-${farm.id.split("-")[0]}`,
        pointGeojson: JSON.stringify({
          type: "Point",
          coordinates: [lon, lat],
        }),
      },
    });
  }

  // Build a hash chain across all soil samples in chronological order
  await db.soilSample.deleteMany({ where: { farmId: farm.id } });

  const baselineDate = new Date(farm.projectStart);
  // 5 years later for current
  const currentDate = new Date(
    baselineDate.getTime() + 5 * 365 * 24 * 60 * 60 * 1000
  );

  const samples = [
    ...farm.baselineSoc.map((v, i) => ({
      plotCode: `P-0${(i % numPlots) + 1}`,
      sampledAt: baselineDate,
      socPct: v,
      isBaseline: true,
      bulkDensity: farm.baselineBd,
      depthTopCm: 0,
      depthBotCm: 30,
      coarseFragPct: farm.coarseFragPct,
      labRef: `${farm.id}-BL-${String(i + 1).padStart(3, "0")}`,
    })),
    ...farm.currentSoc.map((v, i) => ({
      plotCode: `P-0${(i % numPlots) + 1}`,
      sampledAt: currentDate,
      socPct: v,
      isBaseline: false,
      bulkDensity: farm.currentBd,
      depthTopCm: 0,
      depthBotCm: 30,
      coarseFragPct: Math.max(0, farm.coarseFragPct - 1),
      labRef: `${farm.id}-CR-${String(i + 1).padStart(3, "0")}`,
    })),
  ];

  let prevHash: string | null = null;
  for (const s of samples) {
    const plot = await db.monitoringPlot.findFirst({
      where: { farmId: farm.id, plotCode: s.plotCode },
    });
    const payload = {
      farmId: farm.id,
      plotId: plot?.id ?? null,
      sampledAt: s.sampledAt.toISOString(),
      depthTopCm: s.depthTopCm,
      depthBotCm: s.depthBotCm,
      socPct: s.socPct,
      bulkDensity: s.bulkDensity,
      coarseFragPct: s.coarseFragPct,
      labRef: s.labRef,
      method: "dry_combustion",
      isBaseline: s.isBaseline,
    };
    const recordHashValue = recordHash(payload, prevHash);
    await db.soilSample.create({
      data: {
        farmId: farm.id,
        plotId: plot?.id ?? null,
        samplerId: user.id,
        sampledAt: s.sampledAt,
        depthTopCm: s.depthTopCm,
        depthBotCm: s.depthBotCm,
        socPct: s.socPct,
        bulkDensity: s.bulkDensity,
        coarseFragPct: s.coarseFragPct,
        labRef: s.labRef,
        method: "dry_combustion",
        isBaseline: s.isBaseline,
        prevHash,
        recordHash: recordHashValue,
      },
    });
    prevHash = recordHashValue;
  }

  // Sediment measurements — computed realistically from farm area × erosion × trapping efficiency
  await db.sedimentMeasurement.deleteMany({ where: { farmId: farm.id } });
  const computedTraps = computeRealisticSedimentTraps(farm);
  for (const t of computedTraps) {
    await db.sedimentMeasurement.create({
      data: {
        farmId: farm.id,
        trapId: t.trapId,
        measuredAt: new Date("2024-12-01T00:00:00Z"),
        trapAreaM2: t.areaM2,
        deltaHcm: t.deltaHcm,
        sedBulkDensity: 1.3,
        sedSocPct: 1.4,
        source: "manual",
      },
    });
  }

  // Management activities
  await db.managementActivity.deleteMany({ where: { farmId: farm.id } });
  for (const a of farm.activities) {
    await db.managementActivity.create({
      data: {
        farmId: farm.id,
        samplerId: user.id,
        activityAt: new Date(a.date),
        activity: a.activity,
        nRateKgHa: a.nRate,
        note: a.note,
      },
    });
  }

  // Verification rounds: 1 validation at project start + 1 verification after 5 years
  await db.verificationRound.deleteMany({ where: { farmId: farm.id } });
  // Validation round (round 0)
  await db.verificationRound.create({
    data: {
      farmId: farm.id,
      roundType: "validation",
      roundNumber: 0,
      periodStart: baselineDate,
      periodEnd: baselineDate,
      status: "verified",
      vvbName: farm.vvbName,
      vvbEmail: "validation@vvb.example",
      submittedAt: baselineDate,
      verifiedAt: new Date(baselineDate.getTime() + 90 * 24 * 60 * 60 * 1000),
      creditsClaimed: 0,
      creditsVerified: 0,
      deductionsPct: 0,
      findings: JSON.stringify([
        { type: "boundary", severity: "info", note: "ขอบเขตแปลงได้รับการยืนยันด้วย GeoJSON และภาพถ่ายดาวเทียม" },
        { type: "baseline", severity: "info", note: "ค่าฐาน SOC และ bulk density มาจากการเก็บตัวอย่างจริง" },
        { type: "additionality", severity: "info", note: "พื้นที่เดิมเป็นไร่เลื่อนลอย → โครงการมี additionality" },
        { type: "methodology", severity: "info", note: "ใช้ IPCC 2019 Refinement + ESM correction" },
      ]),
      statement: `Validation complete. Project design and baseline are consistent with ${farm.standard} requirements. Project is eligible for crediting.`,
      evidenceHashes: JSON.stringify([]),
    },
  });
  // Verification round 1 (5 years later)
  const verifyDate = new Date(currentDate.getTime() + 60 * 24 * 60 * 60 * 1000);
  await db.verificationRound.create({
    data: {
      farmId: farm.id,
      roundType: "verification",
      roundNumber: 1,
      periodStart: baselineDate,
      periodEnd: currentDate,
      status: "verified",
      vvbName: farm.vvbName,
      vvbEmail: "verification@vvb.example",
      submittedAt: currentDate,
      verifiedAt: verifyDate,
      creditsClaimed: 0, // computed in dashboard
      creditsVerified: 0,
      deductionsPct: 5, // small deduction for uncertainty
      findings: JSON.stringify([
        { type: "soil_samples", severity: "info", note: "ตัวอย่างดินครบถ้วน hash chain ถูกต้อง" },
        { type: "sediment", severity: "info", note: "ปริมาณตะกอนสอดคล้องกับขนาดแปลงและความลาดชัน" },
        { type: "uncertainty", severity: "minor", note: `ค่าความไม่แน่นอน ${5}% หักเครดิตตามมาตรฐาน` },
        { type: "audit", severity: "info", note: "audit trail ผ่านการตรวจสอบย้อนกลับ ระเบียนครบถ้วน" },
      ]),
      statement: `Verification round 1 complete. ${farm.standard} requirements met. Net credits verified with 5% uncertainty deduction.`,
      evidenceHashes: JSON.stringify([]),
    },
  });
  // Verification round 2 (planned, 10 years from start)
  const nextVerifyStart = new Date(currentDate.getTime() + 365 * 24 * 60 * 60 * 1000);
  const nextVerifyEnd = new Date(baselineDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
  await db.verificationRound.create({
    data: {
      farmId: farm.id,
      roundType: "verification",
      roundNumber: 2,
      periodStart: nextVerifyStart,
      periodEnd: nextVerifyEnd,
      status: "planned",
      vvbName: farm.vvbName,
      creditsClaimed: null,
      creditsVerified: null,
      deductionsPct: 0,
      findings: JSON.stringify([]),
      statement: null,
      evidenceHashes: JSON.stringify([]),
    },
  });

  console.log(`  ✓ ${farm.nameEn} (${farm.areaHa} ha, ${farm.elevationM}m)`);
}


async function main() {
  console.log("🌱 Seeding SedimentCarbon dMRV database...");
  console.log(`  ${FARMS.length} farms to seed`);

  // Demo user (aggregator)
  const user = await db.user.upsert({
    where: { email: "aggregator@sedimentcarbon.demo" },
    update: {},
    create: {
      email: "aggregator@sedimentcarbon.demo",
      fullName: "Aggregator Demo",
      role: "aggregator",
      locale: "th",
    },
  });

  // Clean up any orphaned plots from previous runs
  await db.monitoringPlot.deleteMany({
    where: { farmId: { in: FARMS.map((f) => f.id) } },
  });

  for (const farm of FARMS) {
    await seedFarm(farm, user);
  }

// ===== Demo IoT readings =====
console.log("  Adding demo IoT readings + activity rules...");
await db.ioTReading.deleteMany({});
await db.activityRule.deleteMany({});

// Soil moisture sensors at each monitoring plot (varies by farm)
const iotDemo = [
  { farmId: "demo-farm-001", sensorId: "soil-P01", sensorType: "soil_moisture", value: 22.4, unit: "%" },
  { farmId: "demo-farm-001", sensorId: "soil-P02", sensorType: "soil_moisture", value: 19.8, unit: "%" },
  { farmId: "demo-farm-001", sensorId: "temp-P01", sensorType: "temperature", value: 28.6, unit: "C" },
  { farmId: "demo-farm-001", sensorId: "rain-01", sensorType: "rainfall", value: 12.5, unit: "mm" },
  { farmId: "nan-farm-001", sensorId: "soil-N1", sensorType: "soil_moisture", value: 31.2, unit: "%" },
  { farmId: "nan-farm-001", sensorId: "temp-N1", sensorType: "temperature", value: 21.4, unit: "C" },
  { farmId: "nan-farm-001", sensorId: "humid-N1", sensorType: "humidity", value: 78.5, unit: "%" },
  { farmId: "nan-farm-002", sensorId: "soil-N2", sensorType: "soil_moisture", value: 17.5, unit: "%" },
  { farmId: "nan-farm-002", sensorId: "ec-N2", sensorType: "ec", value: 0.42, unit: "mS/cm" },
  { farmId: "nan-farm-003", sensorId: "soil-N3", sensorType: "soil_moisture", value: 25.1, unit: "%" },
  { farmId: "nan-farm-004", sensorId: "soil-N4", sensorType: "soil_moisture", value: 18.9, unit: "%" },
  { farmId: "nan-farm-004", sensorId: "temp-N4", sensorType: "temperature", value: 18.7, unit: "C" },
];
const now = new Date();
for (const r of iotDemo) {
  await db.ioTReading.create({
    data: {
      ...r,
      measuredAt: new Date(now.getTime() - Math.random() * 24 * 3600 * 1000),
      metadata: JSON.stringify({ source: "demo-seed" }),
    },
  });
}

// Demo activity rules
await db.activityRule.create({
  data: {
    farmId: null,  // applies to all farms
    name: "Low soil moisture → auto-irrigation alert",
    sensorType: "soil_moisture",
    operator: "<",
    threshold: 20,
    activity: "fertiliser",
    note: "เมื่อความชื้นในดินต่ำกว่า 20% → ระบบแจ้งเตือนให้รดน้ำ/ใส่ปุ๋ย",
    enabled: true,
    cooldownHr: 24,
  },
});
await db.activityRule.create({
  data: {
    farmId: null,
    name: "Heavy rainfall → log trap maintenance reminder",
    sensorType: "rainfall",
    operator: ">",
    threshold: 30,
    activity: "trap_maintenance",
    note: "เมื่อฝนตกมากกว่า 30 มม. → ต้องตรวจและบำรุงฝายชะลอน้ำ",
    enabled: true,
    cooldownHr: 48,
  },
});
await db.activityRule.create({
  data: {
    farmId: null,
    name: "High temperature → cover crop recommendation",
    sensorType: "temperature",
    operator: ">",
    threshold: 35,
    activity: "cover_crop",
    note: "เมื่ออุณหภูมิสูงกว่า 35°C → แนะนำให้ปลูกพืชคลุมดิน",
    enabled: true,
    cooldownHr: 72,
  },
});



  console.log(`✅ Seed complete. ${FARMS.length} farms created.`);
  console.log(`   Owner: ${user.email}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error("❌ Seed failed:", err);
    await db.$disconnect();
    process.exit(1);
  });
