import { 
  LemonSqueezyConfig, 
  CheckoutSession, 
  LemonSqueezyError,
  getVariantIdForPlan 
} from './types';
import { PlanType } from '@/lib/types/billing';

export class LemonSqueezyClient {
  private readonly apiKey: string;
  private readonly storeId: string;
  private readonly baseUrl = 'https://api.lemonsqueezy.com/v1';

  constructor(config: LemonSqueezyConfig) {
    this.apiKey = config.apiKey;
    this.storeId = config.storeId;
  }

  private async makeRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new LemonSqueezyError(
        `Lemon Squeezy API error: ${response.status} ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return response.json();
  }

  async createCheckoutSession(
    planType: PlanType,
    userId: string,
    userEmail: string,
    config: LemonSqueezyConfig
  ): Promise<CheckoutSession> {
    try {
      const variantId = getVariantIdForPlan(planType, config);
      
      const payload = {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: userEmail,
              custom: {
                user_id: userId,
                plan_type: planType,
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: this.storeId,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId,
              },
            },
          },
        },
      };

      const response = await this.makeRequest('/checkouts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return {
        checkoutUrl: response.data.attributes.url,
        sessionId: response.data.id,
      };
    } catch (error) {
      if (error instanceof LemonSqueezyError) {
        throw error;
      }
      throw new LemonSqueezyError(
        `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      if (error instanceof LemonSqueezyError) {
        throw error;
      }
      throw new LemonSqueezyError(
        `Failed to get subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const payload = {
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: {
            cancelled: true,
          },
        },
      };

      await this.makeRequest(`/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (error instanceof LemonSqueezyError) {
        throw error;
      }
      throw new LemonSqueezyError(
        `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getCustomer(customerId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/customers/${customerId}`);
      return response.data;
    } catch (error) {
      if (error instanceof LemonSqueezyError) {
        throw error;
      }
      throw new LemonSqueezyError(
        `Failed to get customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}