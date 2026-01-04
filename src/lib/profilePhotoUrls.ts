import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "profile-photos";

// Picks the newest image by filename (timestamps work perfectly)
function pickNewest(files: any[]) {
  const valid = (files || []).filter(
    (f) => f?.name && !f.name.endsWith("/")
  );
  valid.sort((a, b) => String(b.name).localeCompare(String(a.name)));
  return valid[0] ?? null;
}

export async function resolveProfilePhotoUrl(opts: {
  supabase: SupabaseClient;
  value: string | null | undefined;
}): Promise<string | null> {
  const { supabase, value } = opts;

  if (!value) return null;

  // Already a full URL
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  // Helper for public URL
  const publicUrlFor = (path: string) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  // If value already includes filename
  if (value.includes("/")) {
    return publicUrlFor(value);
  }

  // Otherwise value is a folder UUID → list folder and pick newest image
  const folder = value;

  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: 50 });

  if (error || !files || files.length === 0) return null;

  const newest = pickNewest(files);
  if (!newest?.name) return null;

  return publicUrlFor(`${folder}/${newest.name}`);
}

/**
 * Get a signed URL for a profile photo path
 * Used by VideoDateCard and other components
 */
export async function getSignedProfilePhotoUrl(
  photoPath: string | null | undefined,
  expiresIn = 60 * 60
): Promise<string | null> {
  if (!photoPath) return null;

  // If already a full URL, just use it
  if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
    return photoPath;
  }

  // Clean common accidental prefixes
  const cleaned = photoPath
    .replace(/^\/+/, "")
    .replace(`${BUCKET}/`, "")
    .replace(`storage/${BUCKET}/`, "");

  // Create a signed URL (works for PRIVATE buckets)
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(cleaned, expiresIn);

  if (error) {
    console.warn("getSignedProfilePhotoUrl error:", error.message);
    return null;
  }

  return data?.signedUrl ?? null;
}