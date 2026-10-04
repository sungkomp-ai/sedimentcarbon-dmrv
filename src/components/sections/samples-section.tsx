"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { SectionHeader } from "./section-header";
import { SampleFormDialog } from "./sample-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/store/app";
import { Plus, TestTube2, Fingerprint, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Sample {
  id: string;
  farmId: string;
  farmNameTh: string | null;
  farmNameEn: string | null;
  plotId: string | null;
  plotCode: string | null;
  stratum: string | null;
  sampledAt: string;
  depthTopCm: number;
  depthBotCm: number;
  socPct: number;
  bulkDensity: number;
  coarseFragPct: number;
  labRef: string | null;
  method: string;
  isBaseline: boolean;
  recordHash: string;
  prevHash: string | null;
}

export function SamplesSection() {
  const { t, fmt, fmtDate, locale } = useI18n();
  const { selectedFarmId } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: farmsData } = useQuery<{ farms: unknown[] }>({
    queryKey: ["farms"],
    queryFn: async () => {
      const r = await fetch("/api/farms");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data, isLoading } = useQuery<{ samples: Sample[] }>({
    queryKey: ["soil-samples", selectedFarmId],
    queryFn: async () => {
      const url = selectedFarmId
        ? `/api/soil-samples?farmId=${selectedFarmId}`
        : "/api/soil-samples";
      const r = await fetch(url);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const samples = data?.samples ?? [];
  const baseline = samples.filter((s) => s.isBaseline);
  const current = samples.filter((s) => !s.isBaseline);
  const baselineAvg =
    baseline.length > 0
      ? baseline.reduce((s, x) => s + x.socPct, 0) / baseline.length
      : 0;
  const currentAvg =
    current.length > 0
      ? current.reduce((s, x) => s + x.socPct, 0) / current.length
      : 0;

  return (
    <div className="space-y-6">
      <SectionHeader titleKey="samples.title" descriptionKey="warn.estimate">
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t("samples.new")}
        </Button>
      </SectionHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">
              {t("samples.isBaseline")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {fmt(baseline.length)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {baselineAvg ? `avg ${fmt(baselineAvg)} %C` : t("common.none")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">
              Current
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {fmt(current.length)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentAvg ? `avg ${fmt(currentAvg)} %C` : t("common.none")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase">
              ΔSOC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {baselineAvg && currentAvg
                ? `${fmt(currentAvg - baselineAvg, { maximumFractionDigits: 3 })} %C`
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("warn.estimate")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TestTube2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t("samples.title")}
            <Badge variant="secondary" className="ml-1">
              {fmt(samples.length)}
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
          ) : samples.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">{t("samples.empty")}</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> {t("samples.new")}
              </Button>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>{t("samples.date")}</TableHead>
                    <TableHead>{t("samples.farm")}</TableHead>
                    <TableHead>{t("samples.plot")}</TableHead>
                    <TableHead className="text-right">{t("samples.depth")}</TableHead>
                    <TableHead className="text-right">{t("samples.socPct")}</TableHead>
                    <TableHead className="text-right">{t("samples.bulkDensity")}</TableHead>
                    <TableHead>{t("samples.labRef")}</TableHead>
                    <TableHead>{t("samples.method")}</TableHead>
                    <TableHead>{t("samples.auditHash")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {samples.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/50">
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="flex flex-col">
                          {fmtDate(s.sampledAt)}
                          {s.isBaseline && (
                            <Badge variant="secondary" className="w-fit text-[10px]">
                              {t("samples.isBaseline")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">
                        {s.farmNameTh ?? s.farmNameEn ?? s.farmId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm">{s.plotCode ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {s.depthTopCm}-{s.depthBotCm}cm
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium">
                        {fmt(s.socPct)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {fmt(s.bulkDensity)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.labRef ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.method.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                          <Fingerprint className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[120px]" title={s.recordHash}>
                            {s.recordHash.slice(0, 10)}…
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SampleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        farms={(farmsData?.farms ?? []) as unknown as React.ComponentProps<typeof SampleFormDialog>["farms"]}
        defaultFarmId={selectedFarmId ?? undefined}
      />
    </div>
  );
}
