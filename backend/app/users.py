from sqlalchemy.orm import Session

from app.models import User


def get_or_create_demo_user(db: Session) -> User:
    user = db.query(User).filter(User.username == "demo_user").first()

    if user:
        return user

    user = User(
        username="demo_user",
        age=25,
        weight=70,
        height=175,
        fitness_level="beginner",
        total_xp=0,
        level=1,
        streak=0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
