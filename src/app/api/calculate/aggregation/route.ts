import { NextResponse } from "next/server";
import { aggregationBenefit } from "@/lib/core/finance";

interface Body {
  farmAreasHa: number[];
  verificationCost?: number;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!Array.isArray(body.farmAreasHa)) {
    return NextResponse.json(
      { error: "farmAreasHa array is required" },
      { status: 400 }
    );
  }
  const result = aggregationBenefit(body.farmAreasHa, body.verificationCost);
  return NextResponse.json({ result });
}
