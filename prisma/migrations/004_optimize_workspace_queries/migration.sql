-- Migration to optimize workspace-related queries
-- This addresses the performance issues seen in the logs

-- Add composite index for workspace membership queries
-- This will speed up the frequent queries for user workspace memberships
CREATE INDEX IF NOT EXISTS "workspace_memberships_user_joined_idx" 
ON "workspace_memberships" ("user_id", "joined_at" DESC);

-- Add index for workspace membership by workspace and user
-- This will speed up workspace access validation
CREATE INDEX IF NOT EXISTS "workspace_memberships_workspace_user_idx" 
ON "workspace_memberships" ("workspace_id", "user_id");

-- Add index for session token lookups (if not already exists)
-- This will speed up session validation queries
CREATE INDEX IF NOT EXISTS "sessions_token_idx" 
ON "sessions" ("session_token");

-- Add index for user lookups by ID (if not already exists)
-- This will speed up user queries in session callbacks
CREATE INDEX IF NOT EXISTS "users_id_idx" 
ON "users" ("id");

-- Add index for workspace lookups by ID
-- This will speed up workspace detail queries
CREATE INDEX IF NOT EXISTS "workspaces_id_idx" 
ON "workspaces" ("id");

-- Add index for workspace owner lookups
-- This will help with permission checks
CREATE INDEX IF NOT EXISTS "workspaces_owner_idx" 
ON "workspaces" ("owner_id");