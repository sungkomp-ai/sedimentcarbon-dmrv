import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compareAllStandards, type CreditInput } from "@/lib/core/credits";
import { verifyChain, type ChainRecord } from "@/lib/core/audit";
import { mean } from "@/lib/core/soc";

interface RouteParams {
  params: Promise<{ farmId: string }>;
}

/**
 * GET /api/vvb/[farmId]
 * Returns all verification rounds for a farm, plus a snapshot of the
 * project's current credit comparison and audit trail status.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { farmId } = await params;

  const farm = await db.farm.findUnique({
    where: { id: farmId },
    include: {
      _count: { select: { samples: true, sediment: true, activities: true } },
      verifications: {
        orderBy: [{ roundType: "asc" }, { roundNumber: "asc" }],
      },
    },
  });

  if (!farm) {
    return NextResponse.json({ error: "Farm not found" }, { status: 404 });
  }

  // Build credit comparison from samples
  const samples = await db.soilSample.findMany({
    where: { farmId },
    orderBy: [{ sampledAt: "asc" }, { createdAt: "asc" }],
  });
  const baseline = samples.filter((s) => s.isBaseline).map((s) => s.socPct);
  const current = samples.filter((s) => !s.isBaseline).map((s) => s.socPct);

  let creditComparison: ReturnType<typeof compareAllStandards> | null = null;
  if (baseline.length > 0 && current.length > 0) {
    const bd = samples[0]?.bulkDensity ?? 1.34;
    const cf = samples[0]?.coarseFragPct ?? 5;
    const baselineStock = (mean(baseline) / 100) * bd * 30 * (1 - cf / 100) * 100;
    const currentStock = (mean(current) / 100) * bd * 30 * (1 - cf / 100) * 100;
    const projectStart = farm.projectStart ?? new Date("2020-01-01");
    const years =
      (Date.now() - projectStart.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const input: CreditInput = {
      socBaselineTHa: baselineStock,
      socCurrentTHa: currentStock,
      years: Math.max(1, Number(years.toFixed(2))),
      areaHa: farm.areaHa,
      socSamples: samples.map((s) => s.socPct),
    };
    creditComparison = compareAllStandards(input);
  }

  // Audit trail status
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
  const auditStatus = verifyChain(records);

  // Sediment totals
  const sed = await db.sedimentMeasurement.findMany({ where: { farmId } });
  const sedVolume = sed.reduce((s, m) => s + m.trapAreaM2 * (m.deltaHcm / 100), 0);
  const sedMass = sedVolume * 1.3;
  const sedCarbon = sedMass * 0.014;
  const sedCo2e = sedCarbon * (44 / 12);

  return NextResponse.json({
    farm: {
      id: farm.id,
      nameTh: farm.nameTh,
      nameEn: farm.nameEn,
      areaHa: farm.areaHa,
      slopePct: farm.slopePct,
      elevationM: farm.elevationM,
      soilType: farm.soilType,
      trapTypes: farm.trapTypes ? JSON.parse(farm.trapTypes) : [],
      crops: farm.crops ? JSON.parse(farm.crops) : [],
      plotDesign: farm.plotDesign ? JSON.parse(farm.plotDesign) : null,
      priorLandUse: farm.priorLandUse,
      projectStart: farm.projectStart,
      standard: farm.standard,
      creditingYears: farm.creditingYears,
      counts: {
        samples: farm._count.samples,
        sediment: farm._count.sediment,
        activities: farm._count.activities,
      },
    },
    rounds: farm.verifications.map((r) => ({
      id: r.id,
      roundType: r.roundType,
      roundNumber: r.roundNumber,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      status: r.status,
      vvbName: r.vvbName,
      vvbEmail: r.vvbEmail,
      submittedAt: r.submittedAt,
      verifiedAt: r.verifiedAt,
      creditsClaimed: r.creditsClaimed,
      creditsVerified: r.creditsVerified,
      deductionsPct: r.deductionsPct,
      findings: r.findings ? JSON.parse(r.findings) : [],
      statement: r.statement,
    })),
    creditComparison,
    audit: {
      totalRecords: records.length,
      valid: auditStatus.valid,
      verifiedRecords: auditStatus.verifiedRecords ?? 0,
      brokenAtIndex: auditStatus.brokenAtIndex ?? null,
    },
    sediment: {
      trapCount: sed.length,
      volumeM3: Math.round(sedVolume * 100) / 100,
      massT: Math.round(sedMass * 100) / 100,
      carbonT: Math.round(sedCarbon * 1000) / 1000,
      co2eT: Math.round(sedCo2e * 1000) / 1000,
    },
  });
}

/**
 * POST /api/vvb/[farmId]
 * Create a new verification round.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { farmId } = await params;
  const body = await req.json();

  // Determine next round number for this type
  const existing = await db.verificationRound.findMany({
    where: { farmId, roundType: body.roundType ?? "verification" },
  });
  const nextNumber = existing.length;

  const round = await db.verificationRound.create({
    data: {
      farmId,
      roundType: body.roundType ?? "verification",
      roundNumber: nextNumber,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      status: body.status ?? "planned",
      vvbName: body.vvbName,
      vvbEmail: body.vvbEmail,
      creditsClaimed: body.creditsClaimed ?? null,
      findings: JSON.stringify(body.findings ?? []),
      statement: body.statement ?? null,
    },
  });

  return NextResponse.json({ round }, { status: 201 });
}
