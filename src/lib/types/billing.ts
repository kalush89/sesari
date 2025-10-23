/**
 * Billing system TypeScript interfaces and types
 * Based on Prisma schema and business requirements
 */

// Enums matching Prisma schema
export enum PlanType {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  UNPAID = 'UNPAID'
}

// Core billing interfaces
export interface Subscription {
  id: string;
  userId: string;
  lemonSqueezyId: string;
  planType: PlanType;
  status: SubscriptionStatus;
  trialEndsAt?: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageTracking {
  id: string;
  workspaceId: string;
  kpiCount: number;
  updatedAt: Date;
}

// Plan configuration interface
export interface PlanLimits {
  workspaces: number; // -1 for unlimited
  kpisPerWorkspace: number; // -1 for unlimited
  integrations: boolean;
  aiFeatures: boolean;
  trialDays: number;
}

// Usage statistics interface
export interface UsageStats {
  workspaceCount: number;
  workspaceLimit: number;
  kpiCounts: Record<string, number>; // workspaceId -> count
  kpiLimits: Record<string, number>; // workspaceId -> limit
  planType: PlanType;
  trialEndsAt?: Date;
}

// Trial status interface
export interface TrialStatus {
  isInTrial: boolean;
  trialEndsAt?: Date;
  daysRemaining?: number;
  hasExpired: boolean;
}

// Checkout session interface
export interface CheckoutSession {
  url: string;
  sessionId: string;
}

// Lemon Squeezy webhook data interfaces
export interface LemonSqueezyWebhookData {
  meta: {
    event_name: string;
    custom_data?: Record<string, any>;
  };
  data: {
    id: string;
    type: string;
    attributes: {
      store_id: number;
      customer_id: number;
      order_id: number;
      product_id: number;
      variant_id: number;
      status: string;
      trial_ends_at?: string;
      renews_at?: string;
      ends_at?: string;
      created_at: string;
      updated_at: string;
    };
  };
}

// Billing error types
export enum BillingError {
  SUBSCRIPTION_NOT_FOUND = 'subscription_not_found',
  PLAN_LIMIT_EXCEEDED = 'plan_limit_exceeded',
  FEATURE_NOT_AVAILABLE = 'feature_not_available',
  WEBHOOK_VERIFICATION_FAILED = 'webhook_verification_failed',
  LEMONSQUEEZY_API_ERROR = 'lemonsqueezy_api_error',
  TRIAL_EXPIRED = 'trial_expired',
  PAYMENT_FAILED = 'payment_failed'
}

export interface BillingErrorResponse {
  error: BillingError;
  message: string;
  upgradeRequired?: boolean;
  currentPlan?: PlanType;
  suggestedPlan?: PlanType;
}

// Plan configuration constants
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  [PlanType.FREE]: {
    workspaces: 1,
    kpisPerWorkspace: 5,
    integrations: false,
    aiFeatures: false,
    trialDays: 0
  },
  [PlanType.STARTER]: {
    workspaces: 3,
    kpisPerWorkspace: 15,
    integrations: true,
    aiFeatures: true,
    trialDays: 14
  },
  [PlanType.PRO]: {
    workspaces: -1, // unlimited
    kpisPerWorkspace: -1, // unlimited
    integrations: true,
    aiFeatures: true,
    trialDays: 14
  }
} as const;

// Feature access types
export enum Feature {
  INTEGRATIONS = 'integrations',
  AI_FEATURES = 'ai_features',
  MULTIPLE_WORKSPACES = 'multiple_workspaces',
  UNLIMITED_KPIS = 'unlimited_kpis'
}

export interface FeatureAccess {
  integrations: boolean;
  aiFeatures: boolean;
  multipleWorkspaces: boolean;
  unlimitedKpis: boolean;
}

// Resource action types for enforcement
export enum ResourceAction {
  CREATE_WORKSPACE = 'create_workspace',
  CREATE_KPI = 'create_kpi',
  ACCESS_INTEGRATION = 'access_integration',
  USE_AI_FEATURE = 'use_ai_feature'
}

export interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
  upgradeRequired?: boolean;
  suggestedPlan?: PlanType;
}

// Limit types for notifications
export enum LimitType {
  WORKSPACE_COUNT = 'workspace_count',
  KPI_COUNT = 'kpi_count'
}

// Sync result interface for webhook processing
export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  errors?: string[];
  lastSyncAt: Date;
}