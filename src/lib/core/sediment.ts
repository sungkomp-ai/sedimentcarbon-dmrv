/**
 * Sediment-Trap Agriculture Calculations
 * Ported from Python spec.
 *
 * Reference equations:
 *  (ฉ) V_sed = Σ (A_trap x Δh)
 *      M_sed = V_sed x BD_sed
 *      C_retained = M_sed x %C_sed
 */

import { C_TO_CO2 } from "./soc";

export interface SedimentTrap {
  trapId: string;
  areaM2: number;
  deltaHCm: number;
  bulkDensity?: number; // t/m3, default 1.3
  socPct?: number; // %C in sediment, default 1.2
}

export function trapVolumeM3(trap: SedimentTrap): number {
  return trap.areaM2 * (trap.deltaHCm / 100.0);
}

export function trapMassT(trap: SedimentTrap): number {
  return trapVolumeM3(trap) * (trap.bulkDensity ?? 1.3);
}

export function trapCarbonRetainedT(trap: SedimentTrap): number {
  return trapMassT(trap) * ((trap.socPct ?? 1.2) / 100.0);
}

export interface SedimentTotals {
  volumeM3: number;
  massT: number;
  carbonRetainedT: number;
  co2eRetained: number;
}

export function totalSediment(traps: SedimentTrap[]): SedimentTotals {
  const volume = sum(traps.map(trapVolumeM3));
  const mass = sum(traps.map(trapMassT));
  const carbon = sum(traps.map(trapCarbonRetainedT));
  return {
    volumeM3: round(volume, 2),
    massT: round(mass, 2),
    carbonRetainedT: round(carbon, 3),
    co2eRetained: round(carbon * C_TO_CO2, 3),
  };
}

/**
 * Soil-loss reduction (co-benefit, not counted as direct credit).
 */
export function soilLossReduction(
  baselineTHaYr: number,
  projectTHaYr: number
): { reductionTHaYr: number; reductionPct: number } {
  const reduction = baselineTHaYr - projectTHaYr;
  const pct = baselineTHaYr ? (reduction / baselineTHaYr) * 100.0 : 0.0;
  return {
    reductionTHaYr: round(reduction, 3),
    reductionPct: round(pct, 1),
  };
}

/** USLE: A = R x K x LS x C x P  (t/ha/yr) - baseline soil loss */
export function usleSoilLoss(
  R: number,
  K: number,
  LS: number,
  C: number,
  P: number
): number {
  return R * K * LS * C * P;
}

function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
