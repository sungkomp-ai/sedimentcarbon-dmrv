/**
 * Financial Analysis Engine
 * Ported from Python spec using a TypeScript port of numpy-financial's IRR.
 *
 * Computes NPV, IRR, Payback, Break-even price, Aggregation benefit.
 */

export interface FinanceInput {
  areaHa: number;
  annualCreditsTco2e: number;
  pricePerTco2e?: number;
  capexPerHa?: number;
  opexPerHaYr?: number;
  /** Verification cost for the FIRST cycle (year 1 or first verificationEveryYr). */
  verificationCostYear1?: number;
  /** Verification cost for SUBSEQUENT cycles (reduced by dMRV benefit). */
  verificationCostSubsequent?: number;
  /** @deprecated — use verificationCostYear1 + verificationCostSubsequent instead. */
  verificationCost?: number;
  verificationEveryYr?: number;
  platformFeePct?: number;
  years?: number;
  discountRate?: number;
  priceEscalation?: number;
  cobenefitThbHaYr?: number;
  registrationCost?: number;
}

export interface CashflowRow {
  year: number;
  pricePerTco2e: number;
  carbonRevenue: number;
  cobenefitRevenue: number;
  cost: number;
  netCashflow: number;
  cumulative: number;
}

export interface FinanceResult {
  capexThb: number;
  totalCostThb: number;
  npvThb: number;
  irrPct: number | null;
  paybackYear: number | null;
  breakevenPriceThbPerTco2e: number | null;
  costPerHaTotal: number | null;
  isViable: boolean;
  cashflow: CashflowRow[];
}

export function projectCashflow(input: FinanceInput): FinanceResult {
  const {
    areaHa,
    annualCreditsTco2e,
    pricePerTco2e = 350,
    capexPerHa = 4500,
    opexPerHaYr = 800,
    verificationCostYear1,
    verificationCostSubsequent,
    verificationCost,
    verificationEveryYr = 3,
    platformFeePct = 0.1,
    years = 10,
    discountRate = 0.08,
    priceEscalation = 0.03,
    cobenefitThbHaYr = 0,
    registrationCost = 0,
  } = input;

  // Resolve verification costs: prefer Year1/Subsequent split, fall back to
  // single verificationCost for backward compatibility.
  const costYear1 = verificationCostYear1 ?? verificationCost ?? 150000;
  const costSubsequent = verificationCostSubsequent ?? verificationCost ?? 150000;

  const capex = capexPerHa * areaHa + registrationCost;
  const flows: number[] = [-capex];
  const rows: CashflowRow[] = [];

  let verificationCycleCount = 0;

  for (let y = 1; y <= years; y++) {
    const price = pricePerTco2e * (1 + priceEscalation) ** (y - 1);
    const carbonRev = annualCreditsTco2e * price * (1 - platformFeePct);
    const cobenefit = cobenefitThbHaYr * areaHa;
    const revenue = carbonRev + cobenefit;
    let cost = opexPerHaYr * areaHa;
    if (verificationEveryYr && y % verificationEveryYr === 0) {
      // First verification cycle uses costYear1 (full cost, no dMRV benefit yet).
      // Subsequent cycles use costSubsequent (reduced by dMRV benefit).
      cost += verificationCycleCount === 0 ? costYear1 : costSubsequent;
      verificationCycleCount++;
    }
    const net = revenue - cost;
    flows.push(net);
    rows.push({
      year: y,
      pricePerTco2e: round(price, 2),
      carbonRevenue: round(carbonRev, 2),
      cobenefitRevenue: round(cobenefit, 2),
      cost: round(cost, 2),
      netCashflow: round(net, 2),
      cumulative: 0,
    });
  }

  // Cumulative payback detection
  let cumulative = -capex;
  let payback: number | null = null;
  for (const r of rows) {
    cumulative += r.netCashflow;
    r.cumulative = round(cumulative, 2);
    if (cumulative >= 0 && payback === null) payback = r.year;
  }

  const irr = computeIRR(flows);
  const totalCost = capex + rows.reduce((s, r) => s + r.cost, 0);
  const totalCredits = annualCreditsTco2e * years * (1 - platformFeePct);

  return {
    capexThb: round(capex, 2),
    totalCostThb: round(totalCost, 2),
    npvThb: round(npv(discountRate, flows), 2),
    irrPct: irr === null || Number.isNaN(irr) ? null : round(irr * 100, 2),
    paybackYear: payback,
    breakevenPriceThbPerTco2e: totalCredits
      ? round(totalCost / totalCredits, 2)
      : null,
    costPerHaTotal: areaHa ? round(totalCost / areaHa, 2) : null,
    isViable: payback !== null && payback <= years,
    cashflow: rows,
  };
}

export interface AggregationResult {
  nFarms: number;
  totalAreaHa: number;
  verificationCostPerHaSolo: number;
  verificationCostPerHaGrouped: number;
  savingPct: number;
}

export function aggregationBenefit(
  farmAreasHa: number[],
  verificationCost = 150000
): AggregationResult {
  const total = sum(farmAreasHa);
  const validAreas = farmAreasHa.filter((a) => a > 0);
  const solo =
    validAreas.length > 0
      ? sum(validAreas.map((a) => verificationCost / a)) / validAreas.length
      : 0;
  const grouped = total ? verificationCost / total : 0.0;
  return {
    nFarms: farmAreasHa.length,
    totalAreaHa: round(total, 2),
    verificationCostPerHaSolo: round(solo, 2),
    verificationCostPerHaGrouped: round(grouped, 2),
    savingPct: round(solo ? (1 - grouped / solo) * 100 : 0.0, 1),
  };
}

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

/** Net Present Value given a discount rate and cashflow array (flows[0] = t0). */
export function npv(rate: number, flows: number[]): number {
  return flows.reduce((acc, flow, t) => acc + flow / (1 + rate) ** t, 0);
}

/**
 * Internal Rate of Return.
 * Bisection-based (Newton + bisection hybrid to handle multiple sign changes).
 * Returns null if no real root is found.
 */
export function computeIRR(flows: number[]): number | null {
  // Need at least one sign change for a positive root.
  let signChanges = 0;
  for (let i = 1; i < flows.length; i++) {
    if (flows[i - 1] !== 0 && flows[i] !== 0 && Math.sign(flows[i - 1]) !== Math.sign(flows[i])) {
      signChanges++;
    }
  }
  if (signChanges === 0) return null;

  const f = (rate: number) => npv(rate, flows);

  // Bisection between -0.999 and 10 (handle pathological cashflows)
  let lo = -0.999;
  let hi = 10;
  let fLo = f(lo);
  let fHi = f(hi);
  if (Math.sign(fLo) === Math.sign(fHi)) {
    // Try to expand search before giving up
    for (let r = -0.9; r <= 10; r += 0.05) {
      const fv = f(r);
      if (Math.sign(fv) !== Math.sign(fLo)) {
        hi = r;
        fHi = fv;
        break;
      }
      lo = r;
      fLo = fv;
    }
    if (Math.sign(fLo) === Math.sign(fHi)) return null;
  }

  let rate = (lo + hi) / 2;
  for (let i = 0; i < 200; i++) {
    const fv = f(rate);
    if (Math.abs(fv) < 1e-6) return rate;
    if (Math.sign(fv) === Math.sign(fLo)) {
      lo = rate;
      fLo = fv;
    } else {
      hi = rate;
      fHi = fv;
    }
    rate = (lo + hi) / 2;
  }
  return rate;
}
