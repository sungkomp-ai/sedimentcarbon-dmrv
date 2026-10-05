"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/provider";
import { useQueryClient } from "@tanstack/react-query";
import type { Farm } from "./farms-section";

interface SedimentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farms: Farm[];
  defaultFarmId?: string;
}

const SOURCES = [
  { value: "manual", label: "Manual measurement" },
  { value: "drone_dem", label: "Drone DEM" },
  { value: "ai_photo", label: "AI photo analysis" },
];

export function SedimentFormDialog({
  open,
  onOpenChange,
  farms,
  defaultFarmId,
}: SedimentDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [farmId, setFarmId] = useState(defaultFarmId ?? farms[0]?.id ?? "");
  const [trapId, setTrapId] = useState("TRAP-01");
  const [measuredAt, setMeasuredAt] = useState("");
  const [area, setArea] = useState("4.0");
  const [deltaH, setDeltaH] = useState("10");
  const [bd, setBd] = useState("1.3");
  const [socPct, setSocPct] = useState("1.2");
  const [source, setSource] = useState("manual");
  const [saving, setSaving] = useState(false);

  async function onSubmit() {
    if (!farmId) {
      toast({ title: t("common.error"), description: t("warn.noFarms"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sediment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          trapId,
          measuredAt,
          trapAreaM2: Number(area) || 0,
          deltaHcm: Number(deltaH) || 0,
          sedBulkDensity: Number(bd) || 1.3,
          sedSocPct: Number(socPct) || 1.2,
          source,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      toast({ title: t("sediment.saved") });
      qc.invalidateQueries({ queryKey: ["sediment"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("sediment.new")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sfarm">{t("samples.farm")}</Label>
            <select
              id="sfarm"
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {farms.length === 0 && <option value="">{t("warn.noFarms")}</option>}
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nameTh}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trap">{t("sediment.trapId")}</Label>
            <Input id="trap" value={trapId} onChange={(e) => setTrapId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sdate">{t("sediment.date")}</Label>
            <Input
              id="sdate"
              type="date"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="src">{t("sediment.source")}</Label>
            <select
              id="src"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sarea">{t("sediment.area")}</Label>
            <Input
              id="sarea"
              type="number"
              step="0.01"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dh">{t("sediment.deltaH")}</Label>
            <Input
              id="dh"
              type="number"
              step="0.1"
              value={deltaH}
              onChange={(e) => setDeltaH(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sbd">{t("sediment.bd")}</Label>
            <Input
              id="sbd"
              type="number"
              step="0.01"
              value={bd}
              onChange={(e) => setBd(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ssoc">{t("sediment.socPct")}</Label>
            <Input
              id="ssoc"
              type="number"
              step="0.01"
              value={socPct}
              onChange={(e) => setSocPct(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
