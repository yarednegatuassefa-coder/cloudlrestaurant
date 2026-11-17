CREATE TABLE IF NOT EXISTS public.staff_login_attempts (
  ip_hash text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_login_attempts ENABLE ROW LEVEL SECURITY;
