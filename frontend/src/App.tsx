import { useEffect, useState } from "react";

import {
  changeAccountPassword,
  createWorkout,
  getTrainingRecommendation,
  getWorkoutHistory,
  getWorkoutStats,
  loginAccount,
  logoutAccount,
  registerAccount,
  setApiAuthToken,
  updateAccountName,
} from "./api";
import { AppShell } from "./components/AppShell";
import {
  changeLocalPassword,
  getLocalSession,
  loginLocalAccount,
  logoutLocalAccount,
  registerLocalAccount,
  updateLocalAccountName,
} from "./localAuth";
import {
  buildLocalRecommendations,
  buildLocalStats,
  ensureLocalTestDataReset,
  getLocalProfileAge,
  getLocalWorkouts,
  saveLocalWorkout,
  saveLocalProfileAge,
} from "./localFitness";
import { Dashboard } from "./pages/Dashboard";
import { AuthPage } from "./pages/AuthPage";
import { LogWorkout } from "./pages/LogWorkout";
import { Profile } from "./pages/Profile";
import type {
  CreateWorkoutPayload,
  AuthUser,
  Page,
  RecommendationGoal,
  TrainingRecommendation,
  Workout,
  WorkoutStats,
} from "./types";

ensureLocalTestDataReset();
const initialSession = getLocalSession();
if (initialSession?.token) {
  setApiAuthToken(initialSession.token);
}

export default function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [authUser, setAuthUser] = useState<AuthUser | null>(initialSession?.user ?? null);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [goal, setGoal] = useState<RecommendationGoal>("general fitness");
  const [profileAge, setProfileAge] = useState(getLocalProfileAge());
  const [recommendations, setRecommendations] = useState<TrainingRecommendation[]>([]);
  const [gameRefreshKey, setGameRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadFitnessData() {
    setIsLoading(true);
    setError("");
    let loadedWorkouts: Workout[] = [];

    try {
      const [historyData, statsData] = await Promise.all([
        getWorkoutHistory(),
        getWorkoutStats(),
      ]);
      loadedWorkouts = historyData;
      setWorkouts(historyData);
      setStats(statsData);
    } catch {
      const localWorkouts = getLocalWorkouts();
      setWorkouts(localWorkouts);
      setStats(buildLocalStats(localWorkouts));
      setRecommendations(buildLocalRecommendations(localWorkouts, goal, profileAge));
      setIsLoading(false);
      return;
    }

    try {
      const recommendationData = await getTrainingRecommendation(goal);
      setRecommendations([recommendationData]);
    } catch {
      setRecommendations(buildLocalRecommendations(loadedWorkouts, goal, profileAge));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateWorkout(payload: CreateWorkoutPayload) {
    try {
      await createWorkout(payload);
      await loadFitnessData();
      setGameRefreshKey((current) => current + 1);
      setActivePage("dashboard");
    } catch {
      const localWorkout = saveLocalWorkout(payload);
      const localWorkouts = [localWorkout, ...workouts];
      setWorkouts(localWorkouts);
      setStats(buildLocalStats(localWorkouts));
      setRecommendations(buildLocalRecommendations(localWorkouts, goal, profileAge));
      setError("");
      setActivePage("dashboard");
    }
  }

  function handleAgeChange(age: number) {
    setProfileAge(age);
    saveLocalProfileAge(age);
    setRecommendations(buildLocalRecommendations(workouts, goal, age));
    setGameRefreshKey((current) => current + 1);
  }

  async function handleLogin(payload: { email: string; password: string }) {
    setAuthLoading(true);
    setAuthError("");
    try {
      const session = await loginAccount(payload);
      setApiAuthToken(session.token);
      localStorage.setItem("fitquest.localSession", JSON.stringify(session));
      setAuthUser(session.user);
      setGoal(session.user.goal);
      setProfileAge(getLocalProfileAge());
    } catch {
      try {
        const session = await loginLocalAccount(payload.email, payload.password);
        setApiAuthToken("");
        setAuthUser(session.user);
        setGoal(session.user.goal);
        setProfileAge(getLocalProfileAge());
      } catch (localError) {
        setAuthError(localError instanceof Error ? localError.message : "Could not log in.");
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(payload: {
    name: string;
    email: string;
    password: string;
    goal: RecommendationGoal;
  }) {
    setAuthLoading(true);
    setAuthError("");
    try {
      const session = await registerAccount(payload);
      setApiAuthToken(session.token);
      localStorage.setItem("fitquest.localSession", JSON.stringify(session));
      setAuthUser(session.user);
      setGoal(session.user.goal);
      setProfileAge(getLocalProfileAge());
    } catch {
      try {
        const session = await registerLocalAccount(payload);
        setApiAuthToken("");
        setAuthUser(session.user);
        setGoal(session.user.goal);
        setProfileAge(getLocalProfileAge());
      } catch (localError) {
        setAuthError(localError instanceof Error ? localError.message : "Could not create account.");
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutAccount();
    } catch {
      // local-only sessions have no server session to close
    }
    setApiAuthToken("");
    logoutLocalAccount();
    setAuthUser(null);
    setWorkouts([]);
    setStats(null);
    setRecommendations([]);
    setProfileAge(getLocalProfileAge());
    setActivePage("dashboard");
  }

  async function handleNameChange(name: string) {
    if (!authUser) return;
    try {
      const updated = await updateAccountName(name);
      setAuthUser(updated);
    } catch {
      const updated = updateLocalAccountName(authUser.id, name);
      setAuthUser(updated);
    }
  }

  async function handlePasswordChange(currentPassword: string, newPassword: string) {
    if (!authUser) return;
    try {
      await changeAccountPassword(currentPassword, newPassword);
    } catch {
      await changeLocalPassword(authUser.id, currentPassword, newPassword);
    }
  }

  useEffect(() => {
    if (authUser) void loadFitnessData();
  }, [goal, authUser?.id]);

  if (!authUser) {
    return (
      <AuthPage
        error={authError}
        loading={authLoading}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <AppShell activePage={activePage} onLogout={handleLogout} onPageChange={setActivePage} userName={authUser.name}>
      {error && <div className="error-banner">{error}</div>}

      {activePage === "dashboard" && (
        <Dashboard
          gameRefreshKey={gameRefreshKey}
          goal={goal}
          isLoading={isLoading}
          onGoalChange={setGoal}
          recommendations={recommendations}
          stats={stats}
          workouts={workouts}
        />
      )}
      {activePage === "log-workout" && <LogWorkout onCreateWorkout={handleCreateWorkout} />}
      {activePage === "profile" && (
        <Profile
          age={profileAge}
          authUser={authUser}
          gameRefreshKey={gameRefreshKey}
          onAgeChange={handleAgeChange}
          onLogout={handleLogout}
          onNameChange={handleNameChange}
          onPasswordChange={handlePasswordChange}
          stats={stats}
        />
      )}
    </AppShell>
  );
}
