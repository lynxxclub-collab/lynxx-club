import { supabase } from "@/integrations/supabase/client";

/**
 * Normalizes whatever is stored in DB into a clean storage path,
 * then returns a public URL.
 *
 * Works if you store:
 * - "userId/avatar.png"
 * - "profile-photos/userId/avatar.png"
 * - a full Supabase public URL
 */
export function getProfilePhotoPublicUrl(input: string | null | undefined): string | null {
  if (!input) return null;

  // If DB already has a full URL, just return it.
  if (input.startsWith("http://") || input.startsWith("https://")) return input;

  // Remove accidental leading slashes
  let path = input.replace(/^\/+/, "");

  // If someone stored "profile-photos/xxx", strip the bucket prefix
  if (path.startsWith("profile-photos/")) {
    path = path.replace(/^profile-photos\//, "");
  }

  const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);

  // If bucket is public + file exists, this will be a valid URL.
  return data?.publicUrl ?? null;
}

/**
 * Picks the "primary" photo from profile_photos (text[]).
 */
export function getPrimaryProfilePhotoPath(profilePhotos: string[] | null | undefined): string | null {
  if (!profilePhotos || profilePhotos.length === 0) return null;

  // Find first truthy string
  const first = profilePhotos.find((p) => typeof p === "string" && p.trim().length > 0);
  return first ?? null;
}