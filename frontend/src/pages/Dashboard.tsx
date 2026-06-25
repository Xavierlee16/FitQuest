import { useState } from "react";

import AchievementList from "../components/AchievementList";
import BadgeList from "../components/BadgeList";
import QuestList from "../components/QuestList";
import { WorkoutList } from "../components/WorkoutList";
import { useGame } from "../hooks/useGame";
import type {
  CoachMessage,
  CoachReply,
  RecommendationGoal,
  TrainingRecommendation,
  Workout,
  WorkoutStats,
} from "../types";

type DashboardProps = {
  goal: RecommendationGoal;
  gameRefreshKey: number;
  stats: WorkoutStats | null;
  workouts: Workout[];
  recommendations: TrainingRecommendation[];
  isLoading: boolean;
  onAskCoach: (
    recommendation: TrainingRecommendation,
    question: string,
    conversation: CoachMessage[],
  ) => Promise<CoachReply>;
  onConfirmRecommendation: (recommendation: TrainingRecommendation) => Promise<void>;
  onGoalChange: (goal: RecommendationGoal) => void;
};

export function Dashboard({
  goal,
  gameRefreshKey,
  stats,
  workouts,
  recommendations,
  isLoading,
  onAskCoach,
  onConfirmRecommendation,
  onGoalChange,
}: DashboardProps) {
  const { game, loading: gameLoading, error: gameError } = useGame(gameRefreshKey);
  const loading = isLoading || gameLoading;
  const recentWorkouts = workouts.slice(0, 5);

  const level = game?.level ?? 1;
  const totalXp = game?.total_xp ?? 0;
  const xpCurrent = game?.xp_current ?? 0;
  const xpNeeded = game?.xp_needed ?? 1;
  const xpProgress = xpNeeded > 0 ? (xpCurrent / xpNeeded) * 100 : 0;

  const [openCoachIndex, setOpenCoachIndex] = useState<number | null>(null);
  const [coachMessages, setCoachMessages] = useState<Record<number, CoachMessage[]>>({});
  const [coachDrafts, setCoachDrafts] = useState<Record<number, string>>({});
  const [coachPlans, setCoachPlans] = useState<Record<number, TrainingRecommendation>>({});
  const [coachLoadingIndex, setCoachLoadingIndex] = useState<number | null>(null);
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null);

  async function handleCoachSubmit(index: number, recommendation: TrainingRecommendation) {
    const question = (coachDrafts[index] ?? "").trim();
    if (!question || coachLoadingIndex !== null) return;

    const previousMessages = coachMessages[index] ?? [];
    const nextMessages: CoachMessage[] = [...previousMessages, { role: "user", content: question }];
    setCoachMessages((current) => ({ ...current, [index]: nextMessages }));
    setCoachDrafts((current) => ({ ...current, [index]: "" }));
    setCoachLoadingIndex(index);

    const reply = await onAskCoach(recommendation, question, nextMessages);
    setCoachMessages((current) => ({
      ...current,
      [index]: [...(current[index] ?? nextMessages), { role: "coach", content: reply.message }],
    }));

    if (reply.recommendation) {
      setCoachPlans((current) => ({ ...current, [index]: reply.recommendation as TrainingRecommendation }));
    }

    setCoachLoadingIndex(null);
  }

  async function handleConfirm(index: number, recommendation: TrainingRecommendation) {
    setConfirmingIndex(index);
    await onConfirmRecommendation(coachPlans[index] ?? recommendation);
    setConfirmingIndex(null);
    setOpenCoachIndex(null);
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Your FitQuest progress</h1>
          <p className="page-subtitle">Pick today's focus, log the session, and let your streak build from there.</p>
        </div>
      </header>

      {loading ? (
        <section className="panel loading-panel">
          <p className="status-text">Loading your latest quest progress...</p>
        </section>
      ) : (
        <>
          <section className="panel recommendation-panel hero-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Today</p>
                <h2>Training recommendation</h2>
              </div>

              <select
                aria-label="Training goal"
                value={goal}
                onChange={(event) =>
                  onGoalChange(event.target.value as RecommendationGoal)
                }
              >
                <option value="general fitness">General fitness</option>
                <option value="strength">Strength</option>
                <option value="endurance">Endurance</option>
              </select>
            </div>

            {recommendations.length > 0 ? (
              <div className="recommendation-list">
                {recommendations.map((recommendation, index) => (
                  <article className="recommendation-card" key={`${recommendation.title}-${index}`}>
                    {recommendation.is_active_plan && (
                      <div className="active-plan-banner">
                        <span>Active Plan</span>
                        <p>This plan stays active until you log a workout or confirm a new plan.</p>
                      </div>
                    )}

                    <div className="recommendation-card-header">
                      <div>
                        <p className="recommendation-title">
                          {recommendation.category ?? recommendation.goal}
                        </p>
                        <h3>{recommendation.title}</h3>
                      </div>
                      {recommendation.intensity && (
                        <span className={`intensity-pill ${recommendation.intensity}`}>
                          {recommendation.intensity}
                        </span>
                      )}
                    </div>

                    <div className="recommendation-meta">
                      <span className={`source-pill ${recommendation.source?.startsWith("AI") ? "ai" : "fallback"}`}>
                        Source: {recommendation.source ?? "Rule engine"}
                      </span>
                      {typeof recommendation.confidence === "number" && (
                        <span>Confidence: {Math.round(recommendation.confidence * 100)}%</span>
                      )}
                    </div>

                    <strong className="recommendation-workout-type">
                      {recommendation.workout_type ?? recommendation.recommendation}
                    </strong>

                    <div className="recommendation-metrics">
                      {recommendation.target_pace_range && (
                        <span>Pace: {recommendation.target_pace_range}</span>
                      )}
                      {recommendation.target_heart_rate_range && (
                        <span>Heart Rate: {recommendation.target_heart_rate_range}</span>
                      )}
                      {recommendation.suggested_duration && (
                        <span>Duration: {recommendation.suggested_duration}</span>
                      )}
                      {recommendation.target && (
                        <span>Target: {recommendation.target}</span>
                      )}
                    </div>

                    <div className="recommendation-section">
                      <span>Plan</span>
                      <p>{recommendation.recommendation}</p>
                    </div>

                    {recommendation.suggested_action && (
                      <div className="recommendation-section action-section">
                        <span>Suggested action</span>
                        <p>{recommendation.suggested_action}</p>
                      </div>
                    )}

                    {recommendation.strength_guidance && (
                      <div className="recommendation-section">
                        <span>Strength guidance</span>
                        <p>{recommendation.strength_guidance}</p>
                      </div>
                    )}

                    {recommendation.steps && recommendation.steps.length > 0 && (
                      <ol className="recommendation-steps">
                        {recommendation.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    )}

                    <div className="recommendation-section">
                      <span>Why this helps</span>
                      <p>{recommendation.reason}</p>
                    </div>

                    {recommendation.influenced_by && recommendation.influenced_by.length > 0 && (
                      <p className="recommendation-influence">
                        Based on: {recommendation.influenced_by.join("; ")}
                      </p>
                    )}

                    <div className="coach-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setOpenCoachIndex(openCoachIndex === index ? null : index)}
                      >
                        {openCoachIndex === index ? "Close Coach" : "Ask Coach"}
                      </button>
                      <button
                        className="primary-button compact-button"
                        type="button"
                        disabled={confirmingIndex === index}
                        onClick={() => handleConfirm(index, recommendation)}
                      >
                        {confirmingIndex === index ? "Confirming..." : "Confirm Plan"}
                      </button>
                    </div>

                    {openCoachIndex === index && (
                      <div className="coach-panel">
                        <div className="active-plan-section">
                          <span>Active plan preview</span>
                          <strong>{(coachPlans[index] ?? recommendation).title}</strong>
                          <p>{(coachPlans[index] ?? recommendation).recommendation}</p>
                        </div>

                        {(coachMessages[index] ?? []).length > 0 && (
                          <div className="coach-conversation">
                            {(coachMessages[index] ?? []).map((message, messageIndex) => (
                              <p className={`coach-message ${message.role}`} key={`${message.role}-${messageIndex}`}>
                                <strong>{message.role === "user" ? "You" : "Coach"}:</strong> {message.content}
                              </p>
                            ))}
                          </div>
                        )}

                        <label className="coach-input">
                          <span>Ask a follow-up</span>
                          <textarea
                            rows={3}
                            value={coachDrafts[index] ?? ""}
                            onChange={(event) =>
                              setCoachDrafts((current) => ({ ...current, [index]: event.target.value }))
                            }
                            placeholder="Can you make this easier, swap exercises, or fit it into 20 minutes?"
                          />
                        </label>

                        <div className="coach-actions">
                          <button
                            className="primary-button compact-button"
                            type="button"
                            disabled={coachLoadingIndex === index}
                            onClick={() => handleCoachSubmit(index, recommendation)}
                          >
                            {coachLoadingIndex === index ? "Asking..." : "Send"}
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            disabled={confirmingIndex === index}
                            onClick={() => handleConfirm(index, recommendation)}
                          >
                            {confirmingIndex === index ? "Confirming..." : "Confirm Plan"}
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state rich-empty-state">
                <strong>No recommendation yet</strong>
                <span>Log your first workout so FitQuest can suggest a useful next session.</span>
              </div>
            )}
          </section>

          <div className="dashboard-grid">
            <section className="panel progress-panel">
              <div className="panel-header">
                <div>
                  <h2>Level progress</h2>
                  <span>{xpCurrent} / {xpNeeded} XP to next level</span>
                </div>
                <strong className="level-badge">Lvl {level}</strong>
              </div>

              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${xpProgress}%` }} />
              </div>

              <div className="stat-strip">
                <div>
                  <span>Total XP</span>
                  <strong>{totalXp}</strong>
                </div>
                <div>
                  <span>Streak</span>
                  <strong>{stats?.streak ?? 0} days</strong>
                </div>
                <div>
                  <span>Workouts</span>
                  <strong>{stats?.total_workouts ?? 0}</strong>
                </div>
              </div>
            </section>

            {game && <AchievementList achievements={game.achievements} />}
          </div>

          {gameError && <div className="warning-banner">{gameError}</div>}

          <section className="panel recent-panel">
            <div className="panel-header">
              <div>
                <h2>Recent workouts</h2>
                <span>{recentWorkouts.length > 0 ? `${recentWorkouts.length} shown` : "Ready when you are"}</span>
              </div>
            </div>

            <WorkoutList workouts={recentWorkouts} />
          </section>

          {game && (
            <div className="secondary-grid">
              <QuestList quests={game.daily_quests} />
              <BadgeList badges={game.badges} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
