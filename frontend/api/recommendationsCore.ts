type WorkoutInput = {
  exercise_group?: string;
  exercise_type?: string;
  amount?: number;
  unit?: string;
  duration?: number | null;
  rpe?: number | null;
  date?: string;
  xp_earned?: number;
};

export type RecommendationRequest = {
  workouts?: WorkoutInput[];
  goal?: string;
  age?: number;
};

export type CoachRequest = RecommendationRequest & {
  currentRecommendation?: unknown;
  question?: string;
  conversation?: Array<{ role?: string; content?: string }>;
};

type RecommendationResponse = {
  status: number;
  body: unknown;
};

type RecommendationEnv = {
  AI_RECOMMENDATIONS_ENABLED?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
};

type SafeLogger = {
  info(message?: unknown, ...optionalParams: unknown[]): void;
  warn(message?: unknown, ...optionalParams: unknown[]): void;
};

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.1-flash-lite";

function buildPrompt(input: RecommendationRequest): string {
  const recentWorkouts = (input.workouts ?? []).slice(0, 12).map((workout) => ({
    exercise_group: workout.exercise_group,
    exercise_type: workout.exercise_type,
    amount: workout.amount,
    unit: workout.unit,
    duration: workout.duration,
    rpe: workout.rpe,
    date: workout.date,
    xp_earned: workout.xp_earned,
  }));

  return [
    "You are FitQuest's training recommendation engine.",
    "Return JSON only. Do not include markdown.",
    "Give general wellness and fitness guidance only. Do not make medical claims.",
    "Create 1 to 3 non-conflicting recommendations that support one coherent training direction for today.",
    "Use this exact JSON shape: {\"recommendations\":[{\"goal\":\"general fitness\",\"category\":\"Coach Summary\",\"exercise_type\":\"running\",\"source\":\"AI\",\"confidence\":0.82,\"workout_type\":\"Easy aerobic run\",\"intensity\":\"easy\",\"target_pace_range\":\"Conversational pace\",\"target_heart_rate_range\":\"Zone 2\",\"suggested_duration\":\"30:00-40:00\",\"target\":\"Aerobic base\",\"suggested_action\":\"Start with 30:00 easy movement.\",\"title\":\"Easy aerobic day\",\"recommendation\":\"...\",\"reason\":\"...\",\"steps\":[\"...\"],\"influenced_by\":[\"...\"]}]}",
    `User goal: ${input.goal ?? "general fitness"}`,
    `User age: ${input.age ?? 25}`,
    `Recent workouts: ${JSON.stringify(recentWorkouts)}`,
  ].join("\n");
}

function buildCoachPrompt(input: CoachRequest): string {
  const recentWorkouts = (input.workouts ?? []).slice(0, 12).map((workout) => ({
    exercise_group: workout.exercise_group,
    exercise_type: workout.exercise_type,
    amount: workout.amount,
    unit: workout.unit,
    duration: workout.duration,
    rpe: workout.rpe,
    date: workout.date,
    xp_earned: workout.xp_earned,
  }));

  const conversation = (input.conversation ?? []).slice(-8).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  return [
    "You are FitQuest's training coach.",
    "Return JSON only. Do not include markdown.",
    "Give general wellness and fitness guidance only. Do not make medical claims.",
    "Answer the user's follow-up question about the current recommendation.",
    "If the plan should change, include one updated recommendation. If not, omit recommendation.",
    "Use this exact JSON shape: {\"message\":\"Short helpful coach answer.\",\"recommendation\":{\"goal\":\"general fitness\",\"category\":\"Coach Summary\",\"exercise_type\":\"running\",\"source\":\"AI/Gemini\",\"confidence\":0.82,\"workout_type\":\"Easy aerobic run\",\"intensity\":\"easy\",\"target_pace_range\":\"Conversational pace\",\"target_heart_rate_range\":\"Zone 2\",\"suggested_duration\":\"30:00-40:00\",\"target\":\"Aerobic base\",\"suggested_action\":\"Start with 30:00 easy movement.\",\"title\":\"Easy aerobic day\",\"recommendation\":\"...\",\"reason\":\"...\",\"steps\":[\"...\"],\"influenced_by\":[\"...\"]}}",
    `User goal: ${input.goal ?? "general fitness"}`,
    `User age: ${input.age ?? 25}`,
    `Current recommendation: ${JSON.stringify(input.currentRecommendation ?? {})}`,
    `Conversation: ${JSON.stringify(conversation)}`,
    `User question: ${input.question ?? ""}`,
    `Recent workouts: ${JSON.stringify(recentWorkouts)}`,
  ].join("\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model response.");
  return JSON.parse(match[0]);
}

