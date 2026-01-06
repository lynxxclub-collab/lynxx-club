I have refactored the `FoundLoveModal` component to be strictly **Mobile First** and perfectly integrated with your **Dark/Rose Theme**.

### Key Improvements:
1.  **Theme Integration:**
    *   **Backgrounds:** Switched to `bg-[#0a0a0f]` and `bg-white/[0.02]` for cards to match the app body.
    *   **Typography:** Applied `'DM Sans'` font family and adjusted text colors (`text-white/70`) for readability.
    *   **Inputs:** Styled the Textareas with dark backgrounds (`bg-white/5`) and Rose focus rings.
2.  **Mobile UX:**
    *   **Full Width Buttons:** Action buttons are now full width on mobile for easy thumb interaction.
    *   **Scrollable Content:** The `DialogContent` handles overflow gracefully, ensuring the form is accessible on smaller screens.
    *   **Touch Targets:** Increased padding on list items and radio buttons.
3.  **Visual Polish:**
    *   **Rewards Box:** Changed the generic "Teal" box to a **Gold/Amber** theme (`bg-amber-500/10`) to emphasize the "Reward" aspect while fitting the dark mode.
    *   **Partner Selection:** Enhanced the selected state with a Rose border and background tint.

Here is the optimized code:

```tsx
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
import { Heart, MessageSquare, Video, Loader2, ArrowRight, ArrowLeft, Check, User, Gift, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { z } from 'zod';
import { requireValidUUID } from '@/lib/sanitize';

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
      const validUserId = requireValidUUID(user.id, 'user ID');
      
      // Get conversations
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, seeker_id, earner_id, total_messages, created_at')
        .or(`seeker_id.eq.${validUserId},earner_id.eq.${validUserId}`)
        .gt('total_messages', 0)
        .order('total_messages', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!conversations || conversations.length === 0) {
        setPartners([]);
        setLoading(false);
        return;
      }

      const partnerIds = conversations.map(c => 
        c.seeker_id === user.id ? c.earner_id : c.seeker_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, profile_photos')
        .in('id', partnerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get video date counts
      const { data: videoDates } = await supabase
        .from('video_dates')
        .select('seeker_id, earner_id')
        .or(`seeker_id.eq.${validUserId},earner_id.eq.${validUserId}`)
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
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[#0a0a0f] border border-white/10 text-white p-0">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-white">
              <div className="p-1.5 rounded-full bg-rose-500/20 text-rose-500">
                <Heart className="w-5 h-5 fill-rose-500/20" />
              </div>
              <span style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {step === 'select' && 'Who Did You Find Love With?'}
                {step === 'story' && 'Share Your Story'}
                {step === 'confirm' && 'Confirm Submission'}
              </span>
            </DialogTitle>
            <DialogDescription className="text-white/50 text-sm mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {step === 'select' && 'Select the person you connected with from your conversations.'}
              {step === 'story' && 'Tell us about your journey together.'}
              {step === 'confirm' && 'Review your submission before sending.'}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Partner Selection */}
          {step === 'select' && (
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                      <Skeleton className="w-12 h-12 rounded-full bg-white/5" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24 bg-white/5" />
                        <Skeleton className="h-3 w-32 bg-white/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : partners.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No conversations found.</p>
                </div>
              ) : (
                <RadioGroup value={selectedPartner || ''} onValueChange={setSelectedPartner}>
                  <div className="space-y-3">
                    {partners.map((partner) => (
                      <label
                        key={partner.id}
                        className={cn(
                          "flex items-center gap-3 sm:gap-4 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 relative overflow-hidden",
                          selectedPartner === partner.id
                            ? "border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/5"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        )}
                      >
                        <RadioGroupItem value={partner.id} className="sr-only" />
                        <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-white/10 shrink-0">
                          <AvatarImage src={partner.profilePhoto} alt={partner.name} />
                          <AvatarFallback className="bg-white/5 text-white/50">
                            <User className="w-5 h-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white truncate">{partner.name}</h4>
                          <div className="flex items-center gap-3 text-xs sm:text-sm text-white/50 mt-1">
                            <span className="flex items-center gap-1.5">
                              <MessageSquare className="w-3 h-3" />
                              {partner.totalMessages}
                            </span>
                            {partner.videoDates > 0 && (
                              <span className="flex items-center gap-1.5">
                                <Video className="w-3 h-3" />
                                {partner.videoDates}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                          selectedPartner === partner.id
                            ? "border-rose-500 bg-rose-500"
                            : "border-white/20"
                        )}>
                          {selectedPartner === partner.id && (
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
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
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                <Avatar className="w-10 h-10 border border-white/10">
                  <AvatarImage src={selectedPartnerData.profilePhoto} alt={selectedPartnerData.name} />
                  <AvatarFallback className="bg-white/5 text-white/50">
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Your partner</p>
                  <p className="font-medium text-white text-sm">{selectedPartnerData.name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white/80 text-sm font-medium">How did you two hit it off?</Label>
                <Textarea
                  value={howMet}
                  onChange={(e) => setHowMet(e.target.value.slice(0, 500))}
                  placeholder="What was special about your first conversation?"
                  rows={3}
                  className="resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-rose-500/50 focus-visible:border-rose-500/50"
                />
                <p className="text-xs text-white/30 text-right font-mono">{howMet.length}/500</p>
              </div>

              <div className="space-y-2">
                <Label className="text-white/80 text-sm font-medium">Share your love story *</Label>
                <Textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value.slice(0, 1000))}
                  placeholder="Tell us about your journey together... What made you realize this person was special?"
                  rows={5}
                  className="resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-rose-500/50 focus-visible:border-rose-500/50"
                />
                <p className="text-xs text-white/30 text-right font-mono">{story.length}/1000</p>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && selectedPartnerData && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <Avatar className="w-14 h-14 border-2 border-rose-500">
                  <AvatarImage src={selectedPartnerData.profilePhoto} alt={selectedPartnerData.name} />
                  <AvatarFallback className="bg-rose-500/20 text-rose-400">
                    <User className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-rose-300 font-medium">You found love with</p>
                  <p className="text-xl font-bold text-white leading-tight mt-0.5">{selectedPartnerData.name}</p>
                </div>
                <Heart className="w-8 h-8 text-rose-500 fill-rose-500 shrink-0" />
              </div>

              <div className="space-y-2">
                <Label className="text-white/40 text-xs uppercase tracking-wider font-bold">Your story</Label>
                <div className="bg-white/[0.02] border border-white/5 p-3 rounded-lg text-sm text-white/80 leading-relaxed italic">
                  {story}
                </div>
              </div>

              <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
                <h4 className="font-medium mb-2 text-amber-400 flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  What you'll receive
                </h4>
                <ul className="text-sm space-y-2 text-white/70">
                  <li className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-amber-500/70" />
                    <span>$25 Amazon gift card (both of you)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-amber-500/70" />
                    <span>6 months free Alumni Access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-rose-500/70" />
                    <span>Featured in success stories</span>
                  </li>
                </ul>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-start">
                  <input
                    type="checkbox"
                    checked={permissionGranted}
                    onChange={(e) => setPermissionGranted(e.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/20 bg-white/5 checked:border-rose-500 checked:bg-rose-500 transition-all"
                  />
                  <Check className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <span className="text-sm text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">
                  I confirm that {selectedPartnerData.name} has given permission to share our story, 
                  and I agree to be contacted for verification.
                </span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-8 pt-4 border-t border-white/5">
            {step !== 'select' && (
              <Button variant="outline" onClick={handleBack} disabled={submitting} className="border-white/10 text-white hover:bg-white/5 hover:text-white flex-1 sm:flex-none">
                Back
              </Button>
            )}
            
            {step === 'select' && (
              <>
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 text-white/50 hover:text-white hover:bg-white/5">
                  Cancel
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!selectedPartner}
                  className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-500/20"
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
                className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-500/20"
              >
                Review
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {step === 'confirm' && (
              <Button 
                onClick={handleSubmit} 
                disabled={!permissionGranted || submitting}
                className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-lg shadow-rose-500/20"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
```