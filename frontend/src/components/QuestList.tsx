import type { DailyQuest } from "../types";

type QuestListProps = {
  quests: DailyQuest[];
};

export default function QuestList({ quests }: QuestListProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Daily quests</h2>
        <span>{quests.filter((quest) => quest.is_completed).length} complete</span>
      </div>

      <div className="game-list">
        {quests.map((quest) => {
          const progress = Math.min(quest.progress_amount, quest.target_amount);
          const progressPercent =
            quest.target_amount > 0 ? (progress / quest.target_amount) * 100 : 0;

          return (
            <article
              className={quest.is_completed ? "game-item complete" : "game-item"}
              key={quest.id}
            >
              <div>
                <p className="game-item-title">{quest.name}</p>
                <p className="muted">{quest.description}</p>
              </div>
              <div className="mini-progress">
                {quest.is_completed ? (
                  <span>Completed today</span>
                ) : (
                  <>
                    <span>
                      {progress} / {quest.target_amount} {quest.unit} +{quest.xp_reward} XP
                    </span>
                    <div className="mini-progress-track">
                      <div
                        className="mini-progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
