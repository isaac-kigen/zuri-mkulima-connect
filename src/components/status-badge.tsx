import { Badge } from "@/components/ui/badge";
import type { ListingStatus, OrderStatus, PaymentStatus } from "@/lib/types";

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  if (status === "active") {
    return <Badge variant="success">Active</Badge>;
  }

  if (status === "inactive") {
    return <Badge variant="warning">Inactive</Badge>;
  }

  return <Badge variant="secondary">Archived</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  if (status === "pending") {
    return <Badge variant="warning">Pending</Badge>;
  }

  if (status === "accepted") {
    return <Badge variant="default">Accepted</Badge>;
  }

  if (status === "rejected") {
    return <Badge variant="danger">Rejected</Badge>;
  }

  if (status === "payment_pending") {
    return <Badge variant="warning">Payment Pending</Badge>;
  }

  if (status === "paid") {
    return <Badge variant="success">Paid</Badge>;
  }

  if (status === "completed") {
    return <Badge variant="success">Completed</Badge>;
  }

  return <Badge variant="secondary">Cancelled</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "success") {
    return <Badge variant="success">Success</Badge>;
  }

  if (status === "failed") {
    return <Badge variant="danger">Failed</Badge>;
  }

  if (status === "pending") {
    return <Badge variant="warning">Pending</Badge>;
  }

  if (status === "initiated") {
    return <Badge variant="default">Initiated</Badge>;
  }

  return <Badge variant="secondary">Reversed</Badge>;
}
