import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Normalize whatever is stored in DB into a storage object path.
 * Accepts:
 * - full URLs
 * - "profile-photos/userId/file.jpg"
 * - "userId/file.jpg"
 * - "/profile-photos/userId/file.jpg"
 */
export function normalizeStoragePath(bucket: string, input: string): string {
  let p = input.trim();

  // Remove leading slashes
  p = p.replace(/^\/+/, "");

  // Strip accidental "profile-photos/" prefix if present
  if (p.startsWith(`${bucket}/`)) p = p.slice(bucket.length + 1);

  // Strip accidental "storage/profile-photos/" prefix if present
  if (p.startsWith(`storage/${bucket}/`)) p = p.slice(`storage/${bucket}/`.length);

  return p;
}

/**
 * Resolve profile image URL:
 * 1) If already https://, return as-is
 * 2) Try public URL (best if bucket is Public)
 * 3) Fallback to signed URL (for Private buckets)
 */
export async function resolveProfileImageUrl(
  bucket: string,
  photoPath: string | null,
  expiresIn = 60 * 60
): Promise<string | null> {
  if (!photoPath) return null;

  // If full URL already stored, use it
  if (photoPath.startsWith("http://") || photoPath.startsWith("https://")) {
    return photoPath;
  }

  const objectPath = normalizeStoragePath(bucket, photoPath);

  // ✅ Public buckets: build a public URL (no auth required)
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  if (pub?.publicUrl) return pub.publicUrl;

  // 🔒 Private buckets: fallback to signed URL (auth may be required)
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, expiresIn);
  if (error) {
    console.warn("resolveProfileImageUrl error:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Hook: returns a resolved URL (public or signed)
 */
export function useProfileImageUrl(
  bucket: string,
  photoPath: string | null | undefined,
  expiresIn = 60 * 60
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!photoPath) {
      setUrl(null);
      return;
    }

    resolveProfileImageUrl(bucket, photoPath, expiresIn).then((result) => {
      if (!cancelled) setUrl(result);
    });

    return () => {
      cancelled = true;
    };
  }, [bucket, photoPath, expiresIn]);

  return url;
}

interface ProfileImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  bucket?: string;
  expiresIn?: number;
  fallback?: ReactNode;
}

/**
 * Component: displays profile image with public/signed URL support
 */
export function ProfileImage({
  src,
  alt = "Profile",
  className = "",
  bucket = "profile-photos",
  expiresIn = 60 * 60,
  fallback,
}: ProfileImageProps) {
  const url = useProfileImageUrl(bucket, src, expiresIn);

  if (!url) {
    return (
      <>
        {fallback ?? (
          <div className={`bg-white/5 border border-white/10 flex items-center justify-center ${className}`}>
            <span className="text-white/40 text-xs">No image</span>
          </div>
        )}
      </>
    );
  }

  return <img src={url} alt={alt} className={className} loading="lazy" decoding="async" />;
}