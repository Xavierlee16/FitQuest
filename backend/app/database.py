from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import settings


connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def create_database_tables() -> None:
    """Create all database tables defined by the SQLAlchemy models."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Provide a database session to API endpoints."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
