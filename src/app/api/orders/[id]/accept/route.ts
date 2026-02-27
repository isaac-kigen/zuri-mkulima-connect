import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { updateOrderStatus } from "@/lib/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser(["farmer", "admin"]);
    const { id } = await context.params;

    const order = await updateOrderStatus({
      orderId: id,
      actorId: user.id,
      action: "accept",
    });

    return NextResponse.json({
      status: "success",
      message: "Order accepted.",
      data: order,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
