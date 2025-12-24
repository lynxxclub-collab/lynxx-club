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
  ArrowLeft
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
  credit_balance: number | null;
  earnings_balance: number | null;
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

  useEffect(() => {
    if (open) {
      loadUserData();
    }
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

      // Load conversation between them
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(seeker_id.eq.${story.initiator_id},earner_id.eq.${story.partner_id}),and(seeker_id.eq.${story.partner_id},earner_id.eq.${story.initiator_id})`)
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
    const { count: conversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .or(`seeker_id.eq.${userId},earner_id.eq.${userId}`);

    const { count: videoDates } = await supabase
      .from('video_dates')
      .select('*', { count: 'exact', head: true })
      .or(`seeker_id.eq.${userId},earner_id.eq.${userId}`)
      .eq('status', 'completed');

    const { data: transactions } = await supabase
      .from('transactions')
      .select('usd_amount, transaction_type')
      .eq('user_id', userId);

    let totalSpent = 0;
    let totalEarned = 0;
    transactions?.forEach(t => {
      const amount = Math.abs(Number(t.usd_amount) || 0);
      if (t.transaction_type === 'earning' || t.transaction_type === 'video_earning') {
        totalEarned += amount;
      } else if (t.transaction_type === 'purchase') {
        totalSpent += amount;
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
      // Update success story
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

      // Schedule gift card delivery (14 days from now)
      const deliveryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const { error: giftCardError } = await supabase
        .from('scheduled_gift_cards')
        .insert({
          success_story_id: story.id,
          scheduled_for: deliveryDate.toISOString(),
          status: 'pending'
        });

      if (giftCardError) throw giftCardError;

      // Update both users to alumni status
      const alumniExpiry = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000);
      const { error: userError } = await supabase
        .from('profiles')
        .update({
          account_status: 'alumni',
          alumni_access_expires: alumniExpiry.toISOString()
        })
        .in('id', [story.initiator_id, story.partner_id]);

      if (userError) throw userError;

      toast.success('Success story approved! Gift cards scheduled for delivery in 14 days.');
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
      // Update success story
      const { error: storyError } = await supabase
        .from('success_stories')
        .update({
          status: 'rejected_fraud',
          reviewed_at: new Date().toISOString(),
          review_notes: `${adminNotes}\n\nRejection reason: ${rejectReason}`
        })
        .eq('id', story.id);

      if (storyError) throw storyError;

      // Create fraud flags for both users
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

      toast.success('Success story rejected and users flagged');
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

  async function handleMarkForInvestigation() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('success_stories')
        .update({
          status: 'under_investigation',
          review_notes: adminNotes
        })
        .eq('id', story.id);

      if (error) throw error;

      toast.success('Marked for further investigation');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating story:', error);
      toast.error('Failed to update story');
    } finally {
      setLoading(false);
    }
  }

  function getRiskBadge(risk: string | null, score: number | null) {
    const badgeContent = `${risk || 'Unknown'} ${score !== null ? `(${score})` : ''}`;
    switch (risk) {
      case 'HIGH':
        return <Badge variant="destructive" className="text-sm">🚨 {badgeContent}</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-500 text-sm">⚠️ {badgeContent}</Badge>;
      case 'LOW':
        return <Badge className="bg-green-500 text-sm">✅ {badgeContent}</Badge>;
      default:
        return <Badge variant="outline">{badgeContent}</Badge>;
    }
  }

  function getAccountAge(createdAt: string | null): string {
    if (!createdAt) return 'N/A';
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return `${days} days`;
  }

  const isPending = story.status === 'pending_review' || story.status === 'under_investigation';

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0">
          <ScrollArea className="max-h-[95vh]">
            <div className="p-6 space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </div>
                <DialogTitle className="text-xl">Success Story Review</DialogTitle>
              </DialogHeader>

              {/* Users Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={initiator?.profile_photos?.[0]} />
                    <AvatarFallback>{initiator?.name?.charAt(0) || 'I'}</AvatarFallback>
                  </Avatar>
                  <span className="text-lg font-medium">{initiator?.name || 'Initiator'}</span>
                  <span className="text-2xl">❤️</span>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={partner?.profile_photos?.[0]} />
                    <AvatarFallback>{partner?.name?.charAt(0) || 'P'}</AvatarFallback>
                  </Avatar>
                  <span className="text-lg font-medium">{partner?.name || 'Partner'}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Submitted: {story.created_at ? new Date(story.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                  {getRiskBadge(story.fraud_risk, story.fraud_score)}
                </div>
              </div>

              <Separator />

              {/* Fraud Flags */}
              {story.fraud_flags && Array.isArray(story.fraud_flags) && story.fraud_flags.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Triggered Fraud Flags
                  </h4>
                  <div className="space-y-2">
                    {story.fraud_flags.map((flag: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Badge variant={flag.severity === 'HIGH' ? 'destructive' : 'secondary'}>
                          {flag.severity}
                        </Badge>
                        <span>{flag.description || flag.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Summary */}
              <div>
                <h4 className="font-semibold mb-3">Activity Summary</h4>
                <div className="grid grid-cols-2 gap-6">
                  {/* Initiator Stats */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h5 className="font-medium mb-2">{initiator?.name || 'Initiator'}</h5>
                    <div className="space-y-1 text-sm">
                      <p><Clock className="h-3 w-3 inline mr-1" /> Account age: {getAccountAge(initiator?.created_at)}</p>
                      <p><DollarSign className="h-3 w-3 inline mr-1" /> Total spent: ${initiatorStats?.totalSpent.toFixed(2) || '0.00'}</p>
                      <p><MessageCircle className="h-3 w-3 inline mr-1" /> Conversations: {initiatorStats?.conversations || 0}</p>
                      <p><Video className="h-3 w-3 inline mr-1" /> Video dates: {initiatorStats?.videoDates || 0}</p>
                    </div>
                  </div>

                  {/* Partner Stats */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h5 className="font-medium mb-2">{partner?.name || 'Partner'}</h5>
                    <div className="space-y-1 text-sm">
                      <p><Clock className="h-3 w-3 inline mr-1" /> Account age: {getAccountAge(partner?.created_at)}</p>
                      <p><DollarSign className="h-3 w-3 inline mr-1" /> Total earned: ${partnerStats?.totalEarned.toFixed(2) || '0.00'}</p>
                      <p><MessageCircle className="h-3 w-3 inline mr-1" /> Conversations: {partnerStats?.conversations || 0}</p>
                      <p><Video className="h-3 w-3 inline mr-1" /> Video dates: {partnerStats?.videoDates || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversation History */}
              {conversationStats && (
                <div>
                  <h4 className="font-semibold mb-3">Conversation History</h4>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-1 text-sm">
                    <p>First message: {conversationStats.firstMessage ? new Date(conversationStats.firstMessage).toLocaleDateString() : 'N/A'}</p>
                    <p>Total messages: {conversationStats.totalMessages}</p>
                    <p>
                      Avg message length: {conversationStats.avgMessageLength} chars
                      {conversationStats.avgMessageLength < 20 && (
                        <Badge variant="destructive" className="ml-2 text-xs">Suspiciously low</Badge>
                      )}
                    </p>
                    <p>Video dates completed: {conversationStats.videoDates}</p>
                  </div>
                </div>
              )}

              {/* Photos Submitted */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Photos Submitted
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{initiator?.name}'s upload:</p>
                    {story.initiator_photo_url ? (
                      <img
                        src={story.initiator_photo_url}
                        alt="Initiator's couple photo"
                        className="rounded-lg max-h-48 object-cover"
                      />
                    ) : (
                      <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                        No photo uploaded
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{partner?.name}'s upload:</p>
                    {story.partner_photo_url ? (
                      <img
                        src={story.partner_photo_url}
                        alt="Partner's couple photo"
                        className="rounded-lg max-h-48 object-cover"
                      />
                    ) : (
                      <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                        No photo uploaded
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Survey Responses */}
              <div>
                <h4 className="font-semibold mb-3">Survey Responses</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Their Story:</p>
                    <p className="bg-muted/50 p-3 rounded-lg">{story.story_text}</p>
                  </div>
                  {story.how_we_met && (
                    <div>
                      <p className="text-sm text-muted-foreground">How we met:</p>
                      <p className="bg-muted/50 p-3 rounded-lg">{story.how_we_met}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p>First date type: <span className="font-medium">{story.first_date_type || 'N/A'}</span></p>
                    <p>Days until first date: <span className="font-medium">{story.days_until_first_date ?? 'N/A'}</span></p>
                    <p>Share story: <span className="font-medium">{story.share_story ? 'Yes' : 'No'}{story.share_anonymously ? ' (anonymously)' : ''}</span></p>
                    <p>Helpful features: <span className="font-medium">{Array.isArray(story.helpful_features) ? story.helpful_features.join(', ') : 'N/A'}</span></p>
                  </div>
                  {story.improvement_suggestions && (
                    <div>
                      <p className="text-sm text-muted-foreground">Improvement suggestions:</p>
                      <p className="bg-muted/50 p-3 rounded-lg">{story.improvement_suggestions}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Admin Decision */}
              {isPending && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Admin Decision</h4>
                  <div>
                    <Label>Internal Notes</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this review..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject & Flag Users
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleMarkForInvestigation}
                      disabled={loading}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Need More Investigation
                    </Button>
                    <Button
                      onClick={() => setShowApproveDialog(true)}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve & Send Gift Cards
                    </Button>
                  </div>
                </div>
              )}

              {/* Already reviewed */}
              {!isPending && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Status: <Badge variant="outline" className="ml-2 capitalize">{story.status.replace(/_/g, ' ')}</Badge>
                  </p>
                  {story.reviewed_at && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Reviewed: {new Date(story.reviewed_at).toLocaleDateString()}
                    </p>
                  )}
                  {story.review_notes && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">Review notes:</p>
                      <p className="text-sm">{story.review_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Success Story</AlertDialogTitle>
            <AlertDialogDescription>
              This will:
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Mark the success story as approved</li>
                <li>Schedule $25 gift cards to be sent in 14 days</li>
                <li>Grant both users alumni status (6 months)</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              Approve & Schedule Gift Cards
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Success Story</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the success story and create fraud flags for both users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Reason for Rejection</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason for rejecting this success story..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={loading || !rejectReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject & Flag Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
