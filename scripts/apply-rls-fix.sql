-- Fix RLS policies to work properly in test environment
-- Remove dependency on auth schema which may not exist

-- Drop existing policies
DROP POLICY IF EXISTS "workspace_access" ON "workspaces";
DROP POLICY IF EXISTS "membership_access" ON "workspace_memberships";
DROP POLICY IF EXISTS "workspace_owner_membership_management" ON "workspace_memberships";
DROP POLICY IF EXISTS "user_own_memberships" ON "workspace_memberships";

-- Drop existing functions
DROP FUNCTION IF EXISTS auth.user_id();
DROP FUNCTION IF EXISTS get_current_user_id();

-- Create a simpler function that only relies on app settings
CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Simplified RLS Policy for workspaces table
CREATE POLICY "workspace_access" ON "workspaces"
  FOR ALL USING (
    CASE 
      WHEN get_current_user_id() IS NULL OR get_current_user_id() = '' THEN false
      ELSE id IN (
        SELECT workspace_id 
        FROM workspace_memberships 
        WHERE user_id = get_current_user_id()
      )
    END
  );

-- Simplified RLS Policy for workspace_memberships table
CREATE POLICY "membership_access" ON "workspace_memberships"
  FOR ALL USING (
    CASE 
      WHEN get_current_user_id() IS NULL OR get_current_user_id() = '' THEN false
      ELSE workspace_id IN (
        SELECT workspace_id 
        FROM workspace_memberships 
        WHERE user_id = get_current_user_id()
      )
    END
  );

-- Policy for workspace owners to manage memberships
CREATE POLICY "workspace_owner_membership_management" ON "workspace_memberships"
  FOR ALL USING (
    CASE 
      WHEN get_current_user_id() IS NULL OR get_current_user_id() = '' THEN false
      ELSE workspace_id IN (
        SELECT id 
        FROM workspaces 
        WHERE owner_id = get_current_user_id()
      )
    END
  );

-- Policy for users to see their own memberships
CREATE POLICY "user_own_memberships" ON "workspace_memberships"
  FOR ALL USING (
    CASE 
      WHEN get_current_user_id() IS NULL OR get_current_user_id() = '' THEN false
      ELSE user_id = get_current_user_id()
    END
  );