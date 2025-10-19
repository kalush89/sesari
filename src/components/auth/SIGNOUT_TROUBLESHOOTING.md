# Sign-Out Troubleshooting Guide

## Issue Description
When clicking the sign-out button, the page reloads but the user remains authenticated and the dashboard displays with full information as if the logout didn't occur.

## Root Causes Identified

### 1. **Complex Workspace Cleanup Interference**
The original `SignOutButton` performs extensive workspace context cleanup that might interfere with NextAuth's sign-out process.

### 2. **Session Persistence Issues**
The session might be getting restored from:
- Browser localStorage (workspace context)
- NextAuth session cookies
- Server-side session storage

### 3. **Middleware Interference**
The authentication middleware might be interfering with the sign-out redirect flow.

### 4. **Client-Side State Management**
The new `useAuth` hook and workspace store might be restoring state after sign-out.

## Solutions Provided

### 1. **SimpleSignOutButton** (`src/components/auth/SimpleSignOutButton.tsx`)
- Minimal cleanup approach
- Clears storage and calls NextAuth signOut directly
- Bypasses complex workspace cleanup logic

### 2. **ForceSignOutButton** (`src/components/auth/ForceSignOutButton.tsx`)
- Direct API approach
- Calls NextAuth API endpoints directly
- Clears all cookies and storage
- Forces redirect to sign-in page

### 3. **SignOutDebugInfo** (`src/components/auth/SignOutDebugInfo.tsx`)
- Shows current authentication state
- Displays NextAuth session, useAuth state, and workspace store state
- Helps identify what's persisting after sign-out

### 4. **Test Page** (`src/app/test-signout-debug/page.tsx`)
- Comprehensive testing environment
- Multiple sign-out methods to try
- Debug information display
- Manual cleanup options

## Testing Instructions

1. **Navigate to the test page**: `/test-signout-debug`

2. **Check current state**: Review the debug info to see what's currently stored

3. **Try sign-out methods in order**:
   - First try `SimpleSignOutButton`
   - If that fails, try `ForceSignOutButton`
   - If still failing, use manual cleanup buttons

4. **Verify sign-out success**:
   - Page should redirect to `/signin`
   - Navigating to `/dashboard` should redirect back to `/signin`
   - Debug info should show no session or workspace data

## Recommended Fix

Based on the testing results, update the main dashboard to use whichever sign-out method works reliably:

```tsx
// Replace in src/app/dashboard/page.tsx
import { SimpleSignOutButton } from '@/components/auth/SimpleSignOutButton';

// In the component:
<SimpleSignOutButton />
```

## Additional Optimizations Made

### Performance Improvements
- Added caching to workspace store (5-minute cache)
- Reduced SessionProvider refetch frequency
- Optimized database queries with better indexing
- Added debouncing to prevent multiple concurrent API calls

### Database Optimizations
- Created migration `004_optimize_workspace_queries` with proper indexes
- Optimized workspace list API query with selective field loading

## Files Modified/Created

### New Components
- `src/components/auth/SimpleSignOutButton.tsx`
- `src/components/auth/ForceSignOutButton.tsx`
- `src/components/auth/SignOutDebugInfo.tsx`
- `src/app/test-signout-debug/page.tsx`

### Modified Files
- `src/components/auth/SignOutButton.tsx` - Improved error handling
- `src/lib/hooks/use-auth.ts` - Enhanced signOut function
- `src/components/providers/SessionProvider.tsx` - Reduced refetch frequency
- `src/components/providers/WorkspaceProvider.tsx` - Added debouncing
- `src/lib/stores/workspace-store.ts` - Added caching mechanism
- `src/app/api/auth/workspace/list/route.ts` - Optimized queries

### Database Migration
- `prisma/migrations/004_optimize_workspace_queries/migration.sql` - Performance indexes

## Next Steps

1. Test the sign-out functionality using the debug page
2. Identify which method works reliably
3. Update the main dashboard to use the working method
4. Remove the debug components once the issue is resolved
5. Apply the database migration to improve performance