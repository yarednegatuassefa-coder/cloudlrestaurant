BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS wants_sms_updates boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'sms' CHECK (channel = 'sms'),
  event_key text NOT NULL,
  recipient text NOT NULL CHECK (length(trim(recipient)) BETWEEN 7 AND 32),
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT notification_outbox_event_key_unique UNIQUE (event_key)
);

CREATE INDEX IF NOT EXISTS notification_outbox_dispatch_idx
  ON public.notification_outbox (available_at, created_at)
  WHERE status IN ('pending', 'sending');

GRANT SELECT, INSERT, UPDATE ON public.notification_outbox TO cloudl_app;
GRANT USAGE, SELECT ON SEQUENCE public.notification_outbox_id_seq TO cloudl_app;

INSERT INTO public.schema_migrations (version)
VALUES ('009_sms_notification_outbox')
ON CONFLICT (version) DO NOTHING;

COMMIT;
