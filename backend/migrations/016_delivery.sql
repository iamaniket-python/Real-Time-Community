-- ---------------------------------------------------------------- delivery partners
CREATE TABLE delivery_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  verification verification_status NOT NULL DEFAULT 'PENDING',
  vehicle_type text CHECK (vehicle_type IN ('BIKE','SCOOTER','CYCLE','CAR','OTHER')),
  vehicle_number text,
  is_available boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Admin approval list by status, oldest first, with a stable cursor
CREATE INDEX delivery_partners_admin_idx ON delivery_partners (verification, created_at, id);

-- Seller's "pick a partner" list: only approved and available partners are indexed
CREATE INDEX delivery_partners_free_idx ON delivery_partners (created_at, id)
  WHERE verification = 'VERIFIED' AND is_available;

CREATE TRIGGER delivery_partners_updated BEFORE UPDATE ON delivery_partners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------- delivery assignments
CREATE TABLE delivery_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES delivery_partners(id),
  assigned_by uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'ASSIGNED'
    CHECK (status IN ('ASSIGNED','ACCEPTED','PICKED_UP','DELIVERED','REJECTED','CANCELLED')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One live assignment per order (a rejected or cancelled one does not block re-assigning)
CREATE UNIQUE INDEX delivery_one_active_per_order ON delivery_assignments (order_id)
  WHERE status IN ('ASSIGNED','ACCEPTED','PICKED_UP');

-- One live order per partner at a time
CREATE UNIQUE INDEX delivery_one_active_per_partner ON delivery_assignments (partner_id)
  WHERE status IN ('ASSIGNED','ACCEPTED','PICKED_UP');

-- Partner's history, newest first, with a stable cursor (also covers the foreign key)
CREATE INDEX delivery_partner_hist_idx ON delivery_assignments (partner_id, created_at DESC, id DESC);

-- All assignments of one order (also covers the foreign key)
CREATE INDEX delivery_order_idx ON delivery_assignments (order_id, created_at DESC);

CREATE TRIGGER delivery_assignments_updated BEFORE UPDATE ON delivery_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();