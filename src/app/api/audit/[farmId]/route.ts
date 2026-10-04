import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyChain, type ChainRecord } from "@/lib/core/audit";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ farmId: string }> }
) {
  const { farmId } = await params;
  const samples = await db.soilSample.findMany({
    where: { farmId },
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

  return NextResponse.json({
    totalRecords: records.length,
    valid: result.valid,
    brokenAtIndex: result.brokenAtIndex ?? null,
    brokenRecordId: result.recordId ?? null,
    verifiedRecords: result.verifiedRecords ?? 0,
    records: records.map((r) => ({
      id: r.id,
      payload: r.payload,
      prevHash: r.prevHash,
      recordHash: r.recordHash,
    })),
  });
}
