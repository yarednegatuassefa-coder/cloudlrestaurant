-- Cloud L's initial single-restaurant delivery territory configuration.
-- Coordinates remain plain numeric/JSON; no PostGIS extension is required.
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 80),
  polygon jsonb NOT NULL CHECK (jsonb_typeof(polygon)='array' AND jsonb_array_length(polygon) BETWEEN 3 AND 100),
  delivery_fee_etb integer NOT NULL CHECK (delivery_fee_etb BETWEEN 0 AND 10000),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS delivery_zones_name_lower_idx ON public.delivery_zones (lower(name));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_zone_id uuid REFERENCES public.delivery_zones(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_delivery_zone_created_idx ON public.orders (delivery_zone_id, created_at DESC);
INSERT INTO public.schema_migrations(version) VALUES ('007_delivery_zones') ON CONFLICT(version) DO NOTHING;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_zones TO cloudl_app;
