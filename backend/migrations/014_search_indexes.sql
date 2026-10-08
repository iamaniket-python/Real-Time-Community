CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_seller_profiles_shop_name_trgm
  ON seller_profiles USING gin (shop_name gin_trgm_ops);