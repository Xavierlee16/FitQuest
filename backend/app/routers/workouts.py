from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.game_mechanics import update_game_progress
from app.models import User, Workout
from app.schemas import WorkoutCreate, WorkoutResponse, WorkoutStats
from app.gamification import calculate_level, calculate_workout_xp


router = APIRouter(prefix="/workouts", tags=["workouts"])


def calculate_streak(workout_dates: list[date]) -> int:
    unique_dates = sorted(set(workout_dates), reverse=True)

    if not unique_dates:
        return 0

    streak = 0
    expected_day = date.today()

    for workout_day in unique_dates:
        if workout_day == expected_day:
            streak += 1
            expected_day -= timedelta(days=1)
            continue

        if streak == 0 and workout_day == expected_day - timedelta(days=1):
            expected_day -= timedelta(days=2)
            streak += 1
            continue

        break

    return streak


@router.post("", response_model=WorkoutResponse)
def create_workout(
    workout_data: WorkoutCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Workout:
    xp_earned = calculate_workout_xp(
        workout_data.exercise_type,
        workout_data.amount,
    )

    workout = Workout(
        user_id=user.id,
        exercise_type=workout_data.exercise_type,
        amount=workout_data.amount,
        unit=workout_data.unit,
        duration=workout_data.duration,
        difficulty=workout_data.difficulty,
        date=date.today(),
        xp_earned=xp_earned,
    )

    user.total_xp += xp_earned
    user.level = calculate_level(user.total_xp)

    db.add(workout)
    db.flush()

    workouts = (
        db.query(Workout)
        .filter(Workout.user_id == user.id)
        .all()
    )
    user.streak = calculate_streak([existing_workout.date for existing_workout in workouts])
    update_game_progress(db, user)
    db.commit()
    db.refresh(workout)

    return workout


@router.get("", response_model=list[WorkoutResponse])
def get_workout_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Workout]:
    return (
        db.query(Workout)
        .filter(Workout.user_id == user.id)
        .order_by(Workout.date.desc(), Workout.id.desc())
        .all()
    )


@router.get("/stats", response_model=WorkoutStats)
def get_workout_statistics(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> WorkoutStats:
    workouts = db.query(Workout).filter(Workout.user_id == user.id).all()

    workouts_by_exercise: dict[str, int] = {}
    for workout in workouts:
        workouts_by_exercise[workout.exercise_type] = (
            workouts_by_exercise.get(workout.exercise_type, 0) + 1
        )

    return WorkoutStats(
        total_workouts=len(workouts),
        total_xp=user.total_xp,
        level=user.level,
        streak=user.streak,
        workouts_by_exercise=workouts_by_exercise,
    )
