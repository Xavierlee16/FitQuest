import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getSupabaseGameSummary } from "../supabaseGame";
import type { GameSummary } from "../types";

export function useGame(refreshKey = 0) {
  const [game, setGame] = useState<GameSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) throw error;
        if (!data.user) throw new Error("Login required.");
        return getSupabaseGameSummary(data.user.id);
      })
      .then(setGame)
      .catch((gameError) => {
        setGame(null);
        setError(gameError instanceof Error ? gameError.message : "Could not load game progress.");
      })
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return { game, loading, error };
}
