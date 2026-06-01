import { scoreAssessment } from "../scoring/stewardship-scoring";

// Mock-only until assessment_responses, scores, and dashboard_snapshots are persisted.
const mockAssessmentAnswers = {
  "documents-organized": "yes",
  "family-knows-next-step": "yes",
  "estate-awareness": "not_sure",
  "coverage-review": "yes",
  "emergency-readiness": "somewhat_prepared",
  "growth-goals": "yes",
  "financial-picture": "not_sure",
  "professional-team": "yes",
  "tax-planning-awareness": "not_sure",
  "decision-rhythm": "changes",
  "values-documented": "no",
  "family-conversations": "not_sure",
  "decision-makers": "yes",
  "succession-awareness": "not_sure",
  "next-generation-readiness": "starting",
  "giving-philosophy": "yes",
  "kingdom-priorities": "yes",
  "impact-review": "annually",
  "least-clear-area": "transfer",
  "first-guidance": "transfer",
};

export const mockDashboardSnapshot = {
  userName: "Ryan",
  profileCompletion: 32,
  nextRecommendedStep: {
    title: "Complete Financial Analysis",
    copy: "Unlock deeper insights about your finances, assets, business, and opportunities.",
    href: "/dashboard/grow",
  },
  scores: scoreAssessment(mockAssessmentAnswers),
  lockedModules: [
    "Financial Analysis",
    "Opportunity Engine",
    "Professional Reports",
    "Professional Network",
  ],
};
