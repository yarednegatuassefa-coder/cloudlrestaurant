ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_fingerprint char(64);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_idempotency_fingerprint_format
  CHECK (idempotency_fingerprint IS NULL OR idempotency_fingerprint ~ '^[0-9a-f]{64}$');

INSERT INTO public.schema_migrations (version)
VALUES ('008_order_create_idempotency')
ON CONFLICT (version) DO NOTHING;
