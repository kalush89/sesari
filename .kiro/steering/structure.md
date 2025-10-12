# 🏗 Project Structure Steering — Sesari

/apps
├─ /web (Next.js App Router)
│ ├─ /app
│ │ ├─ layout.tsx
│ │ ├─ page.tsx
│ │ └─ /(auth)
│ │ └─ signin UI
│ └─ /components
│ ├─ dashboard/
│ ├─ goals/
│ ├─ integrations/
│ └─ billing/
├─ /api (server-only helpers)
├─ /worker (background jobs: ingestion, transformations)
├─ /lib (shared libs: db, auth, metrics)
├─ /services (integrations: stripe, google, meta, resend, lemon-squeezy)
├─ /specs (Kiro SPEC files)
├─ /steering (product.md, tech.md, structure.md, coding_rules.md, integrations.md)
├─ /migrations (Prisma migrations)

pgsql
Copy code

**Guidelines:**
- Integrations → `/services/integrations/<provider>`
- Prisma schema → `/lib/db/schema.prisma`
- Each bounded context → its own Prisma wrapper with RLS
- UI components split by domain in `/web/components/`