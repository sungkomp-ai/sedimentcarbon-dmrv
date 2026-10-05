"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { SectionHeader } from "./section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STANDARD_LIST } from "@/lib/core/standards";
import { ShieldCheck, CheckCircle2, XCircle, ExternalLink, MapPin } from "lucide-react";

interface Farm {
  id: string;
  nameTh: string;
  nameEn: string | null;
  areaHa: number;
  standard: string | null;
}

export function StandardsSection() {
  const { t, locale } = useI18n();

  // Fetch all farms to show which farms use which standard
  const { data: farmsData } = useQuery<{ farms: Farm[] }>({
    queryKey: ["farms"],
    queryFn: async () => {
      const r = await fetch("/api/farms");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const farms = farmsData?.farms ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader titleKey="standards.title" descriptionKey="warn.estimate" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STANDARD_LIST.map((s) => {
          const standardFarms = farms.filter((f) => f.standard === s.code);
          return (
          <Card key={s.code} className="overflow-hidden">
            <div
              className="h-1.5 w-full"
              style={{ background: s.accent }}
            />
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="text-base">{s.code}</span>
                <div className="flex items-center gap-1">
                  {standardFarms.length > 0 && (
                    <Badge className="text-[10px] bg-emerald-600 gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {standardFarms.length} {locale === "th" ? "แปลง" : "farms"}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    Buffer {(s.bufferPct * 100).toFixed(0)}%
                  </Badge>
                </div>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {locale === "th" ? s.labelTh : s.labelEn}
              </p>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("standards.minMonitoring")}</span>
                <span className="font-medium tabular-nums">{s.minMonitoringIntervalYr} {t("unit.yr")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("standards.minCrediting")}</span>
                <span className="font-medium tabular-nums">{s.minCreditingPeriodYr} {t("unit.yr")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("standards.uncertainty")}</span>
                <span className="font-medium tabular-nums">≤ {s.uncertaintyThresholdPct}%</span>
              </div>
              {standardFarms.length > 0 && (
                <div className="pt-2 border-t mt-2">
                  <div className="text-[10px] text-muted-foreground mb-1">
                    {locale === "th" ? "แปลงที่ใช้มาตรฐานนี้" : "Farms using this standard"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {standardFarms.map((f) => (
                      <Badge key={f.id} variant="secondary" className="text-[9px] truncate max-w-[120px]">
                        {f.nameTh}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            {s.registryUrl && (
              <div className="border-t px-4 py-2">
                <a
                  href={s.registryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3 w-3" /> {s.registryUrl.replace(/^https?:\/\//, "").split("/")[0]}
                </a>
              </div>
            )}
          </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("standards.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("standards.code")}</TableHead>
                  <TableHead className="text-right">{t("standards.buffer")}</TableHead>
                  <TableHead className="text-right">{t("standards.uncertainty")}</TableHead>
                  <TableHead className="text-right">{t("standards.minMonitoring")}</TableHead>
                  <TableHead className="text-right">{t("standards.minCrediting")}</TableHead>
                  <TableHead className="text-center">{t("standards.additionality")}</TableHead>
                  <TableHead className="text-center">{t("standards.permanence")}</TableHead>
                  <TableHead>{t("standards.registry")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {STANDARD_LIST.map((s) => (
                  <TableRow key={s.code}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: s.accent }}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{s.code}</span>
                          <span className="text-xs text-muted-foreground">
                            {locale === "th" ? s.labelTh : s.labelEn}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(s.bufferPct * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ≤ {s.uncertaintyThresholdPct}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.minMonitoringIntervalYr} {t("unit.yr")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.minCreditingPeriodYr} {t("unit.yr")}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.requiresAdditionality ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 inline" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground inline" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.requiresPermanenceAgreement ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 inline" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground inline" />
                      )}
                    </TableCell>
                    <TableCell>
                      {s.registryUrl ? (
                        <a
                          href={s.registryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sky-600 hover:underline dark:text-sky-400"
                        >
                          {s.registryUrl.replace(/^https?:\/\//, "").split("/")[0]}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
