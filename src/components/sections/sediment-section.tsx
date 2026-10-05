"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { SectionHeader } from "./section-header";
import { SedimentFormDialog } from "./sediment-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/store/app";
import { Plus, Layers3, Gauge, Mountain, Leaf } from "lucide-react";
import { useState } from "react";
import { totalSediment, type SedimentTrap } from "@/lib/core/sediment";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Farm } from "./farms-section";

interface Sediment {
  id: string;
  farmId: string;
  farmNameTh: string | null;
  trapId: string;
  measuredAt: string;
  trapAreaM2: number;
  deltaHcm: number;
  sedBulkDensity: number;
  sedSocPct: number;
  source: string;
}

export function SedimentSection() {
  const { t, fmt, fmtDate, locale } = useI18n();
  const { selectedFarmId } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: farmsData } = useQuery<{ farms: Farm[] }>({
    queryKey: ["farms"],
    queryFn: async () => {
      const r = await fetch("/api/farms");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  interface SedimentApiResponse {
    measurements: Sediment[];
    farmTotals: {
      farmId: string;
      farmNameTh: string;
      farmNameEn: string | null;
      areaHa: number;
      slopePct: number | null;
      trapCount: number;
      sample: { volumeM3: number; massT: number; carbonT: number; co2eT: number };
      estimated: {
        baselineErosionTPerHaYr: number;
        trappingEfficiency: number;
        projectYears: number;
        numTerraceLevels: number;
        perLayerSedimentT: number;
        totalSedimentT: number;
        totalVolumeM3: number;
        totalCarbonT: number;
        totalCo2eT: number;
        sampleRatio: number;
      };
    }[];
    aggregate: {
      sampleVolumeM3: number;
      sampleMassT: number;
      estimatedSedimentT: number;
      estimatedVolumeM3: number;
      estimatedCarbonT: number;
      estimatedCo2eT: number;
    };
  }

  const { data, isLoading } = useQuery<SedimentApiResponse>({
    queryKey: ["sediment", selectedFarmId],
    queryFn: async () => {
      const url = selectedFarmId
        ? `/api/sediment?farmId=${selectedFarmId}`
        : "/api/sediment";
      const r = await fetch(url);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const measurements = data?.measurements ?? [];
  const traps: SedimentTrap[] = measurements.map((m) => ({
    trapId: m.trapId,
    areaM2: m.trapAreaM2,
    deltaHCm: m.deltaHcm,
    bulkDensity: m.sedBulkDensity,
    socPct: m.sedSocPct,
  }));
  const totals = totalSediment(traps);
  // Sum estimated totals from farmTotals (filtered to selectedFarmId if set)
  const farmTotals = data?.farmTotals ?? [];
  const agg = data?.aggregate ?? {
    sampleVolumeM3: totals.volumeM3,
    sampleMassT: totals.massT,
    estimatedSedimentT: 0,
    estimatedVolumeM3: 0,
    estimatedCarbonT: 0,
    estimatedCo2eT: 0,
  };
  const totalLevels = farmTotals.reduce(
    (s, f) => s + f.estimated.numTerraceLevels,
    0
  );
  const totalTraps = farmTotals.reduce((s, f) => s + f.trapCount, 0);

  return (
    <div className="space-y-6">
      <SectionHeader titleKey="sediment.title" descriptionKey="warn.estimate">
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t("sediment.new")}
        </Button>
      </SectionHeader>

      {/* Estimated total — BIG realistic number across all 7-10 levels per farm */}
      <Card className="border-emerald-300 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-violet-50/50 dark:from-emerald-950/30 dark:to-violet-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mountain className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {locale === "th"
              ? "ปริมาณตะกอนรวมที่ดักไว้บนทั้งแปลง (คำนวณจาก 7-10 ชั้น terrace)"
              : "Total sediment retained on farm (computed across 7-10 terrace levels)"}
            <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
              {totalLevels} {locale === "th" ? "ชั้น" : "levels"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">{locale === "th" ? "ปริมาตรรวม" : "Total volume"}</div>
              <div className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmt(agg.estimatedVolumeM3, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground">{t("unit.m3")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{locale === "th" ? "มวลรวม" : "Total mass"}</div>
              <div className="text-3xl font-bold tabular-nums">
                {fmt(agg.estimatedSedimentT, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground">{t("unit.t")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{locale === "th" ? "คาร์บอนที่กักไว้" : "Carbon retained"}</div>
              <div className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmt(agg.estimatedCarbonT, { maximumFractionDigits: 1 })}
              </div>
              <div className="text-xs text-muted-foreground">t C</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{locale === "th" ? "เทียบเท่า CO₂" : "CO₂ equivalent"}</div>
              <div className="text-3xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                {fmt(agg.estimatedCo2eT, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground">{t("unit.tco2e")}</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            {locale === "th"
              ? "คำนวณจากอัตราการพังทลาย (USLE) × พื้นที่แปลง × ประสิทธิภาพการดักตะกอน × อายุโครงการ — รวมทุกชั้น terrace (7-10 ชั้น) บนพื้นที่สูง"
              : "Computed via USLE erosion × farm area × trapping efficiency × project age — sums all terrace levels (7-10) on highland farms"}
          </p>
        </CardContent>
      </Card>

      {/* Per-farm breakdown */}
      {farmTotals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              {locale === "th" ? "สรุปต่อแปลง" : "Per-farm breakdown"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>{t("samples.farm")}</TableHead>
                    <TableHead className="text-right">{t("farms.area")}</TableHead>
                    <TableHead className="text-right">{locale === "th" ? "ความชัน" : "Slope"}</TableHead>
                    <TableHead className="text-right">{locale === "th" ? "ชั้น" : "Levels"}</TableHead>
                    <TableHead className="text-right">{locale === "th" ? "Traps" : "Traps"}</TableHead>
                    <TableHead className="text-right">{locale === "th" ? "ตะกอน/ชั้น" : "Per layer"}</TableHead>
                    <TableHead className="text-right">{locale === "th" ? "รวม (t)" : "Total (t)"}</TableHead>
                    <TableHead className="text-right">CO₂e (t)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farmTotals.map((f) => (
                    <TableRow key={f.farmId} className="hover:bg-muted/50">
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {f.farmNameTh}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {fmt(f.areaHa, { maximumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {fmt(f.slopePct ?? 0)}%
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        <Badge variant="outline" className="text-[10px]">
                          {f.estimated.numTerraceLevels}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {f.trapCount}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {fmt(f.estimated.perLayerSedimentT, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmt(f.estimated.totalSedimentT, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-violet-600 dark:text-violet-400">
                        {fmt(f.estimated.totalCo2eT, { maximumFractionDigits: 0 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample captured in monitoring traps (small — for verification) */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {locale === "th" ? "ตัวอย่างที่จับในกับดักมอนิเตอร์ริ่ง" : "Sample captured in monitoring traps"}
            <Badge variant="secondary" className="text-[10px]">
              {totalTraps} {locale === "th" ? "กับดัก" : "traps"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">{t("sediment.volume")}</div>
              <div className="text-lg font-semibold tabular-nums">
                {fmt(agg.sampleVolumeM3, { maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">{t("unit.m3")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("sediment.mass")}</div>
              <div className="text-lg font-semibold tabular-nums">
                {fmt(agg.sampleMassT, { maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground">{t("unit.t")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("sediment.carbon")}</div>
              <div className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmt(totals.carbonRetainedT, { maximumFractionDigits: 3 })}
              </div>
              <div className="text-xs text-muted-foreground">t C</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("sediment.co2e")}</div>
              <div className="text-lg font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                {fmt(totals.co2eRetained, { maximumFractionDigits: 3 })}
              </div>
              <div className="text-xs text-muted-foreground">{t("unit.tco2e")}</div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {locale === "th"
              ? "กับดักมอนิเตอร์ริ่ง (3-6 ม.² × 5-43 ซม. depth) จับตัวอย่างเพียงเล็กน้อยสำหรับตรวจสอบ — ปริมาณรวมจริงคือตัวเลขด้านบน"
              : "Monitoring traps (3-6 m² × 5-43 cm depth) capture a small sample for verification — the real total is shown above"}
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            {t("sediment.title")}
            <Badge variant="secondary" className="ml-1">
              {fmt(measurements.length)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : measurements.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">{t("sediment.empty")}</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> {t("sediment.new")}
              </Button>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>{t("sediment.date")}</TableHead>
                    <TableHead>{t("sediment.trapId")}</TableHead>
                    <TableHead>{t("samples.farm")}</TableHead>
                    <TableHead className="text-right">{t("sediment.area")}</TableHead>
                    <TableHead className="text-right">{t("sediment.deltaH")}</TableHead>
                    <TableHead className="text-right">{t("sediment.volume")}</TableHead>
                    <TableHead className="text-right">{t("sediment.carbon")}</TableHead>
                    <TableHead>{t("sediment.source")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {measurements.map((m) => {
                    const trap: SedimentTrap = {
                      trapId: m.trapId,
                      areaM2: m.trapAreaM2,
                      deltaHCm: m.deltaHcm,
                      bulkDensity: m.sedBulkDensity,
                      socPct: m.sedSocPct,
                    };
                    const volume = trap.areaM2 * (trap.deltaHCm / 100);
                    const carbon = trap.areaM2 * (trap.deltaHCm / 100) * (trap.bulkDensity ?? 1.3) * ((trap.socPct ?? 1.2) / 100);
                    return (
                      <TableRow key={m.id} className="hover:bg-muted/50">
                        <TableCell className="whitespace-nowrap text-sm">
                          {fmtDate(m.measuredAt)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{m.trapId}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">
                          {m.farmNameTh ?? m.farmId.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {fmt(m.trapAreaM2, { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {fmt(m.deltaHcm, { maximumFractionDigits: 1 })}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {fmt(volume, { maximumFractionDigits: 3 })}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                          {fmt(carbon, { maximumFractionDigits: 4 })}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">
                            {m.source.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SedimentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        farms={farmsData?.farms ?? []}
        defaultFarmId={selectedFarmId ?? undefined}
      />
    </div>
  );
}
