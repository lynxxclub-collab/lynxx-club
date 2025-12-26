import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Heart, MessageSquare, Video, Loader2, ArrowRight, ArrowLeft, Check, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { z } from 'zod';

// Validation schema for success story submission
const successStorySchema = z.object({
  story: z.string()
    .trim()
    .min(20, 'Story must be at least 20 characters')
    .max(1000, 'Story must be less than 1000 characters'),
  howMet: z.string()
    .trim()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  selectedPartner: z.string().uuid('Please select a valid partner'),
});

interface ConversationPartner {
  id: string;
  name: string;
  profilePhoto: string;
  totalMessages: number;
  videoDates: number;
  firstMessageDate: string;
}

interface FoundLoveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'select' | 'story' | 'confirm';

export default function FoundLoveModal({ open, onOpenChange }: FoundLoveModalProps) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>('select');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [partners, setPartners] = useState<ConversationPartner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [story, setStory] = useState('');
  const [howMet, setHowMet] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchConversationPartners();
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setStep('select');
      setSelectedPartner(null);
      setStory('');
      setHowMet('');
      setPermissionGranted(false);
    }
  }, [open]);

  async function fetchConversationPartners() {
    if (!user) return;
    setLoading(true);

    try {
      const isSeeker = profile?.user_type === 'seeker';
      
      // Get conversations
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, seeker_id, earner_id, total_messages, created_at')
        .or(`seeker_id.eq.${user.id},earner_id.eq.${user.id}`)
        .gt('total_messages', 0)
        .order('total_messages', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!conversations || conversations.length === 0) {
        setPartners([]);
        setLoading(false);
        return;
      }

      // Get partner IDs
      const partnerIds = conversations.map(c => 
        c.seeker_id === user.id ? c.earner_id : c.seeker_id
      );

      // Get partner profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, profile_photos')
        .in('id', partnerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get video date counts for each conversation
      const { data: videoDates } = await supabase
        .from('video_dates')
        .select('seeker_id, earner_id')
        .or(`seeker_id.eq.${user.id},earner_id.eq.${user.id}`)
        .eq('status', 'completed');

      const videoDateCounts = new Map<string, number>();
      videoDates?.forEach(vd => {
        const partnerId = vd.seeker_id === user.id ? vd.earner_id : vd.seeker_id;
        videoDateCounts.set(partnerId, (videoDateCounts.get(partnerId) || 0) + 1);
      });

      const partnersList: ConversationPartner[] = conversations.map(conv => {
        const partnerId = conv.seeker_id === user.id ? conv.earner_id : conv.seeker_id;
        const partnerProfile = profileMap.get(partnerId);
        
        return {
          id: partnerId,
          name: partnerProfile?.name || 'User',
          profilePhoto: partnerProfile?.profile_photos?.[0] || '',
          totalMessages: conv.total_messages,
          videoDates: videoDateCounts.get(partnerId) || 0,
          firstMessageDate: conv.created_at
        };
      });

      setPartners(partnersList);
    } catch (error) {
      console.error('Error fetching partners:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }

  const handleNext = () => {
    if (step === 'select' && selectedPartner) {
      setStep('story');
    } else if (step === 'story' && story.trim()) {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'story') {
      setStep('select');
    } else if (step === 'confirm') {
      setStep('story');
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate with Zod schema
    const validation = successStorySchema.safeParse({
      story,
      howMet: howMet || undefined,
      selectedPartner,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setSubmitting(true);
    try {
      // Calculate expiration date (5 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);

      // Save to success_stories table
      const { error } = await supabase.from('success_stories').insert({
        initiator_id: user.id,
        partner_id: validation.data.selectedPartner,
        how_met: validation.data.howMet || null,
        story_text: validation.data.story,
        partner_confirmation_expires_at: expiresAt.toISOString(),
        status: 'pending_partner_confirmation'
      });

      if (error) throw error;
      
      toast.success('Your love story has been submitted! Your partner will receive a confirmation request.');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting story:', error);
      toast.error(error.message || 'Failed to submit your story');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPartnerData = partners.find(p => p.id === selectedPartner);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
            {step === 'select' && 'Who Did You Find Love With?'}
            {step === 'story' && 'Share Your Story'}
            {step === 'confirm' && 'Confirm Submission'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select the person you connected with from your conversations.'}
            {step === 'story' && 'Tell us about your journey together.'}
            {step === 'confirm' && 'Review your submission before sending.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Partner Selection */}
        {step === 'select' && (
          <div className="space-y-4 py-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border">
                    <Skeleton className="w-14 h-14 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : partners.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No conversations found. Start chatting to find your match!
                </p>
              </div>
            ) : (
              <RadioGroup value={selectedPartner || ''} onValueChange={setSelectedPartner}>
                <div className="space-y-3">
                  {partners.map((partner) => (
                    <label
                      key={partner.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                        selectedPartner === partner.id
                          ? "border-pink-500 bg-pink-500/5"
                          : "border-border hover:border-pink-500/50"
                      )}
                    >
                      <RadioGroupItem value={partner.id} className="sr-only" />
                      <Avatar className="w-14 h-14 border-2 border-border">
                        <AvatarImage src={partner.profilePhoto} />
                        <AvatarFallback>
                          <User className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{partner.name}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {partner.totalMessages} messages
                          </span>
                          {partner.videoDates > 0 && (
                            <span className="flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              {partner.videoDates} video date{partner.videoDates !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          First message: {formatDistanceToNow(new Date(partner.firstMessageDate), { addSuffix: true })}
                        </p>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                        selectedPartner === partner.id
                          ? "border-pink-500 bg-pink-500"
                          : "border-muted-foreground"
                      )}>
                        {selectedPartner === partner.id && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>
        )}

        {/* Step 2: Story */}
        {step === 'story' && selectedPartnerData && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedPartnerData.profilePhoto} />
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Your partner</p>
                <p className="font-medium">{selectedPartnerData.name}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>How did you two hit it off?</Label>
              <Textarea
                value={howMet}
                onChange={(e) => setHowMet(e.target.value.slice(0, 500))}
                placeholder="What was special about your first conversation?"
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{howMet.length}/500</p>
            </div>

            <div className="space-y-2">
              <Label>Share your love story *</Label>
              <Textarea
                value={story}
                onChange={(e) => setStory(e.target.value.slice(0, 1000))}
                placeholder="Tell us about your journey together... What made you realize this person was special? Where are you now in your relationship?"
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{story.length}/1000</p>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && selectedPartnerData && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4 p-4 bg-pink-500/10 rounded-lg border border-pink-500/20">
              <Avatar className="w-16 h-16 border-2 border-pink-500">
                <AvatarImage src={selectedPartnerData.profilePhoto} />
                <AvatarFallback>
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">You found love with</p>
                <p className="text-xl font-display font-bold">{selectedPartnerData.name}</p>
              </div>
              <Heart className="w-8 h-8 text-pink-500 fill-pink-500 ml-auto" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Your story</Label>
              <p className="text-sm bg-secondary p-3 rounded-lg">{story}</p>
            </div>

            <div className="p-4 bg-teal/10 rounded-lg border border-teal/20">
              <h4 className="font-medium mb-2 text-teal">What you'll receive</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• $25 Amazon gift card (both of you)</li>
                <li>• 6 months free Alumni Access</li>
                <li>• Featured in success stories (optional)</li>
              </ul>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={permissionGranted}
                onChange={(e) => setPermissionGranted(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-muted-foreground">
                I confirm that {selectedPartnerData.name} has given permission to share our story, 
                and I agree to be contacted by the Lynxx Club team for verification.
              </span>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {step !== 'select' && (
            <Button variant="outline" onClick={handleBack} disabled={submitting}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {step === 'select' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!selectedPartner}
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
          
          {step === 'story' && (
            <Button 
              onClick={handleNext} 
              disabled={!story.trim()}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
            >
              Review
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {step === 'confirm' && (
            <Button 
              onClick={handleSubmit} 
              disabled={!permissionGranted || submitting}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Heart className="w-4 h-4 mr-2" />
              )}
              Submit Story
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
