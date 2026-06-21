type Badge = {
  id: number;
  code: string;
  name: string;
  description: string;
  min_level: number;
  is_earned: boolean;
};

export default function BadgeGrid({ badges }: { badges: Badge[] }) {
  return (
    <section className="panel">
      <h2>Badges</h2>

      <div className="badge-grid">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`badge-card ${badge.is_earned ? "earned" : "locked"}`}
          >
            <strong>{badge.name}</strong>
            <p>{badge.description}</p>
            {!badge.is_earned && (
              <small>Requires Level {badge.min_level}</small>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}