from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./webprobe.db"
    SYNC_DATABASE_URL: str = "sqlite:///./webprobe.db"
    CRAWLER_WORKERS: int = 5
    CRAWLER_TIMEOUT: int = 30
    CRAWLER_MAX_RETRIES: int = 3
    CRAWLER_RATE_LIMIT: float = 2.0
    CRAWLER_USER_AGENT: str = "WebProbeBot/1.0"
    CRAWLER_MAX_RESPONSE_SIZE: int = 10 * 1024 * 1024

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
