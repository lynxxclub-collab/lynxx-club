import { supabase } from "@/integrations/supabase/client";

/**
 * Supports:
 * - Full URLs already stored (https://...)
 * - Lovable/Supabase storage paths like: "userId/file.png" or "profile-photos/userId/file.png"
 * - Returns a signed URL for private buckets
 */
export async function resolveProfileImage(
  bucket: string,
  photoPath: string | null,
  expiresIn = 60 * 60
): Promise<string | null> {
  if (!photoPath) return null;

  // If already a full URL, just use it.
  if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
    return photoPath;
  }

  // Clean common accidental prefixes
  const cleaned = photoPath
    .replace(/^\/+/, "")
    .replace(`${bucket}/`, "")
    .replace(`storage/${bucket}/`, "");

  // Create a signed URL (works for PRIVATE buckets)
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(cleaned, expiresIn);

  if (error) {
    console.warn("resolveProfileImage error:", error.message);
    return null;
  }

  return data?.signedUrl ?? null;
}