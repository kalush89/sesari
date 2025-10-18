# Authentication UI Components

This directory contains all the user interface components for the Sesari authentication system. These components provide a complete authentication experience with Google OAuth, workspace selection, and comprehensive error handling.

## Components Overview

### Core Authentication Components

#### `SignInForm.tsx`
Enhanced Google OAuth sign-in form with comprehensive error handling and loading states.

**Features:**
- Google OAuth integration with NextAuth.js
- Detailed error handling for different OAuth failure scenarios
- Loading states with progress indicators
- Retry functionality for recoverable errors
- Network error detection and handling
- Session establishment verification
- Accessibility support with ARIA labels

**Usage:**
```tsx
import { SignInForm } from '@/components/auth/SignInForm';

<SignInForm />
```

#### `AuthErrorDisplay.tsx`
Comprehensive error display component for authentication failures.

**Features:**
- Specific error messages for different failure types
- Visual error categorization (network, OAuth, configuration)
- Retry options for recoverable errors
- User-friendly error explanations
- Error code display for debugging

**Usage:**
```tsx
import { AuthErrorDisplay } from '@/components/auth/AuthErrorDisplay';

<AuthErrorDisplay />
```

#### `SignOutButton.tsx`
Button component for user sign-out functionality.

**Usage:**
```tsx
import { SignOutButton } from '@/components/auth/SignOutButton';

<SignOutButton />
```

### Loading and Status Components

#### `AuthLoadingState.tsx`
Advanced loading state component with progress tracking and timeout handling.

**Features:**
- Customizable loading messages
- Progress bar with percentage tracking
- Timeout detection with user feedback
- Multiple loading phases (connecting, verifying, setting up)
- Accessibility support

**Usage:**
```tsx
import { AuthLoadingState, AuthSpinner } from '@/components/auth/AuthLoadingState';

// Full loading state with progress
<AuthLoadingState 
  message="Signing you in..." 
  showProgress={true}
  timeout={30000}
  onTimeout={() => console.log('Timeout reached')}
/>

// Simple spinner
<AuthSpinner size="md" />
```

#### `AuthStatusIndicator.tsx`
Real-time authentication and workspace status indicator.

**Features:**
- Visual status indicators (green/yellow/red)
- Detailed status messages
- Development mode debugging information
- Compact dot version for navigation
- Real-time status updates

**Usage:**
```tsx
import { AuthStatusIndicator, AuthStatusDot } from '@/components/auth/AuthStatusIndicator';

// Full status indicator
<AuthStatusIndicator showDetails={true} />

// Compact dot indicator
<AuthStatusDot />
```

### Workspace Components

#### `WorkspaceSelectionModal.tsx`
Modal for workspace selection when users have multiple workspace access.

**Features:**
- Multi-workspace selection interface
- Visual workspace selection with radio buttons
- Role display for each workspace
- Loading states during workspace switching
- Error handling for workspace operations
- Keyboard navigation support

**Usage:**
```tsx
import { WorkspaceSelectionModal, useWorkspaceSelection } from '@/components/auth/WorkspaceSelectionModal';

function MyComponent() {
  const { isModalOpen, closeModal, handleWorkspaceSelected } = useWorkspaceSelection();
  
  return (
    <WorkspaceSelectionModal
      isOpen={isModalOpen}
      onClose={closeModal}
      onWorkspaceSelected={handleWorkspaceSelected}
    />
  );
}
```

#### `PermissionGate.tsx`
Component for role-based access control in the UI.

**Usage:**
```tsx
import { PermissionGate } from '@/components/auth/PermissionGate';

<PermissionGate permission="CREATE_KPI">
  <CreateKPIButton />
</PermissionGate>
```

## Integration Examples

### Complete Sign-In Page
```tsx
import { SignInForm } from '@/components/auth/SignInForm';
import { AuthStatusIndicator } from '@/components/auth/AuthStatusIndicator';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-lg border border-gray-200">
          <SignInForm />
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <AuthStatusIndicator showDetails />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Dashboard with Workspace Selection
```tsx
import { useWorkspaceSelection, WorkspaceSelectionModal } from '@/components/auth/WorkspaceSelectionModal';
import { AuthStatusDot } from '@/components/auth/AuthStatusIndicator';

export default function Dashboard() {
  const { isModalOpen, closeModal, handleWorkspaceSelected } = useWorkspaceSelection();
  
  return (
    <div>
      <nav className="flex items-center justify-between p-4">
        <h1>Dashboard</h1>
        <AuthStatusDot />
      </nav>
      
      <WorkspaceSelectionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onWorkspaceSelected={handleWorkspaceSelected}
      />
    </div>
  );
}
```

## Error Handling

The authentication components implement comprehensive error handling:

### Error Types
- **OAuth Errors**: Google OAuth failures, access denied, configuration issues
- **Network Errors**: Connection timeouts, offline scenarios
- **Session Errors**: Session establishment failures, token issues
- **Workspace Errors**: Workspace access denied, switching failures

### Error Recovery
- Automatic retry for transient errors
- User-initiated retry for recoverable errors
- Clear guidance for non-recoverable errors
- Fallback options when primary authentication fails

## Accessibility

All components follow accessibility best practices:

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Logical focus order
- **Status Updates**: Live regions for dynamic content
- **Color Contrast**: WCAG compliant color schemes
- **Loading States**: Clear indication of loading processes

## Testing

Components include comprehensive test coverage:

```bash
# Run authentication component tests
npm test src/components/auth

# Run specific component tests
npm test src/components/auth/SignInForm
npm test src/components/auth/AuthLoadingState
```

## Requirements Fulfilled

These components fulfill the following authentication requirements:

- **Requirement 1.1**: Google OAuth sign-in button ✅
- **Requirement 7.1**: Loading states during authentication ✅
- **Requirement 7.2**: Specific error messages ✅
- **Requirement 7.3**: Network error handling with retry ✅
- **Requirement 7.4**: OAuth unavailability messaging ✅
- **Requirement 7.5**: User-friendly error messages with technical logging ✅
- **Requirement 2.5**: Multi-workspace user support ✅

## Future Enhancements

Potential improvements for future iterations:

- Biometric authentication support
- Multi-factor authentication
- Social login providers beyond Google
- Progressive Web App offline authentication
- Advanced session management features