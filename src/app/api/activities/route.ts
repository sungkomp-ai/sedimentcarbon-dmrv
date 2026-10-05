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

interface CreateActivityBody {
  farmId?: string;
  activityAt?: string;
  activity: string;
  nRateKgHa?: number;
  note?: string;
  photoUrl?: string;
}

/**
 * POST /api/activities
 * Manually log a new management activity on a farm.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as CreateActivityBody;
  if (!body.activity?.trim()) {
    return NextResponse.json({ error: "activity is required" }, { status: 400 });
  }
  if (!body.farmId) {
    return NextResponse.json({ error: "farmId is required" }, { status: 400 });
  }
  const activity = await db.managementActivity.create({
    data: {
      farmId: body.farmId,
      activityAt: body.activityAt ? new Date(body.activityAt) : new Date(),
      activity: body.activity.trim(),
      nRateKgHa: body.nRateKgHa ?? 0,
      note: body.note ?? null,
      photoUrl: body.photoUrl ?? null,
    },
  });
  return NextResponse.json({ activity }, { status: 201 });
}
