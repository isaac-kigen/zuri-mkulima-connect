-- ============================================================
-- Zuri Mkulima Connect - Database Migration for New Features
-- ============================================================
-- Run this in your Supabase SQL Editor (or as a migration)
-- Features: Farmer Vetting, Two-Way Ratings, Platform Fee, 
--            Inventory Management, Escrow Payment System
-- ============================================================

-- 1. Add vetting_status enum
DO $$ BEGIN
  CREATE TYPE vetting_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add vetting columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vetting_status vetting_status DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vetting_submitted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vetting_reviewed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vetting_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vetting_document_url TEXT DEFAULT NULL;

-- Auto-approve buyers (they don't need vetting)
UPDATE profiles SET vetting_status = 'approved' WHERE role = 'buyer' AND vetting_status IS NULL;

-- 3. Create vetting_forms table
CREATE TABLE IF NOT EXISTS vetting_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  farm_name TEXT NOT NULL,
  farm_location_county TEXT NOT NULL,
  farm_location_ward TEXT,
  farm_size_acres NUMERIC,
  products_grown TEXT NOT NULL,
  years_farming INTEGER,
  phone_number TEXT NOT NULL,
  id_number TEXT,
  supporting_document_url TEXT,
  status vetting_status DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add order_status value 'paid' (escrow)
-- Supabase doesn't support ALTER TYPE ADD VALUE in a transaction easily,
-- so we handle it separately. If the old enum already exists without 'paid':
DO $$ 
BEGIN
  -- Check if 'paid' already exists in the enum
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'order_status'::regtype AND enumlabel = 'paid') THEN
    ALTER TYPE order_status ADD VALUE 'paid';
  END IF;
END $$;

-- 5. Add escrow delivery columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_deadline_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_failed_count INTEGER DEFAULT 0;

-- 6. Add platform_fee_kes and farmer_earnings_kes to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS platform_fee_kes NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS farmer_earnings_kes NUMERIC DEFAULT 0;

-- 7. Add platform_fee_kes to payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS platform_fee_kes NUMERIC DEFAULT 0;

-- 8. Create listing_ratings table (for per-listing ratings)
CREATE TABLE IF NOT EXISTS listing_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Prevent duplicate rating per order
  UNIQUE(order_id, buyer_id)
);

-- 9. Create/replace get_farmer_brief_stats function
DROP FUNCTION IF EXISTS get_farmer_brief_stats(UUID);

CREATE FUNCTION get_farmer_brief_stats(p_farmer_id UUID)
RETURNS TABLE (
  completed_sales BIGINT,
  avg_rating NUMERIC,
  total_ratings BIGINT,
  member_since TIMESTAMPTZ
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM orders WHERE farmer_id = p_farmer_id AND status = 'completed')::BIGINT AS completed_sales,
    COALESCE((SELECT ROUND(AVG(rating)::NUMERIC, 1) FROM ratings WHERE farmer_id = p_farmer_id), 0) AS avg_rating,
    (SELECT COUNT(*) FROM ratings WHERE farmer_id = p_farmer_id)::BIGINT AS total_ratings,
    (SELECT created_at FROM profiles WHERE id = p_farmer_id) AS member_since;
END;
$$;

-- 10. Update get_farmer_stats function to include listing ratings
DROP FUNCTION IF EXISTS get_farmer_stats(UUID);

CREATE FUNCTION get_farmer_stats(p_farmer_id UUID)
RETURNS TABLE (
  avg_rating NUMERIC,
  total_ratings BIGINT,
  total_orders BIGINT,
  total_revenue NUMERIC,
  completed_sales BIGINT,
  avg_listing_rating NUMERIC,
  total_listing_ratings BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT ROUND(AVG(rating)::NUMERIC, 1) FROM ratings WHERE farmer_id = p_farmer_id), 0) AS avg_rating,
    (SELECT COUNT(*) FROM ratings WHERE farmer_id = p_farmer_id)::BIGINT AS total_ratings,
    (SELECT COUNT(*) FROM orders WHERE farmer_id = p_farmer_id)::BIGINT AS total_orders,
    COALESCE((SELECT SUM(farmer_earnings_kes) FROM orders WHERE farmer_id = p_farmer_id AND status = 'completed'), 0) AS total_revenue,
    (SELECT COUNT(*) FROM orders WHERE farmer_id = p_farmer_id AND status = 'completed')::BIGINT AS completed_sales,
    COALESCE((
      SELECT ROUND(AVG(lr.rating)::NUMERIC, 1)
      FROM listing_ratings lr
      JOIN listings l ON l.id = lr.listing_id
      WHERE l.farmer_id = p_farmer_id
    ), 0) AS avg_listing_rating,
    (SELECT COUNT(*) FROM listing_ratings lr JOIN listings l ON l.id = lr.listing_id WHERE l.farmer_id = p_farmer_id)::BIGINT AS total_listing_ratings;
