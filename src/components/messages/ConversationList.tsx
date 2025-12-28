import { useMemo } from "react";
import { Conversation } from "@/hooks/useMessages";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileImage } from "@/components/ui/ProfileImage";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { MessageSquare, Image, Video, FileText, Mic } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

type MessageType = "text" | "image" | "video" | "audio" | "file";

interface MessagePreviewConfig {
  icon: React.ReactNode;
  label: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SKELETON_COUNT = 5;

const MESSAGE_TYPE_CONFIG: Record<MessageType, MessagePreviewConfig> = {
  image: { icon: <Image className="w-3.5 h-3.5" />, label: "Photo" },
  video: { icon: <Video className="w-3.5 h-3.5" />, label: "Video" },
  audio: { icon: <Mic className="w-3.5 h-3.5" />, label: "Voice message" },
  file: { icon: <FileText className="w-3.5 h-3.5" />, label: "File" },
  text: { icon: null, label: "" },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getInitials = (name: string | undefined): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatRelativeTime = (date: string): string => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "";
  }
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const ConversationSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-3 w-3/4" />
    </div>
  </div>
);

const LoadingState = () => (
  <div className="p-2 space-y-1" role="status" aria-label="Loading conversations">
    {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
      <ConversationSkeleton key={i} />
    ))}
    <span className="sr-only">Loading conversations...</span>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
      <MessageSquare className="w-8 h-8 text-primary" />
    </div>
    <h3 className="font-semibold text-lg mb-1">No conversations yet</h3>
    <p className="text-sm text-muted-foreground max-w-[200px]">
      Start a conversation by messaging someone from the Browse page
    </p>
  </div>
);

interface MessagePreviewProps {
  content: string | null | undefined;
  messageType: string | undefined;
}

const MessagePreview = ({ content, messageType }: MessagePreviewProps) => {
  const config = MESSAGE_TYPE_CONFIG[messageType as MessageType];

  if (config && messageType !== "text") {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {config.icon}
        <span>{config.label}</span>
      </span>
    );
  }

  return <span className="text-muted-foreground">{content || "No messages yet"}</span>;
};

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
}

const ConversationItem = ({ conversation, isSelected, onSelect }: ConversationItemProps) => {
  const otherUser = conversation.other_user;
  const lastMessage = conversation.last_message;

  const displayName = otherUser?.name || "Unknown User";
  const profilePhoto = otherUser?.profile_photos?.[0];
  const relativeTime = formatRelativeTime(conversation.last_message_at);
  const hasUnread = false; // TODO: Implement unread count from conversation data

  return (
    <button
      onClick={onSelect}
      aria-selected={isSelected}
      aria-label={`Conversation with ${displayName}`}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isSelected
          ? "bg-primary/15 border border-primary/30 shadow-sm"
          : "hover:bg-secondary/70 border border-transparent",
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar
          className={cn(
            "w-12 h-12 border-2 overflow-hidden transition-colors",
            isSelected ? "border-primary/50" : "border-border",
          )}
        >
          {profilePhoto ? (
            <ProfileImage
              src={profilePhoto}
              alt={displayName}
              className="w-full h-full object-cover"
              fallbackClassName="w-full h-full"
            />
          ) : (
            <AvatarFallback className="bg-secondary text-muted-foreground font-medium">
              {getInitials(displayName)}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Online indicator - can be enabled when online status is available */}
        {/* <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" /> */}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className={cn("font-semibold truncate", hasUnread && "text-foreground", isSelected && "text-primary")}>
            {displayName}
          </span>
          <span
            className={cn(
              "text-xs whitespace-nowrap flex-shrink-0",
              hasUnread ? "text-primary font-medium" : "text-muted-foreground",
            )}
          >
            {relativeTime}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm truncate flex-1",
              hasUnread ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            <MessagePreview content={lastMessage?.content} messageType={lastMessage?.message_type} />
          </p>

          {/* Unread badge - enable when unread count is available */}
          {hasUnread && (
            <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
              {/* {unreadCount} */}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ConversationList({ conversations, loading, selectedId, onSelect }: ConversationListProps) {
  // Sort conversations by last message time (most recent first)
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const dateA = new Date(a.last_message_at).getTime();
      const dateB = new Date(b.last_message_at).getTime();
      return dateB - dateA;
    });
  }, [conversations]);

  if (loading) {
    return <LoadingState />;
  }

  if (conversations.length === 0) {
    return <EmptyState />;
  }

  return (
    <ScrollArea className="h-full">
      <nav className="p-2 space-y-1" role="listbox" aria-label="Conversations">
        {sortedConversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedId === conversation.id}
            onSelect={() => onSelect(conversation)}
          />
        ))}
      </nav>
    </ScrollArea>
  );
}
