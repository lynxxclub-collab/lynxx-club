import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { requireValidUUID } from '@/lib/sanitize';
import {
  AlertTriangle,
  Calendar,
  MessageCircle,
  Video,
  DollarSign,
  Clock,
  Check,
  X,
  Image as ImageIcon,
  ArrowLeft,
  Shield,
  FileText,
  UserCheck
} from 'lucide-react';

interface SuccessStory {
  id: string;
  initiator_id: string;
  partner_id: string;
  story_text: string;
  how_we_met: string | null;
  first_date_type: string | null;
  days_until_first_date: number | null;
  helpful_features: any;
  improvement_suggestions: string | null;
  share_story: boolean | null;
  share_anonymously: boolean | null;
  status: string;
  fraud_score: number | null;
  fraud_risk: string | null;
  fraud_flags: any;
  initiator_photo_url: string | null;
  partner_photo_url: string | null;
  initiator_gift_card_email: string | null;
  partner_gift_card_email: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  profile_photos: string[] | null;
  created_at: string | null;
  role?: 'seeker' | 'earner';
}

interface UserStats {
  conversations: number;
  videoDates: number;
  totalSpent: number;
  totalEarned: number;
  messageCount: number;
}

interface StoryReviewModalProps {
  story: SuccessStory;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function StoryReviewModal({ story, open, onClose, onUpdate }: StoryReviewModalProps) {
  const [initiator, setInitiator] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [initiatorStats, setInitiatorStats] = useState<UserStats | null>(null);
  const [partnerStats, setPartnerStats] = useState<UserStats | null>(null);
  const [conversationStats, setConversationStats] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState(story.review_notes || '');
  const [loading, setLoading] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isModifiedExternally, setIsModifiedExternally] = useState(false);

