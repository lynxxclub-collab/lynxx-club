import { supabase } from "@/integrations/supabase/client";

/**
 * Cache for signed URLs to avoid regenerating them for the same image
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

// Cache expiry time (50 minutes - signed URLs last 60 minutes)
const CACHE_DURATION_MS = 50 * 60 * 1000;
// Signed URL expiry time (1 hour)
const SIGNED_URL_EXPIRY_SECONDS = 3600;

/**
 * Extract the storage path from a chat image URL or path
 */
export function extractChatImagePath(contentOrUrl: string): string | null {
  // If it's already just a path (e.g., "user-id/timestamp.jpg" or "user-id/timestamp-random.jpg")
  if (!contentOrUrl.startsWith("http")) {
    return contentOrUrl;
  }

  // Extract path from full URL
  const match = contentOrUrl.match(/chat-images\/(.+?)(\?|$)/);
  return match ? match[1] : null;
}

/**
 * Check if a message content is a chat image URL/path
 * Matches patterns like:
 * - "chat-images/..." (full or partial URL)
 * - "uuid/1234567890.jpg" (original format)
 * - "uuid/1234567890-abc123.jpg" (new format with random string)
 */
export function isChatImageContent(content: string): boolean {
  // Check if it contains the bucket name
  if (content.includes("chat-images")) {
    return true;
  }

  // Match patterns:
  // - UUID (with hyphens) followed by /
  // - timestamp (digits)
  // - optional random string (-alphanumeric)
  // - file extension
  // Examples:
  //   "a1b2c3d4-e5f6-7890-abcd-ef1234567890/1703123456789.jpg"
  //   "a1b2c3d4-e5f6-7890-abcd-ef1234567890/1703123456789-x7k9m2.png"
  const chatImagePattern = /^[0-9a-f-]{36}\/\d+(-[a-z0-9]+)?\.\w+$/i;

  return chatImagePattern.test(content);
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
  if (!path) {
    console.warn("Could not extract path from:", imagePath);
    return null;
  }

  try {
    const { data, error } = await supabase.storage.from("chat-images").createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

    if (error) {
      console.error("Error creating signed URL:", error.message);
      return null;
    }

    if (!data?.signedUrl) {
      console.error("No signed URL returned for path:", path);
      return null;
    }

    // Cache the URL
    signedUrlCache.set(imagePath, {
      url: data.signedUrl,
      expiresAt: Date.now() + CACHE_DURATION_MS,
    });

    return data.signedUrl;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    return null;
  }
}

/**
 * Preload signed URLs for multiple images (useful for message lists)
 */
export async function preloadSignedUrls(imagePaths: string[]): Promise<void> {
  const uncachedPaths = imagePaths.filter((path) => {
    const cached = signedUrlCache.get(path);
    return !cached || cached.expiresAt <= Date.now();
  });

  await Promise.all(uncachedPaths.map(getSignedChatImageUrl));
}

/**
 * Clear the signed URL cache (useful on logout)
 */
export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
}
