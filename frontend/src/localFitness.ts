import type {
  CreateWorkoutPayload,
  ExerciseGroup,
  ExerciseType,
  GameSummary,
  TrainingRecommendation,
  Workout,
  WorkoutStats,
} from "./types";

const LOCAL_WORKOUTS_KEY = "fitquest.localWorkouts";
const PROFILE_AGE_KEY = "fitquest.profileAge";

const CALISTHENICS_EXERCISES = new Set<string>([
  "pushup",
  "pullup",
  "situp",
  "dip",
  "bodyweight_squat",
  "lunge",
  "plank",
  "burpee",
]);

const GYM_EXERCISES = new Set<string>([
  "bench_press",
  "back_squat",
  "deadlift",
  "shoulder_press",
  "barbell_row",
  "lat_pulldown",
  "leg_press",
  "chest_press_machine",
  "cable_row",
]);

const ENDURANCE_EXERCISES = new Set<string>(["running", "cycling", "swimming"]);
const STRENGTH_EXERCISES = new Set<string>([
  ...Array.from(CALISTHENICS_EXERCISES),
  ...Array.from(GYM_EXERCISES),
]);

const PUSHUP_MILESTONES = [100, 250, 500, 1000, 2500, 5000];
export const WORKOUT_COUNT_MILESTONES = [1, 5, 10, 20, 50, 100, 200, 500, 1000];
const CALISTHENICS_MILESTONES = [250, 500, 1000, 2500, 5000, 10000];
const GYM_MILESTONES = [100, 250, 500, 1000, 2500, 5000];
const RUNNING_MILESTONES = [10, 25, 50, 100, 250, 500];
const CYCLING_MILESTONES = [25, 50, 100, 250, 500, 1000];
const SWIMMING_MILESTONES = [1, 5, 10, 25, 50, 100];

export const LEGACY_LOCAL_WORKOUTS_KEY = LOCAL_WORKOUTS_KEY;
export const LEGACY_PROFILE_AGE_KEY = PROFILE_AGE_KEY;

export function getExerciseGroup(workout: Pick<Workout, "exercise_type" | "exercise_group">): ExerciseGroup {
  if (workout.exercise_group) return workout.exercise_group;
  if (CALISTHENICS_EXERCISES.has(workout.exercise_type)) return "calisthenics";
  if (GYM_EXERCISES.has(workout.exercise_type)) return "gym";
  return "cardio";
}

export function calculateLocalWorkoutXp(payload: CreateWorkoutPayload): number {
  if (payload.exercise_type === "running") return Math.round(payload.amount * 50);
  if (payload.exercise_type === "swimming") return Math.round(payload.amount * 80);
  if (payload.exercise_type === "cycling") return Math.round(payload.amount * 25);
  if (payload.exercise_type === "walking") return Math.round((payload.amount / 1000) * 20);
  if (payload.exercise_type === "pullup") return Math.round(payload.amount * 5);

  if (payload.exercise_group === "gym") {
    const loadBonus = (payload.weight ?? 0) * 0.2 * (payload.sets ?? 1);
    return Math.max(1, Math.round(payload.amount + loadBonus));
  }

  return Math.round(payload.amount);
}

export function createWorkoutFromPayload(
  payload: CreateWorkoutPayload,
  userId: string | number,
  id: string | number = crypto.randomUUID(),
  workoutDate = new Date().toISOString().slice(0, 10),
): Workout {
  const isWalking = payload.exercise_type === "walking";
  return {
    id,
    user_id: userId,
    exercise_group: payload.exercise_group,
    exercise_type: payload.exercise_type,
    amount: payload.amount,
    unit: payload.unit,
    duration: isWalking ? null : payload.duration ?? null,
    sets: payload.sets ?? null,
    reps: payload.reps ?? null,
    weight: payload.weight ?? null,
    weight_unit: payload.weight_unit ?? null,
    rpe: isWalking ? null : payload.rpe ?? null,
    difficulty: "normal",
    date: workoutDate,
    xp_earned: calculateLocalWorkoutXp(payload),
  };
}

export function buildLocalStats(workouts: Workout[]): WorkoutStats {
  const totalXp = workouts.reduce((sum, workout) => sum + workout.xp_earned, 0);
  const workoutsByExercise = workouts.reduce<Record<string, number>>((counts, workout) => {
    counts[workout.exercise_type] = (counts[workout.exercise_type] ?? 0) + 1;
    return counts;
  }, {});

  return {
    total_workouts: workouts.length,
    total_xp: totalXp,
    level: calculateLocalLevelProgress(totalXp).level,
    streak: calculateLocalStreak(workouts),
    workouts_by_exercise: workoutsByExercise,
  };
}

function calculateLocalStreak(workouts: Workout[]): number {
  const workoutDates = Array.from(new Set(workouts.map((workout) => workout.date))).sort().reverse();
  if (workoutDates.length === 0) return 0;

  let streak = 0;
  const expectedDate = new Date();

  for (const workoutDate of workoutDates) {
    const expected = expectedDate.toISOString().slice(0, 10);
    if (workoutDate !== expected) break;
    streak += 1;
    expectedDate.setDate(expectedDate.getDate() - 1);
  }

  return streak;
}

function xpRequiredForLevel(level: number): number {
  return level * 100;
}

