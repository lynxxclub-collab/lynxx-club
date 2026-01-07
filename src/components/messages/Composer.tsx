import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Send,
  Image as ImageIcon,
  Gift,
  Loader2,
  Lock,
  Gem,
} from "lucide-react";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGiftClick?: () => void;
  sending: boolean;
  uploadingImage: boolean;
  isSeeker: boolean;
  readOnly?: boolean;
  creditBalance?: number;
  textCost?: number;
  imageCost?: number;
}

export default function Composer({
  value,
  onChange,
  onSend,
  onImageUpload,
  onGiftClick,
  sending,
  uploadingImage,
  isSeeker,
  readOnly = false,
  creditBalance = 0,
  textCost = 5,
  imageCost = 10,
}: ComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  if (readOnly) {
    return (
      <div 
        className="sticky bottom-0 z-10 p-4 border-t border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl pb-safe"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="flex items-center justify-center gap-3 text-white/40 py-2">
          <Lock className="w-5 h-5" />
          <div className="text-center">
            <p className="font-medium text-white/60">Alumni Access - Read Only</p>
            <p className="text-sm">You can view but not send messages</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="sticky bottom-0 z-10 p-3 sm:p-4 border-t border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl pb-safe"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Credit info for seekers */}
      {isSeeker && (
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-white/50 mb-3 px-1">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1.5">
              <Gem className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
              {textCost} / text
            </span>
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 text-rose-400" />
              {imageCost} / img
            </span>
          </div>
          <span className="flex items-center gap-1.5 font-bold">
            Balance:
            <span className={cn(creditBalance < 20 ? "text-amber-400" : "text-white/80")}>
              {creditBalance?.toLocaleString() || 0}
            </span>
          </span>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onImageUpload}
          accept="image/*"
          className="hidden"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploadingImage}
              className="h-11 sm:h-12 w-11 sm:w-12 min-w-[44px] min-h-[44px] rounded-full shrink-0 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all"
            >
              {uploadingImage ? (
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-[#1a1a1f] border-white/10 text-white">
            Send image ({imageCost} credits)
          </TooltipContent>
        </Tooltip>

        {isSeeker && onGiftClick && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onGiftClick}
                disabled={sending || uploadingImage}
                className="h-11 sm:h-12 w-11 sm:w-12 min-w-[44px] min-h-[44px] rounded-full shrink-0 text-white/40 hover:text-amber-400 hover:bg-amber-500/10 active:scale-95 transition-all"
              >
                <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-[#1a1a1f] border-white/10 text-white">
              Send a gift
            </TooltipContent>
          </Tooltip>
        )}

        <div className="flex-1 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-pink-500/10 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none blur-md" />
          
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            inputMode="text"
            className="relative h-12 sm:h-[52px] text-base sm:text-lg rounded-full bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-rose-500/30 focus-visible:border-rose-500/50 focus-visible:bg-[#0a0a0f] transition-all"
            disabled={sending || uploadingImage}
          />
          
          <Button
            onClick={onSend}
            disabled={!value.trim() || sending || uploadingImage}
            size="icon"
            className={cn(
              "absolute right-1.5 top-1/2 -translate-y-1/2 h-10 sm:h-11 w-10 sm:w-11 min-w-[40px] min-h-[40px] rounded-full",
              "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-500/20",
              "disabled:opacity-50 disabled:shadow-none",
              "transition-all duration-200",
              value.trim() && "scale-100",
              !value.trim() && "scale-90 opacity-50",
            )}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
