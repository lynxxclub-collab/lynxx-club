import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, useMessages, Conversation } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";
import ConversationList from "@/components/messages/ConversationList";
import ChatWindow from "@/components/messages/ChatWindow";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileLikeNotifications } from "@/hooks/useProfileLikeNotifications";

export default function Messages() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Subscribe to profile like notifications
  useProfileLikeNotifications();

  // Real-time presence tracking
  const { isUserOnline } = usePresence(user?.id);

  const { conversations, loading: convsLoading, refetch } = useConversations();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newRecipient, setNewRecipient] = useState<{ id: string; name: string; photo?: string; user_type?: "seeker" | "earner" } | null>(null);

  const { messages, loading: msgsLoading } = useMessages(selectedConversation?.id || null);

  // Handle new message to specific user - fetch recipient immediately on mount
  useEffect(() => {
    const recipientId = searchParams.get("to");
    if (!recipientId || !user) return;

    // Immediately fetch recipient info using RPC to bypass RLS
    supabase.rpc("get_public_profile_by_id", { profile_id: recipientId }).then(({ data }) => {
      if (data && data.length > 0) {
        const profile = data[0];
        setNewRecipient({
          id: profile.id,
          name: profile.name || "User",
          photo: profile.profile_photos?.[0],
          user_type: profile.user_type,
        });
        setSelectedConversation(null);
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
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  const showChat = selectedConversation || newRecipient;
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <Header />

      <main className="flex-1 flex overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* Conversation List - Hidden on mobile when chat is open */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r border-white/10 bg-[#0a0a0f] flex flex-col",
            showChat && "hidden md:flex",
          )}
        >
          <div className="p-4 border-b border-white/10 bg-white/[0.02]">
            <h1 className="text-xl font-bold flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-rose-400" />
              </div>
              Messages
            </h1>
          </div>
          <div className="flex-1 overflow-hidden">
            <ConversationList
              conversations={conversations}
              loading={convsLoading}
              selectedId={selectedConversation?.id || null}
              onSelect={handleSelectConversation}
              isUserOnline={isUserOnline}
            />
          </div>
        </div>

        {/* Chat Window */}
        <div className={cn("flex-1 flex flex-col bg-[#0a0a0f]", !showChat && "hidden md:flex")}>
          {showChat ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden p-2 border-b border-white/10 bg-white/[0.02]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="text-white/70 hover:text-white hover:bg-white/5"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </div>
              <ChatWindow
                messages={messages}
                loading={msgsLoading}
                conversationId={selectedConversation?.id || null}
                recipientId={recipientId}
                recipientName={recipientName}
                recipientPhoto={recipientPhoto}
                recipientUserType={recipientUserType}
                isOnline={isOnline}
                onNewConversation={handleNewConversation}
                totalMessages={selectedConversation?.total_messages || 0}
                video15Rate={selectedConversation?.other_user?.video_15min_rate || 75}
                video30Rate={selectedConversation?.other_user?.video_30min_rate || 150}
                video60Rate={selectedConversation?.other_user?.video_60min_rate || 300}
                video90Rate={selectedConversation?.other_user?.video_90min_rate || 450}
                readOnly={isAlumni}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Select a conversation</h2>
                <p className="text-white/40">Choose a conversation from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
