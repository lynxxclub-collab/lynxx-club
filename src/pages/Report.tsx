import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  AlertTriangle, 
  Shield, 
  UserX, 
  MessageSquareWarning,
  CreditCard,
  Bug,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

const reportTypes = [
  {
    id: 'harassment',
    label: 'Harassment or Abuse',
    description: 'Threatening, bullying, or abusive behavior',
    icon: MessageSquareWarning
  },
  {
    id: 'scam',
    label: 'Scam or Fraud',
    description: 'Attempts to steal money or personal information',
    icon: CreditCard
  },
  {
    id: 'inappropriate',
    label: 'Inappropriate Content',
    description: 'Explicit, offensive, or violating content',
    icon: AlertTriangle
  },
  {
    id: 'fake_profile',
    label: 'Fake Profile',
    description: 'Impersonation or misleading profile information',
    icon: UserX
  },
  {
    id: 'underage',
    label: 'Underage User',
    description: 'User appears to be under 18 years old',
    icon: Shield
  },
  {
    id: 'technical',
    label: 'Technical Issue',
    description: 'Bug, error, or platform malfunction',
    icon: Bug
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Something else not listed above',
    icon: HelpCircle
  }
];

export default function Report() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillUserId = searchParams.get('user');
  
  const [reportType, setReportType] = useState('');
  const [reportedUsername, setReportedUsername] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportType) {
      toast.error('Please select a report type');
      return;
    }
    
    if (!description.trim()) {
      toast.error('Please provide details about the issue');
      return;
    }

    if (description.trim().length < 20) {
      toast.error('Please provide more details (at least 20 characters)');
      return;
    }

    setSubmitting(true);

    try {
      // If user is logged in, save to database
      if (user) {
        const { error } = await supabase
          .from('reports')
          .insert({
            reporter_id: user.id,
            reported_id: prefillUserId || user.id, // Use prefilled user or self for general reports
            reason: reportType,
            description: `${reportedUsername ? `Reported User: ${reportedUsername}\n\n` : ''}${description}${contactEmail ? `\n\nContact Email: ${contactEmail}` : ''}`
          });

        if (error) throw error;
      }

      setSubmitted(true);
      toast.success('Report submitted successfully');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        
        <div className="container py-12 max-w-2xl">
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal/10 mb-6">
              <CheckCircle2 className="w-10 h-10 text-teal" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Report Submitted</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Thank you for helping keep our community safe. Our team will review your report 
              within 24 hours and take appropriate action.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate(-1)}>
                Go Back
              </Button>
              <Button variant="outline" asChild>
                <Link to="/help">
                  Visit Help Center
                </Link>
              </Button>
            </div>
          </div>
        </div>
        
        {user && <MobileNav />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <div className="container py-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
            Report a Problem
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Help us maintain a safe community by reporting issues. All reports are 
            reviewed within 24 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Report Type Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">What would you like to report?</Label>
            <RadioGroup value={reportType} onValueChange={setReportType}>
              <div className="grid gap-3">
                {reportTypes.map((type) => (
                  <label
                    key={type.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      reportType === type.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={type.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <type.icon className={`w-4 h-4 ${
                          reportType === type.id ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                        <span className="font-medium">{type.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {type.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Reported User (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="username">Username of person you're reporting (optional)</Label>
            <Input
              id="username"
              placeholder="Enter their username or profile name"
              value={reportedUsername}
              onChange={(e) => setReportedUsername(e.target.value)}
              maxLength={100}
              className="bg-card"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank if reporting a general issue or technical problem.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Describe the issue *</Label>
            <Textarea
              id="description"
              placeholder="Please provide as much detail as possible. Include what happened, when it occurred, and any relevant context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              maxLength={2000}
              className="bg-card resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/2000 characters
            </p>
          </div>

          {/* Contact Email (for non-logged-in users) */}
          {!user && (
            <div className="space-y-2">
              <Label htmlFor="email">Your email address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                maxLength={255}
                className="bg-card"
              />
              <p className="text-xs text-muted-foreground">
                We'll use this to follow up on your report if needed.
              </p>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Privacy Notice</p>
            <p>
              Your report is confidential. The reported user will not know who submitted 
              the report. We may contact you for additional information if needed.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              type="submit" 
              disabled={submitting || !reportType || !description.trim()}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>

        {/* Additional Help */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Need immediate help?
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/safety" className="text-primary hover:underline">
              Safety Tips
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/help" className="text-primary hover:underline">
              Help Center
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/guidelines" className="text-primary hover:underline">
              Community Guidelines
            </Link>
          </div>
        </div>
      </div>
      
      {user && <MobileNav />}
    </div>
  );
}
