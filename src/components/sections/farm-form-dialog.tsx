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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MiniMap } from "@/components/fields/mini-map";
import { useI18n } from "@/lib/i18n/provider";
import { useQueryClient } from "@tanstack/react-query";
import { STANDARD_LIST } from "@/lib/core/standards";
import { Mountain, Leaf } from "lucide-react";

interface FarmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_POLYGON = JSON.stringify({
  type: "Polygon",
  coordinates: [
    [
      [100.7650, 18.8350],
      [100.7850, 18.8350],
      [100.7850, 18.8550],
      [100.7650, 18.8550],
      [100.7650, 18.8350],
    ],
  ],
});

// Expanded trap types including the Nan-province highland design.
const TRAP_TYPES = [
  {
    id: "terrace_step",
    labelTh: "ขั้นบรรไดดินกว้าง 1.5 ม.",
    labelEn: "Terrace Step (1.5 m wide)",
    descTh: "ทำแปลงเป็นขั้นบรรไดตามไหล่เขา เพื่อลดความชันและดักตะกอน",
    descEn: "Cut terraces along the contour to reduce slope and trap sediment",
  },
  {
    id: "vetiver_bund",
    labelTh: "คันหญ้าแฝก 0.8 ม.",
    labelEn: "Vetiver Bund (0.8 m)",
    descTh: "คันดินปลูกหญ้าแฝกเพื่อยึดดินและชะลอน้ำ",
    descEn: "Earthen bund planted with vetiver to anchor soil and slow water",
  },
  {
    id: "check_dam",
    labelTh: "ฝายชะลอน้ำ",
    labelEn: "Check Dam",
    descTh: "ฝายคอนกรีต/ไม้ในแปลงเพิ่มการดักตะกอนและชะลอน้ำ",
    descEn: "Concrete/wooden weir inside plot to trap sediment and slow water",
  },
  {
    id: "alternating_slope",
    labelTh: "แปลงเอียงสลับซ้าย-ขวา",
    labelEn: "Alternating Slope (Z-flow)",
    descTh: "แปลงเอียงสลับกันทำให้น้ำไหลจากบนลงล่างสลับซ้าย-ขวา",
    descEn: "Alternating slope so water zigzags top→bottom, slowing flow",
  },
  {
    id: "contour_bund",
    labelTh: "ขั้นบันไดดินตามไหล่เขา",
    labelEn: "Contour Bund",
    descTh: "คันดินตามแนวเส้นชั้นความสูง",
    descEn: "Earthen bund along the contour",
  },
  {
    id: "vegetative_strip",
    labelTh: "แนวพืชกักตะกอน",
    labelEn: "Vegetative Strip",
    descTh: "แนวพืชพลอยใช้กักตะกอน",
    descEn: "Strip of vegetation used to trap sediment",
  },
];

const CROPS = [
  { id: "tea", labelTh: "ชา", labelEn: "Tea" },
  { id: "coffee_arabica", labelTh: "กาแฟอราบิก้า", labelEn: "Arabica Coffee" },
  { id: "upland_rice", labelTh: "ข้าวไร่", labelEn: "Upland Rice" },
  { id: "soybean", labelTh: "ถั่วเหลือง", labelEn: "Soybean" },
  { id: "cover_crop", labelTh: "พืชคลุมดิน (โสน/ปอเทือง)", labelEn: "Cover Crop (Sesbania/Crotalaria)" },
  { id: "shade_tree", labelTh: "ไม้ยืนต้นให้ร่มเงา", labelEn: "Shade Tree (Gliricidia)" },
  { id: "rice", labelTh: "ข้าวนาปี", labelEn: "Rice (lowland)" },
];

const PRIOR_LAND_USES = [
  { id: "shifting_cultivation", labelTh: "ไร่เลื่อนลอย (เดิม)", labelEn: "Shifting cultivation (former)" },
  { id: "conventional_tillage", labelTh: "ไถพรวนแบบเดิม", labelEn: "Conventional tillage" },
  { id: "fallow", labelTh: "ที่ดินทิ้งร้าง", labelEn: "Fallow land" },
  { id: "forest_degraded", labelTh: "ป่าเสื่อมโทรม", labelEn: "Degraded forest" },
];

