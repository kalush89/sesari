import { z } from 'zod';
import { PlanType, SubscriptionStatus } from '@/lib/types/billing';

// Lemon Squeezy API Types
export interface LemonSqueezyConfig {
  apiKey: string;
  webhookSecret: string;
  storeId: string;
  starterVariantId: string;
  proVariantId: string;
}

export interface CheckoutSession {
  checkoutUrl: string;
  sessionId: string;
}

export interface LemonSqueezyCustomer {
  id: string;
  email: string;
  name?: string;
}

export interface LemonSqueezySubscription {
  id: string;
  customerId: string;
  variantId: string;
  status: string;
  trialEndsAt?: string;
  renewsAt?: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Webhook payload schemas
export const LemonSqueezyWebhookDataSchema = z.object({
  meta: z.object({
    event_name: z.string(),
    custom_data: z.record(z.any()).optional(),
  }),
  data: z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.object({
      store_id: z.number(),
      customer_id: z.number(),
      order_id: z.number().optional(),
      product_id: z.number(),
      variant_id: z.number(),
      status: z.string(),
      trial_ends_at: z.string().nullable().optional(),
      renews_at: z.string().nullable().optional(),
      ends_at: z.string().nullable().optional(),
      created_at: z.string(),
      updated_at: z.string(),
    }),
  }),
});

export type LemonSqueezyWebhookData = z.infer<typeof LemonSqueezyWebhookDataSchema>;

// Event types
export enum LemonSqueezyEventType {
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_RESUMED = 'subscription_resumed',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  SUBSCRIPTION_PAUSED = 'subscription_paused',
  SUBSCRIPTION_UNPAUSED = 'subscription_unpaused',
  ORDER_CREATED = 'order_created',
  ORDER_REFUNDED = 'order_refunded',
}

// Status mapping
export const LEMONSQUEEZY_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: SubscriptionStatus.ACTIVE,
  trialing: SubscriptionStatus.TRIALING,
  past_due: SubscriptionStatus.PAST_DUE,
  cancelled: SubscriptionStatus.CANCELED,
  unpaid: SubscriptionStatus.UNPAID,
  expired: SubscriptionStatus.CANCELED,
  paused: SubscriptionStatus.CANCELED,
};

// Plan variant mapping
export function getVariantIdForPlan(planType: PlanType, config: LemonSqueezyConfig): string {
  switch (planType) {
    case PlanType.STARTER:
      return config.starterVariantId;
    case PlanType.PRO:
      return config.proVariantId;
    default:
      throw new Error(`No variant ID configured for plan type: ${planType}`);
  }
}

export function getPlanTypeFromVariantId(variantId: string, config: LemonSqueezyConfig): PlanType {
  if (variantId === config.starterVariantId) {
    return PlanType.STARTER;
  }
  if (variantId === config.proVariantId) {
    return PlanType.PRO;
  }
  throw new Error(`Unknown variant ID: ${variantId}`);
}

// API Error types
export class LemonSqueezyError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'LemonSqueezyError';
  }
}

export class LemonSqueezyWebhookError extends Error {
  constructor(message: string, public payload?: any) {
    super(message);
    this.name = 'LemonSqueezyWebhookError';
  }
}