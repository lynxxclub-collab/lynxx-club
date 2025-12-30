/**
 * Shared React Query configuration for optimized caching and reduced RLS queries.
 * 
 * staleTime: How long data is considered fresh (won't refetch)
 * gcTime: How long unused data stays in cache (garbage collection time)
 */

// Default cache times for different data types
export const CACHE_TIMES = {
  // Frequently changing data (30 seconds - 1 minute stale)
  REALTIME: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  },
  
  // Semi-static data (5 minutes stale)
  STANDARD: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  },
  
  // Rarely changing data (15 minutes stale)
  STATIC: {
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  },
  
  // User's own data (2 minutes stale)
  USER_DATA: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  },
} as const;

// Debounce helper for cascading fetches
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

// Check if we're on a specific page (for conditional subscriptions)
export function isOnPage(pathPatterns: string[]): boolean {
  const currentPath = window.location.pathname;
  return pathPatterns.some(pattern => {
    if (pattern.endsWith('*')) {
      return currentPath.startsWith(pattern.slice(0, -1));
    }
    return currentPath === pattern;
  });
}
