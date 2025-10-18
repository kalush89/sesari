---
inclusion: always
---

# Integration Architecture Guidelines

## Core Integration Patterns

### Required Interface
All external integrations must implement this standardized interface:

```typescript
interface IntegrationAdapter {
  connect(): Promise<void>;
  sync(): Promise<SyncResult>;
  transform(data: RawData): KPIData;
  disconnect(): Promise<void>;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  errors?: string[];
  lastSyncAt: Date;
}
```

### File Structure
```
services/integrations/
├── stripe/
│   ├── adapter.ts          # Main integration logic
│   ├── types.ts           # Provider-specific types
│   └── __tests__/         # Integration tests
├── google-analytics/
└── shared/
    ├── base-adapter.ts    # Common functionality
    └── types.ts          # Shared integration types
```

## MVP Integrations

### Financial Data
- **Stripe**: Revenue, MRR, churn rate, customer metrics
- **CSV Upload**: Manual financial data imports

### Marketing Analytics  
- **Google Analytics**: Traffic, conversions, user behavior
- **Google Sheets**: Custom marketing KPIs
- **Meta Ads**: Facebook and Instagram advertising metrics
- **LinkedIn Ads**: B2B marketing campaign data
- **Twitter/X Ads**: Social media advertising performance

### Productivity
- **Notion**: Objective tracking and notes synchronization

## Integration Security

### Authentication
- Store API keys in environment variables only
- Use OAuth 2.0 where available (Google Analytics, Notion)
- Implement token refresh logic for long-lived connections
- Never expose credentials in client-side code

### Data Validation
```typescript
// All external data must be validated with Zod
const StripeMetricSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  created: z.number().int(),
  customer_id: z.string().optional()
});
```

### Error Handling
- Implement exponential backoff for API rate limits
- Log integration errors with context (no sensitive data)
- Graceful degradation when integrations fail
- User-friendly error messages in UI

## Data Transformation Rules

### KPI Standardization
All integrations must transform external data to this format:
```typescript
interface KPIData {
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
  source: string;
  workspace_id: string;
}
```

### Workspace Isolation
- All synced data must include workspace_id
- Validate workspace access before storing data
- Use RLS to enforce multi-tenant security
- Never mix data between workspaces

## Sync Strategy

### Scheduling
- **Real-time**: Webhooks for Stripe events
- **Hourly**: Google Analytics data pulls
- **Every 4 hours**: Meta Ads campaign performance data
- **Every 6 hours**: LinkedIn Ads B2B campaign metrics
- **Every 6 hours**: Twitter/X Ads social media performance
- **Daily**: Notion objective synchronization
- **Manual**: CSV uploads and Google Sheets

### Conflict Resolution
- External source always wins for automated integrations
- Manual overrides preserved until next sync
- Timestamp-based conflict resolution
- Audit trail for all data changes

## Testing Requirements

### Integration Tests
```typescript
// Required test coverage for each integration
describe('StripeAdapter', () => {
  it('should connect with valid API key');
  it('should sync revenue data correctly');
  it('should handle rate limiting gracefully');
  it('should transform data to KPI format');
  it('should enforce workspace isolation');
});
```

### Mock Strategy
- Mock all external API calls in tests
- Use realistic test data from actual providers
- Test error scenarios and edge cases
- Validate data transformation accuracy

## Performance Guidelines

### Batch Processing
- Process data in configurable batch sizes
- Implement pagination for large datasets
- Use database transactions for consistency
- Monitor memory usage during sync operations

### Caching Strategy
- Cache API responses for duplicate requests
- Implement intelligent sync intervals
- Store last sync timestamps per workspace
- Use React Query for client-side caching

## Future Integration Roadmap

### Post-MVP Additions
- **HubSpot**: CRM and sales pipeline metrics
- **Salesforce**: Enterprise sales data integration