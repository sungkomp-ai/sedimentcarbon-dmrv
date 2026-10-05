import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyChain, type ChainRecord } from "@/lib/core/audit";

/**
 * GET /api/audit/summary
 * Returns audit trail status for ALL farms in one query.
 */
export async function GET() {
  const farms = await db.farm.findMany({
    include: { _count: { select: { samples: true } } },
    orderBy: { createdAt: "desc" },
  });

  const summary = [];
  for (const farm of farms) {
    const samples = await db.soilSample.findMany({
      where: { farmId: farm.id },
      orderBy: [{ sampledAt: "asc" }, { createdAt: "asc" }],
    });

    const records: ChainRecord[] = samples.map((s) => ({
      id: s.id,
      payload: {
        farmId: s.farmId,
        plotId: s.plotId,
        sampledAt: s.sampledAt.toISOString(),
        depthTopCm: s.depthTopCm,
        depthBotCm: s.depthBotCm,
        socPct: s.socPct,
        bulkDensity: s.bulkDensity,
        coarseFragPct: s.coarseFragPct,
        labRef: s.labRef,
        method: s.method,
        isBaseline: s.isBaseline,
      },
      prevHash: s.prevHash,
      recordHash: s.recordHash,
    }));

    const result = verifyChain(records);

    summary.push({
      farmId: farm.id,
      farmNameTh: farm.nameTh,
      farmNameEn: farm.nameEn,
      standard: farm.standard,
      areaHa: farm.areaHa,
      sampleCount: farm._count.samples,
      totalRecords: records.length,
      valid: result.valid,
      verifiedRecords: result.verifiedRecords ?? 0,
      brokenAtIndex: result.brokenAtIndex ?? null,
    });
  }

  const totalRecords = summary.reduce((s, f) => s + f.totalRecords, 0);
  const totalValid = summary.filter((f) => f.valid).length;

  return NextResponse.json({
    farms: summary,
    totalFarms: summary.length,
    totalRecords,
    totalValid,
    allValid: totalValid === summary.length,
  });
}
