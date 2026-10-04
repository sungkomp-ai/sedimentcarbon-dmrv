/**
 * Carbon Credit Standards Rules
 * Ported from Python spec.
 *
 * Standards: T-VER (Thailand), VCS (Verra), Gold Standard, ISO 14064-2
 */

export type StandardName = "TVER" | "VCS" | "GOLD_STANDARD" | "ISO14064";

export interface StandardRule {
  code: StandardName;
  labelTh: string;
  labelEn: string;
  bufferPct: number; // e.g. 0.10 = 10%
  uncertaintyThresholdPct: number;
  minMonitoringIntervalYr: number;
  minCreditingPeriodYr: number;
  requiresAdditionality: boolean;
  requiresPermanenceAgreement: boolean;
  registryUrl: string;
  accent: string; // hex accent color for UI
}

export const STANDARDS: Record<StandardName, StandardRule> = {
  TVER: {
    code: "TVER",
    labelTh: "มาตรฐาน T-VER (ประเทศไทย)",
    labelEn: "Thailand Voluntary Emission Reduction",
    bufferPct: 0.1,
    uncertaintyThresholdPct: 15.0,
    minMonitoringIntervalYr: 2,
    minCreditingPeriodYr: 7,
    requiresAdditionality: true,
    requiresPermanenceAgreement: true,
    registryUrl: "https://ghgreduction.tgo.or.th",
    accent: "#16a34a",
  },
  VCS: {
    code: "VCS",
    labelTh: "มาตรฐาน Verra VCS",
    labelEn: "Verified Carbon Standard",
    bufferPct: 0.2,
    uncertaintyThresholdPct: 15.0,
    minMonitoringIntervalYr: 2,
    minCreditingPeriodYr: 20,
    requiresAdditionality: true,
    requiresPermanenceAgreement: true,
    registryUrl: "https://registry.verra.org",
    accent: "#0d9488",
  },
  GOLD_STANDARD: {
    code: "GOLD_STANDARD",
    labelTh: "มาตรฐาน Gold Standard",
    labelEn: "Gold Standard for the Global Goals",
    bufferPct: 0.15,
    uncertaintyThresholdPct: 15.0,
    minMonitoringIntervalYr: 3,
    minCreditingPeriodYr: 10,
    requiresAdditionality: true,
    requiresPermanenceAgreement: true,
    registryUrl: "https://registry.goldstandard.org",
    accent: "#ca8a04",
  },
  ISO14064: {
    code: "ISO14064",
    labelTh: "มาตรฐาน ISO 14064-2",
    labelEn: "ISO 14064-2 GHG Project",
    bufferPct: 0.0,
    uncertaintyThresholdPct: 20.0,
    minMonitoringIntervalYr: 1,
    minCreditingPeriodYr: 5,
    requiresAdditionality: false,
    requiresPermanenceAgreement: false,
    registryUrl: "",
    accent: "#9333ea",
  },
};

export const STANDARD_LIST: StandardRule[] = Object.values(STANDARDS);

export function getRule(code: string): StandardRule {
  const key = code.toUpperCase() as StandardName;
  const rule = STANDARDS[key];
  if (!rule) throw new Error(`Unknown standard: ${code}`);
  return rule;
}

/**
 * Uncertainty deduction (0.0 - 1.0).
 * Below threshold = 0; at 2x threshold = 1.0 (full deduction); linear in between.
 */
export function uncertaintyDeduction(uncPct: number, rule: StandardRule): number {
  if (uncPct <= rule.uncertaintyThresholdPct) return 0.0;
  if (uncPct >= 2 * rule.uncertaintyThresholdPct) return 1.0;
  return (uncPct - rule.uncertaintyThresholdPct) / 100.0;
}
