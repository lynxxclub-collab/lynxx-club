import { supabase } from '@/integrations/supabase/client';

/**
 * Cache for signed URLs to avoid regenerating them for the same image
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Extract the storage path from a profile photo URL
 */
export function extractProfilePhotoPath(url: string): string | null {
  if (!url) return null;
  
  // If it's already just a path (no http)
  if (!url.startsWith('http')) {
    return url;
  }

  // Extract path from full Supabase Storage URL
  // Pattern: .../storage/v1/object/public/profile-photos/...
  const publicMatch = url.match(/profile-photos\/(.+?)(\?|$)/);
  if (publicMatch) return publicMatch[1];
  
  // Pattern for signed URLs
  const signedMatch = url.match(/profile-photos\/(.+?)(\?token=|$)/);
  if (signedMatch) return signedMatch[1];
  
  return null;
}

/**
 * Get a signed URL for a profile photo
 * URLs are cached for 50 minutes (signed URLs last 60 minutes)
 */
export async function getSignedProfilePhotoUrl(photoUrl: string): Promise<string | null> {
  if (!photoUrl) return null;
  
  // Check cache first
  const cached = signedUrlCache.get(photoUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  // Extract path from URL
  const path = extractProfilePhotoPath(photoUrl);
  if (!path) {
    // If we can't extract a path, return the original URL
    // (might be an external URL or placeholder)
    return photoUrl;
  }

  try {
    const { data, error } = await supabase.storage
      .from('profile-photos')
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error || !data?.signedUrl) {
      console.error('Error creating signed URL for profile photo:', { path, photoUrl, error });
      return null;
    }

    // Cache the URL for 50 minutes
    signedUrlCache.set(photoUrl, {
      url: data.signedUrl,
      expiresAt: Date.now() + 50 * 60 * 1000
    });

    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
}

/**
 * Get signed URLs for multiple profile photos
 */
export async function getSignedProfilePhotoUrls(photoUrls: string[]): Promise<(string | null)[]> {
  return Promise.all(photoUrls.map(url => getSignedProfilePhotoUrl(url)));
}

/**
 * Clear the signed URL cache (useful on logout)
 */
export function clearProfilePhotoUrlCache(): void {
  signedUrlCache.clear();
}

/**
 * Check if a URL is a profile photo URL that needs signing
 */
export function isProfilePhotoUrl(url: string): boolean {
  return url.includes('profile-photos') || url.includes('success-stories');
}
