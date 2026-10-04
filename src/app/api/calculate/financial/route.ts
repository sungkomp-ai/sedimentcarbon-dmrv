import { NextResponse } from "next/server";
import { projectCashflow, type FinanceInput } from "@/lib/core/finance";

export async function POST(req: Request) {
  const body = (await req.json()) as FinanceInput;
  if (typeof body.areaHa !== "number" || typeof body.annualCreditsTco2e !== "number") {
    return NextResponse.json(
      { error: "areaHa and annualCreditsTco2e are required numbers" },
      { status: 400 }
    );
  }
  const result = projectCashflow(body);
  return NextResponse.json({ result });
}
