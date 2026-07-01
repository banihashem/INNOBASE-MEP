"""
MEP-light™ — RAG API Routes (FastAPI)

Endpoints:
  POST /api/v2/rag/search   — Hybrid document search (Viewer+)
  POST /api/v2/rag/ingest   — Document ingestion (Administrator only)
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth import require_viewer, require_admin
from .database import get_db
from .rag import hybrid_search, ingest_document, stitch_citations

logger = logging.getLogger("mep.rag_routes")

router = APIRouter(prefix="/api/v2/rag", tags=["rag"])


# ─── Request / Response Models ────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    region: Optional[str] = None
    source_type: Optional[str] = None
    top_k: int = Field(default=5, ge=1, le=20)
    advisory_text: Optional[str] = None  # If provided, stitches citations


class SearchResult(BaseModel):
    chunk_id: str
    content: str
    source: str
    source_type: str
    region: str
    relevance_score: float
    metadata: dict = Field(default_factory=dict)


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total: int
    enriched_text: Optional[str] = None
    citations: list[dict] = Field(default_factory=list)


class IngestRequest(BaseModel):
    content: str = Field(min_length=10)
    source: str
    source_type: str = "regulation"
    region: str = "Middle East"
    metadata: Optional[dict] = None


class IngestResponse(BaseModel):
    success: bool
    chunk_ids: list[str]
    chunks_created: int


# ─── Endpoints ────────────────────────────────────────────────────────

@router.post("/search", response_model=SearchResponse)
async def search_documents(
    body: SearchRequest,
    user: dict = Depends(require_viewer),
    db: Session = Depends(get_db),
):
    """
    Search the RAG knowledge base for regulatory documents and trade guidelines.
    Supports hybrid retrieval (semantic + keyword).
    """
    results = hybrid_search(
        db=db,
        query=body.query,
        region=body.region,
        source_type=body.source_type,
        top_k=body.top_k,
    )

    # If advisory text provided, stitch citations
    enriched_text = None
    citations = []
    if body.advisory_text and results:
        citation_result = stitch_citations(body.advisory_text, results)
        enriched_text = citation_result["enriched_text"]
        citations = citation_result["citations"]

    return SearchResponse(
        results=[SearchResult(**r) for r in results],
        total=len(results),
        enriched_text=enriched_text,
        citations=citations,
    )


@router.post("/ingest", response_model=IngestResponse)
async def ingest_documents(
    body: IngestRequest,
    user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Ingest a document into the RAG knowledge base.
    Administrator access required.
    """
    try:
        chunk_ids = ingest_document(
            db=db,
            content=body.content,
            source=body.source,
            source_type=body.source_type,
            region=body.region,
            metadata=body.metadata,
        )

        logger.info(
            "Document ingested via API",
            extra={
                "user_email": user.get("email", "unknown"),
                "source": body.source,
                "chunks": len(chunk_ids),
            },
        )

        return IngestResponse(
            success=True,
            chunk_ids=chunk_ids,
            chunks_created=len(chunk_ids),
        )
    except Exception as e:
        logger.error(f"Document ingestion failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Document ingestion failed")
