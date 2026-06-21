import { Activity, BarChart3, LogOut, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import type { Page } from "../types";

type AppShellProps = {
  activePage: Page;
  children: ReactNode;
  onLogout: () => void;
  onPageChange: (page: Page) => void;
  userName: string;
};

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "log-workout", label: "Log Workout", icon: Activity },
  { id: "profile", label: "Profile", icon: UserRound },
] as const;

export function AppShell({ activePage, children, onLogout, onPageChange, userName }: AppShellProps) {
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FQ";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">FQ</div>
          <div>
            <p className="brand-name">FitQuest</p>
            <p className="brand-subtitle">Training tracker</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activePage === item.id ? "nav-item active" : "nav-item"}
                key={item.id}
                onClick={() => onPageChange(item.id)}
                type="button"
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-account">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-account-copy">
            <span>Signed in as</span>
            <strong>{userName}</strong>
          </div>
          <button className="logout-button" onClick={onLogout} type="button">
            <LogOut size={17} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
