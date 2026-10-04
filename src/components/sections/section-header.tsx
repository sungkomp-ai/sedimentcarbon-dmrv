"use client";

import { useI18n } from "@/lib/i18n/provider";

interface SectionHeaderProps {
  titleKey: string;
  descriptionKey?: string;
  children?: React.ReactNode;
}

export function SectionHeader({
  titleKey,
  descriptionKey,
  children,
}: SectionHeaderProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{t(titleKey)}</h2>
        {descriptionKey && (
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t(descriptionKey)}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
