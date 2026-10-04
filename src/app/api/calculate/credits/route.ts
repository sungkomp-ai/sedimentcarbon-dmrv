import { NextResponse } from "next/server";
import { computeCredits, compareAllStandards, type CreditInput } from "@/lib/core/credits";

export async function POST(req: Request) {
  const body = (await req.json()) as CreditInput;
  if (
    typeof body.socBaselineTHa !== "number" ||
    typeof body.socCurrentTHa !== "number" ||
    typeof body.years !== "number" ||
    typeof body.areaHa !== "number"
  ) {
    return NextResponse.json(
      { error: "socBaselineTHa, socCurrentTHa, years, areaHa are required numbers" },
      { status: 400 }
    );
  }

  try {
    if (body.standard) {
      const result = computeCredits(body);
      return NextResponse.json({ result });
    }
    const results = compareAllStandards(body);
    return NextResponse.json({ comparison: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calculation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
