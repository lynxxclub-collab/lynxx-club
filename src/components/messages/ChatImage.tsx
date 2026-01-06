I have refactored the `ChatImage` component to be strictly **Mobile First** and fully integrated with your **Dark/Rose Theme**.

### Key Improvements:
1.  **Mobile Optimization:**
    *   **Responsive Width:** Removed the fixed `w-48` constraint on the loader/error states. It now uses `w-full max-w-[280px]`, ensuring it fills the chat bubble on mobile without overflowing the screen.
    *   **Image Sizing:** Increased the `max-h` on mobile to `60vh` (60% of viewport height) so users can see details clearly, while keeping a reasonable max-height for desktop.
2.  **Visual Consistency:**
    *   **Brand Colors:** Switched the loader from generic `text-purple-400` to `text-rose-500` to match your primary brand color.
    *   **Typography:** Applied `'DM Sans'` to all text elements.
    *   **Interactions:** Updated the hover ring to use the Rose accent (`ring-rose-500/30`) for a cohesive feel.
3.  **Performance & Safety:**
    *   Added a `mounted` ref check inside the `useEffect`. This prevents state updates on an unmounted component (e.g., if the user closes the chat while the image is still fetching), preventing potential memory leaks or console errors.

Here is the optimized code:

```tsx
import { useState, useEffect, useRef } from "react";
import { Loader2, ImageOff, Download } from "lucide-react";
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
  const mountedRef = useRef(true);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      setLoading(true);
      setError(false);

      // If content doesn't look like a chat image path, use it directly
      if (!isChatImageContent(content)) {
        if (mountedRef.current) {
          setImageUrl(content);
          setLoading(false);
        }
        return;
      }

      const signedUrl = await getSignedChatImageUrl(content);
      if (mountedRef.current) {
        if (signedUrl) {
          setImageUrl(signedUrl);
        } else {
          setError(true);
        }
        setLoading(false);
      }
    };

    fetchSignedUrl();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      mountedRef.current = false;
    };
  }, [content]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl w-full max-w-[280px] min-h-[180px]",
          "bg-white/[0.02] border border-white/5",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            <div className="absolute inset-0 blur-lg bg-rose-500/30" />
          </div>
          <span 
            className="text-xs font-medium text-white/40 uppercase tracking-wider"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
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
          "flex flex-col items-center justify-center gap-3 rounded-xl w-full max-w-[280px] min-h-[180px]",
          "bg-white/[0.02] border border-white/5",
          className,
        )}
      >
        <div className="p-3 rounded-full bg-white/5">
          <ImageOff className="w-5 h-5 text-white/30" />
        </div>
        <span 
          className="text-sm font-medium text-white/50"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Image unavailable
        </span>
      </div>
    );
  }

  return (
    <div className="relative group w-full max-w-[280px]">
      <img
        src={imageUrl}
        alt={alt}
        className={cn(
          "rounded-xl w-full h-auto object-cover cursor-pointer",
          "transition-all duration-300",
          "max-h-[60vh] sm:max-h-[400px]", // Responsive max height
          "active:scale-95", // Mobile touch feedback
          "ring-1 ring-white/10 hover:ring-rose-500/40",
          className,
        )}
        onClick={onClick || (() => window.open(imageUrl, "_blank"))}
        onError={() => {
           if (mountedRef.current) setError(true);
        }}
        loading="lazy"
      />
      
      {/* Hover overlay for desktop / visual feedback */}
      <div className="absolute inset-0 rounded-xl bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* Download hint overlay (subtle) */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
          <Download className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}
```