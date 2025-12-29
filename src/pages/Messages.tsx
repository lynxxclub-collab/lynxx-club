import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, useMessages, Conversation } from "@/hooks/useMessages";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import ConversationList from "@/components/messages/ConversationList";
import ChatWindow from "@/components/messages/ChatWindow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search, ChevronLeft, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export default function Messages() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { conversations, loading: conversationsLoading, refetch: refetchConversations } = useConversations();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [newConversationUser, setNewConversationUser] = useState<{
    id: string;
    name: string;
    profile_photos: string[];
    video_30min_rate?: number;
    video_60min_rate?: number;
  } | null>(null);

  const conversationId = selectedConversation?.id || null;
  const { messages, loading: messagesLoading } = useMessages(conversationId);

  useEffect(() => {
    const toUserId = searchParams.get("to");
    if (toUserId && user) {
      handleStartNewConversation(toUserId);
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  const handleStartNewConversation = async (userId: string) => {
    const existingConv = conversations.find((c) => c.other_user?.id === userId);

    if (existingConv) {
      setSelectedConversation(existingConv);
      setRecipientId(existingConv.other_user?.id || null);
      setNewConversationUser(null);
      setShowSidebar(false);
    } else {
      const { data: userData } = await supabase
        .from("profiles")
        .select("id, name, profile_photos, video_30min_rate, video_60min_rate")
        .eq("id", userId)
        .single();

      if (userData) {
        setNewConversationUser(userData);
        setRecipientId(userId);
        setSelectedConversation(null);
        setShowSidebar(false);
      }
    }
    setSearchParams({});
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setRecipientId(conv.other_user?.id || null);
    setNewConversationUser(null);
    setShowSidebar(false);
  };

  const handleNewConversation = (newConvId: string) => {
    refetchConversations().then(() => {
      const newConv = conversations.find((c) => c.id === newConvId);
      if (newConv) {
        setSelectedConversation(newConv);
        setNewConversationUser(null);
      }
    });
  };

  const handleBackToList = () => {
    setShowSidebar(true);
    setSelectedConversation(null);
    setNewConversationUser(null);
    setRecipientId(null);
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.other_user?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentRecipient = selectedConversation?.other_user || newConversationUser;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={cn(
            "w-full md:w-80 lg:w-96 border-r border-border/50 flex flex-col bg-card/30",
            "md:flex",
            showSidebar ? "flex" : "hidden",
          )}
        >
          <div className="p-4 border-b border-border/50">
            <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Messages
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ConversationList
              conversations={filteredConversations}
              loading={conversationsLoading}
              selectedId={selectedConversation?.id || null}
              onSelect={handleSelectConversation}
            />
          </div>
        </div>

        {/* Chat area */}
        <div className={cn("flex-1 flex flex-col", !showSidebar ? "flex" : "hidden md:flex")}>
          {recipientId && currentRecipient ? (
            <>
              <div className="md:hidden p-2 border-b border-border/50">
                <Button variant="ghost" size="sm" onClick={handleBackToList}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </div>

              <ChatWindow
                messages={messages}
                loading={messagesLoading}
                conversationId={conversationId}
                recipientId={recipientId}
                recipientName={currentRecipient.name || "User"}
                recipientPhoto={currentRecipient.profile_photos?.[0]}
                onNewConversation={handleNewConversation}
                totalMessages={selectedConversation?.total_messages || 0}
                video30Rate={currentRecipient.video_30min_rate || 150}
                video60Rate={currentRecipient.video_60min_rate || 300}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
                <p className="text-muted-foreground mb-6">
                  {conversations.length === 0
                    ? "Start a conversation by messaging someone from the browse page."
                    : "Select a conversation to view messages."}
                </p>
                {conversations.length === 0 && (
                  <Button onClick={() => navigate("/browse")}>
                    <Users className="w-4 h-4 mr-2" />
                    Browse Profiles
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
