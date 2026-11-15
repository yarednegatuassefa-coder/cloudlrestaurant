-- Store optional customer-selected delivery coordinates without requiring PostGIS.
-- Existing text address and staff-confirmed coverage/fee workflow remain authoritative.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS delivery_longitude numeric(9,6);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_delivery_coordinates_pair_check,
  DROP CONSTRAINT IF EXISTS orders_delivery_latitude_range_check,
  DROP CONSTRAINT IF EXISTS orders_delivery_longitude_range_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_coordinates_pair_check
    CHECK ((delivery_latitude IS NULL) = (delivery_longitude IS NULL)),
  ADD CONSTRAINT orders_delivery_latitude_range_check
    CHECK (delivery_latitude IS NULL OR delivery_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT orders_delivery_longitude_range_check
    CHECK (delivery_longitude IS NULL OR delivery_longitude BETWEEN -180 AND 180);

INSERT INTO public.schema_migrations (version)
VALUES ('006_customer_delivery_coordinates')
ON CONFLICT (version) DO NOTHING;
