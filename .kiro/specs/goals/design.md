# Goals Design Document

## Overview

The Goals system provides AI-powered goal creation, tracking, and optimization for business outcomes. It integrates with the existing KPI tracker and external integrations to automatically monitor progress and provide intelligent recommendations using GPT-4.

## Architecture

### Data Flow
```
AI Goal Generation → User Confirmation → Goal Storage → Progress Tracking
        ↓                    ↓               ↓              ↓
Integration Data → Goal Suggestions → Goal CRUD → KPI Linking → Dashboard
        ↓                                                        ↓
Weekly Analysis → AI Insights → Email Notifications → Progress Updates
```

### Integration Points
- **KPI Tracker**: Links goals to specific KPIs for automatic progress updates
- **External Integrations**: Uses Stripe/GA data for AI goal generation
- **State Management**: React Query for server state, Zustand for UI state
- **Notifications**: Resend integration for progress alerts and insights

## Components and Interfaces

### Core Models
```typescript
interface Goal {
  id: string
  workspaceId: string
  title: string
  description: string
  targetValue: number
  currentValue: number
  unit: string
  deadline: Date
  status: 'active' | 'completed' | 'paused' | 'overdue'
  linkedKPIId?: string
  aiGenerated: boolean
  createdAt: Date
  updatedAt: Date
}

interface GoalProgress {
  id: string
  goalId: string
  value: number
  recordedAt: Date
  source: 'manual' | 'kpi_sync' | 'integration'
  notes?: string
}

interface GoalInsight {
  id: string
  goalId: string
  summary: string
  recommendations: string[]
  confidence: number
  generatedAt: Date
}
```

### AI Service Interface
```typescript
interface AIGoalService {
  generateGoalSuggestions(workspaceData: WorkspaceData): Promise<GoalSuggestion[]>
  analyzeGoalProgress(goal: Goal, progressHistory: GoalProgress[]): Promise<GoalInsight>
  generateWeeklyInsights(goals: Goal[]): Promise<WeeklyInsight>
}

interface GoalSuggestion {
  title: string
  description: string
  targetValue: number
  unit: string
  deadline: Date
  reasoning: string
  dataSource: string
  confidence: number
}
```

### API Endpoints
- `GET /api/goals` - List workspace goals with progress
- `POST /api/goals` - Create new goal
- `PUT /api/goals/[id]` - Update goal
- `DELETE /api/goals/[id]` - Archive goal
- `POST /api/goals/ai-suggestions` - Generate AI goal suggestions
- `GET /api/goals/[id]/insights` - Get goal insights
- `POST /api/goals/[id]/progress` - Add manual progress update

### UI Components
- `GoalsDashboard` - Main goals overview with progress cards
- `GoalCard` - Individual goal display with progress bar
- `GoalForm` - Create/edit goal modal with SMART validation
- `AIGoalSuggestions` - Display and customize AI-generated goals
- `GoalProgressChart` - Recharts visualization of progress over time
- `WeeklyInsights` - AI-generated recommendations panel

## Data Models

### Database Schema (Prisma)
```prisma
model Goal {
  id           String   @id @default(cuid())
  workspaceId  String
  title        String
  description  String
  targetValue  Float
  currentValue Float    @default(0)
  unit         String
  deadline     DateTime
  status       String   @default("active")
  linkedKPIId  String?
  aiGenerated  Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  workspace    Workspace @relation(fields: [workspaceId], references: [id])
  linkedKPI    KPI? @relation(fields: [linkedKPIId], references: [id])
  progress     GoalProgress[]
  insights     GoalInsight[]
  
  @@map("goals")
}

model GoalProgress {
  id         String   @id @default(cuid())
  goalId     String
  value      Float
  recordedAt DateTime @default(now())
  source     String   @default("manual")
  notes      String?
  
  goal       Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  
  @@map("goal_progress")
}

model GoalInsight {
  id              String   @id @default(cuid())
  goalId          String
  summary         String
  recommendations String[]
  confidence      Float
  generatedAt     DateTime @default(now())
  
  goal            Goal @relation(fields: [goalId], references: [id], onDelete: Cascade)
  
  @@map("goal_insights")
}
```

### RLS Policies
- Goals filtered by workspace membership
- Progress records inherit goal workspace access
- Insights follow same workspace isolation

## Error Handling

### Validation Rules
- Goal title: required, 1-100 characters
- Target value: positive number
- Deadline: future date, max 1 year
- Description: required for SMART compliance
- Unit: required, consistent with linked KPI

### AI Service Error Handling
- Fallback to template goals if AI generation fails
- Retry logic for OpenAI API calls with exponential backoff
- Cache successful AI responses to reduce API calls
- Graceful degradation when AI insights unavailable

### Client Error States
- Loading states during AI goal generation
- Empty states for no goals with CTA to create
- Network error retry for failed operations
- Form validation with SMART criteria feedback

## Testing Strategy

### Unit Tests
- Goal CRUD operations with workspace isolation
- AI service integration with mocked OpenAI responses
- Progress calculation and status updates
- SMART goal validation logic

### Integration Tests
- End-to-end goal creation with AI suggestions
- KPI linking and automatic progress updates
- Weekly insight generation and email delivery
- Multi-user workspace goal scenarios

### E2E Tests
- Complete goal lifecycle from AI suggestion to completion
- Dashboard interactions and progress visualization
- Integration data triggering goal progress updates
- Email notification delivery and content verification