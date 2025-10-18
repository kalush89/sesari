# Workspace Invitation System Implementation

## Overview

This document describes the implementation of the workspace membership and invitation system for Sesari. The system allows workspace owners and admins to invite new members to their workspaces, with automatic workspace assignment when invited users sign in.

## Database Schema

### WorkspaceInvitation Model

```prisma
model WorkspaceInvitation {
  id          String    @id @default(uuid())
  workspaceId String    @map("workspace_id")
  email       String
  role        String    // owner, admin, member
  invitedBy   String    @map("invited_by")
  invitedAt   DateTime  @default(now()) @map("invited_at")
  expiresAt   DateTime  @map("expires_at")
  accepted    Boolean   @default(false)
  acceptedAt  DateTime? @map("accepted_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  inviter   User      @relation("WorkspaceInviter", fields: [invitedBy], references: [id], onDelete: Cascade)

  @@unique([workspaceId, email])
  @@map("workspace_invitations")
}
```

### Row-Level Security

- RLS is enabled on the `workspace_invitations` table
- Users can only see invitations for workspaces they have access to
- Proper indexes are created for efficient queries

## API Endpoints

### 1. GET /api/workspaces/[workspaceId]/members

**Purpose**: Get all members and pending invitations for a workspace

**Authorization**: User must be a member of the workspace

**Response**:
```json
{
  "members": [
    {
      "id": "member-id",
      "role": "admin",
      "joinedAt": "2024-01-01T00:00:00Z",
      "user": {
        "id": "user-id",
        "name": "User Name",
        "email": "user@example.com",
        "image": "avatar-url"
      }
    }
  ],
  "pendingInvitations": [
    {
      "id": "invitation-id",
      "email": "invited@example.com",
      "role": "member",
      "invitedAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-01-08T00:00:00Z"
    }
  ],
  "userRole": "owner"
}
```

**Notes**: 
- Pending invitations are only shown to users with `INVITE_MEMBERS` permission
- Members are ordered by role (owners first) then by join date

### 2. POST /api/workspaces/[workspaceId]/members

**Purpose**: Invite a new member to the workspace

**Authorization**: User must have `INVITE_MEMBERS` permission

**Request Body**:
```json
{
  "email": "newmember@example.com",
  "role": "member"
}
```

**Response**:
```json
{
  "message": "Invitation sent successfully",
  "invitation": {
    "id": "invitation-id",
    "email": "newmember@example.com",
    "role": "member",
    "invitedAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2024-01-08T00:00:00Z"
  }
}
```

**Validation**:
- Email must be valid
- Role must be 'admin' or 'member' (cannot invite owners)
- User cannot already be a member
- No duplicate pending invitations

### 3. PATCH /api/workspaces/[workspaceId]/members/[memberId]

**Purpose**: Update a member's role

**Authorization**: Only workspace owners can change roles

**Request Body**:
```json
{
  "role": "admin"
}
```

**Restrictions**:
- Cannot change the workspace owner's role
- Cannot change your own role
- Only owners can change member roles

### 4. DELETE /api/workspaces/[workspaceId]/members/[memberId]

**Purpose**: Remove a member from the workspace

**Authorization**: 
- Workspace owners can remove any member
- Members can remove themselves

**Restrictions**:
- Cannot remove the workspace owner
- Cannot remove other members unless you're the owner

### 5. DELETE /api/workspaces/[workspaceId]/invitations/[invitationId]

**Purpose**: Cancel a pending invitation

**Authorization**: User must have `INVITE_MEMBERS` permission

### 6. POST /api/workspaces/[workspaceId]/invitations/[invitationId]/resend

**Purpose**: Resend a pending invitation (extends expiry date)

**Authorization**: User must have `INVITE_MEMBERS` permission

### 7. POST /api/invitations/accept

**Purpose**: Accept a workspace invitation

**Authorization**: User must be authenticated and invitation must be for their email

**Request Body**:
```json
{
  "invitationId": "invitation-uuid"
}
```

**Process**:
1. Validates invitation exists and is not expired
2. Creates workspace membership
3. Marks invitation as accepted
4. Uses database transaction for consistency

### 8. GET /api/invitations/pending

**Purpose**: Get pending invitations for the current user

**Authorization**: User must be authenticated

