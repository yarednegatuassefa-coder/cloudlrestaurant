BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS wants_sms_updates boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wants_sms_marketing boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.customer_notification_consents (
  id bigserial PRIMARY KEY,
  customer_phone text NOT NULL CHECK (length(trim(customer_phone)) BETWEEN 7 AND 32),
  channel text NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  purpose text NOT NULL CHECK (purpose IN ('transactional', 'marketing', 'feedback', 'reservation')),
  status text NOT NULL CHECK (status IN ('granted', 'revoked')),
  source text NOT NULL CHECK (source IN ('checkout', 'customer_request', 'staff', 'provider_keyword', 'import')),
  consent_text_version text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_notification_consents_lookup_idx
  ON public.customer_notification_consents (customer_phone, channel, purpose, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id bigserial PRIMARY KEY,
  entity_type text NOT NULL DEFAULT 'order'
    CHECK (entity_type IN ('order', 'reservation', 'customer')),
  entity_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'sms'
    CHECK (channel IN ('sms', 'whatsapp', 'email')),
  purpose text NOT NULL DEFAULT 'transactional'
    CHECK (purpose IN ('transactional', 'marketing', 'feedback', 'reservation')),
  template_key text,
  event_key text NOT NULL,
  recipient text NOT NULL CHECK (length(trim(recipient)) BETWEEN 7 AND 320),
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 1000),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
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

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id bigserial PRIMARY KEY,
  template_key text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  purpose text NOT NULL CHECK (purpose IN ('transactional', 'marketing', 'feedback', 'reservation')),
  locale text NOT NULL DEFAULT 'en',
  subject text,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 10000),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_key, channel, locale)
);

GRANT SELECT, INSERT, UPDATE ON public.notification_outbox TO cloudl_app;
GRANT USAGE, SELECT ON SEQUENCE public.notification_outbox_id_seq TO cloudl_app;
GRANT SELECT, INSERT ON public.customer_notification_consents TO cloudl_app;
GRANT USAGE, SELECT ON SEQUENCE public.customer_notification_consents_id_seq TO cloudl_app;
GRANT SELECT ON public.notification_templates TO cloudl_app;

INSERT INTO public.schema_migrations (version)
VALUES ('009_sms_notification_outbox')
ON CONFLICT (version) DO NOTHING;

COMMIT;
