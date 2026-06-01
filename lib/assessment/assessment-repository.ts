import { assessmentQuestions } from "./questions";
import type {
  AssessmentCompleteRequest,
  AssessmentCompleteResponse,
  AssessmentDraftState,
  AssessmentSaveRequest,
  AssessmentSaveResponse,
} from "./persistence-types";
import { getSupabaseEnv } from "../supabase/env";
import { createClient } from "../supabase/server";
import {
  scoreAssessment,
  type AssessmentAnswers,
  type ScorePriority,
} from "../scoring/stewardship-scoring";

const assessmentVersion = "v1";
const profileCompletionPercent = 32;
const lockedModules = [
  "Financial Analysis",
  "Opportunity Engine",
  "Professional Reports",
  "Professional Network",
];

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;
type AuthenticatedContext = {
  supabase: ServerSupabaseClient;
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
};

type AssessmentRow = {
  id: string;
  user_id: string;
  percent_complete: number;
  last_question_index: number;
  status: string;
};

type ResponseRow = {
  question_id: string;
  answer_value: string;
};

type DashboardSnapshotRow = {
  id: string;
  profile_completion_percent: number;
  stewardship_score: number;
  financial_readiness_score: number;
  legacy_impact_score: number;
  stewardship_stage: string;
  pillar_snapshot: unknown;
  top_priorities: unknown;
  next_recommended_step: unknown;
  locked_modules: unknown;
  created_at: string;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  assessment_scores?: {
    confidence_labels?: unknown;
  } | null;
};

function localDraft(message: string | null = null): AssessmentDraftState {
  return {
    mode: "local",
    assessmentId: null,
    answers: {},
    currentIndex: 0,
    message,
  };
}

function localSave(message: string): AssessmentSaveResponse {
  return {
    mode: "local",
    assessmentId: null,
    message,
  };
}

function clampQuestionIndex(index: number) {
  return Math.max(0, Math.min(assessmentQuestions.length - 1, index));
}

function getAnsweredPercent(answers: AssessmentAnswers) {
  const answeredCount = assessmentQuestions.filter((question) =>
    Boolean(answers[question.id]),
  ).length;

  return Math.round((answeredCount / assessmentQuestions.length) * 100);
}

function responsesToAnswers(responses: ResponseRow[]) {
  return responses.reduce<AssessmentAnswers>((accumulator, response) => {
    accumulator[response.question_id] = response.answer_value;
    return accumulator;
  }, {});
}

function getResumeIndex(answers: AssessmentAnswers, lastQuestionIndex: number) {
  const firstUnansweredIndex = assessmentQuestions.findIndex(
    (question) => !answers[question.id],
  );

  if (firstUnansweredIndex === -1) {
    return clampQuestionIndex(lastQuestionIndex);
  }

  return clampQuestionIndex(Math.max(firstUnansweredIndex, lastQuestionIndex));
}