export async function createAiRecommendationResponse(
  input: RecommendationRequest,
  env: RecommendationEnv,
  logger: SafeLogger = console,
): Promise<RecommendationResponse> {
  if (env.AI_RECOMMENDATIONS_ENABLED !== "true") {
    logger.info("[fitquest-ai] disabled by AI_RECOMMENDATIONS_ENABLED");
    return { status: 503, body: { error: "AI recommendations are not enabled." } };
  }

  if (!env.GEMINI_API_KEY) {
    logger.warn("[fitquest-ai] missing GEMINI_API_KEY");
    return { status: 503, body: { error: "AI provider is not configured." } };
  }

  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  logger.info("[fitquest-ai] requesting Gemini recommendation", {
    model,
    goal: input.goal ?? "general fitness",
    workout_count: input.workouts?.length ?? 0,
  });

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(input) }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const providerError = await response.text();
      logger.warn("[fitquest-ai] Gemini request failed", {
        model,
        status: response.status,
        detail: providerError.slice(0, 160),
      });
      return { status: 502, body: { error: "AI provider request failed." } };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      logger.warn("[fitquest-ai] Gemini response did not include text", { model });
      return { status: 502, body: { error: "AI provider returned an invalid response." } };
    }

    logger.info("[fitquest-ai] Gemini recommendation generated", { model });
    return { status: 200, body: extractJson(text) };
  } catch (error) {
    logger.warn("[fitquest-ai] recommendation generation crashed", {
      model,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return { status: 500, body: { error: "Could not generate AI recommendations." } };
  }
}

export async function createCoachResponse(
  input: CoachRequest,
  env: RecommendationEnv,
  logger: SafeLogger = console,
): Promise<RecommendationResponse> {
  if (env.AI_RECOMMENDATIONS_ENABLED !== "true") {
    logger.info("[fitquest-ai] coach disabled by AI_RECOMMENDATIONS_ENABLED");
    return { status: 503, body: { error: "AI coach is not enabled." } };
  }

  if (!env.GEMINI_API_KEY) {
    logger.warn("[fitquest-ai] missing GEMINI_API_KEY for coach");
    return { status: 503, body: { error: "AI coach is not configured." } };
  }

  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  logger.info("[fitquest-ai] requesting Gemini coach reply", {
    model,
    goal: input.goal ?? "general fitness",
    workout_count: input.workouts?.length ?? 0,
  });

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildCoachPrompt(input) }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const providerError = await response.text();
      logger.warn("[fitquest-ai] Gemini coach request failed", {
        model,
        status: response.status,
        detail: providerError.slice(0, 160),
      });
      return { status: 502, body: { error: "AI coach request failed." } };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      logger.warn("[fitquest-ai] Gemini coach response did not include text", { model });
      return { status: 502, body: { error: "AI coach returned an invalid response." } };
    }

    logger.info("[fitquest-ai] Gemini coach reply generated", { model });
    return { status: 200, body: extractJson(text) };
  } catch (error) {
    logger.warn("[fitquest-ai] coach generation crashed", {
      model,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return { status: 500, body: { error: "Could not ask the AI coach." } };
  }
}
