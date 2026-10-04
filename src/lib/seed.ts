/**
 * Seed script for SedimentCarbon dMRV demo data.
 * Populate the SQLite database with the sample scenario from the PDF spec:
 *  - 50 ha farm, SOC 32.4 -> 36.9 t C/ha over 5 years.
 *  - N fertiliser 60 kg N/ha/yr, leakage 15 tCO2e.
 *  - Five SOC samples around the project.
 *
 * Run with: bun run src/lib/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { recordHash } from "./core/audit";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SedimentCarbon dMRV database...");

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

  // Demo farm: 50 ha, simple polygon near Nakhon Ratchasima
  const farmPolygon = JSON.stringify({
    type: "Polygon",
    coordinates: [
      [
        [102.102, 14.97],
        [102.118, 14.97],
        [102.118, 14.995],
        [102.102, 14.995],
        [102.102, 14.97],
      ],
    ],
  });

  const farm = await db.farm.upsert({
    where: { id: "demo-farm-001" },
    update: {},
    create: {
      id: "demo-farm-001",
      ownerId: user.id,
      groupId: "demo-group-001",
      nameTh: "แปลงสาธิตทุ่งกะเฉดา",
      nameEn: "Demo Field — Tung Kacha Daeng",
      geomGeojson: farmPolygon,
      areaHa: 50.0,
      slopePct: 3.5,
      soilType: "Sandy loam (Typic Haplustalfs)",
      trapTypes: JSON.stringify(["contour_bund", "vegetative_strip"]),
      projectStart: new Date("2020-01-15T00:00:00Z"),
      standard: "TVER",
      creditingYears: 10,
    },
  });

  // Two monitoring plots
  await db.monitoringPlot.upsert({
    where: { id: "plot-001" },
    update: {},
    create: {
      id: "plot-001",
      farmId: farm.id,
      plotCode: "P-01",
      stratum: "stratum-A",
      pointGeojson: JSON.stringify({
        type: "Point",
        coordinates: [102.108, 14.975],
      }),
    },
  });

  await db.monitoringPlot.upsert({
    where: { id: "plot-002" },
    update: {},
    create: {
      id: "plot-002",
      farmId: farm.id,
      plotCode: "P-02",
      stratum: "stratum-A",
      pointGeojson: JSON.stringify({
        type: "Point",
        coordinates: [102.112, 14.985],
      }),
    },
  });

  // Baseline soil samples (Jan 2020) and current samples (Jan 2025)
  const baselineDate = new Date("2020-01-20T00:00:00Z");
  const currentDate = new Date("2025-01-22T00:00:00Z");

  const baselineValues = [1.92, 1.95, 1.88, 1.99, 1.94]; // %C baseline
  const currentValues = [2.19, 2.24, 2.15, 2.30, 2.17]; // %C after 5 years

  // Build a hash chain across all soil samples in chronological order
  const samples = [
    ...baselineValues.map((v, i) => ({
      plotCode: `P-0${(i % 2) + 1}`,
      sampledAt: baselineDate,
      socPct: v,
      isBaseline: true,
      bulkDensity: 1.35,
      depthTopCm: 0,
      depthBotCm: 30,
      coarseFragPct: 5,
      labRef: `LAB-BL-${String(i + 1).padStart(3, "0")}`,
    })),
    ...currentValues.map((v, i) => ({
      plotCode: `P-0${(i % 2) + 1}`,
      sampledAt: currentDate,
      socPct: v,
      isBaseline: false,
      bulkDensity: 1.34,
      depthTopCm: 0,
      depthBotCm: 30,
      coarseFragPct: 4,
      labRef: `LAB-CR-${String(i + 1).padStart(3, "0")}`,
    })),
  ];

  // Delete old demo samples to keep the chain deterministic
  await db.soilSample.deleteMany({ where: { farmId: farm.id } });

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

  // Sediment measurements (3 traps across 5 years)
  await db.sedimentMeasurement.deleteMany({ where: { farmId: farm.id } });
  const sedimentTraps = [
    { trapId: "TRAP-01", date: new Date("2024-12-01T00:00:00Z"), areaM2: 4.0, deltaHcm: 12.5 },
    { trapId: "TRAP-02", date: new Date("2024-12-01T00:00:00Z"), areaM2: 4.0, deltaHcm: 9.8 },
    { trapId: "TRAP-03", date: new Date("2024-12-01T00:00:00Z"), areaM2: 4.0, deltaHcm: 15.2 },
  ];
  for (const t of sedimentTraps) {
    await db.sedimentMeasurement.create({
      data: {
        farmId: farm.id,
        trapId: t.trapId,
        measuredAt: t.date,
        trapAreaM2: t.areaM2,
        deltaHcm: t.deltaHcm,
        sedBulkDensity: 1.3,
        sedSocPct: 1.2,
        source: "manual",
      },
    });
  }

  // Management activities
  await db.managementActivity.deleteMany({ where: { farmId: farm.id } });
  const activities = [
    { date: new Date("2024-06-15T00:00:00Z"), activity: "fertiliser", nRate: 60, note: "Urea application 130 kg/ha" },
    { date: new Date("2024-07-10T00:00:00Z"), activity: "tillage", nRate: 0, note: "Light contour tillage" },
    { date: new Date("2024-10-05T00:00:00Z"), activity: "harvest", nRate: 0, note: "Rice harvest, residue retained" },
    { date: new Date("2024-11-20T00:00:00Z"), activity: "trap_maintenance", nRate: 0, note: "Cleaned sediment traps" },
  ];
  for (const a of activities) {
    await db.managementActivity.create({
      data: {
        farmId: farm.id,
        samplerId: user.id,
        activityAt: a.date,
        activity: a.activity,
        nRateKgHa: a.nRate,
        note: a.note,
      },
    });
  }

  console.log("✅ Seed complete. Farm:", farm.nameEn, "| Owner:", user.email);
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error("❌ Seed failed:", err);
    await db.$disconnect();
    process.exit(1);
  });
