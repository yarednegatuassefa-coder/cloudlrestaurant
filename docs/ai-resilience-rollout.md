# Cloud L AI and Resilience Rollout

## Approved pilot: bilingual operations copilot

**Mode:** reviewed copilot, draft-only.

**Purpose:** help staff draft English/Amharic menu explanations, promotion text and non-sensitive order summaries.

**Authoritative sources:** current server menu/catalog, enabled payment-method labels, confirmed order state and approved business copy. The model must not invent prices, availability, fees, payment destinations or order status.

**Allowed output:** a draft for staff review, with source fields and an uncertainty note when data is missing.

**Forbidden actions:** mark payment paid, confirm an order, change a price, alter availability, send a customer message, expose tracking tokens, or write to the database without an existing authenticated deterministic workflow.

**Failure path:** if the model/provider fails or times out, staff use the existing manual UI and approved copy. No order or payment path depends on AI.

**Evaluation cases:** bilingual menu draft accuracy, stale price rejection, missing catalog field, payment-claim refusal, private-token redaction, provider timeout and duplicate retry.

**Measures:** approved draft rate, correction rate, time saved per approved draft, escalation rate, cost per approved draft and unsupported-claim rate.

## Existing resilience to preserve

Keep idempotent order creation, server-side price/availability checks, manual payment verification, payment-to-preparation gating, private tracking links, outbox at-least-once semantics and synthetic-only evaluation. Any future AI integration must pass `docs/workflow-governance.md` and the shared Home AI/resilience standard.
