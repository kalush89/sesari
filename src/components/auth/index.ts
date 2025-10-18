// Authentication UI Components
export { SignInForm } from './SignInForm';
export { AuthErrorDisplay } from './AuthErrorDisplay';
export { SignOutButton } from './SignOutButton';
export { PermissionGate } from './PermissionGate';

// Loading and Status Components
export { AuthLoadingState, AuthSpinner } from './AuthLoadingState';
export { AuthStatusIndicator, AuthStatusDot } from './AuthStatusIndicator';

// Workspace Components
export { WorkspaceSelectionModal, useWorkspaceSelection } from './WorkspaceSelectionModal';

// Types
export type { AuthError } from '@/lib/types/auth';