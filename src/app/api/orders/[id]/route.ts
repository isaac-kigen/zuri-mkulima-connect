import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { AppError, handleApiError } from "@/lib/errors";
import { getOrderById } from "@/lib/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser(["buyer", "farmer", "admin"]);
    const { id } = await context.params;

    const order = await getOrderById(id);

    const canView =
      user.role === "admin" ||
      order.buyerId === user.id ||
      order.farmerId === user.id;

    if (!canView) {
      throw new AppError("Not allowed to view this order.", {
        status: 403,
        code: "FORBIDDEN",
      });
    }

    return NextResponse.json({
      status: "success",
      data: order,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
