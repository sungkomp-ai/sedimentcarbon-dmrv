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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { MiniMap } from "@/components/fields/mini-map";
import { useI18n } from "@/lib/i18n/provider";
import { useQueryClient } from "@tanstack/react-query";
import { STANDARD_LIST } from "@/lib/core/standards";

interface FarmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_POLYGON = JSON.stringify({
  type: "Polygon",
  coordinates: [
    [
      [102.102, 14.97],
      [102.118, 14.97],
      [102.118, 14.995],
      [102.102, 14.995],
      [102.102, 14.97],
    ],
  ],
});

const TRAP_TYPES = [
  { id: "contour_bund", labelTh: "ขั้นบันไดดิน (Contour Bund)", labelEn: "Contour Bund" },
  { id: "vegetative_strip", labelTh: "แนวพืชกักตะกอน (Vegetative Strip)", labelEn: "Vegetative Strip" },
  { id: "check_dam", labelTh: "เขื่อนตรวจ (Check Dam)", labelEn: "Check Dam" },
];

export function FarmFormDialog({ open, onOpenChange }: FarmDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [geom, setGeom] = useState(DEFAULT_POLYGON);
  const [soilType, setSoilType] = useState("Sandy loam");
  const [slope, setSlope] = useState("3.5");
  const [projectStart, setProjectStart] = useState("2024-01-01");
  const [standard, setStandard] = useState("TVER");
  const [traps, setTraps] = useState<string[]>(["contour_bund"]);
  const [ownerName, setOwnerName] = useState("Field Officer");
  const [ownerEmail, setOwnerEmail] = useState("farmer@example.org");
  const [saving, setSaving] = useState(false);

  function reset() {
    setNameTh("");
    setNameEn("");
    setGeom(DEFAULT_POLYGON);
    setSoilType("Sandy loam");
    setSlope("3.5");
    setProjectStart("2024-01-01");
    setStandard("TVER");
    setTraps(["contour_bund"]);
    setOwnerName("Field Officer");
    setOwnerEmail("farmer@example.org");
  }

  async function onSubmit() {
    if (!nameTh.trim()) {
      toast({ title: t("common.error"), description: t("farms.name"), variant: "destructive" });
      return;
    }
    if (!geom) {
      toast({ title: t("common.error"), description: t("farms.geomHint"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameTh: nameTh.trim(),
          nameEn: nameEn.trim() || null,
          geomGeojson: geom,
          soilType,
          slopePct: Number(slope) || 0,
          projectStart,
          standard,
          trapTypes: traps,
          ownerName,
          ownerEmail,
          creditingYears: 10,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Save failed");
      }
      toast({ title: t("farms.saved") });
      qc.invalidateQueries({ queryKey: ["farms"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      reset();
      onOpenChange(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Save failed";
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("farms.new")}</DialogTitle>
          <DialogDescription>{t("farms.geomHint")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name-th">{t("farms.name")} (TH)</Label>
            <Input
              id="name-th"
              value={nameTh}
              onChange={(e) => setNameTh(e.target.value)}
              placeholder="แปลงสาธิต..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name-en">{t("farms.name")} (EN)</Label>
            <Input
              id="name-en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Demo field..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="soil">{t("farms.soilType")}</Label>
            <Input
              id="soil"
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slope">{t("farms.slope")}</Label>
            <Input
              id="slope"
              type="number"
              step="0.1"
              value={slope}
              onChange={(e) => setSlope(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ps">{t("farms.projectStart")}</Label>
            <Input
              id="ps"
              type="date"
              value={projectStart}
              onChange={(e) => setProjectStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="std">{t("farms.standard")}</Label>
            <select
              id="std"
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {STANDARD_LIST.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.labelEn} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner">{t("farms.owner")}</Label>
            <Input
              id="owner"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("farms.trapTypes")}</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {TRAP_TYPES.map((ttype) => {
              const checked = traps.includes(ttype.id);
              return (
                <label
                  key={ttype.id}
                  className="flex items-start gap-2 rounded-md border p-2.5 cursor-pointer hover:bg-muted/50 has-[:checked]:bg-emerald-50/60 dark:has-[:checked]:bg-emerald-950/20"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      if (v) setTraps([...traps, ttype.id]);
                      else setTraps(traps.filter((x) => x !== ttype.id));
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium">{ttype.labelEn}</span>
                    <span className="text-xs text-muted-foreground">{ttype.labelTh}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("farms.geom")}</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setGeom(DEFAULT_POLYGON)}
            >
              Reset
            </Button>
          </div>
          <MiniMap value={geom} onChange={setGeom} />
          <Textarea
            value={geom}
            onChange={(e) => setGeom(e.target.value)}
            rows={4}
            className="font-mono text-xs"
            placeholder='{"type":"Polygon","coordinates":[...]}'
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={saving} className="gap-2">
            {saving ? t("common.loading") : t("farms.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
