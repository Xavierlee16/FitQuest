import { ruleFallbackProvider } from "./ruleFallbackProvider";
import { isAiRecommendationsEnabled, serverAiProvider } from "./serverAiProvider";
import type { RecommendationInput, RecommendationProvider, RecommendationProviderResult } from "./types";
import type { TrainingRecommendation } from "../types";

function getAiRecommendationProvider(): RecommendationProvider | null {
  return isAiRecommendationsEnabled() ? serverAiProvider : null;
}

function getDefaultSuggestedAction(recommendation: TrainingRecommendation): string {
  if (recommendation.suggested_action) return recommendation.suggested_action;
  if (recommendation.steps && recommendation.steps.length > 0) return recommendation.steps[0];
  if (recommendation.workout_type) return recommendation.workout_type;
  return recommendation.recommendation;
}

function normalizeRecommendations(
  result: RecommendationProviderResult,
  fallbackReason?: string,
): RecommendationProviderResult {
  const source: TrainingRecommendation["source"] =
    result.engine === "ai" ? "AI/Gemini" : fallbackReason ? "Fallback" : "Rule engine";
  const defaultConfidence = result.engine === "ai" ? undefined : 0.72;

  return {
    ...result,
    fallbackReason,
    recommendations: result.recommendations.map((recommendation) => ({
      ...recommendation,
      source: result.engine === "ai" ? source : recommendation.source ?? source,
      confidence: recommendation.confidence ?? defaultConfidence,
      suggested_action: getDefaultSuggestedAction(recommendation),
    })),
  };
}

export async function buildTrainingRecommendations(
  input: RecommendationInput,
): Promise<RecommendationProviderResult> {
  const aiProvider = getAiRecommendationProvider();

  if (aiProvider) {
    try {
      return normalizeRecommendations(await aiProvider.generate(input));
    } catch (error) {
      console.warn("[fitquest-ai] using rule fallback", {
        reason: error instanceof Error ? error.message : "Unknown AI provider error",
      });
      const fallback = await ruleFallbackProvider.generate(input);
      return normalizeRecommendations(
        fallback,
        "AI recommendation generation failed, so FitQuest used the rule fallback.",
      );
    }
  }

  const fallback = await ruleFallbackProvider.generate(input);
  return normalizeRecommendations(
    fallback,
    "AI recommendations are not configured yet, so FitQuest used the rule fallback.",
  );
}

export type {
  RecommendationEngineName,
  RecommendationInput,
  RecommendationProvider,
  RecommendationProviderResult,
} from "./types";
