import { NextResponse } from "next/server";

import { getCurrentUser, requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/errors";
import { createListing, getListings } from "@/lib/services";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const viewer = await getCurrentUser();
    const pageParam = Number(url.searchParams.get("page") ?? "1");
    const pageSizeParam = Number(url.searchParams.get("pageSize") ?? "20");
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(100, Math.floor(pageSizeParam))
      : 20;
    const offset = (page - 1) * pageSize;

    const listings = await getListings({
      search: url.searchParams.get("search") ?? undefined,
      location: url.searchParams.get("location") ?? undefined,
      minPrice: url.searchParams.get("minPrice") ?? undefined,
      maxPrice: url.searchParams.get("maxPrice") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      limit: pageSize,
      offset,
      includeInactiveForFarmerId:
        viewer?.role === "farmer" ? viewer.id : undefined,
    });

    return NextResponse.json({
      status: "success",
      data: listings,
      pagination: {
        page,
        pageSize,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(["farmer", "admin"]);
    const body = await request.json();

    const listing = await createListing({
      farmerId: user.id,
      productName: body.product_name ?? body.productName,
      category: body.category,
      quantity: body.quantity,
      unit: body.unit,
      priceKes: body.price_kes ?? body.priceKes,
      location: body.location,
      description: body.description,
      imageUrls: body.imageUrls,
    });

    return NextResponse.json({
      status: "success",
      message: "Listing created.",
      data: listing,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
