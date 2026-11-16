# CloudL Harness

## Initialization
1. Read root AGENTS.md and this guide.
2. Read plan.md and the relevant docs/ and db/ migration notes for the task.
3. Check git status/branch and inspect recent commits.
4. Read feature-list.json and the latest progress entry.
5. Confirm Node/npm versions and dependencies. Check only whether required environment variables are set; never print values.
6. Use synthetic fixtures only. Do not export or expose customer/order/payment data.

## Commands
- npm run harness:check — repository structure, manifest and required environment-name checks.
- npm run lint
- npm run build
- npm run test:api
- npm run test:e2e (requires Playwright browser installation)
- npm run test:pwa

Run the smallest relevant tests during development, then the complete applicable suite before requesting review. E2E tests must use fixtures/request interception, never real customer data.

## Domain gates
- Preserve server-side authorization, tenant boundaries, order-state transitions, idempotency and private tracking-token handling.
- Payment is not confirmed by customer submission or screenshot. Staff verification remains authoritative.
- Delivery fee and zone matching must be server-side and tested at boundaries.
- Database changes require isolated scratch/staging proof, migration review and explicit approval before any live migration.
- Nemotron/local AI remains opt-in and must not receive customer/order/payment data.
- No production access, live migration, paid service, publishing or deployment without separate task-specific authorization.

## Task closure
Update feature-list.json only with evidence-backed status. Append to progress.md: task ID, branch/commit, changed surfaces, commands and outcomes, skipped checks, risks/approvals and next action. A green build is not operational acceptance.
