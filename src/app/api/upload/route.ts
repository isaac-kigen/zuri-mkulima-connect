import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/roles";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireAuth();
    const supabase = await createClient();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "listings";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Max 5 MB" },
        { status: 400 }
      );
    }

    // Generate unique filename: userId_timestamp_random.extension
    const ext = file.name.split(".").pop() || "jpg";
    const uniqueName = `${profile.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `${bucket}/${uniqueName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      data: { url: urlData.publicUrl, path: filePath },
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
