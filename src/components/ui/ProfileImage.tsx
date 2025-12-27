import { useState, useEffect } from 'react';
import { getSignedProfilePhotoUrl } from '@/lib/profilePhotoUrls';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from './skeleton';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  showFallback?: boolean;
}

/**
 * ProfileImage component that handles signed URLs for authenticated users
 * and shows placeholder for unauthenticated users
 */
export function ProfileImage({ 
  src, 
  alt, 
  className = '', 
  fallbackClassName = '',
  showFallback = true 
}: ProfileImageProps) {
  const { user } = useAuth();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      setLoading(true);
      setError(false);

      // If no src or user not authenticated, show placeholder
      if (!src || !user) {
        setSignedUrl(null);
        setLoading(false);
        return;
      }

      // If it's a placeholder or external URL, use directly
      if (src.startsWith('/') || src.startsWith('data:')) {
        setSignedUrl(src);
        setLoading(false);
        return;
      }

      try {
        const url = await getSignedProfilePhotoUrl(src);
        if (!cancelled) {
          setSignedUrl(url);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [src, user]);

  if (loading) {
    return <Skeleton className={cn('bg-muted', className)} />;
  }

  if (error || !signedUrl) {
    if (!showFallback) return null;
    
    return (
      <div className={cn(
        'flex items-center justify-center bg-gradient-to-br from-primary/20 via-secondary/30 to-muted',
        className,
        fallbackClassName
      )}>
        <User className="w-1/3 h-1/3 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

/**
 * Hook to get a signed URL for a profile photo
 */
export function useSignedProfileUrl(photoUrl: string | null | undefined) {
  const { user } = useAuth();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUrl() {
      setLoading(true);

      if (!photoUrl || !user) {
        setSignedUrl(null);
        setLoading(false);
        return;
      }

      // If it's a placeholder or external URL, use directly
      if (photoUrl.startsWith('/') || photoUrl.startsWith('data:')) {
        setSignedUrl(photoUrl);
        setLoading(false);
        return;
      }

      try {
        const url = await getSignedProfilePhotoUrl(photoUrl);
        if (!cancelled) {
          setSignedUrl(url);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSignedUrl(null);
          setLoading(false);
        }
      }
    }

    loadUrl();

    return () => {
      cancelled = true;
    };
  }, [photoUrl, user]);

  return { signedUrl, loading };
}
