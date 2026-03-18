"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { AppError } from "@/lib/errors";
import { createSession, destroySession, getCurrentUser, validateCredentials } from "@/lib/auth";
import {
  createListing,
  createOrder,
  deleteListing,
  initiatePayment,
  markNotificationRead,
  registerUser,
  setListingStatus,
  suspendUser,
  updateListing,
  updateOrderStatus,
  updateProfile,
} from "@/lib/services";
import type { ListingStatus } from "@/lib/types";

function redirectWithMessage(
  path: string,
  type: "error" | "success",
  message: string,
): never {
  const [pathname, rawQuery] = path.split("?");
  const query = new URLSearchParams(rawQuery ?? "");
  query.delete(type === "error" ? "success" : "error");
  query.set(type, message);
  const qs = query.toString();
  redirect(qs ? `${pathname}?${qs}` : pathname);
}

function toErrorMessage(error: unknown) {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function handleActionError(path: string, error: unknown): never {
  if (isRedirectError(error)) {
    throw error;
  }

  redirectWithMessage(path, "error", toErrorMessage(error));
}

export async function loginAction(formData: FormData) {
  const email = `${formData.get("email") ?? ""}`;
  const password = `${formData.get("password") ?? ""}`;

  try {
    const result = await validateCredentials(email, password);
    if (!result) {
      redirectWithMessage("/login", "error", "Invalid email or password.");
    }

    if (result.user.isSuspended) {
      redirectWithMessage("/login", "error", "Your account is currently suspended.");
    }

    await createSession(result.session);
    redirectWithMessage("/dashboard", "success", "Welcome back.");
  } catch (error) {
    handleActionError("/login", error);
  }
}

export async function registerAction(formData: FormData) {
  const fullName = `${formData.get("fullName") ?? ""}`;
  const email = `${formData.get("email") ?? ""}`;
  const password = `${formData.get("password") ?? ""}`;
  const phone = `${formData.get("phone") ?? ""}`;
  const county = `${formData.get("county") ?? ""}`;
  const role = `${formData.get("role") ?? "buyer"}`;

  try {
    if (!["buyer", "farmer"].includes(role)) {
      redirectWithMessage("/register", "error", "Invalid account role selected.");
    }

    const result = await registerUser({
      fullName,
      email,
      password,
      role: role as "buyer" | "farmer",
      phone,
      county,
    });

    await createSession(result.session);
    redirectWithMessage("/dashboard", "success", "Account created successfully.");
  } catch (error) {
    handleActionError("/register", error);
  }
}

export async function logoutAction() {
  await destroySession();
  redirectWithMessage("/login", "success", "You have been logged out.");
}

export async function updateProfileAction(formData: FormData) {
  const fullName = `${formData.get("fullName") ?? ""}`;
  const phone = `${formData.get("phone") ?? ""}`;
  const county = `${formData.get("county") ?? ""}`;

  try {
    const user = await getCurrentUser();
    if (!user) {
      redirectWithMessage("/login", "error", "Please login to continue.");
    }

    await updateProfile({
      userId: user.id,
      fullName,
      phone,
      county,
    });

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    redirectWithMessage("/profile", "success", "Profile updated successfully.");
  } catch (error) {
    handleActionError("/profile", error);
  }
}

export async function createListingAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      redirectWithMessage("/login", "error", "Please login to continue.");
    }

    if (user.role !== "farmer" && user.role !== "admin") {
      redirectWithMessage("/listings", "error", "Only farmers can create listings.");
    }

    const images = `${formData.get("imageUrls") ?? ""}`
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    await createListing({
      farmerId: user.id,
      productName: `${formData.get("productName") ?? ""}`,
      category: `${formData.get("category") ?? ""}`,
      quantity: `${formData.get("quantity") ?? ""}`,
      unit: `${formData.get("unit") ?? ""}`,
      priceKes: `${formData.get("priceKes") ?? ""}`,
      location: `${formData.get("location") ?? ""}`,
      description: `${formData.get("description") ?? ""}`,
      imageUrls: images,
    });

    revalidatePath("/listings");
    revalidatePath("/marketplace");
    revalidatePath("/dashboard");
    redirectWithMessage("/listings", "success", "Listing created successfully.");
  } catch (error) {
    handleActionError("/listings", error);
  }
}

export async function updateListingAction(formData: FormData) {
  const listingId = `${formData.get("listingId") ?? ""}`;

  try {
    const user = await getCurrentUser();
    if (!user) {
      redirectWithMessage("/login", "error", "Please login to continue.");
    }

    await updateListing({
      listingId,
      actorId: user.id,
      productName: `${formData.get("productName") ?? ""}`,
      category: `${formData.get("category") ?? ""}`,
      quantity: `${formData.get("quantity") ?? ""}`,
      unit: `${formData.get("unit") ?? ""}`,
      priceKes: `${formData.get("priceKes") ?? ""}`,
      location: `${formData.get("location") ?? ""}`,
      description: `${formData.get("description") ?? ""}`,
      status: `${formData.get("status") ?? "active"}` as ListingStatus,
    });

    revalidatePath("/listings");
    revalidatePath("/marketplace");
    revalidatePath("/admin");
    redirectWithMessage("/listings", "success", "Listing updated successfully.");
  } catch (error) {
    handleActionError("/listings", error);
  }
}

