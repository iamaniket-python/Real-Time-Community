-- Average rating kept on the partner row so the customer's tracking page needs no aggregate query
ALTER TABLE delivery_partners
  ADD COLUMN rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN rating_count integer NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------- customer rating of a delivery
CREATE TABLE delivery_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL UNIQUE REFERENCES delivery_assignments(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  partner_id uuid NOT NULL REFERENCES delivery_partners(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A partner's reviews, newest first, with a stable cursor (also covers the foreign key)
CREATE INDEX delivery_ratings_partner_idx ON delivery_ratings (partner_id, created_at DESC, id DESC);

-- Covers the foreign keys to orders and users
CREATE INDEX delivery_ratings_order_idx ON delivery_ratings (order_id);
CREATE INDEX delivery_ratings_user_idx ON delivery_ratings (user_id);