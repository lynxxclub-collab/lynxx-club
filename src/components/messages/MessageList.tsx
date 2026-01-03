import React, { forwardRef, useMemo } from "react";
import { Message } from "@/hooks/useMessages";
import { GiftTransaction } from "@/hooks/useGifts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { Send, Check, CheckCheck, Loader2, Lock } from "lucide-react";
import ChatImage from "@/components/messages/ChatImage";
import GiftMessage from "@/components/gifts/GiftMessage";
import ReplyDeadlineTimer from "@/components/messages/ReplyDeadlineTimer";

type TimelineItem =
  | { type: "message"; data: Message; timestamp: string }
  | { type: "gift"; data: GiftTransaction; timestamp: string };

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
  /** Optional: if your UI wants to show a locked banner in-list */
  readOnly?: boolean;
}

function formatDateHeader(dateString: string) {
  const date = new Date(dateString);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d");
}

function isSameSender(a?: TimelineItem, b?: TimelineItem) {
  if (!a || !b) return false;
  if (a.type !== "message" || b.type !== "message") return false;
  return a.data.sender_id === b.data.sender_id;
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>(function MessageList(
  {
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
    readOnly = false,
  },
  bottomRef,
) {
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [
      ...messages.map((m) => ({ type: "message" as const, data: m, timestamp: m.created_at })),
      ...giftTransactions.map((g) => ({ type: "gift" as const, data: g, timestamp: g.created_at })),
    ];

    // Stable-ish sort: timestamp, then message before gift if equal, then id fallback
    return items.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      if (ta !== tb) return ta - tb;

      if (a.type !== b.type) return a.type === "message" ? -1 : 1;

      const ida = a.type === "message" ? a.data.id : a.data.id;
      const idb = b.type === "message" ? b.data.id : b.data.id;
      return ida.localeCompare(idb);
    });
  }, [messages, giftTransactions]);

  const groupedTimeline = useMemo(() => {
    return timelineItems.reduce((groups, item) => {
      const key = new Date(item.timestamp).toDateString();
      (groups[key] ||= []).push(item);
      return groups;
    }, {} as Record<string, TimelineItem[]>);
  }, [timelineItems]);

  const isEmpty = messages.length === 0 && giftTransactions.length === 0;

  if (isEmpty) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <Send className="w-10 h-10 text-white/40" />
          </div>
          <h3 className="font-semibold text-lg text-white mb-2">Start the conversation</h3>
          <p className="text-white/50 text-base px-4">Send a message to begin chatting with {recipientName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full justify-end px-3 sm:px-4 py-4">
      <div className="space-y-6">
        {readOnly && (
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3 text-white/70">
              <Lock className="w-4 h-4 text-white/50" />
              <span className="text-sm">Read-only conversation</span>
            </div>
          </div>
        )}

        {Object.entries(groupedTimeline).map(([dateKey, dateItems]) => (
          <div key={dateKey}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-6">
              <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                <span className="text-xs sm:text-sm text-white/50 font-medium">
                  {formatDateHeader(dateKey)}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-1.5">
              {dateItems.map((item, index) => {
                if (item.type === "gift") {
                  return (
                    <GiftMessage key={`gift-${item.data.id}`} transaction={item.data} onReact={onReact} />
                  );
                }

                const message = item.data;
                const isMine = message.sender_id === userId;

                const prev = dateItems[index - 1];
                const next = dateItems[index + 1];

                // Only group with adjacent *message* items from same sender
                const showAvatar = !isMine && (index === 0 || !isSameSender(prev, item));
                const isLastInGroup = index === dateItems.length - 1 || !isSameSender(item, next);

                const isLockedImage =
                  message.message_type === "image" &&
                  isSeeker &&
                  !isMine &&
                  recipientUserType === "earner" &&
                  !unlockedImages.has(message.id);

                return (
                  <div key={message.id} className={cn("flex gap-2 group", isMine && "justify-end")}>
                    {!isMine && (
                      <div className="w-9 flex-shrink-0">
                        {showAvatar && (
                          <Avatar className="w-9 h-9 border border-white/10">
                            <AvatarImage src={recipientPhoto} alt={recipientName} />
                            <AvatarFallback className="text-sm bg-gradient-to-br from-rose-500/30 to-purple-500/30 text-white">
                              {recipientName?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div className={cn("max-w-[85%] sm:max-w-[75%] relative", isMine && "order-1")}>
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5",
                          isMine
                            ? cn(
                                "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
                                isLastInGroup && "rounded-br-sm",
                              )
                            : cn("bg-white/[0.06] border border-white/10", isLastInGroup && "rounded-bl-sm"),
                        )}
                      >
                        {message.message_type === "image" ? (
                          isLockedImage ? (
                            <div className="relative">
                              <div className="blur-md select-none pointer-events-none">
                                <ChatImage content={message.content} alt="Shared image" />
                              </div>

                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                                <button
                                  type="button"
                                  className={cn(
                                    "px-5 py-3 min-h-[48px] rounded-xl font-semibold",
                                    "text-sm sm:text-base flex items-center gap-2",
                                    "bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground",
                                    "disabled:opacity-50 disabled:cursor-not-allowed",
                                  )}
                                  onClick={() => onUnlockImage(message.id)}
                                  disabled={unlockingImage === message.id}
                                >
                                  {unlockingImage === message.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                                      />
                                    </svg>
                                  )}
                                  <span className="whitespace-nowrap">
                                    {unlockingImage === message.id ? "Unlocking..." : "Unlock — 10 credits"}
                                  </span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <ChatImage content={message.content} alt="Shared image" />
                          )
                        ) : (
                          <p className={cn("break-words text-base leading-relaxed", isMine ? "text-primary-foreground" : "text-white")}>
                            {message.content}
                          </p>
                        )}
                      </div>

                      {/* Meta */}
                      <div className={cn("flex items-center gap-1.5 mt-1.5 px-1", isMine ? "justify-end" : "justify-start")}>
                        <span className="text-xs text-white/40">
                          {format(new Date(message.created_at), "h:mm a")}
                        </span>

                        {isMine && (
                          <span className={cn("text-xs", message.read_at ? "text-blue-400" : "text-white/40")}>
                            {message.read_at ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
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
            <Avatar className="w-9 h-9 border border-white/10">
              <AvatarImage src={recipientPhoto} alt={recipientName} />
              <AvatarFallback className="text-sm bg-gradient-to-br from-rose-500/30 to-purple-500/30 text-white">
                {recipientName?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-md px-5 py-3.5">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Bottom anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
});

MessageList.displayName = "MessageList";

export default MessageList;