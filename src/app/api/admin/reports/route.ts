import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { getAdminReports } from "@/lib/services";

export async function GET() {
  try {
    const admin = await requireUser(["admin"]);
    const reports = await getAdminReports(admin.id);

    return NextResponse.json({
      status: "success",
      data: reports,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
