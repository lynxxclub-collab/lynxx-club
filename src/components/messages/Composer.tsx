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
      <div className="sticky bottom-0 z-10 p-4 border-t border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl pb-safe">
        <div className="flex items-center justify-center gap-3 text-white/50 py-2">
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
    <div className="sticky bottom-0 z-10 p-3 border-t border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl pb-safe">
      {/* Credit info for seekers */}
      {isSeeker && (
        <div className="flex items-center justify-between text-xs text-white/50 mb-2 px-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Gem className="w-3 h-3 text-purple-400" />
              {textCost} / text
            </span>
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-primary" />
              {imageCost} / image
            </span>
          </div>
          <span className="flex items-center gap-1 font-medium">
            Balance:
            <span className={cn(creditBalance < 20 ? "text-amber-400" : "text-white")}>
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
              className="h-10 w-10 rounded-full shrink-0 text-white/40 hover:text-primary hover:bg-primary/10"
            >
              {uploadingImage ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5" />
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
                className="h-10 w-10 rounded-full shrink-0 text-white/40 hover:text-amber-400 hover:bg-amber-500/10"
              >
                <Gift className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-[#1a1a1f] border-white/10 text-white">
              Send a gift
            </TooltipContent>
          </Tooltip>
        )}

        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="pr-12 h-11 rounded-full bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/20 focus:ring-0 focus:ring-offset-0"
            disabled={sending || uploadingImage}
          />
          <Button
            onClick={onSend}
            disabled={!value.trim() || sending || uploadingImage}
            size="icon"
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full",
              "bg-gradient-to-r from-primary to-rose-500 hover:opacity-90",
              "disabled:opacity-50",
              "transition-all duration-200",
              value.trim() && "scale-100",
              !value.trim() && "scale-90 opacity-50",
            )}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
