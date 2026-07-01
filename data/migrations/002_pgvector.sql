-- MEP-light™ — pgvector Extension & Document Chunks
-- Migration 002: Vector search for RAG pipeline
--
-- Prerequisites:
--   PostgreSQL with pgvector extension installed
--   CREATE EXTENSION vector;

BEGIN;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Document Chunks (RAG Vector Store) ─────────────────────────────

CREATE TABLE IF NOT EXISTS document_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    source VARCHAR(500) DEFAULT '',
    source_type VARCHAR(100) DEFAULT '',
    region VARCHAR(100) DEFAULT '',
    metadata_json JSONB DEFAULT '{}',
    embedding_text TEXT DEFAULT '',
    embedding vector(768),  -- text-embedding-gecko output dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- IVFFlat index for cosine similarity search
-- Note: Requires at least 100 rows for IVFFlat; use HNSW for smaller datasets
CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding
    ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

CREATE INDEX IF NOT EXISTS ix_document_chunks_source
    ON document_chunks(source_type, region);

-- Full-text search index for hybrid retrieval (BM25-style)
CREATE INDEX IF NOT EXISTS ix_document_chunks_content_fts
    ON document_chunks USING gin(to_tsvector('english', content));

COMMIT;
