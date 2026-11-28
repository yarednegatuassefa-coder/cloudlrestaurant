# Cloud L Workflow Governance

This project follows the portfolio [Workflow Quality and Evaluation Standard](https://github.com/yarednegatuassefa-coder/home/blob/main/standards/workflow-quality.md), together with this repository's order, payment, authorization, privacy and release rules.

## Priority workflows

| Workflow | Required invariant | Primary measures |
|---|---|---|
| Guest order creation | Server validates menu, price, availability, order type and idempotency; request is not automatically confirmed | Order-create success, duplicate rate, validation errors |
| Staff order lifecycle | Only authorized staff can advance valid states; transitions are auditable | Time to confirmation, invalid transition rate, fulfilment time |
| Payment confirmation | A payment preference or customer claim is not proof of settlement; provider evidence or staff verification is required | Payment/order match rate, pending age, reconciliation exceptions |
| Delivery zone and fee | Server-side zone match and fee calculation are authoritative | Fee correction rate, out-of-zone rejection accuracy, delivery completion |
| Customer notifications | Send only after the underlying event is committed; do not expose private tracking tokens | Delivery success, bounce/failure rate, duplicate notification rate |
| Menu availability | Sold-out state is consistent between customer and staff surfaces | Stale availability, oversell incidents |
| Support and order edits | Authenticate/authorize access and validate allowed edit windows | Resolution time, unauthorized access attempts, edit error rate |

## Evaluation gates

- Use synthetic orders and test payment callbacks; never use real customer/order/payment records in evaluation fixtures.
- Test duplicate requests, retry after timeout, invalid totals, sold-out items, stale menu state, invalid transitions, expired/private tracking links, unauthorized staff access and delivery-zone boundaries.
- Verify payment reconciliation against provider/staff evidence, not UI state alone.
- Test notification idempotency and ensure no message is sent for a rolled-back order.
- For SMS provider changes, measure delivery receipts, latency, duplicate rate, cost per delivered message, local operator coverage and failure handling before choosing a provider.
- Compare the order flow with and without any agent/skill automation; retain automation only when it improves measured outcomes without weakening controls.

## Approval boundaries

Human approval remains required for payment settlement exceptions, refunds, manual price overrides, supplier or provider commitments, customer-facing policy changes, production database changes and deployment. No AI workflow may mark a payment as settled based only on a customer statement or screenshot.

## Notification delivery semantics

The outbox guarantees durable, deduplicated enqueue by `event_key`; it does not by itself guarantee exactly-once delivery. A process can be interrupted after a provider accepts a message but before the outbox row is marked sent, so a retry may deliver a duplicate. Treat delivery as at-least-once unless the selected provider's idempotency contract is verified and used. Before enabling a provider, document its idempotency behavior, delivery receipts, timeout semantics, retry policy, duplicate handling, local operator coverage and cost. The current Uplink adapter remains disabled while its API contract is unverified.

## Operational review

Review order completion, payment match rate, failed/duplicate notifications, order errors, repeat orders and contribution margin. Define each metric's source, denominator and observation window before comparing releases. Keep customer identifiers and message bodies out of external agent prompts and telemetry.

## Current implementation status

This document defines the evaluation and operating requirements. It does not assert that every metric is instrumented, that an SMS provider is connected, or that the workflows have passed these evaluations. Record actual evidence in the project harness and release notes.

## Letter 5 implementation

See the shared [Portfolio AI and Resilience Standard](https://github.com/yarednegatuassefa-coder/home/blob/main/standards/ai-resilience.md) and the Cloud L [AI/resilience rollout](ai-resilience-rollout.md). The first pilot is draft-only bilingual operations assistance; order, payment and customer-data authority remains deterministic and staff-controlled.
