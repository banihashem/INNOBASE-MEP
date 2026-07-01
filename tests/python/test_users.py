"""
MEP-light™ — User Management Tests

Tests the complete user lifecycle:
  1. User creation with role assignment
  2. Duplicate email rejection
  3. Search by email, name, company, role
  4. Role change (promote/demote)
  5. Soft deactivation (never hard-delete)
  6. Auto-provisioning on first OIDC login
  7. Login recording and session counting
  8. Role count statistics
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.python.database import Base
from backend.python.users import (
    User, create_user, get_user_by_email, get_user_by_id,
    update_user, deactivate_user, record_login, search_users,
    list_all_users, count_users_by_role, get_or_create_user,
    user_to_dict, VALID_ROLES, VALID_STATUSES,
)


@pytest.fixture
def db():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def sample_users(db):
    """Seed the database with sample users."""
    users = [
        create_user(db, "admin@innobase.app", "Administrator", "Admin User", "INNOBASE"),
        create_user(db, "consultant@innobase.app", "Consultant", "Lead Consultant", "INNOBASE"),
        create_user(db, "viewer@company.com", "Viewer", "Demo Viewer", "Client Corp"),
        create_user(db, "analyst@partner.com", "Viewer", "Data Analyst", "Partner Ltd"),
    ]
    return users


# ═══════════════════════════════════════════════════════════════════════
# User Creation
# ═══════════════════════════════════════════════════════════════════════

class TestUserCreation:

    def test_create_user_basic(self, db):
        user = create_user(db, "test@example.com", "Viewer", "Test User")
        assert user.email == "test@example.com"
        assert user.role == "Viewer"
        assert user.status == "active"
        assert user.display_name == "Test User"

    def test_create_user_with_company(self, db):
        user = create_user(db, "ceo@startup.com", "Administrator", company_name="StartupCo")
        assert user.company_name == "StartupCo"

    def test_create_user_auto_display_name(self, db):
        user = create_user(db, "john.doe@company.com", "Viewer")
        assert user.display_name == "John Doe"

    def test_duplicate_email_raises(self, db):
        create_user(db, "unique@test.com", "Viewer")
        with pytest.raises(ValueError, match="already exists"):
            create_user(db, "unique@test.com", "Consultant")

    def test_invalid_role_raises(self, db):
        with pytest.raises(ValueError, match="Invalid role"):
            create_user(db, "bad@test.com", "SuperAdmin")

    def test_created_by_is_set(self, db):
        user = create_user(db, "track@test.com", "Viewer", created_by="admin@test.com")
        assert user.created_by == "admin@test.com"


# ═══════════════════════════════════════════════════════════════════════
# User Lookup
# ═══════════════════════════════════════════════════════════════════════

class TestUserLookup:

    def test_get_by_email(self, db, sample_users):
        user = get_user_by_email(db, "admin@innobase.app")
        assert user is not None
        assert user.role == "Administrator"

    def test_get_by_email_not_found(self, db):
        assert get_user_by_email(db, "nobody@nowhere.com") is None

    def test_get_by_id(self, db, sample_users):
        admin = sample_users[0]
        user = get_user_by_id(db, admin.user_id)
        assert user is not None
        assert user.email == "admin@innobase.app"


# ═══════════════════════════════════════════════════════════════════════
# User Update
# ═══════════════════════════════════════════════════════════════════════

class TestUserUpdate:

    def test_update_role(self, db, sample_users):
        viewer = sample_users[2]
        updated = update_user(db, viewer.user_id, {"role": "Consultant"})
        assert updated.role == "Consultant"

    def test_update_display_name(self, db, sample_users):
        user = sample_users[3]
        updated = update_user(db, user.user_id, {"display_name": "Senior Analyst"})
        assert updated.display_name == "Senior Analyst"

    def test_update_invalid_role_raises(self, db, sample_users):
        user = sample_users[0]
        with pytest.raises(ValueError, match="Invalid role"):
            update_user(db, user.user_id, {"role": "CEO"})

    def test_update_nonexistent_user_raises(self, db):
        with pytest.raises(ValueError, match="not found"):
            update_user(db, "nonexistent-id", {"role": "Viewer"})

    def test_update_ignores_disallowed_fields(self, db, sample_users):
        user = sample_users[0]
        updated = update_user(db, user.user_id, {"email": "hacker@evil.com", "display_name": "Safe"})
        assert updated.email == "admin@innobase.app"  # email unchanged
        assert updated.display_name == "Safe"


# ═══════════════════════════════════════════════════════════════════════
# User Deactivation
# ═══════════════════════════════════════════════════════════════════════

class TestUserDeactivation:

    def test_deactivate_user(self, db, sample_users):
        user = sample_users[2]
        deactivated = deactivate_user(db, user.user_id)
        assert deactivated.status == "deactivated"

    def test_deactivated_user_excluded_from_active_list(self, db, sample_users):
        user = sample_users[2]
        deactivate_user(db, user.user_id)
        active = list_all_users(db)
        emails = [u.email for u in active]
        assert "viewer@company.com" not in emails

    def test_deactivate_nonexistent_raises(self, db):
        with pytest.raises(ValueError, match="not found"):
            deactivate_user(db, "fake-id")


# ═══════════════════════════════════════════════════════════════════════
# Search & Filter
# ═══════════════════════════════════════════════════════════════════════

class TestUserSearch:

    def test_search_by_email(self, db, sample_users):
        users, total = search_users(db, query="innobase")
        assert total == 2

    def test_search_by_display_name(self, db, sample_users):
        users, total = search_users(db, query="Analyst")
        assert total == 1
        assert users[0].email == "analyst@partner.com"

    def test_filter_by_role(self, db, sample_users):
        users, total = search_users(db, role="Viewer")
        assert total == 2

    def test_filter_by_company(self, db, sample_users):
        users, total = search_users(db, company="INNOBASE")
        assert total == 2

    def test_search_with_pagination(self, db, sample_users):
        users, total = search_users(db, limit=2, offset=0)
        assert len(users) == 2
        assert total == 4

    def test_search_combined_filters(self, db, sample_users):
        users, total = search_users(db, role="Viewer", company="Partner")
        assert total == 1


# ═══════════════════════════════════════════════════════════════════════
# Auto-Provisioning & Login Tracking
# ═══════════════════════════════════════════════════════════════════════

class TestAutoProvision:

    def test_auto_provision_new_user(self, db):
        user = get_or_create_user(db, "newbie@test.com", "New User")
        assert user.email == "newbie@test.com"
        assert user.role == "Viewer"
        assert user.display_name == "New User"

    def test_existing_user_returns_same(self, db, sample_users):
        user = get_or_create_user(db, "admin@innobase.app")
        assert user.role == "Administrator"  # role preserved

    def test_login_increments_session_count(self, db, sample_users):
        record_login(db, "admin@innobase.app")
        user = get_user_by_email(db, "admin@innobase.app")
        assert user.total_sessions == 1
        assert user.last_login_at is not None

    def test_multiple_logins_increment(self, db, sample_users):
        record_login(db, "admin@innobase.app")
        record_login(db, "admin@innobase.app")
        record_login(db, "admin@innobase.app")
        user = get_user_by_email(db, "admin@innobase.app")
        assert user.total_sessions == 3


# ═══════════════════════════════════════════════════════════════════════
# Statistics & Serialization
# ═══════════════════════════════════════════════════════════════════════

class TestUserStats:

    def test_count_by_role(self, db, sample_users):
        counts = count_users_by_role(db)
        assert counts.get("Administrator", 0) == 1
        assert counts.get("Consultant", 0) == 1
        assert counts.get("Viewer", 0) == 2

    def test_user_to_dict(self, db, sample_users):
        user = sample_users[0]
        d = user_to_dict(user)
        assert d["email"] == "admin@innobase.app"
        assert d["role"] == "Administrator"
        assert "userId" in d
        assert "createdAt" in d
        assert "totalSessions" in d


# ═══════════════════════════════════════════════════════════════════════
# Valid Roles & Statuses
# ═══════════════════════════════════════════════════════════════════════

class TestConstants:

    def test_valid_roles(self):
        assert VALID_ROLES == {"Viewer", "Consultant", "Administrator"}

    def test_valid_statuses(self):
        assert VALID_STATUSES == {"invited", "active", "deactivated"}
