import { useEffect, useMemo, useRef, useState } from "react";
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
 * Displays chat images safely:
 * - If content is a normal URL: use it directly
 * - If content is a private bucket path: fetch a signed URL
 * Includes caching + unmount safety.
 */
export default function ChatImage({
  content,
  alt = "Shared image",
  className,
  onClick,
}: ChatImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Simple in-memory cache so we don’t re-sign the same file repeatedly
  const signedUrlCache = useRef<Map<string, string>>(new Map());

  const isSignedContent = useMemo(() => isChatImageContent(content), [content]);

  useEffect(() => {
    let cancelled = false;

    async function resolveUrl() {
      setStatus("loading");
      setImageUrl(null);

      // Direct URL or plain content → just display it
      if (!isSignedContent) {
        setImageUrl(content);
        setStatus("ready");
        return;
      }

      // Cache hit
      const cached = signedUrlCache.current.get(content);
      if (cached) {
        setImageUrl(cached);
        setStatus("ready");
        return;
      }

      try {
        const signed = await getSignedChatImageUrl(content);

        if (cancelled) return;

        if (!signed) {
          setStatus("error");
          return;
        }

        signedUrlCache.current.set(content, signed);
        setImageUrl(signed);
        setStatus("ready");
      } catch (e) {
        if (!cancelled) setStatus("error");
      }
    }

    resolveUrl();

    return () => {
      cancelled = true;
    };
  }, [content, isSignedContent]);

  const handleImageError = () => {
    setStatus("error");
  };

  const handleClick = () => {
    if (onClick) return onClick();
    if (imageUrl) window.open(imageUrl, "_blank", "noopener,noreferrer");
  };

  if (status === "loading") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl w-48 h-32",
          "bg-white/[0.02] border border-white/10",
          className
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

  if (status === "error" || !imageUrl) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl w-48 h-32",
          "bg-white/[0.02] border border-white/10",
          className
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
    <div className={cn("relative group inline-block", className)}>
      <img
        src={imageUrl}
        alt={alt}
        className={cn(
          "rounded-xl max-w-full w-auto max-h-[250px] sm:max-h-[320px] object-contain cursor-pointer",
          "transition-all duration-300",
          "hover:brightness-110 active:brightness-95",
          "ring-1 ring-white/10 hover:ring-purple-500/30"
        )}
        onClick={handleClick}
        onError={handleImageError}
        loading="lazy"
        decoding="async"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}