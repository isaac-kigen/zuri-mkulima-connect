-- ============================================================
-- Zuri Mkulima Connect - Complete Database Schema (Supabase/PostgreSQL)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('farmer', 'buyer', 'admin');
CREATE TYPE listing_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'paid');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'buyer',
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  county TEXT NOT NULL,
  avatar_url TEXT,
  is_suspended BOOLEAN DEFAULT false,
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- LISTINGS (Marketplace products)
-- ============================================================
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price_kes NUMERIC(12,2) NOT NULL CHECK (price_kes > 0),
  quantity_available NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'kg',
  location_county TEXT NOT NULL,
  location_ward TEXT,
  status listing_status NOT NULL DEFAULT 'active',
  archive_reason TEXT,
  archived_at TIMESTAMPTZ,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_listings_farmer ON listings(farmer_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_county ON listings(location_county);
CREATE INDEX idx_listings_price ON listings(price_kes);
CREATE INDEX idx_listings_created ON listings(created_at DESC);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  total_amount_kes NUMERIC(12,2) NOT NULL CHECK (total_amount_kes > 0),
  platform_fee_kes NUMERIC(12,2) DEFAULT 0,
  farmer_earnings_kes NUMERIC(12,2) DEFAULT 0,
  status order_status NOT NULL DEFAULT 'pending',
  buyer_notes TEXT,
  farmer_notes TEXT,
  rejection_reason TEXT,
  cancellation_reason TEXT,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  payment_deadline_at TIMESTAMPTZ,
  payment_failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_farmer ON orders(farmer_id);
CREATE INDEX idx_orders_listing ON orders(listing_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ============================================================
-- PAYMENTS (M-Pesa Daraja)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payer_id UUID NOT NULL REFERENCES profiles(id),
  amount_kes NUMERIC(12,2) NOT NULL,
  phone_number TEXT NOT NULL,
  mpesa_receipt_number TEXT,
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  daraja_response JSONB,
  callback_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_receipt ON payments(mpesa_receipt_number);

-- ============================================================
-- SHOPPING CART
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(buyer_id, listing_id)
);

CREATE INDEX idx_cart_buyer ON cart_items(buyer_id);

-- ============================================================
-- RATINGS & REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ratings_farmer ON ratings(farmer_id);
CREATE INDEX idx_ratings_buyer ON ratings(buyer_id);
CREATE UNIQUE INDEX idx_ratings_unique ON ratings(buyer_id, order_id) WHERE order_id IS NOT NULL;

-- ============================================================
-- COMPLAINTS
-- ============================================================
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filed_by UUID NOT NULL REFERENCES profiles(id),
  against_user_id UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  listing_id UUID REFERENCES listings(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status complaint_status NOT NULL DEFAULT 'open',
  admin_response TEXT,
  responded_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_complaints_filed_by ON complaints(filed_by);
CREATE INDEX idx_complaints_status ON complaints(status);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_entity ON audit_log(entity_type);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ============================================================
-- STORAGE BUCKETS & POLICIES
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('listings', 'listings', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('vetting', 'vetting', true, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
ON CONFLICT (id) DO NOTHING;

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

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, edit only their own
CREATE POLICY "Profiles are viewable by all authenticated users"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Listings: visible based on status and role
CREATE POLICY "Active listings are viewable by all"
  ON listings FOR SELECT USING (status = 'active' OR auth.uid() = farmer_id OR 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Farmers can create listings"
  ON listings FOR INSERT WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can update own listings"
  ON listings FOR UPDATE USING (auth.uid() = farmer_id);

CREATE POLICY "Admins can update any listing"
  ON listings FOR UPDATE USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Orders
CREATE POLICY "Orders viewable by participants and admins"
  ON orders FOR SELECT USING (
    auth.uid() = buyer_id OR auth.uid() = farmer_id OR 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Buyers can create orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update own orders"
  ON orders FOR UPDATE USING (
    auth.uid() = buyer_id OR auth.uid() = farmer_id OR 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Payments
CREATE POLICY "Payments viewable by owner and admins"
  ON payments FOR SELECT USING (
    auth.uid() = payer_id OR 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Buyers can create payments"
  ON payments FOR INSERT WITH CHECK (auth.uid() = payer_id);

-- Cart
CREATE POLICY "Cart items belong to buyer"
  ON cart_items FOR ALL USING (auth.uid() = buyer_id);

-- Ratings
CREATE POLICY "Ratings viewable by all authenticated users"
  ON ratings FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Buyers can create ratings"
  ON ratings FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Complaints
CREATE POLICY "Complaints viewable by owner and admins"
  ON complaints FOR SELECT USING (
    auth.uid() = filed_by OR 
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can file complaints"
  ON complaints FOR INSERT WITH CHECK (auth.uid() = filed_by);

CREATE POLICY "Admins can update complaints"
  ON complaints FOR UPDATE USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Notifications: users can only read their own, but authenticated users can insert (for server-side notification creation)
CREATE POLICY "Notifications belong to user"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Audit log
CREATE POLICY "Audit log viewable by admins only"
  ON audit_log FOR SELECT USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT WITH CHECK (true);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER;

-- Get farmer stats
CREATE OR REPLACE FUNCTION get_farmer_stats(p_farmer_id UUID)
RETURNS TABLE(
  avg_rating NUMERIC(3,2),
  total_ratings BIGINT,
  total_orders BIGINT,
  total_revenue NUMERIC(14,2)
) AS $$
  SELECT
    COALESCE(AVG(r.rating)::NUMERIC(3,2), 0) as avg_rating,
    COUNT(r.id) as total_ratings,
    COUNT(DISTINCT o.id) as total_orders,
    COALESCE(SUM(o.total_amount_kes), 0) as total_revenue
  FROM profiles p
  LEFT JOIN ratings r ON r.farmer_id = p.id
  LEFT JOIN orders o ON o.farmer_id = p.id AND o.status = 'completed'
  WHERE p.id = p_farmer_id
  GROUP BY p.id;
$$ LANGUAGE sql SECURITY DEFINER;
