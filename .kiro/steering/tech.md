# Technical Steering: Sesari MVP

## Tech Stack
- Framework: Next.js 15 (App Router)
- Language: TypeScript (strict mode)
- Database: PostgreSQL with RLS (Supabase)
- ORM: Prisma
- Auth: NextAuth (Google OAuth)
- Payments: Lemon Squeezy
- Emails: Resend
- AI: OpenAI GPT-4
- Charts: Recharts
- Queue: Worker jobs for data sync
- Infra: Terraform + Cloud Secret Manager
- State: React Query for server state, Zustand for UI state
- Validation: Zod

---

## Architecture Overview
| Layer | Responsibility |
|--------|----------------|
| `/apps/web` | UI + RSC entrypoint |
| `/apps/api` | Internal APIs |
| `/worker` | Data ingestion, KPI sync, AI review jobs |
| `/lib` | Shared utilities (auth, db, metrics, AI helpers) |
| `/services/integrations` | Connectors for Stripe, GA, Meta, Sheets, etc. |
| `/specs` | Feature-level documentation for traceability |
| `/steering` | Strategic docs (product, tech, coding rules, structure) |

---

## Coding & Architecture Rules
- Strict TypeScript, no `any` without justification.
- Use RSC for performance; hooks only in client components.
- Business logic in server modules.
- Unit tests with Vitest; e2e with Playwright.
- RLS and billing code changes require senior review.
- Secrets managed via Secret Manager — never in repo.
- Infrastructure as code using Terraform.

---

## Traceability
| Spec | Purpose |
|-------|----------|
| `/specs/goals.spec.md` | AI goal logic, KPI linkage, sync automation |
| `/specs/integrations.spec.md` | Data ingestion points |
| `/specs/dashboard.spec.md` | Visualization layer |
| `/specs/ai-planner.spec.md` | AI-driven strategy generation |
| `/specs/rls-security.spec.md` | Multi-tenant isolation |
| `/specs/billing.spec.md` | Subscription enforcement |

---

## KPIs (Engineering)
| KPI | Target | Notes |
|------|---------|-------|
| Deployment Frequency | Weekly | Continuous iteration |
| Error Rate | <1% | Exception monitoring |
| Data Sync Success | >98% | Integration health |
| API Latency | <500ms avg | Perf monitoring |



### State Management Architecture

**State Libraries:**  
- React Query for server state (KPI, goals, integrations)
- Zustand for global and local UI state (workspace context, filters, goal modals)

**Principles:**
- Never mix React Query state with UI-only logic (like sidebar collapse)
- Use `queryClient.invalidateQueries()` after any mutation (goal create/update)
- RLS context (workspace_id) injected into all queries automatically
- Keep stores minimal — 1 slice per domain under `/lib/stores`

**Folder Structure:**
/lib/stores/
  ├── useWorkspaceStore.ts
  ├── useGoalStore.ts
  ├── useKPIStore.ts
  ├── useUIStore.ts
