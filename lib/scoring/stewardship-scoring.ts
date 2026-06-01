import {
  assessmentQuestions,
  type AssessmentPillar,
} from "../assessment/questions";

export type StewardshipStage =
  | "Survive"
  | "Stabilize"
  | "Build"
  | "Multiply"
  | "Legacy";

export type ScorePriority = {
  title: string;
  pillar: AssessmentPillar;
  detail: string;
};

export type StewardshipScoreResult = {
  stewardshipScore: number;
  financialReadinessScore: number;
  legacyImpactScore: number;
  stage: StewardshipStage;
  pillarScores: Record<AssessmentPillar, number>;
  topPriorities: ScorePriority[];
  confidenceLabels: string[];
};

type AssessmentAnswers = Record<string, string>;

const pillars: AssessmentPillar[] = ["Protect", "Grow", "Transfer", "Impact"];

const fallbackPriorities: Record<AssessmentPillar, ScorePriority> = {
  Protect: {
    title: "Review Protection Gaps",
    pillar: "Protect",
    detail: "A topic worth discussing with your professional team is protection readiness.",
  },
  Grow: {
    title: "Complete Financial Analysis",
    pillar: "Grow",
    detail: "Your dashboard suggests deeper analysis may clarify growth and planning opportunities.",
  },
  Transfer: {
    title: "Clarify Legacy Transfer",
    pillar: "Transfer",
    detail: "Consider reviewing values transfer and future decision-maker topics with your professional team.",
  },
  Impact: {
    title: "Define Impact Priorities",
    pillar: "Impact",
    detail: "Consider naming the Kingdom and community priorities that should guide future stewardship.",
  },
};

const questionPriorities: Record<string, ScorePriority> = {
  "estate-awareness": {
    title: "Estate Planning",
    pillar: "Protect",
    detail: "Review whether your estate documents reflect your current wishes with your professional team.",
  },
  "emergency-readiness": {
    title: "Emergency Reserves",
    pillar: "Protect",
    detail: "Clarify emergency readiness before moving into deeper planning work.",
  },
  "financial-picture": {
    title: "Organized Financial Picture",
    pillar: "Grow",
    detail: "Complete Financial Analysis to bring key stewardship areas into one view.",
  },
  "professional-team": {
    title: "Professional Team Coordination",
    pillar: "Grow",
    detail: "Identify which professional conversations would help coordinate future decisions.",
  },
  "values-documented": {
    title: "Family Legacy Plan",
    pillar: "Transfer",
    detail: "Document the values and stewardship principles you want future generations to receive.",
  },
  "family-conversations": {
    title: "Family Legacy Plan",
    pillar: "Transfer",
    detail: "Begin or continue family conversations about stewardship, legacy, and responsibility.",
  },
  "giving-philosophy": {
    title: "Giving Strategy",
    pillar: "Impact",
    detail: "Clarify the generosity principles that should shape future giving decisions.",
  },
  "kingdom-priorities": {
    title: "Kingdom Impact Priorities",
    pillar: "Impact",
    detail: "Name the Kingdom and community priorities most aligned with your stewardship calling.",
  },
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeAverage(total: number, count: number) {
  if (count === 0) {
    return 0;
  }

  const average = total / count;
  return clampScore(((average - 1) / 3) * 100);
}

function averageScores(scores: number[]) {
  if (scores.length === 0) {
    return 0;
  }

  return clampScore(scores.reduce((total, score) => total + score, 0) / scores.length);
}

export function getStewardshipStage(score: number): StewardshipStage {
  if (score >= 85) {
    return "Legacy";
  }

  if (score >= 65) {
    return "Multiply";
  }

  if (score >= 45) {
    return "Build";
  }

  if (score >= 25) {
    return "Stabilize";
  }

  return "Survive";
}

function getTopPriorities(
  answers: AssessmentAnswers,
  pillarScores: Record<AssessmentPillar, number>,
) {
  const priorities: ScorePriority[] = [];

  for (const question of assessmentQuestions) {
    const selectedValue = answers[question.id];
    const selectedOption = question.options.find(
      (option) => option.value === selectedValue,
    );
    const priority = questionPriorities[question.id];

    if (priority && selectedOption && selectedOption.score <= 2) {
      priorities.push(priority);
    }
  }

  const weakestPillars = [...pillars].sort(
    (first, second) => pillarScores[first] - pillarScores[second],
  );

  for (const pillar of weakestPillars) {
    priorities.push(fallbackPriorities[pillar]);
  }

  return priorities
    .filter(
      (priority, index, allPriorities) =>
        allPriorities.findIndex((item) => item.title === priority.title) === index,
    )
    .slice(0, 3);
}

export function scoreAssessment(
  answers: AssessmentAnswers,
): StewardshipScoreResult {
  const totals = pillars.reduce(
    (accumulator, pillar) => ({
      ...accumulator,
      [pillar]: { count: 0, total: 0 },
    }),
    {} as Record<AssessmentPillar, { count: number; total: number }>,
  );

  for (const question of assessmentQuestions) {
    const selectedValue = answers[question.id];
    const selectedOption = question.options.find(
      (option) => option.value === selectedValue,
    );

    if (!selectedOption) {
      continue;
    }

    totals[question.pillar].count += 1;
    totals[question.pillar].total += selectedOption.score;
  }

  const pillarScores = pillars.reduce(
    (accumulator, pillar) => ({
      ...accumulator,
      [pillar]: normalizeAverage(totals[pillar].total, totals[pillar].count),
    }),
    {} as Record<AssessmentPillar, number>,
  );

  const stewardshipScore = averageScores(pillars.map((pillar) => pillarScores[pillar]));
  const financialReadinessScore = averageScores([
    pillarScores.Protect,
    pillarScores.Grow,
  ]);
  const legacyImpactScore = averageScores([
    pillarScores.Transfer,
    pillarScores.Impact,
  ]);

  return {
    stewardshipScore,
    financialReadinessScore,
    legacyImpactScore,
    stage: getStewardshipStage(stewardshipScore),
    pillarScores,
    topPriorities: getTopPriorities(answers, pillarScores),
    confidenceLabels: [
      "Initial Diagnostic",
      "Needs Financial Analysis",
      "Professional Team Discussion Recommended",
    ],
  };
}
