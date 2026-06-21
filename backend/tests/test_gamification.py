import unittest

from app.gamification import (
    calculate_level,
    calculate_level_progress,
    calculate_pullup_xp,
    calculate_pushup_xp,
    calculate_running_xp,
    calculate_situp_xp,
    calculate_swimming_xp,
    calculate_cycling_xp,
    calculate_walking_xp,
    calculate_workout_xp,
    xp_required_for_level,
)


class GamificationTests(unittest.TestCase):
    def test_running_xp(self):
        self.assertEqual(calculate_running_xp(1), 50)
        self.assertEqual(calculate_running_xp(2.5), 125)

    def test_swimming_xp(self):
        self.assertEqual(calculate_swimming_xp(1), 80)
        self.assertEqual(calculate_swimming_xp(1.5), 120)

    def test_cycling_xp(self):
        self.assertEqual(calculate_cycling_xp(10), 250)

    def test_walking_xp(self):
        self.assertEqual(calculate_walking_xp(1000), 20)
        self.assertEqual(calculate_walking_xp(2500), 50)

    def test_pushup_xp(self):
        self.assertEqual(calculate_pushup_xp(50), 50)

    def test_situp_xp(self):
        self.assertEqual(calculate_situp_xp(40), 40)

    def test_pullup_xp(self):
        self.assertEqual(calculate_pullup_xp(10), 50)

    def test_workout_xp_uses_exercise_type(self):
        self.assertEqual(calculate_workout_xp("running", 3), 150)
        self.assertEqual(calculate_workout_xp("swimming", 1), 80)
        self.assertEqual(calculate_workout_xp("cycling", 10), 250)
        self.assertEqual(calculate_workout_xp("walking", 3000), 60)
        self.assertEqual(calculate_workout_xp("pushup", 25), 25)
        self.assertEqual(calculate_workout_xp("situp", 30), 30)
        self.assertEqual(calculate_workout_xp("pullup", 6), 30)

    def test_workout_xp_rejects_unknown_exercise(self):
        with self.assertRaises(ValueError):
            calculate_workout_xp("jumping_jack", 20)

    def test_workout_xp_rejects_zero_or_negative_amount(self):
        with self.assertRaises(ValueError):
            calculate_workout_xp("pushup", 0)

        with self.assertRaises(ValueError):
            calculate_workout_xp("pushup", -5)

    def test_level_calculation(self):
        self.assertEqual(calculate_level(0), 1)
        self.assertEqual(calculate_level(99), 1)
        self.assertEqual(calculate_level(100), 2)
        self.assertEqual(calculate_level(300), 3)
        self.assertEqual(calculate_level(600), 4)
        self.assertEqual(calculate_level(1000), 5)

    def test_xp_required_for_next_level_is_linear(self):
        self.assertEqual(xp_required_for_level(1), 100)
        self.assertEqual(xp_required_for_level(2), 200)
        self.assertEqual(xp_required_for_level(3), 300)
        self.assertEqual(xp_required_for_level(50), 5000)

    def test_level_progress(self):
        self.assertEqual(
            calculate_level_progress(350),
            {"level": 3, "current_xp": 50, "needed_xp": 300},
        )

    def test_level_rejects_negative_xp(self):
        with self.assertRaises(ValueError):
            calculate_level(-1)


if __name__ == "__main__":
    unittest.main()
