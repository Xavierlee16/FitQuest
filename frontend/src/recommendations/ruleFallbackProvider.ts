import { buildLocalRecommendations } from "../localFitness";
import type { RecommendationInput, RecommendationProvider, RecommendationProviderResult } from "./types";

export const ruleFallbackProvider: RecommendationProvider = {
  name: "rule-fallback",
  async generate(input: RecommendationInput): Promise<RecommendationProviderResult> {
    return {
      engine: "rule-fallback",
      recommendations: buildLocalRecommendations(input.workouts, input.goal, input.age),
    };
  },
};

