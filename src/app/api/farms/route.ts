import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { polygonAreaHa, isValidPolygon } from "@/lib/geo/geo";

export async function GET() {
  const farms = await db.farm.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: true,
      _count: { select: { samples: true, sediment: true } },
    },
  });

  const result = farms.map((f) => ({
    id: f.id,
    nameTh: f.nameTh,
    nameEn: f.nameEn,
    areaHa: f.areaHa,
    soilType: f.soilType,
    slopePct: f.slopePct,
    trapTypes: f.trapTypes ? JSON.parse(f.trapTypes) : [],
    projectStart: f.projectStart,
    standard: f.standard,
    creditingYears: f.creditingYears,
    groupId: f.groupId,
    owner: f.owner ? { id: f.owner.id, fullName: f.owner.fullName, email: f.owner.email } : null,
    geomGeojson: f.geomGeojson,
    sampleCount: f._count.samples,
    sedimentCount: f._count.sediment,
    createdAt: f.createdAt,
  }));

  return NextResponse.json({ farms: result });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { geomGeojson, trapTypes, projectStart, ...rest } = body;

  if (!geomGeojson || !isValidPolygon(geomGeojson)) {
    return NextResponse.json(
      { error: "Invalid GeoJSON Polygon. Must be { type: 'Polygon', coordinates: [...] }" },
      { status: 400 }
    );
  }

  const areaHa = polygonAreaHa(geomGeojson);
  const trapTypesStr = trapTypes ? JSON.stringify(trapTypes) : null;

  // Default owner: the demo aggregator if not provided
  const ownerEmail = body.ownerEmail ?? "aggregator@sedimentcarbon.demo";
  let owner = await db.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) {
    owner = await db.user.create({
      data: {
        email: ownerEmail,
        fullName: body.ownerName ?? "Field Officer",
        role: "farmer",
        locale: "th",
      },
    });
  }

  const farm = await db.farm.create({
    data: {
      ...rest,
      ownerId: owner.id,
      geomGeojson,
      areaHa,
      trapTypes: trapTypesStr,
      projectStart: projectStart ? new Date(projectStart) : null,
    },
  });

  return NextResponse.json({ farm }, { status: 201 });
}
