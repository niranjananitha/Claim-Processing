"""Application configuration, loaded from the git-ignored .env file."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = ""
    db_name: str = "claims_database"

    jwt_secret: str = "change-me"
    access_token_ttl_min: int = 15
    refresh_token_ttl_days: int = 7

    cors_origins: str = "http://localhost:3000"

    seed_client_password: str = "Client#12345"
    seed_agent_password: str = "Agent#12345"
    seed_manager_password: str = "Manager#12345"

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def upload_root(self) -> Path:
        return BACKEND_ROOT / "uploads"

    @property
    def model_dir(self) -> Path:
        return BACKEND_ROOT / "model"


@lru_cache
def get_settings() -> Settings:
    return Settings()
