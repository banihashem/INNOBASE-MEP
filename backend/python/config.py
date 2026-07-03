"""
MEP-light™ — Environment Configuration

Loads and validates environment variables using pydantic-settings.
Supports .env file loading with sensible defaults for local development.

Environment Variables:
  DATABASE_URL          - PostgreSQL connection string (default: SQLite for local dev)
  GOOGLE_CLIENT_ID      - Google OAuth Client ID for OIDC validation
  GOOGLE_CLIENT_SECRET  - Google OAuth Client Secret (optional, for auth code flow)
  JWT_SECRET_KEY        - Fallback secret for local/dev JWT signing
  LOG_LEVEL             - Logging level (default: INFO)
  CORS_ORIGINS          - Comma-separated allowed origins
  PDF_SERVICE_URL       - URL of the ReportLab PDF microservice
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application configuration with environment variable bindings."""

    # ─── Application ──────────────────────────────────────────────
    app_name: str = "MEP-light™ Enterprise API"
    app_version: str = "2.1.0"
    debug: bool = False
    log_level: str = "INFO"

    # ─── Database ─────────────────────────────────────────────────
    database_url: str = "sqlite:///./data/mep_local.db"
    database_echo: bool = False  # SQLAlchemy echo for debug
    cloud_sql_connection: str = ""  # e.g. innobase-mep-light:europe-west2:mep-light-db
    db_name: str = "mep_production"
    db_user: str = "mep_app"
    db_password: str = ""  # Loaded from Secret Manager in production

    # ─── Environment ──────────────────────────────────────────────
    node_env: str = "development"  # Shared with Node.js; "production" in Cloud Run

    # ─── Authentication (Google OIDC) ─────────────────────────────
    google_client_id: str = ""
    google_client_secret: str = ""
    jwt_secret_key: str = "mep-dev-secret-change-in-production"
    jwt_algorithm: str = "RS256"
    jwt_audience: str = ""  # defaults to google_client_id if empty

    # ─── CORS ─────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000,http://localhost:5173,https://mep.innobase.app"

    # ─── PDF Service ──────────────────────────────────────────────
    pdf_service_url: str = "https://mep-light-pdf-service-52156375400.europe-west2.run.app"

    # ─── Observability ────────────────────────────────────────────
    enable_prometheus: bool = True
    log_file_path: str = "logs/app.json"

    # ─── Admin Seeding ────────────────────────────────────────────
    seed_admin_email: str = ""  # Auto-promote this email to Administrator

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def effective_jwt_audience(self) -> str:
        """Use jwt_audience if set, otherwise fall back to google_client_id."""
        return self.jwt_audience or self.google_client_id

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


# Singleton instance
settings = Settings()
