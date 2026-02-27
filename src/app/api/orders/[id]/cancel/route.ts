import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { updateOrderStatus } from "@/lib/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser(["buyer", "admin"]);
    const { id } = await context.params;

    const order = await updateOrderStatus({
      orderId: id,
      actorId: user.id,
      action: "cancel",
    });

    return NextResponse.json({
      status: "success",
      message: "Order cancelled.",
      data: order,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
