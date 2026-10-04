"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accentClassName?: string;
  iconClassName?: string;
}

export function KpiCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  accentClassName,
  iconClassName,
}: KpiCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
        {Icon && (
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              accentClassName ?? "bg-muted"
            )}
          >
            <Icon className={cn("h-4 w-4", iconClassName ?? "text-muted-foreground")} />
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground">{unit}</span>
          )}
        </div>
        {hint && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}
