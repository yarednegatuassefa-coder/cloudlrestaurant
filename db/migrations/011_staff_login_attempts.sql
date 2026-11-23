BEGIN;

CREATE TABLE IF NOT EXISTS public.staff_login_attempts (
  ip_hash char(64) PRIMARY KEY
    CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  attempt_count integer NOT NULL DEFAULT 0
    CHECK (attempt_count >= 0),
  window_start timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staff_login_attempts_window_start_idx
  ON public.staff_login_attempts (window_start);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.staff_login_attempts TO cloudl_app;

INSERT INTO public.schema_migrations (version)
VALUES ('011_staff_login_attempts')
ON CONFLICT (version) DO NOTHING;

COMMIT;
