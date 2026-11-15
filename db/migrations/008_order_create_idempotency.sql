BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_fingerprint char(64);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_idempotency_fingerprint_format'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_idempotency_fingerprint_format
      CHECK (idempotency_fingerprint IS NULL OR idempotency_fingerprint ~ '^[0-9a-f]{64}$');
  END IF;
END $$;

INSERT INTO public.schema_migrations (version)
VALUES ('008_order_create_idempotency')
ON CONFLICT (version) DO NOTHING;

COMMIT;
