import { useState, useEffect } from "react";
import { Loader2, ImageOff } from "lucide-react";
import { getSignedChatImageUrl, isChatImageContent } from "@/lib/chatImageUrls";
import { cn } from "@/lib/utils";

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
      <div
        className={cn(
          "flex items-center justify-center rounded-xl w-48 h-32",
          "bg-white/[0.02] border border-white/10",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-xs text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Loading...
          </span>
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl w-48 h-32",
          "bg-white/[0.02] border border-white/10",
          className,
        )}
      >
        <ImageOff className="w-6 h-6 text-white/30" />
        <span className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Image unavailable
        </span>
      </div>
    );
  }

  return (
    <div className="relative group">
      <img
        src={imageUrl}
        alt={alt}
        className={cn(
          "rounded-xl max-w-xs max-h-64 object-contain cursor-pointer",
          "transition-all duration-300",
          "hover:brightness-110",
          "ring-1 ring-white/10 hover:ring-purple-500/30",
          className,
        )}
        onClick={onClick || (() => window.open(imageUrl, "_blank"))}
        onError={() => setError(true)}
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}
