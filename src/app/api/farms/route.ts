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
    elevationM: f.elevationM,
    trapTypes: f.trapTypes ? JSON.parse(f.trapTypes) : [],
    crops: f.crops ? JSON.parse(f.crops) : [],
    plotDesign: f.plotDesign ? JSON.parse(f.plotDesign) : null,
    priorLandUse: f.priorLandUse,
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
  const {
    geomGeojson,
    trapTypes,
    crops,
    plotDesign,
    elevationM,
    priorLandUse,
    projectStart,
    ownerEmail,
    ownerName,
    ...rest
  } = body;

  if (!geomGeojson || !isValidPolygon(geomGeojson)) {
    return NextResponse.json(
      { error: "Invalid GeoJSON Polygon. Must be { type: 'Polygon', coordinates: [...] }" },
      { status: 400 }
    );
  }

  const areaHa = polygonAreaHa(geomGeojson);
  const trapTypesStr = trapTypes ? JSON.stringify(trapTypes) : null;
  const cropsStr = crops ? JSON.stringify(crops) : null;
  const plotDesignStr = plotDesign ? JSON.stringify(plotDesign) : null;

  // Default owner: the demo aggregator if not provided
  const email = ownerEmail ?? "aggregator@sedimentcarbon.demo";
  let owner = await db.user.findUnique({ where: { email } });
  if (!owner) {
    owner = await db.user.create({
      data: {
        email,
        fullName: ownerName ?? "Field Officer",
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
      elevationM: elevationM ?? null,
      priorLandUse: priorLandUse ?? null,
      trapTypes: trapTypesStr,
      crops: cropsStr,
      plotDesign: plotDesignStr,
      projectStart: projectStart ? new Date(projectStart) : null,
    },
  });

  return NextResponse.json({ farm }, { status: 201 });
}
