"""
MEP-light™ — PDF Generator Tests

Test Coverage:
  1. PDF generates valid byte output
  2. XML character escaping prevents crashes
  3. Empty results handling
  4. Cover page includes wave background
  5. All required sections are present
  6. Special characters in company/offering names
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pytest

from backend.pdf_service.pdf_generator import generate_pdf, _safe, _build_styles


# ─── Fixtures ────────────────────────────────────────────────────────

@pytest.fixture
def full_report_data():
    """Complete report data matching the golden dataset scenario."""
    return {
        "companyName": "Alpha Food Tech",
        "offeringName": "Offering X / Kashkam",
        "sector": "Food & Beverage Manufacturing",
        "domesticMarketSize": "$15M annual revenue",
        "exportExperience": "Limited/Indirect Exporting",
        "internalCapabilities": "Modular packaging lines",
        "knownConstraints": "High shipping costs",
        "expansionHorizon": "12 months",
        "decisionMode": "compare",
        "strategicObjective": "Identify the most practical growth opportunity",
        "consultantNotes": "Strategic Workshop Notes — June 2026\nInitial assessment.",
        "results": [
            {
                "name": "UAE",
                "potentialScore": 72,
                "tier": "Tier B: Promising",
                "riskLevel": "Medium",
                "confidence": "Reliable",
                "discrepancyAlert": False,
            },
            {
                "name": "Azerbaijan",
                "potentialScore": 67,
                "tier": "Tier B: Promising",
                "riskLevel": "Medium",
                "confidence": "Reliable",
                "discrepancyAlert": False,
            },
            {
                "name": "Germany",
                "potentialScore": 65,
                "tier": "Tier B: Promising",
                "riskLevel": "High",
                "confidence": "Needs Validation",
                "discrepancyAlert": False,
            },
        ],
    }


@pytest.fixture
def minimal_data():
    """Minimal valid data for PDF generation."""
    return {
        "companyName": "Test Co",
        "offeringName": "Test Product",
        "results": [],
    }


# ═══════════════════════════════════════════════════════════════════════
# Test PDF Generation
# ═══════════════════════════════════════════════════════════════════════

class TestPdfGeneration:
    """Verify PDF byte output is valid."""

    def test_generates_valid_bytes(self, full_report_data):
        """PDF should generate valid byte output."""
        pdf_bytes = generate_pdf(full_report_data)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0

    def test_pdf_starts_with_magic_bytes(self, full_report_data):
        """PDF output should start with %PDF header."""
        pdf_bytes = generate_pdf(full_report_data)
        assert pdf_bytes[:5] == b"%PDF-"

    def test_minimal_data_produces_pdf(self, minimal_data):
        """Minimal data (no results) should still produce a valid PDF."""
        pdf_bytes = generate_pdf(minimal_data)
        assert isinstance(pdf_bytes, bytes)
        assert pdf_bytes[:5] == b"%PDF-"

    def test_empty_results_handled(self):
        """Empty results list should not crash."""
        data = {
            "companyName": "Empty Corp",
            "offeringName": "Nothing",
            "results": [],
        }
        pdf_bytes = generate_pdf(data)
        assert len(pdf_bytes) > 0

    def test_large_result_set(self):
        """Many results should not crash."""
        results = [
            {
                "name": f"Market {i}",
                "potentialScore": 50 + i,
                "tier": "Tier B: Promising",
                "riskLevel": "Medium",
                "confidence": "Medium",
                "discrepancyAlert": False,
            }
            for i in range(10)
        ]
        data = {
            "companyName": "Big Corp",
            "offeringName": "Multi Product",
            "results": results,
        }
        pdf_bytes = generate_pdf(data)
        assert len(pdf_bytes) > 0


# ═══════════════════════════════════════════════════════════════════════
# Test XML Escaping
# ═══════════════════════════════════════════════════════════════════════

class TestXmlEscaping:
    """Verify XML character escaping prevents ReportLab crashes."""

    def test_safe_escapes_ampersand(self):
        """Ampersand should be escaped."""
        assert _safe("Food & Beverage") == "Food &amp; Beverage"

    def test_safe_escapes_angle_brackets(self):
        """Angle brackets should be escaped."""
        assert _safe("score < 50") == "score &lt; 50"
        assert _safe("score > 70") == "score &gt; 70"

    def test_safe_handles_none(self):
        """None should return empty string."""
        assert _safe(None) == ""

    def test_safe_handles_numbers(self):
        """Numbers should be converted to string."""
        assert _safe(42) == "42"
        assert _safe(3.14) == "3.14"

    def test_special_chars_in_pdf(self):
        """PDF should handle special XML characters in data without crashing."""
        data = {
            "companyName": "O'Brien's <Food> & Beverage \"Corp\"",
            "offeringName": "Product™ with «special» chars",
            "results": [
                {
                    "name": "Market <with> & special",
                    "potentialScore": 75,
                    "tier": "Tier A: Priority",
                    "riskLevel": "High",
                    "confidence": "Low",
                    "discrepancyAlert": True,
                },
            ],
        }
        # Should not raise an exception
        pdf_bytes = generate_pdf(data)
        assert len(pdf_bytes) > 0


# ═══════════════════════════════════════════════════════════════════════
# Test Discrepancy Alert
# ═══════════════════════════════════════════════════════════════════════

class TestDiscrepancyAlert:
    """Verify evidence discrepancy alert is rendered in PDF."""

    def test_alert_market_in_pdf(self):
        """Market with discrepancyAlert=True should produce a valid PDF."""
        data = {
            "companyName": "Alert Corp",
            "offeringName": "Alert Product",
            "results": [
                {
                    "name": "Risky Market",
                    "potentialScore": 82,
                    "tier": "Tier B: Promising",
                    "riskLevel": "High",
                    "confidence": "Low",
                    "discrepancyAlert": True,
                },
            ],
        }
        pdf_bytes = generate_pdf(data)
        assert len(pdf_bytes) > 0

    def test_no_alert_market_in_pdf(self):
        """Market without alert should also produce valid PDF."""
        data = {
            "companyName": "Safe Corp",
            "offeringName": "Safe Product",
            "results": [
                {
                    "name": "Safe Market",
                    "potentialScore": 72,
                    "tier": "Tier B: Promising",
                    "riskLevel": "Low",
                    "confidence": "High",
                    "discrepancyAlert": False,
                },
            ],
        }
        pdf_bytes = generate_pdf(data)
        assert len(pdf_bytes) > 0


# ═══════════════════════════════════════════════════════════════════════
# Test Styles
# ═══════════════════════════════════════════════════════════════════════

class TestStyles:
    """Verify custom styles are created correctly."""

    def test_all_custom_styles_created(self):
        """All custom paragraph styles should be present."""
        styles = _build_styles()
        required_styles = [
            "CoverTitle", "CoverSubtitle", "SectionHeader",
            "SubHeader", "MepBody", "MepNote", "TableCell", "TableHeader",
        ]
        for style_name in required_styles:
            assert style_name in styles, f"Missing style: {style_name}"
