"""
MEP-light™ — Python Test Fixtures & Golden Dataset Loader

Shared pytest fixtures for all test modules.
Loads the canonical Somayeh F&B / Kashkam Golden Evaluation Dataset.
"""

import json
import os
import sys

import pytest

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.python.scoring import (
    DimensionScores,
    MarketScoreInput,
    EvidenceConfidenceLevel,
    CategoryScores,
    TierClassification,
    RiskLevel,
    ScoringResult,
)


# ─── Golden Dataset Loader ───────────────────────────────────────────

GOLDEN_DATASET_PATH = os.path.join(
    os.path.dirname(__file__), "..", "golden_dataset.json"
)


@pytest.fixture
def golden_dataset():
    """Load the canonical Golden Evaluation Dataset."""
    with open(GOLDEN_DATASET_PATH, "r") as f:
        return json.load(f)


@pytest.fixture
def golden_market_scores(golden_dataset):
    """Convert golden dataset to MarketScoreInput objects."""
    result = {}
    for market_id, data in golden_dataset["marketScores"].items():
        scores = data["scores"]
        result[market_id] = MarketScoreInput(
            market_id=market_id,
            scores=DimensionScores(
                market_attractiveness=scores["marketAttractiveness"],
                offering_fit=scores["offeringFit"],
                channel_access=scores["channelAccess"],
                operational_feasibility=scores["operationalFeasibility"],
                strategic_value=scores["strategicValue"],
                financial_logic=scores["financialLogic"],
                brand_trust_transferability=scores["brandTrustTransferability"],
                competitive_intensity=scores["competitiveIntensity"],
                regulatory_complexity=scores["regulatoryComplexity"],
            ),
            evidence_basis=data["evidenceBasis"],
            evidence_confidence=EvidenceConfidenceLevel(data["evidenceConfidence"]),
        )
    return result


@pytest.fixture
def golden_markets(golden_dataset):
    """Get the market list from golden dataset."""
    return golden_dataset["markets"]


# ─── Pre-built Dimension Score Fixtures ──────────────────────────────

@pytest.fixture
def uae_scores():
    """UAE dimension scores from Golden Dataset."""
    return DimensionScores(
        market_attractiveness=4,
        offering_fit=4,
        channel_access=4,
        operational_feasibility=3,
        strategic_value=4,
        financial_logic=4,
        brand_trust_transferability=3,
        competitive_intensity=4,
        regulatory_complexity=3,
    )


@pytest.fixture
def iraq_scores():
    """Iraq dimension scores from Golden Dataset."""
    return DimensionScores(
        market_attractiveness=3,
        offering_fit=4,
        channel_access=3,
        operational_feasibility=4,
        strategic_value=3,
        financial_logic=3,
        brand_trust_transferability=4,
        competitive_intensity=3,
        regulatory_complexity=4,
    )


@pytest.fixture
def germany_scores():
    """Germany dimension scores from Golden Dataset."""
    return DimensionScores(
        market_attractiveness=5,
        offering_fit=3,
        channel_access=3,
        operational_feasibility=2,
        strategic_value=5,
        financial_logic=3,
        brand_trust_transferability=3,
        competitive_intensity=5,
        regulatory_complexity=4,
    )


@pytest.fixture
def canada_scores():
    """Canada dimension scores from Golden Dataset."""
    return DimensionScores(
        market_attractiveness=4,
        offering_fit=3,
        channel_access=3,
        operational_feasibility=2,
        strategic_value=4,
        financial_logic=3,
        brand_trust_transferability=3,
        competitive_intensity=4,
        regulatory_complexity=4,
    )


@pytest.fixture
def azerbaijan_scores():
    """Azerbaijan dimension scores from Golden Dataset."""
    return DimensionScores(
        market_attractiveness=3,
        offering_fit=4,
        channel_access=3,
        operational_feasibility=4,
        strategic_value=3,
        financial_logic=3,
        brand_trust_transferability=4,
        competitive_intensity=2,
        regulatory_complexity=3,
    )
