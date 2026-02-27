import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { createOrder, getOrdersForUser } from "@/lib/services";

export async function GET() {
  try {
    const user = await requireUser(["buyer", "farmer", "admin"]);
    const orders = await getOrdersForUser({
      userId: user.id,
      role: user.role,
    });

    return NextResponse.json({
      status: "success",
      data: orders,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["buyer"]);
    const body = await request.json();

    const order = await createOrder({
      buyerId: user.id,
      listingId: body.listing_id ?? body.listingId,
      quantity: body.quantity,
    });

    return NextResponse.json({
      status: "success",
      message: "Order created.",
      data: order,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
