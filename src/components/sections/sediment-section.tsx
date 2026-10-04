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
  const { t, fmt, fmtDate } = useI18n();
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

  const { data, isLoading } = useQuery<{ measurements: Sediment[] }>({
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

  return (
    <div className="space-y-6">
      <SectionHeader titleKey="sediment.title" descriptionKey="warn.estimate">
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t("sediment.new")}
        </Button>
      </SectionHeader>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase">
              <Gauge className="h-3.5 w-3.5" /> {t("sediment.volume")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {fmt(totals.volumeM3, { maximumFractionDigits: 1 })}
            </div>
            <p className="text-xs text-muted-foreground">{t("unit.m3")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase">
              <Mountain className="h-3.5 w-3.5" /> {t("sediment.mass")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {fmt(totals.massT, { maximumFractionDigits: 1 })}
            </div>
            <p className="text-xs text-muted-foreground">{t("unit.t")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase">
              <Leaf className="h-3.5 w-3.5" /> {t("sediment.carbon")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {fmt(totals.carbonRetainedT, { maximumFractionDigits: 3 })}
            </div>
            <p className="text-xs text-muted-foreground">{t("unit.tco2e")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase">
              <Layers3 className="h-3.5 w-3.5" /> {t("sediment.co2e")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-violet-600 dark:text-violet-400">
              {fmt(totals.co2eRetained, { maximumFractionDigits: 1 })}
            </div>
            <p className="text-xs text-muted-foreground">{t("unit.tco2e")}</p>
          </CardContent>
        </Card>
      </div>

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
