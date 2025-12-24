import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Mail, 
  MessageSquare, 
  Clock, 
  MapPin,
  Send,
  CheckCircle2,
  HelpCircle,
  CreditCard,
  Shield,
  Bug
} from 'lucide-react';
import { toast } from 'sonner';

const contactReasons = [
  { value: 'general', label: 'General Inquiry', icon: MessageSquare },
  { value: 'support', label: 'Technical Support', icon: Bug },
  { value: 'billing', label: 'Billing & Credits', icon: CreditCard },
  { value: 'safety', label: 'Safety Concern', icon: Shield },
  { value: 'feedback', label: 'Feedback & Suggestions', icon: HelpCircle },
  { value: 'partnership', label: 'Partnership Inquiry', icon: Mail },
];

export default function Contact() {
  const { user, profile } = useAuth();
  
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    reason: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason) {
      toast.error('Please select a reason for contacting us');
      return;
    }
    
    if (!formData.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    
    if (formData.message.trim().length < 20) {
      toast.error('Please provide more details in your message (at least 20 characters)');
      return;
    }

    setSubmitting(true);

    // Simulate sending - in production, this would call an edge function
    await new Promise(resolve => setTimeout(resolve, 1500));

    setSubmitted(true);
    toast.success('Message sent successfully!');
    setSubmitting(false);
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
            <h1 className="text-3xl font-bold mb-4">Message Sent!</h1>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Thank you for reaching out. Our team typically responds within 24 hours 
              during business days. We'll get back to you at <strong>{formData.email}</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => setSubmitted(false)}>
                Send Another Message
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
      
      <div className="container py-12">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
              Contact Us
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Have a question or need assistance? We're here to help. 
              Fill out the form below and we'll get back to you soon.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Help */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Quick Help</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Before contacting us, you might find your answer in our resources:
                </p>
                <div className="space-y-2">
                  <Link 
                    to="/help" 
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Help Center & FAQs
                  </Link>
                  <Link 
                    to="/safety" 
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Shield className="w-4 h-4" />
                    Safety Guidelines
                  </Link>
                  <Link 
                    to="/guidelines" 
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Community Guidelines
                  </Link>
                </div>
              </div>

              {/* Contact Details */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Get in Touch</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Email</p>
                      <a 
                        href="mailto:support@lynxxclub.com" 
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        support@lynxxclub.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Response Time</p>
                      <p className="text-sm text-muted-foreground">
                        Within 24 hours (business days)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Location</p>
                      <p className="text-sm text-muted-foreground">
                        Highland, Michigan, USA
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency */}
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
                <h3 className="font-semibold text-destructive mb-2">Emergency?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you're in immediate danger, contact emergency services.
                </p>
                <Link 
                  to="/safety" 
                  className="text-sm text-destructive hover:underline font-medium"
                >
                  View Safety Resources →
                </Link>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 md:p-8 space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                      maxLength={100}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      required
                      maxLength={255}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason for Contact *</Label>
                  <Select value={formData.reason} onValueChange={(value) => handleChange('reason', value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select a reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contactReasons.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          <div className="flex items-center gap-2">
                            <reason.icon className="w-4 h-4" />
                            {reason.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your inquiry"
                    value={formData.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    required
                    maxLength={200}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Please provide as much detail as possible..."
                    value={formData.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    required
                    rows={6}
                    maxLength={2000}
                    className="bg-background resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formData.message.length}/2000 characters
                  </p>
                </div>

                <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p>
                    By submitting this form, you agree to our{' '}
                    <Link to="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                    . We'll only use your information to respond to your inquiry.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-12 text-center">
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                About Us
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {user && <MobileNav />}
    </div>
  );
}
