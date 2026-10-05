"use client";

import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { SectionHeader } from "./section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Layers3,
  TestTube2,
  Calculator,
  FileClock,
  ShieldCheck,
  BookOpen,
  User,
  Eye,
  Settings,
  Sprout,
  Database,
} from "lucide-react";

export function GuideSection() {
  const { t, locale, fmt } = useI18n();

  // Fetch real system statistics
  const { data: dashData } = useQuery<{
    totalFarms: number;
    totalAreaHa: number;
    totalSamples: number;
    estimatedSediment?: { totalSedimentT: number; totalCo2eT: number };
    creditComparison?: { netCreditsTco2e: number; standard: string }[];
  }>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/dashboard");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const totalCredits = dashData?.creditComparison
    ? dashData.creditComparison.reduce((s, r) => s + r.netCreditsTco2e, 0)
    : 0;

  const steps =
    locale === "th"
      ? [
          {
            n: 1,
            icon: MapPin,
            title: "ลงทะเบียนแปลง",
            desc: "วาดจุดบนแผนที่เพื่อกำหนดขอบเขตแปลงด้วย GPS",
          },
          {
            n: 2,
            icon: Layers3,
            title: "เลือกรูปแบบกักตะกอน",
            desc: "เลือกภาพประกอบ 3 แบบ ไม่ต้องพิมพ์",
          },
          {
            n: 3,
            icon: TestTube2,
            title: "เก็บดินรอบแรก",
            desc: "แอปบอกจุดที่ต้องเก็บ พร้อมส่งตัวอย่างไปยังห้องปฏิบัติการ",
          },
          {
            n: 4,
            icon: Calculator,
            title: "บันทึกกิจกรรม",
            desc: "ถ่ายภาพรูป และเลือกไอคอน (ใส่ปุ๋ย/ไถพรวน/เก็บเกี่ยว)",
          },
          {
            n: 5,
            icon: Layers3,
            title: "วัดตะกอน",
            desc: "ถ่ายภาพรูปก่อนวัดระบบช่วยวัดด้วย AI",
          },
          {
            n: 6,
            icon: FileClock,
            title: "ดูผลลัพธ์",
            desc: "เห็นตัวเลขคาร์บอนที่เก็บได้ และมูลค่าโดยประมาณ",
          },
        ]
      : [
          { n: 1, icon: MapPin, title: "Register Farm", desc: "Draw boundary on map with GPS" },
          { n: 2, icon: Layers3, title: "Pick Trap Type", desc: "Choose from 3 designs, no typing" },
          { n: 3, icon: TestTube2, title: "Baseline Sampling", desc: "App points you to sample spots, lab submission" },
          { n: 4, icon: Calculator, title: "Record Activities", desc: "Snap photos, tap icons (fertiliser/tillage/harvest)" },
          { n: 5, icon: Layers3, title: "Measure Sediment", desc: "Snap before measuring, AI assist" },
          { n: 6, icon: FileClock, title: "Review Results", desc: "See carbon captured + estimated value" },
        ];

  const roles =
    locale === "th"
      ? [
          {
            icon: Sprout,
            title: "เกษตรกร",
            desc: "บันทึกข้อมูลแปลงของตนเอง ดูผลตอบแทนของตนเอง",
          },
          {
            icon: User,
            title: "วิศวกรชมชน / Aggregator",
            desc: "รวมแปลงเพื่อชวนรอบเก็บตัวอย่าง ดูภาพรวมกลุ่ม",
          },
          {
            icon: Eye,
            title: "ผู้ตรวจสอบ (VVB)",
            desc: "เข้าถึงข้อมูลแบบอ่านอย่างเดียว ตรวจ audit trail และหลักฐาน",
          },
          {
            icon: Settings,
            title: "ผู้ดูแลระบบ",
            desc: "จัดการค่าตั้ง สิทธิ์ มาตรฐาน และราคาตลาด",
          },
        ]
      : [
          { icon: Sprout, title: "Farmer", desc: "Records own field data, sees own returns" },
          { icon: User, title: "Aggregator", desc: "Bundles fields for shared sampling rounds" },
          { icon: Eye, title: "VVB", desc: "Read-only access, audit trail + evidence review" },
          { icon: Settings, title: "Admin", desc: "Config, permissions, standards, market prices" },
        ];

  return (
    <div className="space-y-6">
      <SectionHeader titleKey="guide.title" descriptionKey="guide.disclaimer" />

      {/* System statistics card */}
      {dashData && (
        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/60 to-violet-50/40 dark:from-emerald-950/20 dark:to-violet-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {locale === "th" ? "สถิติระบบปัจจุบัน" : "Current System Statistics"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {locale === "th" ? "แปลง" : "Farms"}
                </div>
                <div className="text-2xl font-bold tabular-nums">{fmt(dashData.totalFarms)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Layers3 className="h-3 w-3" /> {locale === "th" ? "พื้นที่รวม" : "Total area"}
                </div>
                <div className="text-2xl font-bold tabular-nums">{fmt(dashData.totalAreaHa, { maximumFractionDigits: 0 })} ha</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TestTube2 className="h-3 w-3" /> {locale === "th" ? "ตัวอย่างดิน" : "Samples"}
                </div>
                <div className="text-2xl font-bold tabular-nums">{fmt(dashData.totalSamples)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Layers3 className="h-3 w-3" /> {locale === "th" ? "ตะกอนดักไว้" : "Sediment"}
                </div>
                <div className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {fmt(dashData.estimatedSediment?.totalSedimentT ?? 0, { maximumFractionDigits: 0 })} t
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calculator className="h-3 w-3" /> {locale === "th" ? "เครดิตรวม" : "Credits"}
                </div>
                <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {fmt(totalCredits, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-[10px] text-muted-foreground">tCO₂e</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("guide.steps")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.n} className="rounded-md border bg-card p-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      {s.n}
                    </div>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{s.title}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t("guide.roles")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.title} className="rounded-md border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium">{r.title}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-300 bg-amber-50/40 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3 py-4">
          <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium">{t("warn.estimate")}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === "th"
                ? "การแจกแจงการปล่อยก๊าซ (EF) ในที่นี้ใช้ค่า Tier 1 ของ IPCC ควรแทนด้วยค่า Tier 2 เฉพาะพื้นที่ของไทยเมื่อมีข้อมูล ผลลัพธ์ทั้งหมดไม่ใช่เครดิตที่ผ่านการรับรอง"
                : "Emission factors here use IPCC Tier 1 defaults; replace with Thailand-specific Tier 2 values when data is available. Outputs are estimates, not certified credits."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
