from dataclasses import dataclass

from app.models import Workout


STRENGTH_EXERCISES = {
    "pushup",
    "situp",
    "pullup",
    "dip",
    "bodyweight_squat",
    "lunge",
    "bench_press",
    "back_squat",
    "deadlift",
    "shoulder_press",
    "barbell_row",
    "lat_pulldown",
}
PRIMARY_ENDURANCE_EXERCISES = {"running", "swimming", "cycling", "rowing"}
ENDURANCE_EXERCISES = PRIMARY_ENDURANCE_EXERCISES | {"walking"}


@dataclass
class TrainingRecommendation:
    goal: str
    exercise_type: str
    title: str
    recommendation: str
    reason: str


def get_recent_workouts(workouts: list[Workout], limit: int = 5) -> list[Workout]:
    return sorted(workouts, key=lambda workout: (workout.date, workout.id), reverse=True)[:limit]


def get_best_workout_for_goal(workouts: list[Workout], goal: str) -> Workout | None:
    goal_key = goal.lower()

    if goal_key in {"strength", "build strength", "muscle"}:
        allowed_exercises = STRENGTH_EXERCISES
    elif goal_key in {"endurance", "run farther", "cardio"}:
        allowed_exercises = ENDURANCE_EXERCISES
    else:
        return max(workouts, key=lambda workout: workout.date, default=None)

    if goal_key in {"endurance", "run farther", "cardio"}:
        matching_workouts = [
            workout
            for workout in workouts
            if workout.exercise_type.lower() in PRIMARY_ENDURANCE_EXERCISES
        ]
        if not matching_workouts:
            matching_workouts = [
                workout
                for workout in workouts
                if workout.exercise_type.lower() in allowed_exercises
            ]
    else:
        matching_workouts = [
            workout for workout in workouts if workout.exercise_type.lower() in allowed_exercises
        ]

    if not matching_workouts:
        return None

    return max(matching_workouts, key=lambda workout: workout.amount)


def get_workouts_by_type(workouts: list[Workout], allowed_exercises: set[str]) -> list[Workout]:
    return [
        workout
        for workout in workouts
        if workout.exercise_type.lower() in allowed_exercises
    ]


def recommend_strength_workout(workout: Workout, goal: str) -> TrainingRecommendation:
    exercise_type = workout.exercise_type.lower()

    if exercise_type == "pullup":
        target_reps = max(1, int(workout.amount * 0.5))
    else:
        target_reps = max(5, int(workout.amount * 0.5))

    progression_note = {
        "pushup": "Add reps first, then progress toward harder pushup variations or gym presses.",
        "situp": "Keep the reps controlled and later pair them with planks or loaded core work.",
        "pullup": "Small rep increases are enough; later pair them with rows or pulldowns.",
    }.get(exercise_type, "Build volume gradually.")

    return TrainingRecommendation(
        goal=goal,
        exercise_type=exercise_type,
        title=f"Build {exercise_type} volume",
        recommendation=f"Try 5 sets x {target_reps} {exercise_type}s.",
        reason=(
            f"Your best recent {exercise_type} workout is {workout.amount:g} reps. "
            f"Using about half of that per set builds practice volume without maxing out. {progression_note}"
        ),
    )


def recommend_endurance_workout(workout: Workout, goal: str) -> TrainingRecommendation:
    exercise_type = workout.exercise_type.lower()

    if exercise_type == "running":
        next_distance = round(workout.amount * 1.1, 1)
        return TrainingRecommendation(
            goal=goal,
            exercise_type=exercise_type,
            title="Increase distance gradually",
            recommendation=f"Try a comfortable {next_distance:g} km run next.",
            reason=(
                f"Your best recent run is {workout.amount:g} km. "
                "A small increase helps endurance improve without jumping too fast."
            ),
        )

    if exercise_type == "swimming":
        next_distance = round(workout.amount * 1.08, 2)
        return TrainingRecommendation(
            goal=goal,
            exercise_type=exercise_type,
            title="Build swim endurance",
            recommendation=f"Try a smooth {next_distance:g} km swim and keep the pace relaxed.",
            reason=(
                f"Your best recent swim is {workout.amount:g} km. "
                "Swimming progress should be gradual because technique and breathing matter."
            ),
        )

    if exercise_type == "cycling":
        next_distance = round(workout.amount * 1.15, 1)
        return TrainingRecommendation(
            goal=goal,
            exercise_type=exercise_type,
            title="Extend your ride",
            recommendation=f"Try a comfortable {next_distance:g} km ride next.",
            reason=(
                f"Your best recent ride is {workout.amount:g} km. "
                "Cycling can progress a little faster than running when the effort stays comfortable."
            ),
        )

    next_steps = int(workout.amount + 1000)
    return TrainingRecommendation(
        goal=goal,
        exercise_type=exercise_type,
        title="Add a little more walking volume",
        recommendation=f"Try walking {next_steps} steps next.",
        reason=(
            f"Your best recent walk is {int(workout.amount)} steps. "
            "Adding 1000 steps is a simple gradual progression."
        ),
    )


