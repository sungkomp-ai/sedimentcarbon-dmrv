/**
 * SOC (Soil Organic Carbon) Calculation Engine
 * Ported from Python spec - IPCC 2019 Refinement + ESM correction
 *
 * Reference equations:
 *  (ก) SOC_stock = (%C / 100) x BD x D x (1 - CF / 100) x 100   -> t C/ha
 *  (ข) M_soil = BD x D x 100 -> t/ha   (Equivalent Soil Mass)
 *  (c) ΔSOC = (SOC_t2 - SOC_t1) / T
 *  (ช) U(%) = (t_0.95 x SD) / (x̄ x √n) x 100
 */

export const C_TO_CO2 = 44 / 12;

export interface SoilLayer {
  socPct: number; // %C
  bulkDensity: number; // g/cm3
  depthCm: number; // cm
  coarseFragPct?: number; // %
}

export function stockPerHa(layer: SoilLayer): number {
  /** SOC stock = %C/100 x BD x D x (1 - CF/100) x 100 -> t C/ha */
  const cf = layer.coarseFragPct ?? 0;
  return (
    (layer.socPct / 100.0) *
    layer.bulkDensity *
    layer.depthCm *
    (1.0 - cf / 100.0) *
    100.0
  );
}

export function soilMassPerHa(layer: SoilLayer): number {
  /** M = BD x D x 100 -> t/ha */
  return layer.bulkDensity * layer.depthCm * 100.0;
}

export function profileStock(layers: SoilLayer[]): number {
  return layers.reduce((sum, l) => sum + stockPerHa(l), 0);
}

/**
 * Equivalent Soil Mass correction.
 * Accumulate SOC mass up to reference mass; partial last layer is taken
 * proportionally. Returns tonnes of carbon per hectare.
 */
export function equivalentSoilMassStock(
  layers: SoilLayer[],
  referenceMassTHa: number
): number {
  let cumMass = 0.0;
  let cumC = 0.0;
  for (const layer of layers) {
    const m = soilMassPerHa(layer);
    if (cumMass + m <= referenceMassTHa) {
      cumMass += m;
      cumC += (m * layer.socPct) / 100.0;
    } else {
      const remaining = referenceMassTHa - cumMass;
      cumC += (remaining * layer.socPct) / 100.0;
      cumMass = referenceMassTHa;
      break;
    }
  }
  return cumC;
}

// t-table (two-tailed, alpha = 0.05)
const T_TABLE: Record<number, number> = {
  2: 12.706, 3: 4.303, 4: 3.182, 5: 2.776, 6: 2.571,
  7: 2.447, 8: 2.365, 9: 2.306, 10: 2.262, 15: 2.145,
  20: 2.093, 30: 2.045,
};

export function tValue(n: number): number {
  if (n > 30) return 1.96;
  const keys = Object.keys(T_TABLE).map(Number).sort((a, b) => a - b);
  for (const k of keys) {
    if (n - 1 <= k) return T_TABLE[k];
  }
  return 2.045;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

/**
 * Uncertainty (%) at 95% confidence relative to the mean.
 */
export function uncertaintyPct(samples: number[]): number {
  const n = samples.length;
  if (n < 2) return 100.0;
  const m = mean(samples);
  if (m === 0) return 100.0;
  const sd = standardDeviation(samples);
  return (tValue(n) * sd) / (Math.abs(m) * Math.sqrt(n)) * 100.0;
}

/**
 * Required sample size to reach target uncertainty.
 */
export function requiredSampleSize(samples: number[], targetPct = 15.0): number {
  if (samples.length < 2) return 5;
  const m = mean(samples);
  const sd = standardDeviation(samples);
  const cv = m !== 0 ? sd / Math.abs(m) : 1.0;
  return Math.max(3, Math.ceil((1.96 * cv / (targetPct / 100.0)) ** 2));
}

export function annualDeltaSoc(socT1: number, socT2: number, years: number): number {
  if (years <= 0) throw new Error("years must be > 0");
  return (socT2 - socT1) / years;
}

export interface SocStockResult {
  socStockTCPerHa: number;
  co2eTPerHa: number;
  byLayer: { depthCm: number; stockTCPerHa: number }[];
}

export function socStock(layers: SoilLayer[]): SocStockResult {
  const total = profileStock(layers);
  return {
    socStockTCPerHa: round(total, 3),
    co2eTPerHa: round(total * C_TO_CO2, 3),
    byLayer: layers.map((l) => ({
      depthCm: l.depthCm,
      stockTCPerHa: round(stockPerHa(l), 3),
    })),
  };
}

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
