// ============================================================
// Zuri Mkulima Connect - Database Types
// ============================================================

export type UserRole = 'farmer' | 'buyer' | 'admin';
export type ListingStatus = 'active' | 'inactive' | 'archived';
export type OrderStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'paid' | 'completed';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type VettingStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  phone: string;
  county: string;
  avatar_url: string | null;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  // Vetting fields (farmers only)
  vetting_status: VettingStatus | null;
  vetting_submitted_at: string | null;
  vetting_reviewed_at: string | null;
  vetting_notes: string | null;
  vetting_document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  farmer_id: string;
  title: string;
  description: string;
  category: string;
  price_kes: number;
  quantity_available: number;
  unit: string;
  location_county: string;
  location_ward: string | null;
  status: ListingStatus;
  archive_reason: string | null;
  archived_at: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
  // Joined fields
  farmer?: Pick<Profile, 'id' | 'full_name' | 'county' | 'avatar_url' | 'vetting_status'>;
  farmer_stats?: FarmerBriefStats;
}

export interface ListingFilters {
  search?: string;
  category?: string;
  county?: string;
  min_price?: number;
  max_price?: number;
  status?: ListingStatus;
  sort?: 'latest' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
  farmer_id?: string; // for admin
}

export interface Order {
  id: string;
  listing_id: string;
  buyer_id: string;
  farmer_id: string;
  quantity: number;
  total_amount_kes: number;
  platform_fee_kes: number;
  farmer_earnings_kes: number;
  status: OrderStatus;
  buyer_notes: string | null;
  farmer_notes: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  // Escrow delivery confirmation
  paid_at: string | null;
  payment_deadline_at: string | null;
  payment_failed_count: number;
  delivered_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  listing?: Pick<Listing, 'id' | 'title' | 'photos' | 'unit' | 'price_kes' | 'quantity_available'>;
  buyer?: Pick<Profile, 'id' | 'full_name' | 'phone'>;
  farmer?: Pick<Profile, 'id' | 'full_name' | 'phone'>;
  payment?: Payment;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  order_id: string;
  payer_id: string;
  amount_kes: number;
  platform_fee_kes: number;
  phone_number: string;
  mpesa_receipt_number: string | null;
  merchant_request_id: string | null;
  checkout_request_id: string | null;
  status: PaymentStatus;
  daraja_response: any;
  callback_received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  buyer_id: string;
  listing_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  // Joined
  listing?: Listing;
}

export interface Rating {
  id: string;
  farmer_id: string;
  buyer_id: string;
  order_id: string | null;
  rating: number;
  review: string | null;
  created_at: string;
  // Joined
  buyer?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
  order?: Pick<Order, 'id' | 'listing_id'>;
}

/** Rating for a specific listing — part of the two-way rating system */
export interface ListingRating {
  id: string;
  listing_id: string;
  buyer_id: string;
  order_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  // Joined
  buyer?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

/** Brief stats shown on listing cards (buyer-facing) */
export interface FarmerBriefStats {
  completed_sales: number;
  avg_rating: number;
  total_ratings: number;
  member_since: string;
}

export interface FarmerStats {
  avg_rating: number;
  total_ratings: number;
  total_orders: number;
  total_revenue: number;
  completed_sales: number;
  // Listing-level ratings avg
  avg_listing_rating: number;
  total_listing_ratings: number;
}

export interface Complaint {
  id: string;
  filed_by: string;
  against_user_id: string | null;
  order_id: string | null;
  listing_id: string | null;
  subject: string;
  description: string;
  status: ComplaintStatus;
  admin_response: string | null;
  responded_by: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  filed_by_user?: Pick<Profile, 'id' | 'full_name' | 'role'>;
  against_user?: Pick<Profile, 'id' | 'full_name' | 'role'>;
  responded_by_user?: Pick<Profile, 'id' | 'full_name'>;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
  // Joined
  actor?: Pick<Profile, 'id' | 'full_name' | 'role'>;
}

export interface DashboardSnapshot {
  role: UserRole;
  active_listings?: number;
  pending_orders?: number;
  completed_orders?: number;
  total_revenue?: number;
  unread_notifications: number;
  // Admin extras
  total_users?: number;
  total_listings?: number;
  total_orders?: number;
  total_revenue_platform?: number;
  pending_vettings?: number;
}

export interface AdminReport {
  total_sales: number;
  sales_by_farmer: { farmer_id: string; farmer_name: string; total: number }[];
  sales_by_product: { listing_id: string; title: string; total: number }[];
  total_users: number;
  total_listings: number;
  total_orders: number;
  recent_payments: Payment[];
}

/** Vetting form submitted by farmers before they can list */
export interface VettingForm {
  id: string;
  farmer_id: string;
  farm_name: string;
  farm_location_county: string;
  farm_location_ward: string;
  farm_size_acres: number | null;
  products_grown: string;
  years_farming: number | null;
  phone_number: string;
  id_number: string | null;
  supporting_document_url: string | null;
  status: VettingStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  farmer?: Pick<Profile, 'id' | 'full_name' | 'county' | 'phone'>;
  reviewer?: Pick<Profile, 'id' | 'full_name'> | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
