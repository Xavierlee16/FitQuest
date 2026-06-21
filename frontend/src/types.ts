export type Page = "dashboard" | "log-workout" | "profile";

export type AuthUser = {
  id: number | string;
  name: string;
  email: string;
  goal: RecommendationGoal;
  created_at: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export type ExerciseGroup = "cardio" | "calisthenics" | "gym";

export type ExerciseType =
  | "running"
  | "walking"
  | "swimming"
  | "cycling"
  | "pushup"
  | "situp"
  | "pullup"
  | "dip"
  | "bodyweight_squat"
  | "lunge"
  | "plank"
  | "burpee"
  | "bench_press"
  | "back_squat"
  | "deadlift"
  | "shoulder_press"
  | "barbell_row"
  | "lat_pulldown"
  | "leg_press"
  | "chest_press_machine"
  | "cable_row";

export type Workout = {
  id: number;
  user_id: number;
  exercise_group?: ExerciseGroup;
  exercise_type: ExerciseType;
  amount: number;
  unit: string;
  duration: number | null;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
  rpe?: number | null;
  difficulty: string;
  date: string;
  xp_earned: number;
};

export type WorkoutStats = {
  total_workouts: number;
  total_xp: number;
  level: number;
  streak: number;
  workouts_by_exercise: Record<string, number>;
};

export type CreateWorkoutPayload = {
  exercise_group?: ExerciseGroup;
  exercise_type: ExerciseType;
  amount: number;
  unit: string;
  duration?: number | null;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
  rpe?: number | null;
};

export type RecommendationGoal = "general fitness" | "strength" | "endurance";

export type TrainingRecommendation = {
  goal: string;
  category?: string;
  exercise_type: string;
  workout_type?: string;
  intensity?: "easy" | "moderate" | "hard" | "recovery" | "rest";
  target_pace_range?: string;
  target_heart_rate_range?: string;
  suggested_duration?: string;
  target?: string;
  strength_guidance?: string;
  steps?: string[];
  title: string;
  recommendation: string;
  reason: string;
  influenced_by?: string[];
};

export type Achievement = {
  id: number;
  code: string;
  name: string;
  description: string;
  rule_type: string;
  target_amount: number;
  unit: string;
  progress_amount: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
};

export type Badge = {
  id: number;
  code: string;
  name: string;
  description: string;
  min_level: number;
  is_earned: boolean;
  earned_at: string | null;
};

export type DailyQuest = {
  id: number;
  code: string;
  name: string;
  description: string;
  exercise_type: string;
  target_amount: number;
  unit: string;
  xp_reward: number;
  progress_amount: number;
  is_completed: boolean;
  completed_at: string | null;
};

export type GameSummary = {
  level: number;
  total_xp: number;
  xp_current: number;
  xp_needed: number;
  achievements: Achievement[];
  badges: Badge[];
  daily_quests: DailyQuest[];
};
