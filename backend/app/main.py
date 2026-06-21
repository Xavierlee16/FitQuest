from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importing models registers them with SQLAlchemy so their tables can be created.
from app import models
from app.config import settings
from app.database import SessionLocal, create_database_tables
from app.game_mechanics import seed_game_content
from app.routers import auth
from app.routers import game
from app.routers import recommendations
from app.routers import workouts


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_database_tables()
    with SessionLocal() as db:
        seed_game_content(db)
    yield


app = FastAPI(
    title=settings.app_name,
    description="Backend foundation for the FitQuest fitness gamification app.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url="/redoc" if settings.enable_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workouts.router)
app.include_router(recommendations.router)
app.include_router(game.router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "app": "FitQuest", "environment": settings.app_env}
