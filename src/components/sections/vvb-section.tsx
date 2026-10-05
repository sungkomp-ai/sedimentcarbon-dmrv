"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { useApp } from "@/lib/store/app";
import { useToast } from "@/hooks/use-toast";
import { SectionHeader } from "./section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  Layers3,
  TestTube2,
  CalendarDays,
  FileText,
  Printer,
  ArrowRight,
  MapPinned,
  Banknote,
} from "lucide-react";
import { STANDARD_LIST } from "@/lib/core/standards";
import type { CreditResult } from "@/lib/core/credits";
import type { FinanceResult } from "@/lib/core/finance";

interface VvbRound {
  id: string;
  roundType: "validation" | "verification";
  roundNumber: number;
  periodStart: string;
  periodEnd: string;
  status: "planned" | "in_review" | "verified" | "rejected";
  vvbName: string | null;
  vvbEmail: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  creditsClaimed: number | null;
  creditsVerified: number | null;
  deductionsPct: number | null;
  findings: { type: string; severity: string; note: string }[];
  statement: string | null;
}

interface VvbData {
  farm: {
    id: string;
    nameTh: string;
    nameEn: string | null;
    areaHa: number;
    slopePct: number | null;
    elevationM: number | null;
    soilType: string | null;
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
    creditingYears: number;
    counts: { samples: number; sediment: number; activities: number };
  };
  rounds: VvbRound[];
  creditComparison: CreditResult[] | null;
  audit: {
    totalRecords: number;
    valid: boolean;
    verifiedRecords: number;
    brokenAtIndex: number | null;
  };
  sediment: {
    trapCount: number;
    volumeM3: number;
    massT: number;
    carbonT: number;
    co2eT: number;
  };
}

