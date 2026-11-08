# Customer order editing: review and activation

Checklist item 44 is implemented on `feat/customer-order-editing`, but its API is disabled by default and the feature is not deployed.

Before considering activation:

1. Review the UI/API change and the additive `db/migrations/005_customer_order_edits.sql` migration. The migration adds the `customer_order_edited` event type and the application role's `DELETE` permission for order lines.
2. Apply that migration only through an explicitly approved database-change window. The development/test and production Neon database is shared; do not use it for a test edit.
3. After the schema change is verified, set the server-only Vercel Production environment variable `CLOUDL_CUSTOMER_ORDER_EDITING=true`. The API also checks the request host against `cloudlrestaurant.com` and `www.cloudlrestaurant.com`, so previews remain disabled.
4. Deploy only after a separate production-release approval. Validate with an owner-authorized test order, never a real customer's request.

The migration file has not been applied, the environment flag has not been set, and no production order was edited. To disable the feature after rollout, set the flag to `false` and redeploy; no destructive rollback is required.
