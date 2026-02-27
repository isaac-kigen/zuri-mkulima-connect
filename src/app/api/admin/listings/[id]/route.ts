import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { deleteListing } from "@/lib/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const admin = await requireUser(["admin"]);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    await deleteListing({
      listingId: id,
      actorId: admin.id,
      reason: body.reason,
    });

    return NextResponse.json({
      status: "success",
      message: "Listing archived by admin.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