function getQuestionRows(assessmentId: string, answers: AssessmentAnswers) {
  return assessmentQuestions
    .map((question, questionIndex) => {
      const answerValue = answers[question.id];

      if (!answerValue) {
        return null;
      }

      const option = question.options.find((item) => item.value === answerValue);

      if (!option) {
        return null;
      }

      return {
        assessment_id: assessmentId,
        question_id: question.id,
        question_index: questionIndex,
        pillar: question.pillar,
        answer_value: option.value,
        answer_label: option.label,
        score_value: option.score,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  if (!getSupabaseEnv()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return { supabase, user };
  } catch {
    return null;
  }
}

async function ensureProfile({ supabase, user }: AuthenticatedContext) {
  const fullName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
}

async function getOrCreateAssessment(
  context: AuthenticatedContext,
): Promise<AssessmentRow> {
  const { supabase, user } = context;

  const { data: existingAssessment, error: existingError } = await supabase
    .from("assessments")
    .select("id,user_id,percent_complete,last_question_index,status")
    .eq("user_id", user.id)
    .eq("version", assessmentVersion)
    .eq("status", "in_progress")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingAssessment) {
    return existingAssessment as AssessmentRow;
  }

  const { data: newAssessment, error: insertError } = await supabase
    .from("assessments")
    .insert({
      user_id: user.id,
      version: assessmentVersion,
      status: "in_progress",
      percent_complete: 0,
      last_question_index: 0,
    })
    .select("id,user_id,percent_complete,last_question_index,status")
    .single();

  if (insertError) {
    throw insertError;
  }

  return newAssessment as AssessmentRow;
}

async function saveDraftForAssessment(
  context: AuthenticatedContext,
  assessmentId: string,
  input: AssessmentSaveRequest,
) {
  const { supabase, user } = context;
  const responseRows = getQuestionRows(assessmentId, input.answers);
  const percentComplete = getAnsweredPercent(input.answers);

  const { error: assessmentError } = await supabase
    .from("assessments")
    .update({
      percent_complete: percentComplete,
      last_question_index: clampQuestionIndex(input.currentIndex),
      last_saved_at: new Date().toISOString(),
    })
    .eq("id", assessmentId)
    .eq("user_id", user.id)
    .eq("status", "in_progress");

  if (assessmentError) {
    throw assessmentError;
  }

  if (responseRows.length > 0) {
    const { error: responseError } = await supabase
      .from("assessment_responses")
      .upsert(responseRows, { onConflict: "assessment_id,question_id" });

    if (responseError) {
      throw responseError;
    }
  }
}

export async function getInitialAssessmentDraft(): Promise<AssessmentDraftState> {
  const context = await getAuthenticatedContext();

  if (!context) {
    return localDraft("Using local draft storage until you are signed in.");
  }

  try {
    await ensureProfile(context);
    const assessment = await getOrCreateAssessment(context);
    const { data: responses, error: responseError } = await context.supabase
      .from("assessment_responses")
      .select("question_id,answer_value")
      .eq("assessment_id", assessment.id);

    if (responseError) {
      throw responseError;
    }

    const answers = responsesToAnswers((responses ?? []) as ResponseRow[]);

    return {
      mode: "supabase",
      assessmentId: assessment.id,
      answers,
      currentIndex: getResumeIndex(answers, assessment.last_question_index),
      message: "Draft restored from your account.",
    };
  } catch {
    return localDraft(
      "Supabase draft storage is unavailable. Using local draft storage.",
    );
  }
}

export async function saveAssessmentDraft(
  input: AssessmentSaveRequest,
): Promise<AssessmentSaveResponse> {
  const context = await getAuthenticatedContext();

  if (!context) {
    return localSave("Saved locally if offline or failed");
  }

  try {
    await ensureProfile(context);
    const assessment = input.assessmentId
      ? ({ id: input.assessmentId } as AssessmentRow)
      : await getOrCreateAssessment(context);

    await saveDraftForAssessment(context, assessment.id, input);

    return {
      mode: "supabase",
      assessmentId: assessment.id,
      message: "Saved just now",
    };
  } catch {
    return localSave("Saved locally if offline or failed");
  }
}

export async function completeAssessment(
  input: AssessmentCompleteRequest,
): Promise<AssessmentCompleteResponse> {
  const context = await getAuthenticatedContext();

  if (!context) {
    return {
      ...localSave("Saved locally if offline or failed"),
      completed: false,
    };
  }

  try {
    await ensureProfile(context);
    const assessment = input.assessmentId
      ? ({ id: input.assessmentId } as AssessmentRow)
      : await getOrCreateAssessment(context);

    await saveDraftForAssessment(context, assessment.id, input);

    const scores = scoreAssessment(input.answers);
    const now = new Date().toISOString();

    const { error: assessmentError } = await context.supabase
      .from("assessments")
      .update({
        status: "completed",
        percent_complete: 100,
        last_question_index: clampQuestionIndex(input.currentIndex),
        last_saved_at: now,
        completed_at: now,
      })
      .eq("id", assessment.id)
      .eq("user_id", context.user.id);

    if (assessmentError) {
      throw assessmentError;
    }

    const { data: scoreRow, error: scoreError } = await context.supabase
      .from("assessment_scores")
      .upsert(
        {
          user_id: context.user.id,
          assessment_id: assessment.id,
          stewardship_score: scores.stewardshipScore,
          financial_readiness_score: scores.financialReadinessScore,
          legacy_impact_score: scores.legacyImpactScore,
          stewardship_stage: scores.stage,
          pillar_scores: scores.pillarScores,
          top_priorities: scores.topPriorities,
          confidence_labels: scores.confidenceLabels,
        },
        { onConflict: "assessment_id" },
      )
      .select("id")
      .single();

    if (scoreError) {
      throw scoreError;
    }

    await replaceRoadmapItems(
      context,
      assessment.id,
      scoreRow.id as string,
      scores.topPriorities,
    );

    const { error: snapshotError } = await context.supabase
      .from("dashboard_snapshots")
      .upsert(
        {
          user_id: context.user.id,
          assessment_id: assessment.id,
          assessment_score_id: scoreRow.id,
          profile_completion_percent: profileCompletionPercent,
          stewardship_score: scores.stewardshipScore,
          financial_readiness_score: scores.financialReadinessScore,
          legacy_impact_score: scores.legacyImpactScore,
          stewardship_stage: scores.stage,
          pillar_snapshot: scores.pillarScores,
          top_priorities: scores.topPriorities,
          next_recommended_step: {
            title: "Complete Financial Analysis",
            copy: "Unlock deeper insights about your finances, assets, business, and opportunities.",
            href: "/dashboard/grow",
          },
          locked_modules: lockedModules,
        },
        { onConflict: "assessment_id" },
      );

    if (snapshotError) {
      throw snapshotError;
    }

    return {
      mode: "supabase",
      assessmentId: assessment.id,
      message: "Saved just now",
      completed: true,
    };
  } catch {
    return {
      ...localSave("Saved locally if offline or failed"),
      completed: false,
    };
  }
}

async function replaceRoadmapItems(
  context: AuthenticatedContext,
  assessmentId: string,
  assessmentScoreId: string,
  priorities: ScorePriority[],
) {
  const { error: deleteError } = await context.supabase
    .from("roadmap_items")
    .delete()
    .eq("assessment_id", assessmentId)
    .eq("user_id", context.user.id);

  if (deleteError) {
    throw deleteError;
  }

  const rows = priorities.map((priority, index) => ({
    user_id: context.user.id,
    assessment_id: assessmentId,
    assessment_score_id: assessmentScoreId,
    pillar: priority.pillar,
    title: priority.title,
    description: priority.detail,
    rank: index + 1,
    status: "open",
    source: "assessment_v1",
  }));

  if (rows.length === 0) {
    return;
  }

  const { error: insertError } = await context.supabase
    .from("roadmap_items")
    .insert(rows);

  if (insertError) {
    throw insertError;
  }
}

function parseObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === "object") {
    return value as T;
  }

  return fallback;
}

function parseArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export async function getLatestDashboardSnapshot() {
  const context = await getAuthenticatedContext();

  if (!context) {
    return null;
  }

  try {
    const { data, error } = await context.supabase
      .from("dashboard_snapshots")
      .select(
        `
          id,
          profile_completion_percent,
          stewardship_score,
          financial_readiness_score,
          legacy_impact_score,
          stewardship_stage,
          pillar_snapshot,
          top_priorities,
          next_recommended_step,
          locked_modules,
          created_at,
          profiles(full_name,email),
          assessment_scores(confidence_labels)
        `,
      )
      .eq("user_id", context.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as DashboardSnapshotRow;
    const profile = row.profiles;
    const scoreRow = row.assessment_scores;
    const fallbackName = context.user.email?.split("@")[0] ?? "there";

    return {
      id: row.id,
      userName: profile?.full_name ?? profile?.email ?? fallbackName,
      profileCompletion: row.profile_completion_percent,
      scores: {
        stewardshipScore: row.stewardship_score,
        financialReadinessScore: row.financial_readiness_score,
        legacyImpactScore: row.legacy_impact_score,
        stage: row.stewardship_stage,
        pillarScores: parseObject(row.pillar_snapshot, {
          Protect: 0,
          Grow: 0,
          Transfer: 0,
          Impact: 0,
        }),
        topPriorities: parseArray<ScorePriority>(row.top_priorities, []),
        confidenceLabels: parseArray<string>(scoreRow?.confidence_labels, [
          "Initial Diagnostic",
        ]),
      },
      nextRecommendedStep: parseObject(row.next_recommended_step, {
        title: "Complete Financial Analysis",
        copy: "Unlock deeper insights about your finances, assets, business, and opportunities.",
        href: "/dashboard/grow",
      }),
      lockedModules: parseArray<string>(row.locked_modules, lockedModules),
      createdAt: row.created_at,
    };
  } catch {
    return null;
  }
}
