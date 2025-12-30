import { forwardRef, useMemo } from "react";
import { Message } from "@/hooks/useMessages";
import { GiftTransaction } from "@/hooks/useGifts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { Send, Check, CheckCheck, Loader2 } from "lucide-react";
import ChatImage from "@/components/messages/ChatImage";
import GiftMessage from "@/components/gifts/GiftMessage";
import ReplyDeadlineTimer from "@/components/messages/ReplyDeadlineTimer";

type TimelineItem = 
  | { type: 'message'; data: Message; timestamp: string }
  | { type: 'gift'; data: GiftTransaction; timestamp: string };

interface MessageListProps {
  messages: Message[];
  giftTransactions: GiftTransaction[];
  userId?: string;
  recipientName: string;
  recipientPhoto?: string;
  recipientUserType?: "seeker" | "earner";
  isSeeker: boolean;
  unlockedImages: Set<string>;
  unlockingImage: string | null;
  onUnlockImage: (messageId: string) => void;
  onReact: (transactionId: string, emoji: string) => void;
  isRecipientTyping: boolean;
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>(({
  messages,
  giftTransactions,
  userId,
  recipientName,
  recipientPhoto,
  recipientUserType,
  isSeeker,
  unlockedImages,
  unlockingImage,
  onUnlockImage,
  onReact,
  isRecipientTyping,
}, ref) => {
  // Combine messages and gift transactions into a single timeline
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [
      ...messages.map(m => ({ type: 'message' as const, data: m, timestamp: m.created_at })),
      ...giftTransactions.map(g => ({ type: 'gift' as const, data: g, timestamp: g.created_at }))
    ];
    return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, giftTransactions]);

  // Group timeline items by date
  const groupedTimeline = useMemo(() => {
    return timelineItems.reduce(
      (groups, item) => {
        const date = new Date(item.timestamp).toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(item);
        return groups;
      },
      {} as Record<string, TimelineItem[]>,
    );
  }, [timelineItems]);

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMMM d");
  };

  if (messages.length === 0 && giftTransactions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="font-semibold text-lg text-white mb-1">Start the conversation</h3>
          <p className="text-white/50 text-sm">Send a message to begin chatting with {recipientName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full justify-end p-4">
      <div className="space-y-6">
        {Object.entries(groupedTimeline).map(([date, dateItems]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-6">
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <span className="text-xs text-white/50 font-medium">
                  {formatDateHeader(date)}
                </span>
              </div>
            </div>

            {/* Items for this date (messages + gifts) */}
            <div className="space-y-1.5">
              {dateItems.map((item, index) => {
                // Handle gift transactions
                if (item.type === 'gift') {
                  return (
                    <GiftMessage
                      key={`gift-${item.data.id}`}
                      transaction={item.data}
                      onReact={onReact}
                    />
                  );
                }

                // Handle regular messages
                const message = item.data;
                const isMine = message.sender_id === userId;
                
                // Find previous message item for avatar logic
                const prevItem = dateItems[index - 1];
                const prevSenderId = prevItem?.type === 'message' ? prevItem.data.sender_id : null;
                const showAvatar = !isMine && (index === 0 || prevSenderId !== message.sender_id);
                
                // Find next message item for grouping logic
                const nextItem = dateItems[index + 1];
                const nextSenderId = nextItem?.type === 'message' ? nextItem.data.sender_id : null;
                const isLastInGroup = index === dateItems.length - 1 || nextSenderId !== message.sender_id;

                return (
                  <div key={message.id} className={cn("flex gap-2 group", isMine && "justify-end")}>
                    {!isMine && (
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && (
                          <Avatar className="w-8 h-8 border border-white/10">
                            <AvatarImage src={recipientPhoto} />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-rose-500/30 to-purple-500/30 text-white">
                              {recipientName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div className={cn("max-w-[75%] relative", isMine && "order-1")}>
                      <div
                        className={cn(
                          "rounded-xl px-3 py-1.5",
                          isMine
                            ? cn(
                                "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
                                isLastInGroup ? "rounded-br-sm" : "",
                              )
                            : cn("bg-white/[0.06] border border-white/10", isLastInGroup ? "rounded-bl-sm" : ""),
                        )}
                      >
                        {message.message_type === "image" ? (
                          isSeeker && !isMine && recipientUserType === "earner" && !unlockedImages.has(message.id) ? (
                            <div className="relative">
                              <div className="blur-md">
                                <ChatImage content={message.content} alt="Shared image" />
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                                <button
                                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => onUnlockImage(message.id)}
                                  disabled={unlockingImage === message.id}
                                >
                                  {unlockingImage === message.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                  {unlockingImage === message.id ? 'Unlocking...' : 'Unlock Image — 10 credits'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <ChatImage content={message.content} alt="Shared image" />
                          )
                        ) : (
                          <p
                            className={cn(
                              "break-words text-sm leading-snug",
                              isMine ? "text-primary-foreground" : "text-white",
                            )}
                          >
                            {message.content}
                          </p>
                        )}
                      </div>

                      {/* Time and status */}
                      <div
                        className={cn(
                          "flex items-center gap-1.5 mt-1 px-1",
                          isMine ? "justify-end" : "justify-start",
                        )}
                      >
                        <span className="text-[10px] text-white/40">
                          {format(new Date(message.created_at), "h:mm a")}
                        </span>
                        {isMine && (
                          <span className={cn("text-[10px]", message.read_at ? "text-blue-400" : "text-white/40")}>
                            {message.read_at ? (
                              <CheckCheck className="w-3.5 h-3.5" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </span>
                        )}
                      </div>
                      
                      {/* Reply deadline timer for billable messages */}
                      {message.is_billable_volley && message.reply_deadline && (
                        <ReplyDeadlineTimer
                          deadline={message.reply_deadline}
                          refundStatus={message.refund_status}
                          isSeeker={isMine}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isRecipientTyping && (
          <div className="flex gap-2 items-end">
            <Avatar className="w-8 h-8 border border-white/10">
              <AvatarImage src={recipientPhoto} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-rose-500/30 to-purple-500/30 text-white">{recipientName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Scroll target at the bottom */}
      <div ref={ref} />
    </div>
  );
});

MessageList.displayName = "MessageList";

export default MessageList;
