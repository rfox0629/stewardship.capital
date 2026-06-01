import { NextResponse } from "next/server";

import { completeAssessment } from "../../../../lib/assessment/assessment-repository";
import type { AssessmentCompleteRequest } from "../../../../lib/assessment/persistence-types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const input = (await request.json()) as AssessmentCompleteRequest;
  const result = await completeAssessment(input);

  return NextResponse.json(result);
}
