import { redirect } from "next/navigation";

import {
  acceptOrderAction,
  cancelOrderAction,
  initiatePaymentAction,
  rejectOrderAction,
} from "@/app/actions";
import { ActionSubmitButton } from "@/components/action-submit-button";
import { FeedbackBanner } from "@/components/feedback-banner";
import { OrdersLiveRefresh } from "@/components/orders-live-refresh";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/services";
import { formatDate, formatKes } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function canCancelOrder(status: string) {
  return ["pending", "accepted", "payment_pending"].includes(status);
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const success = typeof params.success === "string" ? params.success : undefined;

  const orders = await getOrdersForUser({
    userId: user.id,
    role: user.role,
  });
  const hasPendingPayment = orders.some((order) => order.status === "payment_pending");

  return (
    <div className="space-y-6">
      <OrdersLiveRefresh enabled={hasPendingPayment} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Orders</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Track lifecycle from pending approval to payment confirmation.
        </p>
      </div>

      <FeedbackBanner error={error} success={success} />

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
            No orders found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => {
            const buyerOwnsOrder = order.buyerId === user.id;
            const farmerOwnsOrder = order.farmerId === user.id;

            return (
              <Card key={order.id}>
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">{order.listing.productName}</CardTitle>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <CardDescription>
                    Order ID: {order.id.slice(0, 8)} · Created {formatDate(order.createdAt)}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid gap-3 rounded-xl bg-[var(--surface-muted)] p-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Buyer</p>
                      <p className="text-sm font-medium">{order.buyer.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Farmer</p>
                      <p className="text-sm font-medium">{order.farmer.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Quantity</p>
                      <p className="text-sm font-medium">{order.quantity} {order.listing.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Total</p>
                      <p className="text-sm font-semibold">{formatKes(order.totalKes)}</p>
                    </div>
                  </div>

                  {order.payment && (
                    <div className="space-y-2 rounded-xl border border-[var(--border)] p-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Payment</p>
                        <PaymentStatusBadge status={order.payment.status} />
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Checkout ID: {order.payment.checkoutRequestId ?? "N/A"}
                      </p>
                      {order.payment.mpesaReceiptNumber && (
                        <Badge variant="success">Receipt: {order.payment.mpesaReceiptNumber}</Badge>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                    {(farmerOwnsOrder || user.role === "admin") && order.status === "pending" && (
                      <>
                        <form action={acceptOrderAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <ActionSubmitButton size="sm" pendingText="Accepting..." pendingDescription="Confirming the order for payment.">
                            Accept
                          </ActionSubmitButton>
                        </form>
                        <form action={rejectOrderAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <ActionSubmitButton size="sm" variant="destructive" pendingText="Rejecting..." pendingDescription="Declining the order and notifying the buyer.">
                            Reject
                          </ActionSubmitButton>
                        </form>
                      </>
                    )}

                    {(buyerOwnsOrder || user.role === "admin") && canCancelOrder(order.status) && (
                      <form action={cancelOrderAction}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <ActionSubmitButton size="sm" variant="outline" pendingText="Cancelling..." pendingDescription="Cancelling this order safely.">
                          Cancel
                        </ActionSubmitButton>
                      </form>
                    )}
                  </div>

                  {buyerOwnsOrder && order.status === "accepted" && (
                    <form action={initiatePaymentAction} className="grid gap-2 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <input type="hidden" name="orderId" value={order.id} />
                      <div className="space-y-1">
                        <Label htmlFor={`phone-${order.id}`}>M-Pesa Phone Number</Label>
                        <Input
                          id={`phone-${order.id}`}
                          name="phoneNumber"
                          defaultValue={user.phone ?? "2547"}
                          required
                          placeholder="2547XXXXXXXX"
                        />
                      </div>
                      <ActionSubmitButton pendingText="Sending STK push..." pendingDescription="Prompting M-Pesa on the buyer's phone and creating the payment record.">
                        Initiate Payment
                      </ActionSubmitButton>
                    </form>
                  )}

                  {buyerOwnsOrder && order.status === "payment_pending" && order.payment?.checkoutRequestId && (
                    <div className="space-y-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-3">
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Payment request sent. Complete the M-Pesa prompt on your phone and wait for Daraja callback confirmation.
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        This page refreshes automatically while payment is pending.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
