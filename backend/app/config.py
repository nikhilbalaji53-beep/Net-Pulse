from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import json


class Settings(BaseSettings):
    PROJECT_NAME: str = "NetPulse — Intelligent Ping Monitoring System"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api"

    # Security
    SECRET_KEY: str = "netpulse-super-secret-production-key-change-in-production-12345678"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./netpulse.db"

    # Monitoring Defaults
    DEFAULT_PING_INTERVAL: int = 30
    DEFAULT_TIMEOUT: int = 5
    DEFAULT_FAILURE_THRESHOLD: int = 3
    DEFAULT_RECOVERY_THRESHOLD: int = 2

    # Latency & Packet Loss Thresholds
    LATENCY_EXCELLENT_THRESHOLD: float = 50.0
    LATENCY_GOOD_THRESHOLD: float = 100.0
    LATENCY_WARNING_THRESHOLD: float = 200.0
    LATENCY_CRITICAL_THRESHOLD: float = 500.0
    PACKET_LOSS_WARNING_THRESHOLD: float = 5.0
    PACKET_LOSS_CRITICAL_THRESHOLD: float = 20.0

    # Retention
    DATA_RETENTION_DAYS: int = 30

    # Network Security
    ALLOW_PRIVATE_IPS: bool = True

    # Email / SMTP
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "alerts@netpulse.local"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8000"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
