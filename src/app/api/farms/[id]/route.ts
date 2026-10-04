import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const farm = await db.farm.findUnique({
    where: { id },
    include: {
      owner: true,
      plots: true,
      _count: { select: { samples: true, sediment: true, activities: true } },
    },
  });
  if (!farm) {
    return NextResponse.json({ error: "Farm not found" }, { status: 404 });
  }
  return NextResponse.json({
    farm: {
      ...farm,
      trapTypes: farm.trapTypes ? JSON.parse(farm.trapTypes) : [],
      geomGeojson: farm.geomGeojson,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.farm.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
