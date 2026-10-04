"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useApp } from "@/lib/store/app";
import { useI18n } from "@/lib/i18n/provider";
import { DashboardSection } from "@/components/sections/dashboard-section";
import { FarmsSection } from "@/components/sections/farms-section";
import { SamplesSection } from "@/components/sections/samples-section";
import { SedimentSection } from "@/components/sections/sediment-section";
import { CalculatorSection } from "@/components/sections/calculator-section";
import { AuditSection } from "@/components/sections/audit-section";
import { StandardsSection } from "@/components/sections/standards-section";
import { GuideSection } from "@/components/sections/guide-section";
import { Leaf, Github } from "lucide-react";

export function AppShell() {
  const { active } = useApp();
  const { t, locale } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="flex flex-1 flex-col lg:flex-row">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
              {active === "dashboard" && <DashboardSection />}
              {active === "farms" && <FarmsSection />}
              {active === "samples" && <SamplesSection />}
              {active === "sediment" && <SedimentSection />}
              {active === "calculator" && <CalculatorSection />}
              {active === "standards" && <StandardsSection />}
              {active === "audit" && <AuditSection />}
              {active === "guide" && <GuideSection />}
            </div>
          </main>
        </div>
      </div>

      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-2">
            <Leaf className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">SedimentCarbon dMRV</span>
            <span className="text-muted-foreground/60">·</span>
            <span>{t("app.standards")}</span>
          </div>
          <p className="leading-relaxed">
            {t("warn.estimate")}
          </p>
        </div>
      </footer>
    </div>
  );
}
