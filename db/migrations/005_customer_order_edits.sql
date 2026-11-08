ALTER TABLE public.order_events
  DROP CONSTRAINT IF EXISTS order_events_event_type_check;

ALTER TABLE public.order_events
  ADD CONSTRAINT order_events_event_type_check
  CHECK (event_type IN (
    'order_received',
    'status_changed',
    'payment_submitted',
    'payment_verified',
    'note',
    'customer_order_edited'
  ));

GRANT DELETE ON TABLE public.order_items TO cloudl_app;

INSERT INTO public.schema_migrations (version)
VALUES ('005_customer_order_edits')
ON CONFLICT (version) DO NOTHING;
