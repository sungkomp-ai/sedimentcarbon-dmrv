"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n/provider";
import { useToast } from "@/hooks/use-toast";
import { SectionHeader } from "./section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Radio,
  Bell,
  Plus,
  Flame,
  PlayCircle,
} from "lucide-react";

const ACTIVITY_TYPES = [
  "fertiliser",
  "tillage",
  "residue_retention",
  "cover_crop",
  "trap_maintenance",
  "harvest",
  "liming",
  "biochar_application",
];

const SENSOR_TYPES = [
  "soil_moisture",
  "temperature",
  "rainfall",
  "humidity",
  "ec",
  "ndvi",
];

const OPERATORS = ["<", "<=", ">", ">=", "=="];

const SAMPLE_CSV = `nameTh,nameEn,areaHa,slopePct,elevationM,soilType,standard,projectStart,priorLandUse,crops,trapTypes,bbox_minLon,bbox_minLat,bbox_maxLon,bbox_maxLat
แปลงสาธิต A,Plot A Demo,15.5,22,950,Highland loam,TVER,2023-05-01,shifting_cultivation,tea|cover_crop,terrace_step|vetiver_bund|check_dam,100.85,19.04,100.87,19.06
แปลงสาธิต B,Plot B Demo,8.0,30,1200,Volcanic soil,VCS,2022-06-01,shifting_cultivation,coffee_arabica|shade_tree,terrace_step|vetiver_bund|alternating_slope,101.05,19.18,101.06,19.19`;

