// Authentication UI Components
export { SignInForm } from './SignInForm';
export { AuthErrorDisplay } from './AuthErrorDisplay';
export { SignOutButton } from './SignOutButton';
export { SimpleSignOutButton } from './SimpleSignOutButton';
export { SignOutDebugInfo } from './SignOutDebugInfo';
export { AuthStrategyTester } from './AuthStrategyTester';
export { PermissionGate } from './PermissionGate';

// Loading and Status Components
export { AuthLoadingState, AuthSpinner } from './AuthLoadingState';
export { AuthStatusIndicator, AuthStatusDot } from './AuthStatusIndicator';
export { AuthLoadingWrapper, withAuthLoading } from './AuthLoadingWrapper';

// Guard Components
export { AuthGuard, withAuthGuard, AuthCheck } from './AuthGuard';

// Workspace Components
export { WorkspaceSelectionModal, useWorkspaceSelection } from './WorkspaceSelectionModal';

// Types
export type { AuthError } from '@/lib/types/auth';