import { useState } from "react";

import type { Achievement } from "../types";

type AchievementListProps = {
  achievements: Achievement[];
};

function getProgress(achievement: Achievement) {
  return Math.min(achievement.progress_amount, achievement.target_amount);
}

function getProgressPercent(achievement: Achievement) {
  if (achievement.target_amount <= 0) return 0;
  return (getProgress(achievement) / achievement.target_amount) * 100;
}

export default function AchievementList({ achievements }: AchievementListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const workoutMilestone = achievements.find((achievement) => achievement.rule_type === "workout_count");
  const otherAchievements = achievements.filter((achievement) => achievement.rule_type !== "workout_count");

  if (!workoutMilestone) {
    return null;
  }

  const progress = getProgress(workoutMilestone);
  const progressPercent = getProgressPercent(workoutMilestone);
  const unlockedCount = achievements.filter((item) => item.is_unlocked).length;
  const recentlyCompleted = workoutMilestone.description.match(/Recently completed: ([^.]+)\./)?.[1];

  return (
    <section className="panel achievement-panel">
      <div className="panel-header">
        <div>
          <h2>Achievements</h2>
          <span>{unlockedCount > 0 ? `${unlockedCount} unlocked` : "First milestone waiting"}</span>
        </div>
        <button className="secondary-button" onClick={() => setIsExpanded((current) => !current)} type="button">
          {isExpanded ? "Show less" : "Details"}
        </button>
      </div>

      <article className={workoutMilestone.is_unlocked ? "achievement-focus complete" : "achievement-focus"}>
        <div>
          <p className="recommendation-title">Current milestone</p>
          <h3>{workoutMilestone.name}</h3>
          <p className="muted">{workoutMilestone.description.split(" Recently completed:")[0]}</p>
        </div>

        <div className="mini-progress">
          <span>
            {progress} of {workoutMilestone.target_amount} {workoutMilestone.unit}
          </span>
          <div className="mini-progress-track">
            <div className="mini-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <strong>{Math.round(progressPercent)}% complete</strong>
        </div>
      </article>

      {isExpanded && (
        <div className="achievement-expanded">
          <div className="achievement-detail-grid">
            <div>
              <span>Progress</span>
              <strong>{Math.round(progressPercent)}%</strong>
            </div>
            <div>
              <span>Next target</span>
              <strong>{workoutMilestone.target_amount.toLocaleString()} workouts</strong>
            </div>
            <div>
              <span>Recently completed</span>
              <strong>{recentlyCompleted ?? "None yet"}</strong>
            </div>
          </div>

          {otherAchievements.length > 0 && (
            <div className="game-list">
              {otherAchievements.map((achievement) => (
                <article className={achievement.is_unlocked ? "game-item complete" : "game-item"} key={achievement.id}>
                  <div>
                    <p className="game-item-title">{achievement.name}</p>
                    <p className="muted">{achievement.description}</p>
                  </div>
                  <div className="mini-progress">
                    <span>
                      {getProgress(achievement)} / {achievement.target_amount} {achievement.unit}
                    </span>
                    <div className="mini-progress-track">
                      <div className="mini-progress-fill" style={{ width: `${getProgressPercent(achievement)}%` }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
