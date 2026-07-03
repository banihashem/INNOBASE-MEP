# MEP-light™ — Evidence & RAG Roadmap

**Version**: 4.0 | **Date**: 2026-07-03

---

## Current State
- RAG module exists (`backend/python/rag.py`) with Gemini embedding support
- `DocumentChunk` model with pgvector column (conditional import)
- No production RAG pipeline active

## Phase 1: Foundation (Current)
- ✅ Document chunking and embedding logic
- ✅ pgvector-ready schema (`document_chunks` table)
- ✅ Evidence item model in 13-entity schema
- ⬜ Cloud SQL pgvector extension activation

## Phase 2: Evidence Integration (Next)
- Connect Evidence Curator Agent to RAG pipeline
- Implement evidence search by dimension + market
- Add evidence confidence scoring based on source type
- Integrate evidence references into scoring agent

## Phase 3: Knowledge Base (Future)
- Ingest regulatory documents (trade guides, market reports)
- Build market-specific knowledge indices
- Implement citation chain tracking
- Add evidence freshness scoring

## Phase 4: Advanced (Long-term)
- Multi-modal evidence (images, PDFs, data tables)
- Cross-market evidence correlation
- Automated evidence gap detection
- Evidence quality scoring via LLM evaluation

## Technical Requirements
| Requirement | Solution |
|------------|----------|
| Vector storage | pgvector on Cloud SQL |
| Embedding model | Gemini `text-embedding-004` (768 dims) |
| Similarity search | Cosine distance via pgvector |
| Document parsing | Python `unstructured` library |
| Citation tracking | Evidence → Score → Report chain |
