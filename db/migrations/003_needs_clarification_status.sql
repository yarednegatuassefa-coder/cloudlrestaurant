-- Add a staff-controlled, customer-visible status for orders awaiting clarification.
-- Existing order records and status values are preserved.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'received',
    'needs_clarification',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
    'completed',
    'declined',
    'cancelled'
  ));

INSERT INTO public.schema_migrations (version)
VALUES ('003_needs_clarification_status')
ON CONFLICT (version) DO NOTHING;
