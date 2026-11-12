from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="MITRA_", env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./mitra.db"
    auto_create_schema: bool = False  # tests only; real schema comes from Alembic migrations
    jwt_secret: str = "dev-only-change-me-please-32-bytes-min"
    jwt_ttl_hours: int = 72
    cookie_secure: bool = False
    # AI provider: "gemini" (default when key present) or "none" (rule-based fallback only)
    ai_provider: str = "gemini"
    # Tried in order; on 503/429/404/timeout MITRA fails over to the next model.
    gemini_models: str = "gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.8-flash,gemini-flash-latest"
    gemini_transcribe_model: str = "gemini-3.5-transcribe"
    gemini_timeout_s: float = 15.0

    @property
    def gemini_model(self) -> str:
        return self.gemini_models.split(",")[0].strip()

    @property
    def gemini_chain(self) -> list[str]:
        return [m.strip() for m in self.gemini_models.split(",") if m.strip()]

    # Paytm connectors stay off until approved credentials and terms exist (ADR-004).
    paytm_connector_enabled: bool = False
    # Paytm Payment Links (staging by default). Keep secrets in services/api/.env, never in git.
    paytm_mid: str = ""
    paytm_merchant_key: str = ""
    paytm_env: str = "staging"
    # Offline model (MITRA-Lite) served by services/ml/server.py
    local_model_url: str = "http://127.0.0.1:8090"
    local_model_timeout_s: float = 40.0
    # Fernet key for customer PII. Generate: python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())"
    data_key: str = ""
    max_failed_logins: int = 6
    lockout_minutes: int = 15
    cors_origins: str = "http://localhost:3000,http://localhost:3001"


@lru_cache
def get_settings() -> Settings:
    return Settings()