export function calculateLocalLevelProgress(totalXp: number) {
  let level = 1;
  let remainingXp = totalXp;

  while (remainingXp >= xpRequiredForLevel(level)) {
    remainingXp -= xpRequiredForLevel(level);
    level += 1;
  }

  return {
    level,
    current_xp: remainingXp,
    needed_xp: xpRequiredForLevel(level),
  };
}

function getExerciseTotal(workouts: Workout[], exerciseType: string): number {
  return workouts
    .filter((workout) => workout.exercise_type === exerciseType)
    .reduce((sum, workout) => sum + workout.amount, 0);
}

function getGroupTotal(workouts: Workout[], group: ExerciseGroup): number {
  return workouts
    .filter((workout) => getExerciseGroup(workout) === group)
    .reduce((sum, workout) => sum + workout.amount, 0);
}

function getNextMilestone(total: number, milestones: number[]): number {
  return milestones.find((milestone) => total < milestone) ?? milestones[milestones.length - 1];
}

function getNextWorkoutCountMilestone(total: number): number {
  const nextMilestone = WORKOUT_COUNT_MILESTONES.find((milestone) => total < milestone);
  if (nextMilestone) return nextMilestone;

  let futureMilestone = WORKOUT_COUNT_MILESTONES[WORKOUT_COUNT_MILESTONES.length - 1];
  while (total >= futureMilestone) {
    futureMilestone *= 2;
  }

  return futureMilestone;
}

function getPreviousWorkoutCountMilestone(total: number): number | null {
  const completedMilestones = WORKOUT_COUNT_MILESTONES.filter((milestone) => total >= milestone);
  return completedMilestones[completedMilestones.length - 1] ?? null;
}

function getUnlockedAt(total: number, milestone: number, today: string): string | null {
  return total >= milestone ? today : null;
}

function getWorkoutCountAchievementName(milestone: number): string {
  const names: Record<number, string> = {
    1: "First Step",
    5: "Getting Warmed Up",
    10: "Training Habit",
    20: "Momentum Builder",
    50: "Quest Regular",
    100: "Century Club",
    200: "Iron Routine",
    500: "Elite Consistency",
    1000: "Legendary Adventurer",
  };

  return names[milestone] ?? `${milestone} Workouts Logged`;
}

