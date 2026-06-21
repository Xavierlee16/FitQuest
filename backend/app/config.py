import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


def get_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    return value.lower() in {"1", "true", "yes", "on"}


def get_list_env(name: str, default: list[str]) -> list[str]:
    value = os.getenv(name)
    if not value:
        return default

    return [item.strip() for item in value.split(",") if item.strip()]


class Settings:
    app_name: str = os.getenv("APP_NAME", "FitQuest API")
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'fitquest.db'}")
    cors_origins: list[str] = get_list_env(
        "CORS_ORIGINS",
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:4173",
            "null",
        ],
    )
    enable_docs: bool = get_bool_env("ENABLE_DOCS", True)

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


settings = Settings()
