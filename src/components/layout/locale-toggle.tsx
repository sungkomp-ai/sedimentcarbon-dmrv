"use client";

import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 font-medium"
      onClick={() => setLocale(locale === "th" ? "en" : "th")}
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      <span className="text-sm">{locale === "th" ? "TH" : "EN"}</span>
    </Button>
  );
}
