import type { RecommendationGoal, TrainingRecommendation, Workout } from "../types";

export type RecommendationEngineName = "ai" | "rule-fallback";

export type RecommendationInput = {
  userId: string | number;
  workouts: Workout[];
  goal: RecommendationGoal;
  age: number;
  requestedAt?: string;
};

export type RecommendationProviderResult = {
  engine: RecommendationEngineName;
  recommendations: TrainingRecommendation[];
  fallbackReason?: string;
};

export type RecommendationProvider = {
  name: RecommendationEngineName;
  generate(input: RecommendationInput): Promise<RecommendationProviderResult>;
};

