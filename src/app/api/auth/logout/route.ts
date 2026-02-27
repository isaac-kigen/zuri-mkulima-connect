import { NextResponse } from "next/server";

import { destroySession } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({
      status: "success",
      message: "Logout successful.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
