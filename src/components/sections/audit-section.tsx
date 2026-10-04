"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { SectionHeader } from "./section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, ShieldAlert, Fingerprint, FileClock, CheckCircle2 } from "lucide-react";

interface AuditRecord {
  id?: string;
  payload: Record<string, unknown>;
  prevHash: string | null;
  recordHash: string;
}

interface AuditResponse {
  totalRecords: number;
  valid: boolean;
  brokenAtIndex: number | null;
  brokenRecordId: string | null;
  verifiedRecords: number;
  records: AuditRecord[];
}

interface Farm {
  id: string;
  nameTh: string;
  nameEn: string | null;
}

export function AuditSection() {
  const { t, fmtDate, locale } = useI18n();
  const [farmId, setFarmId] = useState<string>("");

  const { data: farmsData } = useQuery<{ farms: Farm[] }>({
    queryKey: ["farms"],
    queryFn: async () => {
      const r = await fetch("/api/farms");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const farms = farmsData?.farms ?? [];
  const selected = farmId || farms[0]?.id || "";

  const { data, isLoading, refetch } = useQuery<AuditResponse>({
    queryKey: ["audit", selected],
    queryFn: async () => {
      if (!selected) {
        return { totalRecords: 0, valid: true, brokenAtIndex: null, brokenRecordId: null, verifiedRecords: 0, records: [] };
      }
      const r = await fetch(`/api/audit/${selected}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!selected,
  });

  return (
    <div className="space-y-6">
      <SectionHeader titleKey="audit.title" descriptionKey="warn.estimate" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileClock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("audit.farm")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selected} onValueChange={setFarmId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder={t("audit.farm")} />
              </SelectTrigger>
              <SelectContent>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nameTh}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => refetch()} variant="outline" className="gap-1.5">
              <ShieldCheck className="h-4 w-4" /> {t("audit.verify")}
            </Button>
          </div>

          {/* Status banner */}
          {data && (
            <div
              className={`flex items-center gap-3 rounded-md border p-3 ${
                data.valid
                  ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20"
                  : "border-red-300 bg-red-50/60 dark:bg-red-950/20"
              }`}
            >
              {data.valid ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <div className="flex-1 text-sm">
                {data.valid ? (
                  <p>
                    {t("audit.valid")} ·{" "}
                    <span className="font-medium">{data.verifiedRecords}</span>{" "}
                    {t("audit.records")}
                  </p>
                ) : (
                  <p>
                    {t("audit.broken")}{" "}
                    <span className="font-medium">{data.brokenAtIndex}</span>{" "}
                    {data.brokenRecordId ? `· ${data.brokenRecordId.slice(0, 8)}…` : ""}
                  </p>
                )}
              </div>
              <Badge variant="secondary">{data.totalRecords} records</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chain table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Fingerprint className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t("audit.records")}
            {data && <Badge variant="secondary" className="ml-1">{data.totalRecords}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !data || data.records.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">{t("audit.empty")}</p>
            </div>
          ) : (
            <div className="max-h-[640px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t("audit.payload")}</TableHead>
                    <TableHead>{t("audit.prevHash")}</TableHead>
                    <TableHead>{t("audit.hash")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.records.map((r, i) => {
                    const payload = r.payload as {
                      sampledAt?: string;
                      socPct?: number;
                      depthTopCm?: number;
                      depthBotCm?: number;
                      isBaseline?: boolean;
                      labRef?: string | null;
                    };
                    return (
                      <TableRow key={r.id ?? i}>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {i + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium tabular-nums">
                                {payload.socPct?.toFixed(3) ?? "—"} %C
                              </span>
                              {payload.isBaseline && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {t("samples.isBaseline")}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {payload.sampledAt ? fmtDate(payload.sampledAt) : ""}
                              {payload.depthTopCm !== undefined && ` · ${payload.depthTopCm}-${payload.depthBotCm}cm`}
                              {payload.labRef ? ` · ${payload.labRef}` : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="font-mono text-[10px] text-muted-foreground">
                            {r.prevHash ? r.prevHash.slice(0, 16) + "…" : "GENESIS"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            <code className="font-mono text-[10px]">
                              {r.recordHash.slice(0, 16)}…
                            </code>
                          </div>
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
    </div>
  );
}
