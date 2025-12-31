import { supabase } from '@/integrations/supabase/client';

/**
 * Cache for signed URLs to avoid regenerating them for the same image
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

// Cache expiry time (50 minutes - signed URLs last 60 minutes)
const CACHE_DURATION_MS = 50 * 60 * 1000;
// Signed URL expiry time (1 hour)
const SIGNED_URL_EXPIRY_SECONDS = 3600;

/**
 * Extract the storage path from a success story photo URL or path
 */
export function extractSuccessStoryPhotoPath(contentOrUrl: string): string | null {
  if (!contentOrUrl) return null;
  
  // If it's already just a path (no http)
  if (!contentOrUrl.startsWith('http')) {
    return contentOrUrl;
  }

  // Extract path from full Supabase Storage URL
  const match = contentOrUrl.match(/success-stories\/(.+?)(\?|$)/);
  return match ? match[1] : null;
}

/**
 * Get a signed URL for a success story photo
 * URLs are cached for 50 minutes (signed URLs last 60 minutes)
 */
export async function getSignedSuccessStoryPhotoUrl(photoPath: string): Promise<string | null> {
  if (!photoPath) return null;
  
  // Check cache first
  const cached = signedUrlCache.get(photoPath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  // Extract path if it's a full URL
  const path = extractSuccessStoryPhotoPath(photoPath);
  if (!path) {
    // If we can't extract a path, return the original
    return photoPath;
  }

  try {
    const { data, error } = await supabase.storage
      .from('success-stories')
      .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

    if (error || !data?.signedUrl) {
      console.error('Error creating signed URL for success story photo:', error);
      return null;
    }

    // Cache the URL
    signedUrlCache.set(photoPath, {
      url: data.signedUrl,
      expiresAt: Date.now() + CACHE_DURATION_MS
    });

    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
}

/**
 * Clear the signed URL cache (useful on logout)
 */
export function clearSuccessStoryPhotoUrlCache(): void {
  signedUrlCache.clear();
}

/**
 * Check if a URL is a success story photo URL that needs signing
 */
export function isSuccessStoryPhotoUrl(url: string): boolean {
  return url.includes('success-stories');
}
