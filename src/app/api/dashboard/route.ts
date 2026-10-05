import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compareAllStandards, type CreditInput } from "@/lib/core/credits";
import { totalSediment, type SedimentTrap } from "@/lib/core/sediment";
import { mean } from "@/lib/core/soc";
import { computeEstimatedSedimentTotal } from "@/lib/sediment-estimate";

export async function GET() {
  const [farms, samples, sediment, activities, calculations] = await Promise.all([
    db.farm.findMany({
      include: { _count: { select: { samples: true, sediment: true } } },
    }),
    db.soilSample.findMany({ orderBy: { sampledAt: "desc" }, take: 200 }),
    db.sedimentMeasurement.findMany(),
    db.managementActivity.findMany({
      orderBy: { activityAt: "desc" },
      take: 5,
      include: { farm: true },
    }),
    db.creditCalculation.findMany({ orderBy: { calculatedAt: "desc" }, take: 10 }),
  ]);

  const totalArea = farms.reduce((s, f) => s + f.areaHa, 0);
  const totalSamples = samples.length;

  const traps: SedimentTrap[] = sediment.map((m) => ({
    trapId: m.trapId,
    areaM2: m.trapAreaM2,
    deltaHCm: m.deltaHcm,
    bulkDensity: m.sedBulkDensity,
    socPct: m.sedSocPct,
  }));
  const sedimentTotals = totalSediment(traps);

  // Estimated total sediment retained across all farms (the BIG realistic number)
  // Each farm's total = erosion × area × efficiency × project age (sums all 7-10 levels)
  let estimatedTotalSedimentT = 0;
  let estimatedTotalVolumeM3 = 0;
  let estimatedTotalCarbonT = 0;
  let estimatedTotalCo2eT = 0;
  let totalTerraceLevels = 0;
  for (const f of farms) {
    const farmTraps = sediment
      .filter((m) => m.farmId === f.id)
      .map((m) => ({
        areaM2: m.trapAreaM2,
        deltaHCm: m.deltaHcm,
        bulkDensity: m.sedBulkDensity,
        socPct: m.sedSocPct,
      }));
    const est = computeEstimatedSedimentTotal({
      areaHa: f.areaHa,
      slopePct: f.slopePct,
      trapTypes: f.trapTypes ? JSON.parse(f.trapTypes) : [],
      projectStart: f.projectStart,
      traps: farmTraps,
    });
    estimatedTotalSedimentT += est.totalSedimentT;
    estimatedTotalVolumeM3 += est.totalVolumeM3;
    estimatedTotalCarbonT += est.totalCarbonT;
    estimatedTotalCo2eT += est.totalCo2eT;
    totalTerraceLevels += est.numTerraceLevels;
  }

  // Compute average SOC % per baseline vs current
  const baselineSoc = samples.filter((s) => s.isBaseline).map((s) => s.socPct);
  const currentSoc = samples.filter((s) => !s.isBaseline).map((s) => s.socPct);

  // Build a credit-comparison snapshot if we have at least one farm with both
  // baseline and current samples. Use the first farm for demo purposes.
  let comparison: ReturnType<typeof compareAllStandards> | null = null;
  const firstFarm = farms[0];
  if (firstFarm) {
    const farmSamples = samples.filter((s) => s.farmId === firstFarm.id);
    const baseline = farmSamples.filter((s) => s.isBaseline).map((s) => s.socPct);
    const current = farmSamples.filter((s) => !s.isBaseline).map((s) => s.socPct);
    if (baseline.length > 0 && current.length > 0) {
      // SOC stock at 0-30cm, BD ~1.34, CF ~5% — derive a quick per-ha value.
      const bd = farmSamples[0]?.bulkDensity ?? 1.34;
      const cf = farmSamples[0]?.coarseFragPct ?? 5;
      const baselineStock =
        (mean(baseline) / 100) * bd * 30 * (1 - cf / 100) * 100;
      const currentStock = (mean(current) / 100) * bd * 30 * (1 - cf / 100) * 100;
      const projectStart = firstFarm.projectStart ?? new Date("2020-01-01");
      const years =
        (Date.now() - projectStart.getTime()) / (1000 * 60 * 60 * 24 * 365);
      const input: CreditInput = {
        socBaselineTHa: baselineStock,
        socCurrentTHa: currentStock,
        years: Math.max(1, Number(years.toFixed(2))),
        areaHa: firstFarm.areaHa,
        socSamples: farmSamples.map((s) => s.socPct),
      };
      comparison = compareAllStandards(input);
    }
  }

  // Total credits across all farms' most recent calculation per standard
  const recentByStandard = new Map<string, number>();
  for (const c of calculations) {
    const current = recentByStandard.get(c.standard) ?? 0;
    recentByStandard.set(c.standard, current + (c.netCredits ?? 0));
  }

  return NextResponse.json({
    totalFarms: farms.length,
    totalAreaHa: Math.round(totalArea * 100) / 100,
    totalSamples,
    baselineCount: baselineSoc.length,
    currentCount: currentSoc.length,
    sedimentTotals,
    // Estimated total sediment (BIG realistic number across all 7-10 levels per farm)
    estimatedSediment: {
      totalSedimentT: Math.round(estimatedTotalSedimentT * 10) / 10,
      totalVolumeM3: Math.round(estimatedTotalVolumeM3 * 10) / 10,
      totalCarbonT: Math.round(estimatedTotalCarbonT * 100) / 100,
      totalCo2eT: Math.round(estimatedTotalCo2eT * 10) / 10,
      totalTerraceLevels,
    },
    recentActivity: activities.map((a) => ({
      id: a.id,
      farmId: a.farmId,
      farmName: a.farm?.nameTh ?? a.farm?.nameEn,
      activityAt: a.activityAt,
      activity: a.activity,
      note: a.note,
    })),
    farms: farms.map((f) => ({
      id: f.id,
      nameTh: f.nameTh,
      nameEn: f.nameEn,
      areaHa: f.areaHa,
      slopePct: f.slopePct,
      elevationM: f.elevationM,
      standard: f.standard,
      sampleCount: f._count.samples,
      sedimentCount: f._count.sediment,
      geomGeojson: f.geomGeojson,
      soilType: f.soilType,
      trapTypes: f.trapTypes ? JSON.parse(f.trapTypes) : [],
      crops: f.crops ? JSON.parse(f.crops) : [],
      plotDesign: f.plotDesign ? JSON.parse(f.plotDesign) : null,
      priorLandUse: f.priorLandUse,
    })),
    creditComparison: comparison,
    creditsByStandard: Array.from(recentByStandard.entries()).map(
      ([standard, total]) => ({ standard, total })
    ),
  });
}
