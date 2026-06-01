import type { AssessmentAnswers } from "../scoring/stewardship-scoring";

export type AssessmentPersistenceMode = "supabase" | "local";

export type AssessmentDraftState = {
  mode: AssessmentPersistenceMode;
  assessmentId: string | null;
  answers: AssessmentAnswers;
  currentIndex: number;
  message: string | null;
};

export type AssessmentSaveRequest = {
  assessmentId: string | null;
  answers: AssessmentAnswers;
  currentIndex: number;
};

export type AssessmentCompleteRequest = {
  assessmentId: string | null;
  answers: AssessmentAnswers;
  currentIndex: number;
};

export type AssessmentSaveResponse = {
  mode: AssessmentPersistenceMode;
  assessmentId: string | null;
  message: string | null;
};

export type AssessmentCompleteResponse = AssessmentSaveResponse & {
  completed: boolean;
};
