# backend/app/gamification.py


def calculate_running_xp(kilometers: float) -> int:
    return int(kilometers * 50)


def calculate_swimming_xp(kilometers: float) -> int:
    return int(kilometers * 80)


def calculate_cycling_xp(kilometers: float) -> int:
    return int(kilometers * 25)


def calculate_walking_xp(steps: int) -> int:
    return int((steps / 1000) * 20)


def calculate_pushup_xp(reps: int) -> int:
    return reps


def calculate_situp_xp(reps: int) -> int:
    return reps


def calculate_pullup_xp(reps: int) -> int:
    return reps * 5


def calculate_workout_xp(exercise_type: str, amount: float) -> int:
    exercise_key = exercise_type.lower()

    if amount <= 0:
        raise ValueError("Workout amount must be greater than zero.")

    if exercise_key == "running":
        return calculate_running_xp(amount)

    if exercise_key == "swimming":
        return calculate_swimming_xp(amount)

    if exercise_key == "cycling":
        return calculate_cycling_xp(amount)

    if exercise_key == "walking":
        return calculate_walking_xp(int(amount))

    if exercise_key == "pushup":
        return calculate_pushup_xp(int(amount))

    if exercise_key == "situp":
        return calculate_situp_xp(int(amount))

    if exercise_key == "pullup":
        return calculate_pullup_xp(int(amount))

    raise ValueError(
        f"Unknown exercise type: {exercise_type}"
    )


# -----------------------------
# LEVEL SYSTEM
# -----------------------------

def xp_required_for_level(level: int) -> int:
    """
    XP needed to move from this level
    to the next level.

    Example:
    Level 1 -> 2 = 100 XP
    Level 2 -> 3 = 200 XP
    Level 3 -> 4 = 300 XP
    """

    return level * 100



def calculate_level(total_xp: int) -> int:

    if total_xp < 0:
        raise ValueError(
            "Total XP cannot be negative."
        )

    level = 1
    remaining_xp = total_xp


    while True:

        required = xp_required_for_level(level)


        if remaining_xp < required:
            break


        remaining_xp -= required
        level += 1


    return level



def calculate_level_progress(total_xp: int):

    level = calculate_level(total_xp)


    used_xp = 0

    for lvl in range(1, level):

        used_xp += xp_required_for_level(lvl)


    current_xp = total_xp - used_xp


    needed_xp = xp_required_for_level(level)


    return {
        "level": level,
        "current_xp": current_xp,
        "needed_xp": needed_xp,
    }