export function buildLocalGameSummary(workouts: Workout[]): GameSummary {
  const totalXp = workouts.reduce((sum, workout) => sum + workout.xp_earned, 0);
  const levelProgress = calculateLocalLevelProgress(totalXp);
  const today = new Date().toISOString().slice(0, 10);
  const todayWalking = workouts
    .filter((workout) => workout.date === today && workout.exercise_type === "walking")
    .reduce((sum, workout) => sum + workout.amount, 0);
  const todayPushups = workouts
    .filter((workout) => workout.date === today && workout.exercise_type === "pushup")
    .reduce((sum, workout) => sum + workout.amount, 0);
  const pushupTotal = getExerciseTotal(workouts, "pushup");
  const calisthenicsTotal = getGroupTotal(workouts, "calisthenics");
  const gymTotal = getGroupTotal(workouts, "gym");
  const runningTotal = getExerciseTotal(workouts, "running");
  const cyclingTotal = getExerciseTotal(workouts, "cycling");
  const swimmingTotal = getExerciseTotal(workouts, "swimming");
  const workoutCountTarget = getNextWorkoutCountMilestone(workouts.length);
  const completedWorkoutCountMilestone = getPreviousWorkoutCountMilestone(workouts.length);
  const nextPushupMilestone = getNextMilestone(pushupTotal, PUSHUP_MILESTONES);
  const nextCalisthenicsMilestone = getNextMilestone(calisthenicsTotal, CALISTHENICS_MILESTONES);
  const nextGymMilestone = getNextMilestone(gymTotal, GYM_MILESTONES);
  const nextRunningMilestone = getNextMilestone(runningTotal, RUNNING_MILESTONES);
  const nextCyclingMilestone = getNextMilestone(cyclingTotal, CYCLING_MILESTONES);
  const nextSwimmingMilestone = getNextMilestone(swimmingTotal, SWIMMING_MILESTONES);

  return {
    level: levelProgress.level,
    total_xp: totalXp,
    xp_current: levelProgress.current_xp,
    xp_needed: levelProgress.needed_xp,
    achievements: [
      {
        id: 1,
        code: `workouts_${workoutCountTarget}`,
        name: getWorkoutCountAchievementName(workoutCountTarget),
        description:
          workoutCountTarget === 1
            ? "Log your first workout."
            : `Log ${workoutCountTarget.toLocaleString()} total workouts.${
                completedWorkoutCountMilestone
                  ? ` Recently completed: ${getWorkoutCountAchievementName(completedWorkoutCountMilestone)}.`
                  : ""
              }`,
        rule_type: "workout_count",
        target_amount: workoutCountTarget,
        unit: "workouts",
        progress_amount: Math.min(workouts.length, workoutCountTarget),
        is_unlocked: workouts.length >= workoutCountTarget,
        unlocked_at: workouts.length >= workoutCountTarget ? today : null,
      },
      {
        id: 100,
        code: "pushups_milestone",
        name: `${nextPushupMilestone} Pushups Completed`,
        description: "Keep building total pushup volume.",
        rule_type: "exercise_total",
        target_amount: nextPushupMilestone,
        unit: "reps",
        progress_amount: pushupTotal,
        is_unlocked: pushupTotal >= nextPushupMilestone,
        unlocked_at: getUnlockedAt(pushupTotal, nextPushupMilestone, today),
      },
      {
        id: 101,
        code: "calisthenics_milestone",
        name: `${nextCalisthenicsMilestone} Calisthenics Reps`,
        description: "Keep increasing total bodyweight training volume.",
        rule_type: "group_total",
        target_amount: nextCalisthenicsMilestone,
        unit: "reps",
        progress_amount: calisthenicsTotal,
        is_unlocked: calisthenicsTotal >= nextCalisthenicsMilestone,
        unlocked_at: getUnlockedAt(calisthenicsTotal, nextCalisthenicsMilestone, today),
      },
      {
        id: 102,
        code: "gym_milestone",
        name: `${nextGymMilestone} Gym Reps`,
        description: "Keep building consistent weighted training volume.",
        rule_type: "group_total",
        target_amount: nextGymMilestone,
        unit: "reps",
        progress_amount: gymTotal,
        is_unlocked: gymTotal >= nextGymMilestone,
        unlocked_at: getUnlockedAt(gymTotal, nextGymMilestone, today),
      },
      {
        id: 103,
        code: "running_milestone",
        name: `${nextRunningMilestone}km Total Running`,
        description: "Keep increasing your lifetime running distance.",
        rule_type: "exercise_total",
        target_amount: nextRunningMilestone,
        unit: "km",
        progress_amount: runningTotal,
        is_unlocked: runningTotal >= nextRunningMilestone,
        unlocked_at: getUnlockedAt(runningTotal, nextRunningMilestone, today),
      },
      {
        id: 104,
        code: "cycling_milestone",
        name: `${nextCyclingMilestone}km Total Cycling`,
        description: "Keep increasing your lifetime cycling distance.",
        rule_type: "exercise_total",
        target_amount: nextCyclingMilestone,
        unit: "km",
        progress_amount: cyclingTotal,
        is_unlocked: cyclingTotal >= nextCyclingMilestone,
        unlocked_at: getUnlockedAt(cyclingTotal, nextCyclingMilestone, today),
      },
      {
        id: 105,
        code: "swimming_milestone",
        name: `${nextSwimmingMilestone}km Total Swimming`,
        description: "Keep increasing your lifetime swimming distance.",
        rule_type: "exercise_total",
        target_amount: nextSwimmingMilestone,
        unit: "km",
        progress_amount: swimmingTotal,
        is_unlocked: swimmingTotal >= nextSwimmingMilestone,
        unlocked_at: getUnlockedAt(swimmingTotal, nextSwimmingMilestone, today),
      },
    ],
    badges: [
      {
        id: 1,
        code: "bronze",
        name: "Bronze",
        description: "Reach level 10.",
        min_level: 10,
        is_earned: levelProgress.level >= 10,
        earned_at: levelProgress.level >= 10 ? today : null,
      },
      {
        id: 2,
        code: "silver",
        name: "Silver",
        description: "Reach level 25.",
        min_level: 25,
        is_earned: levelProgress.level >= 25,
        earned_at: levelProgress.level >= 25 ? today : null,
      },
      {
        id: 3,
        code: "gold",
        name: "Gold",
        description: "Reach level 50.",
        min_level: 50,
        is_earned: levelProgress.level >= 50,
        earned_at: levelProgress.level >= 50 ? today : null,
      },
    ],
    daily_quests: [
      {
        id: 1,
        code: "walk_5000_steps",
        name: "Walk 5000 Steps",
        description: "Walk 5000 steps today.",
        exercise_type: "walking",
        target_amount: 5000,
        unit: "steps",
        xp_reward: 25,
        progress_amount: todayWalking,
        is_completed: todayWalking >= 5000,
        completed_at: todayWalking >= 5000 ? today : null,
      },
      {
        id: 2,
        code: "complete_50_pushups",
        name: "Complete 50 Pushups",
        description: "Complete 50 pushups today.",
        exercise_type: "pushup",
        target_amount: 50,
        unit: "reps",
        xp_reward: 25,
        progress_amount: todayPushups,
        is_completed: todayPushups >= 50,
        completed_at: todayPushups >= 50 ? today : null,
      },
    ],
  };
}

function getRecentWorkouts(workouts: Workout[], days = 5): Workout[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return workouts.filter((workout) => new Date(workout.date) >= cutoff);
}

function getAveragePaceMinutesPerKm(workout: Workout): number | null {
  if (!workout.duration || workout.amount <= 0 || workout.unit !== "km") {
    return null;
  }

  return workout.duration / workout.amount;
}

