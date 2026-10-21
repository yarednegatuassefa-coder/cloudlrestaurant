CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference text NOT NULL UNIQUE,
  tracking_token_hash char(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'completed', 'declined', 'cancelled')),
  payment_method text NOT NULL
    CHECK (payment_method IN ('cash', 'telebirr_manual')),
  payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'awaiting_transfer', 'submitted', 'paid', 'rejected', 'refunded')),
  fulfillment text NOT NULL
    CHECK (fulfillment IN ('pickup', 'delivery', 'dine_in')),
  customer_name text NOT NULL CHECK (length(trim(customer_name)) BETWEEN 1 AND 120),
  customer_phone text NOT NULL CHECK (length(trim(customer_phone)) BETWEEN 7 AND 32),
  delivery_address text,
  delivery_landmark text,
  delivery_notes text,
  special_instructions text,
  guest_count smallint CHECK (guest_count IS NULL OR guest_count BETWEEN 1 AND 40),
  table_number text,
  subtotal_etb integer NOT NULL CHECK (subtotal_etb > 0),
  delivery_fee_etb integer CHECK (delivery_fee_etb IS NULL OR delivery_fee_etb >= 0),
  total_etb integer CHECK (total_etb IS NULL OR total_etb >= subtotal_etb),
  estimated_ready_at timestamptz,
  wants_whatsapp_updates boolean NOT NULL DEFAULT false,
  customer_payment_reference text,
  customer_payment_submitted_at timestamptz,
  staff_payment_verified_at timestamptz,
  staff_payment_reference text,
  staff_notes text,
  cancellation_reason text,
  CHECK (fulfillment <> 'delivery' OR length(trim(coalesce(delivery_address, ''))) >= 5),
  CHECK (payment_status <> 'paid' OR staff_payment_verified_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS orders_status_created_idx
  ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_created_at_idx
  ON public.orders (created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_items (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id text NOT NULL,
  name text NOT NULL,
  name_amharic text NOT NULL DEFAULT '',
  size text,
  unit_price_etb integer NOT NULL CHECK (unit_price_etb > 0),
  quantity smallint NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  line_total_etb integer GENERATED ALWAYS AS (unit_price_etb * quantity) STORED
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx
  ON public.order_items (order_id);

CREATE TABLE IF NOT EXISTS public.order_events (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_type text NOT NULL CHECK (actor_type IN ('customer', 'staff', 'system')),
  actor_label text,
  event_type text NOT NULL CHECK (event_type IN ('order_received', 'status_changed', 'payment_submitted', 'payment_verified', 'note')),
  status text,
  message text NOT NULL DEFAULT '',
  customer_visible boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS order_events_order_created_idx
  ON public.order_events (order_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.menu_availability (
  menu_item_id text PRIMARY KEY,
  is_sold_out boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.schema_migrations (version)
VALUES ('001_initial_orders')
ON CONFLICT (version) DO NOTHING;


GRANT USAGE ON SCHEMA public TO cloudl_app;
GRANT SELECT, INSERT, UPDATE ON public.orders TO cloudl_app;
GRANT SELECT, INSERT ON public.order_items TO cloudl_app;
GRANT SELECT, INSERT ON public.order_events TO cloudl_app;
GRANT SELECT, INSERT, UPDATE ON public.menu_availability TO cloudl_app;
GRANT USAGE, SELECT ON SEQUENCE public.order_items_id_seq TO cloudl_app;
GRANT USAGE, SELECT ON SEQUENCE public.order_events_id_seq TO cloudl_app;
