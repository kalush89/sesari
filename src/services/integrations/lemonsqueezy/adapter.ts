import { LemonSqueezyClient } from './client';
import { LemonSqueezyWebhookService, WebhookProcessingResult } from './webhook-service';
import { 
  LemonSqueezyConfig, 
  CheckoutSession, 
  LemonSqueezyWebhookData,
  LemonSqueezyError 
} from './types';
import { PlanType } from '@/lib/types/billing';

export interface LemonSqueezyAdapter {
  // Checkout operations
  createCheckoutSession(userId: string, userEmail: string, planType: PlanType): Promise<CheckoutSession>;
  
  // Subscription management
  getSubscription(subscriptionId: string): Promise<any>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  
  // Webhook processing
  verifyWebhookSignature(payload: string, signature: string): boolean;
  processWebhook(
    payload: string, 
    signature: string,
    handlers: WebhookHandlers
  ): Promise<WebhookProcessingResult>;
}

export interface WebhookHandlers {
  onSubscriptionCreated: (data: any) => Promise<void>;
  onSubscriptionUpdated: (data: any) => Promise<void>;
  onSubscriptionCancelled: (data: any) => Promise<void>;
  onPaymentFailed: (data: any) => Promise<void>;
}

export class LemonSqueezyIntegrationAdapter implements LemonSqueezyAdapter {
  private readonly client: LemonSqueezyClient;
  private readonly webhookService: LemonSqueezyWebhookService;
  private readonly config: LemonSqueezyConfig;

  constructor(config: LemonSqueezyConfig) {
    this.config = config;
    this.client = new LemonSqueezyClient(config);
    this.webhookService = new LemonSqueezyWebhookService(config);
  }

  /**
   * Create a checkout session for a user to subscribe to a plan
   */
  async createCheckoutSession(
    userId: string, 
    userEmail: string, 
    planType: PlanType
  ): Promise<CheckoutSession> {
    try {
      return await this.client.createCheckoutSession(
        planType, 
        userId, 
        userEmail, 
        this.config
      );
    } catch (error) {
      if (error instanceof LemonSqueezyError) {
        throw error;
      }
      throw new LemonSqueezyError(
        `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get subscription details from Lemon Squeezy
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      return await this.client.getSubscription(subscriptionId);
    } catch (error) {
      if (error instanceof LemonSqueezyError) {
        throw error;
      }
      throw new LemonSqueezyError(
        `Failed to get subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.client.cancelSubscription(subscriptionId);
    } catch (error) {
      if (error instanceof LemonSqueezyError) {
        throw error;
      }
      throw new LemonSqueezyError(
        `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    return this.webhookService.verifySignature(payload, signature);
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(
    payload: string,
    signature: string,
    handlers: WebhookHandlers
  ): Promise<WebhookProcessingResult> {
    try {
      // Verify signature first
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new LemonSqueezyError('Invalid webhook signature');
      }

      // Parse webhook payload
      const webhookData = this.webhookService.parseWebhookPayload(payload);
      const eventType = webhookData.meta.event_name;

      // Process the event
      return await this.webhookService.processWebhookEvent(
        eventType,
        webhookData,
        handlers
      );
    } catch (error) {
      return {
        success: false,
        eventType: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Factory function to create Lemon Squeezy adapter with environment configuration
 */
export function createLemonSqueezyAdapter(): LemonSqueezyIntegrationAdapter {
  const config: LemonSqueezyConfig = {
    apiKey: process.env.LEMON_SQUEEZY_API_KEY!,
    webhookSecret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!,
    storeId: process.env.LEMON_SQUEEZY_STORE_ID!,
    starterVariantId: process.env.LEMON_SQUEEZY_STARTER_VARIANT_ID!,
    proVariantId: process.env.LEMON_SQUEEZY_PRO_VARIANT_ID!,
  };

  // Validate required environment variables
  const requiredVars = [
    'LEMON_SQUEEZY_API_KEY',
    'LEMON_SQUEEZY_WEBHOOK_SECRET', 
    'LEMON_SQUEEZY_STORE_ID',
    'LEMON_SQUEEZY_STARTER_VARIANT_ID',
    'LEMON_SQUEEZY_PRO_VARIANT_ID'
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  return new LemonSqueezyIntegrationAdapter(config);
}