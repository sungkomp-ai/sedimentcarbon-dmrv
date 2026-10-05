import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/activities/rules?farmId=X
 * Lists all activity rules (optionally filtered by farm).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const rules = await db.activityRule.findMany({
    where: farmId ? { farmId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    rules: rules.map((r) => ({
      id: r.id,
      farmId: r.farmId,
      name: r.name,
      sensorType: r.sensorType,
      operator: r.operator,
      threshold: r.threshold,
      activity: r.activity,
      note: r.note,
      enabled: r.enabled,
      cooldownHr: r.cooldownHr,
      lastFiredAt: r.lastFiredAt,
      firedCount: r.firedCount,
      createdAt: r.createdAt,
    })),
  });
}

interface CreateRuleBody {
  farmId?: string | null;
  name: string;
  sensorType?: string | null;
  operator?: string;
  threshold?: number;
  activity: string;
  note?: string | null;
  cooldownHr?: number;
}

/**
 * POST /api/activities/rules
 * Creates a new conditional activity rule.
 *
 * Example body:
 *   {
 *     "farmId": "demo-farm-001",
 *     "name": "Low soil moisture → irrigation",
 *     "sensorType": "soil_moisture",
 *     "operator": "<",
 *     "threshold": 20,
 *     "activity": "fertiliser",
 *     "note": "Auto-irrigate when soil moisture drops below 20%",
 *     "cooldownHr": 24
 *   }
 */
export async function POST(req: Request) {
  const body = (await req.json()) as CreateRuleBody;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!body.activity?.trim()) {
    return NextResponse.json({ error: "activity is required" }, { status: 400 });
  }
  // If sensorType is provided, operator + threshold are required
  if (body.sensorType) {
    if (!body.operator || !["<", "<=", ">", ">=", "==", "="].includes(body.operator)) {
      return NextResponse.json(
        { error: "operator must be one of: <, <=, >, >=, ==" },
        { status: 400 }
      );
    }
    if (typeof body.threshold !== "number" || Number.isNaN(body.threshold)) {
      return NextResponse.json({ error: "threshold must be a number" }, { status: 400 });
    }
  }
  const rule = await db.activityRule.create({
    data: {
      farmId: body.farmId ?? null,
      name: body.name.trim(),
      sensorType: body.sensorType ?? null,
      operator: body.operator ?? ">",
      threshold: body.threshold ?? 0,
      activity: body.activity.trim(),
      note: body.note ?? null,
      cooldownHr: body.cooldownHr ?? 24,
      enabled: true,
    },
  });
  return NextResponse.json({ rule }, { status: 201 });
}
