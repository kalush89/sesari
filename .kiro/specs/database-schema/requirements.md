# Database Schema Requirements

## Introduction

This spec defines the core database schema for Sesari, focusing on multi-tenant workspace structure with Row-Level Security (RLS), KPI tracking, goals management, and user authentication. The schema supports the MVP features while being extensible for future integrations.

## Requirements

### Requirement 1: Multi-Tenant Workspace Architecture

**User Story:** As a founder, I want my data isolated from other users so that my KPIs and goals remain private and secure.

#### Acceptance Criteria

1. WHEN a user creates an account THEN the system SHALL create a workspace with RLS policies
2. WHEN a user accesses data THEN the system SHALL enforce workspace-level isolation
3. WHEN multiple users join a workspace THEN the system SHALL allow shared access to workspace data
4. IF a user lacks workspace access THEN the system SHALL deny all data operations

### Requirement 2: User Authentication and Profile Management

**User Story:** As a user, I want to authenticate with Google OAuth and manage my profile so that I can securely access my workspace.

#### Acceptance Criteria

1. WHEN a user signs in with Google THEN the system SHALL create or update their user profile
2. WHEN a user profile is created THEN the system SHALL assign them to a default workspace
3. WHEN user data is stored THEN the system SHALL include email, name, and OAuth provider info
4. IF a user updates their profile THEN the system SHALL maintain data consistency

### Requirement 3: KPI Data Storage and Tracking

**User Story:** As a founder, I want to store and track my KPIs over time so that I can monitor business performance.

#### Acceptance Criteria

1. WHEN a KPI is created THEN the system SHALL store name, description, target value, and current value
2. WHEN KPI data is updated THEN the system SHALL maintain historical records with timestamps
3. WHEN KPIs are retrieved THEN the system SHALL include trend data and progress calculations
4. IF a KPI is deleted THEN the system SHALL soft-delete to preserve historical data

### Requirement 4: Goals Management and KPI Linking

**User Story:** As a founder, I want to create goals and link them to KPIs so that I can track progress toward strategic objectives.

#### Acceptance Criteria

1. WHEN a goal is created THEN the system SHALL store title, description, target date, and status
2. WHEN goals are linked to KPIs THEN the system SHALL maintain the relationship for progress tracking
3. WHEN goal progress is calculated THEN the system SHALL aggregate linked KPI performance
4. IF a goal is completed THEN the system SHALL update status and maintain completion timestamp

### Requirement 5: Integration Data Management

**User Story:** As a user, I want to connect external services so that my KPIs can be automatically updated from Stripe, Google Analytics, and other sources.

#### Acceptance Criteria

1. WHEN an integration is configured THEN the system SHALL store connection credentials securely
2. WHEN integration data is synced THEN the system SHALL update related KPIs automatically
3. WHEN sync operations occur THEN the system SHALL log success/failure status
4. IF an integration fails THEN the system SHALL maintain error logs for troubleshooting

### Requirement 6: Subscription and Billing Support

**User Story:** As a business owner, I want to manage user subscriptions so that I can control access to premium features.

#### Acceptance Criteria

1. WHEN a subscription is created THEN the system SHALL store plan type, status, and billing cycle
2. WHEN subscription status changes THEN the system SHALL update feature access accordingly
3. WHEN billing events occur THEN the system SHALL maintain transaction history
4. IF a subscription expires THEN the system SHALL restrict access to paid features