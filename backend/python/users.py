"""
MEP-light™ — User Management System

Implements:
  1. User ORM model with role, status, and audit fields
  2. CRUD operations: create, read, update, deactivate
  3. Search/filter by email, role, status, company
  4. Admin-only user management routes
  5. Self-service profile view (any authenticated user)

Roles:
  Viewer       (0) — Read-only access to demo and dashboards
  Consultant   (1) — Full CRUD on sessions, scoring, PDF export
  Administrator(2) — Unrestricted: user management, RAG, config

User Lifecycle:
  invited → active → deactivated (soft-delete, never hard-delete)
"""

import uuid
import logging
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, Index, JSON
from sqlalchemy.orm import Session

from .database import Base

logger = logging.getLogger("mep.users")


def _utcnow():
    return datetime.now(timezone.utc)


def _gen_uuid():
    return str(uuid.uuid4())


# ─── User ORM Model ──────────────────────────────────────────────────

class User(Base):
    """
    Registered MEP-light™ user.
    Persists identity, role, status, and usage metadata.
    """
    __tablename__ = "users"

    user_id = Column(String(36), primary_key=True, default=_gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), default="")
    avatar_url = Column(String(500), default="")

    # RBAC
    role = Column(String(50), nullable=False, default="Viewer")

    # Status lifecycle: invited → active → deactivated
    status = Column(String(20), nullable=False, default="active")

    # Organization
    company_name = Column(String(255), default="")
    department = Column(String(100), default="")
    title = Column(String(100), default="")

    # Usage tracking
    total_sessions = Column(Integer, default=0)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Audit
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
    created_by = Column(String(255), default="system")
    notes = Column(Text, default="")

    __table_args__ = (
        Index("ix_users_role", "role"),
        Index("ix_users_status", "status"),
        Index("ix_users_company", "company_name"),
    )


# ─── User CRUD Operations ────────────────────────────────────────────

VALID_ROLES = {"Viewer", "Consultant", "Administrator"}
VALID_STATUSES = {"invited", "active", "deactivated"}


def create_user(
    db: Session,
    email: str,
    role: str = "Viewer",
    display_name: str = "",
    company_name: str = "",
    department: str = "",
    title: str = "",
    created_by: str = "system",
) -> User:
    """Create a new user. Raises ValueError if email already exists."""
    if role not in VALID_ROLES:
        raise ValueError(f"Invalid role '{role}'. Must be one of: {VALID_ROLES}")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ValueError(f"User with email '{email}' already exists")

    user = User(
        email=email,
        role=role,
        display_name=display_name or email.split("@")[0].replace(".", " ").title(),
        company_name=company_name,
        department=department,
        title=title,
        status="active",
        created_by=created_by,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info("User created", extra={
        "user_id": user.user_id,
        "email": email,
        "role": role,
        "created_by": created_by,
    })
    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    """Find a user by email address."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: str) -> User | None:
    """Find a user by UUID."""
    return db.query(User).filter(User.user_id == user_id).first()


def update_user(
    db: Session,
    user_id: str,
    updates: dict,
    updated_by: str = "system",
) -> User:
    """Update user fields. Only permitted fields are applied."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError(f"User '{user_id}' not found")

    ALLOWED_FIELDS = {
        "display_name", "role", "status", "company_name",
        "department", "title", "notes",
    }

    for key, value in updates.items():
        if key not in ALLOWED_FIELDS:
            continue
        if key == "role" and value not in VALID_ROLES:
            raise ValueError(f"Invalid role '{value}'")
        if key == "status" and value not in VALID_STATUSES:
            raise ValueError(f"Invalid status '{value}'")
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    logger.info("User updated", extra={
        "user_id": user_id,
        "updates": updates,
        "updated_by": updated_by,
    })
    return user


def deactivate_user(db: Session, user_id: str, deactivated_by: str = "system") -> User:
    """Soft-deactivate a user (never hard-delete)."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError(f"User '{user_id}' not found")

    user.status = "deactivated"
    db.commit()
    db.refresh(user)

    logger.info("User deactivated", extra={
        "user_id": user_id,
        "deactivated_by": deactivated_by,
    })
    return user


def record_login(db: Session, email: str) -> User | None:
    """Record a user's login timestamp and increment session count."""
    user = get_user_by_email(db, email)
    if user:
        user.last_login_at = _utcnow()
        user.total_sessions = (user.total_sessions or 0) + 1
        db.commit()
        db.refresh(user)
    return user


# ─── Search & Filter ─────────────────────────────────────────────────

def search_users(
    db: Session,
    query: str = "",
    role: str | None = None,
    status: str | None = None,
    company: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[User], int]:
    """
    Search and filter users with pagination.

    Args:
        query: Free-text search across email, display_name, company_name
        role: Filter by exact role
        status: Filter by status (active/deactivated/invited)
        company: Filter by company_name (partial match)
        limit: Page size
        offset: Skip count

    Returns:
        (users_list, total_count)
    """
    q = db.query(User)

    # Apply filters
    if role and role in VALID_ROLES:
        q = q.filter(User.role == role)

    if status and status in VALID_STATUSES:
        q = q.filter(User.status == status)

    if company:
        q = q.filter(User.company_name.ilike(f"%{company}%"))

    if query:
        search_term = f"%{query}%"
        q = q.filter(
            (User.email.ilike(search_term))
            | (User.display_name.ilike(search_term))
            | (User.company_name.ilike(search_term))
        )

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    return users, total


def list_all_users(db: Session, limit: int = 100) -> list[User]:
    """List all active users (for admin dashboard)."""
    return db.query(User).filter(User.status == "active").order_by(User.email).limit(limit).all()


def count_users_by_role(db: Session) -> dict:
    """Return user counts grouped by role."""
    from sqlalchemy import func
    results = db.query(User.role, func.count(User.user_id)).group_by(User.role).all()
    return {role: count for role, count in results}


# ─── Auto-provision on first login ────────────────────────────────────

def get_or_create_user(
    db: Session,
    email: str,
    display_name: str = "",
    avatar_url: str = "",
) -> User:
    """
    Find existing user or auto-provision a new Viewer account.
    Called after successful OIDC authentication.
    """
    user = get_user_by_email(db, email)
    if user:
        # Update last login
        record_login(db, email)
        if display_name and not user.display_name:
            user.display_name = display_name
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        db.commit()
        return user

    # Auto-provision new user as Viewer
    user = create_user(
        db=db,
        email=email,
        role="Viewer",
        display_name=display_name,
        created_by="auto-provision",
    )
    if avatar_url:
        user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)

    logger.info("User auto-provisioned on first login", extra={"email": email})
    return user


def user_to_dict(user: User) -> dict:
    """Serialize a User to a JSON-compatible dictionary."""
    return {
        "userId": user.user_id,
        "email": user.email,
        "displayName": user.display_name,
        "avatarUrl": user.avatar_url,
        "role": user.role,
        "status": user.status,
        "companyName": user.company_name,
        "department": user.department,
        "title": user.title,
        "totalSessions": user.total_sessions or 0,
        "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "updatedAt": user.updated_at.isoformat() if user.updated_at else None,
    }
