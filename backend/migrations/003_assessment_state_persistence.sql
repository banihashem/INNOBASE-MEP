-- MEP-light™ — Production Database Schema Update
-- Migration 003: Assessment State Persistence
-- Version: 4.3.0
-- Date: 2026-07-03

-- This migration adds state persistence fields to the `assessment_sessions` table
-- to enable robust frontend state rehydration and enforce the Human Review Gate.

ALTER TABLE assessment_sessions
ADD COLUMN IF NOT EXISTS state_snapshot JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS completion_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'pending' 
    CHECK (review_status IN ('pending', 'approved', 'revision_requested')),
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Indices for performance on new tracking fields
CREATE INDEX IF NOT EXISTS idx_sessions_review_status ON assessment_sessions(review_status);
