"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  MapPin,
  Database,
} from "lucide-react";
import { STANDARD_LIST } from "@/lib/core/standards";
import { type CreditResult, computeBiocharCredits } from "@/lib/core/credits";
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
  const { t, locale } = useI18n();
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
        {/* key=locale forces a clean remount when language toggles, so the
            input fields re-initialise with the locale-appropriate default unit
            (ha for EN, rai for TH) and previous results are cleared. */}
        <TabsContent value="credits" className="mt-4" key={`credits-${locale}`}>
          <CreditsTab />
        </TabsContent>
        <TabsContent value="soc" className="mt-4" key={`soc-${locale}`}>
          <SocStockTab />
        </TabsContent>
        <TabsContent value="finance" className="mt-4" key={`finance-${locale}`}>
          <FinanceTab />
        </TabsContent>
        <TabsContent value="samples" className="mt-4" key={`samples-${locale}`}>
          <SampleAdequacyTab />
        </TabsContent>
        <TabsContent value="aggregation" className="mt-4" key={`agg-${locale}`}>
          <AggregationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// -------- Credits Tab --------
interface FarmOption {
  id: string;
  nameTh: string;
  nameEn: string | null;
  areaHa: number;
}
interface SoilSampleOption {
  id: string;
  socPct: number;
  bulkDensity: number;
  coarseFragPct: number;
  isBaseline: boolean;
}
function CreditsTab() {
  const { t, fmt, fmtArea, isThai, haToRai, raiToHa } = useI18n();
  const { toast } = useToast();
  const [baseline, setBaseline] = useState("32.4");
  const [current, setCurrent] = useState("36.9");
  const [years, setYears] = useState("5");
  // area shown in locale unit (rai for TH, ha for EN). Default 50 ha = 312.5 rai.
  const [area, setArea] = useState(isThai ? "312.5" : "50");
  const [fertiliser, setFertiliser] = useState("60");
  const [flooded, setFlooded] = useState("0");
  const [diesel, setDiesel] = useState("0");
  const [leakage, setLeakage] = useState("15");
  const [samples, setSamples] = useState("31.8, 33.2, 32.0, 34.1, 31.5");
  // Biochar state
  const [biocharEnabled, setBiocharEnabled] = useState(false);
  // Biochar rate in locale unit (rai for TH, ha for EN). Default 2 t/rai = 12.5 t/ha.
  const [biocharRate, setBiocharRate] = useState(isThai ? "2" : "12.5");
  const [biocharCarbonPct, setBiocharCarbonPct] = useState("70");
  const [biocharStability, setBiocharStability] = useState("0.8");
  const [biocharSource, setBiocharSource] = useState<"riceHusk" | "wood" | "cornCob" | "manure">("riceHusk");
  const [comparison, setComparison] = useState<CreditResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState("");

  // Farms list query (reuses the same query key as the Farms section so it
  // benefits from React Query's shared cache).
  const { data: farmsData, isLoading: farmsLoading } = useQuery<{ farms: FarmOption[] }>({
    queryKey: ["farms"],
    queryFn: async () => {
      const r = await fetch("/api/farms");
      if (!r.ok) throw new Error("Failed to load farms");
      return r.json();
    },
  });
  const farms = farmsData?.farms ?? [];

  // Soil samples for the selected farm (only fetches once a farm is picked).
  const { data: samplesData, isFetching: samplesFetching } = useQuery<{
    samples: SoilSampleOption[];
  }>({
    queryKey: ["soil-samples", selectedFarmId],
    enabled: !!selectedFarmId,
    queryFn: async () => {
      const r = await fetch(`/api/soil-samples?farmId=${selectedFarmId}`);
      if (!r.ok) throw new Error("Failed to load soil samples");
      return r.json();
    },
  });
  const farmSamples = samplesData?.samples ?? [];

  /**
   * Compute a single SOC stock value (t C/ha) for a group of samples.
   * Uses the formula from src/lib/core/soc.ts (matches the IPCC 2019 Refinement):
   *   stock = (mean_soc_pct / 100) * bulk_density * 30 * (1 - coarse_frag_pct/100) * 100
   * Mean is taken across all samples in the group.
   */
  function socStockFromSamples(group: SoilSampleOption[]): number {
    if (group.length === 0) return 0;
    const meanSoc = group.reduce((s, x) => s + x.socPct, 0) / group.length;
    const meanBd = group.reduce((s, x) => s + x.bulkDensity, 0) / group.length;
    const meanCf = group.reduce((s, x) => s + x.coarseFragPct, 0) / group.length;
    return (meanSoc / 100) * meanBd * 30 * (1 - meanCf / 100) * 100;
  }

  /**
   * Auto-fill baseline/current/area/samples from the selected farm's actual data,
   * then immediately trigger compute(). All fields remain editable afterwards.
   */
  async function applyFarmData() {
    if (!selectedFarmId) {
      toast({
        title: t("calc.farmSelectLabel"),
        description: t("calc.farmSelect"),
        variant: "destructive",
      });
      return;
    }
    const farm = farms.find((f) => f.id === selectedFarmId);
    if (!farm) {
      toast({ title: t("common.error"), description: "Farm not found", variant: "destructive" });
      return;
    }
    if (farmSamples.length === 0) {
      toast({
        title: t("calc.farmSelectLabel"),
        description: t("calc.farmSelectNoSamples"),
        variant: "destructive",
      });
      return;
    }
    const baselineSamples = farmSamples.filter((s) => s.isBaseline);
    const currentSamples = farmSamples.filter((s) => !s.isBaseline);
    if (baselineSamples.length === 0 || currentSamples.length === 0) {
      toast({
        title: t("calc.farmSelectLabel"),
        description: t("calc.farmSelectNoSamples"),
        variant: "destructive",
      });
      return;
    }
    // Area in locale unit (rai for TH, ha for EN).
    const newArea = isThai ? haToRai(farm.areaHa) : farm.areaHa;
    const baselineStock = socStockFromSamples(baselineSamples);
    const currentStock = socStockFromSamples(currentSamples);
    const samplesStr = currentSamples.map((s) => s.socPct).join(", ");
    const newBaseline = baselineStock.toFixed(2);
    const newCurrent = currentStock.toFixed(2);
    const newAreaStr = newArea.toFixed(2);

    setBaseline(newBaseline);
    setCurrent(newCurrent);
    setArea(newAreaStr);
    setSamples(samplesStr);
    toast({
      title: t("calc.farmSelectLabel"),
      description: t("calc.farmSelectFilled"),
    });
    // Trigger compute immediately with the freshly filled values (avoids
    // waiting for the next React state cycle before reading the new inputs).
    await compute({
      baseline: newBaseline,
      current: newCurrent,
      area: newAreaStr,
      samples: samplesStr,
    });
  }

  /**
   * Compute credit comparison across all standards. Accepts optional overrides
   * so that applyFarmData() can pass the freshly-filled values immediately,
   * without waiting for React state to flush.
   */
  async function compute(overrides?: {
    baseline?: string;
    current?: string;
    area?: string;
    samples?: string;
  }) {
    setLoading(true);
    try {
      const b = overrides?.baseline ?? baseline;
      const c = overrides?.current ?? current;
      const a = overrides?.area ?? area;
      const s = overrides?.samples ?? samples;
      const areaHa = isThai ? raiToHa(Number(a)) : Number(a);
      const biocharRateTPerHa = biocharEnabled
        ? isThai
          ? raiToHa(Number(biocharRate))
          : Number(biocharRate)
        : 0;
      const body = {
        socBaselineTHa: Number(b),
        socCurrentTHa: Number(c),
        years: Number(years),
        areaHa,
        nFertiliserKgHaYr: Number(fertiliser) || 0,
        floodedDaysYr: Number(flooded) || 0,
        dieselLitreTotal: Number(diesel) || 0,
        leakageTco2e: Number(leakage) || 0,
        socSamples: s
          .split(/[,\s]+/)
          .map((x) => Number(x))
          .filter((n) => !Number.isNaN(n) && n > 0),
        // Biochar inputs (only when enabled)
        biocharRateTPerHa,
        biocharCarbonPct: Number(biocharCarbonPct) || 70,
        biocharStabilityFactor: Number(biocharStability) || 0.8,
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

  // Live biochar preview
  const areaHa = isThai ? raiToHa(Number(area)) : Number(area);
  const biocharRateTPerHa = biocharEnabled
    ? isThai
      ? raiToHa(Number(biocharRate))
      : Number(biocharRate)
    : 0;
  const biocharPreview = biocharEnabled && biocharRateTPerHa > 0
    ? computeBiocharCredits({
        areaHa,
        rateTPerHa: biocharRateTPerHa,
        carbonPct: Number(biocharCarbonPct) || 70,
        stabilityFactor: Number(biocharStability) || 0.8,
      })
    : { cStockT: 0, co2eT: 0 };
  // Per-area preview (for the live preview card)
  const biocharPreviewPerHa = computeBiocharCredits({
    areaHa: 1,
    rateTPerHa: biocharRateTPerHa,
    carbonPct: Number(biocharCarbonPct) || 70,
    stabilityFactor: Number(biocharStability) || 0.8,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t("calc.credits.compare")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Farm selector — auto-fill baseline/current/area/samples from the
              selected farm's actual data. Optional; all fields remain
              manually editable afterwards. */}
          <div className="rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium">{t("calc.farmSelectLabel")}</span>
            </div>
            <Select
              value={selectedFarmId || "none"}
              onValueChange={(v) => setSelectedFarmId(v === "none" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("calc.farmSelect")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("calc.farmSelectEmpty")}</SelectItem>
                {farmsLoading ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {t("calc.farmSelectLoading")}
                  </div>
                ) : farms.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {t("common.none")}
                  </div>
                ) : (
                  farms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {isThai ? f.nameTh : (f.nameEn ?? f.nameTh)} ·{" "}
                      {fmtArea(f.areaHa, { digits: 1 })}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {t("calc.farmSelectHint")}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={applyFarmData}
              disabled={!selectedFarmId || samplesFetching || loading}
              className="w-full gap-2"
            >
              <Database className="h-4 w-4" />
              {samplesFetching ? t("common.loading") : t("calc.farmSelectCalc")}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("calc.credits.baseline")} value={baseline} onChange={setBaseline} />
            <Field label={t("calc.credits.current")} value={current} onChange={setCurrent} />
            <Field label={t("calc.credits.years")} value={years} onChange={setYears} />
            <Field label={isThai ? t("farms.areaRai") : t("calc.credits.area")} value={area} onChange={setArea} />
            <Field label={t("calc.credits.fertiliser")} value={fertiliser} onChange={setFertiliser} />
            <Field label={t("calc.credits.flooded")} value={flooded} onChange={setFlooded} />
            <Field label={t("calc.credits.diesel")} value={diesel} onChange={setDiesel} />
            <Field label={t("calc.credits.leakage")} value={leakage} onChange={setLeakage} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("calc.credits.samples")}</Label>
            <Input value={samples} onChange={(e) => setSamples(e.target.value)} className="font-mono text-xs" />
          </div>

          {/* Biochar panel */}
          <div className="rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium">{t("calc.biochar.title")}</span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <span className="text-xs text-muted-foreground">{t("calc.biochar.enable")}</span>
                <Switch checked={biocharEnabled} onCheckedChange={setBiocharEnabled} aria-label={t("calc.biochar.enable")} />
              </label>
            </div>

            <div className={biocharEnabled ? "space-y-3" : "space-y-3 opacity-50 pointer-events-none"}>
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label={isThai ? t("calc.biochar.rate") : t("calc.biochar.rateHa")}
                  value={biocharRate}
                  onChange={setBiocharRate}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("calc.biochar.source")}</Label>
                  <select
                    value={biocharSource}
                    onChange={(e) => setBiocharSource(e.target.value as typeof biocharSource)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="riceHusk">{t("calc.biochar.riceHusk")}</option>
                    <option value="wood">{t("calc.biochar.wood")}</option>
                    <option value="cornCob">{t("calc.biochar.cornCob")}</option>
                    <option value="manure">{t("calc.biochar.manure")}</option>
                  </select>
                </div>
                <Field
                  label={t("calc.biochar.carbonPct")}
                  value={biocharCarbonPct}
                  onChange={setBiocharCarbonPct}
                />
                <Field
                  label={t("calc.biochar.stability")}
                  value={biocharStability}
                  onChange={setBiocharStability}
                />
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {t("calc.biochar.stabilityHint")}
              </p>

              {/* Live biochar preview */}
              {biocharEnabled && biocharPreview.co2eT > 0 && (
                <div className="rounded-md bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/30 p-2.5 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">{isThai ? t("calc.biochar.cPerHa") : "C/ha"}</div>
                    <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fmt(biocharPreviewPerHa.cStockT, { maximumFractionDigits: 3 })} t C
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{isThai ? t("calc.biochar.co2ePerHa") : "CO₂e/ha"}</div>
                    <div className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {fmt(biocharPreviewPerHa.co2eT, { maximumFractionDigits: 3 })} tCO₂e
                    </div>
                  </div>
                  <div className="col-span-2 border-t pt-1.5">
                    <div className="text-muted-foreground">{t("calc.biochar.totalCo2e")}</div>
                    <div className="font-bold tabular-nums text-base text-amber-700 dark:text-amber-300">
                      {fmt(biocharPreview.co2eT, { maximumFractionDigits: 1 })} tCO₂e
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {fmt(biocharPreview.cStockT, { maximumFractionDigits: 1 })} t C × 44/12
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button onClick={() => compute()} disabled={loading} className="w-full gap-2">
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
                      {comparison.some((r) => r.biocharCo2eT > 0) && (
                        <TableHead className="text-right text-amber-700 dark:text-amber-300">
                          <Flame className="inline h-3 w-3 mr-1" />
                          {isThai ? "Biochar" : "Biochar"}
                        </TableHead>
                      )}
                      <TableHead className="text-right">Emissions</TableHead>
                      <TableHead className="text-right">Buffer</TableHead>
                      <TableHead className="text-right">{t("credit.net")}</TableHead>
                      <TableHead className="text-right">/yr</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.map((r) => {
                      const rule = STANDARD_LIST.find((s) => s.code === r.standard);
                      const hasBiochar = comparison.some((x) => x.biocharCo2eT > 0);
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
                          {hasBiochar && (
                            <TableCell className="text-right tabular-nums text-amber-700 dark:text-amber-300">
                              {r.biocharCo2eT > 0 ? `+${fmt(r.biocharCo2eT)}` : "—"}
                            </TableCell>
                          )}
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
  const { t, fmt, isThai, raiToHa } = useI18n();
  const [annualCredits, setAnnualCredits] = useState("125.6");
  const [price, setPrice] = useState("350");
  const [capex, setCapex] = useState("4500");
  const [opex, setOpex] = useState("800");
  // Two separate verification costs: Year 1 (full) vs subsequent (dMRV-reduced)
  const [verifyCostY1, setVerifyCostY1] = useState("150000");
  const [verifyCostSub, setVerifyCostSub] = useState("75000"); // already reduced by dMRV
  const [verifyEvery, setVerifyEvery] = useState("3");
  const [years, setYears] = useState("10");
  const [discount, setDiscount] = useState("8");
  const [cobenefit, setCobenefit] = useState("1200");
  const [area, setArea] = useState(isThai ? "312.5" : "50");

  // dMRV adjustment state
  const [dmrvEnabled, setDmrvEnabled] = useState(true);
  const [dmrvReduction, setDmrvReduction] = useState("50"); // % of verifier's on-site time saved
  const [dmrvPremium, setDmrvPremium] = useState("10"); // % credit price uplift

  const [result, setResult] = useState<FinanceResult | null>(null);
  const [baselineResult, setBaselineResult] = useState<FinanceResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Live-compute the adjusted values for the preview block
  const costY1 = Number(verifyCostY1) || 0;
  const basePrice = Number(price) || 0;
  const reductionPct = Number(dmrvReduction) || 0;
  const premiumPct = Number(dmrvPremium) || 0;
  // Subsequent cost: user can enter directly, or dMRV auto-reduces from Year 1 cost
  const costSubUserInput = Number(verifyCostSub) || 0;
  const costSubDmrvAdjusted = dmrvEnabled ? costY1 * (1 - reductionPct / 100) : costY1;
  // Use whichever is lower: user's direct input or dMRV-adjusted from Y1
  const adjCostSub = Math.min(costSubUserInput || Infinity, costSubDmrvAdjusted);
  const adjPrice = dmrvEnabled ? basePrice * (1 + premiumPct / 100) : basePrice;
  const verifySave = costY1 - adjCostSub;
  const priceAdd = adjPrice - basePrice;

  const verifyCycles = Math.max(1, Math.floor(Number(years) / Math.max(1, Number(verifyEvery))));
  const subsequentCycles = Math.max(0, verifyCycles - 1); // first cycle is Year 1 cost
  const totalVerifySave = verifySave * subsequentCycles;
  const totalPremiumRev = priceAdd * Number(annualCredits) * Number(years);

  async function compute() {
    setLoading(true);
    try {
      const areaHa = isThai ? raiToHa(Number(area)) : Number(area);
      // Baseline (no dMRV): both cycles use the full Year 1 cost
      const baseBody = {
        areaHa,
        annualCreditsTco2e: Number(annualCredits),
        pricePerTco2e: basePrice,
        capexPerHa: Number(capex),
        opexPerHaYr: Number(opex),
        verificationCostYear1: costY1,
        verificationCostSubsequent: costY1, // baseline: same cost for all cycles
        verificationEveryYr: Number(verifyEvery),
        years: Number(years),
        discountRate: Number(discount) / 100,
        cobenefitThbHaYr: Number(cobenefit),
      };
      // Adjusted (with dMRV): Year 1 stays full, subsequent cycles are reduced
      const adjustedBody = {
        ...baseBody,
        pricePerTco2e: adjPrice,
        verificationCostSubsequent: adjCostSub, // reduced cost for cycles 2+
      };
      // Run both: baseline (no dMRV) and adjusted (with dMRV)
      const [baseRes, adjRes] = await Promise.all([
        fetch("/api/calculate/financial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(baseBody),
        }),
        fetch("/api/calculate/financial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(adjustedBody),
        }),
      ]);
      if (!baseRes.ok || !adjRes.ok) throw new Error("Failed");
      const [baseData, adjData] = await Promise.all([baseRes.json(), adjRes.json()]);
      setBaselineResult(baseData.result);
      setResult(adjData.result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* dMRV adjustment explainer */}
      <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20">
        <CardContent className="flex items-start gap-3 py-3">
          <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium">{t("calc.fin.dmrvDescTitle")}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("calc.fin.dmrvDesc")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("calc.fin.cashflow")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={isThai ? t("farms.areaRai") : t("calc.credits.area")} value={area} onChange={setArea} />
              <Field label={`${t("credit.net")}/yr (${t("unit.tco2e")})`} value={annualCredits} onChange={setAnnualCredits} />
              <Field label={t("calc.fin.price")} value={price} onChange={setPrice} />
              <Field label={t("calc.fin.capex")} value={capex} onChange={setCapex} />
              <Field label={t("calc.fin.opex")} value={opex} onChange={setOpex} />
              <Field label={t("calc.fin.verifyCostY1")} value={verifyCostY1} onChange={setVerifyCostY1} />
              <Field label={t("calc.fin.verifyCostSub")} value={verifyCostSub} onChange={setVerifyCostSub} />
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

        {/* dMRV adjustment panel */}
        <Card className="lg:col-span-3 border-emerald-200 dark:border-emerald-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {t("calc.fin.dmrvTitle")}
              </CardTitle>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-muted-foreground">{t("calc.fin.dmrvEnable")}</span>
                <Switch checked={dmrvEnabled} onCheckedChange={setDmrvEnabled} aria-label={t("calc.fin.dmrvEnable")} />
              </label>
            </div>
          </CardHeader>
          <CardContent className={dmrvEnabled ? "space-y-4" : "space-y-4 opacity-50 pointer-events-none"}>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Reduction slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">{t("calc.fin.dmrvReduction")}</Label>
                  <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {reductionPct}%
                  </span>
                </div>
                <Slider
                  value={[reductionPct]}
                  onValueChange={(v) => setDmrvReduction(String(v[0]))}
                  min={0}
                  max={90}
                  step={5}
                  disabled={!dmrvEnabled}
                  aria-label={t("calc.fin.dmrvReduction")}
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("calc.fin.dmrvReductionHint")}
                </p>
              </div>

              {/* Premium slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">{t("calc.fin.dmrvPremium")}</Label>
                  <span className="text-sm font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                    +{premiumPct}%
                  </span>
                </div>
                <Slider
                  value={[premiumPct]}
                  onValueChange={(v) => setDmrvPremium(String(v[0]))}
                  min={0}
                  max={40}
                  step={1}
                  disabled={!dmrvEnabled}
                  aria-label={t("calc.fin.dmrvPremium")}
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("calc.fin.dmrvPremiumHint")}
                </p>
              </div>
            </div>

            {/* Live preview: Year 1 vs subsequent verification costs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Year 1 verification cost (full, no dMRV) */}
              <div className="rounded-md border bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-1">
                <div className="text-xs text-muted-foreground">{isThai ? "ค่าตรวจปีแรก (Validation)" : "Year 1 cost (Validation)"}</div>
                <div className="text-lg font-semibold tabular-nums">
                  {fmt(costY1)} {t("unit.thb")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isThai ? "ยังไม่มีข้อมูล dMRV → ตรวจเต็มรอบ" : "No dMRV data yet → full verification"}
                </div>
              </div>

              {/* Subsequent verification cost (dMRV-reduced) */}
              <div className="rounded-md border bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-1">
                <div className="text-xs text-muted-foreground">{isThai ? "ค่าตรวจปีถัดไป (Verification)" : "Subsequent cost (Verification)"}</div>
                <div className="text-sm font-medium tabular-nums line-through text-muted-foreground">
                  {fmt(costY1)} {t("unit.thb")}
                </div>
                <div className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {fmt(adjCostSub)} {t("unit.thb")}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                  {t("calc.fin.dmrvSave")}: {fmt(verifySave)} {t("unit.thb")}
                </div>
              </div>

              {/* Carbon price row */}
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <div className="text-xs text-muted-foreground">{t("calc.fin.dmrvBasePrice")}</div>
                <div className="text-sm font-medium tabular-nums line-through text-muted-foreground">
                  {fmt(basePrice)} {t("unit.thb")}
                </div>
                <div className="text-xs text-muted-foreground">{t("calc.fin.dmrvAdjPrice")}</div>
                <div className="text-lg font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                  {fmt(adjPrice)} {t("unit.thb")}
                </div>
                <div className="text-xs text-violet-600 dark:text-violet-400">
                  {t("calc.fin.dmrvAdd")}: {fmt(priceAdd)} {t("unit.thb")}
                </div>
              </div>
            </div>

            {/* Cumulative benefit preview */}
            <div className="rounded-md border bg-gradient-to-br from-emerald-50 to-violet-50 dark:from-emerald-950/30 dark:to-violet-950/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium">{t("calc.fin.dmrvBenefit")}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">{t("calc.fin.dmrvSaveTotal")}</div>
                  <div className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmt(totalVerifySave)} {t("unit.thb")}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{subsequentCycles} {isThai ? "รอบถัดไป" : "subsequent cycles"} × {fmt(verifySave)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("calc.fin.dmrvPremiumRevenueTotal")}</div>
                  <div className="font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                    {fmt(totalPremiumRev)} {t("unit.thb")}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {fmt(Number(annualCredits))} {t("unit.tco2e")}/yr × {years}{t("unit.yr")}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result panel: comparison baseline vs adjusted */}
      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {t("calc.credits.result")}
              {dmrvEnabled && baselineResult && (
                <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                  {t("calc.fin.dmrvBenefit")}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Metrics with before/after deltas */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCompare
                  label={t("calc.fin.npv")}
                  baseline={baselineResult?.npvThb}
                  adjusted={result.npvThb}
                  fmt={fmt}
                  suffix="THB"
                  tone="violet"
                  dmrvOn={dmrvEnabled}
                />
                <MetricCompare
                  label={t("calc.fin.irr")}
                  baseline={baselineResult?.irrPct}
                  adjusted={result.irrPct}
                  fmt={fmt}
                  suffix="%"
                  tone="emerald"
                  dmrvOn={dmrvEnabled}
                />
                <MetricCompare
                  label={t("calc.fin.payback")}
                  baseline={baselineResult?.paybackYear}
                  adjusted={result.paybackYear}
                  fmt={fmt}
                  suffix={t("unit.yr")}
                  tone="amber"
                  dmrvOn={dmrvEnabled}
                  lowerIsBetter
                />
                <MetricCompare
                  label={t("calc.fin.breakeven")}
                  baseline={baselineResult?.breakevenPriceThbPerTco2e}
                  adjusted={result.breakevenPriceThbPerTco2e}
                  fmt={fmt}
                  suffix="THB/tCO₂e"
                  tone="sky"
                  dmrvOn={dmrvEnabled}
                  lowerIsBetter
                />
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
          </CardContent>
        </Card>
      )}
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
  const { t, fmt, fmtArea, isThai, raiToHa } = useI18n();
  const [areas, setAreas] = useState(isThai ? "62.5, 93.75, 156.25, 312.5, 187.5" : "10, 15, 25, 50, 30");
  const [cost, setCost] = useState("150000");
  const [result, setResult] = useState<{ nFarms: number; totalAreaHa: number; verificationCostPerHaSolo: number; verificationCostPerHaGrouped: number; savingPct: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function compute() {
    setLoading(true);
    try {
      const arr = areas
        .split(/[,\s]+/)
        .map((s) => Number(s))
        .filter((n) => !Number.isNaN(n) && n > 0)
        .map((v) => (isThai ? raiToHa(v) : v));
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
              <Label>
                {t("calc.aggregation.areas")}
                {isThai ? ` (${t("unit.rai")})` : ` (ha)`}
              </Label>
              <Input value={areas} onChange={(e) => setAreas(e.target.value)} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">{t("farms.areaHelp")}</p>
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
                  <span className="font-semibold tabular-nums">{fmtArea(result.totalAreaHa)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("calc.aggregation.solo")}</span>
                  <span className="font-semibold tabular-nums">{fmt(result.verificationCostPerHaSolo)} THB/{isThai ? t("unit.rai") : "ha"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("calc.aggregation.grouped")}</span>
                  <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(result.verificationCostPerHaGrouped)} THB/{isThai ? t("unit.rai") : "ha"}</span>
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

/**
 * Like Metric, but shows before/after delta when dMRV is on. If dMRV is off
 * (dmrvOn=false), behaves like a single-value Metric (no delta shown).
 */
function MetricCompare({
  label,
  baseline,
  adjusted,
  fmt,
  suffix,
  tone,
  dmrvOn,
  lowerIsBetter = false,
}: {
  label: string;
  baseline: number | null | undefined;
  adjusted: number | null;
  fmt: (n: number, opts?: Intl.NumberFormatOptions) => string;
  suffix: string;
  tone: "violet" | "emerald" | "amber" | "sky";
  dmrvOn: boolean;
  lowerIsBetter?: boolean;
}) {
  const tones: Record<string, string> = {
    violet: "bg-violet-50/60 dark:bg-violet-950/20",
    emerald: "bg-emerald-50/60 dark:bg-emerald-950/20",
    amber: "bg-amber-50/60 dark:bg-amber-950/20",
    sky: "bg-sky-50/60 dark:bg-sky-950/20",
  };

  // Compute delta
  const hasBoth = dmrvOn && baseline != null && adjusted != null;
  const delta = hasBoth ? (adjusted as number) - (baseline as number) : 0;
  // "Improved" means delta is in the good direction (lower is better => negative delta good)
  const isImproved = hasBoth && (lowerIsBetter ? delta < 0 : delta > 0);
  const isFlat = hasBoth && delta === 0;
  const deltaLabel =
    delta > 0 ? `+${fmt(delta)}` : `${fmt(delta)}`;

  return (
    <div className={`rounded-md p-3 ${tones[tone]}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">
        {adjusted === null ? "—" : fmt(adjusted)}
      </div>
      <div className="flex items-center gap-1 text-xs">
        {hasBoth ? (
          <>
            <span className="text-muted-foreground">
              {fmt(baseline as number)} →
            </span>
            <span
              className={
                isImproved
                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                  : isFlat
                  ? "text-muted-foreground"
                  : "text-red-600 dark:text-red-400 font-medium"
              }
            >
              {isImproved ? <ArrowUpRight className="inline h-3 w-3" /> : null}
              {isImproved || !isFlat ? (
                <ArrowDownRight className={isImproved ? "hidden" : "inline h-3 w-3"} />
              ) : null}
              {" "}
              {deltaLabel}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}
