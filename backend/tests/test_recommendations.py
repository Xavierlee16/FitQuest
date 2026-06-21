import unittest
from datetime import date

try:
    from app.models import Workout
    from app.recommendations import create_training_recommendation
except ModuleNotFoundError as error:
    if error.name == "sqlalchemy":
        raise unittest.SkipTest("SQLAlchemy is not installed in this runtime.")
    raise


def make_workout(exercise_type: str, amount: float, workout_id: int = 1) -> Workout:
    return Workout(
        id=workout_id,
        user_id=1,
        exercise_type=exercise_type,
        amount=amount,
        unit="reps",
        duration=None,
        difficulty="normal",
        date=date.today(),
        xp_earned=0,
    )


class RecommendationTests(unittest.TestCase):
    def test_pushup_recommendation_uses_half_of_recent_max(self):
        recommendation = create_training_recommendation(
            [make_workout("pushup", 20)],
            "strength",
        )

        self.assertEqual(recommendation.exercise_type, "pushup")
        self.assertIn("5 sets x 10 pushups", recommendation.recommendation)

    def test_running_recommendation_increases_distance_gradually(self):
        recommendation = create_training_recommendation(
            [make_workout("running", 3)],
            "endurance",
        )

        self.assertEqual(recommendation.exercise_type, "running")
        self.assertIn("3.3 km", recommendation.recommendation)

    def test_swimming_recommendation_uses_swim_progression(self):
        recommendation = create_training_recommendation(
            [make_workout("swimming", 1)],
            "endurance",
        )

        self.assertEqual(recommendation.exercise_type, "swimming")
        self.assertIn("1.08 km", recommendation.recommendation)

    def test_cycling_recommendation_uses_ride_progression(self):
        recommendation = create_training_recommendation(
            [make_workout("cycling", 20)],
            "endurance",
        )

        self.assertEqual(recommendation.exercise_type, "cycling")
        self.assertIn("23 km", recommendation.recommendation)

    def test_empty_history_returns_starter_recommendation(self):
        recommendation = create_training_recommendation([], "strength")

        self.assertEqual(recommendation.exercise_type, "pushup")
        self.assertIn("3 rounds", recommendation.recommendation)

    def test_general_strength_and_endurance_are_distinct(self):
        workouts = [
            make_workout("pushup", 30, workout_id=1),
            make_workout("running", 5, workout_id=2),
            make_workout("walking", 5000, workout_id=3),
        ]

        general = create_training_recommendation(workouts, "general fitness")
        strength = create_training_recommendation(workouts, "strength")
        endurance = create_training_recommendation(workouts, "endurance")

        self.assertEqual(general.title, "Overall fitness check-in")
        self.assertIn("whole pattern", general.reason)
        self.assertIn("sets", strength.recommendation)
        self.assertIn("km", endurance.recommendation)
        self.assertNotEqual(general.recommendation, strength.recommendation)
        self.assertNotEqual(general.recommendation, endurance.recommendation)
        self.assertNotEqual(strength.recommendation, endurance.recommendation)

    def test_general_fitness_does_not_copy_strength_when_strength_is_missing(self):
        recommendation = create_training_recommendation(
            [make_workout("running", 3)],
            "general fitness",
        )

        self.assertEqual(recommendation.title, "Overall fitness check-in")
        self.assertIn("strength", recommendation.recommendation.lower())
        self.assertNotIn("Try 5 sets", recommendation.recommendation)


if __name__ == "__main__":
    unittest.main()
