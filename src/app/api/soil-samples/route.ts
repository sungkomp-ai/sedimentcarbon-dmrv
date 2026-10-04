import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordHash } from "@/lib/core/audit";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const baselineOnly = searchParams.get("baseline") === "1";

  const where: { farmId?: string; isBaseline?: boolean } = {};
  if (farmId) where.farmId = farmId;
  if (baselineOnly) where.isBaseline = true;

  const samples = await db.soilSample.findMany({
    where,
    orderBy: [{ sampledAt: "asc" }, { createdAt: "asc" }],
    include: { plot: true, farm: true },
  });

  const result = samples.map((s) => ({
    id: s.id,
    farmId: s.farmId,
    farmNameTh: s.farm?.nameTh ?? null,
    farmNameEn: s.farm?.nameEn ?? null,
    plotId: s.plotId,
    plotCode: s.plot?.plotCode ?? null,
    stratum: s.plot?.stratum ?? null,
    sampledAt: s.sampledAt,
    depthTopCm: s.depthTopCm,
    depthBotCm: s.depthBotCm,
    socPct: s.socPct,
    bulkDensity: s.bulkDensity,
    coarseFragPct: s.coarseFragPct,
    labRef: s.labRef,
    method: s.method,
    isBaseline: s.isBaseline,
    recordHash: s.recordHash,
    prevHash: s.prevHash,
  }));

  return NextResponse.json({ samples: result });
}

interface CreateSampleBody {
  farmId: string;
  plotId?: string | null;
  plotCode?: string;
  sampledAt: string;
  depthTopCm: number;
  depthBotCm: number;
  socPct: number;
  bulkDensity: number;
  coarseFragPct?: number;
  labRef?: string;
  method?: string;
  isBaseline?: boolean;
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreateSampleBody;

  // Auto-resolve plotId from plotCode if not provided
  let plotId = body.plotId ?? null;
  if (!plotId && body.plotCode) {
    const plot = await db.monitoringPlot.findFirst({
      where: { farmId: body.farmId, plotCode: body.plotCode },
    });
    plotId = plot?.id ?? null;
  }

  // Get the latest sample in this farm to chain from
  const latest = await db.soilSample.findFirst({
    where: { farmId: body.farmId },
    orderBy: [{ sampledAt: "desc" }, { createdAt: "desc" }],
  });
  const prevHash = latest?.recordHash ?? null;

  const payload = {
    farmId: body.farmId,
    plotId,
    sampledAt: new Date(body.sampledAt).toISOString(),
    depthTopCm: body.depthTopCm,
    depthBotCm: body.depthBotCm,
    socPct: body.socPct,
    bulkDensity: body.bulkDensity,
    coarseFragPct: body.coarseFragPct ?? 0,
    labRef: body.labRef ?? null,
    method: body.method ?? "dry_combustion",
    isBaseline: body.isBaseline ?? false,
  };
  const hash = recordHash(payload, prevHash);

  const sample = await db.soilSample.create({
    data: {
      farmId: body.farmId,
      plotId,
      sampledAt: new Date(body.sampledAt),
      depthTopCm: body.depthTopCm,
      depthBotCm: body.depthBotCm,
      socPct: body.socPct,
      bulkDensity: body.bulkDensity,
      coarseFragPct: body.coarseFragPct ?? 0,
      labRef: body.labRef,
      method: body.method ?? "dry_combustion",
      isBaseline: body.isBaseline ?? false,
      prevHash,
      recordHash: hash,
    },
  });

  return NextResponse.json({ sample }, { status: 201 });
}
