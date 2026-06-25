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
let hasLoggedClientAiConfig = false;

function logClientAiConfig(context: string) {
  const enabled = import.meta.env.VITE_AI_RECOMMENDATIONS_ENABLED === "true";
  console.info("[fitquest-ai] client AI flag", {
    context,
    VITE_AI_RECOMMENDATIONS_ENABLED: import.meta.env.VITE_AI_RECOMMENDATIONS_ENABLED ?? "(missing)",
    enabled,
  });
  return enabled;
}

export function logBuiltAiConfig(context = "manual") {
  if (hasLoggedClientAiConfig) return;
  hasLoggedClientAiConfig = true;
  logClientAiConfig(context);
}

export function isAiRecommendationsEnabled(): boolean {
  const enabled = logClientAiConfig("provider-check");
  return enabled;
}

function withTimeout(signal: AbortSignal, timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  signal.addEventListener("abort", () => controller.abort(), { once: true });
  controller.signal.addEventListener("abort", () => globalThis.clearTimeout(timeoutId), { once: true });

  return controller.signal;
}

export const serverAiProvider: RecommendationProvider = {
  name: "ai",
  async generate(input: RecommendationInput): Promise<RecommendationProviderResult> {
    if (!isAiRecommendationsEnabled()) {
      throw new Error("AI recommendations are disabled.");
    }

    const controller = new AbortController();
    console.info("[fitquest-ai] calling server recommendation endpoint", {
      url: "/api/recommendations",
      goal: input.goal,
      workout_count: input.workouts.length,
    });

    const response = await fetch("/api/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: withTimeout(controller.signal, AI_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn("[fitquest-ai] server recommendation endpoint failed", {
        status: response.status,
        detail: errorText.slice(0, 180),
      });
      throw new Error(`AI endpoint failed with status ${response.status}: ${errorText.slice(0, 140)}`);
    }

    const data = (await response.json()) as AiRecommendationResponse;
    const recommendations = data.recommendations ?? [];

    if (recommendations.length === 0) {
      console.warn("[fitquest-ai] server recommendation endpoint returned no recommendations");
      throw new Error("AI provider returned no recommendations.");
    }

    console.info("[fitquest-ai] mapped Gemini recommendations", {
      recommendation_count: recommendations.length,
      first_source: recommendations[0]?.source ?? "(missing)",
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
