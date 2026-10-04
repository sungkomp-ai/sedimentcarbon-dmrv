import { NextResponse } from "next/server";
import { socStock, type SoilLayer } from "@/lib/core/soc";

interface Body {
  layers: SoilLayer[];
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body.layers || !Array.isArray(body.layers) || body.layers.length === 0) {
    return NextResponse.json({ error: "layers array is required" }, { status: 400 });
  }
  for (const l of body.layers) {
    if (
      typeof l.socPct !== "number" ||
      typeof l.bulkDensity !== "number" ||
      typeof l.depthCm !== "number"
    ) {
      return NextResponse.json(
        { error: "Each layer needs socPct, bulkDensity, depthCm" },
        { status: 400 }
      );
    }
  }
  const result = socStock(body.layers);
  return NextResponse.json(result);
}