export async function setListingStatusAction(formData: FormData) {
  const listingId = `${formData.get("listingId") ?? ""}`;
  const status = `${formData.get("status") ?? "inactive"}` as ListingStatus;

  try {
    const user = await getCurrentUser();
    if (!user) {
      redirectWithMessage("/login", "error", "Please login to continue.");
    }

    await setListingStatus({
      listingId,
      actorId: user.id,
      status,
    });

    revalidatePath("/listings");
    revalidatePath("/marketplace");
    revalidatePath("/admin");
    redirectWithMessage("/listings", "success", "Listing status updated.");
  } catch (error) {
    handleActionError("/listings", error);
  }
}

export async function deleteListingAction(formData: FormData) {
  const listingId = `${formData.get("listingId") ?? ""}`;

  try {
    const user = await getCurrentUser();
    if (!user) {
      redirectWithMessage("/login", "error", "Please login to continue.");
    }

    await deleteListing({
      listingId,
      actorId: user.id,
      reason: `${formData.get("reason") ?? ""}`,
    });

    revalidatePath("/listings");
    revalidatePath("/marketplace");
    revalidatePath("/admin");
    redirectWithMessage("/listings", "success", "Listing archived.");
  } catch (error) {
    handleActionError("/listings", error);
  }
}

export async function placeOrderAction(formData: FormData) {
  const listingId = `${formData.get("listingId") ?? ""}`;
  const quantity = `${formData.get("quantity") ?? ""}`;

  try {
    const user = await getCurrentUser();
    if (!user) {
      redirectWithMessage("/login", "error", "Please login to place an order.");
    }

    if (user.role !== "buyer") {
      redirectWithMessage("/marketplace", "error", "Only buyers can place orders.");
    }

    await createOrder({
      buyerId: user.id,
      listingId,
      quantity,
    });

    revalidatePath("/marketplace");
    revalidatePath("/orders");
    revalidatePath("/dashboard");
    redirectWithMessage("/marketplace", "success", "Order placed successfully.");
  } catch (error) {
    handleActionError("/marketplace", error);
  }
}

export async function acceptOrderAction(formData: FormData) {
  await updateOrderAction(formData, "accept");
}

export async function rejectOrderAction(formData: FormData) {
  await updateOrderAction(formData, "reject");
}

export async function cancelOrderAction(formData: FormData) {
  await updateOrderAction(formData, "cancel");
}

async function updateOrderAction(
  formData: FormData,
  action: "accept" | "reject" | "cancel",
) {
  const orderId = `${formData.get("orderId") ?? ""}`;

  try {
    const user = await getCurrentUser();
    if (!user) {
      redirectWithMessage("/login", "error", "Please login to continue.");
    }

    await updateOrderStatus({
      orderId,
      actorId: user.id,
      action,
    });

    revalidatePath("/orders");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");

    const message =
      action === "accept"
        ? "Order accepted."
        : action === "reject"
          ? "Order rejected."
          : "Order cancelled.";

    redirectWithMessage("/orders", "success", message);
  } catch (error) {
    handleActionError("/orders", error);
  }
}

export async function initiatePaymentAction(formData: FormData) {
  const orderId = `${formData.get("orderId") ?? ""}`;
  const phoneNumber = `${formData.get("phoneNumber") ?? ""}`;

  try {
    const user = await getCurrentUser();
    if (!user) {
      redirectWithMessage("/login", "error", "Please login to continue.");
    }

    if (user.role !== "buyer") {
      redirectWithMessage("/orders", "error", "Only buyers can initiate payment.");
    }

    await initiatePayment({
      orderId,
      buyerId: user.id,
      phoneNumber,
    });

    revalidatePath("/orders");
    revalidatePath("/dashboard");
    redirectWithMessage("/orders", "success", "Payment request initiated. Await callback confirmation.");
  } catch (error) {
    handleActionError("/orders", error);
  }
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = `${formData.get("notificationId") ?? ""}`;

  try {
    const user = await getCurrentUser();
    if (!user) {
      redirectWithMessage("/login", "error", "Please login to continue.");
    }

    await markNotificationRead({
      userId: user.id,
      notificationId,
    });

    revalidatePath("/notifications");
    revalidatePath("/dashboard");
    redirectWithMessage("/notifications", "success", "Notification marked as read.");
  } catch (error) {
    handleActionError("/notifications", error);
  }
}

export async function suspendUserAction(formData: FormData) {
  const targetUserId = `${formData.get("targetUserId") ?? ""}`;
  const suspend = `${formData.get("suspend") ?? "true"}` === "true";
  const note = `${formData.get("note") ?? ""}`;

  try {
    const user = await getCurrentUser();
    if (!user) {
      redirectWithMessage("/login", "error", "Please login to continue.");
    }

    await suspendUser({
      adminId: user.id,
      targetUserId,
      suspend,
      note,
    });

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    redirectWithMessage(
      "/admin",
      "success",
      suspend ? "User suspended successfully." : "User activated successfully.",
    );
  } catch (error) {
    handleActionError("/admin", error);
  }
}

export async function archiveListingByAdminAction(formData: FormData) {
  const listingId = `${formData.get("listingId") ?? ""}`;
  const reason = `${formData.get("reason") ?? "Moderation action"}`;

  try {
    const user = await getCurrentUser();
    if (!user) {
      redirectWithMessage("/login", "error", "Please login to continue.");
    }

    await deleteListing({
      listingId,
      actorId: user.id,
      reason,
    });

    revalidatePath("/admin");
    revalidatePath("/marketplace");
    revalidatePath("/listings");
    redirectWithMessage("/admin", "success", "Listing archived by admin.");
  } catch (error) {
    handleActionError("/admin", error);
  }
}
