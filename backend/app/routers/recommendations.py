from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Workout
from app.recommendations import create_training_recommendation
from app.schemas import RecommendationRequest, RecommendationResponse


router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("", response_model=RecommendationResponse)
def get_training_recommendation(
    request: RecommendationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RecommendationResponse:
    workouts = db.query(Workout).filter(Workout.user_id == user.id).all()
    recommendation = create_training_recommendation(workouts, request.goal)

    return RecommendationResponse(
        goal=recommendation.goal,
        exercise_type=recommendation.exercise_type,
        title=recommendation.title,
        recommendation=recommendation.recommendation,
        reason=recommendation.reason,
    )
