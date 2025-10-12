# 💻 Coding & Architecture Rules — Sesari

## TypeScript & Patterns
- `"strict": true` (no `any` unless justified with explicit comment)
- React Server Components for performance
- Functional components + hooks for client logic
- Business logic runs server-side or in workers

## Naming & Style
- Files: kebab-case
- Components: PascalCase
- Exports: default for React components; named for utilities

## Testing
- Unit tests: Vitest
- E2E: Playwright
- Each integration adapter has mockable interface + tests
- Target coverage: 70%+ for auth, billing, RLS

## Infrastructure as Code
- Terraform/CDK → `/infra`
- Secrets in AWS Secret Manager (never in repo)

## PR & Review Rules
- No merge without passing CI + tests + scans
- RLS, billing, integrations → require senior review

## Prohibitions
- ❌ No raw credit card data storage
- ❌ No direct prod DB writes outside migrations/workers
