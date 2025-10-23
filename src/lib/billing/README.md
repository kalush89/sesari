# Billing Service Layer

This module implements the core billing service layer for Sesari's subscription management system. It provides comprehensive functionality for managing subscriptions, enforcing plan limits, tracking usage, and handling trial periods.

## Architecture

The billing service is composed of several key components:

- **BillingService**: Main service class that orchestrates all billing operations
- **PlanEnforcementService**: Handles plan limit enforcement and feature access control
- **UsageTrackingService**: Manages workspace and KPI usage tracking
- **Plan Configuration**: Utilities for plan limits and feature validation

## Key Features

### Subscription Management
- Create and manage Lemon Squeezy subscriptions
- Handle subscription lifecycle events (create, update, cancel)
- Support for Free, Starter, and Pro plans
- Trial period management with automatic expiration

### Plan Enforcement
- Real-time limit checking for workspace and KPI creation
- Feature access control based on subscription plan
- Graceful handling of limit violations with upgrade suggestions
- Comprehensive error handling with billing-specific error codes

### Usage Tracking
- Automatic tracking of workspace and KPI counts
- Real-time usage statistics and limit monitoring
- Notification system for approaching limits (80% threshold)
- Support for usage reset and cleanup operations

### Trial Management
- 14-day trial periods for paid plans
- Automatic trial expiration and downgrade to Free plan
- Trial status checking with days remaining calculation
- Seamless trial-to-paid conversion handling

## Plan Configuration

### Free Plan
- 1 workspace maximum
- 5 KPIs per workspace
- No integrations (Stripe and manual KPIs only)
- No AI features
- No trial period

### Starter Plan
- 3 workspaces maximum
- 15 KPIs per workspace
- All integrations enabled
- AI features enabled
- 14-day trial period

### Pro Plan
- Unlimited workspaces
- Unlimited KPIs per workspace
- All integrations enabled
- AI features enabled
- 14-day trial period

## Usage Examples

### Basic Service Usage

```typescript
import { BillingService } from '@/lib/billing';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const billingService = new BillingService(prisma);

// Check if user can create a workspace
const canCreateWorkspace = await billingService.checkWorkspaceLimit('user-id');

// Get user's usage statistics
const usageStats = await billingService.getUsageStats('user-id');

// Start a trial for a user
await billingService.startTrial('user-id', PlanType.PRO);

// Check feature access
const hasIntegrations = await billingService.checkFeatureAccess('user-id', Feature.INTEGRATIONS);
```

### Plan Enforcement

```typescript
import { ResourceAction } from '@/lib/types/billing';

// Validate action before performing it
try {
  await billingService.validateAction('user-id', ResourceAction.CREATE_WORKSPACE);
  // Proceed with workspace creation
} catch (error) {
  if (error.code === BillingError.PLAN_LIMIT_EXCEEDED) {
    // Show upgrade prompt with suggested plan
    console.log(`Upgrade to ${error.suggestedPlan} required`);
  }
}

// Check enforcement result with details
const result = await billingService.enforceLimits('user-id', ResourceAction.CREATE_KPI, 'workspace-id');
if (!result.allowed) {
  console.log(`Action denied: ${result.reason}`);
  console.log(`Current usage: ${result.currentUsage}/${result.limit}`);
}
```

### Usage Tracking

```typescript
// Track KPI creation/deletion
await billingService.incrementKpiCount('workspace-id');
await billingService.decrementKpiCount('workspace-id');

// Get comprehensive usage statistics
const stats = await billingService.getUsageStats('user-id');
console.log(`Workspaces: ${stats.workspaceCount}/${stats.workspaceLimit}`);
console.log(`Plan: ${stats.planType}`);

// Check for limit notifications
const notifications = await billingService.getLimitNotifications('user-id');
notifications.forEach(notification => {
  console.log(`${notification.type}: ${notification.percentage}% used`);
});
```

## Error Handling

The billing service uses structured error handling with specific error codes:

```typescript
import { BillingError } from '@/lib/types/billing';

try {
  await billingService.validateAction('user-id', ResourceAction.CREATE_WORKSPACE);
} catch (error) {
  switch (error.code) {
    case BillingError.PLAN_LIMIT_EXCEEDED:
      // Handle limit exceeded
      break;
    case BillingError.FEATURE_NOT_AVAILABLE:
      // Handle feature access denied
      break;
    case BillingError.SUBSCRIPTION_NOT_FOUND:
      // Handle missing subscription
      break;
    default:
      // Handle other errors
      break;
  }
}
```

## Testing

The billing service includes comprehensive unit tests covering:

- Plan configuration and validation logic
- Usage tracking operations
- Plan enforcement scenarios
- Subscription management operations
- Trial management functionality
- Error handling and edge cases

Run tests with:
```bash
npm run test:run -- src/lib/billing/__tests__
```

## Integration Points

### Database Integration
- Uses Prisma ORM for database operations
- Enforces Row-Level Security (RLS) for multi-tenant isolation
- Supports PostgreSQL with proper indexing for performance

### Lemon Squeezy Integration
- Placeholder implementation for checkout session creation
- Designed to integrate with Lemon Squeezy webhooks
- Supports subscription lifecycle management

### Authentication Integration
- Works with NextAuth.js user sessions
- Integrates with workspace-based permissions
- Supports multi-tenant architecture

## Security Considerations

- All database operations enforce workspace isolation
- Plan limits are validated on both client and server
- Sensitive billing data is properly protected
- Error messages don't expose internal system details
- Webhook signature verification (when implemented)

## Performance Optimizations

- Efficient database queries with proper indexing
- Caching of plan configuration data
- Minimal database round trips for common operations
- Optimized usage tracking with upsert operations

## Future Enhancements

- Integration with actual Lemon Squeezy API
- Webhook processing for real-time subscription updates
- Advanced usage analytics and reporting
- Automated billing notifications and reminders
- Support for custom enterprise plans