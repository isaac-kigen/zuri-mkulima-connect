import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { getAllUsers } from "@/lib/services";

export async function GET() {
  try {
    const admin = await requireUser(["admin"]);
    const users = await getAllUsers(admin.id);

    return NextResponse.json({
      status: "success",
      data: users,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
