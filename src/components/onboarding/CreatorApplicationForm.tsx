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
import { cn } from "@/lib/utils";

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

  // Validate URL to only allow http/https protocols (prevents javascript: XSS)
  const isValidUrl = (url: string): boolean => {
    if (!url) return true;
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

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

    if (socialLink.trim() && !isValidUrl(socialLink.trim())) {
      toast.error('Please enter a valid URL (http:// or https://)');
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
      <Card className="bg-[#0f0f12] border border-white/10 shadow-2xl max-w-lg mx-auto overflow-hidden">
        <CardContent className="pt-8 pb-8 text-center px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-lg shadow-green-500/10">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Application Received!</h3>
          <p className="text-white/60 mb-6 leading-relaxed">
            Thank you for your interest in becoming a creator. We'll review your application and get back to you within 48 hours.
          </p>
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-sm text-rose-300 font-medium">
              Check your email for updates on your application status.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="bg-[#0f0f12] border border-white/10 shadow-2xl max-w-lg mx-auto overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <CardHeader className="text-center pt-6 px-6 pb-2">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-lg shadow-rose-500/5">
          <Star className="w-8 h-8 text-rose-400" />
        </div>
        <CardTitle className="text-2xl font-bold text-white tracking-tight">Apply to Become a Creator</CardTitle>
        <CardDescription className="text-white/60 mt-2">
          Creator spots are limited during early access. We're onboarding a small group to ensure quality, stability, and fair earnings.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6 px-6 pb-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-white text-sm font-medium">Display Name</Label>
            <Input
              id="displayName"
              placeholder="How should we call you?"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={cn(
                "h-12 bg-[#0a0a0f] border-white/10 text-white placeholder:text-white/30",
                "focus-visible:ring-1 focus-visible:ring-rose-500/50 focus-visible:border-rose-500/50"
              )}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "h-12 bg-[#0a0a0f] border-white/10 text-white placeholder:text-white/30",
                "focus-visible:ring-1 focus-visible:ring-rose-500/50 focus-visible:border-rose-500/50"
              )}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="socialLink" className="text-white text-sm font-medium">Social / Profile Link (optional)</Label>
            <Input
              id="socialLink"
              placeholder="Instagram, Twitter, or LinkedIn URL"
              value={socialLink}
              onChange={(e) => setSocialLink(e.target.value)}
              className={cn(
                "h-12 bg-[#0a0a0f] border-white/10 text-white placeholder:text-white/30",
                "focus-visible:ring-1 focus-visible:ring-rose-500/50 focus-visible:border-rose-500/50"
              )}
            />
            <p className="text-xs text-white/40">
              Helps us verify your identity and speeds up approval
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whyJoin" className="text-white text-sm font-medium">Why do you want to be a creator?</Label>
            <Textarea
              id="whyJoin"
              placeholder="Tell us a bit about yourself and why you'd be a great fit..."
              value={whyJoin}
              onChange={(e) => setWhyJoin(e.target.value)}
              className={cn(
                "min-h-[120px] resize-none bg-[#0a0a0f] border-white/10 text-white placeholder:text-white/30",
                "focus-visible:ring-1 focus-visible:ring-rose-500/50 focus-visible:border-rose-500/50"
              )}
              required
            />
            <div className="flex justify-between">
              <p className={cn("text-xs font-medium", whyJoin.length >= 20 ? "text-green-400" : "text-white/40")}>
                {whyJoin.length}/20 minimum characters
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full h-12 text-white font-semibold transition-all duration-300",
              "bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400",
              "shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
              "border-0"
            )}
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

          <p className="text-center text-xs text-white/30 leading-relaxed">
            By applying, you agree to our terms of service and creator guidelines.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}