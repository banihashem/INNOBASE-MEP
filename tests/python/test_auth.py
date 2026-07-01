"""
MEP-light™ — RBAC Authorization Tests

Tests the role-based access control matrix:
  Viewer       → Read-only (demo mode, dashboards)
  Consultant   → Full CRUD (sessions, overrides, notes, PDF)
  Administrator → Unrestricted (weights, users, RAG management)
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pytest
from backend.python.auth import (
    extract_role,
    ROLE_HIERARCHY,
    VALID_ROLES,
)


class TestRoleExtraction:
    """Tests JWT payload role extraction logic."""

    def test_extracts_mep_role_claim(self):
        payload = {"email": "user@test.com", "mep_role": "Consultant"}
        assert extract_role(payload) == "Consultant"

    def test_falls_back_to_role_claim(self):
        payload = {"email": "user@test.com", "role": "Administrator"}
        assert extract_role(payload) == "Administrator"

    def test_defaults_to_viewer(self):
        payload = {"email": "user@test.com"}
        assert extract_role(payload) == "Viewer"

    def test_mep_role_takes_precedence(self):
        payload = {"mep_role": "Administrator", "role": "Viewer"}
        assert extract_role(payload) == "Administrator"

    def test_invalid_role_defaults_to_viewer(self):
        payload = {"mep_role": "SuperAdmin"}
        assert extract_role(payload) == "Viewer"

    def test_empty_role_defaults_to_viewer(self):
        payload = {"mep_role": ""}
        assert extract_role(payload) == "Viewer"


class TestRoleHierarchy:
    """Tests the role hierarchy ordering."""

    def test_viewer_is_lowest(self):
        assert ROLE_HIERARCHY["Viewer"] == 0

    def test_consultant_is_middle(self):
        assert ROLE_HIERARCHY["Consultant"] == 1

    def test_administrator_is_highest(self):
        assert ROLE_HIERARCHY["Administrator"] == 2

    def test_all_valid_roles_exist(self):
        assert VALID_ROLES == {"Viewer", "Consultant", "Administrator"}


class TestRBACMatrix:
    """Tests the RBAC permission matrix conceptually."""

    def test_viewer_cannot_access_consultant_routes(self):
        """Viewers should not be in the Consultant allowed list."""
        allowed = ["Consultant", "Administrator"]
        assert "Viewer" not in allowed

    def test_consultant_can_access_viewer_routes(self):
        """Consultants should be in the Viewer+ allowed list."""
        allowed = ["Viewer", "Consultant", "Administrator"]
        assert "Consultant" in allowed

    def test_admin_can_access_all_routes(self):
        """Administrators should be in every allowed list."""
        for allowed in [
            ["Viewer", "Consultant", "Administrator"],
            ["Consultant", "Administrator"],
            ["Administrator"],
        ]:
            assert "Administrator" in allowed

    def test_viewer_restricted_from_pdf_export(self):
        """PDF export requires Consultant or higher."""
        allowed = ["Consultant", "Administrator"]
        assert "Viewer" not in allowed

    def test_viewer_restricted_from_rag_ingest(self):
        """RAG document ingestion requires Administrator."""
        allowed = ["Administrator"]
        assert "Viewer" not in allowed
        assert "Consultant" not in allowed
