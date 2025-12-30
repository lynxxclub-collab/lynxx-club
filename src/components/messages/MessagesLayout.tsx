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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

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
      <div className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
      );
    }

    return (
      <ConversationListView
        conversations={conversations}
        loading={convsLoading}
        selectedId={selectedConversation?.id || null}
        onSelect={handleSelectConversation}
        isUserOnline={isUserOnline}
      />
    );
  }

  // Desktop: split view
  return (
    <div className="h-screen flex bg-background" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Conversation List Sidebar */}
      <div className="w-80 lg:w-96 border-r border-border flex-shrink-0">
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
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Select a conversation</h2>
              <p className="text-muted-foreground">Choose a conversation from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
