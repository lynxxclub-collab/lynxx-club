import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, useMessages, Conversation } from '@/hooks/useMessages';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import ConversationList from '@/components/messages/ConversationList';
import ChatWindow from '@/components/messages/ChatWindow';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Messages() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { conversations, loading: convsLoading, refetch } = useConversations();
  
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newRecipient, setNewRecipient] = useState<{ id: string; name: string; photo?: string } | null>(null);
  
  const { messages, loading: msgsLoading } = useMessages(selectedConversation?.id || null);

  // Handle new message to specific user
  useEffect(() => {
    const recipientId = searchParams.get('to');
    if (recipientId && user) {
      // Check if conversation already exists
      const existing = conversations.find(c => 
        c.other_user?.id === recipientId
      );
      
      if (existing) {
        setSelectedConversation(existing);
        setNewRecipient(null);
        searchParams.delete('to');
        setSearchParams(searchParams);
      } else {
        // Fetch recipient info
        supabase
          .from('profiles')
          .select('id, name, profile_photos')
          .eq('id', recipientId)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setNewRecipient({
                id: data.id,
                name: data.name || 'User',
                photo: data.profile_photos?.[0]
              });
              setSelectedConversation(null);
            }
          });
      }
    }
  }, [searchParams, conversations, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setNewRecipient(null);
    searchParams.delete('to');
    setSearchParams(searchParams);
  };

  const handleNewConversation = (conversationId: string) => {
    refetch();
    // Find the newly created conversation
    setTimeout(() => {
      refetch().then(() => {
        const newConv = conversations.find(c => c.id === conversationId);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const showChat = selectedConversation || newRecipient;
  const recipientId = selectedConversation?.other_user?.id || newRecipient?.id || '';
  const recipientName = selectedConversation?.other_user?.name || newRecipient?.name || 'User';
  const recipientPhoto = selectedConversation?.other_user?.profile_photos?.[0] || newRecipient?.photo;
  
  // Check if user is alumni (paused with alumni access)
  const isAlumni = profile?.account_status === 'alumni' || 
    (profile?.account_status === 'paused' && profile?.alumni_access_expires && 
     new Date(profile.alumni_access_expires) > new Date());

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Conversation List - Hidden on mobile when chat is open */}
        <div className={cn(
          "w-full md:w-80 lg:w-96 border-r border-border bg-card flex flex-col",
          showChat && "hidden md:flex"
        )}>
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Messages
            </h1>
          </div>
          <div className="flex-1 overflow-hidden">
            <ConversationList
              conversations={conversations}
              loading={convsLoading}
              selectedId={selectedConversation?.id || null}
              onSelect={handleSelectConversation}
            />
          </div>
        </div>

        {/* Chat Window */}
        <div className={cn(
          "flex-1 flex flex-col bg-background",
          !showChat && "hidden md:flex"
        )}>
          {showChat ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden p-2 border-b border-border">
                <Button variant="ghost" size="sm" onClick={handleBack}>
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
                onNewConversation={handleNewConversation}
                totalMessages={selectedConversation?.total_messages || 0}
                video30Rate={selectedConversation?.other_user?.video_30min_rate || 300}
                video60Rate={selectedConversation?.other_user?.video_60min_rate || 500}
                readOnly={isAlumni}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
                <p className="text-muted-foreground">
                  Choose a conversation from the list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}