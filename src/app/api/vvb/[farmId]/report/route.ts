import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { compareAllStandards, type CreditInput } from "@/lib/core/credits";
import { verifyChain, type ChainRecord } from "@/lib/core/audit";
import { mean } from "@/lib/core/soc";
import { STANDARD_LIST } from "@/lib/core/standards";
import { projectCashflow } from "@/lib/core/finance";
import { totalSediment } from "@/lib/core/sediment";

interface RouteParams {
  params: Promise<{ farmId: string }>;
}

/**
 * GET /api/vvb/[farmId]/report
 *
 * Comprehensive verification report: project overview, baseline data,
 * monitoring data (sediment + activities), credit calculation by standard,
 * financial analysis with dMRV benefit, audit trail verification, and the
 * full list of verification rounds with VVB findings + statements.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { farmId } = await params;

  const farm = await db.farm.findUnique({
    where: { id: farmId },
    include: {
      owner: true,
      plots: true,
      verifications: {
        orderBy: [{ roundType: "asc" }, { roundNumber: "asc" }],
      },
    },
  });
  if (!farm) {
    return NextResponse.json({ error: "Farm not found" }, { status: 404 });
  }

  const samples = await db.soilSample.findMany({
    where: { farmId },
    orderBy: [{ sampledAt: "asc" }, { createdAt: "asc" }],
    include: { plot: true },
  });
  const sed = await db.sedimentMeasurement.findMany({ where: { farmId } });
  const activities = await db.managementActivity.findMany({
    where: { farmId },
    orderBy: { activityAt: "asc" },
  });

  // Credit comparison
  const baseline = samples.filter((s) => s.isBaseline).map((s) => s.socPct);
  const current = samples.filter((s) => !s.isBaseline).map((s) => s.socPct);
  let creditComparison: ReturnType<typeof compareAllStandards> | null = null;
  let annualCredits = 0;
  if (baseline.length > 0 && current.length > 0) {
    const bd = samples[0]?.bulkDensity ?? 1.34;
    const cf = samples[0]?.coarseFragPct ?? 5;
    const baselineStock = (mean(baseline) / 100) * bd * 30 * (1 - cf / 100) * 100;
    const currentStock = (mean(current) / 100) * bd * 30 * (1 - cf / 100) * 100;
    const projectStart = farm.projectStart ?? new Date("2020-01-01");
    const years = (Date.now() - projectStart.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const input: CreditInput = {
      socBaselineTHa: baselineStock,
      socCurrentTHa: currentStock,
      years: Math.max(1, Number(years.toFixed(2))),
      areaHa: farm.areaHa,
      socSamples: samples.map((s) => s.socPct),
    };
    creditComparison = compareAllStandards(input);
    const farmStandard = creditComparison.find((r) => r.standard === farm.standard);
    annualCredits = farmStandard?.annualCreditsTco2e ?? 0;
  }

  // Financial analysis (with default dMRV benefit: 50% reduction, +10% premium)
  const finance = projectCashflow({
    areaHa: farm.areaHa,
    annualCreditsTco2e: annualCredits,
    pricePerTco2e: 350 * 1.10, // +10% trust premium
    capexPerHa: 4500,
    opexPerHaYr: 800,
    verificationCost: 150000 * 0.5, // 50% reduction
    verificationEveryYr: 3,
    years: Math.max(5, farm.creditingYears),
  });

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
  const audit = verifyChain(records);

  // Sediment totals
  const sedTraps = sed.map((m) => ({
    trapId: m.trapId,
    areaM2: m.trapAreaM2,
    deltaHCm: m.deltaHcm,
    bulkDensity: m.sedBulkDensity,
    socPct: m.sedSocPct,
  }));
  const sedimentTotals = totalSediment(sedTraps);

  const rule = STANDARD_LIST.find((s) => s.code === farm.standard);

  return NextResponse.json({
    meta: {
      generatedAt: new Date().toISOString(),
      version: "1.0.0",
      type: "VVB Comprehensive Verification Report",
    },
    project: {
      farmId: farm.id,
      nameTh: farm.nameTh,
      nameEn: farm.nameEn,
      owner: farm.owner
        ? { name: farm.owner.fullName, email: farm.owner.email, role: farm.owner.role }
        : null,
      groupId: farm.groupId,
      areaHa: farm.areaHa,
      slopePct: farm.slopePct,
      elevationM: farm.elevationM,
      soilType: farm.soilType,
      priorLandUse: farm.priorLandUse,
      standard: farm.standard,
      standardLabel: rule?.labelEn,
      creditingYears: farm.creditingYears,
      projectStart: farm.projectStart,
      trapTypes: farm.trapTypes ? JSON.parse(farm.trapTypes) : [],
      crops: farm.crops ? JSON.parse(farm.crops) : [],
      plotDesign: farm.plotDesign ? JSON.parse(farm.plotDesign) : null,
      geomGeojson: farm.geomGeojson,
      monitoringPlots: farm.plots.map((p) => ({
        plotCode: p.plotCode,
        stratum: p.stratum,
        point: p.pointGeojson,
      })),
    },
    baseline: {
      sampleCount: baseline.length,
      socPctAvg: baseline.length ? mean(baseline) : null,
      samples: samples
        .filter((s) => s.isBaseline)
        .map((s) => ({
          id: s.id,
          plotCode: s.plot?.plotCode,
          sampledAt: s.sampledAt,
          socPct: s.socPct,
          bulkDensity: s.bulkDensity,
          coarseFragPct: s.coarseFragPct,
          labRef: s.labRef,
          method: s.method,
          recordHash: s.recordHash,
        })),
    },
    current: {
      sampleCount: current.length,
      socPctAvg: current.length ? mean(current) : null,
      samples: samples
        .filter((s) => !s.isBaseline)
        .map((s) => ({
          id: s.id,
          plotCode: s.plot?.plotCode,
          sampledAt: s.sampledAt,
          socPct: s.socPct,
          bulkDensity: s.bulkDensity,
          coarseFragPct: s.coarseFragPct,
          labRef: s.labRef,
          method: s.method,
          recordHash: s.recordHash,
        })),
    },
    sediment: {
      trapCount: sed.length,
      totals: sedimentTotals,
      traps: sed.map((m) => ({
        trapId: m.trapId,
        measuredAt: m.measuredAt,
        trapAreaM2: m.trapAreaM2,
        deltaHcm: m.deltaHcm,
        sedBulkDensity: m.sedBulkDensity,
        sedSocPct: m.sedSocPct,
        source: m.source,
      })),
    },
    activities: activities.map((a) => ({
      id: a.id,
      activityAt: a.activityAt,
      activity: a.activity,
      nRateKgHa: a.nRateKgHa,
      note: a.note,
    })),
    creditCalculation: creditComparison,
    financial: {
      withDmrvBenefit: finance,
      assumptions: {
        pricePerTco2e: 385, // 350 + 10% trust premium
        capexPerHa: 4500,
        opexPerHaYr: 800,
        verificationCost: 75000, // 150k × (1 - 0.5 dMRV reduction)
        verificationEveryYr: 3,
        years: Math.max(5, farm.creditingYears),
        discountRate: 0.08,
      },
    },
    audit: {
      totalRecords: records.length,
      valid: audit.valid,
      verifiedRecords: audit.verifiedRecords ?? 0,
      brokenAtIndex: audit.brokenAtIndex ?? null,
      chainHead: records[records.length - 1]?.recordHash ?? null,
    },
    verificationRounds: farm.verifications.map((r) => ({
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
  });
}
