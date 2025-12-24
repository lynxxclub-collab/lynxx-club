import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Heart, 
  ArrowLeft, 
  ArrowRight, 
  Camera, 
  Upload, 
  Loader2, 
  Check, 
  AlertTriangle,
  Video,
  MessageSquare,
  Shield,
  Star,
  Search,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StoryData {
  id: string;
  initiator_id: string;
  partner_id: string;
  status: string;
  initiator_survey_completed: boolean;
  partner_survey_completed: boolean;
}

const HELPFUL_FEATURES = [
  { id: 'video_dates', label: 'Video dates', icon: Video },
  { id: 'messaging', label: 'Messaging system', icon: MessageSquare },
  { id: 'verification', label: 'Profile verification', icon: UserCheck },
  { id: 'safety', label: 'Safety features', icon: Shield },
  { id: 'ratings', label: 'Rating system', icon: Star },
  { id: 'search', label: 'Search filters', icon: Search },
];

export default function SuccessStorySurvey() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [story, setStory] = useState<StoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);

  // Survey data
  const [howWeMet, setHowWeMet] = useState('');
  const [helpfulFeatures, setHelpfulFeatures] = useState<string[]>([]);
  const [firstDateType, setFirstDateType] = useState<string>('');
  const [daysUntilFirstDate, setDaysUntilFirstDate] = useState<number | ''>('');
  const [couplePhoto, setCouplePhoto] = useState<File | null>(null);
  const [couplePhotoPreview, setCouplePhotoPreview] = useState<string | null>(null);
  const [shareOption, setShareOption] = useState<'public' | 'anonymous' | 'private'>('private');
  const [giftCardEmail, setGiftCardEmail] = useState('');
  const [improvements, setImprovements] = useState('');

  useEffect(() => {
    if (!storyId || !user) return;
    fetchStory();
  }, [storyId, user]);

  async function fetchStory() {
    if (!storyId || !user) return;
    setLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('success_stories')
        .select('*')
        .eq('id', storyId)
        .single();

      if (fetchError || !data) {
        setError('Story not found');
        setLoading(false);
        return;
      }

      // Verify user is part of this story
      if (data.initiator_id !== user.id && data.partner_id !== user.id) {
        setError('You are not authorized to complete this survey');
        setLoading(false);
        return;
      }

      // Check if story is confirmed
      if (data.status !== 'partner_confirmed' && data.status !== 'survey_completed') {
        setError('This story has not been confirmed yet');
        setLoading(false);
        return;
      }

      // Check if user already completed survey
      const isInitiator = data.initiator_id === user.id;
      const userCompleted = isInitiator ? data.initiator_survey_completed : data.partner_survey_completed;
      
      if (userCompleted) {
        setError('You have already completed this survey');
        setLoading(false);
        return;
      }

      setStory(data);
      
      // Pre-fill email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();
      
      if (profile?.email) {
        setGiftCardEmail(profile.email);
      }
    } catch (err) {
      console.error('Error fetching story:', err);
      setError('Failed to load story');
    } finally {
      setLoading(false);
    }
  }

  const handleFeatureToggle = (featureId: string) => {
    setHelpfulFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(f => f !== featureId)
        : [...prev, featureId]
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setCouplePhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCouplePhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return howWeMet.trim().length >= 20;
      case 2:
        return helpfulFeatures.length > 0 && firstDateType && daysUntilFirstDate !== '';
      case 3:
        return couplePhoto !== null && shareOption !== null;
      case 4:
        return giftCardEmail.includes('@');
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!story || !user || !couplePhoto) return;

    setSubmitting(true);
    try {
      // Upload photo
      const fileExt = couplePhoto.name.split('.').pop();
      const photoPath = `${storyId}/${user.id}/couple.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('success-stories')
        .upload(photoPath, couplePhoto, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('success-stories')
        .getPublicUrl(photoPath);

      const photoUrl = urlData.publicUrl;

      // Determine which fields to update
      const isInitiator = story.initiator_id === user.id;
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (isInitiator) {
        updateData.initiator_survey_completed = true;
        updateData.initiator_photo_url = photoUrl;
        updateData.initiator_gift_card_email = giftCardEmail;
      } else {
        updateData.partner_survey_completed = true;
        updateData.partner_photo_url = photoUrl;
        updateData.partner_gift_card_email = giftCardEmail;
      }

      // First person to complete saves the shared answers
      const needsSharedAnswers = !story.initiator_survey_completed && !story.partner_survey_completed;
      if (needsSharedAnswers) {
        updateData.how_we_met = howWeMet;
        updateData.helpful_features = helpfulFeatures;
        updateData.first_date_type = firstDateType;
        updateData.days_until_first_date = daysUntilFirstDate;
        updateData.share_story = shareOption === 'public' || shareOption === 'anonymous';
        updateData.share_anonymously = shareOption === 'anonymous';
        updateData.improvement_suggestions = improvements || null;
      }

      const { error: updateError } = await supabase
        .from('success_stories')
        .update(updateData)
        .eq('id', story.id);

      if (updateError) throw updateError;

      // Check if both completed
      const { data: updatedStory } = await supabase
        .from('success_stories')
        .select('initiator_survey_completed, partner_survey_completed')
        .eq('id', story.id)
        .single();

      const bothCompleted = isInitiator 
        ? (updatedStory?.partner_survey_completed)
        : (updatedStory?.initiator_survey_completed);

      if (bothCompleted) {
        // Both completed - update status
        await supabase
          .from('success_stories')
          .update({
            status: 'survey_completed',
            survey_completed_at: new Date().toISOString()
          })
          .eq('id', story.id);

        // Run automated fraud detection
        try {
          const { data: fraudResult, error: fraudError } = await supabase.functions.invoke('run-fraud-detection', {
            body: { storyId: story.id }
          });
          
          if (fraudError) {
            console.error('Fraud detection error:', fraudError);
          } else if (fraudResult) {
            console.log('Fraud detection result:', fraudResult);
            
            // Show appropriate message based on fraud risk
            if (fraudResult.fraudRisk === 'HIGH') {
              toast.error('Your submission could not be verified and was not approved.');
            } else if (fraudResult.fraudRisk === 'MEDIUM') {
              toast.info('Your submission is under manual review. We\'ll notify you within 1-2 weeks.');
            } else {
              toast.success('Congratulations! Your story has been approved!');
            }
          }
        } catch (fraudErr) {
          console.error('Error running fraud detection:', fraudErr);
        }

        setCompleted(true);
      } else {
        setWaitingForPartner(true);
      }

      toast.success('Survey submitted successfully!');
    } catch (err: any) {
      console.error('Error submitting survey:', err);
      toast.error(err.message || 'Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-40 w-full" />
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 flex-1" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold">{error}</h1>
            <Button onClick={() => navigate('/settings')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Completed screen
  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal to-teal/80 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-white" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold">Survey Submitted!</h1>
              <p className="text-muted-foreground">Thank you for sharing your story!</p>
            </div>

            <div className="text-left p-4 bg-secondary rounded-lg space-y-3">
              <h3 className="font-medium">What happens next:</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>We'll review your submission (1-2 weeks)</li>
                <li>If approved, you'll receive:
                  <ul className="ml-4 mt-1 list-disc list-inside">
                    <li>$25 Amazon gift card</li>
                    <li>6 months Alumni Access</li>
                  </ul>
                </li>
                <li>You'll be notified via email</li>
              </ol>
            </div>

            <Button onClick={() => navigate('/settings')} size="lg" className="w-full">
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Waiting for partner screen
  if (waitingForPartner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mx-auto">
              <Heart className="w-10 h-10 text-white fill-white" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold">Survey Submitted!</h1>
              <p className="text-muted-foreground">
                Waiting for your partner to complete their survey.
              </p>
            </div>

            <div className="p-4 bg-secondary rounded-lg text-sm text-muted-foreground">
              <p>Once both of you complete the survey, your submission will be reviewed. You'll receive your gift card via email after approval.</p>
            </div>

            <Button onClick={() => navigate('/settings')} size="lg" className="w-full">
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
            <h1 className="text-xl font-display font-bold">Success Story Survey ({step}/4)</h1>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">{Math.round(progress)}% complete</p>
        </div>

        {/* Step 1: How you met */}
        {step === 1 && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">How did you meet on Lynxx Club?</Label>
                <p className="text-sm text-muted-foreground">
                  Share your story of how you connected. (Min 20 characters)
                </p>
              </div>
              
              <div className="space-y-2">
                <Textarea
                  value={howWeMet}
                  onChange={(e) => setHowWeMet(e.target.value.slice(0, 500))}
                  placeholder="We matched in January and had our first video date..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {howWeMet.length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Features and first date */}
        {step === 2 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">What features helped most?</Label>
                  <p className="text-sm text-muted-foreground">Select all that apply</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {HELPFUL_FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    const isSelected = helpfulFeatures.includes(feature.id);
                    return (
                      <button
                        key={feature.id}
                        type="button"
                        onClick={() => handleFeatureToggle(feature.id)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border text-left transition-all",
                          isSelected 
                            ? "border-pink-500 bg-pink-500/10" 
                            : "border-border hover:border-pink-500/50"
                        )}
                      >
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{feature.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">First date type</Label>
                <RadioGroup value={firstDateType} onValueChange={setFirstDateType}>
                  <div className="flex gap-4">
                    <label className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all flex-1",
                      firstDateType === 'video' ? "border-pink-500 bg-pink-500/10" : "border-border"
                    )}>
                      <RadioGroupItem value="video" />
                      <Video className="w-4 h-4" />
                      <span className="text-sm">Video date</span>
                    </label>
                    <label className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all flex-1",
                      firstDateType === 'in_person' ? "border-pink-500 bg-pink-500/10" : "border-border"
                    )}>
                      <RadioGroupItem value="in_person" />
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">In-person</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Days until first date</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={daysUntilFirstDate}
                    onChange={(e) => setDaysUntilFirstDate(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="0"
                    min={0}
                    max={365}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">days after first message</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Photo and sharing */}
        {step === 3 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">Upload a photo together ❤️</Label>
                  <p className="text-sm text-muted-foreground">
                    Both of you must upload the same photo for verification.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                {couplePhotoPreview ? (
                  <div className="relative">
                    <img
                      src={couplePhotoPreview}
                      alt="Couple photo"
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2"
                    >
                      Change Photo
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-square rounded-lg border-2 border-dashed border-border hover:border-pink-500 transition-colors flex flex-col items-center justify-center gap-3"
                  >
                    <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-pink-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Upload Photo</p>
                      <p className="text-sm text-muted-foreground">JPG, PNG up to 5MB</p>
                    </div>
                  </button>
                )}

                <div className="p-3 bg-secondary rounded-lg text-sm space-y-1">
                  <p className="font-medium flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-gold" />
                    Important:
                  </p>
                  <ul className="text-muted-foreground list-disc list-inside">
                    <li>Photo must include both of you</li>
                    <li>No filters or heavy edits</li>
                    <li>Will be verified by our team</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Can we share your story?</Label>
                <RadioGroup value={shareOption} onValueChange={(v) => setShareOption(v as any)}>
                  <label className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    shareOption === 'public' ? "border-pink-500 bg-pink-500/10" : "border-border"
                  )}>
                    <RadioGroupItem value="public" className="mt-0.5" />
                    <div>
                      <p className="font-medium">Yes, use our names & photo</p>
                      <p className="text-sm text-muted-foreground">Featured on our success stories page</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    shareOption === 'anonymous' ? "border-pink-500 bg-pink-500/10" : "border-border"
                  )}>
                    <RadioGroupItem value="anonymous" className="mt-0.5" />
                    <div>
                      <p className="font-medium">Yes, but keep us anonymous</p>
                      <p className="text-sm text-muted-foreground">Story shared without names or photo</p>
                    </div>
                  </label>
                  <label className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    shareOption === 'private' ? "border-pink-500 bg-pink-500/10" : "border-border"
                  )}>
                    <RadioGroupItem value="private" className="mt-0.5" />
                    <div>
                      <p className="font-medium">No, keep it private</p>
                      <p className="text-sm text-muted-foreground">Only used for verification</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Email and feedback */}
        {step === 4 && (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-medium">Email for gift card</Label>
                <Input
                  type="email"
                  value={giftCardEmail}
                  onChange={(e) => setGiftCardEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <p className="text-sm text-muted-foreground">
                  Your $25 Amazon gift card will be sent here
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">What could we improve? (Optional)</Label>
                <Textarea
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value.slice(0, 500))}
                  placeholder="Any suggestions to make Lynxx Club better..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {improvements.length}/500 characters
                </p>
              </div>

              <div className="p-4 bg-secondary rounded-lg text-sm space-y-2">
                <p className="font-medium">By submitting:</p>
                <ul className="text-muted-foreground list-disc list-inside space-y-1">
                  <li>I confirm this information is accurate</li>
                  <li>I understand this will be reviewed (1-2 weeks)</li>
                  <li>Gift card sent after approval</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={submitting} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {step < 4 ? (
            <Button 
              onClick={handleNext} 
              disabled={!canProceed()}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={!canProceed() || submitting}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Submit Survey
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
