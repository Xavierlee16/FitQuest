import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { createAiRecommendationResponse, createCoachResponse } from "./api/recommendationsCore";

function localRecommendationApi(env: Record<string, string>) {
  return {
    name: "fitquest-local-recommendation-api",
    configureServer(server: any) {
      server.middlewares.use("/api/recommendations", async (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
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
