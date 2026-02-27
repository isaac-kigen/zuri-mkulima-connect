import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { suspendUser } from "@/lib/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await requireUser(["admin"]);
    const { id } = await context.params;
    const body = await request.json();

    const user = await suspendUser({
      adminId: admin.id,
      targetUserId: id,
      suspend: Boolean(body.suspend),
      note: body.note,
    });

    return NextResponse.json({
      status: "success",
      message: body.suspend ? "User suspended." : "User activated.",
      data: user,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
