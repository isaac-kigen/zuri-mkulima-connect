import { NextResponse } from "next/server";

import { getCurrentUser, requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { deleteListing, getListingById, updateListing } from "@/lib/services";
import type { ListingStatus } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const viewer = await getCurrentUser();
    const listing = await getListingById(id);

    if (listing.status !== "active" && viewer?.id !== listing.farmerId && viewer?.role !== "admin") {
      return NextResponse.json(
        {
          status: "error",
          code: "FORBIDDEN",
          message: "Listing is not publicly visible.",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      status: "success",
      data: listing,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(["farmer", "admin"]);
    const { id } = await context.params;
    const body = await request.json();

    const listing = await updateListing({
      listingId: id,
      actorId: user.id,
      productName: body.product_name ?? body.productName,
      category: body.category,
      quantity: body.quantity,
      unit: body.unit,
      priceKes: body.price_kes ?? body.priceKes,
      location: body.location,
      description: body.description,
      status: body.status as ListingStatus | undefined,
    });

    return NextResponse.json({
      status: "success",
      message: "Listing updated.",
      data: listing,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireUser(["farmer", "admin"]);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    await deleteListing({
      listingId: id,
      actorId: user.id,
      reason: body.reason,
    });

    return NextResponse.json({
      status: "success",
      message: "Listing archived.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