  useEffect(() => {
    if (!open) return;
    
    loadUserData();
    // REAL-TIME: Listen for status changes
    const channel = supabase
      .channel(`success_story_${story.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'success_stories',
          filter: `id=eq.${story.id}`,
        },
        (payload) => {
          if ((payload.new as { status: string }).status !== story.status) {
            toast.info("Story status changed by another admin.");
            setIsModifiedExternally(true);
            onUpdate();
            setTimeout(() => onClose(), 2000);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, story.id]);

  async function loadUserData() {
    try {
      // Load initiator
      const { data: initiatorData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', story.initiator_id)
        .single();
      setInitiator(initiatorData);

      // Load partner
      const { data: partnerData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', story.partner_id)
        .single();
      setPartner(partnerData);

      // Load initiator stats
      const initiatorStatsData = await loadUserStats(story.initiator_id);
      setInitiatorStats(initiatorStatsData);

      // Load partner stats
      const partnerStatsData = await loadUserStats(story.partner_id);
      setPartnerStats(partnerStatsData);

      const validInitiatorId = requireValidUUID(story.initiator_id, 'initiator ID');
      const validPartnerId = requireValidUUID(story.partner_id, 'partner ID');
      
      // Load conversation between them (Using 'dates' table context implicitly via logic)
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(seeker_id.eq.${validInitiatorId},earner_id.eq.${validPartnerId}),and(seeker_id.eq.${validPartnerId},earner_id.eq.${validInitiatorId})`)
        .maybeSingle();

      if (conversation) {
        const { data: messages } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });

        const { count: videoDates } = await supabase
          .from('video_dates')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('status', 'completed');

        const avgMessageLength = messages?.length
          ? Math.round(messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length)
          : 0;

        setConversationStats({
          firstMessage: messages?.[0]?.created_at,
          totalMessages: messages?.length || 0,
          avgMessageLength,
          videoDates: videoDates || 0
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async function loadUserStats(userId: string): Promise<UserStats> {
    const validUserId = requireValidUUID(userId, 'user ID');
    
    const { count: conversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .or(`seeker_id.eq.${validUserId},earner_id.eq.${validUserId}`);

    const { count: videoDates } = await supabase
      .from('video_dates')
      .select('*', { count: 'exact', head: true })
      .or(`seeker_id.eq.${validUserId},earner_id.eq.${validUserId}`)
      .eq('status', 'completed');

    // Query transactions table for earnings/spending
    const { data: txData } = await supabase
      .from('transactions')
      .select('credits_amount, transaction_type')
      .eq('user_id', validUserId);

    let totalSpent = 0;
    let totalEarned = 0;

    txData?.forEach(entry => {
      const amount = entry.credits_amount || 0;
      if (entry.transaction_type === 'purchase' || entry.transaction_type === 'spend') {
        totalSpent += Math.abs(amount);
      } else if (entry.transaction_type === 'earning' || entry.transaction_type === 'video_earning') {
        totalEarned += amount;
      }
    });

    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId);

    return {
      conversations: conversations || 0,
      videoDates: videoDates || 0,
      totalSpent,
      totalEarned,
      messageCount: messageCount || 0
    };
  }

  async function handleApprove() {
    setLoading(true);
    try {
      const { error: storyError } = await supabase
        .from('success_stories')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: adminNotes,
          alumni_access_granted: true
        })
        .eq('id', story.id);

      if (storyError) throw storyError;

      const deliveryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const { error: giftCardError } = await supabase
        .from('scheduled_gift_cards')
        .insert({
          success_story_id: story.id,
          scheduled_for: deliveryDate.toISOString(),
          status: 'pending'
        });

      if (giftCardError) throw giftCardError;

      const alumniExpiry = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000);
      const { error: userError } = await supabase
        .from('profiles')
        .update({
          account_status: 'alumni',
          alumni_access_expires: alumniExpiry.toISOString()
        })
        .in('id', [story.initiator_id, story.partner_id]);

      if (userError) throw userError;

      toast.success('Story approved! Alumni access granted & rewards scheduled.');
      setShowApproveDialog(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error approving story:', error);
      toast.error('Failed to approve story');
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const { error: storyError } = await supabase
        .from('success_stories')
        .update({
          status: 'rejected_fraud',
          reviewed_at: new Date().toISOString(),
          review_notes: `${adminNotes}\n\nRejection reason: ${rejectReason}`
        })
        .eq('id', story.id);

      if (storyError) throw storyError;

      const { error: flagError } = await supabase
        .from('fraud_flags')
        .insert([
          {
            user_id: story.initiator_id,
            flag_type: 'success_story_fraud',
            severity: 'HIGH',
            reason: `Success story rejected: ${rejectReason}`,
            details: { story_id: story.id }
          },
          {
            user_id: story.partner_id,
            flag_type: 'success_story_fraud',
            severity: 'HIGH',
            reason: `Success story rejected: ${rejectReason}`,
            details: { story_id: story.id }
          }
        ]);

      if (flagError) throw flagError;

      toast.success('Story rejected and users flagged');
      setShowRejectDialog(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error rejecting story:', error);
      toast.error('Failed to reject story');
    } finally {
      setLoading(false);
    }
  }

  const isPending = story.status === 'pending_review' || story.status === 'under_investigation';
  const isHighRisk = story.fraud_risk === 'HIGH';

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl h-[95vh] sm:max-h-[90vh] p-0 flex flex-col bg-[#0a0a0f] border-white/10">
          
          {/* Sticky Header */}
          <DialogHeader className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0a0f] z-10 shrink-0">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white/50 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <DialogTitle className="text-lg">Story Review</DialogTitle>
                {isModifiedExternally && <p className="text-xs text-red-400">Modified by another admin</p>}
              </div>
            </div>
            {getRiskBadge(story.fraud_risk)}
          </DialogHeader>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 p-4 sm:p-6 space-y-6">
            
            {/* User Header */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 overflow-hidden">
                <Avatar className="h-12 w-12 border border-white/20 shrink-0">
                  <AvatarImage src={initiator?.profile_photos?.[0]} />
                  <AvatarFallback className="bg-rose-500/20 text-rose-400 font-bold">
                    {initiator?.name?.charAt(0) || 'I'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{initiator?.name}</p>
                  <p className="text-xs text-white/50 truncate">{initiator?.email}</p>
                </div>
              </div>
              
              <div className="text-center px-2">
                <span className="text-2xl">💕</span>
              </div>

              <div className="flex items-center gap-3 overflow-hidden text-right">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{partner?.name}</p>
                  <p className="text-xs text-white/50 truncate">{partner?.email}</p>
                </div>
                <Avatar className="h-12 w-12 border border-white/20 shrink-0">
                  <AvatarImage src={partner?.profile_photos?.[0]} />
                  <AvatarFallback className="bg-purple-500/20 text-purple-400 font-bold">
                    {partner?.name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Fraud Warning */}
            {isHighRisk && story.fraud_flags && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-start gap-3">
                <Shield className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-400">High Risk Detected</h4>
                  <p className="text-xs text-red-300/70 mt-1">
                    AI scoring has flagged this story with high risk indicators. Review carefully.
                  </p>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard title="Initiator Stats" user={initiator} stats={initiatorStats} />
              <StatCard title="Partner Stats" user={partner} stats={partnerStats} />
            </div>

            {/* Connection Details */}
            {conversationStats && (
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> Connection Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <StatItem label="Total Messages" value={conversationStats.totalMessages} />
                  <StatItem label="Avg Length" value={`${conversationStats.avgMessageLength} chars`} />
                  <StatItem label="Video Dates" value={conversationStats.videoDates} />
                  <StatItem label="First Msg" value={conversationStats.firstMessage ? new Date(conversationStats.firstMessage).toLocaleDateString() : 'N/A'} />
                </div>
              </div>
            )}

            {/* Photos */}
            <div>
              <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Couple Photos
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative aspect-square bg-white/5 rounded-lg overflow-hidden border border-white/10">
                  {story.initiator_photo_url ? (
                    <img src={story.initiator_photo_url} className="object-cover w-full h-full" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs">No Photo</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white text-center truncate">
                    {initiator?.name}'s Upload
                  </div>
                </div>
                <div className="relative aspect-square bg-white/5 rounded-lg overflow-hidden border border-white/10">
                  {story.partner_photo_url ? (
                    <img src={story.partner_photo_url} className="object-cover w-full h-full" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs">No Photo</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white text-center truncate">
                    {partner?.name}'s Upload
                  </div>
                </div>
              </div>
            </div>

            {/* Story Text */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-white/50 uppercase">Story</Label>
                <p className="p-3 bg-white/5 rounded-lg text-sm text-white/90 border border-white/5 mt-1">
                  {story.story_text}
                </p>
              </div>
              {story.improvement_suggestions && (
                <div>
                  <Label className="text-xs text-white/50 uppercase">Suggestions</Label>
                  <p className="p-3 bg-white/5 rounded-lg text-sm text-white/90 border border-white/5 mt-1">
                    {story.improvement_suggestions}
                  </p>
                </div>
              )}
            </div>
            
            {/* Admin Notes Input (Sticky area consideration: place near bottom) */}
            {isPending && (
               <div className="pb-2">
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Review notes..."
                    className="mt-2 bg-black/20 border-white/10"
                    rows={3}
                  />
               </div>
            )}

          </ScrollArea>

          {/* Sticky Footer Actions */}
          {isPending && !isModifiedExternally && (
            <div className="p-4 border-t border-white/10 bg-[#0a0a0f] shrink-0 space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={loading}
                  className="flex-1 h-12"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => setShowApproveDialog(true)}
                  disabled={loading}
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve & Reward
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Approve */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent className="bg-[#0a0a0f] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Approve Success Story?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This will mark the story as approved and schedule gift cards for both users. 
              Both users will be granted Alumni status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Confirm Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Reject */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="bg-[#0a0a0f] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Reject as Fraud?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This will reject the story and flag both users with a "Success Story Fraud" alert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
             <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="bg-black/20 border-white/10"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={loading || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject & Flag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Helper Sub-components
function StatCard({ title, user, stats }: any) {
  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
      <h4 className="text-sm font-bold text-white">{title}</h4>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-white/50">Account Age</span>
          <span className="text-white">{user?.created_at ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000) : 0}d</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Conversations</span>
          <span className="text-white">{stats?.conversations || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Video Dates</span>
          <span className="text-white">{stats?.videoDates || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50">Total Activity</span>
          <span className="text-white">{stats?.totalSpent + stats?.totalEarned || 0} cr</span>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }: any) {
  return (
    <div className="flex justify-between">
      <span className="text-white/50">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

function getRiskBadge(risk: string | null) {
  if (!risk) return null;
  const style = risk === 'HIGH' 
    ? 'bg-red-500/20 text-red-400 border-red-500/30' 
    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  
  return (
    <Badge variant="outline" className={`border text-xs ${style}`}>
      {risk}
    </Badge>
  );
}