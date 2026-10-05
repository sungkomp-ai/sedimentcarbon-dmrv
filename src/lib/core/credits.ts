/**
 * Carbon Credit Calculation Engine
 * Ported from Python spec + biochar extension.
 *
 * Reference equation:
 *  (ง) ER_net = (ΔSOC x 44/12 x A) - E_project - LK - BU
 *
 * Biochar extension (per IPCC 2019 Refinement + VCS Biochar Methodology):
 *  biochar_C_stock = application_rate (t/ha) × area (ha) × biochar_C_pct × stability_factor
 *  biochar_CO2e    = biochar_C_stock × 44/12
 *  total_gross     = (ΔSOC × 44/12 × A × T) + biochar_CO2e
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
  /** Biochar application rate (tonnes of biochar per hectare, one-time). */
  biocharRateTPerHa?: number;
  /** Carbon content of biochar as % of mass (default 70%). */
  biocharCarbonPct?: number;
  /** BC+100 stability factor — fraction of biochar C that remains after 100 yr (default 0.80). */
  biocharStabilityFactor?: number;
}

export interface CreditResult {
  standard: StandardName;
  standardLabelTh: string;
  standardLabelEn: string;
  years: number;
  areaHa: number;
  deltaSocTCPerHaYr: number;
  grossCo2e: number;
  /** Biochar gross CO2e contribution (0 if no biochar applied). */
  biocharCo2eT: number;
  /** Biochar permanent C stock (t C). */
  biocharCStockT: number;
  /** SOC-only gross (without biochar). */
  socGrossCo2eT: number;
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

/**
 * Compute the biochar permanent C stock (tonnes of C) and CO2e equivalent.
 * Returns { cStockT, co2eT } — both zero when no biochar is applied.
 *
 * Formula (VCS Biochar Methodology / IPCC 2019 Refinement):
 *   C_persistent = rate (t/ha) × area (ha) × C_pct × BC+100
 *   CO2e_persistent = C_persistent × 44/12
 */
export function computeBiocharCredits(params: {
  areaHa: number;
  rateTPerHa?: number;
  carbonPct?: number;
  stabilityFactor?: number;
}): { cStockT: number; co2eT: number } {
  const { areaHa, rateTPerHa = 0, carbonPct = 70, stabilityFactor = 0.8 } = params;
  if (!rateTPerHa || rateTPerHa <= 0) {
    return { cStockT: 0, co2eT: 0 };
  }
  const cStockT = rateTPerHa * areaHa * (carbonPct / 100) * stabilityFactor;
  const co2eT = cStockT * C_TO_CO2;
  return { cStockT, co2eT };
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
    biocharRateTPerHa = 0,
    biocharCarbonPct = 70,
    biocharStabilityFactor = 0.8,
  } = input;

  const deltaSoc = annualDeltaSoc(socBaselineTHa, socCurrentTHa, years);
  const socGross = deltaSoc * C_TO_CO2 * areaHa * years;

  // Biochar permanent C stock + CO2e
  const biochar = computeBiocharCredits({
    areaHa,
    rateTPerHa: biocharRateTPerHa,
    carbonPct: biocharCarbonPct,
    stabilityFactor: biocharStabilityFactor,
  });

  const gross = socGross + biochar.co2eT;

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
    biocharCo2eT: round(biochar.co2eT, 3),
    biocharCStockT: round(biochar.cStockT, 3),
    socGrossCo2eT: round(socGross, 3),
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
