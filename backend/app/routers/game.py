from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.game_mechanics import (
    get_achievement_progress,
    update_game_progress,
)
from app.gamification import calculate_level_progress
from app.models import (
    Achievement,
    Badge,
    DailyQuest,
    UserAchievement,
    UserBadge,
    UserDailyQuest,
    Workout,
    User,
)
from app.schemas import (
    AchievementResponse,
    BadgeResponse,
    DailyQuestResponse,
    GameSummaryResponse,
)

router = APIRouter(prefix="/game", tags=["game"])


def get_user_workouts(db: Session, user_id: int) -> list[Workout]:
    return db.query(Workout).filter(Workout.user_id == user_id).all()


def build_achievement_responses(db: Session, user, workouts) -> list[AchievementResponse]:
    earned_by_id = {
        e.achievement_id: e
        for e in db.query(UserAchievement)
        .filter(UserAchievement.user_id == user.id)
        .all()
    }

    responses = []

    for a in db.query(Achievement).order_by(Achievement.id).all():
        earned = earned_by_id.get(a.id)

        responses.append(
            AchievementResponse(
                id=a.id,
                code=a.code,
                name=a.name,
                description=a.description,
                rule_type=a.rule_type,
                target_amount=a.target_amount,
                unit=a.unit,
                progress_amount=get_achievement_progress(a, user, workouts),
                is_unlocked=earned is not None,
                unlocked_at=earned.unlocked_at if earned else None,
            )
        )

    return responses


def build_badge_responses(db: Session, user) -> list[BadgeResponse]:
    earned_by_id = {
        b.badge_id: b
        for b in db.query(UserBadge)
        .filter(UserBadge.user_id == user.id)
        .all()
    }

    return [
        BadgeResponse(
            id=b.id,
            code=b.code,
            name=b.name,
            description=b.description,
            min_level=b.min_level,
            is_earned=b.id in earned_by_id,
            earned_at=earned_by_id[b.id].earned_at if b.id in earned_by_id else None,
        )
        for b in db.query(Badge).order_by(Badge.min_level).all()
    ]


def build_daily_quest_responses(db: Session, user, workouts) -> list[DailyQuestResponse]:
    today = date.today()

    user_quests = {
        q.quest_id: q
        for q in db.query(UserDailyQuest)
        .filter(
            UserDailyQuest.user_id == user.id,
            UserDailyQuest.quest_date == today,
        )
        .all()
    }

    responses = []

    for q in db.query(DailyQuest).filter(DailyQuest.is_active.is_(True)).all():
        uq = user_quests.get(q.id)

        responses.append(
            DailyQuestResponse(
                id=q.id,
                code=q.code,
                name=q.name,
                description=q.description,
                exercise_type=q.exercise_type,
                target_amount=q.target_amount,
                unit=q.unit,
                xp_reward=q.xp_reward,
                progress_amount=uq.progress_amount if uq else 0,
                is_completed=uq.is_completed if uq else False,
                completed_at=uq.completed_at if uq else None,
            )
        )

    return responses


@router.get("/summary", response_model=GameSummaryResponse)
def get_game_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GameSummaryResponse:
    workouts = get_user_workouts(db, user.id)

    # update XP, streaks, quests, etc
    update_game_progress(db, user, workouts)
    db.commit()

    # 🔥 SINGLE SOURCE OF TRUTH
    level_data = calculate_level_progress(user.total_xp)

    return GameSummaryResponse(
        level=level_data["level"],
        total_xp=user.total_xp,
        xp_current=level_data["current_xp"],
        xp_needed=level_data["needed_xp"],
        achievements=build_achievement_responses(db, user, workouts),
        badges=build_badge_responses(db, user),
        daily_quests=build_daily_quest_responses(db, user, workouts),
    )
