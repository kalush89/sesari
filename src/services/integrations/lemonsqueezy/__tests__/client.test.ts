import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LemonSqueezyClient } from '../client';
import { LemonSqueezyError } from '../types';
import { PlanType } from '@/lib/types/billing';

// Mock fetch globally
global.fetch = vi.fn();

describe('LemonSqueezyClient', () => {
  let client: LemonSqueezyClient;
  const mockConfig = {
    apiKey: 'test-api-key',
    webhookSecret: 'test-webhook-secret',
    storeId: '12345',
    starterVariantId: '100000',
    proVariantId: '100001',
  };

  beforeEach(() => {
    client = new LemonSqueezyClient(mockConfig);
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session successfully', async () => {
      const mockResponse = {
        data: {
          id: 'checkout_123',
          attributes: {
            url: 'https://checkout.lemonsqueezy.com/checkout_123',
          },
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.createCheckoutSession(
        PlanType.STARTER,
        'user_123',
        'test@example.com',
        mockConfig
      );

      expect(result).toEqual({
        checkoutUrl: 'https://checkout.lemonsqueezy.com/checkout_123',
        sessionId: 'checkout_123',
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.lemonsqueezy.com/v1/checkouts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
          }),
        })
      );
    });

    it('should throw error for invalid plan type', async () => {
      await expect(
        client.createCheckoutSession(
          PlanType.FREE,
          'user_123',
          'test@example.com',
          mockConfig
        )
      ).rejects.toThrow('No variant ID configured for plan type: FREE');
    });

    it('should handle API errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Invalid request' }),
      });

      await expect(
        client.createCheckoutSession(
          PlanType.STARTER,
          'user_123',
          'test@example.com',
          mockConfig
        )
      ).rejects.toThrow(LemonSqueezyError);
    });
  });

  describe('getSubscription', () => {
    it('should get subscription successfully', async () => {
      const mockResponse = {
        data: {
          id: 'sub_123',
          attributes: {
            status: 'active',
            variant_id: 100000,
          },
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getSubscription('sub_123');

      expect(result).toEqual(mockResponse.data);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.lemonsqueezy.com/v1/subscriptions/sub_123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should handle subscription not found', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ error: 'Subscription not found' }),
      });

      await expect(client.getSubscription('invalid_sub')).rejects.toThrow(LemonSqueezyError);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await expect(client.cancelSubscription('sub_123')).resolves.not.toThrow();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.lemonsqueezy.com/v1/subscriptions/sub_123',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"cancelled":true'),
        })
      );
    });

    it('should handle cancellation errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ error: 'Cannot cancel subscription' }),
      });

      await expect(client.cancelSubscription('sub_123')).rejects.toThrow(LemonSqueezyError);
    });
  });

  describe('getCustomer', () => {
    it('should get customer successfully', async () => {
      const mockResponse = {
        data: {
          id: 'cust_123',
          attributes: {
            email: 'test@example.com',
            name: 'Test User',
          },
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.getCustomer('cust_123');

      expect(result).toEqual(mockResponse.data);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.lemonsqueezy.com/v1/customers/cust_123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });
  });
});