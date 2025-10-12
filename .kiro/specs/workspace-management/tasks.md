# Implementation Plan

- [ ] 1. Set up database schema and RLS policies
  - Create workspace-related database tables with proper relationships
  - Implement Row-Level Security policies for data isolation
  - Add workspace_id foreign keys to existing KPIs and goals tables
  - Create database migration scripts for schema changes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 2. Create core workspace data models and types
  - Define TypeScript interfaces for Workspace, WorkspaceUser, and WorkspaceInvitation
  - Create WorkspaceRole enum and permission validation utilities
  - Implement database query functions with RLS context setting
  - Write unit tests for data model validation and RLS enforcement
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2_

- [ ] 3. Implement workspace CRUD API routes
  - Create /api/workspaces endpoints for listing, creating, updating, and deleting workspaces
  - Implement permission checks ensuring only owners can delete workspaces
  - Add proper error handling with structured error responses
  - Write API route tests covering success and error scenarios
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.2, 5.3_

- [ ] 4. Build workspace invitation system API
  - Create /api/workspaces/[id]/invitations endpoints for sending and managing invitations
  - Implement /api/invitations/[token] endpoints for accepting/declining invitations
  - Add email notification integration for invitation sending
  - Create invitation token generation and validation logic
  - Write tests for invitation lifecycle including expiration handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 5. Implement workspace member management API
  - Create /api/workspaces/[id]/members endpoints for listing and managing members
  - Add role update functionality with proper permission validation
  - Implement member removal with ownership transfer prevention
  - Write tests for member management operations and permission enforcement
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. Create workspace context provider and hooks
  - Implement WorkspaceProvider component for managing workspace state
  - Create useWorkspace hook for accessing current workspace context
  - Add workspace switching logic with URL updates and context preservation
  - Implement loading states and error handling in workspace context
  - Write unit tests for context provider and workspace switching logic
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ] 7. Build workspace switcher UI component
  - Create WorkspaceSwitcher dropdown component for navigation
  - Integrate workspace switcher with existing Sidebar component
  - Implement conditional display logic for single vs multiple workspaces
  - Add workspace creation button and modal integration
  - Write component tests for workspace switcher functionality
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 8. Implement workspace settings and management UI
  - Create WorkspaceSettings component for workspace configuration
  - Build member management interface with role display and editing
  - Implement invitation management UI with pending invitation display
  - Add workspace deletion confirmation with proper owner validation
  - Write component tests for settings and member management interfaces
  - _Requirements: 1.3, 1.4, 1.5, 2.5, 5.1, 6.1, 6.2, 6.3, 6.4_

- [ ] 9. Create invitation acceptance flow UI
  - Build invitation acceptance page with token validation
  - Implement accept/decline invitation interface with user feedback
  - Add error handling for expired or invalid invitations
  - Create success/error states for invitation processing
  - Write tests for invitation acceptance flow and error scenarios
  - _Requirements: 2.2, 2.3_

- [ ] 10. Integrate workspace context with existing data queries
  - Update KPI queries to include workspace context and filtering
  - Modify goal queries to respect workspace boundaries
  - Add workspace_id parameter to all data creation operations
  - Implement workspace context middleware for API routes
  - Write integration tests for workspace data isolation
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 11. Add workspace URL routing and navigation
  - Implement workspace-aware URL structure (/workspace/[slug]/dashboard)
  - Update navigation components to include workspace context in links
  - Add workspace slug resolution and validation middleware
  - Implement proper redirects for workspace switching
  - Write tests for URL routing and workspace context preservation
  - _Requirements: 3.2, 3.3, 3.5_

- [ ] 12. Create default workspace migration for existing users
  - Implement migration script to create default workspaces for existing users
  - Associate existing KPIs and goals with user's default workspace
  - Add workspace owner role assignment for migrated users
  - Create rollback mechanism for migration safety
  - Write tests for migration script and data integrity validation
  - _Requirements: 1.1, 4.1, 4.2, 4.3_

- [ ] 13. Implement comprehensive error handling and user feedback
  - Add user-friendly error messages for all workspace operations
  - Implement toast notifications for workspace actions (create, switch, invite)
  - Create error boundary components for workspace-related failures
  - Add loading states for all async workspace operations
  - Write tests for error handling and user feedback scenarios
  - _Requirements: 5.3, 5.4, 5.5_

- [ ] 14. Add workspace permission validation throughout the application
  - Implement permission checks in all workspace-related UI components
  - Add role-based feature visibility (hide admin features from members)
  - Create permission validation hooks for component-level access control
  - Implement server-side permission validation for all API endpoints
  - Write comprehensive tests for permission enforcement across the application
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.2, 6.3, 6.4_