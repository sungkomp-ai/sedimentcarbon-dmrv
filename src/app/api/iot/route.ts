import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/iot?farmId=X&sensorType=Y&limit=N
 * Lists recent IoT readings (optionally filtered by farm + sensor type).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const sensorType = searchParams.get("sensorType");
  const limit = Number(searchParams.get("limit") ?? 100);

  const where: { farmId?: string; sensorType?: string } = {};
  if (farmId) where.farmId = farmId;
  if (sensorType) where.sensorType = sensorType;

  const readings = await db.ioTReading.findMany({
    where,
    orderBy: { measuredAt: "desc" },
    take: Math.min(500, Math.max(1, limit)),
    include: { farm: { select: { nameTh: true, nameEn: true } } },
  });

  const result = readings.map((r) => ({
    id: r.id,
    farmId: r.farmId,
    farmName: r.farm?.nameTh ?? r.farm?.nameEn ?? null,
    sensorId: r.sensorId,
    sensorType: r.sensorType,
    value: r.value,
    unit: r.unit,
    measuredAt: r.measuredAt,
    metadata: r.metadata ? JSON.parse(r.metadata) : null,
  }));

  return NextResponse.json({ readings: result, count: result.length });
}
