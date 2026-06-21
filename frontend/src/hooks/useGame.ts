import { useEffect, useState } from "react";
import { getGameSummary } from "../api";
import { buildLocalGameSummary, getLocalWorkouts } from "../localFitness";
import type { GameSummary } from "../types";

export function useGame(refreshKey = 0) {
  const [game, setGame] = useState<GameSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    getGameSummary()
      .then(setGame)
      .catch(() => {
        setGame(buildLocalGameSummary(getLocalWorkouts()));
        setError("");
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return { game, loading, error };
}
