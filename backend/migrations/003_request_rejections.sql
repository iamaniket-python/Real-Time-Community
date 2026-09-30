CREATE TABLE request_rejections (
  request_id uuid NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL REFERENCES helper_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, helper_id)
);
CREATE INDEX request_rejections_helper_idx ON request_rejections (helper_id);