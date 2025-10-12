# Strategy Planner Design

## Overview

The Strategy Planner provides a structured workspace for creating and managing strategic goals with linked KPIs. The system integrates with the existing KPI tracker and leverages AI to generate strategic recommendations, following the established multi-tenant architecture with Row-Level Security.

## Architecture

### Data Flow
```
User Input → API Routes → Prisma ORM → PostgreSQL (RLS)
                ↓
AI Service → Strategy Suggestions → User Selection
                ↓
Strategy Components → KPI Linkage → Progress Tracking
```

### Integration Points
- Links to existing KPI system for metric association
- Uses workspace context for multi-tenant isolation
- Integrates with AI service for strategy recommendations

## Components and Interfaces

### Core Models
```typescript
interface Strategy {
  id: string
  workspaceId: string
  title: string
  description: string
  targetDate: Date
  status: 'draft' | 'active' | 'completed' | 'paused'
  createdAt: Date
  updatedAt: Date
}

interface Objective {
  id: string
  strategyId: string
  title: string
  description: string
  deadline?: Date
  completed: boolean
  order: number
}

interface StrategyKPILink {
  id: string
  strategyId: string
  kpiId: string
  expectedImpact: string
  createdAt: Date
}
```

### API Endpoints
- `GET /api/strategies` - List workspace strategies
- `POST /api/strategies` - Create new strategy
- `PUT /api/strategies/[id]` - Update strategy
- `DELETE /api/strategies/[id]` - Delete strategy
- `POST /api/strategies/[id]/objectives` - Add objective
- `PUT /api/strategies/[id]/objectives/[objId]` - Update objective
- `POST /api/strategies/[id]/kpis` - Link KPI to strategy
- `DELETE /api/strategies/[id]/kpis/[kpiId]` - Remove KPI link
- `POST /api/strategies/ai-suggestions` - Get AI recommendations

### UI Components
- `StrategyPlanner` - Main strategy management interface
- `StrategyCard` - Individual strategy display with progress
- `StrategyForm` - Create/edit strategy modal
- `ObjectiveList` - Manage strategy objectives
- `KPILinkage` - Link and display connected KPIs
- `AISuggestions` - Display and select AI recommendations

## Data Models

### Database Schema (Prisma)
```prisma
model Strategy {
  id          String   @id @default(cuid())
  workspaceId String
  title       String
  description String
  targetDate  DateTime
  status      String   @default("draft")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  objectives  Objective[]
  kpiLinks    StrategyKPILink[]
  
  @@map("strategies")
}

model Objective {
  id          String   @id @default(cuid())
  strategyId  String
  title       String
  description String
  deadline    DateTime?
  completed   Boolean  @default(false)
  order       Int      @default(0)
  
  strategy    Strategy @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  
  @@map("objectives")
}

model StrategyKPILink {
  id             String   @id @default(cuid())
  strategyId     String
  kpiId          String
  expectedImpact String
  createdAt      DateTime @default(now())
  
  strategy       Strategy @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  kpi            KPI @relation(fields: [kpiId], references: [id], onDelete: Cascade)
  
  @@unique([strategyId, kpiId])
  @@map("strategy_kpi_links")
}
```

## Error Handling

### Validation Rules
- Strategy title: required, 1-100 characters
- Description: required, 1-500 characters
- Target date: must be future date
- Objectives: title required, max 20 per strategy
- KPI links: must exist in same workspace

### Error Responses
- 400: Invalid input with specific field errors
- 403: Workspace access denied
- 404: Strategy/KPI not found
- 409: KPI already linked to strategy
- 500: Server error with generic message

### Client Error States
- Loading states for AI suggestions
- Empty states for no strategies
- Network retry for failed operations
- Form validation with inline feedback

## Testing Strategy

### Unit Tests
- Strategy CRUD with workspace isolation
- Objective management and ordering
- KPI linkage validation and constraints
- AI suggestion processing and formatting

### Integration Tests
- API security and RLS enforcement
- Cross-model relationships (Strategy-KPI)
- AI service integration and fallbacks

### E2E Tests
- Complete strategy lifecycle
- KPI linking and unlinking flows
- AI suggestion selection and implementation
- Multi-user strategy collaboration