import { useEffect, useState } from "react";

import { AppShell } from "./components/AppShell";
import {
  changeSupabasePassword,
  getSupabaseAuthSession,
  loginSupabaseAccount,
  logoutSupabaseAccount,
  onSupabaseAuthChange,
  registerSupabaseAccount,
  updateSupabaseProfileName,
} from "./supabaseAuth";
import {
  confirmSupabaseActiveRecommendation,
  createSupabaseWorkout,
  getSupabaseProfileAge,
  getSupabaseTrainingRecommendations,
  getSupabaseWorkoutHistory,
  getSupabaseWorkoutStats,
  saveSupabaseProfileAge,
} from "./supabaseFitness";
import { askCoachWithGemini } from "./recommendations/serverAiProvider";
import { migrateLegacyLocalFitnessData } from "./supabaseMigration";
import { Dashboard } from "./pages/Dashboard";
import { AuthPage } from "./pages/AuthPage";
import { LogWorkout } from "./pages/LogWorkout";
import { Profile } from "./pages/Profile";
import type {
  CreateWorkoutPayload,
  AuthUser,
  CoachMessage,
  CoachReply,
  Page,
  RecommendationGoal,
  TrainingRecommendation,
  Workout,
  WorkoutStats,
} from "./types";

export default function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [goal, setGoal] = useState<RecommendationGoal>("general fitness");
  const [profileAge, setProfileAge] = useState(25);
  const [recommendations, setRecommendations] = useState<TrainingRecommendation[]>([]);
  const [gameRefreshKey, setGameRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadFitnessData() {
    if (!authUser) return;

    setIsLoading(true);
    setError("");

    try {
      await migrateLegacyLocalFitnessData(authUser.id);
      const age = await getSupabaseProfileAge(authUser.id);
      const [historyData, statsData, recommendationData] = await Promise.all([
        getSupabaseWorkoutHistory(authUser.id),
        getSupabaseWorkoutStats(authUser.id),
        getSupabaseTrainingRecommendations(authUser.id, goal, age),
      ]);
      setProfileAge(age);
      setWorkouts(historyData);
      setStats(statsData);
      setRecommendations(recommendationData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load FitQuest data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateWorkout(payload: CreateWorkoutPayload) {
    if (!authUser) return;

    try {
      await createSupabaseWorkout(authUser.id, payload);
      await loadFitnessData();
      setGameRefreshKey((current) => current + 1);
      setActivePage("dashboard");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save workout.");
      setActivePage("dashboard");
    }
  }

  function handleAgeChange(age: number) {
    if (!authUser) return;
    setProfileAge(age);
    void saveSupabaseProfileAge(authUser.id, age).catch((ageError) => {
      setError(ageError instanceof Error ? ageError.message : "Could not save age.");
    });
    void getSupabaseTrainingRecommendations(authUser.id, goal, age).then(setRecommendations);
    setGameRefreshKey((current) => current + 1);
  }

  async function handleLogin(payload: { email: string; password: string }) {
    setAuthLoading(true);
    setAuthError("");
    try {
      const session = await loginSupabaseAccount(payload.email, payload.password);
      setAuthUser(session.user);
      setGoal(session.user.goal);
      setProfileAge(await getSupabaseProfileAge(session.user.id));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not log in.");
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
      const session = await registerSupabaseAccount(payload);
      setAuthUser(session.user);
      setGoal(session.user.goal);
      setProfileAge(await getSupabaseProfileAge(session.user.id));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutSupabaseAccount();
    } catch {
      // Let the UI clear even if the network request cannot complete.
    }
    setAuthUser(null);
    setWorkouts([]);
    setStats(null);
    setRecommendations([]);
    setProfileAge(25);
    setActivePage("dashboard");
  }

  async function handleNameChange(name: string) {
    if (!authUser) return;
    const updated = await updateSupabaseProfileName(authUser.id, name);
    setAuthUser(updated);
  }

  async function handlePasswordChange(currentPassword: string, newPassword: string) {
    if (!authUser) return;
    await changeSupabasePassword(currentPassword, newPassword);
  }

  async function handleAskCoach(
    recommendation: TrainingRecommendation,
    question: string,
    conversation: CoachMessage[],
  ): Promise<CoachReply> {
    try {
      return await askCoachWithGemini({
        currentRecommendation: recommendation,
        question,
        conversation,
        workouts,
        goal,
        age: profileAge,
      });
    } catch {
      return {
        message:
          "Coach is unavailable right now, so keep the current plan or use the fallback recommendation until AI is back.",
      };
    }
  }

  async function handleConfirmRecommendation(recommendation: TrainingRecommendation) {
    if (!authUser) return;
    const activeRecommendation = await confirmSupabaseActiveRecommendation(authUser.id, goal, recommendation);
    setRecommendations([activeRecommendation]);
  }

  useEffect(() => {
    let isMounted = true;

    getSupabaseAuthSession()
      .then((session) => {
        if (!isMounted) return;
        if (session) {
          setAuthUser(session.user);
          setGoal(session.user.goal);
          void getSupabaseProfileAge(session.user.id).then(setProfileAge);
        }
      })
      .catch((error) => {
        if (isMounted) setAuthError(error instanceof Error ? error.message : "Could not restore your session.");
      })
      .finally(() => {
        if (isMounted) setAuthReady(true);
      });

    const unsubscribe = onSupabaseAuthChange((session) => {
      if (!isMounted) return;
      if (session) {
        setAuthUser(session.user);
        setGoal(session.user.goal);
        void getSupabaseProfileAge(session.user.id).then(setProfileAge);
      } else {
        setAuthUser(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authUser) void loadFitnessData();
  }, [goal, authUser?.id]);

  if (!authReady) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="status-text">Loading FitQuest...</p>
        </section>
      </main>
    );
  }

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
          onAskCoach={handleAskCoach}
          onConfirmRecommendation={handleConfirmRecommendation}
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
