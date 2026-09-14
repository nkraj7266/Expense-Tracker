import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_db_name: str = os.getenv("MONGODB_DB_NAME", "expense_tracker")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    port: int = int(os.getenv("PORT", "8000"))
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expires_minutes: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "15"))
    jwt_refresh_token_expires_days: int = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", "30"))
    cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").strip().lower() == "true"
    cookie_domain: str = os.getenv("COOKIE_DOMAIN", "localhost")


@lru_cache
def get_settings() -> Settings:
    return Settings()
