import type { AssessmentPillar } from "../assessment/questions";
import type {
  ScorePriority,
  StewardshipStage,
} from "../scoring/stewardship-scoring";

export type DashboardSnapshotView = {
  id: string;
  userName: string;
  profileCompletion: number;
  scores: {
    stewardshipScore: number;
    financialReadinessScore: number;
    legacyImpactScore: number;
    stage: StewardshipStage;
    pillarScores: Record<AssessmentPillar, number>;
    topPriorities: ScorePriority[];
    confidenceLabels: string[];
  };
  nextRecommendedStep: {
    title: string;
    copy: string;
    href: string;
  };
  lockedModules: string[];
  createdAt: string;
};