def recommend_general_fitness_workout(workouts: list[Workout], goal: str) -> TrainingRecommendation:
    strength_count = len(get_workouts_by_type(workouts, STRENGTH_EXERCISES))
    endurance_count = len(get_workouts_by_type(workouts, ENDURANCE_EXERCISES))
    walking_steps = sum(
        workout.amount
        for workout in workouts
        if workout.exercise_type.lower() == "walking"
    )

    if strength_count == 0:
        focus = "strength balance"
        action = (
            "Build overall fitness with light strength practice and easy cardio: "
            "3000-5000 walking steps plus 2-3 easy rounds of pushups, squats, "
            "rows or pullups, and core work at RPE 6/10."
        )
    elif endurance_count == 0:
        focus = "endurance baseline"
        action = (
            "Build overall fitness with easy endurance/cardio plus light strength: "
            "do 20-30 minutes of running, cycling, swimming, or rowing, then add "
            "brief mobility or core work."
        )
    else:
        focus = "weekly consistency"
        action = (
            "Build overall balance with easy cardio, light strength or accessory "
            "work, and mobility so consistency improves without adding a hard day."
        )

    return TrainingRecommendation(
        goal=goal,
        exercise_type="walking",
        title="Overall fitness check-in",
        recommendation=action,
        reason=(
            "General Fitness reviews the whole pattern instead of copying a "
            f"single workout type: {strength_count} strength session(s), "
            f"{endurance_count} endurance session(s), and {int(walking_steps)} "
            f"walking steps recently. Today's focus is {focus}."
        ),
    )


def recommend_starter_workout(goal: str) -> TrainingRecommendation:
    goal_key = goal.lower()

    if goal_key in {"endurance", "run farther", "cardio"}:
        return TrainingRecommendation(
            goal=goal,
            exercise_type="running",
            title="Start with a timed cardio baseline",
            recommendation="Try a 1 km easy run, swim, or ride and record your time.",
            reason="No matching endurance history exists yet, so FitQuest starts with a low-risk baseline.",
        )

    if goal_key in {"strength", "build strength", "muscle"}:
        return TrainingRecommendation(
            goal=goal,
            exercise_type="pushup",
            title="Start with simple strength volume",
            recommendation="Try 3 rounds of 8 pushups, 12 situps, and 3 controlled pullup negatives.",
            reason="No matching strength history exists yet, so FitQuest starts with a beginner-friendly bodyweight circuit.",
        )

    return TrainingRecommendation(
        goal=goal,
        exercise_type="walking",
        title="Overall fitness baseline",
        recommendation=(
            "Start with 3000-5000 walking steps and 2 easy rounds of pushups, "
            "squats, and core work. Keep it comfortable and log what you do."
        ),
        reason=(
            "General Fitness starts with a broad baseline across movement, "
            "strength, mobility, and consistency before specializing."
        ),
    )


def create_training_recommendation(
    workouts: list[Workout],
    goal: str,
) -> TrainingRecommendation:
    recent_workouts = get_recent_workouts(workouts)
    best_workout = get_best_workout_for_goal(recent_workouts, goal)

    if best_workout is None:
        return recommend_starter_workout(goal)

    if goal.lower() not in {"strength", "build strength", "muscle", "endurance", "run farther", "cardio"}:
        return recommend_general_fitness_workout(recent_workouts, goal)

    if best_workout.exercise_type.lower() in STRENGTH_EXERCISES:
        return recommend_strength_workout(best_workout, goal)

    return recommend_endurance_workout(best_workout, goal)
