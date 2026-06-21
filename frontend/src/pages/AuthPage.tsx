import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import type { RecommendationGoal } from "../types";

type AuthPageProps = {
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: {
    name: string;
    email: string;
    password: string;
    goal: RecommendationGoal;
  }) => Promise<void>;
  loading: boolean;
  error: string;
};

export function AuthPage({ onLogin, onRegister, loading, error }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [goal, setGoal] = useState<RecommendationGoal>("general fitness");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "login") await onLogin({ email, password });
    else await onRegister({ name, email, password, goal });
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div>
          <p className="eyebrow">FitQuest</p>
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="page-subtitle">
            {mode === "login"
              ? "Sign in to keep your workouts, achievements, and recommendations synced to your account."
              : "Start with a training goal so FitQuest can shape your first recommendations."}
          </p>
        </div>

        <form className="form-panel" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Name
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </label>
          )}

          <label>
            Email
            <input
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
            />
          </label>

          <label>
            Password
            <div className="password-row">
              <input
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                type={showPassword ? "text" : "password"}
              />
              <button className="icon-button" onClick={() => setShowPassword((current) => !current)} type="button">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {mode === "register" && (
            <label>
              Starting goal
              <select value={goal} onChange={(event) => setGoal(event.target.value as RecommendationGoal)}>
                <option value="general fitness">General Fitness</option>
                <option value="strength">Strength</option>
                <option value="endurance">Endurance</option>
              </select>
            </label>
          )}

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <button className="link-button" onClick={() => setMode(mode === "login" ? "register" : "login")} type="button">
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
      </section>
    </main>
  );
}
