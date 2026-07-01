"""
MEP-light™ — Google OIDC Authentication & RBAC Middleware

Implements:
  1. Google JWKS key retrieval and caching
  2. JWT token validation (signature, expiration, audience)
  3. Role extraction from custom claims (mep_role)
  4. FastAPI dependency-driven RBAC enforcement

Roles:
  Viewer       - Read-only access to demo modes and dashboard queries
  Consultant   - Full CRUD on sessions, overrides, notes, PDF export
  Administrator - Unrestricted backend management

Charter compliance:
  "Clarify Preparedness, Do Not Predict Success" [10, 14]
"""

import time
import logging
from typing import Optional
from functools import lru_cache

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode
import httpx

from .config import settings

logger = logging.getLogger("mep.auth")

# ─── Constants ────────────────────────────────────────────────────────

GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUER = "https://accounts.google.com"

# Role hierarchy (higher index = more privileges)
ROLE_HIERARCHY = {
    "Viewer": 0,
    "Consultant": 1,
    "Administrator": 2,
}

VALID_ROLES = set(ROLE_HIERARCHY.keys())

# ─── JWKS Key Cache ──────────────────────────────────────────────────

_jwks_cache: dict = {}
_jwks_cache_expiry: float = 0
JWKS_CACHE_TTL = 3600  # 1 hour


async def _fetch_google_jwks() -> dict:
    """Fetch and cache Google's JWKS public keys."""
    global _jwks_cache, _jwks_cache_expiry

    if _jwks_cache and time.time() < _jwks_cache_expiry:
        return _jwks_cache

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(GOOGLE_JWKS_URL, timeout=10.0)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_cache_expiry = time.time() + JWKS_CACHE_TTL
            logger.info("Refreshed Google JWKS key cache")
            return _jwks_cache
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch Google JWKS: {e}")
        if _jwks_cache:
            logger.warning("Using stale JWKS cache")
            return _jwks_cache
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify authentication — JWKS unavailable",
        )


def _get_signing_key(token: str, jwks: dict) -> dict:
    """Extract the matching signing key from JWKS for a given token."""
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header",
        )

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing key ID (kid)",
        )

    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token signed with unknown key",
    )


# ─── Security Scheme ────────────────────────────────────────────────

security = HTTPBearer(auto_error=False)


# ─── Token Verification ─────────────────────────────────────────────

async def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Validates the incoming JWT token against Google's JWKS.

    For development mode (no GOOGLE_CLIENT_ID configured), accepts
    any well-formed JWT signed with the dev secret key.

    Returns the decoded token payload.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required — provide Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # ─── Development Mode (no Google OIDC configured) ─────────
    if not settings.google_client_id:
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            logger.debug("Dev mode: JWT verified with local secret")
            return payload
        except JWTError as e:
            logger.warning(f"Dev JWT verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
            )

    # ─── Production Mode (Google OIDC) ─────────────────────────
    jwks = await _fetch_google_jwks()
    signing_key = _get_signing_key(token, jwks)

    try:
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=settings.effective_jwt_audience,
            issuer=GOOGLE_ISSUER,
            options={
                "verify_aud": True,
                "verify_iss": True,
                "verify_exp": True,
            },
        )
        logger.info(
            "OIDC token verified",
            extra={
                "user_email": payload.get("email", "unknown"),
                "user_role": payload.get("mep_role", "Viewer"),
            },
        )
        return payload
    except JWTError as e:
        logger.warning(f"OIDC token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )


# ─── Role Extraction ────────────────────────────────────────────────

def extract_role(payload: dict) -> str:
    """
    Extract the MEP role from the JWT payload.

    Looks for 'mep_role' custom claim first, then falls back to 'role'.
    Defaults to 'Viewer' if no role claim is present.
    """
    role = payload.get("mep_role") or payload.get("role", "Viewer")
    if role not in VALID_ROLES:
        logger.warning(f"Unknown role '{role}' in token, defaulting to Viewer")
        return "Viewer"
    return role


# ─── RBAC Dependency Factory ────────────────────────────────────────

def require_role(allowed_roles: list[str]):
    """
    Creates a FastAPI dependency that enforces role-based access.

    Usage:
        @router.post("/sessions", dependencies=[Depends(require_role(["Consultant", "Administrator"]))])
        async def create_session(...):
            ...

    Or inject the user payload:
        @router.get("/profile")
        async def get_profile(user: dict = Depends(require_role(["Viewer", "Consultant", "Administrator"]))):
            ...
    """
    async def dependency(payload: dict = Depends(verify_token)) -> dict:
        user_role = extract_role(payload)

        if user_role not in allowed_roles:
            logger.warning(
                f"Access denied: role '{user_role}' not in {allowed_roles}",
                extra={
                    "user_email": payload.get("email", "unknown"),
                    "required_roles": allowed_roles,
                    "user_role": user_role,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action restricted for role '{user_role}'. Required: {', '.join(allowed_roles)}",
            )

        # Enrich the payload with extracted role
        payload["_mep_role"] = user_role
        return payload

    return dependency


# ─── Convenience Dependencies ────────────────────────────────────────

# Pre-built role dependencies for common use cases
require_viewer = require_role(["Viewer", "Consultant", "Administrator"])
require_consultant = require_role(["Consultant", "Administrator"])
require_admin = require_role(["Administrator"])


# ─── Optional Auth (for public endpoints that behave differently when authed) ─

async def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """Returns decoded payload if token is present and valid, else None."""
    if credentials is None:
        return None
    try:
        return await verify_token(credentials)
    except HTTPException:
        return None
