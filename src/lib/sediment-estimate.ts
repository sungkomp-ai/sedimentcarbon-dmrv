/**
 * Realistic sediment estimation helpers.
 *
 * The small physical trap measurements (m² × cm depth) are only a SAMPLE
 * of the actual sediment retained on the farm. The total retained sediment
 * is computed from USLE-style erosion × farm area × design trapping
 * efficiency × project age — that's the BIG number we show as the farm's
 * total sediment retained, while the trap measurements remain a small
 * verification sample.
 *
 * Each highland farm has 7-10 terrace LEVELS (one per contour band), and
 * the total is the sum across all levels. Flat lowland farms have only
 * 1-2 traps (no terraces needed).
 */

import type { Locale } from "./i18n/translations";

const SED_BULK_DENSITY = 1.3; // t/m³ — typical for trapped sediment
const SED_SOC_PCT = 1.4; // %C in sediment
const C_TO_CO2 = 44 / 12;

/** Estimate baseline erosion rate (t/ha/yr) from slope %. USLE-style lookup. */
export function estimateErosionFromSlope(slopePct: number | null | undefined): number {
  const s = slopePct ?? 0;
  if (s < 3) return 5; // flat, minimal erosion
  if (s < 8) return 12; // gently sloping
  if (s < 15) return 25; // rolling
  if (s < 25) return 45; // moderately steep
  if (s < 35) return 70; // steep highland
  if (s < 45) return 95; // very steep
  return 120; // extreme
}

/** Estimate trapping efficiency (0-1) from the trap types installed. */
export function estimateTrappingEfficiency(trapTypes: string[]): number {
  let efficiency = 0.25; // baseline — even bare soil retains some
  if (trapTypes.includes("contour_bund")) efficiency += 0.10;
  if (trapTypes.includes("vegetative_strip")) efficiency += 0.10;
  if (trapTypes.includes("terrace_step")) efficiency += 0.18;
  if (trapTypes.includes("vetiver_bund")) efficiency += 0.15;
  if (trapTypes.includes("check_dam")) efficiency += 0.10;
  if (trapTypes.includes("alternating_slope")) efficiency += 0.08;
  return Math.min(0.85, Math.round(efficiency * 100) / 100);
}

/**
 * Estimate number of terrace LEVELS on a farm.
 * Highland farms (slope ≥ 15%) have 7-10 levels; flat lowland has 1-2.
 */
export function computeNumTerraceLevels(
  slopePct: number | null | undefined,
  areaHa: number
): number {
  const s = slopePct ?? 0;
  if (s < 8) return Math.max(1, Math.min(2, Math.floor(areaHa / 5))); // flat: 1-2 traps
  if (s < 15) return Math.max(2, Math.min(4, Math.floor(areaHa / 3))); // gentle: 2-4
  // Highland: 7-10 levels based on slope
  const base = 7;
  const slopeBonus = Math.floor((s - 15) / 5); // +1 per 5% slope above 15
  return Math.min(10, base + slopeBonus);
}

export interface EstimatedSedimentTotal {
  baselineErosionTPerHaYr: number;
  trappingEfficiency: number;
  projectYears: number;
  numTerraceLevels: number;
  perLayerSedimentT: number;
  totalSedimentT: number;
  totalVolumeM3: number;
  totalCarbonT: number;
  totalCo2eT: number;
  /** Sample captured in monitoring traps (small fraction of total). */
  sampleVolumeM3: number;
  sampleMassT: number;
  sampleCarbonT: number;
  sampleCo2eT: number;
  /** Sample-to-total ratio (e.g. 0.01 means sample is 1% of total). */
  sampleRatio: number;
}

/**
 * Compute the farm's total estimated sediment retention plus the
 * monitoring trap sample.
 */
export function computeEstimatedSedimentTotal(params: {
  areaHa: number;
  slopePct: number | null | undefined;
  trapTypes: string[];
  projectStart: Date | string | null;
  /** Trap measurements from the DB (used to compute the sample total). */
  traps: { areaM2: number; deltaHCm: number; bulkDensity?: number; socPct?: number }[];
}): EstimatedSedimentTotal {
  const { areaHa, slopePct, trapTypes, projectStart, traps } = params;

  const baselineErosion = estimateErosionFromSlope(slopePct);
  const efficiency = estimateTrappingEfficiency(trapTypes);
  const numLevels = computeNumTerraceLevels(slopePct, areaHa);

  // Project age in years
  const start = projectStart ? new Date(projectStart) : new Date("2020-01-01");
  const years = Math.max(
    1,
    (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 365)
  );

  // Total sediment retained on farm (USLE-based)
  // mass_t = erosion × area_ha × efficiency × years
  const totalSedimentT = baselineErosion * areaHa * efficiency * years;
  const totalVolumeM3 = totalSedimentT / SED_BULK_DENSITY;
  const totalCarbonT = totalSedimentT * (SED_SOC_PCT / 100);
  const totalCo2eT = totalCarbonT * C_TO_CO2;

  const perLayerSedimentT = totalSedimentT / numLevels;

  // Sample captured in physical monitoring traps (small)
  const sampleVolumeM3 = traps.reduce(
    (s, t) => s + t.areaM2 * (t.deltaHCm / 100),
    0
  );
  const sampleMassT = sampleVolumeM3 * (traps[0]?.bulkDensity ?? SED_BULK_DENSITY);
  const sampleCarbonT = sampleMassT * ((traps[0]?.socPct ?? SED_SOC_PCT) / 100);
  const sampleCo2eT = sampleCarbonT * C_TO_CO2;

  const sampleRatio = totalSedimentT > 0 ? sampleMassT / totalSedimentT : 0;

  const round = (v: number, d: number) => {
    const f = 10 ** d;
    return Math.round(v * f) / f;
  };

  return {
    baselineErosionTPerHaYr: baselineErosion,
    trappingEfficiency: efficiency,
    projectYears: round(years, 1),
    numTerraceLevels: numLevels,
    perLayerSedimentT: round(perLayerSedimentT, 1),
    totalSedimentT: round(totalSedimentT, 1),
    totalVolumeM3: round(totalVolumeM3, 1),
    totalCarbonT: round(totalCarbonT, 3),
    totalCo2eT: round(totalCo2eT, 1),
    sampleVolumeM3: round(sampleVolumeM3, 2),
    sampleMassT: round(sampleMassT, 3),
    sampleCarbonT: round(sampleCarbonT, 4),
    sampleCo2eT: round(sampleCo2eT, 3),
    sampleRatio: round(sampleRatio, 4),
  };
}

/** Format a number using locale-aware thousands separators. */
export function fmt(n: number, locale: Locale, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: 1,
    ...opts,
  }).format(n);
}
