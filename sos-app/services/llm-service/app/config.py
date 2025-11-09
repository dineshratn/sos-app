"""
Configuration settings for LLM Service
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Server
    PORT: int = 3007
    HOST: str = "0.0.0.0"
    ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # OpenAI (Primary LLM)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_MAX_TOKENS: int = 1000
    OPENAI_TEMPERATURE: float = 0.3

    # Anthropic (Fallback LLM)
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-sonnet-20240229"
    ANTHROPIC_MAX_TOKENS: int = 1000

    # Redis Cache
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = "redis123"
    REDIS_DB: int = 2
    CACHE_TTL: int = 3600

    # Security
    JWT_SECRET: str = "dev-secret-key-change-in-production"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8080"

    # Feature Flags
    ENABLE_CACHING: bool = True
    ENABLE_PII_ANONYMIZATION: bool = True
    ENABLE_FALLBACK_RESPONSES: bool = True

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
