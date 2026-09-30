-- PostGIS-ready: lat/lng are plain doubles now.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('USER','HELPER','ADMIN');
CREATE TYPE account_status AS ENUM ('ACTIVE','SUSPENDED','BLOCKED','DELETED');
CREATE TYPE verification_status AS ENUM ('PENDING','VERIFIED','REJECTED','SUSPENDED');
CREATE TYPE request_status AS ENUM ('PENDING','SEARCHING','ACCEPTED','ARRIVING','IN_PROGRESS','COMPLETED','CANCELLED','REJECTED','EXPIRED');
CREATE TYPE report_status AS ENUM ('OPEN','REVIEWING','RESOLVED','DISMISSED');

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(254) NOT NULL,
  name varchar(100) NOT NULL,
  phone varchar(20),
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'USER',
  status account_status NOT NULL DEFAULT 'ACTIVE',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));
CREATE INDEX users_role_status_idx ON users (role, status);

CREATE TABLE categories (
  id serial PRIMARY KEY,
  name varchar(80) NOT NULL UNIQUE,
  slug varchar(80) NOT NULL UNIQUE,
  icon varchar(40),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE helper_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio text,
  verification verification_status NOT NULL DEFAULT 'PENDING',
  is_available boolean NOT NULL DEFAULT false,
  current_lat double precision,
  current_lng double precision,
  location_updated_at timestamptz,
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX helper_match_idx ON helper_profiles (current_lat, current_lng)
  WHERE is_available AND verification = 'VERIFIED';

CREATE TABLE helper_categories (
  helper_id uuid NOT NULL REFERENCES helper_profiles(id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (helper_id, category_id)
);
CREATE INDEX helper_categories_cat_idx ON helper_categories (category_id);

CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  label varchar(120),
  address text,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX locations_user_idx ON locations (user_id);

CREATE TABLE help_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  category_id integer NOT NULL REFERENCES categories(id),
  title varchar(150) NOT NULL,
  description text NOT NULL,
  image_url text,
  address text,
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  status request_status NOT NULL DEFAULT 'PENDING',
  search_radius_km numeric(6,2) NOT NULL DEFAULT 5,
  accepted_helper_id uuid REFERENCES helper_profiles(id),
  accepted_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  idempotency_key varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX requests_user_created_idx ON help_requests (user_id, created_at DESC, id DESC);
CREATE INDEX requests_helper_idx ON help_requests (accepted_helper_id, created_at DESC);
CREATE INDEX requests_open_idx ON help_requests (category_id, lat, lng)
  WHERE status IN ('PENDING','SEARCHING');
CREATE INDEX requests_expiry_idx ON help_requests (expires_at)
  WHERE status IN ('PENDING','SEARCHING');
CREATE UNIQUE INDEX one_active_request_per_user ON help_requests (user_id)
  WHERE status IN ('PENDING','SEARCHING','ACCEPTED','ARRIVING','IN_PROGRESS');

CREATE TABLE request_status_history (
  id bigserial PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  from_status request_status,
  to_status request_status NOT NULL,
  changed_by uuid REFERENCES users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX status_history_req_idx ON request_status_history (request_id, created_at);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES help_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  helper_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id),
  body text,
  attachment_url text,
  attachment_type varchar(60),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (body IS NOT NULL OR attachment_url IS NOT NULL)
);
CREATE INDEX messages_conv_idx ON messages (conversation_id, created_at DESC, id DESC);

CREATE TABLE message_reads (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reader_id uuid NOT NULL REFERENCES users(id),
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, reader_id)
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type varchar(50) NOT NULL,
  title varchar(150) NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES help_requests(id),
  rater_id uuid NOT NULL REFERENCES users(id),
  helper_id uuid NOT NULL REFERENCES helper_profiles(id),
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ratings_helper_idx ON ratings (helper_id, created_at DESC);

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id),
  reported_user_id uuid NOT NULL REFERENCES users(id),
  request_id uuid REFERENCES help_requests(id),
  reason varchar(60) NOT NULL,
  details text,
  status report_status NOT NULL DEFAULT 'OPEN',
  resolved_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_status_idx ON reports (status, created_at DESC);

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

CREATE TABLE admin_actions (
  id bigserial PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES users(id),
  action varchar(60) NOT NULL,
  target_type varchar(40) NOT NULL,
  target_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_actions_admin_idx ON admin_actions (admin_id, created_at DESC);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['users','categories','helper_profiles','help_requests','reports'] LOOP
    EXECUTE format('CREATE TRIGGER %I_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;