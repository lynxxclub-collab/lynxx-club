import { supabase } from '@/integrations/supabase/client';

/**
 * Cache for signed URLs to avoid regenerating them for the same image
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Extract the storage path from a chat image URL or path
 */
export function extractChatImagePath(contentOrUrl: string): string | null {
  // If it's already just a path (e.g., "user-id/timestamp.jpg")
  if (!contentOrUrl.startsWith('http')) {
    return contentOrUrl;
  }

  // Extract path from full URL
  const match = contentOrUrl.match(/chat-images\/(.+?)(\?|$)/);
  return match ? match[1] : null;
}

/**
 * Check if a message content is a chat image URL/path
 */
export function isChatImageContent(content: string): boolean {
  return content.includes('chat-images') || 
    /^[0-9a-f-]+\/\d+\.\w+$/.test(content); // UUID/timestamp.ext pattern
}

/**
 * Get a signed URL for a chat image
 * URLs are cached for 50 minutes (signed URLs last 60 minutes)
 */
export async function getSignedChatImageUrl(imagePath: string): Promise<string | null> {
  // Check cache first
  const cached = signedUrlCache.get(imagePath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  // Extract path if it's a full URL
  const path = extractChatImagePath(imagePath);
  if (!path) return null;

  try {
    const { data, error } = await supabase.storage
      .from('chat-images')
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error || !data?.signedUrl) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    // Cache the URL for 50 minutes
    signedUrlCache.set(imagePath, {
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
 * Clear the signed URL cache (useful on logout)
 */
export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
}
