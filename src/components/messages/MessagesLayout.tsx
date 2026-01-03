import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, Conversation } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import ConversationListView from "./ConversationListView";
import ThreadView from "./ThreadView";
import { Loader2, MessageSquare } from "lucide-react";
import { useProfileLikeNotifications } from "@/hooks/useProfileLikeNotifications";

type NewRecipient = {
  id: string;
  name: string;
  photo?: string;
  user_type?: "seeker" | "earner";
};

export default function MessagesLayout() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  // Subscribe to profile like notifications
  useProfileLikeNotifications();

  // Presence
  const { isUserOnline } = usePresence(user?.id);

  const { conversations, loading: convsLoading, refetch } = useConversations();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newRecipient, setNewRecipient] = useState<NewRecipient | null>(null);
  const [showThread, setShowThread] = useState(false);

  // NEW: holds conversation id immediately after first send (because refetch() returns void)
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);

  // --- Helpers
  const clearToParam = useCallback(() => {
    if (!searchParams.has("to")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("to");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Handle new message to specific user - fetch recipient immediately on mount
  useEffect(() => {
    const recipientId = searchParams.get("to");
    if (!recipientId || !user) return;

    let cancelled = false;

    (async () => {
      // RPC to bypass RLS (as you already had)
      const { data } = await supabase.rpc("get_public_profile_by_id", { profile_id: recipientId });

      if (cancelled) return;

      if (data && data.length > 0) {
        const p = data[0] as Record<string, unknown>;
        setNewRecipient({
          id: p.id as string,
          name: (p.name as string) || "User",
          photo: (p.profile_photos as string[])?.[0],
          user_type: p.user_type as "earner" | "seeker",
        });

        setSelectedConversation(null);
        setPendingConversationId(null);
        setShowThread(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, user]);

  // If conversation already exists (after conversations load), open it
  useEffect(() => {
    const recipientId = searchParams.get("to");
    if (!recipientId || !user || convsLoading) return;

    const existing = conversations.find((c) => c.other_user?.id === recipientId);
    if (!existing) return;

    setSelectedConversation(existing);
    setNewRecipient(null);
    setPendingConversationId(null);
    clearToParam();
    setShowThread(true);
  }, [conversations, convsLoading, user, searchParams, clearToParam]);

  // Promote pendingConversationId into selectedConversation once it appears in the list
  useEffect(() => {
    if (!pendingConversationId) return;
    const found = conversations.find((c) => c.id === pendingConversationId);
    if (!found) return;

    setSelectedConversation(found);
    setPendingConversationId(null);
  }, [pendingConversationId, conversations]);

  // Temporarily disabled for public access
  // useEffect(() => {
  //   if (!authLoading && !user) navigate("/auth");
  // }, [authLoading, user, navigate]);

  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      setSelectedConversation(conv);
      setNewRecipient(null);
      setPendingConversationId(null);
      clearToParam();
      setShowThread(true);
    },
    [clearToParam],
  );

  /**
   * FIXED: refetch() returns void.
   * We open the thread immediately with conversationId, then refetch the list.
   */
  const handleNewConversation = useCallback(
    (conversationId: string) => {
      setPendingConversationId(conversationId);
      setNewRecipient(null);
      setShowThread(true);

      // update list (void return is fine)
      refetch();
    },
    [refetch],
  );

  const handleBack = useCallback(() => {
    setSelectedConversation(null);
    setNewRecipient(null);
    setPendingConversationId(null);
    setShowThread(false);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        </div>
        <Loader2 className="w-8 h-8 animate-spin text-primary relative z-10" />
      </div>
    );
  }

  const hasActiveThread = !!selectedConversation || !!newRecipient || !!pendingConversationId;

  const recipientId = selectedConversation?.other_user?.id || newRecipient?.id || "";
  const recipientName = selectedConversation?.other_user?.name || newRecipient?.name || "User";
  const recipientPhoto = selectedConversation?.other_user?.profile_photos?.[0] || newRecipient?.photo;

  const recipientUserType =
    newRecipient?.user_type ||
    (recipientId && selectedConversation?.earner_id === recipientId ? "earner" : "seeker");

  const isOnline = recipientId ? isUserOnline(recipientId) : false;

  // ThreadView wants the conversationId (can be null for pre-conversation threads)
  const activeConversationId = selectedConversation?.id || pendingConversationId || null;

  // alumni read-only
  const isAlumni =
    profile?.account_status === "alumni" ||
    (profile?.account_status === "paused" &&
      profile?.alumni_access_expires &&
      new Date(profile.alumni_access_expires) > new Date());

  // Rates fallbacks
  const rates = useMemo(() => {
    const u = selectedConversation?.other_user;
    return {
      video15Rate: u?.video_15min_rate || 75,
      video30Rate: u?.video_30min_rate || 150,
      video60Rate: u?.video_60min_rate || 300,
      video90Rate: u?.video_90min_rate || 450,
      totalMessages: selectedConversation?.total_messages || 0,
    };
  }, [selectedConversation]);

  // Mobile
  if (isMobile) {
    if (showThread && hasActiveThread) {
      return (
        <div
          className="min-h-[100dvh] h-[100dvh] bg-[#0a0a0f] relative overflow-hidden"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 h-full">
            <ThreadView
              conversationId={activeConversationId}
              recipientId={recipientId}
              recipientName={recipientName}
              recipientPhoto={recipientPhoto}
              recipientUserType={recipientUserType}
              isOnline={isOnline}
              onBack={handleBack}
              onNewConversation={handleNewConversation}
              totalMessages={rates.totalMessages}
              video15Rate={rates.video15Rate}
              video30Rate={rates.video30Rate}
              video60Rate={rates.video60Rate}
              video90Rate={rates.video90Rate}
              readOnly={isAlumni}
            />
          </div>
        </div>
      );
    }

    return (
      <div
        className="min-h-[100dvh] h-[100dvh] bg-[#0a0a0f] relative overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 h-full">
          <ConversationListView
            conversations={conversations}
            loading={convsLoading}
            selectedId={selectedConversation?.id || null}
            onSelect={handleSelectConversation}
            isUserOnline={isUserOnline}
          />
        </div>
      </div>
    );
  }

  // Desktop split view
  return (
    <div
      className="min-h-[100dvh] h-[100dvh] flex bg-[#0a0a0f] relative overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex w-full h-full">
        <div className="w-80 lg:w-96 border-r border-white/5 flex-shrink-0">
          <ConversationListView
            conversations={conversations}
            loading={convsLoading}
            selectedId={selectedConversation?.id || null}
            onSelect={handleSelectConversation}
            isUserOnline={isUserOnline}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {hasActiveThread ? (
            <ThreadView
              conversationId={activeConversationId}
              recipientId={recipientId}
              recipientName={recipientName}
              recipientPhoto={recipientPhoto}
              recipientUserType={recipientUserType}
              isOnline={isOnline}
              onBack={handleBack}
              onNewConversation={handleNewConversation}
              totalMessages={rates.totalMessages}
              video15Rate={rates.video15Rate}
              video30Rate={rates.video30Rate}
              video60Rate={rates.video60Rate}
              video90Rate={rates.video90Rate}
              readOnly={isAlumni}
              showBackOnDesktop={false}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-white/40" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Select a conversation</h2>
                <p className="text-white/50">Choose a conversation from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}