function formatDurationFromMinutes(durationMinutes: number): string {
  const totalSeconds = Math.round(durationMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours === 0) {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatPaceMinutesPerKm(minutesPerKm: number): string {
  const totalSeconds = Math.round(minutesPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} min/km`;
}

function getTargetHeartRate(age: number) {
  const maxHeartRate = 220 - age;
  return {
    moderateLow: Math.round(maxHeartRate * 0.5),
    moderateHigh: Math.round(maxHeartRate * 0.7),
    vigorousLow: Math.round(maxHeartRate * 0.7),
    vigorousHigh: Math.round(maxHeartRate * 0.85),
    zone2Low: Math.round(maxHeartRate * 0.6),
    zone2High: Math.round(maxHeartRate * 0.7),
    zone3Low: Math.round(maxHeartRate * 0.7),
    zone3High: Math.round(maxHeartRate * 0.8),
    zone4Low: Math.round(maxHeartRate * 0.8),
    zone4High: Math.round(maxHeartRate * 0.9),
  };
}

function formatExerciseName(exerciseType: string) {
  return exerciseType.replace(/_/g, " ");
}

function getAverageRpe(workouts: Workout[]): number {
  const rpeValues = workouts
    .filter((workout) => workout.exercise_type !== "walking")
    .map((workout) => workout.rpe)
    .filter((rpe): rpe is number => typeof rpe === "number");

  if (rpeValues.length === 0) {
    return 6;
  }

  return rpeValues.reduce((sum, rpe) => sum + rpe, 0) / rpeValues.length;
}

function getTrainingLoad(workout: Workout): number {
  if (workout.exercise_type === "walking") {
    return (workout.amount / 1000) * 2;
  }

  const effort = workout.rpe ?? 6;
  if (workout.duration) return workout.duration * effort;
  return workout.amount * effort;
}

function getRecentInfluence(workouts: Workout[], limit = 3): string[] {
  return workouts.slice(0, limit).map((workout) => {
    const rpeText = workout.rpe && workout.exercise_type !== "walking" ? `, RPE ${workout.rpe}/10` : "";
    return `${formatExerciseName(workout.exercise_type)} on ${workout.date}${rpeText}`;
  });
}

function getPaceRangeFromLatest(pace: number | null, intensity: "easy" | "threshold" | "interval") {
  if (!pace) return "Use conversational effort until more pace data is available";

  const lowMultiplier = intensity === "easy" ? 1.08 : intensity === "threshold" ? 0.95 : 0.88;
  const highMultiplier = intensity === "easy" ? 1.18 : intensity === "threshold" ? 1.02 : 0.95;
  const low = formatPaceMinutesPerKm(pace * lowMultiplier).replace(" min/km", "");
  const high = formatPaceMinutesPerKm(pace * highMultiplier);
  return `${low}-${high}`;
}

function getDaysSinceLastWorkout(workouts: Workout[], group: ExerciseGroup): number | null {
  const latest = workouts.find((workout) => getExerciseGroup(workout) === group);
  if (!latest) return null;

  const today = new Date();
  const workoutDate = new Date(latest.date);
  const diffMs = today.getTime() - workoutDate.getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

function buildCardioRecommendation(workout: Workout, age: number): TrainingRecommendation {
  const pace = getAveragePaceMinutesPerKm(workout);
  const heartRate = getTargetHeartRate(age);
  const extraMinutes = workout.duration ? Math.max(5, Math.round(workout.duration * 0.1)) : 5;
  const nextDuration = workout.duration ? formatDurationFromMinutes(workout.duration + extraMinutes) : "";

  if (workout.exercise_type === "walking") {
    const nextSteps = Math.round(workout.amount + 1000);
    return {
      goal: "general fitness",
      category: "Recovery",
      exercise_type: "walking",
      workout_type: "Active recovery walk",
      intensity: "easy",
      target: "Low-effort steps",
      title: "Build daily walking consistency",
      recommendation: `Try ${nextSteps} steps, or repeat ${workout.amount} steps a little faster if you felt fresh.`,
      reason:
        "Walking is treated as inherently low effort in FitQuest, so it supports recovery and daily consistency without needing time or RPE.",
      influenced_by: [formatExerciseName(workout.exercise_type)],
    };
  }

  if (workout.exercise_type === "running") {
    return {
      goal: "endurance",
      category: "Cardio",
      exercise_type: "running",
      workout_type: "Easy run",
      intensity: "easy",
      target_pace_range: getPaceRangeFromLatest(pace, "easy"),
      target_heart_rate_range: `Zone 2 (${heartRate.zone2Low}-${heartRate.zone2High} bpm)`,
      suggested_duration: workout.duration ? nextDuration : "20:00-30:00",
      title: "Progress your run with time and pace",
      recommendation: workout.duration
        ? `Try ${nextDuration} easy, or repeat ${workout.amount} km with the last 05:00 slightly quicker.`
        : `Try ${Math.round(workout.amount * 1.1 * 10) / 10} km at an easy conversational pace.`,
      reason: pace
        ? `Your latest pace was ${formatPaceMinutesPerKm(pace)}. For age ${age}, keep most endurance work around ${heartRate.moderateLow}-${heartRate.moderateHigh} bpm and save faster efforts for short finishes.`
        : `For age ${age}, a useful moderate range is about ${heartRate.moderateLow}-${heartRate.moderateHigh} bpm. Build time before pushing intensity.`,
      influenced_by: [formatExerciseName(workout.exercise_type)],
    };
  }

  if (workout.exercise_type === "cycling") {
    return {
      goal: "endurance",
      category: "Cardio",
      exercise_type: "cycling",
      workout_type: "Aerobic ride",
      intensity: "easy",
      target_pace_range: getPaceRangeFromLatest(pace, "easy"),
      target_heart_rate_range: `Zone 2 (${heartRate.zone2Low}-${heartRate.zone2High} bpm)`,
      suggested_duration: workout.duration ? nextDuration : "30:00-45:00",
      title: "Build cycling aerobic base",
      recommendation: workout.duration
        ? `Try ${nextDuration} at a steady cadence, then finish with 3 x 01:00 comfortably hard.`
        : `Try ${Math.round(workout.amount * 1.12 * 10) / 10} km at a steady moderate effort.`,
      reason: pace
        ? `Your latest ride averaged ${formatPaceMinutesPerKm(pace)}. Cycling can progress through duration, cadence, and controlled intervals, not only distance.`
        : "Cycling responds well to small time increases and short controlled efforts while most of the ride stays moderate.",
      influenced_by: [formatExerciseName(workout.exercise_type)],
    };
  }

  return {
    goal: "endurance",
    category: "Cardio",
    exercise_type: "swimming",
    workout_type: "Technique intervals",
    intensity: "moderate",
    target_pace_range: getPaceRangeFromLatest(pace, "easy"),
    target_heart_rate_range: `Zone 2-3 (${heartRate.zone2Low}-${heartRate.zone3High} bpm)`,
    suggested_duration: workout.duration ? formatDurationFromMinutes(workout.duration + 5) : "20:00-30:00",
    title: "Build swim pace with intervals",
    recommendation: workout.duration
      ? `Try ${formatDurationFromMinutes(workout.duration + 5)} total with 6 x 50m smooth repeats and easy rest.`
      : `Try ${Math.round(workout.amount * 1.05 * 100) / 100} km with relaxed breathing and clean technique.`,
    reason: pace
      ? `Your latest swim pace was ${formatPaceMinutesPerKm(pace)}. Swimming improves when technique stays calm while volume rises gradually.`
      : "Swimming progress should protect technique, so short repeats are better than simply forcing a longer continuous swim.",
    influenced_by: [formatExerciseName(workout.exercise_type)],
  };
}

function buildStrengthRecommendation(workout: Workout): TrainingRecommendation {
  const exercise = workout.exercise_type as ExerciseType;
  const name = formatExerciseName(exercise);
  const repsPerSet = workout.reps ?? Math.max(exercise === "pullup" ? 1 : 5, Math.floor(workout.amount / 4));
  const sets = workout.sets ?? 4;

  const calisthenicsPlans: Partial<Record<ExerciseType, string>> = {
    pushup: `Try ${sets + 1} sets x ${Math.max(5, Math.round(repsPerSet * 0.75))} pushups with a slow 3-second lowering phase.`,
    pullup: `Try 5 sets x ${Math.max(1, Math.floor(repsPerSet * 0.6))} pullups, then add 2 slow negatives if reps drop.`,
    situp: `Try 4 sets x ${Math.max(10, Math.round(repsPerSet * 0.9))} situps, then finish with a 30-second plank.`,
    dip: `Try 4 sets x ${Math.max(4, Math.round(repsPerSet * 0.75))} dips and stop 1-2 reps before failure.`,
    bodyweight_squat: `Try 4 sets x ${Math.max(12, Math.round(repsPerSet * 1.1))} squats with a pause at the bottom.`,
    lunge: `Try 3 sets x ${Math.max(8, Math.round(repsPerSet * 0.8))} lunges per leg with controlled balance.`,
    plank: `Try 4 holds at ${Math.max(20, Math.round(workout.amount * 0.8))} seconds with clean bracing.`,
    burpee: `Try 6 rounds of ${Math.max(5, Math.round(repsPerSet * 0.5))} burpees with 45 seconds rest.`,
  };

  if (getExerciseGroup(workout) === "gym") {
    const nextWeight = workout.weight ? Math.round((workout.weight + 2.5) * 10) / 10 : null;
    const loadText = nextWeight ? ` at ${nextWeight} ${workout.weight_unit ?? "kg"}` : "";

    return {
      goal: "strength",
      category: "Strength",
      exercise_type: exercise,
      workout_type: "Progressive overload",
      intensity: workout.rpe && workout.rpe >= 8 ? "easy" : "hard",
      suggested_duration: "35:00-50:00",
      title: `Progress your ${name}`,
      recommendation: `Try ${sets} sets x ${repsPerSet + 1} reps${loadText}, or keep the same load and make every rep cleaner.`,
      reason:
        "For weighted strength, FitQuest uses small progressive overload: add one rep per set first, then add a small amount of weight when the reps feel controlled.",
      influenced_by: [formatExerciseName(workout.exercise_type)],
    };
  }

  return {
    goal: "strength",
    category: "Strength",
    exercise_type: exercise,
    workout_type: workout.rpe && workout.rpe >= 8 ? "Technique volume" : "Volume progression",
    intensity: workout.rpe && workout.rpe >= 8 ? "easy" : "moderate",
    suggested_duration: "25:00-40:00",
    title: `Build ${name} capacity`,
    recommendation: calisthenicsPlans[exercise] ?? `Try 4 sets x ${Math.max(6, repsPerSet)} ${name}.`,
    reason:
      "Calisthenics improves through submaximal sets, clean tempo, and gradual volume increases instead of maxing out every session.",
    influenced_by: [formatExerciseName(workout.exercise_type)],
  };
}

export function buildLocalRecommendation(
  workouts: Workout[],
  goal = "general fitness",
  age = 25,
): TrainingRecommendation {
  const recentWorkouts = getRecentWorkouts(workouts);
  const goalKey = goal.toLowerCase();
  let candidates = recentWorkouts;

  if (goalKey === "general fitness") {
    candidates = recentWorkouts.filter((workout) => workout.exercise_type === "walking");
  } else if (goalKey === "strength") {
    candidates = recentWorkouts.filter((workout) => STRENGTH_EXERCISES.has(workout.exercise_type));
  } else if (goalKey === "endurance") {
    candidates = recentWorkouts.filter((workout) => ENDURANCE_EXERCISES.has(workout.exercise_type));
  }

  const latestWorkout = candidates[0];
  if (!latestWorkout) {
    if (goalKey === "strength") {
      return {
        goal,
        exercise_type: "pushup",
        title: "Start strength with calisthenics",
        recommendation: "Try 3 rounds of 8 pushups, 12 situps, and 3 controlled pullup negatives.",
        reason:
          "Strength training should cover major muscle groups at least twice weekly, so FitQuest starts with simple bodyweight work before heavier gym progressions.",
      };
    }

    if (goalKey === "endurance") {
      const heartRate = getTargetHeartRate(age);
      return {
        goal,
        exercise_type: "running",
        title: "Start with an easy endurance baseline",
        recommendation: "Try 0:20:00 of easy running, cycling, or swimming.",
        reason: `For age ${age}, a moderate target range is about ${heartRate.moderateLow}-${heartRate.moderateHigh} bpm. Keep the effort conversational.`,
      };
    }

    return {
      goal,
      exercise_type: "walking",
      title: "Keep general fitness simple",
      recommendation: "Try a 5000 step walk today.",
      reason: "Walking sits in general fitness because it is a low-friction daily activity that helps you move more.",
    };
  }

  if (goalKey === "strength") {
    return buildStrengthRecommendation(latestWorkout);
  }

  return buildCardioRecommendation(latestWorkout, age);
}

export function buildLocalRecommendations(
  workouts: Workout[],
  goal = "general fitness",
  age = 25,
): TrainingRecommendation[] {
  const recentWorkouts = getRecentWorkouts(workouts);
  const recentCardio = recentWorkouts.filter(
    (workout) => getExerciseGroup(workout) === "cardio" && workout.exercise_type !== "walking",
  );
  const recentEndurance = recentWorkouts.filter((workout) => ENDURANCE_EXERCISES.has(workout.exercise_type));
  const recentStrength = recentWorkouts.filter((workout) => STRENGTH_EXERCISES.has(workout.exercise_type));
  const hardSessions = recentWorkouts.filter((workout) => (workout.rpe ?? 6) >= 8);
  const totalLoad = recentWorkouts.reduce((sum, workout) => sum + getTrainingLoad(workout), 0);
  const averageRpe = getAverageRpe(recentWorkouts);
  const fatigueHigh = hardSessions.length >= 3 || averageRpe >= 8 || totalLoad > 900;
  const heartRate = getTargetHeartRate(age);
  const latestEndurance = recentEndurance[0] ?? recentCardio[0];
  const latestStrength = recentStrength[0];
  const latestPace = latestEndurance ? getAveragePaceMinutesPerKm(latestEndurance) : null;
  const daysSinceGym = getDaysSinceLastWorkout(workouts, "gym");
  const daysSinceCalisthenics = getDaysSinceLastWorkout(workouts, "calisthenics");
  const daysSinceStrength =
    daysSinceGym === null ? daysSinceCalisthenics : daysSinceCalisthenics === null ? daysSinceGym : Math.min(daysSinceGym, daysSinceCalisthenics);
  const daysSinceCardio = getDaysSinceLastWorkout(workouts, "cardio");
  const influence = getRecentInfluence(recentWorkouts);
  const goalKey = goal.toLowerCase();

  if (recentWorkouts.length === 0) {
    return [
      {
        goal,
        category: "Foundation",
        exercise_type: "walking",
        workout_type: "New user baseline",
        intensity: "easy",
        target: "Full body movement",
        target_pace_range: "Conversational effort",
        target_heart_rate_range: `Zone 2 (${heartRate.zone2Low}-${heartRate.zone2High} bpm)`,
        suggested_duration: "20:00-30:00 for cycling, running, or swimming",
        title: "Start with a simple baseline day",
        recommendation:
          "Walk 3000-5000 steps, or lightly cycle, run, or swim for 20:00-30:00. Then do 2 easy rounds of 8 pushups, 10 squats, and 20 seconds of plank.",
        strength_guidance: "Keep strength work at RPE 5-6/10 with clean form.",
        steps: [
          "Start with easy movement.",
          "Walk 3000-5000 steps, or choose 20:00-30:00 relaxed non-walking cardio.",
          "Do 2 light strength rounds without going near failure.",
          "Save the workout with an honest RPE.",
        ],
        reason:
          "No workouts are logged yet, so FitQuest is collecting a safe baseline before increasing intensity or volume.",
        influenced_by: [],
      },
    ];
  }

  if (fatigueHigh) {
    if (goalKey === "strength") {
      return [
        {
          goal: "strength",
          category: "Strength Recovery",
          exercise_type: "mobility",
          workout_type: "Strength deload day",
          intensity: "recovery",
          target: "Joints, tendons, and movement quality",
          suggested_duration: "20:00-30:00",
          title: "Deload strength today",
          recommendation:
            "Skip heavy lifting. Do light mobility, easy band work, and technique drills only.",
          strength_guidance: "2 easy rounds at RPE 2-4/10: bodyweight squats, scapular pulls, dead bugs, and hip hinges.",
          steps: [
            "Warm up with 05:00 easy movement.",
            "Move through light technique drills.",
            "Avoid heavy compound lifts and max sets.",
            "Log how recovered you feel tomorrow.",
          ],
          reason: `Recent training load is high with ${hardSessions.length} hard sessions and average RPE ${averageRpe.toFixed(1)}/10. A deload preserves strength progress by letting tissues recover.`,
          influenced_by: influence,
        },
      ];
    }

    if (goalKey === "endurance") {
      return [
        {
          goal: "endurance",
          category: "Endurance Recovery",
          exercise_type: "walking",
          workout_type: "Recovery cardio",
          intensity: "recovery",
          target: "Aerobic recovery",
          target_heart_rate_range: `Zone 1-2, stay below ${heartRate.zone2High} bpm`,
          suggested_duration: "Optional 15:00-25:00 for non-walking cardio",
          title: "Keep endurance easy today",
          recommendation:
            "Choose easy walking by steps, very light cycling, or complete rest. No tempo, threshold, hills, or intervals today.",
          steps: [
            "Keep breathing relaxed from start to finish.",
            "Use walking steps if you want movement without tracking time.",
            "Stop if effort rises above RPE 4/10.",
            "Save harder cardio for after fatigue drops.",
          ],
          reason: `Your recent effort is high, so endurance work should support recovery rather than add another stressor.`,
          influenced_by: influence,
        },
      ];
    }

    return [
      {
        goal,
        category: "Recovery",
        exercise_type: "mobility",
        workout_type: "Recovery day",
        intensity: "recovery",
        target: "Whole body recovery",
        target_heart_rate_range: `Zone 1-2, stay below ${heartRate.zone2High} bpm if you move`,
        suggested_duration: "20:00-30:00",
        title: "Recovery day",
        recommendation:
          "Choose either a full rest day, an easy step-based walk, or gentle mobility. Do not add hard intervals or heavy lifting today.",
        strength_guidance: "No heavy strength work. If you move, keep everything at RPE 2-4/10.",
        steps: [
          "Check soreness, sleep, and motivation before training.",
          "If you feel flat, take complete rest.",
          "If you feel okay, take an easy walk without tracking time.",
          "Finish with hips, calves, hamstrings, and thoracic rotations.",
        ],
        reason: `Your last ${recentWorkouts.length} workouts include ${hardSessions.length} high-effort sessions and an average RPE of ${averageRpe.toFixed(1)}/10. Recovery is prioritized so fatigue drops before the next training push.`,
        influenced_by: influence,
      },
    ];
  }

  if (goalKey === "general fitness") {
    const cardioCount = recentEndurance.length;
    const strengthCount = recentStrength.length;
    const walkingTotal = recentWorkouts
      .filter((workout) => workout.exercise_type === "walking")
      .reduce((sum, workout) => sum + workout.amount, 0);
    const balanceGap =
      strengthCount === 0
        ? "strength"
        : cardioCount === 0
          ? "endurance"
          : walkingTotal < 5000
            ? "daily movement"
            : "mobility";

    return [
      {
        goal: "general fitness",
        category: "Coach Summary",
        exercise_type: balanceGap === "endurance" ? "running" : balanceGap === "strength" ? "pushup" : "walking",
        workout_type: "Balanced fitness plan",
        intensity: "easy",
        target: `Balance gap: ${balanceGap}`,
        target_heart_rate_range: `Easy work near Zone 2 (${heartRate.zone2Low}-${heartRate.zone2High} bpm) when doing timed cardio`,
        suggested_duration: "30:00-45:00 total, or step-based walking",
        title: "Balance your week",
        recommendation:
          "Combine one easy movement block with a small strength or mobility block so the day supports consistency without becoming a hard session.",
        strength_guidance:
          balanceGap === "strength"
            ? "Add 2-3 easy sets of pushups, squats, rows or pullups, and core at RPE 6/10."
            : "Keep any strength work light: 2 sets of 8-12 controlled reps at RPE 5-6/10.",
        steps: [
          balanceGap === "daily movement"
            ? "Walk 3000-5000 steps without tracking time."
            : "Do 20:00-30:00 easy timed cardio or a step-based walk.",
          balanceGap === "strength"
            ? "Add a short full-body strength circuit."
            : "Add 05:00-10:00 mobility or light accessory work.",
          "Keep the whole session comfortable.",
          "Log the workout so FitQuest can update the weekly trend.",
        ],
        reason: `General Fitness weighs the whole recent pattern: ${cardioCount} endurance session(s), ${strengthCount} strength session(s), ${Math.round(walkingTotal)} walking steps, and average RPE ${averageRpe.toFixed(1)}/10. The goal is balance, readiness, and consistency.`,
        influenced_by: influence,
      },
    ];
  }

  if (goalKey === "strength") {
    const lowerBodyNeeded = !recentStrength.some((workout) =>
      ["back_squat", "deadlift", "leg_press", "bodyweight_squat", "lunge"].includes(workout.exercise_type),
    );

    return [
      {
        goal: "strength",
        category: "Strength",
        exercise_type: latestStrength?.exercise_type ?? "bodyweight_squat",
        workout_type: lowerBodyNeeded ? "Lower-body strength session" : "Technique strength session",
        intensity: "moderate",
        target: lowerBodyNeeded ? "Lower body and core" : "Upper body and core",
        suggested_duration: "35:00-50:00",
        title: lowerBodyNeeded ? "Lower-body strength focus" : "Strength progression focus",
        recommendation: lowerBodyNeeded
          ? "Do squats, Romanian deadlifts, lunges, and plank work. Keep each set smooth and stop before form breaks."
          : "Do pushups or bench press, rows or pullups, shoulder press, and core work with controlled reps.",
        strength_guidance: lowerBodyNeeded
          ? "3 sets of 8-10 squats, Romanian deadlifts, and lunges at RPE 7/10. Rest 90 seconds between sets."
          : "3-4 sets of 6-10 reps at RPE 7/10. Add one rep per set before increasing load.",
        steps: [
          "Warm up for 05:00-08:00 with easy movement.",
          lowerBodyNeeded
            ? "Complete 3 sets of 8-10 squats, Romanian deadlifts, and lunges."
            : "Complete 3-4 sets of a push, pull, press, and core exercise.",
          "Rest about 90 seconds between working sets.",
          "Stop sets with 2-3 reps left in reserve.",
        ],
        reason: lowerBodyNeeded
          ? "Your recent log does not show much leg training, and your current fatigue signal is manageable, so a moderate lower-body day balances your program."
          : "Your recent strength work supports a controlled progression without forcing a max-effort day.",
        influenced_by: getRecentInfluence(recentStrength.length > 0 ? recentStrength : recentWorkouts),
      },
    ];
  }

  if (goalKey === "endurance") {
    const highEffortCardio = recentEndurance.filter((workout) => (workout.rpe ?? 6) >= 8).length;
    const hardDayReady = recentEndurance.length >= 2 && highEffortCardio === 0 && averageRpe <= 6.5;

    return [
      {
        goal: "endurance",
        category: "Cardio",
        exercise_type: latestEndurance?.exercise_type ?? "running",
        workout_type: hardDayReady ? "Threshold run" : "Easy aerobic run",
        intensity: hardDayReady ? "hard" : "easy",
        target: latestEndurance ? formatExerciseName(latestEndurance.exercise_type) : "Running, cycling, or swimming",
        target_pace_range: hardDayReady
          ? getPaceRangeFromLatest(latestPace, "threshold")
          : getPaceRangeFromLatest(latestPace, "easy"),
        target_heart_rate_range: hardDayReady
          ? `Zone 4 (${heartRate.zone4Low}-${heartRate.zone4High} bpm)`
          : `Zone 2 (${heartRate.zone2Low}-${heartRate.zone2High} bpm)`,
        suggested_duration: hardDayReady ? "30:00-40:00" : "35:00-50:00",
        title: hardDayReady ? "Controlled quality cardio day" : "Easy aerobic day",
        recommendation: hardDayReady
          ? "Warm up, then complete 3 x 08:00 at threshold effort with 03:00 easy recovery between repeats."
          : "Run, cycle, or swim at conversational effort. Keep effort around RPE 4-5/10 and finish fresh.",
        steps: hardDayReady
          ? [
              "Warm up for 10:00 easy.",
              "Do 3 x 08:00 at threshold effort.",
              "Recover for 03:00 easy between repeats.",
              "Cool down for 05:00-10:00.",
            ]
          : [
              "Warm up for 05:00 easy.",
              "Stay in Zone 2 for the main block.",
              "Keep breathing controlled and conversational.",
              "Stop before effort creeps above RPE 5/10.",
            ],
        reason: hardDayReady
          ? "Your recent RPE and training load look manageable, so one controlled hard day can build fitness without conflicting with recovery."
          : "Your recent training suggests an easy day will build endurance while keeping fatigue under control.",
        influenced_by: getRecentInfluence(recentEndurance.length > 0 ? recentEndurance : recentWorkouts),
      },
    ];
  }

  return [
    {
      goal: "general fitness",
      category: "Balanced",
      exercise_type: "walking",
      workout_type: "Easy mixed training day",
      intensity: "easy",
      target: "General conditioning and mobility",
      target_heart_rate_range: `Zone 2 (${heartRate.zone2Low}-${heartRate.zone2High} bpm)`,
      suggested_duration: "30:00-45:00",
      title: "Balanced easy training day",
      recommendation:
        "Complete easy cardio or a step-based walk, then light full-body strength and mobility. Keep the whole session comfortable.",
      strength_guidance: "2-3 sets of 8-12 reps for pushups, rows or pullups, squats, and core at RPE 6/10.",
      steps: [
        "Walk 3000-5000 steps, or do 20:00-30:00 easy cycling, running, or swimming.",
        "Complete 2-3 light full-body strength rounds.",
        "Finish with 05:00-10:00 mobility.",
        "Log RPE so tomorrow adapts to today.",
      ],
      reason:
        "Your recent data does not point strongly toward a hard cardio day, heavy strength day, or full rest day, so FitQuest recommends a balanced low-risk session.",
      influenced_by: influence,
    },
  ];
}
