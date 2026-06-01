import { NextResponse } from "next/server";

import {
  getInitialAssessmentDraft,
  saveAssessmentDraft,
} from "../../../../lib/assessment/assessment-repository";
import type { AssessmentSaveRequest } from "../../../../lib/assessment/persistence-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const draft = await getInitialAssessmentDraft();

  return NextResponse.json(draft);
}

export async function POST(request: Request) {
  const input = (await request.json()) as AssessmentSaveRequest;
  const result = await saveAssessmentDraft(input);

  return NextResponse.json(result);
}
