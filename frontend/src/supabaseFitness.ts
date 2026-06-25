import { supabase } from "./supabaseClient";
import {
  buildLocalStats,
  calculateLocalWorkoutXp,
  createWorkoutFromPayload,
} from "./localFitness";
import { buildTrainingRecommendations } from "./recommendations";
import type {
  CreateWorkoutPayload,
  RecommendationGoal,
  TrainingRecommendation,
  Workout,
  WorkoutStats,
} from "./types";

type WorkoutRow = {
  id: string;
  user_id: string;
  exercise_group: Workout["exercise_group"] | null;
  exercise_type: Workout["exercise_type"];
  amount: number;
  unit: string;
  duration: number | null;
  sets: number | null;
  reps: number | null;
  weight: number | null;
  weight_unit: string | null;
  rpe: number | null;
  difficulty: string;
  workout_date: string;
  xp_earned: number;
};

type UserPreferenceRow = {
  user_id: string;
  age: number | null;
  active_goal: RecommendationGoal | null;
  local_migration_completed_at: string | null;
};

type RecommendationHistoryRow = {
  id: string;
  created_at: string;
  payload: unknown;
};

function assertUserId(userId: string | number | null | undefined): string {
  if (!userId) throw new Error("You must be signed in.");
  return String(userId);
}

function rowToWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    user_id: row.user_id,
    exercise_group: row.exercise_group ?? undefined,
    exercise_type: row.exercise_type,
    amount: row.amount,
    unit: row.unit,
    duration: row.duration,
    sets: row.sets,
    reps: row.reps,
    weight: row.weight,
    weight_unit: row.weight_unit,
    rpe: row.rpe,
    difficulty: row.difficulty,
    date: row.workout_date,
    xp_earned: row.xp_earned,
  };
}

function workoutToInsert(payload: CreateWorkoutPayload, userId: string) {
  const normalized = createWorkoutFromPayload(payload, userId);
  return {
    user_id: userId,
    exercise_group: normalized.exercise_group ?? null,
    exercise_type: normalized.exercise_type,
    amount: normalized.amount,
    unit: normalized.unit,
    duration: normalized.duration,
    sets: normalized.sets ?? null,
    reps: normalized.reps ?? null,
    weight: normalized.weight ?? null,
    weight_unit: normalized.weight_unit ?? null,
    rpe: normalized.rpe ?? null,
    difficulty: normalized.difficulty,
    workout_date: normalized.date,
    xp_earned: calculateLocalWorkoutXp(payload),
  };
}

export async function getSupabaseWorkoutHistory(userId: string | number): Promise<Workout[]> {
  const user_id = assertUserId(userId);
  const { data, error } = await supabase
    .from("workouts")
    .select(
      "id,user_id,exercise_group,exercise_type,amount,unit,duration,sets,reps,weight,weight_unit,rpe,difficulty,workout_date,xp_earned",
    )
    .eq("user_id", user_id)
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => rowToWorkout(row as WorkoutRow));
}

export async function createSupabaseWorkout(
  userId: string | number,
  payload: CreateWorkoutPayload,
): Promise<Workout> {
  const user_id = assertUserId(userId);
  const { data, error } = await supabase
    .from("workouts")
    .insert(workoutToInsert(payload, user_id))
    .select(
      "id,user_id,exercise_group,exercise_type,amount,unit,duration,sets,reps,weight,weight_unit,rpe,difficulty,workout_date,xp_earned",
    )
    .single();

  if (error) throw error;
  return rowToWorkout(data as WorkoutRow);
}

export async function getSupabaseWorkoutStats(userId: string | number): Promise<WorkoutStats> {
  const workouts = await getSupabaseWorkoutHistory(userId);
  return buildLocalStats(workouts);
}

export async function getSupabaseUserPreferences(userId: string | number): Promise<UserPreferenceRow> {
  const user_id = assertUserId(userId);
  const { data, error } = await supabase
    .from("user_preferences")
    .select("user_id,age,active_goal,local_migration_completed_at")
    .eq("user_id", user_id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as UserPreferenceRow;

  const { data: inserted, error: insertError } = await supabase
    .from("user_preferences")
    .insert({ user_id, age: 25, active_goal: "general fitness" })
    .select("user_id,age,active_goal,local_migration_completed_at")
    .single();

  if (insertError) throw insertError;
  return inserted as UserPreferenceRow;
}

export async function getSupabaseProfileAge(userId: string | number): Promise<number> {
  const preferences = await getSupabaseUserPreferences(userId);
  return preferences.age && preferences.age > 0 ? preferences.age : 25;
}

export async function saveSupabaseProfileAge(userId: string | number, age: number): Promise<void> {
  const user_id = assertUserId(userId);
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id, age, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) throw error;
}

