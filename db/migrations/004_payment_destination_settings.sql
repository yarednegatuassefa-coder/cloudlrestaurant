-- Configurable destinations for cash and staff-verified manual transfers.
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id text PRIMARY KEY,
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 120),
  payment_type text NOT NULL CHECK (payment_type IN ('cash','manual_transfer')),
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  bank_name text,
  recipient_name text,
  phone_number text,
  account_number text,
  merchant_id text,
  instructions text,
  qr_asset_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((payment_type = 'cash' AND id = 'cash') OR (payment_type = 'manual_transfer' AND id <> 'cash'))
);

CREATE TABLE IF NOT EXISTS public.payment_qr_assets (
  id text PRIMARY KEY,
  data_url text NOT NULL CHECK (
    (data_url LIKE 'data:image/%' AND position('base64,' IN data_url) > 0 AND length(data_url) <= 700000)
    OR (data_url LIKE '/assets/payments/%.png' AND length(data_url) <= 256 AND position('..' IN data_url) = 0 AND data_url !~ '[^A-Za-z0-9._/-]')
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_qr_asset_id_fkey;
ALTER TABLE public.payment_methods
  ADD CONSTRAINT payment_methods_qr_asset_id_fkey FOREIGN KEY (qr_asset_id)
  REFERENCES public.payment_qr_assets(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.payment_method_changes (
  id bigserial PRIMARY KEY,
  method_id text NOT NULL,
  method_label text NOT NULL,
  action text NOT NULL CHECK (action IN ('create','edit','toggle')),
  created_at timestamptz NOT NULL DEFAULT now(),
  changed_by text NOT NULL,
  summary text NOT NULL,
  before_state jsonb,
  after_state jsonb
);
CREATE INDEX IF NOT EXISTS payment_method_changes_created_idx
  ON public.payment_method_changes (created_at DESC);

INSERT INTO public.payment_qr_assets (id, data_url) VALUES
('bunna-bank-qr-v1', '/assets/payments/bunna-bank-qr-v1.png')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payment_methods
  (id,label,payment_type,is_enabled,sort_order,bank_name,recipient_name,phone_number,account_number,merchant_id,instructions,qr_asset_id)
VALUES
  ('cash','Cash','cash',true,0,NULL,NULL,NULL,NULL,NULL,'Pay cash to staff.',NULL),
  ('telebirr_manual','Telebirr','manual_transfer',true,1,'Telebirr','Lidia','+251901120012',NULL,NULL,'Transfer to the recipient phone number. Staff will verify the transfer before preparation.',NULL),
  ('bunna_bank_qr_manual','Bunna Bank QR','manual_transfer',true,2,'Bunna Bank','Cloud L Trading PLC',NULL,NULL,'450043','Scan the QR code to transfer. Staff will verify the transfer before preparation.','bunna-bank-qr-v1'),
  ('dashen_bank_manual','Dashen Bank','manual_transfer',true,3,'Dashen Bank','Cloud L Trading PLC',NULL,'0194970006011',NULL,'Transfer to the account number. Staff will verify the transfer before preparation.',NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_destination_snapshot jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ALTER COLUMN payment_destination_snapshot SET DEFAULT '{}'::jsonb;
UPDATE public.orders o
SET payment_destination_snapshot = jsonb_build_object(
  'id', p.id, 'label', p.label, 'payment_type', p.payment_type,
  'bank_name', p.bank_name, 'recipient_name', p.recipient_name,
  'phone_number', p.phone_number, 'account_number', p.account_number,
  'merchant_id', p.merchant_id, 'instructions', p.instructions,
  'qr_asset_id', p.qr_asset_id
)
FROM public.payment_methods p
WHERE o.payment_method = p.id AND (o.payment_destination_snapshot IS NULL OR o.payment_destination_snapshot = '{}'::jsonb);
ALTER TABLE public.orders ALTER COLUMN payment_destination_snapshot SET NOT NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_fkey
  FOREIGN KEY (payment_method) REFERENCES public.payment_methods(id) ON DELETE RESTRICT;

REVOKE ALL ON public.payment_methods FROM cloudl_app;
GRANT SELECT, INSERT ON public.payment_methods TO cloudl_app;
GRANT UPDATE (label,is_enabled,sort_order,bank_name,recipient_name,phone_number,account_number,merchant_id,instructions,qr_asset_id,updated_at) ON public.payment_methods TO cloudl_app;
REVOKE ALL ON public.payment_qr_assets FROM cloudl_app;
GRANT SELECT, INSERT ON public.payment_qr_assets TO cloudl_app;
REVOKE ALL ON public.payment_method_changes FROM cloudl_app;
GRANT SELECT, INSERT ON public.payment_method_changes TO cloudl_app;
GRANT USAGE, SELECT ON SEQUENCE public.payment_method_changes_id_seq TO cloudl_app;
GRANT SELECT, INSERT, UPDATE ON public.orders TO cloudl_app;

INSERT INTO public.schema_migrations (version)
VALUES ('004_payment_destination_settings')
ON CONFLICT (version) DO NOTHING;
