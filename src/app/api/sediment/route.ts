import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { totalSediment, type SedimentTrap } from "@/lib/core/sediment";

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
  return NextResponse.json({ measurements: result });
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

// Aggregate totals for a farm (or all) - useful for the dashboard widget
export async function POST_AGG(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const measurements = await db.sedimentMeasurement.findMany({
    where: farmId ? { farmId } : undefined,
  });
  const traps: SedimentTrap[] = measurements.map((m) => ({
    trapId: m.trapId,
    areaM2: m.trapAreaM2,
    deltaHCm: m.deltaHcm,
    bulkDensity: m.sedBulkDensity,
    socPct: m.sedSocPct,
  }));
  return NextResponse.json({ totals: totalSediment(traps) });
}
