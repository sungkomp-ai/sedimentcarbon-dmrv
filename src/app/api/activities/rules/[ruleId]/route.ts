import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ ruleId: string }>;
}

/**
 * PATCH /api/activities/rules/[ruleId]
 * Update a rule (e.g., toggle enabled, change threshold).
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const { ruleId } = await params;
  const body = await req.json();
  const existing = await db.activityRule.findUnique({ where: { id: ruleId } });
  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }
  const updated = await db.activityRule.update({
    where: { id: ruleId },
    data: {
      enabled: body.enabled ?? existing.enabled,
      threshold: body.threshold ?? existing.threshold,
      operator: body.operator ?? existing.operator,
      cooldownHr: body.cooldownHr ?? existing.cooldownHr,
      note: body.note ?? existing.note,
    },
  });
  return NextResponse.json({ rule: updated });
}

/**
 * DELETE /api/activities/rules/[ruleId]
 */
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { ruleId } = await params;
  await db.activityRule.deleteMany({ where: { id: ruleId } });
  return NextResponse.json({ ok: true });
}
