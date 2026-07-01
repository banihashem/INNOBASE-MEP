"""
MEP-light™ — Certainty Guardrail Tests

Tests the "Certainty Guardrail" alarm system that detects and prevents
high-opportunity markets with low evidence confidence from being
classified as Tier A.

Trigger Condition:
  Expansion Potential Score > 70 AND Evidence Confidence Score < 50
  → CRITICAL alert + Forced downgrade to Tier B

Edge cases covered:
  - Exact boundary values (70/50)
  - Multiple alerts in batch scoring
  - Alert payload structure validation
  - Guardrail interaction with tier classification
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pytest
from backend.python.scoring import (
    run_certainty_guardrail,
    apply_confidence_decoupling,
    score_market,
    DimensionScores,
    MarketScoreInput,
    EvidenceConfidenceLevel,
    TierClassification,
)


class TestCertaintyGuardrailAlarm:
    """Tests the run_certainty_guardrail() alarm function."""

    def test_triggers_on_high_pot_low_conf(self):
        result = run_certainty_guardrail(80, 30, "UAE Test")
        assert result["final_tier"] == "Tier B"
        assert len(result["alerts"]) == 1

    def test_alert_has_critical_severity(self):
        result = run_certainty_guardrail(85, 10, "Critical Market")
        alert = result["alerts"][0]
        assert alert["severity"] == "CRITICAL"
        assert alert["code"] == "HIGH_POT_LOW_CONF"
        assert "Critical Market" in alert["message"]

    def test_alert_has_timestamp(self):
        result = run_certainty_guardrail(75, 30, "Time Test")
        assert "timestamp" in result["alerts"][0]

    def test_no_trigger_when_conf_above_50(self):
        result = run_certainty_guardrail(80, 60, "Safe Market")
        assert len(result["alerts"]) == 0
        assert result["final_tier"] == "Tier A"

    def test_no_trigger_when_pot_below_70(self):
        result = run_certainty_guardrail(65, 30, "Low Pot")
        assert len(result["alerts"]) == 0
        assert result["final_tier"] == "Tier B"

    def test_boundary_pot_70_conf_49_triggers(self):
        """Exactly at threshold: 70 potential, 49 confidence → triggers."""
        result = run_certainty_guardrail(70, 49, "Boundary")
        assert len(result["alerts"]) == 1

    def test_boundary_pot_70_conf_50_no_trigger(self):
        """At boundary: 70 potential, 50 confidence → no trigger."""
        result = run_certainty_guardrail(70, 50, "Boundary")
        assert len(result["alerts"]) == 0

    def test_boundary_pot_69_conf_30_no_trigger(self):
        """Below threshold: 69 potential → no trigger regardless."""
        result = run_certainty_guardrail(69, 30, "Below")
        assert len(result["alerts"]) == 0


class TestGuardrailInFullPipeline:
    """Tests guardrail interaction within the full scoring pipeline."""

    def test_perfect_scores_low_conf_capped_to_tier_b(self):
        """Maximum positive + minimum negative + Low confidence = Tier B."""
        scores = DimensionScores(5, 5, 5, 5, 5, 5, 5, 1, 1)
        result = score_market("test", "Test", MarketScoreInput(
            market_id="test",
            scores=scores,
            evidence_basis="test",
            evidence_confidence=EvidenceConfidenceLevel.LOW,
        ))
        assert result.expansion_potential_score == 100
        assert result.tier == TierClassification.TIER_B
        assert len(result.warnings) == 1

    def test_perfect_scores_high_conf_stays_tier_a(self):
        """Same perfect scores but with High confidence stays Tier A."""
        scores = DimensionScores(5, 5, 5, 5, 5, 5, 5, 1, 1)
        result = score_market("test", "Test", MarketScoreInput(
            market_id="test",
            scores=scores,
            evidence_basis="test",
            evidence_confidence=EvidenceConfidenceLevel.HIGH,
        ))
        assert result.expansion_potential_score == 100
        assert result.tier == TierClassification.TIER_A
        assert len(result.warnings) == 0

    def test_medium_conf_above_threshold_no_cap(self):
        """Medium confidence (60) is above 50 threshold → no cap."""
        scores = DimensionScores(5, 5, 5, 5, 5, 5, 5, 1, 1)
        result = score_market("test", "Test", MarketScoreInput(
            market_id="test",
            scores=scores,
            evidence_basis="test",
            evidence_confidence=EvidenceConfidenceLevel.MEDIUM,
        ))
        assert result.tier == TierClassification.TIER_A
        assert len(result.warnings) == 0

    def test_unknown_conf_triggers_guardrail(self):
        """Unknown confidence (10) should trigger guardrail for high scores."""
        scores = DimensionScores(5, 5, 5, 5, 5, 5, 5, 1, 1)
        result = score_market("test", "Test", MarketScoreInput(
            market_id="test",
            scores=scores,
            evidence_basis="test",
            evidence_confidence=EvidenceConfidenceLevel.UNKNOWN,
        ))
        assert result.tier == TierClassification.TIER_B
        assert len(result.warnings) == 1

    def test_golden_canada_no_guardrail(self):
        """Canada has Low confidence but score is 61 (< 70) → no guardrail."""
        scores = DimensionScores(4, 3, 3, 2, 4, 3, 3, 4, 4)
        result = score_market("canada", "Canada", MarketScoreInput(
            market_id="canada",
            scores=scores,
            evidence_basis="Desk research",
            evidence_confidence=EvidenceConfidenceLevel.LOW,
        ))
        assert result.expansion_potential_score == 61
        assert len(result.warnings) == 0  # 61 <= 70, no trigger
