import type { Badge } from "../types";

type BadgeListProps = {
  badges: Badge[];
};

export default function BadgeList({ badges }: BadgeListProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Badges</h2>
        <span>{badges.filter((badge) => badge.is_earned).length} earned</span>
      </div>

      <div className="badge-grid">
        {badges.map((badge) => (
          <article
            className={badge.is_earned ? "badge-card earned" : "badge-card"}
            key={badge.id}
          >
            <strong>{badge.name}</strong>
            <p className="muted">{badge.description}</p>
            <span>{badge.is_earned ? "Earned" : `Level ${badge.min_level}`}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