export function VvbSection() {
  const { t, fmt, fmtArea, fmtDate, locale } = useI18n();
  const { selectedFarmId, setSelectedFarmId } = useApp();
  const [farmId, setFarmId] = useState<string>("");
  const [reportFarmId, setReportFarmId] = useState<string | null>(null);

  const { data: farmsData } = useQuery<{ farms: { id: string; nameTh: string; nameEn: string | null; areaHa: number; standard: string | null }[] }>({
    queryKey: ["farms"],
    queryFn: async () => {
      const r = await fetch("/api/farms");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const farms = farmsData?.farms ?? [];
  const currentFarmId = farmId || selectedFarmId || farms[0]?.id || "";

  const { data, isLoading } = useQuery<VvbData>({
    queryKey: ["vvb", currentFarmId],
    queryFn: async () => {
      if (!currentFarmId) {
        return {
          farm: null as never,
          rounds: [],
          creditComparison: null,
          audit: { totalRecords: 0, valid: true, verifiedRecords: 0, brokenAtIndex: null },
          sediment: { trapCount: 0, volumeM3: 0, massT: 0, carbonT: 0, co2eT: 0 },
        } as VvbData;
      }
      const r = await fetch(`/api/vvb/${currentFarmId}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!currentFarmId,
  });

  return (
    <div className="space-y-6">
      <SectionHeader titleKey="vvb.title" descriptionKey="vvb.desc" />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium">{t("vvb.farm")}</span>
            </div>
            <Select
              value={currentFarmId}
              onValueChange={(v) => {
                setFarmId(v);
                setSelectedFarmId(v);
              }}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder={t("vvb.farm")} />
              </SelectTrigger>
              <SelectContent>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nameTh} · {f.areaHa.toFixed(1)} ha
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {!currentFarmId ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {t("vvb.noFarm")}
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <Tabs defaultValue="rounds" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rounds" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("vvb.tab.rounds")}
              {data.rounds.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {data.rounds.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="evidence" className="gap-1.5">
              <Fingerprint className="h-3.5 w-3.5" />
              {t("vvb.tab.evidence")}
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {t("vvb.tab.report")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rounds" className="mt-4 space-y-4">
            <RoundsList rounds={data.rounds} farm={data.farm} fmt={fmt} fmtDate={fmtDate} t={t} locale={locale} />
            <Button
              variant="outline"
              onClick={() => setReportFarmId(currentFarmId)}
              className="gap-1.5"
            >
              {t("vvb.report.openReport")} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </TabsContent>

          <TabsContent value="evidence" className="mt-4">
            <EvidencePack data={data} fmt={fmt} fmtDate={fmtDate} t={t} locale={locale} />
          </TabsContent>

          <TabsContent value="report" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {t("vvb.report.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("vvb.desc")}
                </p>
                <Button onClick={() => setReportFarmId(currentFarmId)} className="gap-2">
                  <FileText className="h-4 w-4" />
                  {t("vvb.report.openReport")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {reportFarmId && (
        <VvbReportDialog farmId={reportFarmId} onClose={() => setReportFarmId(null)} />
      )}
    </div>
  );
}

// ============ Rounds List ============
function RoundsList({
  rounds,
  farm,
  fmt,
  fmtDate,
  t,
  locale,
}: {
  rounds: VvbRound[];
  farm: VvbData["farm"];
  fmt: (n: number, opts?: Intl.NumberFormatOptions) => string;
  fmtDate: (d: Date | string | null, opts?: Intl.DateTimeFormatOptions) => string;
  t: (k: string, f?: string) => string;
  locale: string;
}) {
  if (!farm || rounds.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          {t("vvb.noFarm")}
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {rounds.map((r) => {
        const isValidation = r.roundType === "validation";
        const statusVariant =
          r.status === "verified"
            ? "default"
            : r.status === "rejected"
            ? "destructive"
            : "secondary";
        const statusClass =
          r.status === "verified"
            ? "bg-emerald-600"
            : r.status === "rejected"
            ? ""
            : "";
        return (
          <Card key={r.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {isValidation ? t("vvb.roundType.validation") : t("vvb.roundType.verification")}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {t("vvb.roundNumber")} {r.roundNumber}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(r.periodStart)} → {fmtDate(r.periodEnd)}
                  </span>
                </div>
                <Badge variant={statusVariant} className={statusClass + " capitalize"}>
                  {t(`vvb.status.${r.status}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* VVB info + credits */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                <div>
                  <div className="text-muted-foreground">{t("vvb.vvbName")}</div>
                  <div className="font-medium truncate">{r.vvbName ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("vvb.submitted")}</div>
                  <div className="font-medium">{r.submittedAt ? fmtDate(r.submittedAt) : "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("vvb.verified")}</div>
                  <div className="font-medium">{r.verifiedAt ? fmtDate(r.verifiedAt) : "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">{t("vvb.deductions")}</div>
                  <div className="font-medium tabular-nums">
                    {r.deductionsPct != null ? fmt(r.deductionsPct, { maximumFractionDigits: 1 }) + "%" : "—"}
                  </div>
                </div>
              </div>

              {/* Findings */}
              {r.findings.length > 0 && (
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {t("vvb.findings")}
                  </div>
                  <ul className="space-y-1">
                    {r.findings.map((f, i) => (
                      <li key={i} className="text-xs flex items-start gap-2">
                        <Badge
                          variant="outline"
                          className={
                            f.severity === "minor"
                              ? "text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 shrink-0"
                              : f.severity === "major"
                              ? "text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 shrink-0"
                              : "text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shrink-0"
                          }
                        >
                          {f.type}
                        </Badge>
                        <span className="text-muted-foreground">{f.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Statement */}
              {r.statement && (
                <div className="rounded-md border-l-4 border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {t("vvb.statement")}
                  </div>
                  <p className="text-xs italic leading-relaxed">{r.statement}</p>
                </div>
              )}

              {/* Credits claimed/verified */}
              {!isValidation && r.creditsClaimed != null && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/40 p-2">
                    <div className="text-muted-foreground">{t("vvb.creditsClaimed")}</div>
                    <div className="font-semibold tabular-nums">
                      {fmt(r.creditsClaimed)} {t("unit.tco2e")}
                    </div>
                  </div>
                  <div className="rounded-md bg-emerald-50/60 dark:bg-emerald-950/20 p-2">
                    <div className="text-muted-foreground">{t("vvb.creditsVerified")}</div>
                    <div className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {r.creditsVerified != null ? fmt(r.creditsVerified) + " " + t("unit.tco2e") : "—"}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============ Evidence Pack ============
function EvidencePack({
  data,
  fmt,
  fmtDate,
  t,
  locale,
}: {
  data: VvbData;
  fmt: (n: number, opts?: Intl.NumberFormatOptions) => string;
  fmtDate: (d: Date | string | null, opts?: Intl.DateTimeFormatOptions) => string;
  t: (k: string, f?: string) => string;
  locale: string;
}) {
  const { farm, audit, sediment, creditComparison } = data;
  if (!farm) return null;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Fingerprint className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("vvb.evidence.auditTrail")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`flex items-center gap-3 rounded-md border p-3 ${
              audit.valid
                ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20"
                : "border-red-300 bg-red-50/60 dark:bg-red-950/20"
            }`}
          >
            {audit.valid ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <div className="flex-1 text-sm">
              <p className="font-medium">
                {audit.valid ? t("vvb.evidence.chainValid") : t("vvb.evidence.chainBroken")}
                {audit.brokenAtIndex != null ? ` @ index ${audit.brokenAtIndex}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("vvb.evidence.records")}: {audit.totalRecords} · {t("vvb.evidence.chainHead")}:{" "}
                <code className="font-mono text-[10px]">
                  {audit.totalRecords > 0 ? `${audit.totalRecords} records verified` : "—"}
                </code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              {t("vvb.evidence.sediment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">{t("vvb.evidence.sedimentVol")}</div>
              <div className="font-semibold tabular-nums">{fmt(sediment.volumeM3)} m³</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("vvb.evidence.sedimentMass")}</div>
              <div className="font-semibold tabular-nums">{fmt(sediment.massT)} t</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("vvb.evidence.sedimentC")}</div>
              <div className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                {fmt(sediment.carbonT, { maximumFractionDigits: 3 })} t C
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("vvb.evidence.sedimentCo2e")}</div>
              <div className="font-semibold tabular-nums text-violet-700 dark:text-violet-300">
                {fmt(sediment.co2eT)} tCO₂e
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TestTube2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              {t("vvb.evidence.samples")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">{t("vvb.evidence.samples")}</div>
              <div className="font-semibold tabular-nums">{farm.counts.samples}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("vvb.evidence.activities")}</div>
              <div className="font-semibold tabular-nums">{farm.counts.activities}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Sediment traps</div>
              <div className="font-semibold tabular-nums">{sediment.trapCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("farms.elevation")}</div>
              <div className="font-semibold tabular-nums">{farm.elevationM ?? "—"} m</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {creditComparison && creditComparison.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {t("vvb.report.credits")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
              {creditComparison.map((r) => {
                const rule = STANDARD_LIST.find((s) => s.code === r.standard);
                const isFarmStandard = r.standard === farm.standard;
                return (
                  <div
                    key={r.standard}
                    className={`rounded-md border p-2 ${
                      isFarmStandard ? "border-emerald-400 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/20" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: rule?.accent }} />
                      <span className="font-medium text-[11px]">{r.standard}</span>
                    </div>
                    <div className="font-semibold tabular-nums">{fmt(r.netCreditsTco2e, { maximumFractionDigits: 1 })}</div>
                    <div className="text-muted-foreground text-[10px]">tCO₂e</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ Full Report Dialog ============
interface ReportData {
  meta: { generatedAt: string; version: string; type: string };
  project: {
    farmId: string;
    nameTh: string;
    nameEn: string | null;
    areaHa: number;
    slopePct: number | null;
    elevationM: number | null;
    soilType: string | null;
    priorLandUse: string | null;
    standard: string | null;
    standardLabel?: string;
    creditingYears: number;
    projectStart: string | null;
    trapTypes: string[];
    crops: string[];
    plotDesign: { terraceWidthM?: number; bundWidthM?: number; alternatingSlope?: boolean; hasCheckDam?: boolean; bundCrop?: string } | null;
    geomGeojson: string;
    monitoringPlots: { plotCode: string; stratum: string | null; point: string | null }[];
    owner: { name: string | null; email: string; role: string } | null;
    groupId: string | null;
  };
  baseline: {
    sampleCount: number;
    socPctAvg: number | null;
    samples: {
      id: string;
      plotCode: string | null;
      sampledAt: string;
      socPct: number;
      bulkDensity: number;
      coarseFragPct: number;
      labRef: string | null;
      method: string;
      recordHash: string;
    }[];
  };
  current: {
    sampleCount: number;
    socPctAvg: number | null;
    samples: {
      id: string;
      plotCode: string | null;
      sampledAt: string;
      socPct: number;
      bulkDensity: number;
      coarseFragPct: number;
      labRef: string | null;
      method: string;
      recordHash: string;
    }[];
  };
  sediment: {
    trapCount: number;
    totals: { volumeM3: number; massT: number; carbonRetainedT: number; co2eRetained: number };
    traps: {
      trapId: string;
      measuredAt: string;
      trapAreaM2: number;
      deltaHcm: number;
      sedBulkDensity: number;
      sedSocPct: number;
      source: string;
    }[];
  };
  activities: {
    id: string;
    activityAt: string;
    activity: string;
    nRateKgHa: number;
    note: string | null;
  }[];
  creditCalculation: CreditResult[] | null;
  financial: {
    withDmrvBenefit: FinanceResult;
    assumptions: {
      pricePerTco2e: number;
      capexPerHa: number;
      opexPerHaYr: number;
      verificationCost: number;
      verificationEveryYr: number;
      years: number;
      discountRate: number;
    };
  };
  audit: {
    totalRecords: number;
    valid: boolean;
    verifiedRecords: number;
    brokenAtIndex: number | null;
    chainHead: string | null;
  };
  verificationRounds: VvbRound[];
}

function VvbReportDialog({ farmId, onClose }: { farmId: string; onClose: () => void }) {
  const { t, fmt, fmtArea, fmtDate, locale } = useI18n();
  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["vvb-report", farmId],
    queryFn: async () => {
      const r = await fetch(`/api/vvb/${farmId}/report`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto print:max-w-full print:max-h-full print:shadow-none print:rounded-none">
        {/* Print Header (visible only when printing) */}
        <div className="hidden print:flex print:items-center print:justify-between print:px-8 print:py-4 print:border-b print:mb-4">
          <div>
            <h1 className="text-lg font-bold">SedimentCarbon dMRV</h1>
            <p className="text-xs">VVB Comprehensive Verification Report</p>
          </div>
          <div className="text-xs text-right">
            <p>Generated: {data?.meta?.generatedAt ?? "—"}</p>
            <p>Farm ID: {farmId}</p>
          </div>
        </div>

        {/* Action bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur print:hidden">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("vvb.report.title")}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              {t("vvb.report.print")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t("vvb.report.close")}
            </Button>
          </div>
        </div>

        {/* Report body */}
        <div className="p-5 print:p-8 space-y-6">
          {isLoading || !data ? (
            <div className="space-y-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : (
            <ReportBody data={data} fmt={fmt} fmtArea={fmtArea} fmtDate={fmtDate} t={t} locale={locale} />
          )}
        </div>
      </div>
    </div>
  );
}

function ReportBody({
  data,
  fmt,
  fmtArea,
  fmtDate,
  t,
  locale,
}: {
  data: ReportData;
  fmt: (n: number, opts?: Intl.NumberFormatOptions) => string;
  fmtArea: (ha: number, opts?: { digits?: number; withUnit?: boolean }) => string;
  fmtDate: (d: Date | string | null, opts?: Intl.DateTimeFormatOptions) => string;
  t: (k: string, f?: string) => string;
  locale: string;
}) {
  const isThai = locale === "th";
  return (
    <div className="space-y-6">
      {/* Project */}
      <ReportSection title={t("vvb.report.project")} icon={MapPinned}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <ReportField label={t("farms.name")} value={isThai ? data.project.nameTh : data.project.nameEn ?? data.project.nameTh} />
          <ReportField label="Farm ID" value={data.project.farmId} mono />
          <ReportField label={t("farms.area")} value={fmtArea(data.project.areaHa)} />
          <ReportField label={t("farms.slope")} value={`${fmt(data.project.slopePct ?? 0)}%`} />
          <ReportField label={t("farms.elevation")} value={data.project.elevationM != null ? `${fmt(data.project.elevationM)} m` : "—"} />
          <ReportField label={t("farms.standard")} value={data.project.standard ?? "—"} />
          <ReportField label={t("farms.priorLandUse")} value={data.project.priorLandUse ?? "—"} />
          <ReportField label={t("farms.projectStart")} value={fmtDate(data.project.projectStart)} />
          <ReportField label={t("farms.cropsLabel")} value={data.project.crops.join(", ") || "—"} />
          <ReportField label={t("farms.trapTypes")} value={data.project.trapTypes.join(", ") || "—"} />
        </div>
      </ReportSection>

      {/* Baseline + Current */}
      <ReportSection title={t("vvb.report.baseline")} icon={TestTube2}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              {t("samples.isBaseline")} ({data.baseline.sampleCount})
            </h4>
            <div className="space-y-1 text-xs">
              {data.baseline.samples.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground truncate">{s.plotCode} · {s.labRef ?? "—"}</span>
                  <span className="font-mono tabular-nums">{fmt(s.socPct)} %C</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs font-medium">
              avg: {data.baseline.socPctAvg != null ? fmt(data.baseline.socPctAvg) + " %C" : "—"}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Current ({data.current.sampleCount})
            </h4>
            <div className="space-y-1 text-xs">
              {data.current.samples.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground truncate">{s.plotCode} · {s.labRef ?? "—"}</span>
                  <span className="font-mono tabular-nums">{fmt(s.socPct)} %C</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs font-medium">
              avg: {data.current.socPctAvg != null ? fmt(data.current.socPctAvg) + " %C" : "—"}
            </div>
          </div>
        </div>
      </ReportSection>

      {/* Monitoring (Sediment + Activities) */}
      <ReportSection title={t("vvb.report.monitoring")} icon={Layers3}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
            <ReportField label={t("vvb.evidence.sedimentVol")} value={`${fmt(data.sediment.totals.volumeM3)} m³`} />
            <ReportField label={t("vvb.evidence.sedimentMass")} value={`${fmt(data.sediment.totals.massT)} t`} />
            <ReportField label={t("vvb.evidence.sedimentC")} value={`${fmt(data.sediment.totals.carbonRetainedT, { maximumFractionDigits: 3 })} t C`} />
            <ReportField label={t("vvb.evidence.sedimentCo2e")} value={`${fmt(data.sediment.totals.co2eRetained)} tCO₂e`} />
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              {t("vvb.evidence.activities")} ({data.activities.length})
            </div>
            <ul className="space-y-1 text-xs">
              {data.activities.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <Badge variant="outline" className="text-[10px] mr-1">{a.activity.replace(/_/g, " ")}</Badge>
                    {a.note ?? "—"}
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap">{fmtDate(a.activityAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ReportSection>

      {/* Credit calculation */}
      {data.creditCalculation && data.creditCalculation.length > 0 && (
        <ReportSection title={t("vvb.report.credits")} icon={BadgeCheck}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5">Standard</th>
                  <th className="text-right py-1.5">ΔSOC</th>
                  <th className="text-right py-1.5">Gross</th>
                  <th className="text-right py-1.5">Emissions</th>
                  <th className="text-right py-1.5">Buffer</th>
                  <th className="text-right py-1.5">Net</th>
                  <th className="text-right py-1.5">/yr</th>
                </tr>
              </thead>
              <tbody>
                {data.creditCalculation.map((r) => {
                  const rule = STANDARD_LIST.find((s) => s.code === r.standard);
                  const isFarmStandard = r.standard === data.project.standard;
                  return (
                    <tr key={r.standard} className={isFarmStandard ? "bg-emerald-50/60 dark:bg-emerald-950/20 font-medium" : ""}>
                      <td className="py-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: rule?.accent }} />
                          {r.standard}
                          {isFarmStandard && <Badge variant="secondary" className="text-[9px]">✓</Badge>}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{fmt(r.deltaSocTCPerHaYr)}</td>
                      <td className="text-right tabular-nums">{fmt(r.grossCo2e)}</td>
                      <td className="text-right tabular-nums text-red-600 dark:text-red-400">-{fmt(r.projectEmissionsCo2e)}</td>
                      <td className="text-right tabular-nums text-amber-600 dark:text-amber-400">-{fmt(r.bufferCo2e)}</td>
                      <td className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(r.netCreditsTco2e)}</td>
                      <td className="text-right tabular-nums">{fmt(r.annualCreditsTco2e)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ReportSection>
      )}

      {/* Financial */}
      <ReportSection title={t("vvb.report.finance")} icon={Banknote}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          <ReportField label={t("calc.fin.npv")} value={`${fmt(data.financial.withDmrvBenefit.npvThb)} THB`} />
          <ReportField label={t("calc.fin.irr")} value={data.financial.withDmrvBenefit.irrPct != null ? `${fmt(data.financial.withDmrvBenefit.irrPct)}%` : "—"} />
          <ReportField label={t("calc.fin.payback")} value={data.financial.withDmrvBenefit.paybackYear != null ? `${fmt(data.financial.withDmrvBenefit.paybackYear)} yr` : "—"} />
          <ReportField label={t("calc.fin.breakeven")} value={data.financial.withDmrvBenefit.breakevenPriceThbPerTco2e != null ? `${fmt(data.financial.withDmrvBenefit.breakevenPriceThbPerTco2e)} THB/tCO₂e` : "—"} />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {isThai
            ? "การวิเคราะห์นี้ใช้ dMRV benefit: ลดค่าตรวจประเมิน 50% + เพิ่มราคาเครดิตจากความน่าเชื่อถือ 10%"
            : "Analysis applies dMRV benefit: 50% verification-cost reduction + 10% credit-price trust premium"}
        </div>
      </ReportSection>

      {/* Audit trail */}
      <ReportSection title={t("vvb.report.audit")} icon={Fingerprint}>
        <div
          className={`rounded-md border p-3 text-sm ${
            data.audit.valid
              ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20"
              : "border-red-300 bg-red-50/40 dark:bg-red-950/20"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {data.audit.valid ? (
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span className="font-medium">
              {data.audit.valid ? t("vvb.evidence.chainValid") : t("vvb.evidence.chainBroken")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {t("vvb.evidence.records")}: {data.audit.totalRecords} · {t("vvb.evidence.chainHead")}:{" "}
            <code className="font-mono">
              {data.audit.chainHead ? data.audit.chainHead.slice(0, 16) + "..." : "—"}
            </code>
          </div>
        </div>
      </ReportSection>

      {/* Verification rounds */}
      <ReportSection title={t("vvb.report.rounds")} icon={CalendarDays}>
        <div className="space-y-2">
          {data.verificationRounds.map((r) => {
            const isValidation = r.roundType === "validation";
            return (
              <div key={r.id} className="rounded-md border p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {isValidation ? t("vvb.roundType.validation") : t("vvb.roundType.verification")}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {t("vvb.roundNumber")} {r.roundNumber}
                    </Badge>
                  </div>
                  <Badge variant={r.status === "verified" ? "default" : "secondary"} className={r.status === "verified" ? "bg-emerald-600" : ""}>
                    {t(`vvb.status.${r.status}`)}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  {fmtDate(r.periodStart)} → {fmtDate(r.periodEnd)} · {r.vvbName ?? "—"}
                </div>
                {r.statement && (
                  <p className="mt-1 italic">{r.statement}</p>
                )}
              </div>
            );
          })}
        </div>
      </ReportSection>

      {/* Footer */}
      <div className="border-t pt-4 text-xs text-muted-foreground print:mt-8">
        <p>
          {t("guide.disclaimer")}
        </p>
        <p className="mt-1">
          {isThai
            ? `สร้างเมื่อ ${fmtDate(data.meta.generatedAt)} · SedimentCarbon dMRV v${data.meta.version}`
            : `Generated ${fmtDate(data.meta.generatedAt)} · SedimentCarbon dMRV v${data.meta.version}`}
        </p>
      </div>
    </div>
  );
}

function ReportSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="print:break-inside-avoid">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 border-b pb-1.5">
        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ReportField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
