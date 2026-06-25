import {
  handleRecommendationsRequest,
  type VercelRequest,
  type VercelResponse,
} from "../frontend/api/recommendationsHandler";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleRecommendationsRequest(req, res, process.env);
}

