-- ---------------------------------------------------------------- products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_paise integer NOT NULL CHECK (price_paise > 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A shop's product list, newest first, with a stable cursor (also covers the foreign key)
CREATE INDEX products_shop_idx ON products (seller_id, created_at DESC, id DESC)
  WHERE is_active;

-- ---------------------------------------------------------------- cart (one shop per cart)
CREATE TABLE carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES seller_profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  PRIMARY KEY (cart_id, product_id)
);

-- Deleting a product must not scan every cart
CREATE INDEX cart_items_product_idx ON cart_items (product_id);

-- ---------------------------------------------------------------- orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  seller_id uuid NOT NULL REFERENCES seller_profiles(id),
  status text NOT NULL DEFAULT 'PENDING_PAYMENT'
    CHECK (status IN ('PENDING_PAYMENT','PLACED','CONFIRMED','READY','COMPLETED','CANCELLED','EXPIRED')),
  fulfillment text NOT NULL DEFAULT 'PICKUP' CHECK (fulfillment IN ('PICKUP','DELIVERY')),
  delivery_address text,
  total_paise integer NOT NULL CHECK (total_paise > 0),
  idempotency_key text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- "My orders", newest first
CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC, id DESC);
-- Seller order list, filtered by status
CREATE INDEX orders_seller_idx ON orders (seller_id, status, created_at DESC, id DESC);
-- The expiry job only ever looks at unpaid orders, so index only those
CREATE INDEX orders_expiry_idx ON orders (expires_at) WHERE status = 'PENDING_PAYMENT';
-- Same checkout sent twice returns the same order
CREATE UNIQUE INDEX orders_idem_idx ON orders (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE order_items (
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  name text NOT NULL,
  unit_price_paise integer NOT NULL CHECK (unit_price_paise > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id)
);

-- Needed for the foreign key to products (cheap checks, product history)
CREATE INDEX order_items_product_idx ON order_items (product_id);

CREATE TABLE order_status_history (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_history_idx ON order_status_history (order_id, created_at, id);

-- ---------------------------------------------------------------- payments
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  gateway text NOT NULL DEFAULT 'razorpay',
  gateway_order_id text NOT NULL UNIQUE,
  gateway_payment_id text UNIQUE,
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  status text NOT NULL DEFAULT 'CREATED'
    CHECK (status IN ('CREATED','PAID','FAILED','REFUNDED')),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_order_idx ON payments (order_id);

-- Every webhook event is processed once, even if the gateway sends it again
CREATE TABLE webhook_events (
  event_id text PRIMARY KEY,
  gateway text NOT NULL DEFAULT 'razorpay',
  received_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- reviews
CREATE TABLE shop_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  seller_id uuid NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- A shop's reviews, newest first, with a stable cursor
CREATE INDEX shop_reviews_idx ON shop_reviews (seller_id, created_at DESC, id DESC);