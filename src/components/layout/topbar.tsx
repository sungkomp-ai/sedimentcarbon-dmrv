"use client";

import { Menu, Github, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocaleToggle } from "./locale-toggle";
import { ThemeToggle } from "./theme-toggle";
import { useApp, type SectionId } from "@/lib/store/app";
import { useI18n } from "@/lib/i18n/provider";

const SECTION_LABELS: Record<SectionId, string> = {
  dashboard: "nav.dashboard",
  farms: "nav.farms",
  samples: "nav.samples",
  sediment: "nav.sediment",
  calculator: "nav.calculator",
  standards: "nav.standards",
  audit: "nav.audit",
  vvb: "nav.vvb",
  import: "nav.import",
  guide: "nav.guide",
};

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { active } = useApp();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2.5">
          <h1 className="text-lg font-semibold tracking-tight">
            {t(SECTION_LABELS[active])}
          </h1>
          <Badge variant="secondary" className="hidden md:inline-flex">
            T-VER · VCS · GS · ISO 14064
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex"
          aria-label="Source"
          asChild
        >
          <a
            href="https://ghgreduction.tgo.or.th"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="h-4 w-4" />
          </a>
        </Button>
        <LocaleToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
