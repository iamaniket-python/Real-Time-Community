DO $$
DECLARE
  t text;
  c record;
BEGIN
  SELECT udt_name INTO t FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role';
  IF t IS NULL THEN
    RAISE EXCEPTION 'users.role column not found';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = t AND typtype = 'e') THEN
    EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', t, 'SELLER');
  ELSE
    FOR c IN SELECT conname FROM pg_constraint
              WHERE conrelid = 'public.users'::regclass AND contype = 'c'
                AND pg_get_constraintdef(oid) ILIKE '%role%'
    LOOP
      EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', c.conname);
    END LOOP;
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('USER', 'HELPER', 'ADMIN', 'SELLER'));
  END IF;
END $$;