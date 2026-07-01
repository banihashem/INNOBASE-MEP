"""
MEP-light™ — Python Scoring Engine Tests

Ports all TypeScript test assertions to pytest.
Verifies exact mathematical parity with the TypeScript scoring engine
using the canonical Somayeh F&B / Kashkam Golden Evaluation Dataset.

Test Coverage:
  1. Negative dimension inversion
  2. Category sub-score calculations (all 5 formulas)
  3. Expansion Potential Score (SME-weighted composite)
  4. Tier classification thresholds
  5. Risk assessment
  6. Confidence scoring & decoupling
  7. Full pipeline for all 5 golden markets
  8. Edge cases (all-1s, all-5s, high-score-low-confidence)
  9. Comparative dashboard ranking
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pytest
from backend.python.scoring import (
    invert_negative_dimension,
    calculate_category_scores,
    calculate_expansion_potential,
    classify_tier,
    calculate_risk_exposure,
    get_confidence_score,
    get_confidence_label,
    apply_confidence_decoupling,
    run_certainty_guardrail,
    score_market,
    generate_comparative_dashboard,
    DimensionScores,
    CategoryScores,
    MarketScoreInput,
    EvidenceConfidenceLevel,
    EvidenceConfidenceLabel,
    TierClassification,
    RiskLevel,
)


# ═══════════════════════════════════════════════════════════════════════
# Step 1: Invert Negative Dimensions
# ═══════════════════════════════════════════════════════════════════════

class TestInvertNegativeDimension:
    """Formula: Adjusted Score = 6 - Raw Score"""

    def test_raw_1_becomes_5(self):
        assert invert_negative_dimension(1) == 5

    def test_raw_2_becomes_4(self):
        assert invert_negative_dimension(2) == 4

    def test_raw_3_becomes_3(self):
        assert invert_negative_dimension(3) == 3

    def test_raw_4_becomes_2(self):
        assert invert_negative_dimension(4) == 2

    def test_raw_5_becomes_1(self):
        assert invert_negative_dimension(5) == 1


# ═══════════════════════════════════════════════════════════════════════
# Step 2: Category Sub-Scores
# ═══════════════════════════════════════════════════════════════════════

class TestCategoryScores:
    """Verify all 5 category formulas against golden dataset."""

    def test_uae_category_scores(self, uae_scores):
        cat = calculate_category_scores(uae_scores)
        assert cat.opportunity == pytest.approx(3.4)
        assert cat.offering_fit == pytest.approx(3.65)
        assert cat.feasibility == pytest.approx(3.35)
        assert cat.strategic == 4.0
        assert cat.financial == 4.0

    def test_iraq_category_scores(self, iraq_scores):
        cat = calculate_category_scores(iraq_scores)
        assert cat.opportunity == pytest.approx(3.0)
        assert cat.offering_fit == pytest.approx(4.0)
        assert cat.feasibility == pytest.approx(3.05)
        assert cat.strategic == 3.0
        assert cat.financial == 3.0

    def test_germany_category_scores(self, germany_scores):
        cat = calculate_category_scores(germany_scores)
        assert cat.opportunity == pytest.approx(3.8)
        assert cat.offering_fit == pytest.approx(3.0)
        assert cat.feasibility == pytest.approx(2.35)
        assert cat.strategic == 5.0
        assert cat.financial == 3.0

    def test_canada_category_scores(self, canada_scores):
        cat = calculate_category_scores(canada_scores)
        assert cat.opportunity == pytest.approx(3.4)
        assert cat.offering_fit == pytest.approx(3.0)
        assert cat.feasibility == pytest.approx(2.35)
        assert cat.strategic == 4.0
        assert cat.financial == 3.0

    def test_azerbaijan_category_scores(self, azerbaijan_scores):
        cat = calculate_category_scores(azerbaijan_scores)
        assert cat.opportunity == pytest.approx(3.3)
        assert cat.offering_fit == pytest.approx(4.0)
        assert cat.feasibility == pytest.approx(3.35)
        assert cat.strategic == 3.0
        assert cat.financial == 3.0


# ═══════════════════════════════════════════════════════════════════════
# Step 3: Expansion Potential Score
# ═══════════════════════════════════════════════════════════════════════

class TestExpansionPotential:
    """Composite = (Opp*0.25 + Fit*0.20 + Feas*0.25 + Str*0.10 + Fin*0.20) × 20"""

    def test_uae_expansion_potential(self, uae_scores):
        cat = calculate_category_scores(uae_scores)
        assert calculate_expansion_potential(cat) == 72

    def test_iraq_expansion_potential(self, iraq_scores):
        cat = calculate_category_scores(iraq_scores)
        assert calculate_expansion_potential(cat) == 64

    def test_germany_expansion_potential(self, germany_scores):
        cat = calculate_category_scores(germany_scores)
        assert calculate_expansion_potential(cat) == 65

    def test_canada_expansion_potential(self, canada_scores):
        cat = calculate_category_scores(canada_scores)
        assert calculate_expansion_potential(cat) == 61

    def test_azerbaijan_expansion_potential(self, azerbaijan_scores):
        cat = calculate_category_scores(azerbaijan_scores)
        assert calculate_expansion_potential(cat) == 67


# ═══════════════════════════════════════════════════════════════════════
# Step 4: Tier Classification
# ═══════════════════════════════════════════════════════════════════════

class TestTierClassification:
    """Tier A >= 75, Tier B >= 60, Tier C < 60"""

    def test_tier_a_at_75(self):
        assert classify_tier(75) == TierClassification.TIER_A

    def test_tier_a_at_100(self):
        assert classify_tier(100) == TierClassification.TIER_A

    def test_tier_b_at_74(self):
        assert classify_tier(74) == TierClassification.TIER_B

    def test_tier_b_at_60(self):
        assert classify_tier(60) == TierClassification.TIER_B

    def test_tier_c_at_59(self):
        assert classify_tier(59) == TierClassification.TIER_C

    def test_tier_c_at_0(self):
        assert classify_tier(0) == TierClassification.TIER_C

    def test_all_golden_markets_are_tier_b(self):
        """All 5 golden markets should be Tier B: Promising."""
        for score in [72, 64, 65, 61, 67]:
            assert classify_tier(score) == TierClassification.TIER_B


# ═══════════════════════════════════════════════════════════════════════
# Step 5: Risk Assessment
# ═══════════════════════════════════════════════════════════════════════

class TestRiskAssessment:
    """Risk = average of raw competitive + raw regulatory."""

    def test_uae_risk(self, uae_scores):
        exposure, level = calculate_risk_exposure(uae_scores)
        assert exposure == 3.5
        assert level == RiskLevel.MEDIUM

    def test_germany_risk(self, germany_scores):
        exposure, level = calculate_risk_exposure(germany_scores)
        assert exposure == 4.5
        assert level == RiskLevel.HIGH

    def test_canada_risk(self, canada_scores):
        exposure, level = calculate_risk_exposure(canada_scores)
        assert exposure == 4.0
        assert level == RiskLevel.HIGH

    def test_azerbaijan_risk(self, azerbaijan_scores):
        exposure, level = calculate_risk_exposure(azerbaijan_scores)
        assert exposure == 2.5
        assert level == RiskLevel.MEDIUM


# ═══════════════════════════════════════════════════════════════════════
# Step 6: Confidence Scoring
# ═══════════════════════════════════════════════════════════════════════

class TestConfidenceScoring:

    def test_high_confidence_score(self):
        assert get_confidence_score(EvidenceConfidenceLevel.HIGH) == 90

    def test_medium_confidence_score(self):
        assert get_confidence_score(EvidenceConfidenceLevel.MEDIUM) == 60

    def test_low_confidence_score(self):
        assert get_confidence_score(EvidenceConfidenceLevel.LOW) == 30

    def test_unknown_confidence_score(self):
        assert get_confidence_score(EvidenceConfidenceLevel.UNKNOWN) == 10

    def test_high_confidence_label(self):
        assert get_confidence_label(EvidenceConfidenceLevel.HIGH) == EvidenceConfidenceLabel.RELIABLE

    def test_low_confidence_label(self):
        assert get_confidence_label(EvidenceConfidenceLevel.LOW) == EvidenceConfidenceLabel.ASSUMPTION_BASED


# ═══════════════════════════════════════════════════════════════════════
# Confidence Decoupling (Certainty Guardrail)
# ═══════════════════════════════════════════════════════════════════════

class TestConfidenceDecoupling:
    """High potential + low confidence → cap at Tier B."""

    def test_high_score_high_confidence_stays_tier_a(self):
        tier, warnings = apply_confidence_decoupling(
            80, EvidenceConfidenceLevel.HIGH, TierClassification.TIER_A
        )
        assert tier == TierClassification.TIER_A
        assert len(warnings) == 0

    def test_high_score_low_confidence_caps_to_tier_b(self):
        tier, warnings = apply_confidence_decoupling(
            80, EvidenceConfidenceLevel.LOW, TierClassification.TIER_A
        )
        assert tier == TierClassification.TIER_B
        assert len(warnings) == 1
        assert warnings[0].code == "LOW_CONFIDENCE_HYPOTHESIS"
        assert warnings[0].severity.value == "critical"

    def test_low_score_low_confidence_no_warning(self):
        tier, warnings = apply_confidence_decoupling(
            50, EvidenceConfidenceLevel.LOW, TierClassification.TIER_C
        )
        assert tier == TierClassification.TIER_C
        assert len(warnings) == 0

    def test_boundary_71_low_triggers(self):
        tier, warnings = apply_confidence_decoupling(
            71, EvidenceConfidenceLevel.LOW, TierClassification.TIER_B
        )
        assert len(warnings) == 1

    def test_boundary_70_low_no_trigger(self):
        tier, warnings = apply_confidence_decoupling(
            70, EvidenceConfidenceLevel.LOW, TierClassification.TIER_B
        )
        assert len(warnings) == 0


# ═══════════════════════════════════════════════════════════════════════
# Certainty Guardrail Alarm
# ═══════════════════════════════════════════════════════════════════════

class TestCertaintyGuardrail:

    def test_guardrail_triggers_on_high_pot_low_conf(self):
        result = run_certainty_guardrail(80, 30, "Test Market")
        assert result["final_tier"] == "Tier B"
        assert len(result["alerts"]) == 1
        assert result["alerts"][0]["code"] == "HIGH_POT_LOW_CONF"
        assert result["alerts"][0]["severity"] == "CRITICAL"

    def test_guardrail_no_trigger_on_high_conf(self):
        result = run_certainty_guardrail(80, 90, "Test Market")
        assert result["final_tier"] == "Tier A"
        assert len(result["alerts"]) == 0

    def test_guardrail_no_trigger_on_low_pot(self):
        result = run_certainty_guardrail(50, 30, "Test Market")
        assert result["final_tier"] == "Tier B"
        assert len(result["alerts"]) == 0


# ═══════════════════════════════════════════════════════════════════════
# Full Pipeline: Golden Dataset Markets
# ═══════════════════════════════════════════════════════════════════════

class TestFullPipelineGolden:
    """End-to-end pipeline for all 5 golden markets."""

    def _make_input(self, scores, evidence_basis, evidence_confidence):
        return MarketScoreInput(
            market_id="test",
            scores=scores,
            evidence_basis=evidence_basis,
            evidence_confidence=EvidenceConfidenceLevel(evidence_confidence),
        )

    def test_uae_full_pipeline(self, uae_scores):
        result = score_market("uae", "UAE", self._make_input(
            uae_scores, "Market reports", "High"
        ))
        assert result.expansion_potential_score == 72
        assert result.tier == TierClassification.TIER_B
        assert result.risk_level == RiskLevel.MEDIUM
        assert result.evidence_confidence_score == 90
        assert len(result.warnings) == 0

    def test_iraq_full_pipeline(self, iraq_scores):
        result = score_market("iraq", "Iraq", self._make_input(
            iraq_scores, "Expert judgment", "Medium"
        ))
        assert result.expansion_potential_score == 64
        assert result.tier == TierClassification.TIER_B

    def test_germany_full_pipeline(self, germany_scores):
        result = score_market("germany", "Germany", self._make_input(
            germany_scores, "Market reports", "Medium"
        ))
        assert result.expansion_potential_score == 65
        assert result.tier == TierClassification.TIER_B
        assert result.risk_level == RiskLevel.HIGH

    def test_canada_full_pipeline(self, canada_scores):
        result = score_market("canada", "Canada", self._make_input(
            canada_scores, "Desk research / assumptions only", "Low"
        ))
        assert result.expansion_potential_score == 61
        assert result.tier == TierClassification.TIER_B
        assert result.evidence_confidence_score == 30

    def test_azerbaijan_full_pipeline(self, azerbaijan_scores):
        result = score_market("azerbaijan", "Azerbaijan", self._make_input(
            azerbaijan_scores, "Internal experience", "High"
        ))
        assert result.expansion_potential_score == 67
        assert result.tier == TierClassification.TIER_B
        assert result.evidence_confidence_score == 90


# ═══════════════════════════════════════════════════════════════════════
# Edge Cases
# ═══════════════════════════════════════════════════════════════════════

class TestEdgeCases:

    def test_all_ones(self):
        """All dimensions at minimum → Tier C. Note: negative dims invert to 5."""
        scores = DimensionScores(1, 1, 1, 1, 1, 1, 1, 1, 1)
        cat = calculate_category_scores(scores)
        assert cat.opportunity == pytest.approx(2.2)
        assert cat.offering_fit == pytest.approx(1.0)
        assert cat.feasibility == pytest.approx(2.2)
        assert calculate_expansion_potential(cat) == 32
        assert classify_tier(32) == TierClassification.TIER_C

    def test_all_fives(self):
        """All dimensions at maximum → Tier A. Note: negative dims invert to 1."""
        scores = DimensionScores(5, 5, 5, 5, 5, 5, 5, 5, 5)
        cat = calculate_category_scores(scores)
        assert cat.opportunity == pytest.approx(3.8)
        assert cat.offering_fit == pytest.approx(5.0)
        assert cat.feasibility == pytest.approx(3.8)
        assert calculate_expansion_potential(cat) == 88
        assert classify_tier(88) == TierClassification.TIER_A

    def test_high_score_low_confidence_forced_tier_b(self):
        """Perfect positive scores + inverted negatives + Low confidence → Tier B."""
        scores = DimensionScores(5, 5, 5, 5, 5, 5, 5, 1, 1)
        result = score_market("test", "Test", MarketScoreInput(
            market_id="test",
            scores=scores,
            evidence_basis="test",
            evidence_confidence=EvidenceConfidenceLevel.LOW,
        ))
        assert result.expansion_potential_score == 100
        assert result.tier == TierClassification.TIER_B  # Capped!
        assert len(result.warnings) == 1
        assert result.warnings[0].code == "LOW_CONFIDENCE_HYPOTHESIS"


# ═══════════════════════════════════════════════════════════════════════
# Comparative Dashboard
# ═══════════════════════════════════════════════════════════════════════

class TestComparativeDashboard:

    def test_dashboard_ranking_order(self, golden_market_scores, golden_markets):
        dashboard = generate_comparative_dashboard(
            "Alpha Food Tech", "Kashkam",
            golden_markets, golden_market_scores,
        )
        # Should be sorted descending by expansion potential
        scores_list = [r.expansion_potential_score for r in dashboard.results]
        assert scores_list == sorted(scores_list, reverse=True)

    def test_dashboard_top_priority_is_uae(self, golden_market_scores, golden_markets):
        dashboard = generate_comparative_dashboard(
            "Alpha Food Tech", "Kashkam",
            golden_markets, golden_market_scores,
        )
        assert dashboard.top_priority is not None
        assert dashboard.top_priority.market_name == "UAE"
        assert dashboard.top_priority.expansion_potential_score == 72

    def test_dashboard_has_all_markets(self, golden_market_scores, golden_markets):
        dashboard = generate_comparative_dashboard(
            "Alpha Food Tech", "Kashkam",
            golden_markets, golden_market_scores,
        )
        assert len(dashboard.results) == 5

    def test_missing_market_raises(self):
        with pytest.raises(ValueError, match="Missing score input"):
            generate_comparative_dashboard(
                "Test", "Test",
                [{"id": "missing", "name": "Missing"}],
                {},
            )
