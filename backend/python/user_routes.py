"""
MEP-light™ — User Management API Routes (FastAPI)

Endpoints:
  GET    /api/v2/users           — List/search users (Admin)
  GET    /api/v2/users/me        — Current user profile (any auth)
  GET    /api/v2/users/:id       — Get user by ID (Admin)
  POST   /api/v2/users           — Create user (Admin)
  PATCH  /api/v2/users/:id       — Update user (Admin)
  DELETE /api/v2/users/:id       — Deactivate user (Admin)
  GET    /api/v2/users/stats     — User role counts (Admin)
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from .auth import require_admin, require_viewer, verify_token
from .database import get_db
from .users import (
    create_user, get_user_by_id, get_user_by_email,
    update_user, deactivate_user, search_users,
    count_users_by_role, user_to_dict, get_or_create_user,
    VALID_ROLES, VALID_STATUSES,
)

logger = logging.getLogger("mep.user_routes")

router = APIRouter(prefix="/api/v2/users", tags=["users"])


# ─── Request / Response Models ────────────────────────────────────────

class CreateUserRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    role: str = Field(default="Viewer")
    display_name: str = Field(default="", alias="displayName")
    company_name: str = Field(default="", alias="companyName")
    department: str = Field(default="")
    title: str = Field(default="")

    model_config = {"populate_by_name": True}


class UpdateUserRequest(BaseModel):
    display_name: Optional[str] = Field(default=None, alias="displayName")
    role: Optional[str] = None
    status: Optional[str] = None
    company_name: Optional[str] = Field(default=None, alias="companyName")
    department: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None

    model_config = {"populate_by_name": True}


class UserResponse(BaseModel):
    user_id: str = Field(alias="userId")
    email: str
    display_name: str = Field(alias="displayName")
    avatar_url: str = Field(alias="avatarUrl")
    role: str
    status: str
    company_name: str = Field(alias="companyName")
    department: str
    title: str
    total_sessions: int = Field(alias="totalSessions")
    last_login_at: Optional[str] = Field(alias="lastLoginAt")
    created_at: Optional[str] = Field(alias="createdAt")
    updated_at: Optional[str] = Field(alias="updatedAt")

    model_config = {"populate_by_name": True}


class UserListResponse(BaseModel):
    users: list[dict]
    total: int
    limit: int
    offset: int


class UserStatsResponse(BaseModel):
    by_role: dict = Field(alias="byRole")
    total: int

    model_config = {"populate_by_name": True}


# ─── Endpoints ────────────────────────────────────────────────────────

@router.get("/me")
async def get_current_user(
    payload: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """
    Get the current authenticated user's profile.
    Auto-provisions a new user record on first login.
    """
    email = payload.get("email", "")
    display_name = payload.get("name", "")
    avatar_url = payload.get("picture", "")

    user = get_or_create_user(
        db=db,
        email=email,
        display_name=display_name,
        avatar_url=avatar_url,
    )

    return {"user": user_to_dict(user)}


@router.get("/stats")
async def get_user_stats(
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get user statistics — counts by role. Administrator only."""
    role_counts = count_users_by_role(db)
    total = sum(role_counts.values())

    return {
        "byRole": role_counts,
        "total": total,
        "roles": list(VALID_ROLES),
        "statuses": list(VALID_STATUSES),
    }


@router.get("")
async def list_users(
    q: str = Query(default="", description="Search across email, name, company"),
    role: Optional[str] = Query(default=None, description="Filter by role"),
    status: Optional[str] = Query(default=None, description="Filter by status"),
    company: Optional[str] = Query(default=None, description="Filter by company name"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Search and list users with pagination. Administrator only.

    Search across email, display name, and company name.
    Filter by role, status, or company.
    """
    users, total = search_users(
        db=db,
        query=q,
        role=role,
        status=status,
        company=company,
        limit=limit,
        offset=offset,
    )

    return {
        "users": [user_to_dict(u) for u in users],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{user_id}")
async def get_user(
    user_id: str,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get a single user by ID. Administrator only."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": user_to_dict(user)}


@router.post("")
async def create_new_user(
    body: CreateUserRequest,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new user account. Administrator only."""
    try:
        user = create_user(
            db=db,
            email=body.email,
            role=body.role,
            display_name=body.display_name,
            company_name=body.company_name,
            department=body.department,
            title=body.title,
            created_by=admin.get("email", "admin"),
        )
        logger.info("User created via API", extra={
            "new_user_email": body.email,
            "role": body.role,
            "admin_email": admin.get("email", "unknown"),
        })
        return {"success": True, "user": user_to_dict(user)}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.patch("/{user_id}")
async def update_existing_user(
    user_id: str,
    body: UpdateUserRequest,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a user's profile or role. Administrator only."""
    updates = body.model_dump(exclude_none=True, by_alias=False)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
        user = update_user(
            db=db,
            user_id=user_id,
            updates=updates,
            updated_by=admin.get("email", "admin"),
        )
        return {"success": True, "user": user_to_dict(user)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    admin: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Deactivate a user (soft-delete). Administrator only.
    Users are never hard-deleted — they are marked as 'deactivated'.
    """
    try:
        user = deactivate_user(
            db=db,
            user_id=user_id,
            deactivated_by=admin.get("email", "admin"),
        )
        return {"success": True, "user": user_to_dict(user)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
