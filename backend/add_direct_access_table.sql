-- Migration: Add direct_access table for user/department-based access control
-- Created: 2025

CREATE TABLE IF NOT EXISTS direct_access (
    id VARCHAR(255) PRIMARY KEY,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    user_ids TEXT[] DEFAULT '{}',
    department_ids TEXT[] DEFAULT '{}',
    permission VARCHAR(50) DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unique constraint to ensure one direct_access per resource
CREATE UNIQUE INDEX IF NOT EXISTS idx_direct_access_resource 
    ON direct_access(resource_type, resource_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_direct_access_user_ids 
    ON direct_access USING GIN(user_ids);

CREATE INDEX IF NOT EXISTS idx_direct_access_department_ids 
    ON direct_access USING GIN(department_ids);

COMMENT ON TABLE direct_access IS 'Stores direct access permissions for resources (calendars, todos, content-plans) with user and department selection';
COMMENT ON COLUMN direct_access.resource_type IS  'Type of resource: calendar, todos, content-plan, task, list';
COMMENT ON COLUMN direct_access.resource_id IS 'ID of the specific resource';
COMMENT ON COLUMN direct_access.user_ids IS 'Array of user IDs with access';
COMMENT ON COLUMN direct_access.department_ids IS 'Array of department IDs with access';
COMMENT ON COLUMN direct_access.permission IS 'viewer or editor';
