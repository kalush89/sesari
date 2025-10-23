import crypto from 'crypto';
import { 
  LemonSqueezyWebhookData, 
  LemonSqueezyWebhookDataSchema,
  LemonSqueezyWebhookError,
  LemonSqueezyEventType,
  LEMONSQUEEZY_STATUS_MAP,
  getPlanTypeFromVariantId,
  LemonSqueezyConfig
} from './types';
import { PlanType, SubscriptionStatus } from '@/lib/types/billing';

export interface WebhookProcessingResult {
  success: boolean;
  eventType: string;
  subscriptionId?: string;
  userId?: string;
  error?: string;
}

export class LemonSqueezyWebhookService {
  private readonly webhookSecret: string;
  private readonly config: LemonSqueezyConfig;

  constructor(config: LemonSqueezyConfig) {
    this.webhookSecret = config.webhookSecret;
    this.config = config;
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  verifySignature(payload: string, signature: string): boolean {
    try {
      // Remove 'sha256=' prefix if present
      const cleanSignature = signature.replace(/^sha256=/, '');
      
      // Create HMAC hash
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(payload, 'utf8');
      const computedSignature = hmac.digest('hex');

      // Use timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(cleanSignature, 'hex'),
        Buffer.from(computedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Parse and validate webhook payload
   */
  parseWebhookPayload(payload: string): LemonSqueezyWebhookData {
    try {
      const data = JSON.parse(payload);
      return LemonSqueezyWebhookDataSchema.parse(data);
    } catch (error) {
      throw new LemonSqueezyWebhookError(
        `Invalid webhook payload: ${error instanceof Error ? error.message : 'Unknown error'}`,
        payload
      );
    }
  }

  /**
   * Extract user ID from webhook custom data
   */
  private extractUserId(webhookData: LemonSqueezyWebhookData): string | null {
    return webhookData.meta.custom_data?.user_id || null;
  }

  /**
   * Convert Lemon Squeezy subscription data to our format
   */
  private transformSubscriptionData(webhookData: LemonSqueezyWebhookData) {
    const { attributes } = webhookData.data;
    
    return {
      lemonSqueezyId: webhookData.data.id,
      planType: getPlanTypeFromVariantId(attributes.variant_id.toString(), this.config),
      status: LEMONSQUEEZY_STATUS_MAP[attributes.status] || SubscriptionStatus.UNPAID,
      trialEndsAt: attributes.trial_ends_at ? new Date(attributes.trial_ends_at) : null,
      currentPeriodEnd: new Date(attributes.renews_at || attributes.ends_at || new Date()),
      cancelAtPeriodEnd: attributes.status === 'cancelled',
    };
  }

  /**
   * Process subscription created event
   */
  async processSubscriptionCreated(
    webhookData: LemonSqueezyWebhookData,
    onSubscriptionCreated: (data: any) => Promise<void>
  ): Promise<WebhookProcessingResult> {
    try {
      const userId = this.extractUserId(webhookData);
      if (!userId) {
        throw new LemonSqueezyWebhookError('No user ID found in webhook data');
      }

      const subscriptionData = this.transformSubscriptionData(webhookData);
      
      await onSubscriptionCreated({
        userId,
        ...subscriptionData,
      });

      return {
        success: true,
        eventType: LemonSqueezyEventType.SUBSCRIPTION_CREATED,
        subscriptionId: webhookData.data.id,
        userId,
      };
    } catch (error) {
      return {
        success: false,
        eventType: LemonSqueezyEventType.SUBSCRIPTION_CREATED,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process subscription updated event
   */
  async processSubscriptionUpdated(
    webhookData: LemonSqueezyWebhookData,
    onSubscriptionUpdated: (data: any) => Promise<void>
  ): Promise<WebhookProcessingResult> {
    try {
      const subscriptionData = this.transformSubscriptionData(webhookData);
      
      await onSubscriptionUpdated({
        lemonSqueezyId: webhookData.data.id,
        ...subscriptionData,
      });

      return {
        success: true,
        eventType: LemonSqueezyEventType.SUBSCRIPTION_UPDATED,
        subscriptionId: webhookData.data.id,
      };
    } catch (error) {
      return {
        success: false,
        eventType: LemonSqueezyEventType.SUBSCRIPTION_UPDATED,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process subscription cancelled event
   */
  async processSubscriptionCancelled(
    webhookData: LemonSqueezyWebhookData,
    onSubscriptionCancelled: (data: any) => Promise<void>
  ): Promise<WebhookProcessingResult> {
    try {
      await onSubscriptionCancelled({
        lemonSqueezyId: webhookData.data.id,
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: true,
      });

      return {
        success: true,
        eventType: LemonSqueezyEventType.SUBSCRIPTION_CANCELLED,
        subscriptionId: webhookData.data.id,
      };
    } catch (error) {
      return {
        success: false,
        eventType: LemonSqueezyEventType.SUBSCRIPTION_CANCELLED,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process payment failed event
   */
  async processPaymentFailed(
    webhookData: LemonSqueezyWebhookData,
    onPaymentFailed: (data: any) => Promise<void>
  ): Promise<WebhookProcessingResult> {
    try {
      await onPaymentFailed({
        lemonSqueezyId: webhookData.data.id,
        status: SubscriptionStatus.PAST_DUE,
      });

      return {
        success: true,
        eventType: 'payment_failed',
        subscriptionId: webhookData.data.id,
      };
    } catch (error) {
      return {
        success: false,
        eventType: 'payment_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Route webhook event to appropriate handler
   */
  async processWebhookEvent(
    eventType: string,
    webhookData: LemonSqueezyWebhookData,
    handlers: {
      onSubscriptionCreated: (data: any) => Promise<void>;
      onSubscriptionUpdated: (data: any) => Promise<void>;
      onSubscriptionCancelled: (data: any) => Promise<void>;
      onPaymentFailed: (data: any) => Promise<void>;
    }
  ): Promise<WebhookProcessingResult> {
    switch (eventType) {
      case LemonSqueezyEventType.SUBSCRIPTION_CREATED:
        return this.processSubscriptionCreated(webhookData, handlers.onSubscriptionCreated);
      
      case LemonSqueezyEventType.SUBSCRIPTION_UPDATED:
        return this.processSubscriptionUpdated(webhookData, handlers.onSubscriptionUpdated);
      
      case LemonSqueezyEventType.SUBSCRIPTION_CANCELLED:
      case LemonSqueezyEventType.SUBSCRIPTION_EXPIRED:
        return this.processSubscriptionCancelled(webhookData, handlers.onSubscriptionCancelled);
      
      case 'order_created':
        // Handle payment success if needed
        return { success: true, eventType };
      
      case 'order_refunded':
        return this.processPaymentFailed(webhookData, handlers.onPaymentFailed);
      
      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
        return { success: true, eventType };
    }
  }
}