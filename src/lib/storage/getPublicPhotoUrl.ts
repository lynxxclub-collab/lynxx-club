const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function getPublicPhotoUrl(path?: string | null) {
  if (!path) return null;

  // Prevent double-prefixing
  if (path.startsWith("http")) return path;

  return `${SUPABASE_URL}/storage/v1/object/public/profile-photos/${path}`;
}