export function FarmFormDialog({ open, onOpenChange }: FarmDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [geom, setGeom] = useState(DEFAULT_POLYGON);
  const [soilType, setSoilType] = useState("Haplic Acrisols (highland loam)");
  const [slope, setSlope] = useState("25");
  const [elevationM, setElevationM] = useState("950");
  const [projectStart, setProjectStart] = useState("2024-01-01");
  const [standard, setStandard] = useState("TVER");
  const [traps, setTraps] = useState<string[]>(["terrace_step", "vetiver_bund", "check_dam", "alternating_slope"]);
  const [crops, setCrops] = useState<string[]>(["cover_crop"]);
  const [priorLandUse, setPriorLandUse] = useState("shifting_cultivation");
  // plot design params
  const [terraceWidth, setTerraceWidth] = useState("1.5");
  const [bundWidth, setBundWidth] = useState("0.8");
  const [alternatingSlope, setAlternatingSlope] = useState(true);
  const [hasCheckDam, setHasCheckDam] = useState(true);
  const [bundCrop, setBundCrop] = useState("vetiver");

  const [ownerName, setOwnerName] = useState("Field Officer");
  const [ownerEmail, setOwnerEmail] = useState("farmer@example.org");
  const [saving, setSaving] = useState(false);

  function reset() {
    setNameTh("");
    setNameEn("");
    setGeom(DEFAULT_POLYGON);
    setSoilType("Haplic Acrisols (highland loam)");
    setSlope("25");
    setElevationM("950");
    setProjectStart("2024-01-01");
    setStandard("TVER");
    setTraps(["terrace_step", "vetiver_bund", "check_dam"]);
    setCrops(["cover_crop"]);
    setPriorLandUse("shifting_cultivation");
    setTerraceWidth("1.5");
    setBundWidth("0.8");
    setAlternatingSlope(true);
    setHasCheckDam(true);
    setBundCrop("vetiver");
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
      const plotDesign = {
        terraceWidthM: Number(terraceWidth) || 0,
        bundWidthM: Number(bundWidth) || 0,
        alternatingSlope,
        hasCheckDam,
        bundCrop,
      };
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameTh: nameTh.trim(),
          nameEn: nameEn.trim() || null,
          geomGeojson: geom,
          soilType,
          slopePct: Number(slope) || 0,
          elevationM: Number(elevationM) || null,
          projectStart,
          standard,
          trapTypes: traps,
          crops,
          plotDesign,
          priorLandUse,
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
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
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
              placeholder="แปลงชาภูเขา บ้านป่าค้อ..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name-en">{t("farms.name")} (EN)</Label>
            <Input
              id="name-en"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Highland Tea Farm..."
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
            <Label htmlFor="elev" className="flex items-center gap-1.5">
              <Mountain className="h-3.5 w-3.5" />
              {t("farms.elevation")}
            </Label>
            <Input
              id="elev"
              type="number"
              value={elevationM}
              onChange={(e) => setElevationM(e.target.value)}
              placeholder="600"
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
            <Label htmlFor="prior">{t("farms.priorLandUse")}</Label>
            <select
              id="prior"
              value={priorLandUse}
              onChange={(e) => setPriorLandUse(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {PRIOR_LAND_USES.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.labelTh} ({u.labelEn})
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

        {/* Plot design params */}
        <div className="rounded-md border bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium">{t("farms.plotDesignTitle")}</span>
            <Badge variant="outline" className="text-[10px]">
              {t("farms.plotDesignHint")}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="tw" className="text-xs">{t("farms.terraceWidth")}</Label>
              <Input id="tw" type="number" step="0.1" value={terraceWidth} onChange={(e) => setTerraceWidth(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bw" className="text-xs">{t("farms.bundWidth")}</Label>
              <Input id="bw" type="number" step="0.1" value={bundWidth} onChange={(e) => setBundWidth(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bc" className="text-xs">{t("farms.bundCrop")}</Label>
              <select id="bc" value={bundCrop} onChange={(e) => setBundCrop(e.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs">
                <option value="vetiver">หญ้าแฝก (Vetiver)</option>
                <option value="leucaena">ยูคาลิปตัส (Leucaena)</option>
                <option value="paspalum">หญ้าพาสพาลัม (Paspalum)</option>
              </select>
            </div>
            <div className="space-y-1 flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={alternatingSlope} onCheckedChange={(v) => setAlternatingSlope(Boolean(v))} />
                {t("farms.alternatingSlope")}
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={hasCheckDam} onCheckedChange={(v) => setHasCheckDam(Boolean(v))} />
                {t("farms.hasCheckDam")}
              </label>
            </div>
          </div>
        </div>

        {/* Trap types */}
        <div className="space-y-2">
          <Label>{t("farms.trapTypes")}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
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
                    <span className="text-xs font-medium">{ttype.labelTh}</span>
                    <span className="text-[10px] text-muted-foreground">{ttype.labelEn}</span>
                    <span className="text-[10px] text-muted-foreground/80">{ttype.descTh}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Crops */}
        <div className="space-y-2">
          <Label>{t("farms.cropsLabel")}</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {CROPS.map((c) => {
              const checked = crops.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50 has-[:checked]:bg-emerald-50/60 dark:has-[:checked]:bg-emerald-950/20"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      if (v) setCrops([...crops, c.id]);
                      else setCrops(crops.filter((x) => x !== c.id));
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium">{c.labelTh}</span>
                    <span className="text-[10px] text-muted-foreground">{c.labelEn}</span>
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
          <MiniMap value={geom} onChange={setGeom} style="satellite" />
          <p className="text-xs text-muted-foreground">
            {t("farms.geomHint")} · {t("farms.areaHelp")}
          </p>
          <Textarea
            value={geom}
            onChange={(e) => setGeom(e.target.value)}
            rows={3}
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
