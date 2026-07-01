"""
MEP-light™ — Structured JSON Logging Configuration

Configures the backend logger to output JSON-formatted trace streams
to both stdout and /logs/app.json.

Log fields:
  timestamp, level, component, session_id, user_role, action, payload

Charter compliance:
  All certainty guardrail events are logged at WARNING level.
"""

import os
import sys
import logging
import logging.handlers
from pythonjsonlogger import json as json_logger

from .config import settings


def setup_logging():
    """Configure structured JSON logging for the application."""

    # Ensure log directory exists
    log_dir = os.path.dirname(settings.log_file_path)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)

    # ─── JSON Formatter ──────────────────────────────────────────
    json_formatter = json_logger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        rename_fields={
            "asctime": "timestamp",
            "levelname": "level",
            "name": "component",
        },
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )

    # ─── Console Handler (stdout) ────────────────────────────────
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(json_formatter)

    # ─── File Handler (rotating JSON log) ────────────────────────
    file_handler = logging.handlers.RotatingFileHandler(
        settings.log_file_path,
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(json_formatter)

    # ─── Root Logger ─────────────────────────────────────────────
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # ─── Suppress noisy third-party loggers ──────────────────────
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    # ─── MEP-specific loggers ────────────────────────────────────
    for logger_name in ["mep.auth", "mep.scoring", "mep.rag", "mep.pdf", "mep.database"]:
        logger = logging.getLogger(logger_name)
        logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))

    logging.getLogger("mep").info(
        "Logging initialized",
        extra={
            "log_level": settings.log_level,
            "log_file": settings.log_file_path,
            "app_version": settings.app_version,
        },
    )
