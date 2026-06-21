import { supabase } from "./supabaseClient";
import { buildLocalGameSummary } from "./localFitness";
import { getSupabaseWorkoutHistory } from "./supabaseFitness";
import type { GameSummary } from "./types";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getSupabaseGameSummary(userId: string | number): Promise<GameSummary> {
  const user_id = String(userId);
  const workouts = await getSupabaseWorkoutHistory(user_id);
  const summary = buildLocalGameSummary(workouts);
  const today = todayIsoDate();

  const unlockedAchievements = summary.achievements.filter((achievement) => achievement.is_unlocked);
  if (unlockedAchievements.length > 0) {
    const { error } = await supabase.from("user_achievements").upsert(
      unlockedAchievements.map((achievement) => ({
        user_id,
        achievement_code: achievement.code,
        unlocked_at: achievement.unlocked_at ?? today,
      })),
      { onConflict: "user_id,achievement_code" },
    );
    if (error) throw error;
  }

  const earnedBadges = summary.badges.filter((badge) => badge.is_earned);
  if (earnedBadges.length > 0) {
    const { error } = await supabase.from("user_badges").upsert(
      earnedBadges.map((badge) => ({
        user_id,
        badge_code: badge.code,
        earned_at: badge.earned_at ?? today,
      })),
      { onConflict: "user_id,badge_code" },
    );
    if (error) throw error;
  }

  const { error: questError } = await supabase.from("user_daily_quests").upsert(
    summary.daily_quests.map((quest) => ({
      user_id,
      quest_code: quest.code,
      quest_date: today,
      progress_amount: quest.progress_amount,
      is_completed: quest.is_completed,
      completed_at: quest.completed_at,
    })),
    { onConflict: "user_id,quest_code,quest_date" },
  );
  if (questError) throw questError;

  return summary;
}