export function ImportSection() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <SectionHeader titleKey="import.title" descriptionKey="import.desc" />
      <Tabs defaultValue="iot" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="iot" className="gap-1.5">
            <Radio className="h-3.5 w-3.5" /> {t("import.tab.iot")}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" /> {t("import.tab.rules")}
          </TabsTrigger>
          <TabsTrigger value="activities" className="gap-1.5">
            <PlayCircle className="h-3.5 w-3.5" /> {t("import.tab.activities")}
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> {t("import.tab.import")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="iot" className="mt-4">
          <IoTTab />
        </TabsContent>
        <TabsContent value="rules" className="mt-4">
          <RulesTab />
        </TabsContent>
        <TabsContent value="activities" className="mt-4">
          <ActivitiesTab />
        </TabsContent>
        <TabsContent value="import" className="mt-4">
          <CsvImportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ IoT Tab ============
interface IoTReading {
  id: string;
  farmId: string | null;
  farmName: string | null;
  sensorId: string;
  sensorType: string;
  value: number;
  unit: string;
  measuredAt: string;
}

function IoTTab() {
  const { t, fmt, fmtDate, locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [simulating, setSimulating] = useState(false);

  const { data, isLoading } = useQuery<{ readings: IoTReading[]; count: number }>({
    queryKey: ["iot"],
    queryFn: async () => {
      const r = await fetch("/api/iot?limit=50");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const readings = data?.readings ?? [];

  async function simulateLowMoisture() {
    setSimulating(true);
    try {
      const res = await fetch("/api/iot/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sensorId: "soil-moisture-sim-" + Date.now(),
          farmId: "demo-farm-001",
          sensorType: "soil_moisture",
          value: 15, // below threshold 20
          unit: "%",
          measuredAt: new Date().toISOString(),
          metadata: { source: "simulated" },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast({
        title: t("import.iot.simulated"),
        description: `saved: ${data.saved}, fired rules: ${data.firedRules?.length ?? 0}`,
      });
      qc.invalidateQueries({ queryKey: ["iot"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["rules"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Simulate button */}
      <Card className="border-sky-300 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span className="text-sm font-medium">{t("import.iot.simulate")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("import.iot.simulateDesc")}</p>
          </div>
          <Button onClick={simulateLowMoisture} disabled={simulating} className="gap-2 shrink-0">
            <Radio className="h-4 w-4" /> {simulating ? t("common.loading") : t("import.iot.simulate")}
          </Button>
        </CardContent>
      </Card>

      {/* Endpoint info */}
      <Card>
        <CardContent className="py-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">POST</Badge>
            <code className="font-mono text-xs">/api/iot/ingest</code>
          </div>
          <p className="text-xs text-muted-foreground">{t("import.iot.endpointDesc")}</p>
        </CardContent>
      </Card>

      {/* Readings table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t("import.iot.title")}
            <Badge variant="secondary">{readings.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : readings.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              {t("import.iot.empty")}
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>{t("import.iot.sensorId")}</TableHead>
                    <TableHead>{t("import.iot.sensorType")}</TableHead>
                    <TableHead className="text-right">{t("import.iot.value")}</TableHead>
                    <TableHead>{t("import.iot.farm")}</TableHead>
                    <TableHead className="text-right">{t("import.iot.measuredAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readings.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">{r.sensorId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.sensorType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {fmt(r.value, { maximumFractionDigits: 2 })} {r.unit}
                      </TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">
                        {r.farmName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">
                        {fmtDate(r.measuredAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Rules Tab ============
interface Rule {
  id: string;
  farmId: string | null;
  name: string;
  sensorType: string | null;
  operator: string;
  threshold: number;
  activity: string;
  note: string | null;
  enabled: boolean;
  cooldownHr: number;
  lastFiredAt: string | null;
  firedCount: number;
  createdAt: string;
}

function RulesTab() {
  const { t, fmtDate, locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ rules: Rule[] }>({
    queryKey: ["rules"],
    queryFn: async () => {
      const r = await fetch("/api/activities/rules");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const rules = data?.rules ?? [];

  // New rule form state
  const [newName, setNewName] = useState("");
  const [newSensorType, setNewSensorType] = useState("soil_moisture");
  const [newOperator, setNewOperator] = useState("<");
  const [newThreshold, setNewThreshold] = useState("20");
  const [newActivity, setNewActivity] = useState("fertiliser");
  const [newCooldown, setNewCooldown] = useState("24");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function createRule() {
    if (!newName.trim()) {
      toast({ title: t("common.error"), description: t("import.rules.name"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/activities/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          sensorType: newSensorType,
          operator: newOperator,
          threshold: Number(newThreshold),
          activity: newActivity,
          cooldownHr: Number(newCooldown),
          note: newNote || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: t("import.rules.saved") });
      setNewName("");
      setNewNote("");
      qc.invalidateQueries({ queryKey: ["rules"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(id: string, enabled: boolean) {
    await fetch(`/api/activities/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    qc.invalidateQueries({ queryKey: ["rules"] });
  }

  return (
    <div className="space-y-4">
      {/* New rule form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("import.rules.new")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("import.rules.name")}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Low soil moisture → irrigation" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("import.rules.cooldownHr")}</Label>
              <Input type="number" value={newCooldown} onChange={(e) => setNewCooldown(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("import.rules.sensorType")}</Label>
              <select value={newSensorType} onChange={(e) => setNewSensorType(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {SENSOR_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("import.rules.operator")}</Label>
              <select value={newOperator} onChange={(e) => setNewOperator(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("import.rules.threshold")}</Label>
              <Input type="number" value={newThreshold} onChange={(e) => setNewThreshold(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("import.rules.then")}</Label>
              <select value={newActivity} onChange={(e) => setNewActivity(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {ACTIVITY_TYPES.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("import.act.note")}</Label>
            <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Note for the auto-logged activity" />
          </div>
          <Button onClick={createRule} disabled={saving} className="gap-2">
            <Plus className="h-4 w-4" /> {saving ? t("common.loading") : t("import.rules.save")}
          </Button>
        </CardContent>
      </Card>

      {/* Rules list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            {t("import.rules.title")}
            <Badge variant="secondary">{rules.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : rules.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              {t("import.rules.empty")}
            </div>
          ) : (
            <div className="divide-y">
              {rules.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.name}</span>
                      {r.enabled ? (
                        <Badge className="text-[10px] bg-emerald-600">{t("import.rules.enabled")}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">OFF</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("import.rules.when")} <code className="font-mono">{r.sensorType} {r.operator} {r.threshold}</code>
                      {" → "}
                      {t("import.rules.then")}: <span className="font-medium">{r.activity.replace(/_/g, " ")}</span>
                    </p>
                    {r.note && <p className="text-xs text-muted-foreground mt-1">{r.note}</p>}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {t("import.rules.firedCount")}: {r.firedCount}
                      {r.lastFiredAt && ` · ${t("import.rules.lastFired")}: ${fmtDate(r.lastFiredAt)}`}
                    </p>
                  </div>
                  <Switch checked={r.enabled} onCheckedChange={(v) => toggleRule(r.id, r.enabled)} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Activities Tab ============
interface Activity {
  id: string;
  farmId: string;
  farmNameTh: string | null;
  activityAt: string;
  activity: string;
  nRateKgHa: number;
  note: string | null;
}

function ActivitiesTab() {
  const { t, fmt, fmtDate, locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ activities: Activity[] }>({
    queryKey: ["activities"],
    queryFn: async () => {
      const r = await fetch("/api/activities");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const activities = data?.activities ?? [];

  // New activity form
  const [newFarmId, setNewFarmId] = useState("");
  const [newActivity, setNewActivity] = useState("cover_crop");
  const [newDate, setNewDate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: farmsData } = useQuery<{ farms: { id: string; nameTh: string; areaHa: number }[] }>({
    queryKey: ["farms"],
    queryFn: async () => {
      const r = await fetch("/api/farms");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });
  const farms = farmsData?.farms ?? [];
  const currentFarmId = newFarmId || farms[0]?.id || "";

  async function createActivity() {
    if (!currentFarmId) {
      toast({ title: t("common.error"), description: t("warn.noFarms"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: currentFarmId,
          activity: newActivity,
          activityAt: newDate,
          note: newNote || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: t("import.act.saved") });
      setNewNote("");
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* New activity form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("import.act.new")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("samples.farm")}</Label>
              <select value={currentFarmId} onChange={(e) => setNewFarmId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {farms.map((f) => <option key={f.id} value={f.id}>{f.nameTh}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("import.act.activity")}</Label>
              <select value={newActivity} onChange={(e) => setNewActivity(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {ACTIVITY_TYPES.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("import.act.date")}</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("import.act.note")}</Label>
            <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Activity note" />
          </div>
          <Button onClick={createActivity} disabled={saving} className="gap-2">
            <Plus className="h-4 w-4" /> {saving ? t("common.loading") : t("import.act.save")}
          </Button>
        </CardContent>
      </Card>

      {/* Activities list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlayCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t("import.act.title")}
            <Badge variant="secondary">{activities.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              {t("import.act.empty")}
            </div>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>{t("import.act.date")}</TableHead>
                    <TableHead>{t("import.act.activity")}</TableHead>
                    <TableHead>{t("samples.farm")}</TableHead>
                    <TableHead>{t("import.act.note")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((a) => (
                    <TableRow key={a.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs whitespace-nowrap">{fmtDate(a.activityAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{a.activity.replace(/_/g, " ")}</Badge>
                          {a.note?.startsWith("[IoT auto-fired]") && (
                            <Badge className="text-[9px] bg-amber-600">{t("import.act.auto")}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{a.farmNameTh ?? a.farmId.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{a.note ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ CSV Import Tab ============
function CsvImportTab() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [filename, setFilename] = useState("import.csv");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ rowsTotal: number; rowsOk: number; rowsFailed: number; errors: { row: number; message: string }[] } | null>(null);

  async function doImport() {
    if (!csvText.trim()) {
      toast({ title: t("common.error"), description: "CSV text is empty", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/farms/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, filename }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(data);
      toast({
        title: `${t("import.csv.rowsOk")}: ${data.rowsOk}/${data.rowsTotal}`,
        description: data.rowsFailed > 0 ? `${data.rowsFailed} ${t("import.csv.rowsFailed")}` : undefined,
      });
      qc.invalidateQueries({ queryKey: ["farms"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("import.csv.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("import.csv.help")}</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Filename</Label>
            <Input value={filename} onChange={(e) => setFilename(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">CSV</Label>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={10}
              className="font-mono text-xs"
            />
          </div>
          <Button onClick={doImport} disabled={importing} className="gap-2">
            <Upload className="h-4 w-4" /> {importing ? t("common.loading") : t("import.csv.import")}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-emerald-300 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="text-base">{t("import.csv.result")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md border p-2.5">
                <div className="text-muted-foreground">{t("import.csv.rowsTotal")}</div>
                <div className="font-semibold text-lg tabular-nums">{result.rowsTotal}</div>
              </div>
              <div className="rounded-md border border-emerald-300 dark:border-emerald-700 p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30">
                <div className="text-muted-foreground">{t("import.csv.rowsOk")}</div>
                <div className="font-semibold text-lg tabular-nums text-emerald-700 dark:text-emerald-300">{result.rowsOk}</div>
              </div>
              <div className="rounded-md border p-2.5">
                <div className="text-muted-foreground">{t("import.csv.rowsFailed")}</div>
                <div className="font-semibold text-lg tabular-nums text-red-600 dark:text-red-400">{result.rowsFailed}</div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-md border bg-red-50/40 dark:bg-red-950/20 p-3">
                <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">{t("import.csv.rowsFailed")}:</div>
                <ul className="space-y-1 text-xs text-red-600 dark:text-red-400">
                  {result.errors.map((e, i) => (
                    <li key={i}>Row {e.row}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
