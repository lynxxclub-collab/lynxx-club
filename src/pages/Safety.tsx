import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  UserX, 
  MessageSquareWarning,
  Video,
  MapPin,
  Phone,
  Heart,
  CheckCircle2,
  XCircle
} from 'lucide-react';

const safetyTips = [
  {
    icon: Eye,
    title: 'Protect Your Identity',
    tips: [
      "Don't share your full name, address, or workplace in early conversations",
      'Use the platform messaging system instead of giving out your personal phone number',
      'Never share financial information, bank details, or social security numbers',
      'Be cautious about sharing photos that reveal your location or daily routine'
    ]
  },
  {
    icon: MessageSquareWarning,
    title: 'Recognize Red Flags',
    tips: [
      'Requests for money or financial help, especially early on',
      'Refusing to video chat or always having excuses',
      'Pushing to move conversations off-platform quickly',
      'Inconsistent stories or details that don\'t add up',
      'Love bombing or excessive flattery very early',
      'Pressuring you to share intimate photos or content'
    ]
  },
  {
    icon: Video,
    title: 'Video Date Safety',
    tips: [
      'Use video dates to verify the person matches their photos',
      'Pay attention to their background - does it seem genuine?',
      'Trust your instincts if something feels off',
      'Never feel pressured to do anything you\'re uncomfortable with',
      'Report any inappropriate behavior immediately'
    ]
  },
  {
    icon: MapPin,
    title: 'Meeting in Person',
    tips: [
      'Complete multiple video dates before meeting in person',
      'Always meet in a public place with lots of people around',
      'Tell a friend or family member where you\'re going and when',
      'Arrange your own transportation - don\'t depend on your date',
      'Keep your phone charged and with you at all times',
      'Have an exit strategy if you feel uncomfortable'
    ]
  },
  {
    icon: Lock,
    title: 'Account Security',
    tips: [
      'Use a strong, unique password (12+ characters)',
      'Enable two-factor authentication when available',
      'Never share your login credentials with anyone',
      'Log out when using shared or public devices',
      'Regularly review your account activity'
    ]
  },
  {
    icon: Phone,
    title: 'If You Feel Unsafe',
    tips: [
      'Trust your instincts - if something feels wrong, it probably is',
      'End the conversation or date immediately',
      'Block and report the user on the platform',
      'If you\'re in immediate danger, call 911 or local emergency services',
      'Document any threatening messages or behavior'
    ]
  }
];

const dos = [
  'Verify profiles through video chat before meeting',
  'Keep conversations on the platform initially',
  'Meet in public places for first meetings',
  'Tell someone you trust about your plans',
  'Trust your gut feelings',
  'Report suspicious behavior immediately',
  'Take your time getting to know someone'
];

const donts = [
  "Send money to anyone you've met online",
  'Share personal/financial information too soon',
  'Ignore red flags or warning signs',
  'Feel pressured into anything uncomfortable',
  'Meet privately for the first time',
  'Ignore your instincts if something feels off',
  'Share your home or work address early on'
];

export default function Safety() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <div className="container py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal/10 mb-6">
            <Shield className="w-10 h-10 text-teal" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Your Safety Matters
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            At Lynxx Club, we're committed to creating a safe environment. 
            Here are essential tips to protect yourself while using our platform.
          </p>
        </div>

        {/* Emergency Banner */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-destructive mb-2">
                In Immediate Danger?
              </h2>
              <p className="text-muted-foreground mb-3">
                If you or someone you know is in immediate danger, please contact emergency services right away.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="destructive" size="sm" asChild>
                  <a href="tel:911">Call 911</a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://www.thehotline.org" target="_blank" rel="noopener noreferrer">
                    National Domestic Violence Hotline
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Do's and Don'ts */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-teal/5 border border-teal/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-teal" />
              <h2 className="text-xl font-bold text-teal">Do's</h2>
            </div>
            <ul className="space-y-3">
              {dos.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-teal shrink-0 mt-1" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-6 h-6 text-destructive" />
              <h2 className="text-xl font-bold text-destructive">Don'ts</h2>
            </div>
            <ul className="space-y-3">
              {donts.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-destructive shrink-0 mt-1" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Safety Tips */}
        <div className="space-y-6 mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Safety Guidelines</h2>
          
          {safetyTips.map((section, index) => (
            <div 
              key={index} 
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <section.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{section.title}</h3>
              </div>
              <ul className="space-y-3 ml-16">
                {section.tips.map((tip, tipIndex) => (
                  <li key={tipIndex} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Report Section */}
        <div className="bg-gradient-to-r from-primary/10 to-teal/10 rounded-xl p-8 text-center border border-primary/20 mb-12">
          <UserX className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">See Something Suspicious?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            If you encounter any suspicious behavior, harassment, or feel unsafe, 
            please report it immediately. Your reports help keep our community safe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <a href="mailto:safety@lynxxclub.com">
                Report to Safety Team
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/help">
                Visit Help Center
              </Link>
            </Button>
          </div>
        </div>

        {/* Resources */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Additional Resources
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a 
              href="https://www.thehotline.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <p className="font-semibold">National Domestic Violence Hotline</p>
              <p className="text-sm text-muted-foreground">1-800-799-7233</p>
            </a>
            <a 
              href="https://www.rainn.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <p className="font-semibold">RAINN</p>
              <p className="text-sm text-muted-foreground">1-800-656-4673</p>
            </a>
            <a 
              href="https://suicidepreventionlifeline.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <p className="font-semibold">Suicide Prevention Lifeline</p>
              <p className="text-sm text-muted-foreground">988</p>
            </a>
            <a 
              href="https://www.ic3.gov" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <p className="font-semibold">FBI Internet Crime Complaint Center</p>
              <p className="text-sm text-muted-foreground">Report online fraud</p>
            </a>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-12 text-center">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/guidelines" className="text-primary hover:underline">
              Community Guidelines
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/help" className="text-primary hover:underline">
              Help Center
            </Link>
          </div>
        </div>
      </div>
      
      {user && <MobileNav />}
    </div>
  );
}