**Response**:
```json
{
  "invitations": [
    {
      "id": "invitation-id",
      "email": "user@example.com",
      "role": "member",
      "workspace": {
        "id": "workspace-id",
        "name": "Workspace Name",
        "slug": "workspace-slug"
      },
      "inviter": {
        "name": "Inviter Name",
        "email": "inviter@example.com"
      }
    }
  ],
  "count": 1
}
```

## Utility Functions

### processPendingInvitations(userId, email)

**Purpose**: Automatically process pending invitations when a user signs in

**Process**:
1. Find all non-expired, pending invitations for the user's email
2. For each invitation:
   - Check if user is already a member (skip if so)
   - Create workspace membership
   - Mark invitation as accepted
3. Use transactions for data consistency
4. Return count of processed invitations

**Integration**: Called automatically in NextAuth `signIn` event

### getPendingInvitations(email)

**Purpose**: Get all pending invitations for an email address

**Returns**: Array of invitations with workspace and inviter details

### cleanupExpiredInvitations()

**Purpose**: Remove expired, unaccepted invitations

**Usage**: Can be called periodically to clean up the database

## Security Features

### Permission-Based Access Control

- **INVITE_MEMBERS**: Required to invite new members (OWNER, ADMIN)
- **MANAGE_WORKSPACE**: Required for advanced member management (OWNER only)

### Data Validation

- All inputs validated with Zod schemas
- Email format validation
- Role validation (cannot invite owners)
- Duplicate invitation prevention

### Row-Level Security

- All database queries automatically enforce workspace isolation
- Users can only access invitations for workspaces they belong to
- RLS policies prevent data leakage between workspaces

### Invitation Security

- Invitations expire after 7 days
- Unique constraint prevents duplicate invitations
- Invitations are tied to specific email addresses
- Automatic cleanup of expired invitations

## Integration with Authentication

### NextAuth Configuration

The system integrates with NextAuth through the `signIn` event:

```typescript
events: {
  async signIn({ user, isNewUser }) {
    // Process pending invitations for both new and existing users
    if (user.id && user.email) {
      const { processPendingInvitations } = await import('./invitation-utils');
      const result = await processPendingInvitations(user.id, user.email);
      
      if (result.processedCount > 0) {
        console.log(`Processed ${result.processedCount} pending invitations`);
      }
    }
  }
}
```

### Automatic Workspace Assignment

When a user signs in:
1. System checks for pending invitations matching their email
2. Automatically creates workspace memberships for valid invitations
3. Marks invitations as accepted
4. User gains immediate access to invited workspaces

## Requirements Fulfillment

### Requirement 2.1: Create pending workspace membership record
✅ **Implemented**: `POST /api/workspaces/[workspaceId]/members` creates `WorkspaceInvitation` records

### Requirement 2.2: Automatically add invited users to workspace
✅ **Implemented**: `processPendingInvitations()` automatically processes invitations during sign-in

### Requirement 2.3: Enforce role permissions immediately
✅ **Implemented**: Permissions are enforced immediately when membership is created

### Requirement 2.4: Handle invitation expiry
✅ **Implemented**: 
- Invitations expire after 7 days
- Expired invitations are ignored during processing
- `cleanupExpiredInvitations()` utility for cleanup

## Testing

### Unit Tests
- `invitation-utils.test.ts`: Tests for utility functions
- Covers invitation processing, expiry handling, and cleanup

### Integration Tests
- `members/route.test.ts`: Tests for member management API endpoints
- Covers authentication, authorization, and business logic

### Validation Scripts
- `validate-invitation-api.js`: Validates API structure and database connectivity
- `test-invitation-system.ts`: End-to-end functionality testing

## Future Enhancements

1. **Email Notifications**: Send actual invitation emails (currently TODO)
2. **Invitation Templates**: Customizable invitation messages
3. **Bulk Invitations**: Invite multiple users at once
4. **Invitation Analytics**: Track invitation acceptance rates
5. **Custom Expiry**: Allow custom expiration times for invitations

## Error Handling

The system includes comprehensive error handling:

- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Workspace or invitation not found
- **409 Conflict**: Duplicate invitations or existing members
- **400 Bad Request**: Invalid input data
- **500 Internal Server Error**: Database or system errors

All errors include user-friendly messages and appropriate HTTP status codes.