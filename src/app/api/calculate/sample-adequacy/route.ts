import { NextResponse } from "next/server";
import { uncertaintyPct, requiredSampleSize } from "@/lib/core/soc";

interface Body {
  samples: number[];
  targetPct?: number;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body.samples || !Array.isArray(body.samples)) {
    return NextResponse.json({ error: "samples array is required" }, { status: 400 });
  }
  const target = body.targetPct ?? 15.0;
  const unc = uncertaintyPct(body.samples);
  const required = requiredSampleSize(body.samples, target);
  return NextResponse.json({
    nCurrent: body.samples.length,
    uncertaintyPct: Math.round(unc * 100) / 100,
    nRequired: required,
    isAdequate: unc <= target,
  });
}
