import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { markNotificationRead } from "@/lib/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser(["buyer", "farmer", "admin"]);
    const { id } = await context.params;

    const updated = await markNotificationRead({
      userId: user.id,
      notificationId: id,
    });

    return NextResponse.json({
      status: "success",
      message: "Notification marked as read.",
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
