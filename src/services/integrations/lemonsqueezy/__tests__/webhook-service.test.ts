import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { LemonSqueezyWebhookService } from '../webhook-service';
import { LemonSqueezyWebhookError, LemonSqueezyEventType } from '../types';
import { PlanType, SubscriptionStatus } from '@/lib/types/billing';

describe('LemonSqueezyWebhookService', () => {
  let webhookService: LemonSqueezyWebhookService;
  const mockConfig = {
    apiKey: 'test-api-key',
    webhookSecret: 'test-webhook-secret',
    storeId: '12345',
    starterVariantId: '100000',
    proVariantId: '100001',
  };

  beforeEach(() => {
    webhookService = new LemonSqueezyWebhookService(mockConfig);
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const payload = '{"test": "data"}';
      const hmac = crypto.createHmac('sha256', mockConfig.webhookSecret);
      hmac.update(payload, 'utf8');
      const signature = `sha256=${hmac.digest('hex')}`;

      const result = webhookService.verifySignature(payload, signature);
      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = '{"test": "data"}';
      const invalidSignature = 'sha256=invalid_signature';

      const result = webhookService.verifySignature(payload, invalidSignature);
      expect(result).toBe(false);
    });

    it('should handle signature without sha256 prefix', () => {
      const payload = '{"test": "data"}';
      const hmac = crypto.createHmac('sha256', mockConfig.webhookSecret);
      hmac.update(payload, 'utf8');
      const signature = hmac.digest('hex'); // No prefix

      const result = webhookService.verifySignature(payload, signature);
      expect(result).toBe(true);
    });

    it('should handle malformed signatures gracefully', () => {
      const payload = '{"test": "data"}';
      const malformedSignature = 'not-a-valid-signature';

      const result = webhookService.verifySignature(payload, malformedSignature);
      expect(result).toBe(false);
    });
  });

  describe('parseWebhookPayload', () => {
    it('should parse valid webhook payload', () => {
      const validPayload = JSON.stringify({
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: 'user_123' },
        },
        data: {
          id: 'sub_123',
          type: 'subscriptions',
          attributes: {
            store_id: 12345,
            customer_id: 67890,
            product_id: 11111,
            variant_id: 100000,
            status: 'active',
            trial_ends_at: '2024-01-15T00:00:00Z',
            renews_at: '2024-02-01T00:00:00Z',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      });

      const result = webhookService.parseWebhookPayload(validPayload);

      expect(result.meta.event_name).toBe('subscription_created');
      expect(result.data.id).toBe('sub_123');
      expect(result.data.attributes.variant_id).toBe(100000);
    });

    it('should throw error for invalid JSON', () => {
      const invalidPayload = 'invalid json';

      expect(() => webhookService.parseWebhookPayload(invalidPayload))
        .toThrow(LemonSqueezyWebhookError);
    });

    it('should throw error for missing required fields', () => {
      const incompletePayload = JSON.stringify({
        meta: { event_name: 'subscription_created' },
        // Missing data field
      });

      expect(() => webhookService.parseWebhookPayload(incompletePayload))
        .toThrow(LemonSqueezyWebhookError);
    });
  });

  describe('processSubscriptionCreated', () => {
    const mockWebhookData = {
      meta: {
        event_name: 'subscription_created',
        custom_data: { user_id: 'user_123' },
      },
      data: {
        id: 'sub_123',
        type: 'subscriptions',
        attributes: {
          store_id: 12345,
          customer_id: 67890,
          product_id: 11111,
          variant_id: 100000, // Starter plan
          status: 'active',
          trial_ends_at: '2024-01-15T00:00:00Z',
          renews_at: '2024-02-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      },
    };

    it('should process subscription created successfully', async () => {
      const mockHandler = vi.fn().mockResolvedValue(undefined);

      const result = await webhookService.processSubscriptionCreated(
        mockWebhookData,
        mockHandler
      );

      expect(result.success).toBe(true);
      expect(result.eventType).toBe(LemonSqueezyEventType.SUBSCRIPTION_CREATED);
      expect(result.subscriptionId).toBe('sub_123');
      expect(result.userId).toBe('user_123');

      expect(mockHandler).toHaveBeenCalledWith({
        userId: 'user_123',
        lemonSqueezyId: 'sub_123',
        planType: PlanType.STARTER,
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: new Date('2024-01-15T00:00:00Z'),
        currentPeriodEnd: new Date('2024-02-01T00:00:00Z'),
        cancelAtPeriodEnd: false,
      });
    });

    it('should handle missing user ID', async () => {
      const webhookDataWithoutUserId = {
        ...mockWebhookData,
        meta: { event_name: 'subscription_created' }, // No custom_data
      };

      const mockHandler = vi.fn();

      const result = await webhookService.processSubscriptionCreated(
        webhookDataWithoutUserId,
        mockHandler
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No user ID found');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should handle handler errors', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Database error'));

      const result = await webhookService.processSubscriptionCreated(
        mockWebhookData,
        mockHandler
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('processSubscriptionUpdated', () => {
    const mockWebhookData = {
      meta: { event_name: 'subscription_updated' },
      data: {
        id: 'sub_123',
        type: 'subscriptions',
        attributes: {
          store_id: 12345,
          customer_id: 67890,
          product_id: 11111,
          variant_id: 100001, // Pro plan
          status: 'active',
          renews_at: '2024-03-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
      },
    };

    it('should process subscription updated successfully', async () => {
      const mockHandler = vi.fn().mockResolvedValue(undefined);

      const result = await webhookService.processSubscriptionUpdated(
        mockWebhookData,
        mockHandler
      );

      expect(result.success).toBe(true);
      expect(result.eventType).toBe(LemonSqueezyEventType.SUBSCRIPTION_UPDATED);

      expect(mockHandler).toHaveBeenCalledWith({
        lemonSqueezyId: 'sub_123',
        planType: PlanType.PRO,
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        currentPeriodEnd: new Date('2024-03-01T00:00:00Z'),
        cancelAtPeriodEnd: false,
      });
    });
  });

  describe('processSubscriptionCancelled', () => {
    const mockWebhookData = {
      meta: { event_name: 'subscription_cancelled' },
      data: {
        id: 'sub_123',
        type: 'subscriptions',
        attributes: {
          store_id: 12345,
          customer_id: 67890,
          product_id: 11111,
          variant_id: 100000,
          status: 'cancelled',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
      },
    };

    it('should process subscription cancelled successfully', async () => {
      const mockHandler = vi.fn().mockResolvedValue(undefined);

      const result = await webhookService.processSubscriptionCancelled(
        mockWebhookData,
        mockHandler
      );

      expect(result.success).toBe(true);
      expect(result.eventType).toBe(LemonSqueezyEventType.SUBSCRIPTION_CANCELLED);

      expect(mockHandler).toHaveBeenCalledWith({
        lemonSqueezyId: 'sub_123',
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: true,
      });
    });
  });

  describe('processWebhookEvent', () => {
    const mockHandlers = {
      onSubscriptionCreated: vi.fn().mockResolvedValue(undefined),
      onSubscriptionUpdated: vi.fn().mockResolvedValue(undefined),
      onSubscriptionCancelled: vi.fn().mockResolvedValue(undefined),
      onPaymentFailed: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should route subscription_created events', async () => {
      const webhookData = {
        meta: {
          event_name: 'subscription_created',
          custom_data: { user_id: 'user_123' },
        },
        data: {
          id: 'sub_123',
          type: 'subscriptions',
          attributes: {
            store_id: 12345,
            customer_id: 67890,
            product_id: 11111,
            variant_id: 100000,
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      };

      const result = await webhookService.processWebhookEvent(
        'subscription_created',
        webhookData,
        mockHandlers
      );

      expect(result.success).toBe(true);
      expect(mockHandlers.onSubscriptionCreated).toHaveBeenCalled();
    });

    it('should handle unknown event types gracefully', async () => {
      const webhookData = {
        meta: { event_name: 'unknown_event' },
        data: {
          id: 'test_123',
          type: 'unknown',
          attributes: {
            store_id: 12345,
            customer_id: 67890,
            product_id: 11111,
            variant_id: 100000,
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      };

      const result = await webhookService.processWebhookEvent(
        'unknown_event',
        webhookData,
        mockHandlers
      );

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('unknown_event');
    });
  });
});