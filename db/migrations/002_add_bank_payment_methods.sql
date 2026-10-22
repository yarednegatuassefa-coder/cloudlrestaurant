-- Add Buna/Bunna QR and Dashen manual bank transfer methods.
-- Existing orders remain unchanged; only the allowed method values expand.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN (
    'cash',
    'telebirr_manual',
    'bunna_bank_qr_manual',
    'dashen_bank_manual'
  ));
