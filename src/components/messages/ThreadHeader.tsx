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
import { cn } from "@/lib/utils";

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
    <div className="sticky top-0 z-10 p-3 border-b border-border bg-background/95 backdrop-blur-sm safe-area-top">
      <div className="flex items-center gap-2">
        {/* Back button */}
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted -ml-1"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        )}

        {/* Avatar and info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage src={recipientPhoto} alt={recipientName} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                {recipientName?.charAt(0) || <User className="w-4 h-4" />}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base text-foreground truncate">{recipientName}</h3>
            {isOnline && <span className="text-xs text-green-400">Online</span>}
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
                  className="h-10 w-10 rounded-full text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Video className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-popover border-border text-popover-foreground">
                Book Video Date
              </TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
              <DropdownMenuItem
                onClick={() => window.open(`/profile/${recipientId}`, "_blank")}
                className="text-popover-foreground focus:bg-muted"
              >
                <Info className="w-4 h-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              {isSeeker && !readOnly && onVideoBooking && (
                <DropdownMenuItem
                  onClick={onVideoBooking}
                  className="text-popover-foreground focus:bg-muted"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Book Video Date
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10">
                Report User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
