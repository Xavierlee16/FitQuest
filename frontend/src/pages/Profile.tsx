import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { useGame } from "../hooks/useGame";

import type { AuthUser, Badge, WorkoutStats } from "../types";

type ProfileProps = {
  age: number;
  authUser: AuthUser;
  gameRefreshKey: number;
  onAgeChange: (age: number) => void;
  onLogout: () => void;
  onNameChange: (name: string) => Promise<void>;
  onPasswordChange: (currentPassword: string, newPassword: string) => Promise<void>;
  stats: WorkoutStats | null;
};

function getBestBadge(badges: Badge[]): Badge | null {
  const earnedBadges = badges.filter((badge) => badge.is_earned);
  if (earnedBadges.length === 0) {
    return null;
  }

  return earnedBadges.reduce((best, badge) =>
    badge.min_level > best.min_level ? badge : best,
  );
}

function getNextBadge(badges: Badge[], level: number): Badge | null {
  const nextBadges = badges
    .filter((badge) => !badge.is_earned && badge.min_level > level)
    .sort((a, b) => a.min_level - b.min_level);

  return nextBadges[0] ?? null;
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "FQ"
  );
}

function formatAccountDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function Profile({
  age,
  authUser,
  gameRefreshKey,
  onAgeChange,
  onLogout,
  onNameChange,
  onPasswordChange,
  stats,
}: ProfileProps) {
  const { game, loading } = useGame(gameRefreshKey);
  const [ageDraft, setAgeDraft] = useState(String(age));
  const [nameDraft, setNameDraft] = useState(authUser.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [formError, setFormError] = useState("");

  const level = game?.level ?? 1;
  const totalXp = game?.total_xp ?? 0;
  const bestBadge = getBestBadge(game?.badges ?? []);
  const nextBadge = getNextBadge(game?.badges ?? [], level);
  const activeAchievement = game?.achievements[0] ?? null;
  const achievementPercent = activeAchievement
    ? Math.min(100, Math.round((activeAchievement.progress_amount / activeAchievement.target_amount) * 100))
    : 0;

  useEffect(() => {
    setAgeDraft(String(age));
  }, [age]);

  useEffect(() => {
    setNameDraft(authUser.name);
  }, [authUser.name]);

  function handleAgeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    const nextAge = Number(ageDraft);
    if (Number.isFinite(nextAge) && nextAge > 0) {
      onAgeChange(nextAge);
    }
  }

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setStatusMessage("");
    try {
      await onNameChange(nameDraft);
      setStatusMessage("Display name updated.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not update display name.");
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setStatusMessage("");
    try {
      await onPasswordChange(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setStatusMessage("Password changed. Please log in again.");
      window.setTimeout(onLogout, 700);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not change password.");
    }
  }

  return (
    <section className="page narrow-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Profile</p>
          <h1>{authUser.name}</h1>
        </div>
      </header>

      {loading ? (
        <p className="status-text">Loading profile...</p>
      ) : (
        <>
          <section className="panel profile-panel">
            <div className="profile-avatar">{getInitials(authUser.name)}</div>
            <div>
              <div className="profile-name-row">
                <h2>{authUser.name}</h2>
                <span className={bestBadge ? "profile-medal earned" : "profile-medal"}>
                  {bestBadge ? bestBadge.name : "No medal yet"}
                </span>
              </div>
              <p className="muted">{authUser.email}</p>
              <p className="profile-next-medal">Account created {formatAccountDate(authUser.created_at)}</p>
              {nextBadge && (
                <p className="profile-next-medal">
                  Next medal: {nextBadge.name} at level {nextBadge.min_level}
                </p>
              )}
            </div>
          </section>

          {activeAchievement && (
            <section className="panel achievement-profile-card">
              <div className="panel-header">
                <div>
                  <span>Achievement progress</span>
                  <h2>{activeAchievement.name}</h2>
                </div>
                <strong>{achievementPercent}%</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${achievementPercent}%` }} />
              </div>
              <p className="muted">
                {activeAchievement.progress_amount} / {activeAchievement.target_amount}{" "}
                {activeAchievement.unit}
              </p>
            </section>
          )}

          <section className="panel form-panel">
            <label>
              Age
              <input
                min="1"
                onChange={(event) => setAgeDraft(event.target.value)}
                onKeyDown={handleAgeKeyDown}
                type="number"
                value={ageDraft}
              />
              <span className="field-help">Press Enter to save age and refresh recommendations.</span>
            </label>
          </section>

          <section className="panel form-panel">
            <form className="form-panel" onSubmit={handleNameSubmit}>
              <label>
                Display name
                <input
                  onChange={(event) => setNameDraft(event.target.value)}
                  placeholder="Your name"
                  value={nameDraft}
                />
              </label>
              <button className="secondary-button" type="submit">
                Update name
              </button>
            </form>
          </section>

          <section className="panel form-panel">
            <form className="form-panel" onSubmit={handlePasswordSubmit}>
              <label>
                Current password
                <input
                  autoComplete="current-password"
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  type="password"
                  value={currentPassword}
                />
              </label>
              <label>
                New password
                <input
                  autoComplete="new-password"
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 8 characters with letters and numbers"
                  type="password"
                  value={newPassword}
                />
              </label>
              <button className="secondary-button" type="submit">
                Change password
              </button>
            </form>
            {statusMessage && <p className="form-message">{statusMessage}</p>}
            {formError && <p className="form-error">{formError}</p>}
          </section>

          <section className="panel profile-details">
            <div>
              <span>Total workouts</span>
              <strong>{stats?.total_workouts ?? 0}</strong>
            </div>

            <div>
              <span>Total XP</span>
              <strong>{totalXp}</strong>
            </div>

            <div>
              <span>Current level</span>
              <strong>{level}</strong>
            </div>

            <div>
              <span>Current streak</span>
              <strong>{stats?.streak ?? 0} days</strong>
            </div>
          </section>

          <button className="secondary-button" onClick={onLogout} type="button">
            Log out
          </button>
        </>
      )}
    </section>
  );
}
