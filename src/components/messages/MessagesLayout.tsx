import { useState, useEffect } from "react";
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

export default function MessagesLayout() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  // Subscribe to profile like notifications
  useProfileLikeNotifications();

  // Real-time presence tracking
  const { isUserOnline } = usePresence(user?.id);

  const { conversations, loading: convsLoading, refetch } = useConversations();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newRecipient, setNewRecipient] = useState<{ id: string; name: string; photo?: string; user_type?: "seeker" | "earner" } | null>(null);
  const [showThread, setShowThread] = useState(false);

  // Handle new message to specific user - fetch recipient immediately on mount
  useEffect(() => {
    const recipientId = searchParams.get("to");
    if (!recipientId || !user) return;

    // Immediately fetch recipient info using RPC to bypass RLS
    supabase.rpc("get_public_profile_by_id", { profile_id: recipientId }).then(({ data }) => {
      if (data && data.length > 0) {
        const profile = data[0] as Record<string, unknown>;
        setNewRecipient({
          id: profile.id as string,
          name: (profile.name as string) || "User",
          photo: (profile.profile_photos as string[])?.[0],
          user_type: profile.user_type as "earner" | "seeker",
        });
        setSelectedConversation(null);
        setShowThread(true);
      }
    });
  }, [searchParams.get("to"), user]);

  // Check if conversation already exists after conversations load
  useEffect(() => {
    const recipientId = searchParams.get("to");
    if (!recipientId || !user || convsLoading) return;

    const existing = conversations.find((c) => c.other_user?.id === recipientId);
    if (existing) {
      setSelectedConversation(existing);
      setNewRecipient(null);
      searchParams.delete("to");
      setSearchParams(searchParams);
      setShowThread(true);
    }
  }, [conversations, convsLoading, user]);

  // Temporarily disabled for public access
  // useEffect(() => {
  //   if (!authLoading && !user) {
  //     navigate("/auth");
  //   }
  // }, [authLoading, user, navigate]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setNewRecipient(null);
    searchParams.delete("to");
    setSearchParams(searchParams);
    setShowThread(true);
  };

  const handleNewConversation = (conversationId: string) => {
    refetch();
    // Find the newly created conversation
    setTimeout(() => {
      refetch().then(() => {
        const newConv = conversations.find((c) => c.id === conversationId);
        if (newConv) {
          setSelectedConversation(newConv);
          setNewRecipient(null);
        }
      });
    }, 500);
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setNewRecipient(null);
    setShowThread(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        </div>
        <Loader2 className="w-8 h-8 animate-spin text-primary relative z-10" />
      </div>
    );
  }

  const hasActiveThread = selectedConversation || newRecipient;
  const recipientId = selectedConversation?.other_user?.id || newRecipient?.id || "";
  const recipientName = selectedConversation?.other_user?.name || newRecipient?.name || "User";
  const recipientPhoto = selectedConversation?.other_user?.profile_photos?.[0] || newRecipient?.photo;
  const recipientUserType = newRecipient?.user_type || (selectedConversation?.earner_id === recipientId ? "earner" : "seeker");
  const isOnline = recipientId ? isUserOnline(recipientId) : false;

  // Check if user is alumni (paused with alumni access)
  const isAlumni =
    profile?.account_status === "alumni" ||
    (profile?.account_status === "paused" &&
      profile?.alumni_access_expires &&
      new Date(profile.alumni_access_expires) > new Date());

  // Mobile: show either list or thread, not both
  if (isMobile) {
    if (showThread && hasActiveThread) {
      return (
        <div className="min-h-[100dvh] h-[100dvh] bg-[#0a0a0f] relative overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {/* Background effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
          </div>
          <div className="relative z-10 h-full">
            <ThreadView
              conversationId={selectedConversation?.id || null}
              recipientId={recipientId}
              recipientName={recipientName}
              recipientPhoto={recipientPhoto}
              recipientUserType={recipientUserType}
              isOnline={isOnline}
              onBack={handleBack}
              onNewConversation={handleNewConversation}
              totalMessages={selectedConversation?.total_messages || 0}
              video15Rate={selectedConversation?.other_user?.video_15min_rate || 75}
              video30Rate={selectedConversation?.other_user?.video_30min_rate || 150}
              video60Rate={selectedConversation?.other_user?.video_60min_rate || 300}
              video90Rate={selectedConversation?.other_user?.video_90min_rate || 450}
              readOnly={isAlumni}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[100dvh] h-[100dvh] bg-[#0a0a0f] relative overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* Background effects */}
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

  // Desktop: split view
  return (
    <div className="min-h-[100dvh] h-[100dvh] flex bg-[#0a0a0f] relative overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
      </div>
      
      <div className="relative z-10 flex w-full h-full">
        {/* Conversation List Sidebar */}
        <div className="w-80 lg:w-96 border-r border-white/5 flex-shrink-0">
          <ConversationListView
            conversations={conversations}
            loading={convsLoading}
            selectedId={selectedConversation?.id || null}
            onSelect={handleSelectConversation}
            isUserOnline={isUserOnline}
          />
        </div>

        {/* Thread View */}
        <div className="flex-1 flex flex-col min-w-0">
          {hasActiveThread ? (
            <ThreadView
              conversationId={selectedConversation?.id || null}
              recipientId={recipientId}
              recipientName={recipientName}
              recipientPhoto={recipientPhoto}
              recipientUserType={recipientUserType}
              isOnline={isOnline}
              onBack={handleBack}
              onNewConversation={handleNewConversation}
              totalMessages={selectedConversation?.total_messages || 0}
              video15Rate={selectedConversation?.other_user?.video_15min_rate || 75}
              video30Rate={selectedConversation?.other_user?.video_30min_rate || 150}
              video60Rate={selectedConversation?.other_user?.video_60min_rate || 300}
              video90Rate={selectedConversation?.other_user?.video_90min_rate || 450}
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
