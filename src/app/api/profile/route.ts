import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { updateProfile } from "@/lib/services";

export async function GET() {
  try {
    const user = await requireUser();

    return NextResponse.json({
      status: "success",
      data: user,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();

    const updated = await updateProfile({
      userId: user.id,
      fullName: body.fullName,
      phone: body.phone,
      county: body.county,
    });

    return NextResponse.json({
      status: "success",
      message: "Profile updated successfully.",
      data: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
