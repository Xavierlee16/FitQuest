import type {
  CreateWorkoutPayload,
  AuthSession,
  AuthUser,
  GameSummary,
  RecommendationGoal,
  TrainingRecommendation,
  Workout,
  WorkoutStats,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

let authToken = localStorage.getItem("fitquest.authToken") ?? "";

export function setApiAuthToken(token: string) {
  authToken = token;
  if (token) localStorage.setItem("fitquest.authToken", token);
  else localStorage.removeItem("fitquest.authToken");
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = "FitQuest API request failed.";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        message = body.detail;
      }
    } catch {
      // Keep the generic message when the server does not return JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

/* ---------------- AUTH ---------------- */

export function registerAccount(payload: {
  name: string;
  email: string;
  password: string;
  goal: RecommendationGoal;
}): Promise<AuthSession> {
  return request<AuthSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginAccount(payload: { email: string; password: string }): Promise<AuthSession> {
  return request<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logoutAccount(): Promise<{ status: string }> {
  return request<{ status: string }>("/auth/logout", { method: "POST" });
}

export function getCurrentAccount(): Promise<AuthUser> {
  return request<AuthUser>("/auth/me");
}

export function updateAccountName(name: string): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function changeAccountPassword(current_password: string, new_password: string) {
  return request<{ status: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}

/* ---------------- WORKOUTS ---------------- */

export function getWorkoutHistory(): Promise<Workout[]> {
  return request<Workout[]>("/workouts");
}

export function getWorkoutStats(): Promise<WorkoutStats> {
  return request<WorkoutStats>("/workouts/stats");
}

export function createWorkout(
  payload: CreateWorkoutPayload
): Promise<Workout> {
  return request<Workout>("/workouts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ---------------- RECOMMENDATIONS ---------------- */

export function getTrainingRecommendation(
  goal: RecommendationGoal
): Promise<TrainingRecommendation> {
  return request<TrainingRecommendation>("/recommendations", {
    method: "POST",
    body: JSON.stringify({ goal }),
  });
}

/* ---------------- GAME SYSTEM ---------------- */

export function getGameSummary(): Promise<GameSummary> {
  return request<GameSummary>("/game/summary");
}
