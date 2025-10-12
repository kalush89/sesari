# Implementation Plan

- [ ] 1. Set up database schema and core types
  - Add Subscription model to Prisma schema with trial support
  - Create PlanType and SubscriptionStatus enums
  - Generate and run database migration
  - _Requirements: 1.1, 2.1, 4.3_

- [ ] 2. Implement Lemon Squeezy service integration
  - Create LemonSqueezy service class with API client
  - Implement checkout session creation with trial support
  - Add customer portal URL generation
  - Write unit tests for service methods
  - _Requirements: 1.1, 2.3_

- [ ] 3. Create billing service with plan enforcement
  - Implement getUserPlan function with trial status checking
  - Create canAccessFeature function for feature gating
  - Add plan limits configuration and validation
  - Write unit tests for plan enforcement logic
  - _Requirements: 1.4, 3.1, 3.2, 3.3_

- [ ] 4. Build checkout API route
  - Create /api/billing/checkout endpoint
  - Implement plan selection and trial activation
  - Add authentication and input validation
  - Write integration tests for checkout flow
  - _Requirements: 1.1, 1.2_

- [ ] 5. Implement webhook handler
  - Create /api/billing/webhook endpoint with signature verification
  - Process subscription events and trial transitions
  - Update database with subscription changes
  - Add idempotency handling and error recovery
  - Write unit tests for webhook processing
  - _Requirements: 1.2, 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Create subscription status API
  - Build /api/billing/subscription endpoint
  - Return current plan, trial status, and billing information
  - Add caching for subscription data
  - Write integration tests for status retrieval
  - _Requirements: 2.1, 2.2_

- [ ] 7. Build billing settings UI
  - Create billing page component with plan display
  - Show trial countdown and upgrade prompts
  - Add manage subscription button linking to customer portal
  - Implement responsive design following UI guidelines
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 8. Implement feature gate middleware
  - Create middleware to check plan limits on protected routes
  - Add feature blocking with upgrade prompts
  - Implement usage warnings at limit thresholds
  - Write tests for feature enforcement
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 9. Add upgrade prompts and modals
  - Create upgrade modal component with plan comparison
  - Add trial activation flow in onboarding
  - Implement feature-specific upgrade prompts
  - Test upgrade flow end-to-end
  - _Requirements: 1.1, 3.1, 3.4_

- [ ] 10. Handle subscription lifecycle events
  - Implement trial expiration handling
  - Add subscription cancellation and downgrade logic
  - Create data preservation during plan downgrades
  - Write e2e tests for complete subscription lifecycle
  - _Requirements: 2.4, 2.5, 3.3_