import { NextResponse } from "next/server";

import { destroySession } from "@/lib/auth";

export async function POST(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login?success=You%20have%20been%20logged%20out.", request.url));
}
