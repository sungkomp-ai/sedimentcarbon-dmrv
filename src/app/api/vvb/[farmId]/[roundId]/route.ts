import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ farmId: string; roundId: string }>;
}

/**
 * PATCH /api/vvb/[farmId]/[roundId]
 * Update a verification round's status, VVB info, findings, or statement.
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const { farmId, roundId } = await params;
  const body = await req.json();

  const existing = await db.verificationRound.findFirst({
    where: { id: roundId, farmId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const updated = await db.verificationRound.update({
    where: { id: roundId },
    data: {
      status: body.status ?? existing.status,
      vvbName: body.vvbName ?? existing.vvbName,
      vvbEmail: body.vvbEmail ?? existing.vvbEmail,
      submittedAt: body.submittedAt ? new Date(body.submittedAt) : existing.submittedAt,
      verifiedAt: body.verifiedAt ? new Date(body.verifiedAt) : existing.verifiedAt,
      creditsClaimed: body.creditsClaimed ?? existing.creditsClaimed,
      creditsVerified: body.creditsVerified ?? existing.creditsVerified,
      deductionsPct: body.deductionsPct ?? existing.deductionsPct,
      findings: body.findings ? JSON.stringify(body.findings) : existing.findings,
      statement: body.statement ?? existing.statement,
    },
  });

  return NextResponse.json({ round: updated });
}

/**
 * DELETE /api/vvb/[farmId]/[roundId]
 */
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { farmId, roundId } = await params;
  await db.verificationRound.deleteMany({ where: { id: roundId, farmId } });
  return NextResponse.json({ ok: true });
}
