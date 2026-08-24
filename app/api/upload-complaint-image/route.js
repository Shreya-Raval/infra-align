import { adminAuth } from "@/lib/firebaseAdmin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "complaint-images";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

function sanitizeFileName(rawName, index) {
  const name = rawName || `image-${index}`;
  const ext = name.includes(".")
    ? name.slice(name.lastIndexOf(".")).toLowerCase().replace(/[^a-z0-9.]/g, "")
    : "";
  const baseName =
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `image-${index}`;
  return `${baseName}${ext || ".jpg"}`;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return Response.json(
        { error: "Unauthorized: Missing or invalid authorization token." },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1]?.trim();
    if (!idToken) {
      return Response.json(
        { error: "Unauthorized: Token missing." },
        { status: 401 }
      );
    }

    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (tokenErr) {
      console.error("Token verification failed:", tokenErr);
      return Response.json(
        { error: "Unauthorized: Invalid or expired token." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") || formData.get("file");
    const complaintId = String(formData.get("complaintId") || "").trim();
    const indexRaw = formData.get("index");
    const index = Number.isFinite(Number(indexRaw)) ? Number(indexRaw) : 0;

    if (!imageFile || typeof imageFile === "string") {
      return Response.json({ error: "No image file provided." }, { status: 400 });
    }

    if (!complaintId || !/^[a-zA-Z0-9_-]+$/.test(complaintId)) {
      return Response.json({ error: "Invalid complaintId." }, { status: 400 });
    }

    if (imageFile.size > MAX_BYTES) {
      return Response.json(
        { error: "Image exceeds 8MB size limit." },
        { status: 400 }
      );
    }

    const safeName = sanitizeFileName(imageFile.name, index);
    const filePath = `${complaintId}/${index}-${safeName}`;
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const contentType = imageFile.type || "image/jpeg";

    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase admin upload failed:", uploadError);
      return Response.json(
        { error: uploadError.message || "Failed to upload image." },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    return Response.json({
      publicUrl: urlData?.publicUrl || null,
      path: filePath,
    });
  } catch (err) {
    console.error("upload-complaint-image error:", err);
    const message =
      err?.message?.includes("SUPABASE_SERVICE_ROLE_KEY")
        ? "Server misconfigured: add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart the dev server."
        : err?.message || "Unexpected upload error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
