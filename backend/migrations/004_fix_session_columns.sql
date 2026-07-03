-- MEP-light™ — Production Database Schema Update
-- Migration 004: Fix Assessment Sessions Columns
-- Version: 4.3.2
-- Date: 2026-07-03

-- This migration adds missing columns to assessment_sessions to match the application code's expectations.
-- The application code inserts into company_name and offering_name directly.

ALTER TABLE assessment_sessions
ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS offering_name TEXT DEFAULT '';
