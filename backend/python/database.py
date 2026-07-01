"""
MEP-light™ — Database Connection Management

SQLAlchemy engine factory, session management, and connection pooling.
Supports PostgreSQL (production) and SQLite (local development).
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase
from sqlalchemy.pool import StaticPool

from .config import settings

logger = logging.getLogger("mep.database")


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all ORM models."""
    pass


def _create_engine():
    """Create the SQLAlchemy engine based on config."""
    url = settings.database_url

    if url.startswith("sqlite"):
        # SQLite for local development
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=settings.database_echo,
        )

        # Enable WAL mode and foreign keys for SQLite
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        logger.info("Database engine created (SQLite: %s)", url)
    else:
        # PostgreSQL for production
        engine = create_engine(
            url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=3600,
            echo=settings.database_echo,
        )
        logger.info("Database engine created (PostgreSQL)")

    return engine


# Create engine and session factory
engine = _create_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """FastAPI dependency: yields a database session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables (for development / first run)."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized")


def drop_db():
    """Drop all tables (for testing only)."""
    Base.metadata.drop_all(bind=engine)
    logger.info("Database tables dropped")
