import { Conversation } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { User, Image as ImageIcon, Check, CheckCheck, MessageSquare } from "lucide-react";

interface ConversationListViewProps {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  isUserOnline?: (userId: string) => boolean;
}

export default function ConversationListView({ 
  conversations, 
  loading, 
  selectedId, 
  onSelect, 
  isUserOnline 
}: ConversationListViewProps) {
  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 px-4 py-4 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-white">
          <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
            <MessageSquare className="w-5 h-5 sm:w-4.5 sm:h-4.5 text-rose-400" />
          </div>
          Messages
        </h1>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto relative">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-14 h-14 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-28 bg-white/5" />
                  <Skeleton className="h-4 w-44 bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mb-4 border border-white/5">
              <MessageSquare className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="font-semibold text-white mb-1">No conversations yet</h3>
            <p className="text-sm text-white/50">Start a conversation by messaging someone from the browse page</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => {
              const isSelected = selectedId === conv.id;
              const lastMessage = conv.last_message;
              // Check if the last message is unread AND sent by the other person to the current user
              const isUnread = lastMessage && !lastMessage.read_at && lastMessage.sender_id !== conv.other_user?.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  className={cn(
                    "w-full p-3 sm:p-4 min-h-[72px] flex items-center gap-4 text-left transition-all duration-300 rounded-xl relative group",
                    // Mobile Touch Feedback
                    "active:scale-[0.98]",
                    isSelected 
                      ? "bg-white/[0.06] border border-white/10 shadow-sm" 
                      : "hover:bg-white/[0.03] border border-transparent",
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-14 h-14 border-2 border-white/10 bg-white/5">
                      <AvatarImage src={conv.other_user?.profile_photos?.[0]} />
                      <AvatarFallback className="bg-gradient-to-br from-rose-500/20 to-purple-500/20 text-white text-lg border-0">
                        {conv.other_user?.name?.charAt(0) || <User className="w-6 h-6" />}
                      </AvatarFallback>
                    </Avatar>
                    {isUserOnline && conv.other_user?.id && isUserOnline(conv.other_user.id) && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0a0a0f]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        "font-semibold text-base truncate tracking-wide", 
                        isUnread ? "text-white" : "text-white/80"
                      )}>
                        {conv.other_user?.name || "Unknown User"}
                      </span>
                      <span className="text-xs text-white/40 flex-shrink-0 ml-2 font-medium">
                        {conv.last_message_at && formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {/* Last message preview */}
                      <p
                        className={cn(
                          "text-sm truncate flex-1 transition-colors", 
                          isUnread ? "text-white/90 font-medium" : "text-white/50"
                        )}
                      >
                        {lastMessage ? (
                          lastMessage.message_type === "image" ? (
                            <span className="flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-rose-400" />
                              <span>Sent a photo</span>
                            </span>
                          ) : (
                            lastMessage.content
                          )
                        ) : (
                          <span className="italic opacity-50">Start a conversation</span>
                        )}
                      </p>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Read status for sent messages */}
                        {lastMessage && lastMessage.sender_id === conv.other_user?.id && (
                          <span className="text-white/30">
                            {lastMessage.read_at ? (
                              <CheckCheck className="w-4 h-4 text-rose-400" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </span>
                        )}

                        {/* Unread badge */}
                        {isUnread && (
                          <Badge className="bg-rose-500 hover:bg-rose-500 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] text-white border border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.4)]">
                            1
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}