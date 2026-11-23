BEGIN;

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference text NOT NULL UNIQUE,
  customer_name text NOT NULL CHECK (length(trim(customer_name)) BETWEEN 2 AND 120),
  customer_phone text NOT NULL CHECK (length(trim(customer_phone)) BETWEEN 7 AND 32),
  party_size integer NOT NULL CHECK (party_size BETWEEN 1 AND 20),
  requested_for timestamptz NOT NULL,
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 500),
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'confirmed', 'declined', 'cancelled', 'completed')),
  table_label text,
  staff_notes text NOT NULL DEFAULT '' CHECK (length(staff_notes) <= 1000),
  wants_sms_updates boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservations_queue_idx
  ON public.reservations (status, requested_for, created_at DESC);

CREATE TABLE IF NOT EXISTS public.reservation_events (
  id bigserial PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('customer', 'staff', 'system')),
  event_type text NOT NULL,
  status text,
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservation_events_history_idx
  ON public.reservation_events (reservation_id, created_at);

ALTER TABLE public.customer_notification_consents
  ADD COLUMN IF NOT EXISTS reservation_id uuid
    REFERENCES public.reservations(id) ON DELETE SET NULL;

ALTER TABLE public.notification_outbox
  ADD COLUMN IF NOT EXISTS reservation_id uuid
    REFERENCES public.reservations(id) ON DELETE CASCADE;

GRANT SELECT, INSERT, UPDATE ON public.reservations TO cloudl_app;
GRANT SELECT, INSERT ON public.reservation_events TO cloudl_app;
GRANT USAGE, SELECT ON SEQUENCE public.reservation_events_id_seq TO cloudl_app;
GRANT SELECT ON public.reservations TO cloudl_app;

INSERT INTO public.schema_migrations (version)
VALUES ('010_reservation_requests')
ON CONFLICT (version) DO NOTHING;

COMMIT;
