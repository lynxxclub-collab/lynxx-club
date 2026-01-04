import { useState, useEffect } from "react";
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

/**
 * Hook to get a signed profile URL
 */
export function useSignedProfileUrl(
  bucket: string,
  photoPath: string | null | undefined,
  expiresIn = 60 * 60
): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoPath) {
      setSignedUrl(null);
      return;
    }

    resolveProfileImage(bucket, photoPath, expiresIn).then(setSignedUrl);
  }, [bucket, photoPath, expiresIn]);

  return signedUrl;
}

interface ProfileImageProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  bucket?: string;
  fallback?: React.ReactNode;
}

/**
 * Component that displays a profile image with signed URL support
 */
export function ProfileImage({
  src,
  alt = "Profile",
  className = "",
  bucket = "profile-photos",
  fallback,
}: ProfileImageProps) {
  const signedUrl = useSignedProfileUrl(bucket, src);

  if (!signedUrl && fallback) {
    return <>{fallback}</>;
  }

  if (!signedUrl) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <span className="text-muted-foreground text-xs">No image</span>
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
    />
  );
}
