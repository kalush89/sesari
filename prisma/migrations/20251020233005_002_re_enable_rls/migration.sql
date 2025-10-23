-- 1. SCHEMAS (Ensure the dependency schema exists)

-- Assuming the 'auth' schema was not created by a prior migration,
-- ensure it exists before creating functions within it.
CREATE SCHEMA IF NOT EXISTS auth;

-- 2. CUSTOM RLS FUNCTIONS (Must be defined before policies use them)

-- Drop the function first to allow for return type changes (as previously necessary)
DROP FUNCTION IF EXISTS auth.user_id();

-- Create function to get current user ID from JWT token
-- This function will be used in RLS policies to identify the current user.
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS TEXT AS $$
SELECT COALESCE(
-- FIX: Explicitly cast to TEXT since we are now using CUID/String IDs
current_setting('request.jwt.claims', true)::json->>'sub',
current_setting('request.jwt.claims', true)::json->>'user_id'
)
$$ LANGUAGE SQL STABLE;

-- Alternative function for cases where user_id is set in a different way
-- NOTE: If your internal IDs are CUIDs (TEXT), this function should also return TEXT
CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS TEXT AS $$
SELECT COALESCE(
-- Ensure app.current_user_id is also cast to TEXT
current_setting('app.current_user_id', true),
auth.user_id()
)
$$ LANGUAGE SQL STABLE;

-- 3. ENABLE RLS ON TABLES

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY; -- ADDED
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_tracking" ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES (Must use the functions defined in Step 2)

-- RLS Policy for users table (CRITICAL FOR FK VALIDATION)
-- Allows users to see and update their own user profile data.
CREATE POLICY "user_own_data" ON "users"
FOR ALL USING (id = auth.user_id()); -- ADDED

-- RLS Policy for workspaces table
-- Users can only see workspaces where they are members
CREATE POLICY "workspace_access" ON "workspaces"
FOR ALL USING (
id IN (
SELECT workspace_id
FROM workspace_memberships
WHERE user_id = get_current_user_id()
)
);

-- RLS Policy for workspace_memberships table (Viewing)
-- Users can only see memberships for workspaces they belong to
CREATE POLICY "membership_access" ON "workspace_memberships"
FOR ALL USING (
workspace_id IN (
SELECT workspace_id
FROM workspace_memberships
WHERE user_id = get_current_user_id()
)
);

-- Additional policy for workspace owners to manage memberships (Updating/Inserting/Deleting)
CREATE POLICY "workspace_owner_membership_management" ON "workspace_memberships"
FOR ALL USING (
workspace_id IN (
SELECT id
FROM workspaces
WHERE owner_id = get_current_user_id()
)
);

-- Policy for users to see their own memberships (Self-access)
CREATE POLICY "user_own_memberships" ON "workspace_memberships"
FOR ALL USING (user_id = get_current_user_id());

-- Create RLS policy for workspace invitations
-- Users can only see invitations for workspaces they have access to
CREATE POLICY "workspace_invitations_access" ON "workspace_invitations"
FOR ALL USING (
workspace_id IN (
SELECT workspace_id FROM workspace_memberships
WHERE user_id = auth.user_id()
)
);

-- RLS policies for subscriptions table
CREATE POLICY "Users can view their own subscription" ON "subscriptions"
FOR SELECT USING (user_id = auth.user_id());

CREATE POLICY "Users can update their own subscription" ON "subscriptions"
FOR UPDATE USING (user_id = auth.user_id());

CREATE POLICY "System can manage all subscriptions" ON "subscriptions"
FOR ALL USING (current_setting('role') = 'service_role');

-- Create RLS policies for usage_tracking table
CREATE POLICY "Workspace members can view usage tracking" ON "usage_tracking"
FOR SELECT USING (
workspace_id IN (
SELECT workspace_id
FROM workspace_memberships
WHERE user_id = auth.user_id()
)
);

CREATE POLICY "Workspace owners can update usage tracking" ON "usage_tracking"
FOR UPDATE USING (
workspace_id IN (
SELECT id
FROM workspaces
WHERE owner_id = auth.user_id()
)
);

CREATE POLICY "System can manage all usage tracking" ON "usage_tracking"
FOR ALL USING (current_setting('role') = 'service_role');

-- 5. CONSTRAINTS (Ensures data integrity)

-- Add role validation constraint
ALTER TABLE "workspace_memberships"
ADD CONSTRAINT "valid_role" CHECK (role IN ('owner', 'admin', 'member'));

-- Add plan type validation constraint  
ALTER TABLE "workspaces"
ADD CONSTRAINT "valid_plan_type" CHECK (plan_type IN ('free', 'starter', 'pro'));

-- 6. INDEXES (Optimizes RLS and foreign key lookups)

CREATE INDEX IF NOT EXISTS "idx_workspace_memberships_user_id" ON "workspace_memberships"("user_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_memberships_workspace_id" ON "workspace_memberships"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workspaces_owner_id" ON "workspaces"("owner_id");

-- Indexes for efficient queries on invitations
CREATE INDEX IF NOT EXISTS "idx_workspace_invitations_workspace_id" ON "workspace_invitations"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_invitations_email" ON "workspace_invitations"("email");
CREATE INDEX IF NOT EXISTS "idx_workspace_invitations_expires_at" ON "workspace_invitations"("expires_at");