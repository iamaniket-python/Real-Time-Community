ALTER TABLE helper_profiles
  ADD COLUMN IF NOT EXISTS aadhaar_image_path text,
  ADD COLUMN IF NOT EXISTS pan_image_path text,
  ADD COLUMN IF NOT EXISTS shop_image_path text;