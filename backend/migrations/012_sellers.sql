CREATE TABLE seller_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  verification verification_status NOT NULL DEFAULT 'PENDING',
  shop_name text,
  description text,
  address text,
  lat double precision,
  lng double precision,
  gst_number text,
  pan_number text,
  aadhaar_number text,
  gst_image_path text,
  pan_image_path text,
  aadhaar_image_path text,
  is_open boolean NOT NULL DEFAULT true,
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_lat_range CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  CONSTRAINT seller_lng_range CHECK (lng IS NULL OR lng BETWEEN -180 AND 180)
);

-- Nearby shops: only rows users can actually see are indexed (small and fast)
CREATE INDEX seller_nearby_idx ON seller_profiles (lat, lng)
  WHERE verification = 'VERIFIED' AND is_open AND lat IS NOT NULL;

-- Admin list by status, oldest first, with a stable cursor
CREATE INDEX seller_admin_idx ON seller_profiles (verification, created_at, id);

CREATE TABLE shop_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  path text NOT NULL,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Gallery in order for one shop (also covers the foreign key)
CREATE INDEX shop_images_seller_idx ON shop_images (seller_id, position, id);