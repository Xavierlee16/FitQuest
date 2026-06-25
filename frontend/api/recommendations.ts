import {
  createAiRecommendationResponse,
  createCoachResponse,
  type CoachRequest,
  type RecommendationRequest,
} from "./recommendationsCore";

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};

function getRuntimeEnv(): Record<string, string | undefined> {
  const runtime = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
  };
  return runtime.process?.env ?? {};
}

function getBody(req: VercelRequest): RecommendationRequest & { action?: string } {
  if (typeof req.body === "string") return JSON.parse(req.body) as RecommendationRequest & { action?: string };
  return (req.body ?? {}) as RecommendationRequest & { action?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const env = getRuntimeEnv();
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Allow", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const method = (req.method ?? "").toUpperCase();
  console.info("[fitquest-ai] /api/recommendations invoked", {
    method: method || "(missing)",
    has_ai_enabled_flag: typeof env.AI_RECOMMENDATIONS_ENABLED === "string",
    ai_enabled: env.AI_RECOMMENDATIONS_ENABLED === "true",
    has_gemini_key: Boolean(env.GEMINI_API_KEY),
    gemini_model: env.GEMINI_MODEL || "(default)",
  });

  if (method === "OPTIONS") {
    return res.status(200).json({ ok: true });
  }

  if (method === "GET") {
    return res.status(200).json({
      ok: true,
      route: "/api/recommendations",
      accepts: ["POST", "OPTIONS"],
      ai_enabled: env.AI_RECOMMENDATIONS_ENABLED === "true",
      has_gemini_key: Boolean(env.GEMINI_API_KEY),
      gemini_model: env.GEMINI_MODEL || "(default)",
    });
  }

  if (method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", allowed_methods: ["GET", "POST", "OPTIONS"] });
  }

  const body = getBody(req);
  const result =
    body.action === "askCoach"
      ? await createCoachResponse(body as CoachRequest, env)
      : await createAiRecommendationResponse(body, env);
  return res.status(result.status).json(result.body);
}
