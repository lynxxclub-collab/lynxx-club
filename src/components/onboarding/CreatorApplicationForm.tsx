import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Sparkles, Star } from 'lucide-react';

interface Props {
  onSubmitted?: () => void;
}

export default function CreatorApplicationForm({ onSubmitted }: Props) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [displayName, setDisplayName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [socialLink, setSocialLink] = useState('');
  const [whyJoin, setWhyJoin] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error('Please sign in to apply');
      return;
    }

    if (!displayName.trim()) {
      toast.error('Please enter your display name');
      return;
    }

    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    if (!whyJoin.trim() || whyJoin.trim().length < 20) {
      toast.error('Please tell us why you want to be a creator (at least 20 characters)');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('creator_applications')
        .insert({
          user_id: user.id,
          display_name: displayName.trim(),
          email: email.trim(),
          social_link: socialLink.trim() || null,
          why_join: whyJoin.trim(),
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already submitted an application');
        } else {
          throw error;
        }
        return;
      }

      setSubmitted(true);
      toast.success('Application submitted successfully!');
      onSubmitted?.();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="glass-card max-w-lg mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h3 className="text-2xl font-display font-bold mb-3">Application Received!</h3>
          <p className="text-muted-foreground mb-6">
            Thank you for your interest in becoming a Lynxx Club creator. We'll review your application and get back to you within 48 hours.
          </p>
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-sm text-primary">
              Check your email for updates on your application status.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-rose-500/20 flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-amber-400" />
        </div>
        <CardTitle className="text-2xl font-display">Apply to Become a Creator</CardTitle>
        <CardDescription>
          Creator spots are limited during early access. We're onboarding a small group to ensure quality, stability, and fair earnings.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="How should we call you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="socialLink">Social / Profile Link (optional)</Label>
            <Input
              id="socialLink"
              placeholder="Instagram, Twitter, or LinkedIn URL"
              value={socialLink}
              onChange={(e) => setSocialLink(e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              Helps us verify your identity and speeds up approval
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whyJoin">Why do you want to be a creator on Lynxx Club?</Label>
            <Textarea
              id="whyJoin"
              placeholder="Tell us a bit about yourself and why you'd be a great fit..."
              value={whyJoin}
              onChange={(e) => setWhyJoin(e.target.value)}
              className="min-h-[120px] resize-none"
              required
            />
            <p className="text-xs text-muted-foreground">
              {whyJoin.length}/20 minimum characters
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By applying, you agree to our terms of service and creator guidelines.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
