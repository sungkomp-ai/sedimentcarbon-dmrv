import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/iot/ingest
 * Receives one or more IoT sensor readings and stores them.
 * If any reading matches an active ActivityRule, an automatic
 * management activity is logged.
 *
 * Body (single reading):
 *   {
 *     "sensorId": "soil-moisture-P01",
 *     "farmId": "demo-farm-001",          // optional
 *     "sensorType": "soil_moisture",
 *     "value": 18.5,
 *     "unit": "%",
 *     "measuredAt": "2024-12-15T10:30:00Z",
 *     "metadata": {"lat": 14.97, "lon": 102.10, "battery": 78} // optional
 *   }
 *
 * Body (batch):
 *   { "readings": [ {...}, {...} ] }
 *
 * Response:
 *   { "saved": N, "firedRules": [{ruleId, activity}] }
 */

interface IoTReadingInput {
  sensorId?: string;
  farmId?: string;
  sensorType?: string;
  value?: number;
  unit?: string;
  measuredAt?: string;
  metadata?: Record<string, unknown>;
}

interface IngestBody {
  readings?: IoTReadingInput[];
  // Allow single-reading shape too
  sensorId?: string;
  farmId?: string;
  sensorType?: string;
  value?: number;
  unit?: string;
  measuredAt?: string;
  metadata?: Record<string, unknown>;
}

function validateReading(r: IoTReadingInput): string | null {
  if (!r.sensorId) return "sensorId is required";
  if (!r.sensorType) return "sensorType is required";
  if (typeof r.value !== "number" || Number.isNaN(r.value))
    return "value must be a number";
  if (!r.unit) return "unit is required";
  return null;
}

/** Evaluate a rule against a reading value. Returns true if condition matches. */
function ruleMatches(
  operator: string,
  threshold: number,
  value: number
): boolean {
  switch (operator) {
    case "<": return value < threshold;
    case "<=": return value <= threshold;
    case ">": return value > threshold;
    case ">=": return value >= threshold;
    case "==":
    case "=": return value === threshold;
    default: return false;
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as IngestBody;

  // Normalize: accept either a single reading or a batch
  const inputReadings: IoTReadingInput[] = Array.isArray(body.readings)
    ? body.readings
    : [body];

  if (inputReadings.length === 0) {
    return NextResponse.json(
      { error: "No readings provided" },
      { status: 400 }
    );
  }

  // Validate all readings first
  const errors: { index: number; error: string }[] = [];
  for (let i = 0; i < inputReadings.length; i++) {
    const err = validateReading(inputReadings[i]);
    if (err) errors.push({ index: i, error: err });
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
  }

  // Save each reading
  const savedReadings = [];
  for (const r of inputReadings) {
    const reading = await db.ioTReading.create({
      data: {
        farmId: r.farmId ?? null,
        sensorId: r.sensorId!,
        sensorType: r.sensorType!,
        value: r.value!,
        unit: r.unit!,
        measuredAt: r.measuredAt ? new Date(r.measuredAt) : new Date(),
        metadata: r.metadata ? JSON.stringify(r.metadata) : null,
      },
    });
    savedReadings.push(reading);
  }

  // Evaluate rules: any active rule whose sensorType matches one of the
  // incoming readings, AND whose condition is true, AND whose cooldown has
  // expired, fires → log a management activity automatically.
  const sensorTypes = [...new Set(inputReadings.map((r) => r.sensorType!))];
  const activeRules = await db.activityRule.findMany({
    where: { enabled: true, sensorType: { in: sensorTypes } },
  });

  const firedRules: { ruleId: string; ruleName: string; activity: string; value: number; threshold: number; farmId: string | null }[] = [];
  const now = new Date();

  for (const rule of activeRules) {
    // Find a matching reading for this rule's sensorType
    const matchingReading = savedReadings.find(
      (r) => r.sensorType === rule.sensorType && ruleMatches(rule.operator, rule.threshold, r.value)
    );
    if (!matchingReading) continue;
    // Cooldown check
    if (rule.lastFiredAt) {
      const hoursSince = (now.getTime() - rule.lastFiredAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < rule.cooldownHr) continue;
    }
    // Fire: log activity + update rule
    await db.managementActivity.create({
      data: {
        farmId: matchingReading.farmId ?? rule.farmId ?? null,
        activityAt: now,
        activity: rule.activity,
        nRateKgHa: 0,
        note: `[IoT auto-fired] ${rule.name} — ${matchingReading.sensorType} = ${matchingReading.value}${matchingReading.unit} (${rule.operator} ${rule.threshold})`,
      },
    });
    await db.activityRule.update({
      where: { id: rule.id },
      data: {
        lastFiredAt: now,
        firedCount: { increment: 1 },
      },
    });
    firedRules.push({
      ruleId: rule.id,
      ruleName: rule.name,
      activity: rule.activity,
      value: matchingReading.value,
      threshold: rule.threshold,
      farmId: matchingReading.farmId ?? rule.farmId,
    });
  }

  return NextResponse.json({
    saved: savedReadings.length,
    firedRules,
  }, { status: 201 });
}
