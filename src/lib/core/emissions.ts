/**
 * Project Emissions Engine (N2O / CH4 / fuel / lime)
 * IPCC 2019, AR6 GWP100. Ported from Python spec.
 *
 * Reference equations:
 *  (ง) ER_net = (ΔSOC x 44/12 x A) - E_project - LK - BU
 *  (จ) E_N2O = F_SN x EF1 x 44/28 x 273
 */

export const GWP_N2O = 273;
export const GWP_CH4 = 27.9;
export const EF1_DIRECT = 0.01; // kg N2O-N / kg N applied
export const EF4_VOLAT = 0.01; // volatilisation NH3/NOx
export const EF5_LEACH = 0.011; // leaching
export const FRAC_GASF = 0.11;
export const FRAC_LEACH = 0.24;

/** Direct N2O from applied N: tCO2e / ha */
export function n2oDirect(nAppliedKgHa: number, ef1 = EF1_DIRECT): number {
  return (nAppliedKgHa * ef1 * (44 / 28) * GWP_N2O) / 1000.0;
}

/** Indirect N2O from volatilisation + leaching: tCO2e / ha */
export function n2oIndirect(nAppliedKgHa: number): number {
  const volat = nAppliedKgHa * FRAC_GASF * EF4_VOLAT;
  const leach = nAppliedKgHa * FRAC_LEACH * EF5_LEACH;
  return ((volat + leach) * (44 / 28) * GWP_N2O) / 1000.0;
}

/** Total N2O (direct + indirect): tCO2e / ha */
export function n2oTotal(nAppliedKgHa: number): number {
  return n2oDirect(nAppliedKgHa) + n2oIndirect(nAppliedKgHa);
}

/** CH4 from flooded fields: tCO2e / ha */
export function ch4FromFlooding(floodedDays: number, efKgHaDay = 1.3): number {
  return (floodedDays * efKgHaDay * GWP_CH4) / 1000.0;
}

/** Fuel emissions (diesel) for the project: tCO2e */
export function fuelEmissions(dieselLitre: number, efKgCo2PerLitre = 2.68): number {
  return (dieselLitre * efKgCo2PerLitre) / 1000.0;
}

/** Lime emissions: tCO2e */
export function limeEmissions(limestoneT: number, dolomiteT = 0): number {
  return (limestoneT * 0.12 + dolomiteT * 0.13) * (44 / 12);
}
