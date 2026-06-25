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

function getBody(req: VercelRequest): RecommendationRequest & { action?: string } {
  if (typeof req.body === "string") return JSON.parse(req.body) as RecommendationRequest & { action?: string };
  return (req.body ?? {}) as RecommendationRequest & { action?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  console.info("[fitquest-ai] /api/recommendations invoked", {
    method: req.method,
    has_ai_enabled_flag: typeof process.env.AI_RECOMMENDATIONS_ENABLED === "string",
    ai_enabled: process.env.AI_RECOMMENDATIONS_ENABLED === "true",
    has_gemini_key: Boolean(process.env.GEMINI_API_KEY),
    gemini_model: process.env.GEMINI_MODEL || "(default)",
  });

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = getBody(req);
  const result =
    body.action === "askCoach"
      ? await createCoachResponse(body as CoachRequest, process.env)
      : await createAiRecommendationResponse(body, process.env);
  return res.status(result.status).json(result.body);
}