function payloadToRecommendation(payload: unknown): TrainingRecommendation | null {
  if (!payload || typeof payload !== "object") return null;
  const recommendation = payload as Partial<TrainingRecommendation>;
  if (!recommendation.title || !recommendation.recommendation || !recommendation.reason || !recommendation.exercise_type) {
    return null;
  }

  return recommendation as TrainingRecommendation;
}

async function getLatestWorkoutCreatedAt(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.created_at ?? null;
}

async function getSupabaseActiveRecommendation(userId: string): Promise<TrainingRecommendation | null> {
  const { data, error } = await supabase
    .from("recommendation_history")
    .select("id,created_at,payload")
    .eq("user_id", userId)
    .contains("payload", { is_active_plan: true })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as RecommendationHistoryRow;
  const latestWorkoutCreatedAt = await getLatestWorkoutCreatedAt(userId);
  if (latestWorkoutCreatedAt && latestWorkoutCreatedAt > row.created_at) {
    console.info("[fitquest-ai] active plan completed by newer workout", {
      active_plan_created_at: row.created_at,
      latest_workout_created_at: latestWorkoutCreatedAt,
    });
    return null;
  }

  const recommendation = payloadToRecommendation(row.payload);
  console.info("[fitquest-ai] using stored active plan", {
    found: Boolean(recommendation),
    source: recommendation?.source ?? "(missing)",
    title: recommendation?.title ?? "(missing)",
  });
  return recommendation ? { ...recommendation, is_active_plan: true } : null;
}

export async function confirmSupabaseActiveRecommendation(
  userId: string | number,
  goal: RecommendationGoal,
  recommendation: TrainingRecommendation,
): Promise<TrainingRecommendation> {
  const user_id = assertUserId(userId);
  const activeRecommendation: TrainingRecommendation = {
    ...recommendation,
    is_active_plan: true,
    source: recommendation.source ?? "AI/Gemini",
  };

  const { error } = await supabase.from("recommendation_history").insert({
    user_id,
    goal,
    category: activeRecommendation.category ?? null,
    exercise_type: activeRecommendation.exercise_type,
    title: activeRecommendation.title,
    recommendation: activeRecommendation.recommendation,
    reason: activeRecommendation.reason,
    payload: {
      ...activeRecommendation,
      is_active_plan: true,
      confirmed_at: new Date().toISOString(),
    },
  });

  if (error) throw error;
  return activeRecommendation;
}

export async function getSupabaseTrainingRecommendations(
  userId: string | number,
  goal: RecommendationGoal,
  age: number,
): Promise<TrainingRecommendation[]> {
  const user_id = assertUserId(userId);
  const activeRecommendation = await getSupabaseActiveRecommendation(user_id);
  if (activeRecommendation) {
    console.info("[fitquest-ai] recommendation generation skipped for active plan", {
      source: activeRecommendation.source ?? "(missing)",
      title: activeRecommendation.title,
    });
    return [activeRecommendation];
  }

  const workouts = await getSupabaseWorkoutHistory(user_id);
  const recommendationResult = await buildTrainingRecommendations({
    userId: user_id,
    workouts,
    goal,
    age,
    requestedAt: new Date().toISOString(),
  });
  const recommendations = recommendationResult.recommendations;

  if (recommendations.length > 0) {
    const rows = recommendations.map((recommendation) => ({
      user_id,
      goal,
      category: recommendation.category ?? null,
      exercise_type: recommendation.exercise_type,
      title: recommendation.title,
      recommendation: recommendation.recommendation,
      reason: recommendation.reason,
      payload: {
        ...recommendation,
        recommendation_engine: recommendationResult.engine,
        fallback_reason: recommendationResult.fallbackReason ?? null,
      },
    }));

    await supabase.from("recommendation_history").insert(rows);
  }

  return recommendations;
}
