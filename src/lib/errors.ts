import { NextResponse } from "next/server";

export class AppError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    options?: { status?: number; code?: string; details?: Record<string, unknown> },
  ) {
    super(message);
    this.name = "AppError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "BAD_REQUEST";
    this.details = options?.details;
  }
}

export function assertOrThrow(
  condition: unknown,
  message: string,
  options?: { status?: number; code?: string; details?: Record<string, unknown> },
): asserts condition {
  if (!condition) {
    throw new AppError(message, options);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        status: "error",
        code: error.code,
        message: error.message,
        details: error.details ?? {},
      },
      { status: error.status },
    );
  }

  console.error("Unhandled API error", error);
  return NextResponse.json(
    {
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error.",
      details: {},
    },
    { status: 500 },
  );
}
