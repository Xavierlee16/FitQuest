import unittest
from datetime import date

try:
    from app.game_mechanics import (
        DEFAULT_ACHIEVEMENTS,
        DEFAULT_BADGES,
        DEFAULT_DAILY_QUESTS,
        get_achievement_progress,
        get_exercise_total,
    )
    from app.models import Achievement, User, Workout
except ModuleNotFoundError as error:
    if error.name == "sqlalchemy":
        raise unittest.SkipTest("SQLAlchemy is not installed in this runtime.")
    raise


def make_workout(exercise_type: str, amount: float) -> Workout:
    return Workout(
        user_id=1,
        exercise_type=exercise_type,
        amount=amount,
        unit="reps",
        duration=None,
        difficulty="normal",
        date=date.today(),
        xp_earned=0,
    )


class GameMechanicsTests(unittest.TestCase):
    def test_default_game_content_exists(self):
        achievement_codes = {achievement["code"] for achievement in DEFAULT_ACHIEVEMENTS}
        badge_codes = {badge["code"] for badge in DEFAULT_BADGES}
        quest_codes = {quest["code"] for quest in DEFAULT_DAILY_QUESTS}

        self.assertIn("first_workout", achievement_codes)
        self.assertIn("pushups_100", achievement_codes)
        self.assertIn("running_10km", achievement_codes)
        self.assertIn("streak_7_days", achievement_codes)
        self.assertEqual(badge_codes, {"bronze", "silver", "gold"})
        self.assertIn("walk_5000_steps", quest_codes)
        self.assertIn("complete_50_pushups", quest_codes)

    def test_exercise_total_counts_matching_exercise_only(self):
        workouts = [
            make_workout("pushup", 40),
            make_workout("pushup", 60),
            make_workout("situp", 30),
        ]

        self.assertEqual(get_exercise_total(workouts, "pushup"), 100)

    def test_workout_count_achievement_progress(self):
        achievement = Achievement(
            code="first_workout",
            name="First Workout",
            description="Complete your first workout.",
            rule_type="workout_count",
            exercise_type=None,
            target_amount=1,
            unit="workouts",
        )
        user = User(username="demo", age=25, weight=70, height=175, fitness_level="beginner")

        self.assertEqual(
            get_achievement_progress(achievement, user, [make_workout("pushup", 10)]),
            1,
        )

    def test_streak_achievement_progress_uses_user_streak(self):
        achievement = Achievement(
            code="streak_7_days",
            name="7 Day Streak",
            description="Keep a workout streak for 7 days.",
            rule_type="streak",
            exercise_type=None,
            target_amount=7,
            unit="days",
        )
        user = User(
            username="demo",
            age=25,
            weight=70,
            height=175,
            fitness_level="beginner",
            streak=7,
        )

        self.assertEqual(get_achievement_progress(achievement, user, []), 7)


if __name__ == "__main__":
    unittest.main()
