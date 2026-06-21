import { supabase } from "./supabaseClient";
import {
  LEGACY_LOCAL_WORKOUTS_KEY,
  LEGACY_PROFILE_AGE_KEY,
  calculateLocalWorkoutXp,
  getExerciseGroup,
} from "./localFitness";
import type { Workout } from "./types";

function readJson<T>(key: string): T | null {
  const saved = localStorage.getItem(key);
  if (!saved) return null;

  try {
    return JSON.parse(saved) as T;
  } catch {
    return null;
  }
}

function getLegacyKeys(baseKey: string, userId: string) {
  return [`${baseKey}.${userId}`, baseKey];
}

function legacyWorkoutToInsert(workout: Workout, userId: string) {
  const exercise_group = workout.exercise_group ?? getExerciseGroup(workout);
  return {
    user_id: userId,
    local_legacy_id: String(workout.id),
    exercise_group,
    exercise_type: workout.exercise_type,
    amount: workout.amount,
    unit: workout.unit,
    duration: workout.exercise_type === "walking" ? null : workout.duration,
    sets: workout.sets ?? null,
    reps: workout.reps ?? null,
    weight: workout.weight ?? null,
    weight_unit: workout.weight_unit ?? null,
    rpe: workout.exercise_type === "walking" ? null : workout.rpe ?? null,
    difficulty: workout.difficulty ?? "normal",
    workout_date: workout.date,
    xp_earned: workout.xp_earned || calculateLocalWorkoutXp({
      exercise_group,
      exercise_type: workout.exercise_type,
      amount: workout.amount,
      unit: workout.unit,
      duration: workout.duration,
      sets: workout.sets,
      reps: workout.reps,
      weight: workout.weight,
      weight_unit: workout.weight_unit,
      rpe: workout.rpe,
    }),
  };
}

export async function migrateLegacyLocalFitnessData(userId: string | number): Promise<void> {
  const user_id = String(userId);
  const { data: preferences, error: preferencesError } = await supabase
    .from("user_preferences")
    .select("local_migration_completed_at")
    .eq("user_id", user_id)
    .maybeSingle();

  if (preferencesError) throw preferencesError;
  if (preferences?.local_migration_completed_at) return;

  const workoutKeys = getLegacyKeys(LEGACY_LOCAL_WORKOUTS_KEY, user_id);
  const legacyWorkouts = workoutKeys.flatMap((key) => readJson<Workout[]>(key) ?? []);
  const uniqueWorkouts = Array.from(
    new Map(legacyWorkouts.map((workout) => [String(workout.id), workout])).values(),
  );

  if (uniqueWorkouts.length > 0) {
    const { error } = await supabase
      .from("workouts")
      .upsert(uniqueWorkouts.map((workout) => legacyWorkoutToInsert(workout, user_id)), {
        onConflict: "user_id,local_legacy_id",
      });

    if (error) throw error;
  }

  const ageKeys = getLegacyKeys(LEGACY_PROFILE_AGE_KEY, user_id);
  const migratedAge = ageKeys
    .map((key) => Number(localStorage.getItem(key)))
    .find((age) => Number.isFinite(age) && age > 0);

  const { error: migrationError } = await supabase.from("user_preferences").upsert(
    {
      user_id,
      age: migratedAge ?? 25,
      local_migration_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (migrationError) throw migrationError;

  for (const key of [...workoutKeys, ...ageKeys, "fitquest.recommendationHistory"]) {
    localStorage.removeItem(key);
  }
}
