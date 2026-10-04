"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calculator as CalcIcon,
  Plus,
  Trash2,
  Layers3,
  Banknote,
  TestTube2,
  Network,
  TrendingUp,
} from "lucide-react";
import { STANDARD_LIST } from "@/lib/core/standards";
import type { CreditResult } from "@/lib/core/credits";
import type { FinanceResult } from "@/lib/core/finance";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function CalculatorSection() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{t("calc.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("warn.estimate")}</p>
      </div>

      <Tabs defaultValue="credits" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="credits" className="gap-1.5">
            <CalcIcon className="h-3.5 w-3.5" /> {t("calc.tab.credits")}
          </TabsTrigger>
          <TabsTrigger value="soc" className="gap-1.5">
            <Layers3 className="h-3.5 w-3.5" /> {t("calc.tab.soc")}
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-1.5">
            <Banknote className="h-3.5 w-3.5" /> {t("calc.tab.finance")}
          </TabsTrigger>
          <TabsTrigger value="samples" className="gap-1.5">
            <TestTube2 className="h-3.5 w-3.5" /> {t("calc.tab.samples")}
          </TabsTrigger>
          <TabsTrigger value="aggregation" className="gap-1.5">
            <Network className="h-3.5 w-3.5" /> {t("calc.tab.aggregation")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="credits" className="mt-4">
          <CreditsTab />
        </TabsContent>
        <TabsContent value="soc" className="mt-4">
          <SocStockTab />
        </TabsContent>
        <TabsContent value="finance" className="mt-4">
          <FinanceTab />
        </TabsContent>
        <TabsContent value="samples" className="mt-4">
          <SampleAdequacyTab />
        </TabsContent>
        <TabsContent value="aggregation" className="mt-4">
          <AggregationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// -------- Credits Tab --------
function CreditsTab() {
  const { t, fmt } = useI18n();
  const { toast } = useToast();
  const [baseline, setBaseline] = useState("32.4");
  const [current, setCurrent] = useState("36.9");
  const [years, setYears] = useState("5");
  const [area, setArea] = useState("50");
  const [fertiliser, setFertiliser] = useState("60");
  const [flooded, setFlooded] = useState("0");
  const [diesel, setDiesel] = useState("0");
  const [leakage, setLeakage] = useState("15");
  const [samples, setSamples] = useState("31.8, 33.2, 32.0, 34.1, 31.5");
  const [comparison, setComparison] = useState<CreditResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function compute() {
    setLoading(true);
    try {
      const body = {
        socBaselineTHa: Number(baseline),
        socCurrentTHa: Number(current),
        years: Number(years),
        areaHa: Number(area),
        nFertiliserKgHaYr: Number(fertiliser) || 0,
        floodedDaysYr: Number(flooded) || 0,
        dieselLitreTotal: Number(diesel) || 0,
        leakageTco2e: Number(leakage) || 0,
        socSamples: samples
          .split(/[,\s]+/)
          .map((s) => Number(s))
          .filter((n) => !Number.isNaN(n) && n > 0),
      };
      const res = await fetch("/api/calculate/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      const data = await res.json();
      setComparison(data.comparison ?? [data.result]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t("calc.credits.compare")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("calc.credits.baseline")} value={baseline} onChange={setBaseline} />
            <Field label={t("calc.credits.current")} value={current} onChange={setCurrent} />
            <Field label={t("calc.credits.years")} value={years} onChange={setYears} />
            <Field label={t("calc.credits.area")} value={area} onChange={setArea} />
            <Field label={t("calc.credits.fertiliser")} value={fertiliser} onChange={setFertiliser} />
            <Field label={t("calc.credits.flooded")} value={flooded} onChange={setFlooded} />
            <Field label={t("calc.credits.diesel")} value={diesel} onChange={setDiesel} />
            <Field label={t("calc.credits.leakage")} value={leakage} onChange={setLeakage} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("calc.credits.samples")}</Label>
            <Input value={samples} onChange={(e) => setSamples(e.target.value)} className="font-mono text-xs" />
          </div>
          <Button onClick={compute} disabled={loading} className="w-full gap-2">
            <CalcIcon className="h-4 w-4" /> {loading ? t("common.loading") : t("calc.credits.compare")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("warn.estimate")}</p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">{t("calc.credits.result")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!comparison ? (
            <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
              {t("common.none")}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="standard" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(Number(v), { maximumFractionDigits: 0 })} />
                    <Tooltip formatter={(v: number) => fmt(v, { maximumFractionDigits: 2 })} />
                    <Legend />
                    <Bar dataKey="grossCo2e" name="Gross" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="projectEmissionsCo2e" name="Emissions" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="netCreditsTco2e" name="Net" radius={[4, 4, 0, 0]} barSize={18}>
                      {comparison.map((r) => {
                        const rule = STANDARD_LIST.find((s) => s.code === r.standard);
                        return <Cell key={r.standard} fill={rule?.accent ?? "#16a34a"} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("standards.code")}</TableHead>
                      <TableHead className="text-right">ΔSOC</TableHead>
                      <TableHead className="text-right">{t("credit.gross")}</TableHead>
                      <TableHead className="text-right">Emissions</TableHead>
                      <TableHead className="text-right">Buffer</TableHead>
                      <TableHead className="text-right">{t("credit.net")}</TableHead>
                      <TableHead className="text-right">/yr</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.map((r) => {
                      const rule = STANDARD_LIST.find((s) => s.code === r.standard);
                      return (
                        <TableRow key={r.standard}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ background: rule?.accent }}
                              />
                              <span className="font-medium">{r.standard}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(r.deltaSocTCPerHaYr)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(r.grossCo2e)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                            -{fmt(r.projectEmissionsCo2e)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                            -{fmt(r.bufferCo2e)} ({r.bufferPct}%)
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                            {fmt(r.netCreditsTco2e)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(r.annualCreditsTco2e)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                <div className="rounded-md bg-muted/60 p-2.5">
                  <div className="text-muted-foreground">{t("credit.uncertainty")}</div>
                  <div className="font-medium tabular-nums">
                    {comparison[0]?.uncertaintyPct ?? 0}% (
                    {comparison[0]?.uncertaintyDeductionPct ?? 0}% ded.)
                  </div>
                </div>
                <div className="rounded-md bg-muted/60 p-2.5">
                  <div className="text-muted-foreground">Leakage</div>
                  <div className="font-medium tabular-nums">
                    -{fmt(comparison[0]?.leakageCo2e ?? 0)} {t("unit.tco2e")}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// -------- SOC Stock Tab --------
interface LayerState {
  socPct: string;
  bulkDensity: string;
  depthCm: string;
  coarseFragPct: string;
}

function SocStockTab() {
  const { t, fmt } = useI18n();
  const [layers, setLayers] = useState<LayerState[]>([
    { socPct: "1.85", bulkDensity: "1.35", depthCm: "30", coarseFragPct: "5" },
  ]);
  const [result, setResult] = useState<{ socStockTCPerHa: number; co2eTPerHa: number; byLayer: { depthCm: number; stockTCPerHa: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  function addLayer() {
    setLayers([...layers, { socPct: "", bulkDensity: "1.35", depthCm: "10", coarseFragPct: "0" }]);
  }
  function removeLayer(i: number) {
    setLayers(layers.filter((_, idx) => idx !== i));
  }
  function update(i: number, key: keyof LayerState, v: string) {
    setLayers(layers.map((l, idx) => (idx === i ? { ...l, [key]: v } : l)));
  }

  async function compute() {
    setLoading(true);
    try {
      const body = {
        layers: layers.map((l) => ({
          socPct: Number(l.socPct),
          bulkDensity: Number(l.bulkDensity),
          depthCm: Number(l.depthCm),
          coarseFragPct: Number(l.coarseFragPct) || 0,
        })),
      };
      const res = await fetch("/api/calculate/soc-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{t("calc.soc.layers")}</span>
            <Button variant="outline" size="sm" onClick={addLayer} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {t("calc.soc.addLayer")}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {layers.map((l, i) => (
            <div key={i} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="secondary">Layer {i + 1}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeLayer(i)}
                  aria-label="Remove layer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label={t("samples.socPct")} value={l.socPct} onChange={(v) => update(i, "socPct", v)} />
                <Field label={t("samples.bulkDensity")} value={l.bulkDensity} onChange={(v) => update(i, "bulkDensity", v)} />
                <Field label={t("samples.depth")} value={l.depthCm} onChange={(v) => update(i, "depthCm", v)} />
                <Field label={t("samples.coarseFrag")} value={l.coarseFragPct} onChange={(v) => update(i, "coarseFragPct", v)} />
              </div>
            </div>
          ))}
          <Button onClick={compute} disabled={loading} className="w-full gap-2">
            <CalcIcon className="h-4 w-4" /> {t("calc.credits.compare")}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t("calc.soc.result")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
              {t("common.none")}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
                  <div className="text-xs text-muted-foreground">{t("calc.soc.stock")}</div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {fmt(result.socStockTCPerHa)}
                  </div>
                  <div className="text-xs text-muted-foreground">{t("unit.tcPerHa")}</div>
                </div>
                <div className="rounded-md bg-violet-50/60 dark:bg-violet-950/20 p-3">
                  <div className="text-xs text-muted-foreground">{t("calc.soc.co2e")}</div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {fmt(result.co2eTPerHa)}
                  </div>
                  <div className="text-xs text-muted-foreground">{t("unit.tco2e")}</div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">{t("calc.soc.layers")}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("samples.depth")}</TableHead>
                      <TableHead className="text-right">{t("calc.soc.stock")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.byLayer.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm tabular-nums">{l.depthCm} cm</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {fmt(l.stockTCPerHa)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// -------- Finance Tab --------
function FinanceTab() {
  const { t, fmt } = useI18n();
  const [annualCredits, setAnnualCredits] = useState("125.6");
  const [price, setPrice] = useState("350");
  const [capex, setCapex] = useState("4500");
  const [opex, setOpex] = useState("800");
  const [verifyCost, setVerifyCost] = useState("150000");
  const [verifyEvery, setVerifyEvery] = useState("3");
  const [years, setYears] = useState("10");
  const [discount, setDiscount] = useState("8");
  const [cobenefit, setCobenefit] = useState("1200");
  const [area, setArea] = useState("50");
  const [result, setResult] = useState<FinanceResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function compute() {
    setLoading(true);
    try {
      const body = {
        areaHa: Number(area),
        annualCreditsTco2e: Number(annualCredits),
        pricePerTco2e: Number(price),
        capexPerHa: Number(capex),
        opexPerHaYr: Number(opex),
        verificationCost: Number(verifyCost),
        verificationEveryYr: Number(verifyEvery),
        years: Number(years),
        discountRate: Number(discount) / 100,
        cobenefitThbHaYr: Number(cobenefit),
      };
      const res = await fetch("/api/calculate/financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(data.result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t("calc.fin.cashflow")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("calc.credits.area")} value={area} onChange={setArea} />
            <Field label={`${t("credit.net")}/yr (${t("unit.tco2e")})`} value={annualCredits} onChange={setAnnualCredits} />
            <Field label={t("calc.fin.price")} value={price} onChange={setPrice} />
            <Field label={t("calc.fin.capex")} value={capex} onChange={setCapex} />
            <Field label={t("calc.fin.opex")} value={opex} onChange={setOpex} />
            <Field label={t("calc.fin.verifyCost")} value={verifyCost} onChange={setVerifyCost} />
            <Field label={t("calc.fin.verifyEvery")} value={verifyEvery} onChange={setVerifyEvery} />
            <Field label={t("calc.fin.years")} value={years} onChange={setYears} />
            <Field label={t("calc.fin.discount")} value={discount} onChange={setDiscount} />
            <Field label={t("calc.fin.cobenefit")} value={cobenefit} onChange={setCobenefit} />
          </div>
          <Button onClick={compute} disabled={loading} className="w-full gap-2">
            <TrendingUp className="h-4 w-4" /> {loading ? t("common.loading") : t("calc.fin.compute")}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">{t("calc.credits.result")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
              {t("common.none")}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label={t("calc.fin.npv")} value={result.npvThb} fmt={fmt} suffix="THB" tone="violet" />
                <Metric label={t("calc.fin.irr")} value={result.irrPct} fmt={fmt} suffix="%" tone="emerald" />
                <Metric label={t("calc.fin.payback")} value={result.paybackYear} fmt={fmt} suffix={t("unit.yr")} tone="amber" />
                <Metric label={t("calc.fin.breakeven")} value={result.breakevenPriceThbPerTco2e} fmt={fmt} suffix="THB/tCO₂e" tone="sky" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-muted/60 p-2.5">
                  <div className="text-xs text-muted-foreground">{t("calc.fin.capexTotal")}</div>
                  <div className="font-medium tabular-nums">{fmt(result.capexThb)} {t("unit.thb")}</div>
                </div>
                <div className="rounded-md bg-muted/60 p-2.5">
                  <div className="text-xs text-muted-foreground">{t("calc.fin.costTotal")}</div>
                  <div className="font-medium tabular-nums">{fmt(result.totalCostThb)} {t("unit.thb")}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">{t("calc.fin.cashflow")}</h4>
                  <Badge variant={result.isViable ? "default" : "destructive"} className={result.isViable ? "bg-emerald-600" : ""}>
                    {result.isViable ? t("calc.fin.viable") : t("calc.fin.notViable")}
                  </Badge>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={result.cashflow}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(Number(v) / 1000, { maximumFractionDigits: 0 }) + "k"} />
                      <Tooltip formatter={(v: number) => fmt(v, { maximumFractionDigits: 0 }) + " THB"} />
                      <Legend />
                      <Bar dataKey="cost" name="Cost" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="carbonRevenue" name="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
                      <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// -------- Sample Adequacy Tab --------
function SampleAdequacyTab() {
  const { t, fmt } = useI18n();
  const [samples, setSamples] = useState("31.8, 33.2, 32.0, 34.1, 31.5");
  const [target, setTarget] = useState("15");
  const [result, setResult] = useState<{ nCurrent: number; uncertaintyPct: number; nRequired: number; isAdequate: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function compute() {
    setLoading(true);
    try {
      const arr = samples.split(/[,\s]+/).map((s) => Number(s)).filter((n) => !Number.isNaN(n) && n > 0);
      const res = await fetch("/api/calculate/sample-adequacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples: arr, targetPct: Number(target) }),
      });
      if (!res.ok) throw new Error("Failed");
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("calc.samples.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <div className="space-y-1.5">
              <Label>{t("calc.samples.input")}</Label>
              <Input value={samples} onChange={(e) => setSamples(e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("calc.samples.target")}</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} type="number" />
            </div>
            <Button onClick={compute} disabled={loading} className="gap-2">
              <CalcIcon className="h-4 w-4" /> {loading ? t("common.loading") : t("calc.credits.compare")}
            </Button>
          </div>
          <div className="rounded-md border bg-muted/30 p-4 space-y-2">
            {!result ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {t("common.none")}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("calc.samples.current")}</span>
                  <span className="font-semibold tabular-nums">{result.nCurrent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("calc.samples.required")}</span>
                  <span className="font-semibold tabular-nums">{result.nRequired}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("calc.samples.unc")}</span>
                  <span className="font-semibold tabular-nums">{fmt(result.uncertaintyPct)}%</span>
                </div>
                <div className="pt-2 border-t">
                  <Badge variant={result.isAdequate ? "default" : "destructive"} className={result.isAdequate ? "bg-emerald-600" : ""}>
                    {result.isAdequate ? t("calc.samples.adequate") : t("calc.samples.inadequate")}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// -------- Aggregation Tab --------
function AggregationTab() {
  const { t, fmt } = useI18n();
  const [areas, setAreas] = useState("10, 15, 25, 50, 30");
  const [cost, setCost] = useState("150000");
  const [result, setResult] = useState<{ nFarms: number; totalAreaHa: number; verificationCostPerHaSolo: number; verificationCostPerHaGrouped: number; savingPct: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function compute() {
    setLoading(true);
    try {
      const arr = areas.split(/[,\s]+/).map((s) => Number(s)).filter((n) => !Number.isNaN(n) && n > 0);
      const res = await fetch("/api/calculate/aggregation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmAreasHa: arr, verificationCost: Number(cost) }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(data.result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("calc.aggregation.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <div className="space-y-1.5">
              <Label>{t("calc.aggregation.areas")}</Label>
              <Input value={areas} onChange={(e) => setAreas(e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("calc.aggregation.verifyCost")}</Label>
              <Input value={cost} onChange={(e) => setCost(e.target.value)} type="number" />
            </div>
            <Button onClick={compute} disabled={loading} className="gap-2">
              <Network className="h-4 w-4" /> {loading ? t("common.loading") : t("calc.aggregation.compute")}
            </Button>
          </div>
          <div className="rounded-md border bg-muted/30 p-4 space-y-2">
            {!result ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {t("common.none")}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("dashboard.totalFarms")}</span>
                  <span className="font-semibold tabular-nums">{result.nFarms}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("dashboard.totalArea")}</span>
                  <span className="font-semibold tabular-nums">{fmt(result.totalAreaHa)} ha</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("calc.aggregation.solo")}</span>
                  <span className="font-semibold tabular-nums">{fmt(result.verificationCostPerHaSolo)} THB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("calc.aggregation.grouped")}</span>
                  <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(result.verificationCostPerHaGrouped)} THB</span>
                </div>
                <div className="pt-2 border-t">
                  <Badge variant="default" className="bg-emerald-600">
                    {t("calc.aggregation.saving")}: {fmt(result.savingPct)}%
                  </Badge>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// -------- Helpers --------
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} type="number" step="0.01" className="text-sm" />
    </div>
  );
}

function Metric({ label, value, fmt, suffix, tone }: { label: string; value: number | null; fmt: (n: number, opts?: Intl.NumberFormatOptions) => string; suffix: string; tone: "violet" | "emerald" | "amber" | "sky" }) {
  const tones: Record<string, string> = {
    violet: "bg-violet-50/60 dark:bg-violet-950/20",
    emerald: "bg-emerald-50/60 dark:bg-emerald-950/20",
    amber: "bg-amber-50/60 dark:bg-amber-950/20",
    sky: "bg-sky-50/60 dark:bg-sky-950/20",
  };
  return (
    <div className={`rounded-md p-3 ${tones[tone]}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">
        {value === null ? "—" : fmt(value)}
      </div>
      <div className="text-xs text-muted-foreground">{suffix}</div>
    </div>
  );
}
