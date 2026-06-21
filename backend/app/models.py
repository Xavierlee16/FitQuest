from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    age: Mapped[int] = mapped_column(Integer)
    weight: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    fitness_level: Mapped[str] = mapped_column(String)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    streak: Mapped[int] = mapped_column(Integer, default=0)

    workouts: Mapped[list["Workout"]] = relationship(
        "Workout",
        back_populates="user",
    )
    achievements: Mapped[list["UserAchievement"]] = relationship(
        "UserAchievement",
        back_populates="user",
    )
    badges: Mapped[list["UserBadge"]] = relationship(
        "UserBadge",
        back_populates="user",
    )
    daily_quests: Mapped[list["UserDailyQuest"]] = relationship(
        "UserDailyQuest",
        back_populates="user",
    )


class Workout(Base):
    __tablename__ = "workouts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    exercise_type: Mapped[str] = mapped_column(String)
    amount: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String)
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    difficulty: Mapped[str] = mapped_column(String, default="normal")
    date: Mapped[date] = mapped_column(Date)
    xp_earned: Mapped[int] = mapped_column(Integer)

    user: Mapped[User] = relationship(
        "User",
        back_populates="workouts",
    )


class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    rule_type: Mapped[str] = mapped_column(String)
    exercise_type: Mapped[str | None] = mapped_column(String, nullable=True)
    target_amount: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String)

    users: Mapped[list["UserAchievement"]] = relationship(
        "UserAchievement",
        back_populates="achievement",
    )


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "achievement_id", name="unique_user_achievement"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    achievement_id: Mapped[int] = mapped_column(ForeignKey("achievements.id"))
    unlocked_at: Mapped[date] = mapped_column(Date)

    user: Mapped[User] = relationship("User", back_populates="achievements")
    achievement: Mapped[Achievement] = relationship(
        "Achievement",
        back_populates="users",
    )


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    min_level: Mapped[int] = mapped_column(Integer)

    users: Mapped[list["UserBadge"]] = relationship(
        "UserBadge",
        back_populates="badge",
    )


class UserBadge(Base):
    __tablename__ = "user_badges"
    __table_args__ = (UniqueConstraint("user_id", "badge_id", name="unique_user_badge"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    badge_id: Mapped[int] = mapped_column(ForeignKey("badges.id"))
    earned_at: Mapped[date] = mapped_column(Date)

    user: Mapped[User] = relationship("User", back_populates="badges")
    badge: Mapped[Badge] = relationship("Badge", back_populates="users")


class DailyQuest(Base):
    __tablename__ = "daily_quests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    exercise_type: Mapped[str] = mapped_column(String)
    target_amount: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String)
    xp_reward: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    users: Mapped[list["UserDailyQuest"]] = relationship(
        "UserDailyQuest",
        back_populates="quest",
    )


class UserDailyQuest(Base):
    __tablename__ = "user_daily_quests"
    __table_args__ = (
        UniqueConstraint("user_id", "quest_id", "quest_date", name="unique_daily_quest"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    quest_id: Mapped[int] = mapped_column(ForeignKey("daily_quests.id"))
    quest_date: Mapped[date] = mapped_column(Date)
    progress_amount: Mapped[float] = mapped_column(Float, default=0)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[date | None] = mapped_column(Date, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="daily_quests")
    quest: Mapped[DailyQuest] = relationship("DailyQuest", back_populates="users")


class AuthAccount(Base):
    __tablename__ = "auth_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    goal: Mapped[str] = mapped_column(String, default="general fitness")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship("User")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("auth_accounts.id"))
    token_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)

    account: Mapped[AuthAccount] = relationship("AuthAccount")
