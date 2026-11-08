# Customer order editing: review and activation

Checklist item 44 is implemented on `feat/customer-order-editing`. Migration 005 is applied and verified on Neon `main`; the Vercel Production flag is set, but the feature becomes active only after the feature branch is merged and the Production deployment succeeds.

Before considering activation:

1. Review the UI/API change and `db/migrations/005_customer_order_edits.sql`. The migration adds the `customer_order_edited` event type and declares the application role's `DELETE` permission for order lines.
2. The migration was applied only after isolated PGlite and Neon temporary-branch checks and owner approval. The development/test and production Neon database is shared; do not use it for a test edit.
3. The server-only Vercel Production environment variable `CLOUDL_CUSTOMER_ORDER_EDITING=true` is set. The API also checks the request host against `cloudlrestaurant.com` and `www.cloudlrestaurant.com`, so previews remain disabled.
4. Merge/deploy only after the authorized release checks pass. Do not create a production test order or edit a real customer's order for validation.

On 8 November 2026, migration 005 passed a disposable PGlite SQL check and a Neon temporary-branch check. Existing event types remained accepted, `customer_order_edited` was accepted, unknown types were rejected, the `DELETE` grant was effective, and reapplication left one constraint and one schema-version row. The migration was then applied and verified on the Neon default branch; no customer order rows were modified. This does not replace a full application/API integration test against a disposable database.

Security follow-up: Neon reports that role `cloudl_app` inherits `neon_superuser`, with effective `CREATEROLE`, `CREATEDB`, and `BYPASSRLS`. Its effective `DELETE` privilege existed before migration 005; the migration did not increase that effective permission. Confirm whether Production `DATABASE_URL` uses this login and prepare a reviewed least-privilege replacement before changing any role membership. No role change was made.

No production test order was placed or edited. To disable the feature after rollout, set the flag to `false` and redeploy; no destructive rollback is required.
