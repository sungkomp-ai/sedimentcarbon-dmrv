import { NextResponse } from "next/server";
import { STANDARD_LIST } from "@/lib/core/standards";

export async function GET() {
  return NextResponse.json({
    standards: STANDARD_LIST.map((s) => ({
      code: s.code,
      labelTh: s.labelTh,
      labelEn: s.labelEn,
      bufferPct: s.bufferPct,
      uncertaintyThresholdPct: s.uncertaintyThresholdPct,
      minMonitoringIntervalYr: s.minMonitoringIntervalYr,
      minCreditingPeriodYr: s.minCreditingPeriodYr,
      requiresAdditionality: s.requiresAdditionality,
      requiresPermanenceAgreement: s.requiresPermanenceAgreement,
      registryUrl: s.registryUrl,
      accent: s.accent,
    })),
  });
}
