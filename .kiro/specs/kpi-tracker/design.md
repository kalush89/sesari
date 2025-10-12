# KPI Tracker Design

## Overview

The KPI Tracker provides a comprehensive system for managing key performance indicators with visual dashboards and AI-powered insights. The system follows a multi-tenant architecture with Row-Level Security (RLS) and integrates with the existing Sesari workspace management.

## Architecture

### Data Flow
```
User Input → API Routes → Prisma ORM → PostgreSQL (RLS)
                ↓
Worker Jobs → AI Analysis → Insights Storage
                ↓
Dashboard Components → Chart Visualization
```

### Multi-Tenant Security
- All KPI data isolated by workspace using RLS policies
- API routes validate workspace access before operations
- Worker jobs process data within workspace boundaries

## Components and Interfaces

### Core Models
```typescript
interface KPI {
  id: string
  workspaceId: string
  title: string
  description?: string
  targetValue: number
  currentValue: number
  unit: string
  category: string
  createdAt: Date
  updatedAt: Date
}

interface MetricRecord {
  id: string
  kpiId: string
  value: number
  recordedAt: Date
  source: 'manual' | 'integration' | 'import'
}

interface KPIInsight {
  id: string
  kpiId: string
  summary: string
  trend: 'up' | 'down' | 'stable'
  confidence: number
  generatedAt: Date
}
```

### API Endpoints
- `GET /api/kpis` - List workspace KPIs
- `POST /api/kpis` - Create new KPI
- `PUT /api/kpis/[id]` - Update KPI
- `DELETE /api/kpis/[id]` - Delete KPI
- `POST /api/kpis/[id]/records` - Add metric record
- `GET /api/kpis/[id]/insights` - Get AI insights

### UI Components
- `KPIDashboard` - Main dashboard with KPI grid
- `KPICard` - Individual KPI display with progress
- `KPIForm` - Create/edit KPI modal
- `KPIChart` - Line chart for historical data
- `InsightPanel` - AI-generated insights display

## Data Models

### Database Schema (Prisma)
```prisma
model KPI {
  id           String   @id @default(cuid())
  workspaceId  String
  title        String
  description  String?
  targetValue  Float
  currentValue Float    @default(0)
  unit         String
  category     String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  workspace    Workspace @relation(fields: [workspaceId], references: [id])
  records      MetricRecord[]
  insights     KPIInsight[]
  
  @@map("kpis")
}

model MetricRecord {
  id         String   @id @default(cuid())
  kpiId      String
  value      Float
  recordedAt DateTime @default(now())
  source     String   @default("manual")
  
  kpi        KPI @relation(fields: [kpiId], references: [id], onDelete: Cascade)
  
  @@map("metric_records")
}

model KPIInsight {
  id          String   @id @default(cuid())
  kpiId       String
  summary     String
  trend       String
  confidence  Float
  generatedAt DateTime @default(now())
  
  kpi         KPI @relation(fields: [kpiId], references: [id], onDelete: Cascade)
  
  @@map("kpi_insights")
}
```

### RLS Policies
- KPIs filtered by workspace membership
- Metric records inherit KPI workspace access
- Insights follow same workspace isolation

## Error Handling

### Validation Rules
- KPI title: required, 1-100 characters
- Target value: positive number
- Unit: required, predefined list
- Category: required, predefined list

### Error Responses
- 400: Invalid input data with field-specific messages
- 403: Workspace access denied
- 404: KPI not found or not accessible
- 500: Server error with generic message

### Client Error States
- Loading skeletons during data fetch
- Empty states for no KPIs
- Network error retry mechanisms
- Form validation with inline messages

## Testing Strategy

### Unit Tests
- KPI CRUD operations with workspace isolation
- Metric record calculations and aggregations
- AI insight generation logic
- Input validation and sanitization

### Integration Tests
- API endpoint security and RLS enforcement
- Database operations with proper workspace filtering
- Worker job processing and error handling

### E2E Tests
- Complete KPI lifecycle (create, update, delete)
- Dashboard visualization and interactions
- Multi-user workspace scenarios
- AI insight generation flow

### Performance Tests
- Dashboard load time with large KPI datasets
- Chart rendering with extensive historical data
- Concurrent user operations on shared KPIs