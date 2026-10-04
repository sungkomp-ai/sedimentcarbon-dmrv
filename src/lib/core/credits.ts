/**
 * Carbon Credit Calculation Engine
 * Ported from Python spec.
 *
 * Reference equation:
 *  (ง) ER_net = (ΔSOC x 44/12 x A) - E_project - LK - BU
 *
 *  Applies:
 *   - uncertainty deduction when uncertainty > threshold
 *   - buffer pool set per standard
 */

import { C_TO_CO2, annualDeltaSoc, uncertaintyPct } from "./soc";
import { n2oTotal, ch4FromFlooding, fuelEmissions } from "./emissions";
import {
  STANDARDS,
  STANDARD_LIST,
  getRule,
  uncertaintyDeduction,
  type StandardName,
  type StandardRule,
} from "./standards";

export interface CreditInput {
  socBaselineTHa: number;
  socCurrentTHa: number;
  years: number;
  areaHa: number;
  standard?: StandardName | string;
  nFertiliserKgHaYr?: number;
  floodedDaysYr?: number;
  dieselLitreTotal?: number;
  leakageTco2e?: number;
  socSamples?: number[];
}

export interface CreditResult {
  standard: StandardName;
  standardLabelTh: string;
  standardLabelEn: string;
  years: number;
  areaHa: number;
  deltaSocTCPerHaYr: number;
  grossCo2e: number;
  projectEmissionsCo2e: number;
  leakageCo2e: number;
  uncertaintyPct: number;
  uncertaintyDeductionPct: number;
  bufferPct: number;
  bufferCo2e: number;
  netCreditsTco2e: number;
  annualCreditsTco2e: number;
}

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function computeForRule(
  rule: StandardRule,
  input: Omit<CreditInput, "standard">
): CreditResult {
  const {
    socBaselineTHa,
    socCurrentTHa,
    years,
    areaHa,
    nFertiliserKgHaYr = 0,
    floodedDaysYr = 0,
    dieselLitreTotal = 0,
    leakageTco2e = 0,
    socSamples = [],
  } = input;

  const deltaSoc = annualDeltaSoc(socBaselineTHa, socCurrentTHa, years);
  const gross = deltaSoc * C_TO_CO2 * areaHa * years;

  const emis =
    (n2oTotal(nFertiliserKgHaYr) + ch4FromFlooding(floodedDaysYr)) *
    areaHa *
    years;
  const emisPlusFuel = emis + fuelEmissions(dieselLitreTotal);

  const unc = socSamples.length > 0 ? uncertaintyPct(socSamples) : 0.0;
  const deduct = uncertaintyDeduction(unc, rule);

  const subtotal = Math.max(0.0, gross - emisPlusFuel - leakageTco2e) * (1 - deduct);
  const bufferAmount = subtotal * rule.bufferPct;
  const net = subtotal - bufferAmount;

  return {
    standard: rule.code,
    standardLabelTh: rule.labelTh,
    standardLabelEn: rule.labelEn,
    years,
    areaHa: round(areaHa, 4),
    deltaSocTCPerHaYr: round(deltaSoc, 4),
    grossCo2e: round(gross, 3),
    projectEmissionsCo2e: round(emisPlusFuel, 3),
    leakageCo2e: round(leakageTco2e, 3),
    uncertaintyPct: round(unc, 2),
    uncertaintyDeductionPct: round(deduct * 100, 2),
    bufferPct: round(rule.bufferPct * 100, 2),
    bufferCo2e: round(bufferAmount, 3),
    netCreditsTco2e: round(net, 3),
    annualCreditsTco2e: round(net / years, 3),
  };
}

export function computeCredits(input: CreditInput): CreditResult {
  const { standard, ...rest } = input;
  const rule = standard ? getRule(standard) : STANDARDS.TVER;
  return computeForRule(rule, rest);
}

export function compareAllStandards(input: CreditInput): CreditResult[] {
  const { standard: _omit, ...rest } = input;
  return STANDARD_LIST.map((rule) => computeForRule(rule, rest));
}
