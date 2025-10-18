-- Enable Row Level Security on workspace-related tables
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_memberships" ENABLE ROW LEVEL SECURITY;

-- Create function to get current user ID from JWT token
-- This function will be used in RLS policies to identify the current user
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'user_id')::text
  )
$$ LANGUAGE SQL STABLE;

-- Alternative function for cases where user_id is set in a different way
CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('app.current_user_id', true),
    auth.user_id()
  )
$$ LANGUAGE SQL STABLE;

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

-- RLS Policy for workspace_memberships table
-- Users can only see memberships for workspaces they belong to
CREATE POLICY "membership_access" ON "workspace_memberships"
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_memberships 
      WHERE user_id = get_current_user_id()
    )
  );

-- Additional policy for workspace owners to manage memberships
CREATE POLICY "workspace_owner_membership_management" ON "workspace_memberships"
  FOR ALL USING (
    workspace_id IN (
      SELECT id 
      FROM workspaces 
      WHERE owner_id = get_current_user_id()
    )
  );

-- Policy for users to see their own memberships
CREATE POLICY "user_own_memberships" ON "workspace_memberships"
  FOR ALL USING (user_id = get_current_user_id());

-- Create indexes for better RLS performance
CREATE INDEX IF NOT EXISTS "idx_workspace_memberships_user_id" ON "workspace_memberships"("user_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_memberships_workspace_id" ON "workspace_memberships"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workspaces_owner_id" ON "workspaces"("owner_id");

-- Add role validation constraint
ALTER TABLE "workspace_memberships" 
ADD CONSTRAINT "valid_role" CHECK (role IN ('owner', 'admin', 'member'));

-- Add plan type validation constraint  
ALTER TABLE "workspaces"
ADD CONSTRAINT "valid_plan_type" CHECK (plan_type IN ('free', 'starter', 'pro'));