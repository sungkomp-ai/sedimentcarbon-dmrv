"use client";

import {
  LayoutDashboard,
  MapPinned,
  TestTube2,
  Layers3,
  Calculator,
  ShieldCheck,
  FileClock,
  BookOpen,
  Leaf,
} from "lucide-react";
import { useApp, type SectionId } from "@/lib/store/app";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface NavItem {
  id: SectionId;
  key: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { id: "dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { id: "farms", key: "nav.farms", icon: MapPinned },
  { id: "samples", key: "nav.samples", icon: TestTube2 },
  { id: "sediment", key: "nav.sediment", icon: Layers3 },
  { id: "calculator", key: "nav.calculator", icon: Calculator },
  { id: "standards", key: "nav.standards", icon: ShieldCheck },
  { id: "audit", key: "nav.audit", icon: FileClock },
  { id: "guide", key: "nav.guide", icon: BookOpen },
];

interface SidebarProps {
  /** Open state for mobile drawer. */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { active, setSection } = useApp();
  const { t } = useI18n();

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 shrink-0 border-r bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex items-center gap-3 px-5 py-5 border-b">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Leaf className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight leading-tight">
                SedimentCarbon
              </span>
              <span className="text-xs text-muted-foreground">dMRV</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="flex flex-col gap-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setSection(item.id);
                        onClose();
                      }}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      <span className="truncate">{t(item.key)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer note */}
          <div className="px-5 py-4 border-t text-xs text-muted-foreground">
            <p className="leading-relaxed">
              {t("warn.estimate")}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
