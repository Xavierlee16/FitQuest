import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { createAiRecommendationResponse, createCoachResponse } from "./api/recommendationsCore";

function localRecommendationApi(env: Record<string, string>) {
  return {
    name: "fitquest-local-recommendation-api",
    configureServer(server: any) {
      server.middlewares.use("/api/recommendations", async (req: any, res: any) => {
        const method = (req.method ?? "").toUpperCase();
        if (method === "OPTIONS") {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Allow", "GET, POST, OPTIONS");
          res.end(JSON.stringify({ ok: true }));
          return;
        }

        if (method === "GET") {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(
            JSON.stringify({
              ok: true,
              route: "/api/recommendations",
              accepts: ["POST", "OPTIONS"],
              ai_enabled: env.AI_RECOMMENDATIONS_ENABLED === "true",
              has_gemini_key: Boolean(env.GEMINI_API_KEY),
              gemini_model: env.GEMINI_MODEL || "(default)",
            }),
          );
          return;
        }

        if (method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Allow", "GET, POST, OPTIONS");
          res.end(JSON.stringify({ error: "Method not allowed", allowed_methods: ["GET", "POST", "OPTIONS"] }));
          return;
        }

        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", async () => {
          try {
            const rawBody = Buffer.concat(chunks).toString("utf8");
            const input = rawBody ? JSON.parse(rawBody) : {};
            const result =
              input.action === "askCoach"
                ? await createCoachResponse(input, env)
                : await createAiRecommendationResponse(input, env);
            res.statusCode = result.status;
            res.setHeader("Cache-Control", "no-store");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result.body));
          } catch {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Invalid recommendation request." }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), localRecommendationApi(env)],
    server: {
      port: 5173,
    },
  };
});
