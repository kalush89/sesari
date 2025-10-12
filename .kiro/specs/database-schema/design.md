# Database Schema Design

## Overview

The Sesari database schema is built on PostgreSQL with Row-Level Security (RLS) to ensure multi-tenant data isolation. The design uses Prisma as the ORM with a focus on workspace-centric data organization, supporting KPI tracking, goals management, user authentication, and external integrations.

## Architecture

### Multi-Tenant Strategy
- **Workspace-based isolation**: All data tables include `workspace_id` foreign key
- **RLS policies**: Automatic filtering based on user's workspace context
- **Shared tables**: Users and subscriptions exist at the global level
- **Data inheritance**: All workspace data inherits RLS from workspace membership

### Database Technology
- **Primary DB**: PostgreSQL 15+ with RLS enabled
- **ORM**: Prisma with TypeScript generation
- **Migrations**: Prisma migrate for schema versioning
- **Connection**: Connection pooling via Supabase/direct PostgreSQL

## Components and Interfaces

### Core Tables

#### Users Table
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  image         String?
  provider      String   // 'google'
  providerId    String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  workspaces    WorkspaceUser[]
  @@map("users")
}
```

#### Workspaces Table
```prisma
model Workspace {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  users       WorkspaceUser[]
  kpis        Kpi[]
  goals       Goal[]
  integrations Integration[]
  
  @@map("workspaces")
}
```

#### Workspace Users (Junction Table)
```prisma
model WorkspaceUser {
  id          String @id @default(cuid())
  userId      String
  workspaceId String
  role        String @default("member") // 'owner', 'admin', 'member'
  joinedAt    DateTime @default(now())
  
  // Relations
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  @@unique([userId, workspaceId])
  @@map("workspace_users")
}
```

### Business Logic Tables

#### KPIs Table
```prisma
model Kpi {
  id            String   @id @default(cuid())
  workspaceId   String
  name          String
  description   String?
  targetValue   Float?
  currentValue  Float    @default(0)
  unit          String?  // '$', '%', 'users', etc.
  category      String?  // 'revenue', 'growth', 'engagement'
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  dataPoints    KpiDataPoint[]
  goalKpis      GoalKpi[]
  
  @@map("kpis")
}
```

#### KPI Data Points (Historical Tracking)
```prisma
model KpiDataPoint {
  id        String   @id @default(cuid())
  kpiId     String
  value     Float
  timestamp DateTime @default(now())
  source    String?  // 'manual', 'stripe', 'google_analytics'
  
  // Relations
  kpi       Kpi @relation(fields: [kpiId], references: [id], onDelete: Cascade)
  
  @@map("kpi_data_points")
}
```

#### Goals Table
```prisma
model Goal {
  id          String   @id @default(cuid())
  workspaceId String
  title       String
  description String?
  targetDate  DateTime?
  status      String   @default("active") // 'active', 'completed', 'paused'
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  goalKpis    GoalKpi[]
  
  @@map("goals")
}
```

#### Goal-KPI Junction Table
```prisma
model GoalKpi {
  id       String @id @default(cuid())
  goalId   String
  kpiId    String
  weight   Float  @default(1.0) // For weighted progress calculation
  
  // Relations
  goal     Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  kpi      Kpi  @relation(fields: [kpiId], references: [id], onDelete: Cascade)
  
  @@unique([goalId, kpiId])
  @@map("goal_kpis")
}
```

### Integration and Billing Tables

#### Integrations Table
```prisma
model Integration {
  id            String   @id @default(cuid())
  workspaceId   String
  provider      String   // 'stripe', 'google_analytics', 'sheets'
  isActive      Boolean  @default(true)
  credentials   Json     // Encrypted connection data
  lastSyncAt    DateTime?
  syncStatus    String   @default("pending") // 'pending', 'success', 'error'
  errorMessage  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  workspace     Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  @@map("integrations")
}
```

#### Subscriptions Table
```prisma
model Subscription {
  id                String   @id @default(cuid())
  userId            String   @unique
  status            String   // 'active', 'canceled', 'past_due'
  planType          String   // 'free', 'starter', 'pro'
  currentPeriodEnd  DateTime?
  cancelAtPeriodEnd Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  user              User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("subscriptions")
}
```

## Data Models

### RLS Policy Structure
```sql
-- Enable RLS on workspace-scoped tables
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access data from their workspaces
CREATE POLICY workspace_isolation ON kpis
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users 
    WHERE user_id = auth.uid()
  ));
```

### Indexes for Performance
```sql
-- Workspace queries
CREATE INDEX idx_kpis_workspace_id ON kpis(workspace_id);
CREATE INDEX idx_goals_workspace_id ON goals(workspace_id);

-- Time-series queries
CREATE INDEX idx_kpi_data_points_kpi_timestamp ON kpi_data_points(kpi_id, timestamp DESC);

-- User workspace lookups
CREATE INDEX idx_workspace_users_user_id ON workspace_users(user_id);
```

## Error Handling

### Data Integrity
- Foreign key constraints ensure referential integrity
- Soft deletes for KPIs and Goals to preserve historical data
- Validation at Prisma schema level with custom validators

### RLS Security
- All workspace-scoped operations require valid workspace membership
- Failed RLS checks return empty results, not errors
- Audit logging for security-sensitive operations

## Testing Strategy

### Unit Tests
- Prisma model validation and relationships
- RLS policy enforcement with test users
- Data migration scripts with rollback testing

### Integration Tests
- Multi-tenant data isolation verification
- Performance testing with large datasets
- Connection pooling and timeout handling

### Security Tests
- RLS bypass attempt detection
- SQL injection prevention validation
- Encrypted credential storage verification