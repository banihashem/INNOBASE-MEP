"""
MEP-light™ — RAG Engine Tests

Test Coverage:
  1. Document chunking (500 tokens, 10% overlap)
  2. Keyword search against sample documents
  3. Citation stitching into advisory text
  4. Ingestion pipeline (SQLite fallback)
  5. Edge cases: empty docs, single-word queries, no results
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.python.database import Base
from backend.python.rag import (
    chunk_text,
    keyword_search,
    stitch_citations,
    ingest_document,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
)
from backend.python.models import DocumentChunk


# ─── Fixtures ────────────────────────────────────────────────────────

@pytest.fixture
def test_db():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestSession()
    yield db
    db.close()


@pytest.fixture
def seeded_db(test_db):
    """Seed the test database with sample UAE regulatory documents."""
    ingest_document(
        db=test_db,
        content=(
            "The UAE food safety regulatory framework is governed by the Emirates "
            "Authority for Standardization and Metrology ESMA and the Abu Dhabi "
            "Agriculture and Food Safety Authority ADAFSA. All imported food products "
            "must comply with GSO 9/2007 general labeling requirements and GSO 150/2013 "
            "halal food standards. Products containing pork or alcohol derivatives are "
            "strictly prohibited. All labels must include Arabic text."
        ),
        source="UAE Food Safety Regulatory Framework",
        source_type="regulation",
        region="UAE",
    )
    ingest_document(
        db=test_db,
        content=(
            "For F&B companies entering Middle East markets, channel access typically "
            "involves appointing a local distribution agent or partner. Supermarket "
            "listing fees range from $500 to $5,000 per SKU. Major retailers include "
            "Carrefour, Lulu, Spinneys, and Union Coop."
        ),
        source="F&B Market Entry Channel Guide",
        source_type="trade_guide",
        region="Middle East",
    )
    return test_db


# ═══════════════════════════════════════════════════════════════════════
# Test Chunking
# ═══════════════════════════════════════════════════════════════════════

class TestChunkText:
    """Verify chunking behavior with 500-token windows and 10% overlap."""

    def test_short_text_returns_single_chunk(self):
        """Text shorter than chunk_size should return one chunk."""
        text = "This is a short document about UAE food regulations."
        chunks = chunk_text(text)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_empty_text_returns_empty(self):
        """Empty text should return empty list."""
        assert chunk_text("") == []
        assert chunk_text("   ") == []

    def test_long_text_creates_overlapping_chunks(self):
        """Long text should be split with proper overlap."""
        # Create a document longer than CHUNK_SIZE
        words = [f"word{i}" for i in range(800)]
        text = " ".join(words)
        chunks = chunk_text(text, chunk_size=500, overlap=0.10)

        assert len(chunks) > 1

        # Each chunk should have at most 500 words
        for chunk in chunks:
            word_count = len(chunk.split())
            assert word_count <= 500

    def test_overlap_creates_shared_content(self):
        """Consecutive chunks should share approximately 10% of content."""
        words = [f"word{i}" for i in range(1000)]
        text = " ".join(words)
        chunks = chunk_text(text, chunk_size=100, overlap=0.10)

        assert len(chunks) >= 2
        # Check that chunks overlap — last words of chunk[0] should appear in chunk[1]
        chunk0_words = chunks[0].split()
        chunk1_words = chunks[1].split()
        # The overlap region should contain shared words
        overlap_count = len(set(chunk0_words) & set(chunk1_words))
        assert overlap_count > 0, "Chunks should have overlapping content"

    def test_custom_chunk_size(self):
        """Custom chunk size should be respected."""
        words = [f"w{i}" for i in range(50)]
        text = " ".join(words)
        chunks = chunk_text(text, chunk_size=10, overlap=0.0)
        assert len(chunks) == 5  # 50 words / 10 per chunk


# ═══════════════════════════════════════════════════════════════════════
# Test Keyword Search
# ═══════════════════════════════════════════════════════════════════════

class TestKeywordSearch:
    """Verify keyword-based document retrieval."""

    def test_search_finds_relevant_chunks(self, seeded_db):
        """Search for 'halal' should return UAE regulation chunks."""
        results = keyword_search(seeded_db, "halal")
        assert len(results) > 0
        assert any("halal" in r["content"].lower() for r in results)

    def test_search_with_region_filter(self, seeded_db):
        """Region filter should narrow results."""
        results = keyword_search(seeded_db, "food", region="UAE")
        assert all(r["region"] == "UAE" for r in results)

    def test_search_with_source_type_filter(self, seeded_db):
        """Source type filter should narrow results."""
        results = keyword_search(seeded_db, "market", source_type="trade_guide")
        assert all(r["source_type"] == "trade_guide" for r in results)

    def test_no_results_for_unrelated_query(self, seeded_db):
        """Query with no matching terms should return empty."""
        results = keyword_search(seeded_db, "blockchain cryptocurrency")
        assert len(results) == 0

    def test_relevance_scoring(self, seeded_db):
        """Results should be sorted by relevance score descending."""
        results = keyword_search(seeded_db, "food safety halal")
        if len(results) >= 2:
            for i in range(len(results) - 1):
                assert results[i]["relevance_score"] >= results[i + 1]["relevance_score"]

    def test_top_k_limit(self, seeded_db):
        """Results should be limited to top_k."""
        results = keyword_search(seeded_db, "food", top_k=1)
        assert len(results) <= 1


# ═══════════════════════════════════════════════════════════════════════
# Test Citation Stitching
# ═══════════════════════════════════════════════════════════════════════

class TestStitchCitations:
    """Verify citation merging into advisory text."""

    def test_basic_citation_stitching(self):
        """Citations should be appended with numbered references."""
        advisory = "The UAE market requires careful regulatory compliance."
        search_results = [
            {
                "content": "GSO 9/2007 defines general labeling requirements for food products.",
                "source": "UAE ESMA Standards",
                "source_type": "regulation",
                "region": "UAE",
                "relevance_score": 0.85,
            },
            {
                "content": "Halal certification is mandatory for all food imports.",
                "source": "GSO 150/2013",
                "source_type": "regulation",
                "region": "UAE",
                "relevance_score": 0.72,
            },
        ]

        result = stitch_citations(advisory, search_results)

        assert "enriched_text" in result
        assert "citations" in result
        assert len(result["citations"]) == 2
        assert "[1]" in result["enriched_text"]
        assert "[2]" in result["enriched_text"]
        assert result["citations"][0]["source"] == "UAE ESMA Standards"
        assert result["citations"][1]["source"] == "GSO 150/2013"

    def test_no_results_returns_original(self):
        """Empty search results should return original text unchanged."""
        advisory = "No changes needed."
        result = stitch_citations(advisory, [])

        assert result["enriched_text"] == advisory
        assert result["citations"] == []

    def test_long_content_truncated_in_excerpt(self):
        """Excerpts should be truncated to 200 chars with ellipsis."""
        advisory = "Test."
        search_results = [{
            "content": "A" * 300,
            "source": "Long Doc",
            "source_type": "regulation",
            "region": "UAE",
            "relevance_score": 0.9,
        }]

        result = stitch_citations(advisory, search_results)
        assert result["citations"][0]["excerpt"].endswith("...")
        assert len(result["citations"][0]["excerpt"]) <= 210  # 200 + "..."


# ═══════════════════════════════════════════════════════════════════════
# Test Document Ingestion
# ═══════════════════════════════════════════════════════════════════════

class TestIngestion:
    """Verify document ingestion pipeline."""

    def test_ingest_creates_chunks(self, test_db):
        """Ingesting a document should create chunk records in the database."""
        chunk_ids = ingest_document(
            db=test_db,
            content="Test document about UAE import regulations and halal certification.",
            source="Test Source",
            source_type="regulation",
            region="UAE",
        )
        assert len(chunk_ids) > 0

        # Verify chunks exist in database
        count = test_db.query(DocumentChunk).count()
        assert count == len(chunk_ids)

    def test_ingest_preserves_metadata(self, test_db):
        """Metadata should be stored with each chunk."""
        metadata = {"author": "test", "version": "1.0"}
        chunk_ids = ingest_document(
            db=test_db,
            content="Metadata test document.",
            source="Meta Source",
            metadata=metadata,
        )

        chunk = test_db.query(DocumentChunk).filter_by(chunk_id=chunk_ids[0]).first()
        assert chunk.metadata_json == metadata
        assert chunk.source == "Meta Source"

    def test_ingest_sets_searchable_text(self, test_db):
        """Embedding text should be lowercase version of content."""
        chunk_ids = ingest_document(
            db=test_db,
            content="UPPERCASE CONTENT Here",
            source="Case Test",
        )

        chunk = test_db.query(DocumentChunk).filter_by(chunk_id=chunk_ids[0]).first()
        assert chunk.embedding_text == "uppercase content here"
