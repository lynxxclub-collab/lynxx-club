import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a usable URL for a profile photo stored in Supabase Storage.
 * - If value is already a full URL => returns as-is.
 * - If stored as "profile-photos/xxx.jpg" or "xxx.jpg" => signs it.
 */
export async function getSignedProfilePhotoUrl(
  photoPath: string | null | undefined,
  expiresInSeconds: number = 60 * 60 // 1 hour
): Promise<string | null> {
  if (!photoPath) return null;

  // If it's already a full URL, don't touch it
  if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
    return photoPath;
  }

  // Normalize to just the object key inside the bucket
  const objectKey = photoPath.replace(/^profile-photos\//, "");

  const { data, error } = await supabase.storage
    .from("profile-photos")
    .createSignedUrl(objectKey, expiresInSeconds);

  if (error) {
    console.error("createSignedUrl error:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}