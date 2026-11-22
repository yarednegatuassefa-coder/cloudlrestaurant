# Agent Code-Mode Architecture — Cloud L Restaurant

Status: architecture target; no claim that a general-purpose code-mode agent runtime is already deployed.

## Workflow boundary
Use the Home portfolio [Code-Mode Agent Engineering Standard](https://github.com/yarednegatuassefa-coder/home/blob/main/standards/code-mode-agent-engineering.md). Preserve the existing Vite/Node API, PostgreSQL model, staff authorization, Railway OSRM gateway and current deployment boundaries.

## Apply the pattern
- Keep order validation, price calculation, menu availability, delivery-zone matching, fee calculation, idempotency, routing and payment-state transitions in deterministic server code.
- For an agentic operations workflow, discover only the relevant tools (orders, menu, delivery routing, reporting); do not preload every API schema.
- Aggregate order/delivery analytics server-side and return only bounded counts, trends and redacted samples.
- Poll route/deployment/order workflows in bounded code loops with deadlines, backoff, cancellation and correlation IDs.
- Reusable skills may explain approved operational workflows but must not become an alternate path around the API.

## Privacy and safety
- Customer phone numbers, addresses, order notes, private tracking tokens and payment details are restricted data.
- Never expose raw customer addresses or tracking tokens to a model. Use a protected location token or approved coarse geography for analysis.
- The server remains authoritative for price, order state, delivery fees and staff permissions.
- A submitted order is not proof of confirmed payment. Staff confirmation gates remain unchanged.

## Verification
Test unauthorized tool denial, delivery-zone boundary cases, idempotent order creation, private tracking-token handling, redaction, bounded output and retry safety. Do not use production customer/order data for tests.
