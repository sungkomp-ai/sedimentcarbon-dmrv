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
  // Sediment traps for this farm
  sedimentTraps: { trapId: string; areaM2: number; deltaHcm: number }[];
  // Management activities for the past year
  activities: { date: string; activity: string; nRate: number; note: string }[];
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
    sedimentTraps: [
      { trapId: "TRAP-01", areaM2: 4.0, deltaHcm: 12.5 },
      { trapId: "TRAP-02", areaM2: 4.0, deltaHcm: 9.8 },
      { trapId: "TRAP-03", areaM2: 4.0, deltaHcm: 15.2 },
    ],
    activities: [
      { date: "2024-06-15", activity: "fertiliser", nRate: 60, note: "Urea application 130 kg/ha" },
      { date: "2024-07-10", activity: "tillage", nRate: 0, note: "Light contour tillage" },
      { date: "2024-10-05", activity: "harvest", nRate: 0, note: "Rice harvest, residue retained" },
      { date: "2024-11-20", activity: "trap_maintenance", nRate: 0, note: "Cleaned sediment traps" },
    ],
  },
  // ----- Nan farm 1: Tea + terraced plots, Mae Charim -----
  {
    id: "nan-farm-001",
    nameTh: "แปลงชาภูเขา บ้านป่าค้อ อ.แม่จริม",
    nameEn: "Highland Tea Farm — Ban Pa Kho, Mae Charim, Nan",
    groupId: "nan-group-001",
    // ~5 ha block at ~19.05°N, 100.85°E, elevation ~1100m
    bbox: [100.8310, 19.0410, 100.8366, 19.0474],
    areaHa: 5.2,
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
    sedimentTraps: [
      { trapId: "N1-TRAP-01", areaM2: 3.0, deltaHcm: 18.5 },
      { trapId: "N1-TRAP-02", areaM2: 3.0, deltaHcm: 22.1 },
      { trapId: "N1-TRAP-03", areaM2: 3.0, deltaHcm: 16.8 },
      { trapId: "N1-TRAP-04", areaM2: 3.0, deltaHcm: 25.3 },
    ],
    activities: [
      { date: "2024-04-15", activity: "trap_maintenance", nRate: 0, note: "บำรุงคันหญ้าแฝกและทำความสะอาดฝายชะลอน้ำ" },
      { date: "2024-05-20", activity: "cover_crop", nRate: 0, note: "ปลูกปอเทืองเป็นพืชคลุมดินระหว่างแถวชา" },
      { date: "2024-08-10", activity: "harvest", nRate: 0, note: "เก็บใบชารอบ 1 ปี" },
      { date: "2024-11-05", activity: "fertiliser", nRate: 25, note: "ปุ๋ยอินทรีย์ชาอัตรา 50 kg/ha" },
    ],
  },
  // ----- Nan farm 2: Coffee + vetiver bunds, Pua -----
  {
    id: "nan-farm-002",
    nameTh: "แปลงกาแฟอราบิก้า บ้านบ่อ อ.ปัว",
    nameEn: "Arabica Coffee Farm — Ban Bo, Pua, Nan",
    groupId: "nan-group-001",
    // ~4 ha block at ~19.70°N, 100.62°E, elevation ~1250m
    bbox: [100.6170, 19.6910, 100.6222, 19.6956],
    areaHa: 4.0,
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
    sedimentTraps: [
      { trapId: "N2-TRAP-01", areaM2: 3.5, deltaHcm: 28.4 },
      { trapId: "N2-TRAP-02", areaM2: 3.5, deltaHcm: 32.1 },
      { trapId: "N2-TRAP-03", areaM2: 3.5, deltaHcm: 25.7 },
    ],
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
    bbox: [100.7430, 18.8750, 100.7510, 18.8810],
    areaHa: 7.0,
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
    sedimentTraps: [
      { trapId: "N3-TRAP-01", areaM2: 5.0, deltaHcm: 14.2 },
      { trapId: "N3-TRAP-02", areaM2: 5.0, deltaHcm: 11.8 },
      { trapId: "N3-TRAP-03", areaM2: 5.0, deltaHcm: 19.5 },
      { trapId: "N3-TRAP-04", areaM2: 5.0, deltaHcm: 13.4 },
      { trapId: "N3-TRAP-05", areaM2: 5.0, deltaHcm: 16.9 },
    ],
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
    bbox: [101.0410, 19.1760, 101.0470, 19.1818],
    areaHa: 6.5,
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
    sedimentTraps: [
      { trapId: "N4-TRAP-01", areaM2: 4.0, deltaHcm: 35.2 },
      { trapId: "N4-TRAP-02", areaM2: 4.0, deltaHcm: 38.5 },
      { trapId: "N4-TRAP-03", areaM2: 4.0, deltaHcm: 29.8 },
      { trapId: "N4-TRAP-04", areaM2: 4.0, deltaHcm: 41.6 },
    ],
    activities: [
      { date: "2024-02-15", activity: "cover_crop", nRate: 0, note: "ปลูกพืชคลุมดินระหว่างแถวชา-กาแฟ" },
      { date: "2024-04-10", activity: "trap_maintenance", nRate: 0, note: "ซ่อมแซมคันหญ้าแฝกและฝายชะลอน้ำ" },
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

  // Sediment measurements
  await db.sedimentMeasurement.deleteMany({ where: { farmId: farm.id } });
  for (const t of farm.sedimentTraps) {
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
