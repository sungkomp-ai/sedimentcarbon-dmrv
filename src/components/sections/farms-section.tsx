"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { useApp } from "@/lib/store/app";
import { useToast } from "@/hooks/use-toast";
import { SectionHeader } from "./section-header";
import { FarmFormDialog } from "./farm-form-dialog";
import { KpiCard } from "./kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MiniMap } from "@/components/fields/mini-map";
import {
  Plus,
  MapPin,
  Mountain,
  Leaf,
  Trash2,
  Layers3,
  TestTube2,
  Pencil,
} from "lucide-react";
import { useState } from "react";
import { polygonAreaHa } from "@/lib/geo/geo";

interface Farm {
  id: string;
  nameTh: string;
  nameEn: string | null;
  areaHa: number;
  soilType: string | null;
  slopePct: number | null;
  elevationM: number | null;
  trapTypes: string[];
  crops: string[];
  plotDesign: {
    terraceWidthM?: number;
    bundWidthM?: number;
    alternatingSlope?: boolean;
    hasCheckDam?: boolean;
    bundCrop?: string;
  } | null;
  priorLandUse: string | null;
  projectStart: string | null;
  standard: string | null;
  groupId: string | null;
  owner: { id: string; fullName: string | null; email: string } | null;
  geomGeojson: string;
  sampleCount: number;
  sedimentCount: number;
  createdAt: string;
}

export function FarmsSection() {
  const { t, fmt, fmtDate, fmtArea, locale } = useI18n();
  const { setSection, setSelectedFarmId } = useApp();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<{ farms: Farm[] }>({
    queryKey: ["farms"],
    queryFn: async () => {
      const r = await fetch("/api/farms");
      if (!r.ok) throw new Error("Failed to load farms");
      return r.json();
    },
  });

  const farms = data?.farms ?? [];

  const totalArea = farms.reduce((s, f) => s + f.areaHa, 0);
  const totalSamples = farms.reduce((s, f) => s + f.sampleCount, 0);
  const totalSediment = farms.reduce((s, f) => s + f.sedimentCount, 0);

  async function onDelete(id: string, name: string) {
    if (!confirm(`${t("farms.delete")}: ${name}?`)) return;
    const res = await fetch(`/api/farms/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "✓ Deleted", description: name });
      qc.invalidateQueries({ queryKey: ["farms"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } else {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader titleKey="farms.title" descriptionKey="farms.geomHint">
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t("farms.new")}
        </Button>
      </SectionHeader>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label={t("dashboard.totalFarms")}
          value={fmt(farms.length)}
          icon={MapPin}
          accentClassName="bg-emerald-500/10"
          iconClassName="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          label={t("dashboard.totalArea")}
          value={fmtArea(totalArea, { digits: 2, withUnit: false })}
          unit={locale === "th" ? t("unit.rai") : t("unit.haEn")}
          icon={Layers3}
          accentClassName="bg-sky-500/10"
          iconClassName="text-sky-600 dark:text-sky-400"
        />
        <KpiCard
          label={t("dashboard.totalSamples")}
          value={fmt(totalSamples + totalSediment)}
          icon={TestTube2}
          accentClassName="bg-amber-500/10"
          iconClassName="text-amber-600 dark:text-amber-400"
          hint={`${totalSamples} ${t("samples.title")} · ${totalSediment} ${t("sediment.title")}`}
        />
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : farms.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t("farms.empty")}</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> {t("farms.new")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {farms.map((f) => (
            <Card key={f.id} className="flex flex-col overflow-hidden">
              <div className="relative">
                <MiniMap value={f.geomGeojson} onChange={() => {}} editable={false} />
                <Badge className="absolute right-2 top-2" variant="secondary">
                  {f.standard ?? "—"}
                </Badge>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base leading-tight">
                  {f.nameTh}
                  {f.nameEn && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {f.nameEn}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("farms.area")}</span>
                  <span className="font-medium tabular-nums">
                    {fmtArea(f.areaHa)}
                  </span>
                </div>
                {f.elevationM != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Mountain className="h-3 w-3" />
                      {t("farms.elevation")}
                    </span>
                    <span className="font-medium tabular-nums">{fmt(f.elevationM)} m</span>
                  </div>
                )}
                {f.slopePct != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("farms.slope")}</span>
                    <span className="font-medium tabular-nums">{fmt(f.slopePct)}%</span>
                  </div>
                )}
                {f.soilType && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("farms.soilType")}</span>
                    <span className="font-medium truncate max-w-[60%] text-right">{f.soilType}</span>
                  </div>
                )}
                {f.priorLandUse === "shifting_cultivation" && (
                  <div className="rounded-sm bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    {t("farms.formerShiftingCultivation")}
                  </div>
                )}
                {f.projectStart && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("farms.projectStart")}</span>
                    <span className="font-medium">{fmtDate(f.projectStart)}</span>
                  </div>
                )}
                {f.crops.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Leaf className="h-3 w-3" />
                      {t("farms.cropsLabel")}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {f.crops.map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">
                          {c.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1 pt-1">
                  {f.trapTypes.map((tt) => (
                    <Badge key={tt} variant="outline" className="text-[10px]">
                      {tt.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="rounded-md bg-muted/60 px-2 py-1.5">
                    <div className="text-muted-foreground">{t("dashboard.totalSamples")}</div>
                    <div className="font-medium tabular-nums">{f.sampleCount}</div>
                  </div>
                  <div className="rounded-md bg-muted/60 px-2 py-1.5">
                    <div className="text-muted-foreground">{t("sediment.title")}</div>
                    <div className="font-medium tabular-nums">{f.sedimentCount}</div>
                  </div>
                </div>
              </CardContent>
              <div className="flex items-center gap-1 border-t bg-muted/30 px-3 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setSelectedFarmId(f.id);
                    setSection("samples");
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> {t("common.edit")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => onDelete(f.id, f.nameTh)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t("common.delete")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FarmFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
