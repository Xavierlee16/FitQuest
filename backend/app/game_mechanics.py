from datetime import date
from sqlalchemy.orm import Session

from app.gamification import calculate_level
from app.models import (
    Achievement,
    Badge,
    DailyQuest,
    User,
    UserAchievement,
    UserBadge,
    UserDailyQuest,
    Workout,
)


# =========================
# DEFAULT GAME CONTENT
# =========================

DEFAULT_ACHIEVEMENTS = [
    {
        "code": "first_workout",
        "name": "First Workout",
        "description": "Complete your first workout.",
        "rule_type": "workout_count",
        "exercise_type": None,
        "target_amount": 1,
        "unit": "workouts",
    },
    {
        "code": "pushups_100",
        "name": "100 Pushups Completed",
        "description": "Complete 100 total pushups.",
        "rule_type": "exercise_total",
        "exercise_type": "pushup",
        "target_amount": 100,
        "unit": "reps",
    },
    {
        "code": "running_10km",
        "name": "10km Total Running",
        "description": "Run 10 total kilometers.",
        "rule_type": "exercise_total",
        "exercise_type": "running",
        "target_amount": 10,
        "unit": "km",
    },
    {
        "code": "streak_7_days",
        "name": "7 Day Streak",
        "description": "Maintain a 7 day workout streak.",
        "rule_type": "streak",
        "exercise_type": None,
        "target_amount": 7,
        "unit": "days",
    },
]


DEFAULT_BADGES = [
    {
        "code": "bronze",
        "name": "Bronze",
        "description": "Reach level 10.",
        "min_level": 10,
    },
    {
        "code": "silver",
        "name": "Silver",
        "description": "Reach level 25.",
        "min_level": 25,
    },
    {
        "code": "gold",
        "name": "Gold",
        "description": "Reach level 50.",
        "min_level": 50,
    },
]


DEFAULT_DAILY_QUESTS = [
    {
        "code": "walk_5000_steps",
        "name": "Walk 5000 Steps",
        "description": "Walk 5000 steps today.",
        "exercise_type": "walking",
        "target_amount": 5000,
        "unit": "steps",
        "xp_reward": 25,
    },
    {
        "code": "complete_50_pushups",
        "name": "Complete 50 Pushups",
        "description": "Complete 50 pushups today.",
        "exercise_type": "pushup",
        "target_amount": 50,
        "unit": "reps",
        "xp_reward": 25,
    },
]


# =========================
# SEED DATABASE
# =========================

def seed_game_content(db: Session):

    for item in DEFAULT_ACHIEVEMENTS:
        exists = (
            db.query(Achievement)
            .filter(Achievement.code == item["code"])
            .first()
        )

        if not exists:
            db.add(Achievement(**item))


    for item in DEFAULT_BADGES:
        exists = (
            db.query(Badge)
            .filter(Badge.code == item["code"])
            .first()
        )

        if not exists:
            db.add(Badge(**item))
        else:
            exists.name = item["name"]
            exists.description = item["description"]
            exists.min_level = item["min_level"]


    for item in DEFAULT_DAILY_QUESTS:
        exists = (
            db.query(DailyQuest)
            .filter(DailyQuest.code == item["code"])
            .first()
        )

        if not exists:
            db.add(DailyQuest(**item))


    db.commit()



# =========================
# ACHIEVEMENTS
# =========================


def get_exercise_total(workouts, exercise_type):

    return sum(
        w.amount
        for w in workouts
        if w.exercise_type
        and w.exercise_type.lower() == exercise_type
    )


def get_achievement_progress(
    achievement,
    user,
    workouts
):

    if achievement.rule_type == "workout_count":
        return len(workouts)


    if achievement.rule_type == "exercise_total":
        return get_exercise_total(
            workouts,
            achievement.exercise_type
        )


    if achievement.rule_type == "streak":
        return user.streak


    return 0



def award_eligible_achievements(
    db,
    user,
    workouts
):

    achievements = db.query(Achievement).all()


    earned = {
        x.achievement_id
        for x in db.query(UserAchievement)
        .filter(UserAchievement.user_id == user.id)
        .all()
    }


    for achievement in achievements:

        progress = get_achievement_progress(
            achievement,
            user,
            workouts
        )


        if (
            progress >= achievement.target_amount
            and achievement.id not in earned
        ):

            db.add(
                UserAchievement(
                    user_id=user.id,
                    achievement_id=achievement.id,
                    unlocked_at=date.today()
                )
            )



# =========================
# BADGES
# =========================


def award_eligible_badges(
    db,
    user
):

    badges = db.query(Badge).all()


    earned = {
        x.badge_id
        for x in db.query(UserBadge)
        .filter(UserBadge.user_id == user.id)
        .all()
    }


    for badge in badges:

        if (
            user.level >= badge.min_level
            and badge.id not in earned
        ):

            db.add(
                UserBadge(
                    user_id=user.id,
                    badge_id=badge.id,
                    earned_at=date.today()
                )
            )



# =========================
# DAILY QUESTS
# =========================


def update_daily_quest_progress(
    db,
    user,
    workouts
):

    today = date.today()


    quests = (
        db.query(DailyQuest)
        .filter(DailyQuest.is_active.is_(True))
        .all()
    )


    for quest in quests:


        progress = sum(
            w.amount
            for w in workouts
            if w.date == today
            and w.exercise_type.lower()
            == quest.exercise_type
        )


        user_quest = (
            db.query(UserDailyQuest)
            .filter(
                UserDailyQuest.user_id == user.id,
                UserDailyQuest.quest_id == quest.id,
                UserDailyQuest.quest_date == today
            )
            .first()
        )


        if not user_quest:

            user_quest = UserDailyQuest(
                user_id=user.id,
                quest_id=quest.id,
                quest_date=today,
                progress_amount=0,
                is_completed=False
            )

            db.add(user_quest)



        user_quest.progress_amount = progress



        if (
            progress >= quest.target_amount
            and not user_quest.is_completed
        ):

            user_quest.is_completed = True
            user_quest.completed_at = today

            user.total_xp += quest.xp_reward

            user.level = calculate_level(
                user.total_xp
            )



# =========================
# MAIN UPDATE
# =========================


def update_game_progress(
    db: Session,
    user: User,
    workouts=None
):


    if workouts is None:

        workouts = (
            db.query(Workout)
            .filter(
                Workout.user_id == user.id
            )
            .all()
        )


    update_daily_quest_progress(
        db,
        user,
        workouts
    )


    user.level = calculate_level(
        user.total_xp
    )


    award_eligible_achievements(
        db,
        user,
        workouts
    )


    award_eligible_badges(
        db,
        user
    )


    db.commit()
