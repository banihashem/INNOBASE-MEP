"""
MEP-light™ — Contextual RAG Engine (pgvector)

Implements:
  1. Document ingestion: chunk parsing with sliding window (500 tokens, 10% overlap)
  2. Embedding via Google AI text-embedding-004 (or fallback to keyword search)
  3. SQLAlchemy-based vector similarity search against pgvector
  4. Hybrid retrieval: semantic + keyword (BM25-style)
  5. Citation stitching into advisory text

For SQLite fallback (local dev), uses keyword-based text search
instead of vector similarity.
"""

import os
import re
import uuid
import logging
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text as sa_text, func

from .models import DocumentChunk
from .metrics import RAG_SEARCHES, RAG_SEARCH_LATENCY
import time

logger = logging.getLogger("mep.rag")

# ─── Constants ────────────────────────────────────────────────────────────────

CHUNK_SIZE = 500        # tokens (approx words)
CHUNK_OVERLAP = 0.10    # 10% overlap
TOP_K_RESULTS = 5       # Max chunks returned per search
EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIM = 768


# ─── Embedding Generation ───────────────────────────────────────────────────

def _get_genai_client():
    """Lazily initialize the Google GenAI client for embedding generation."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except ImportError:
        logger.warning("google-genai not installed — embedding disabled")
        return None
    except Exception as e:
        logger.warning("Failed to initialize GenAI client: %s", e)
        return None


def generate_embedding(text_content: str) -> Optional[list[float]]:
    """
    Generate a 768-dimensional embedding vector using Google text-embedding-004.

    Returns None if the API key is not configured or the call fails.
    """
    client = _get_genai_client()
    if client is None:
        return None

    try:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text_content,
        )
        if result and result.embeddings:
            return result.embeddings[0].values
        return None
    except Exception as e:
        logger.warning("Embedding generation failed: %s", e)
        return None


# ─── Document Chunking ───────────────────────────────────────────────

def chunk_text(text_content: str, chunk_size: int = CHUNK_SIZE, overlap: float = CHUNK_OVERLAP) -> list[str]:
    """
    Split text into overlapping chunks using a sliding window strategy.

    Args:
        text_content: Raw text to chunk
        chunk_size: Number of words per chunk
        overlap: Fraction of overlap between consecutive chunks (0.0 to 0.5)

    Returns:
        List of text chunks
    """
    words = text_content.split()
    if len(words) <= chunk_size:
        return [text_content.strip()] if text_content.strip() else []

    step = max(1, int(chunk_size * (1 - overlap)))
    chunks = []

    for i in range(0, len(words), step):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk.strip())
        if i + chunk_size >= len(words):
            break

    return chunks


# ─── Document Ingestion ──────────────────────────────────────────────

def ingest_document(
    db: Session,
    content: str,
    source: str,
    source_type: str = "regulation",
    region: str = "Middle East",
    metadata: Optional[dict] = None,
) -> list[str]:
    """
    Ingest a document into the RAG knowledge base.

    Process:
      1. Chunk the document into overlapping segments
      2. Generate embeddings via text-embedding-004 (if available)
      3. Store each chunk with metadata and optional embedding vector

    Returns list of chunk IDs created.
    """
    chunks = chunk_text(content)
    chunk_ids = []
    embedded_count = 0

    for chunk_text_content in chunks:
        chunk_id = str(uuid.uuid4())

        # Attempt to generate embedding vector
        embedding_vector = generate_embedding(chunk_text_content)

        doc_chunk = DocumentChunk(
            chunk_id=chunk_id,
            content=chunk_text_content,
            source=source,
            source_type=source_type,
            region=region,
            metadata_json=metadata or {},
            embedding_text=chunk_text_content.lower(),  # Keyword fallback
        )

        # Set pgvector embedding if available and model supports it
        if embedding_vector and hasattr(doc_chunk, 'embedding'):
            doc_chunk.embedding = embedding_vector
            embedded_count += 1

        db.add(doc_chunk)
        chunk_ids.append(chunk_id)

    db.commit()
    logger.info(
        "Document ingested",
        extra={
            "source": source,
            "chunks_created": len(chunk_ids),
            "chunks_embedded": embedded_count,
            "source_type": source_type,
            "region": region,
        },
    )
    return chunk_ids


# ─── Keyword Search (SQLite / Fallback) ──────────────────────────────

def keyword_search(
    db: Session,
    query: str,
    region: Optional[str] = None,
    source_type: Optional[str] = None,
    top_k: int = TOP_K_RESULTS,
) -> list[dict]:
    """
    Keyword-based document search (works with SQLite and PostgreSQL).
    Uses simple LIKE matching against embedded text representation.
    """
    # Normalize query
    query_terms = query.lower().split()

    # Build query
    q = db.query(DocumentChunk)

    if region:
        q = q.filter(DocumentChunk.region == region)
    if source_type:
        q = q.filter(DocumentChunk.source_type == source_type)

    # Simple keyword matching — filter chunks containing any query term
    results = []
    all_chunks = q.all()

    for chunk in all_chunks:
        content_lower = chunk.content.lower()
        score = sum(1 for term in query_terms if term in content_lower)
        if score > 0:
            results.append({
                "chunk_id": chunk.chunk_id,
                "content": chunk.content,
                "source": chunk.source,
                "source_type": chunk.source_type,
                "region": chunk.region,
                "relevance_score": score / len(query_terms),
                "metadata": chunk.metadata_json,
            })

    # Sort by relevance score descending
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return results[:top_k]


# ─── Hybrid Search ───────────────────────────────────────────────────

def hybrid_search(
    db: Session,
    query: str,
    region: Optional[str] = None,
    source_type: Optional[str] = None,
    top_k: int = TOP_K_RESULTS,
) -> list[dict]:
    """
    Hybrid retrieval combining semantic and keyword search.

    In PostgreSQL with pgvector:
      - Runs vector similarity search (cosine distance)
      - Runs full-text search (BM25 via tsvector)
      - Merges and deduplicates results

    In SQLite (local dev):
      - Falls back to keyword search only
    """
    start_time = time.time()
    RAG_SEARCHES.inc()

    try:
        # Check if we're using PostgreSQL with pgvector
        db_url = str(db.get_bind().url)
        if "postgresql" in db_url:
            return _postgres_hybrid_search(db, query, region, source_type, top_k)
        else:
            return keyword_search(db, query, region, source_type, top_k)
    finally:
        duration = time.time() - start_time
        RAG_SEARCH_LATENCY.observe(duration)
        logger.info(
            "RAG search completed",
            extra={"query_length": len(query), "duration_ms": round(duration * 1000, 2)},
        )


def _postgres_hybrid_search(
    db: Session,
    query: str,
    region: Optional[str],
    source_type: Optional[str],
    top_k: int,
) -> list[dict]:
    """
    PostgreSQL-specific hybrid search using pgvector + tsvector.

    Strategy:
      1. Try vector similarity search (cosine distance) if embeddings exist
      2. Run full-text search (BM25 via tsvector)
      3. Merge and deduplicate results, preferring vector matches
      4. Fall back to keyword search if both fail
    """
    results_map: dict[str, dict] = {}

    # ─── Vector Similarity Search ─────────────────────────────────
    query_embedding = generate_embedding(query)
    if query_embedding:
        try:
            vector_sql = sa_text("""
                SELECT
                    chunk_id, content, source, source_type, region, metadata_json,
                    1 - (embedding <=> :query_vec::vector) AS similarity
                FROM document_chunks
                WHERE embedding IS NOT NULL
                    AND (:region IS NULL OR region = :region)
                    AND (:source_type IS NULL OR source_type = :source_type)
                ORDER BY embedding <=> :query_vec::vector
                LIMIT :top_k
            """)
            rows = db.execute(vector_sql, {
                "query_vec": str(query_embedding),
                "region": region,
                "source_type": source_type,
                "top_k": top_k,
            }).fetchall()

            for row in rows:
                results_map[row.chunk_id] = {
                    "chunk_id": row.chunk_id,
                    "content": row.content,
                    "source": row.source,
                    "source_type": row.source_type,
                    "region": row.region,
                    "relevance_score": float(row.similarity),
                    "metadata": row.metadata_json or {},
                    "search_type": "vector",
                }
        except Exception as e:
            logger.warning("pgvector similarity search failed: %s", e)

    # ─── Full-Text Search (BM25) ──────────────────────────────────
    fts_query = " & ".join(query.split())
    fts_sql = sa_text("""
        SELECT
            chunk_id, content, source, source_type, region, metadata_json,
            ts_rank_cd(to_tsvector('english', content), to_tsquery('english', :query)) AS rank
        FROM document_chunks
        WHERE to_tsvector('english', content) @@ to_tsquery('english', :query)
            AND (:region IS NULL OR region = :region)
            AND (:source_type IS NULL OR source_type = :source_type)
        ORDER BY rank DESC
        LIMIT :top_k
    """)

    try:
        rows = db.execute(fts_sql, {
            "query": fts_query,
            "region": region,
            "source_type": source_type,
            "top_k": top_k,
        }).fetchall()

        for row in rows:
            if row.chunk_id not in results_map:
                results_map[row.chunk_id] = {
                    "chunk_id": row.chunk_id,
                    "content": row.content,
                    "source": row.source,
                    "source_type": row.source_type,
                    "region": row.region,
                    "relevance_score": float(row.rank),
                    "metadata": row.metadata_json or {},
                    "search_type": "fts",
                }
    except Exception as e:
        logger.warning("PostgreSQL FTS search failed: %s", e)

    if results_map:
        sorted_results = sorted(
            results_map.values(),
            key=lambda x: x["relevance_score"],
            reverse=True,
        )
        return sorted_results[:top_k]

    # Fallback to simple keyword search
    logger.warning("Both vector and FTS search failed, falling back to keyword")
    return keyword_search(db, query, region, source_type, top_k)


# ─── Citation Stitching ──────────────────────────────────────────────

def stitch_citations(
    advisory_text: str,
    search_results: list[dict],
) -> dict:
    """
    Stitches retrieved document citations into advisory text.

    Returns:
      {
        "enriched_text": "Advisory text with [1] [2] citation markers...",
        "citations": [
          {"index": 1, "source": "UAE Halal Standards", "excerpt": "..."},
          ...
        ]
      }
    """
    if not search_results:
        return {"enriched_text": advisory_text, "citations": []}

    citations = []
    enriched_text = advisory_text

    for i, result in enumerate(search_results, start=1):
        citation = {
            "index": i,
            "source": result.get("source", "Unknown source"),
            "source_type": result.get("source_type", ""),
            "region": result.get("region", ""),
            "excerpt": result["content"][:200] + ("..." if len(result["content"]) > 200 else ""),
            "relevance_score": result.get("relevance_score", 0),
        }
        citations.append(citation)

    # Append citations block
    citation_block = "\n\n---\n**Sources:**\n"
    for c in citations:
        citation_block += f"[{c['index']}] {c['source']} ({c['region']}) — \"{c['excerpt']}\"\n"

    enriched_text += citation_block

    return {
        "enriched_text": enriched_text,
        "citations": citations,
    }


# ─── Sample Data Seeding (for development) ──────────────────────────

SAMPLE_DOCUMENTS = [
    {
        "content": (
            "The UAE's food safety regulatory framework is governed by the Emirates Authority "
            "for Standardization and Metrology (ESMA) and the Abu Dhabi Agriculture and Food "
            "Safety Authority (ADAFSA). All imported food products must comply with GSO 9/2007 "
            "(general labeling requirements), GSO 150/2013 (halal food standards), and UAE.S "
            "5009 (microbiological criteria). Products containing pork or alcohol derivatives "
            "are strictly prohibited. All labels must include Arabic text, ingredients listing, "
            "production and expiry dates, country of origin, and halal certification marks. "
            "The shelf-life at import must exceed 50% of total shelf-life for perishable goods."
        ),
        "source": "UAE Food Safety Regulatory Framework (ESMA/ADAFSA)",
        "source_type": "regulation",
        "region": "UAE",
    },
    {
        "content": (
            "Iraq's food import regulations are managed by the Central Organization for "
            "Standardization and Quality Control (COSQC). Key requirements include IQS 1720 "
            "for food labeling, mandatory health certificates from the exporting country, and "
            "conformity assessment through ICIGI or equivalent inspection bodies. Iraq applies "
            "a 5% customs tariff on most food categories, with exemptions for essential staples. "
            "Documentation requirements include certificate of origin, health certificate, "
            "commercial invoice, and bill of lading. All products must pass laboratory testing "
            "at Iraqi ports of entry."
        ),
        "source": "Iraq Import Regulations (COSQC)",
        "source_type": "regulation",
        "region": "Iraq",
    },
    {
        "content": (
            "The GCC Standardization Organization (GSO) harmonizes food standards across UAE, "
            "Saudi Arabia, Kuwait, Bahrain, Qatar, and Oman. Key standards: GSO 9 (labeling), "
            "GSO 150 (halal), GSO 21 (date marking), GSO 839 (nutritional labeling). The "
            "Gulf Conformity Marking (G-mark) is increasingly required for market access. "
            "Registration with the national food authority of each GCC state is mandatory. "
            "The Rapid Alert System for Food and Feed (RASFF-GCC) monitors safety incidents."
        ),
        "source": "GCC Food Standards Harmonization",
        "source_type": "trade_guide",
        "region": "Middle East",
    },
    {
        "content": (
            "For F&B companies entering Middle East markets, channel access typically involves: "
            "(1) Appointing a local distribution agent or partner (mandatory in most GCC states), "
            "(2) Registering products with the national food authority (e.g., DM in Dubai), "
            "(3) Obtaining halal certification from an accredited body (e.g., ESMA, JAKIM), "
            "(4) Securing warehouse and cold chain logistics (critical for perishables), "
            "(5) Negotiating shelf-space agreements with major retailers (Carrefour, Lulu, "
            "Spinneys, Union Coop). Supermarket listing fees range from $500-$5,000 per SKU."
        ),
        "source": "F&B Market Entry Channel Guide — Middle East",
        "source_type": "trade_guide",
        "region": "Middle East",
    },
    {
        "content": (
            "Germany's food regulations are among the most stringent globally, governed by "
            "BVL (Federal Office of Consumer Protection and Food Safety) under EU Regulation "
            "1169/2011. Requirements include: German-language labeling (or dual-language), "
            "full ingredient declaration with allergen highlighting, nutritional facts table, "
            "organic certification (Bio-Siegel) if applicable, and compliance with EU Maximum "
            "Residue Levels (MRLs). The Lebensmittelbuch (German Food Book) defines composition "
            "standards. HACCP certification is mandatory for all food manufacturers."
        ),
        "source": "Germany Food Import Requirements (BVL/EU)",
        "source_type": "regulation",
        "region": "Germany",
    },
]


def seed_sample_data(db: Session):
    """Seed the RAG knowledge base with sample regulatory documents."""
    existing = db.query(DocumentChunk).count()
    if existing > 0:
        logger.info(f"RAG knowledge base already has {existing} chunks, skipping seed")
        return

    for doc in SAMPLE_DOCUMENTS:
        ingest_document(
            db=db,
            content=doc["content"],
            source=doc["source"],
            source_type=doc["source_type"],
            region=doc["region"],
        )

    logger.info(f"Seeded RAG knowledge base with {len(SAMPLE_DOCUMENTS)} sample documents")
