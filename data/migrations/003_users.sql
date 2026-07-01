-- MEP-light™ — User Management Schema
-- Migration 003: Users table with RBAC and audit fields
--
-- Run against PostgreSQL:
--   psql -d mep_light -f 003_users.sql

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) DEFAULT '',
    avatar_url VARCHAR(500) DEFAULT '',
    role VARCHAR(50) NOT NULL DEFAULT 'Viewer',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    company_name VARCHAR(255) DEFAULT '',
    department VARCHAR(100) DEFAULT '',
    title VARCHAR(100) DEFAULT '',
    total_sessions INTEGER DEFAULT 0,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) DEFAULT 'system',
    notes TEXT DEFAULT ''
);

-- Indexes for search and filter performance
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);
CREATE INDEX IF NOT EXISTS ix_users_status ON users(status);
CREATE INDEX IF NOT EXISTS ix_users_company ON users(company_name);

-- Check constraints
ALTER TABLE users ADD CONSTRAINT chk_users_role
    CHECK (role IN ('Viewer', 'Consultant', 'Administrator'));

ALTER TABLE users ADD CONSTRAINT chk_users_status
    CHECK (status IN ('invited', 'active', 'deactivated'));

COMMIT;
