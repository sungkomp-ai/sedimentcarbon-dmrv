import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { totalSediment, type SedimentTrap } from "@/lib/core/sediment";
import { computeEstimatedSedimentTotal } from "@/lib/sediment-estimate";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const measurements = await db.sedimentMeasurement.findMany({
    where: farmId ? { farmId } : undefined,
    orderBy: { measuredAt: "desc" },
    include: { farm: true },
  });
  const result = measurements.map((m) => ({
    id: m.id,
    farmId: m.farmId,
    farmNameTh: m.farm?.nameTh ?? null,
    trapId: m.trapId,
    measuredAt: m.measuredAt,
    trapAreaM2: m.trapAreaM2,
    deltaHcm: m.deltaHcm,
    sedBulkDensity: m.sedBulkDensity,
    sedSocPct: m.sedSocPct,
    source: m.source,
  }));

  // Compute estimated total + sample total per farm
  const farms = await db.farm.findMany({
    where: farmId ? { id: farmId } : undefined,
  });

  const farmTotals = farms.map((f) => {
    const farmTraps = measurements
      .filter((m) => m.farmId === f.id)
      .map((m) => ({
        areaM2: m.trapAreaM2,
        deltaHCm: m.deltaHcm,
        bulkDensity: m.sedBulkDensity,
        socPct: m.sedSocPct,
      }));
    const trapTotals = totalSediment(
      farmTraps.map((t) => ({
        trapId: "",
        areaM2: t.areaM2,
        deltaHCm: t.deltaHCm,
        bulkDensity: t.bulkDensity,
        socPct: t.socPct,
      }))
    );
    const estimated = computeEstimatedSedimentTotal({
      areaHa: f.areaHa,
      slopePct: f.slopePct,
      trapTypes: f.trapTypes ? JSON.parse(f.trapTypes) : [],
      projectStart: f.projectStart,
      traps: farmTraps,
    });
    return {
      farmId: f.id,
      farmNameTh: f.nameTh,
      farmNameEn: f.nameEn,
      areaHa: f.areaHa,
      slopePct: f.slopePct,
      trapCount: farmTraps.length,
      // Sample (small): what was physically captured in monitoring traps
      sample: {
        volumeM3: trapTotals.volumeM3,
        massT: trapTotals.massT,
        carbonT: trapTotals.carbonRetainedT,
        co2eT: trapTotals.co2eRetained,
      },
      // Estimated total (BIG): all sediment retained on the farm across all 7-10 levels
      estimated: {
        baselineErosionTPerHaYr: estimated.baselineErosionTPerHaYr,
        trappingEfficiency: estimated.trappingEfficiency,
        projectYears: estimated.projectYears,
        numTerraceLevels: estimated.numTerraceLevels,
        perLayerSedimentT: estimated.perLayerSedimentT,
        totalSedimentT: estimated.totalSedimentT,
        totalVolumeM3: estimated.totalVolumeM3,
        totalCarbonT: estimated.totalCarbonT,
        totalCo2eT: estimated.totalCo2eT,
        sampleRatio: estimated.sampleRatio,
      },
    };
  });

  // Aggregate across all farms (for dashboard totals)
  const aggregate = farmTotals.reduce(
    (acc, f) => {
      acc.sampleVolumeM3 += f.sample.volumeM3;
      acc.sampleMassT += f.sample.massT;
      acc.estimatedSedimentT += f.estimated.totalSedimentT;
      acc.estimatedVolumeM3 += f.estimated.totalVolumeM3;
      acc.estimatedCarbonT += f.estimated.totalCarbonT;
      acc.estimatedCo2eT += f.estimated.totalCo2eT;
      return acc;
    },
    {
      sampleVolumeM3: 0,
      sampleMassT: 0,
      estimatedSedimentT: 0,
      estimatedVolumeM3: 0,
      estimatedCarbonT: 0,
      estimatedCo2eT: 0,
    }
  );

  return NextResponse.json({
    measurements: result,
    farmTotals,
    aggregate: {
      sampleVolumeM3: Math.round(aggregate.sampleVolumeM3 * 100) / 100,
      sampleMassT: Math.round(aggregate.sampleMassT * 100) / 100,
      estimatedSedimentT: Math.round(aggregate.estimatedSedimentT * 10) / 10,
      estimatedVolumeM3: Math.round(aggregate.estimatedVolumeM3 * 10) / 10,
      estimatedCarbonT: Math.round(aggregate.estimatedCarbonT * 100) / 100,
      estimatedCo2eT: Math.round(aggregate.estimatedCo2eT * 10) / 10,
    },
  });
}

interface CreateSedimentBody {
  farmId: string;
  trapId: string;
  measuredAt: string;
  trapAreaM2: number;
  deltaHcm: number;
  sedBulkDensity?: number;
  sedSocPct?: number;
  source?: string;
  evidencePhoto?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreateSedimentBody;
  const m = await db.sedimentMeasurement.create({
    data: {
      farmId: body.farmId,
      trapId: body.trapId,
      measuredAt: new Date(body.measuredAt),
      trapAreaM2: body.trapAreaM2,
      deltaHcm: body.deltaHcm,
      sedBulkDensity: body.sedBulkDensity ?? 1.3,
      sedSocPct: body.sedSocPct ?? 1.2,
      source: body.source ?? "manual",
      evidencePhoto: body.evidencePhoto,
    },
  });
  return NextResponse.json({ measurement: m }, { status: 201 });
}
