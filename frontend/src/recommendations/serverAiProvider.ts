import type { TrainingRecommendation } from "../types";
import type { CoachMessage, CoachReply, RecommendationGoal, Workout } from "../types";
import type { RecommendationInput, RecommendationProvider, RecommendationProviderResult } from "./types";

type AiRecommendationResponse = {
  recommendations?: TrainingRecommendation[];
};

type CoachResponse = {
  message?: string;
  recommendation?: TrainingRecommendation;
};

const AI_TIMEOUT_MS = 8000;

export function isAiRecommendationsEnabled(): boolean {
  return import.meta.env.VITE_AI_RECOMMENDATIONS_ENABLED === "true";
}

function withTimeout(signal: AbortSignal, timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  signal.addEventListener("abort", () => controller.abort(), { once: true });
  controller.signal.addEventListener("abort", () => window.clearTimeout(timeoutId), { once: true });

  return controller.signal;
}

export const serverAiProvider: RecommendationProvider = {
  name: "ai",
  async generate(input: RecommendationInput): Promise<RecommendationProviderResult> {
    if (!isAiRecommendationsEnabled()) {
      throw new Error("AI recommendations are disabled.");
    }

    const controller = new AbortController();
    const response = await fetch("/api/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: withTimeout(controller.signal, AI_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn("[fitquest-ai] server recommendation endpoint failed", {
        status: response.status,
      });
      throw new Error("AI recommendations are unavailable.");
    }

    const data = (await response.json()) as AiRecommendationResponse;
    const recommendations = data.recommendations ?? [];

    if (recommendations.length === 0) {
      console.warn("[fitquest-ai] server recommendation endpoint returned no recommendations");
      throw new Error("AI provider returned no recommendations.");
    }

    console.info("[fitquest-ai] mapped Gemini recommendations", {
      recommendation_count: recommendations.length,
    });

    return {
      engine: "ai",
      recommendations,
    };
  },
};

export async function askCoachWithGemini(input: {
  currentRecommendation: TrainingRecommendation;
  question: string;
  conversation: CoachMessage[];
  workouts: Workout[];
  goal: RecommendationGoal;
  age: number;
}): Promise<CoachReply> {
  if (!isAiRecommendationsEnabled()) {
    throw new Error("AI coach is disabled.");
  }

  const response = await fetch("/api/recommendations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "askCoach",
      currentRecommendation: input.currentRecommendation,
      question: input.question,
      conversation: input.conversation,
      workouts: input.workouts,
      goal: input.goal,
      age: input.age,
    }),
  });

  if (!response.ok) {
    console.warn("[fitquest-ai] coach endpoint failed", { status: response.status });
    throw new Error("AI coach is unavailable.");
  }

  const data = (await response.json()) as CoachResponse;
  if (!data.message) {
    throw new Error("AI coach returned no message.");
  }

  return {
    message: data.message,
    recommendation: data.recommendation
      ? {
          ...data.recommendation,
          source: "AI/Gemini",
        }
      : undefined,
  };
}
