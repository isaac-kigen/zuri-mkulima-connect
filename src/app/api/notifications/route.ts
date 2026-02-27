import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { getNotificationsForUser } from "@/lib/services";

export async function GET() {
  try {
    const user = await requireUser(["buyer", "farmer", "admin"]);
    const notifications = await getNotificationsForUser(user.id);

    return NextResponse.json({
      status: "success",
      data: notifications,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
