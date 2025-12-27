import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getSignedChatImageUrl, isChatImageContent } from '@/lib/chatImageUrls';
import { cn } from '@/lib/utils';

interface ChatImageProps {
  content: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Component that handles displaying chat images with signed URLs
 * Automatically fetches signed URLs for private bucket images
 */
export default function ChatImage({ content, alt = "Shared image", className, onClick }: ChatImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      setLoading(true);
      setError(false);

      // If content doesn't look like a chat image path, use it directly
      if (!isChatImageContent(content)) {
        setImageUrl(content);
        setLoading(false);
        return;
      }

      const signedUrl = await getSignedChatImageUrl(content);
      if (signedUrl) {
        setImageUrl(signedUrl);
      } else {
        setError(true);
      }
      setLoading(false);
    };

    fetchSignedUrl();
  }, [content]);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg w-48 h-32", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg w-48 h-32 text-muted-foreground text-sm", className)}>
        Image unavailable
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={cn(
        "rounded-lg max-w-xs max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity",
        className
      )}
      onClick={onClick || (() => window.open(imageUrl, '_blank'))}
      onError={() => setError(true)}
    />
  );
}
