import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const farmId = searchParams.get("farmId");
  const activities = await db.managementActivity.findMany({
    where: farmId ? { farmId } : undefined,
    orderBy: { activityAt: "desc" },
    include: { farm: true },
    take: 100,
  });
  const result = activities.map((a) => ({
    id: a.id,
    farmId: a.farmId,
    farmNameTh: a.farm?.nameTh ?? null,
    activityAt: a.activityAt,
    activity: a.activity,
    nRateKgHa: a.nRateKgHa,
    note: a.note,
    photoUrl: a.photoUrl,
  }));
  return NextResponse.json({ activities: result });
}
