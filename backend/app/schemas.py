from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkoutCreate(BaseModel):
    exercise_group: str | None = None
    exercise_type: str
    amount: float = Field(gt=0)
    unit: str
    duration: float | None = Field(default=None, ge=0)
    sets: int | None = Field(default=None, ge=0)
    reps: int | None = Field(default=None, ge=0)
    weight: float | None = Field(default=None, ge=0)
    weight_unit: str | None = None
    rpe: int | None = Field(default=None, ge=1, le=10)
    difficulty: str = "normal"


class WorkoutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    exercise_type: str
    amount: float
    unit: str
    duration: float | None
    difficulty: str
    date: date
    xp_earned: int


class WorkoutStats(BaseModel):
    total_workouts: int
    total_xp: int
    level: int
    streak: int
    workouts_by_exercise: dict[str, int]


class RecommendationRequest(BaseModel):
    goal: str = "general fitness"


class RecommendationResponse(BaseModel):
    goal: str
    exercise_type: str
    title: str
    recommendation: str
    reason: str


class AchievementResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str
    rule_type: str
    target_amount: float
    unit: str
    progress_amount: float
    is_unlocked: bool
    unlocked_at: date | None


class BadgeResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str
    min_level: int
    is_earned: bool
    earned_at: date | None


class DailyQuestResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str
    exercise_type: str
    target_amount: float
    unit: str
    xp_reward: int
    progress_amount: float
    is_completed: bool
    completed_at: date | None


class GameSummaryResponse(BaseModel):
    level: int
    total_xp: int
    xp_current: int
    xp_needed: int
    achievements: list[AchievementResponse]
    badges: list[BadgeResponse]
    daily_quests: list[DailyQuestResponse]


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2)
    email: str
    password: str = Field(min_length=8)
    goal: str = "general fitness"


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthUserResponse(BaseModel):
    id: int
    name: str
    email: str
    goal: str
    created_at: datetime


class AuthResponse(BaseModel):
    token: str
    user: AuthUserResponse


class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=2)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
