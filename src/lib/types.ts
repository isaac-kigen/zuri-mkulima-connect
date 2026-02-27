export type Role = "farmer" | "buyer" | "admin";

export type ListingStatus = "active" | "inactive" | "archived";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "payment_pending"
  | "paid"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "initiated"
  | "pending"
  | "success"
  | "failed"
  | "reversed";

export type NotificationType = "order" | "payment" | "system";

export interface PublicUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  phone: string | null;
  county: string | null;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListingRecord {
  id: string;
  farmerId: string;
  productName: string;
  category: string | null;
  quantity: number;
  unit: string;
  priceKes: number;
  location: string;
  description: string | null;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListingPhotoRecord {
  id: string;
  listingId: string;
  storagePath: string;
  createdAt: string;
}

export interface OrderRecord {
  id: string;
  listingId: string;
  buyerId: string;
  farmerId: string;
  quantity: number;
  unitPriceKes: number;
  totalKes: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  amountKes: number;
  status: PaymentStatus;
  merchantRequestId: string | null;
  checkoutRequestId: string | null;
  mpesaReceiptNumber: string | null;
  transactionDate: string | null;
  phoneNumber: string | null;
  rawCallback: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface AdminAuditLogRecord {
  id: string;
  adminId: string;
  action: string;
  targetTable: string;
  targetId: string;
  note: string | null;
  createdAt: string;
}

export interface ListingWithFarmer extends ListingRecord {
  farmer: PublicUser;
  photos: ListingPhotoRecord[];
}

export interface OrderWithRelations extends OrderRecord {
  listing: ListingRecord;
  buyer: PublicUser;
  farmer: PublicUser;
  payment: PaymentRecord | null;
}

export interface DashboardSnapshot {
  activeListings: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenueKes: number;
  unreadNotifications: number;
}
