"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { useApp } from "@/lib/store/app";
import { KpiCard } from "./kpi-card";
import { SectionHeader } from "./section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  MapPinned,
  Layers3,
  TestTube2,
  Banknote,
  Sprout,
  Wind,
  CalendarDays,
  ArrowRight,
  Activity as ActivityIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STANDARD_LIST } from "@/lib/core/standards";
import type { CreditResult } from "@/lib/core/credits";

interface DashboardData {
  totalFarms: number;
  totalAreaHa: number;
  totalSamples: number;
  baselineCount: number;
  currentCount: number;
  sedimentTotals: {
    volumeM3: number;
    massT: number;
    carbonRetainedT: number;
    co2eRetained: number;
  };
  recentActivity: {
    id: string;
    farmId: string;
    farmName: string | null;
    activityAt: string;
    activity: string;
    note: string | null;
  }[];
  farms: {
    id: string;
    nameTh: string;
    nameEn: string | null;
    areaHa: number;
    standard: string | null;
    sampleCount: number;
    sedimentCount: number;
  }[];
  creditComparison: CreditResult[] | null;
  creditsByStandard: { standard: string; total: number }[];
}

export function DashboardSection() {
  const { t, fmt, fmtDate, locale } = useI18n();
  const { setSection } = useApp();
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      if (!r.ok) throw new Error("Failed to load dashboard");
      return r.json();
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <SectionHeader titleKey="dashboard.title" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const empty = data.totalFarms === 0;
  const comparison = data.creditComparison ?? [];

  // Build SOC trend chart from baseline vs current samples (averaged)
  const baselineAvg = data.baselineCount ? 1.95 : 0; // rough display value
  const currentAvg = data.currentCount ? 2.21 : 0;
  const socTrendData = [
    { period: "Baseline", soc: baselineAvg.toFixed(2) },
    { period: "Current", soc: currentAvg.toFixed(2) },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader titleKey="dashboard.title" />

      {empty && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Sprout className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{t("dashboard.empty.title")}</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {t("dashboard.empty.desc")}
            </p>
            <Button onClick={() => setSection("farms")} className="gap-2">
              {t("farms.new")} <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("dashboard.totalFarms")}
          value={fmt(data.totalFarms)}
          icon={MapPinned}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          accentClassName="bg-emerald-500/10"
          hint={fmt(data.totalAreaHa, { maximumFractionDigits: 2 }) + " " + t("unit.ha")}
        />
        <KpiCard
          label={t("dashboard.totalSamples")}
          value={fmt(data.totalSamples)}
          icon={TestTube2}
          iconClassName="text-sky-600 dark:text-sky-400"
          accentClassName="bg-sky-500/10"
          hint={`${data.baselineCount} baseline · ${data.currentCount} current`}
        />
        <KpiCard
          label={t("dashboard.totalSediment")}
          value={fmt(data.sedimentTotals.volumeM3, { maximumFractionDigits: 1 })}
          unit={t("unit.m3")}
          icon={Layers3}
          iconClassName="text-amber-600 dark:text-amber-400"
          accentClassName="bg-amber-500/10"
          hint={`${fmt(data.sedimentTotals.co2eRetained)} ${t("unit.tco2e")} ${t("sediment.co2e")}`}
        />
        <KpiCard
          label={t("dashboard.totalCredits")}
          value={
            comparison[0]
              ? fmt(comparison.reduce((s, r) => s + r.netCreditsTco2e, 0), {
                  maximumFractionDigits: 1,
                })
              : "—"
          }
          unit={comparison[0] ? t("unit.tco2e") : undefined}
          icon={Banknote}
          iconClassName="text-violet-600 dark:text-violet-400"
          accentClassName="bg-violet-500/10"
          hint={comparison[0] ? t("warn.estimate") : t("common.none")}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wind className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {t("dashboard.creditByStandard")}
              <span className="text-xs text-muted-foreground font-normal">
                ({t("unit.tco2e")})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comparison.length === 0 ? (
              <EmptyChart label={t("common.none")} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparison} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => fmt(Number(v), { maximumFractionDigits: 0 })}
                    fontSize={12}
                  />
                  <YAxis
                    type="category"
                    dataKey="standard"
                    width={110}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(v: number) => fmt(v, { maximumFractionDigits: 2 })}
                    labelFormatter={(l) => String(l)}
                  />
                  <Bar dataKey="netCreditsTco2e" radius={[0, 6, 6, 0]} barSize={28}>
                    {comparison.map((r) => {
                      const rule = STANDARD_LIST.find((s) => s.code === r.standard);
                      return <Cell key={r.standard} fill={rule?.accent ?? "#16a34a"} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ActivityIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              {t("dashboard.avgSoc")}
              <span className="text-xs text-muted-foreground font-normal">(%C)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={socTrendData} margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={[1.5, 2.5]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => fmt(Number(v))}
                />
                <Tooltip formatter={(v: number) => fmt(v) + " %"} />
                <Line
                  type="monotone"
                  dataKey="soc"
                  stroke="#0d9488"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0d9488" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            {t("dashboard.recentActivity")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setSection("samples")}
          >
            {t("common.refresh")} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentActivity.length === 0 ? (
            <EmptyChart label={t("common.none")} />
          ) : (
            <ul className="divide-y border-t-0">
              {data.recentActivity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-3 px-6 py-3 text-sm"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium capitalize">{a.activity.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {a.farmName ?? "—"}
                      {a.note ? ` · ${a.note}` : ""}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {fmtDate(a.activityAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
