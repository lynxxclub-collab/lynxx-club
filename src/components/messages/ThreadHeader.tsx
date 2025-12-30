import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, User, Video, MoreVertical, Info } from "lucide-react";

interface ThreadHeaderProps {
  recipientId: string;
  recipientName: string;
  recipientPhoto?: string;
  isOnline?: boolean;
  onBack: () => void;
  onVideoBooking?: () => void;
  showBack?: boolean;
  isSeeker?: boolean;
  readOnly?: boolean;
}

export default function ThreadHeader({
  recipientId,
  recipientName,
  recipientPhoto,
  isOnline,
  onBack,
  onVideoBooking,
  showBack = true,
  isSeeker = false,
  readOnly = false,
}: ThreadHeaderProps) {
  return (
    <div className="sticky top-0 z-10 p-4 border-b border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl safe-area-top">
      <div className="flex items-center gap-3">
        {/* Back button */}
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full text-white/60 hover:text-white hover:bg-white/5 active:bg-white/10 -ml-1"
          >
            <ChevronLeft className="w-7 h-7" />
          </Button>
        )}

        {/* Avatar and info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <Avatar className="w-11 h-11 border-2 border-white/10">
              <AvatarImage src={recipientPhoto} alt={recipientName} />
              <AvatarFallback className="bg-gradient-to-br from-rose-500/30 to-purple-500/30 text-white">
                {recipientName?.charAt(0) || <User className="w-5 h-5" />}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0a0f]" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base text-white truncate">{recipientName}</h3>
            {isOnline && <span className="text-sm text-green-400">Online</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {isSeeker && !readOnly && onVideoBooking && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onVideoBooking}
                  className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full text-primary hover:text-primary hover:bg-primary/10 active:bg-primary/20"
                >
                  <Video className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-[#1a1a1f] border-white/10 text-white">
                Book Video Date
              </TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full text-white/60 hover:text-white hover:bg-white/5 active:bg-white/10"
              >
                <MoreVertical className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[#1a1a1f] border-white/10">
              <DropdownMenuItem
                onClick={() => window.open(`/profile/${recipientId}`, "_blank")}
                className="text-white/80 focus:bg-white/5 focus:text-white"
              >
                <Info className="w-4 h-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              {isSeeker && !readOnly && onVideoBooking && (
                <DropdownMenuItem
                  onClick={onVideoBooking}
                  className="text-white/80 focus:bg-white/5 focus:text-white"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Book Video Date
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-400">
                Report User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
