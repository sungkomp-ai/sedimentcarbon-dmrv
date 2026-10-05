import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { polygonAreaHa, buildPolygon, isValidPolygon } from "@/lib/geo/geo";

/**
 * POST /api/farms/import
 *
 * Accepts CSV text in the request body. Each row becomes a new Farm.
 * The endpoint also accepts JSON arrays directly.
 *
 * CSV columns (first row can be a header — auto-detected):
 *   nameTh, nameEn, areaHa, slopePct, elevationM, soilType, standard,
 *   projectStart, priorLandUse, crops (comma-separated values),
 *   trapTypes (comma-separated values), bbox_minLon, bbox_minLat,
 *   bbox_maxLon, bbox_maxLat
 *
 * Alternative JSON body:
 *   { "farms": [{ ...same fields... }] }
 *
 * Response:
 *   {
 *     "importLogId": "...",
 *     "rowsTotal": N,
 *     "rowsOk": M,
 *     "rowsFailed": K,
 *     "errors": [{ row: 2, message: "..." }]
 *   }
 */

interface ImportFarmRow {
  nameTh?: string;
  nameEn?: string | null;
  areaHa?: number;
  slopePct?: number | null;
  elevationM?: number | null;
  soilType?: string | null;
  standard?: string | null;
  projectStart?: string | null;
  priorLandUse?: string | null;
  crops?: string[];
  trapTypes?: string[];
  bbox?: [number, number, number, number];
  geomGeojson?: string;
}

interface ImportBody {
  farms?: ImportFarmRow[];
  csv?: string;
  filename?: string;
}

const VALID_STANDARDS = ["TVER", "VCS", "GOLD_STANDARD", "ISO14064"];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  // Auto-detect header
  const firstLine = lines[0];
  const hasHeader = /nameTh|nameEn|areaHa|slope/i.test(firstLine);
  const sep = firstLine.includes(",") ? "," : firstLine.includes("\t") ? "\t" : ",";
  const rows: Record<string, string>[] = [];
  let headers: string[] = [];
  if (hasHeader) {
    headers = firstLine.split(sep).map((h) => h.trim());
  } else {
    // No header — use positional default columns
    headers = [
      "nameTh", "nameEn", "areaHa", "slopePct", "elevationM",
      "soilType", "standard", "projectStart", "priorLandUse",
      "crops", "trapTypes", "bbox_minLon", "bbox_minLat",
      "bbox_maxLon", "bbox_maxLat",
    ];
  }
  const startIdx = hasHeader ? 1 : 0;
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function csvRowToImportRow(row: Record<string, string>): ImportFarmRow {
  const bboxStr = [
    row.bbox_minLon ?? row.minLon,
    row.bbox_minLat ?? row.minLat,
    row.bbox_maxLon ?? row.maxLon,
    row.bbox_maxLat ?? row.maxLat,
  ];
  const bbox: [number, number, number, number] | undefined =
    bboxStr.every((v) => v !== undefined && v !== "") && bboxStr.length === 4
      ? (bboxStr.map((v) => Number(v)) as [number, number, number, number])
      : undefined;
  return {
    nameTh: row.nameTh || undefined,
    nameEn: row.nameEn || null,
    areaHa: row.areaHa ? Number(row.areaHa) : undefined,
    slopePct: row.slopePct ? Number(row.slopePct) : null,
    elevationM: row.elevationM ? Number(row.elevationM) : null,
    soilType: row.soilType || null,
    standard: row.standard || null,
    projectStart: row.projectStart || null,
    priorLandUse: row.priorLandUse || null,
    crops: row.crops ? row.crops.split(/[|;]/).map((s) => s.trim()).filter(Boolean) : [],
    trapTypes: row.trapTypes ? row.trapTypes.split(/[|;]/).map((s) => s.trim()).filter(Boolean) : [],
    bbox,
  };
}

const DEFAULT_OWNER_EMAIL = "aggregator@sedimentcarbon.demo";

export async function POST(req: Request) {
  const body = (await req.json()) as ImportBody;

  let rows: ImportFarmRow[] = [];
  let source = "csv";
  let filename = body.filename ?? "import.csv";

  if (Array.isArray(body.farms) && body.farms.length > 0) {
    rows = body.farms;
    source = "json";
    filename = filename || "json-import.json";
  } else if (body.csv) {
    const parsed = parseCSV(body.csv);
    rows = parsed.map(csvRowToImportRow);
    source = "csv";
  } else {
    return NextResponse.json(
      { error: "Provide either 'farms' array or 'csv' text in the body" },
      { status: 400 }
    );
  }

  // Find default owner
  let owner = await db.user.findUnique({ where: { email: DEFAULT_OWNER_EMAIL } });
  if (!owner) {
    owner = await db.user.create({
      data: { email: DEFAULT_OWNER_EMAIL, fullName: "Aggregator", role: "aggregator" },
    });
  }

  const errors: { row: number; message: string }[] = [];
  let rowsOk = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      if (!r.nameTh?.trim()) {
        errors.push({ row: i + 1, message: "nameTh is required" });
        continue;
      }
      // Build GeoJSON from bbox if no geomGeojson provided
      let geom = r.geomGeojson;
      let areaHa = r.areaHa ?? 0;
      if (!geom && r.bbox) {
        const [minLon, minLat, maxLon, maxLat] = r.bbox;
        geom = JSON.stringify(buildPolygon([
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
        ]));
        if (!areaHa) areaHa = polygonAreaHa(geom);
      }
      if (!geom || !isValidPolygon(geom)) {
        errors.push({ row: i + 1, message: "Invalid geometry (provide bbox or geomGeojson)" });
        continue;
      }
      const standard = r.standard && VALID_STANDARDS.includes(r.standard.toUpperCase())
        ? r.standard.toUpperCase()
        : "TVER";
      await db.farm.create({
        data: {
          ownerId: owner.id,
          nameTh: r.nameTh.trim(),
          nameEn: r.nameEn ?? null,
          geomGeojson: geom,
          areaHa: areaHa || polygonAreaHa(geom),
          slopePct: r.slopePct ?? null,
          elevationM: r.elevationM ?? null,
          soilType: r.soilType ?? null,
          standard,
          projectStart: r.projectStart ? new Date(r.projectStart) : null,
          priorLandUse: r.priorLandUse ?? null,
          trapTypes: r.trapTypes && r.trapTypes.length > 0 ? JSON.stringify(r.trapTypes) : null,
          crops: r.crops && r.crops.length > 0 ? JSON.stringify(r.crops) : null,
          creditingYears: 10,
        },
      });
      rowsOk++;
    } catch (e) {
      errors.push({
        row: i + 1,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  const importLog = await db.importLog.create({
    data: {
      filename,
      source,
      rowsTotal: rows.length,
      rowsOk,
      rowsFailed: errors.length,
      errors: errors.length > 0 ? JSON.stringify(errors) : null,
    },
  });

  return NextResponse.json(
    {
      importLogId: importLog.id,
      rowsTotal: rows.length,
      rowsOk,
      rowsFailed: errors.length,
      errors,
    },
    { status: 201 }
  );
}
