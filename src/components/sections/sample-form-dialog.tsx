"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/provider";
import { useQueryClient } from "@tanstack/react-query";
import type { Farm } from "./farms-section";

interface SampleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farms: Farm[];
  defaultFarmId?: string;
}

interface SampleRowInput {
  farmId: string;
  plotCode: string;
  sampledAt: string;
  depthTopCm: number;
  depthBotCm: number;
  socPct: number;
  bulkDensity: number;
  coarseFragPct: number;
  labRef: string;
  method: string;
  isBaseline: boolean;
}

const METHODS = [
  { value: "dry_combustion", labelTh: "การเผาไหม้แห้ง", labelEn: "Dry Combustion (Elemental)" },
  { value: "walkley_black", labelTh: "Walkley-Black", labelEn: "Walkley-Black" },
  { value: "mir_spectroscopy", labelTh: "MIR Spectroscopy", labelEn: "MIR Spectroscopy" },
];

export function SampleFormDialog({
  open,
  onOpenChange,
  farms,
  defaultFarmId,
}: SampleDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [farmId, setFarmId] = useState(defaultFarmId ?? farms[0]?.id ?? "");
  const [plotCode, setPlotCode] = useState("P-01");
  const [sampledAt, setSampledAt] = useState(new Date().toISOString().slice(0, 10));
  const [depthTop, setDepthTop] = useState("0");
  const [depthBot, setDepthBot] = useState("30");
  const [socPct, setSocPct] = useState("");
  const [bd, setBd] = useState("1.35");
  const [cf, setCf] = useState("5");
  const [labRef, setLabRef] = useState("");
  const [method, setMethod] = useState("dry_combustion");
  const [isBaseline, setIsBaseline] = useState(false);

  const [batch, setBatch] = useState("");

  async function submitOne() {
    if (!farmId) {
      toast({ title: t("common.error"), description: t("warn.noFarms"), variant: "destructive" });
      return;
    }
    const row: SampleRowInput = {
      farmId,
      plotCode,
      sampledAt,
      depthTopCm: Number(depthTop) || 0,
      depthBotCm: Number(depthBot) || 0,
      socPct: Number(socPct) || 0,
      bulkDensity: Number(bd) || 0,
      coarseFragPct: Number(cf) || 0,
      labRef,
      method,
      isBaseline,
    };
    if (!row.socPct || !row.bulkDensity) {
      toast({
        title: t("common.error"),
        description: `${t("samples.socPct")}, ${t("samples.bulkDensity")}`,
        variant: "destructive",
      });
      return;
    }
    await submit([row]);
  }

  async function submitBatch() {
    if (!batch.trim()) {
      toast({ title: t("common.error"), description: t("samples.batch"), variant: "destructive" });
      return;
    }
    // Parse CSV-ish input: plotCode,socPct,bulkDensity,coarseFragPct,labRef,depthTop,depthBot
    // First line is header. Date is shared.
    const lines = batch.trim().split(/\r?\n/);
    const dataLines = lines.filter((l) => !l.toLowerCase().startsWith("plotcode"));
    if (dataLines.length === 0) {
      toast({ title: t("common.error"), description: t("samples.batch"), variant: "destructive" });
      return;
    }
    const rows: SampleRowInput[] = [];
    for (const line of dataLines) {
      const [plotCode, socPct, bd, cf, labRef, depthTop, depthBot] = line.split(",").map((s) => s.trim());
      rows.push({
        farmId,
        plotCode: plotCode ?? "P-01",
        sampledAt,
        depthTopCm: Number(depthTop ?? 0) || 0,
        depthBotCm: Number(depthBot ?? 30) || 30,
        socPct: Number(socPct) || 0,
        bulkDensity: Number(bd) || 0,
        coarseFragPct: Number(cf) || 0,
        labRef: labRef ?? "",
        method,
        isBaseline,
      });
    }
    await submit(rows);
  }

  async function submit(rows: SampleRowInput[]) {
    try {
      let ok = 0;
      let failed = 0;
      for (const row of rows) {
        const res = await fetch("/api/soil-samples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
        if (res.ok) ok++;
        else failed++;
      }
      if (failed > 0) {
        toast({
          title: `${ok} ok · ${failed} failed`,
          variant: "destructive",
          description: t("common.error"),
        });
      } else {
        toast({ title: t("samples.saved"), description: `${ok} ${t("samples.title").toLowerCase()}` });
      }
      qc.invalidateQueries({ queryKey: ["soil-samples"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("samples.new")}</DialogTitle>
          <DialogDescription>{t("samples.batch")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="farm">{t("samples.farm")}</Label>
              <select
                id="farm"
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {farms.length === 0 && <option value="">{t("warn.noFarms")}</option>}
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nameTh} · {f.areaHa.toFixed(1)} ha
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plot">{t("samples.plot")}</Label>
              <Input
                id="plot"
                value={plotCode}
                onChange={(e) => setPlotCode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">{t("samples.date")}</Label>
              <Input
                id="date"
                type="date"
                value={sampledAt}
                onChange={(e) => setSampledAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="method">{t("samples.method")}</Label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="dt">{t("samples.depth")} (top)</Label>
              <Input
                id="dt"
                type="number"
                value={depthTop}
                onChange={(e) => setDepthTop(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="db">{t("samples.depth")} (bot)</Label>
              <Input
                id="db"
                type="number"
                value={depthBot}
                onChange={(e) => setDepthBot(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="soc">{t("samples.socPct")}</Label>
              <Input
                id="soc"
                type="number"
                step="0.01"
                value={socPct}
                onChange={(e) => setSocPct(e.target.value)}
                placeholder="1.85"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bd">{t("samples.bulkDensity")}</Label>
              <Input
                id="bd"
                type="number"
                step="0.01"
                value={bd}
                onChange={(e) => setBd(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cf">{t("samples.coarseFrag")}</Label>
              <Input
                id="cf"
                type="number"
                step="0.1"
                value={cf}
                onChange={(e) => setCf(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lab">{t("samples.labRef")}</Label>
              <Input
                id="lab"
                value={labRef}
                onChange={(e) => setLabRef(e.target.value)}
                placeholder="LAB-001"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={isBaseline}
                  onCheckedChange={(v) => setIsBaseline(Boolean(v))}
                />
                <span className="text-sm">{t("samples.isBaseline")}</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("samples.batch")}</Label>
            <Textarea
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              rows={4}
              className="font-mono text-xs"
              placeholder={`plotCode,socPct,bulkDensity,coarseFragPct,labRef,depthTop,depthBot
P-01,1.92,1.35,5.0,LAB-001,0,30
P-02,1.95,1.36,4.5,LAB-002,0,30`}
            />
            <p className="text-xs text-muted-foreground">
              CSV rows share the date, farm, plot prefix, and baseline flag above.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="secondary" onClick={submitBatch}>
            {t("samples.batch")}
          </Button>
          <Button onClick={submitOne}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