END;
$$;

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vetting_forms_farmer_id ON vetting_forms(farmer_id);
CREATE INDEX IF NOT EXISTS idx_vetting_forms_status ON vetting_forms(status);
CREATE INDEX IF NOT EXISTS idx_listing_ratings_listing_id ON listing_ratings(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_ratings_order_id ON listing_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_platform_fee ON orders(platform_fee_kes);
CREATE INDEX IF NOT EXISTS idx_profiles_vetting_status ON profiles(vetting_status);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_received_at ON orders(received_at);

-- 12. Create storage buckets and policies for uploads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'listings') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('listings', 'listings', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'vetting') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('vetting', 'vetting', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']);
  END IF;
END $$;

DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;
DROP POLICY IF EXISTS "Farmers and admins can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update/delete listing images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete listing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view vetting documents" ON storage.objects;
DROP POLICY IF EXISTS "Farmers and admins can upload vetting documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update/delete vetting documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete vetting documents" ON storage.objects;

CREATE POLICY "Anyone can view listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listings');

CREATE POLICY "Farmers and admins can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listings'
    AND auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('farmer', 'admin'))
  );

CREATE POLICY "Owners can update/delete listing images"
  ON storage.objects FOR UPDATE USING (bucket_id = 'listings' AND owner = auth.uid());

CREATE POLICY "Owners can delete listing images"
  ON storage.objects FOR DELETE USING (bucket_id = 'listings' AND owner = auth.uid());

CREATE POLICY "Authenticated users can view vetting documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vetting' AND auth.role() = 'authenticated');

CREATE POLICY "Farmers and admins can upload vetting documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vetting'
    AND auth.role() = 'authenticated'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('farmer', 'admin'))
  );

CREATE POLICY "Owners can update/delete vetting documents"
  ON storage.objects FOR UPDATE USING (bucket_id = 'vetting' AND owner = auth.uid());

CREATE POLICY "Owners can delete vetting documents"
  ON storage.objects FOR DELETE USING (bucket_id = 'vetting' AND owner = auth.uid());

-- 13. Enable RLS on new tables
ALTER TABLE vetting_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_ratings ENABLE ROW LEVEL SECURITY;

-- Vetting forms: farmers can view own, admins can view all
CREATE POLICY "farmers_view_own_vetting" ON vetting_forms
  FOR SELECT USING (farmer_id = auth.uid());

CREATE POLICY "farmers_insert_own_vetting" ON vetting_forms
  FOR INSERT WITH CHECK (farmer_id = auth.uid());

CREATE POLICY "admins_view_all_vetting" ON vetting_forms
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_update_vetting" ON vetting_forms
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Listing ratings: buyers can insert/view, public can view
CREATE POLICY "anyone_view_listing_ratings" ON listing_ratings
  FOR SELECT USING (true);

CREATE POLICY "buyers_insert_listing_ratings" ON listing_ratings
  FOR INSERT WITH CHECK (
    buyer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('buyer', 'admin'))
  );

-- ============================================================
-- DONE. After running this:
-- 1. Restart your Next.js app
-- 2. Farmers must submit vetting form before creating listings
-- 3. Orders now include 5% platform fee
-- 4. Inventory reduces when orders are placed
-- 5. Two-way ratings (farmer + listing) after completed orders
-- 6. ESCROW: Payment held until BOTH farmer (deliver) & buyer (receive) confirm
-- ============================================================
