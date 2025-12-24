import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  CreditCard, 
  Video, 
  Shield, 
  Users, 
  HelpCircle,
  Mail,
  Search,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const faqCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Users,
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Click "Get Started" on our homepage and follow the onboarding process. You\'ll need to provide basic information, verify your email, and complete your profile.'
      },
      {
        q: 'What\'s the difference between a Seeker and an Earner?',
        a: 'Seekers are users looking to connect with others and pay credits for messages and video dates. Earners receive messages and earn money from interactions with Seekers.'
      },
      {
        q: 'How do I complete my profile?',
        a: 'After signing up, you\'ll be guided through our onboarding process where you can add photos, write a bio, set your location, and configure your rates (for Earners).'
      }
    ]
  },
  {
    id: 'credits',
    title: 'Credits & Payments',
    icon: CreditCard,
    questions: [
      {
        q: 'How do credits work?',
        a: 'Credits are the currency used on Lynxx Club. Seekers purchase credits to send messages (20 credits per text, 40 per image) and book video dates. 1 credit = $0.10 USD.'
      },
      {
        q: 'How do I buy credits?',
        a: 'Go to your Dashboard and click "Buy Credits" or visit the Credits page. We accept all major credit cards through our secure payment processor, Stripe.'
      },
      {
        q: 'How do Earners get paid?',
        a: 'Earners receive 70% of all credits spent on them. Earnings accumulate in your account and can be withdrawn once you\'ve connected your Stripe account and reached the minimum threshold.'
      },
      {
        q: 'What is the minimum withdrawal amount?',
        a: 'The minimum withdrawal amount is $10.00 USD. Withdrawals are processed within 2-3 business days.'
      }
    ]
  },
  {
    id: 'messaging',
    title: 'Messaging',
    icon: MessageSquare,
    questions: [
      {
        q: 'How much does it cost to send a message?',
        a: 'Text messages cost 20 credits ($2.00) and image messages cost 40 credits ($4.00). Only Seekers pay for messages.'
      },
      {
        q: 'Can Earners send messages for free?',
        a: 'Yes! Earners can reply to messages at no cost. However, the initial conversation must be started by a Seeker.'
      },
      {
        q: 'Are my messages private?',
        a: 'Yes, all messages are encrypted and private between you and the other user. We never share your conversations with third parties.'
      }
    ]
  },
  {
    id: 'video-dates',
    title: 'Video Dates',
    icon: Video,
    questions: [
      {
        q: 'How do video dates work?',
        a: 'Seekers can book video dates with Earners at their set rates. Video dates range from 15 to 90 minutes. Once booked, both parties receive a link to join the video call at the scheduled time.'
      },
      {
        q: 'What if someone doesn\'t show up?',
        a: 'If an Earner doesn\'t show up within 5 minutes of the scheduled start time, the Seeker receives a full refund. If a Seeker doesn\'t show up, the Earner still receives their payment.'
      },
      {
        q: 'Can I cancel a video date?',
        a: 'Yes, video dates can be cancelled up to 2 hours before the scheduled start time for a full refund. Cancellations within 2 hours may result in a partial charge.'
      }
    ]
  },
  {
    id: 'safety',
    title: 'Safety & Privacy',
    icon: Shield,
    questions: [
      {
        q: 'How do I report someone?',
        a: 'Click the three dots menu on any profile or in a conversation and select "Report User". Provide details about the issue and our team will investigate within 24 hours.'
      },
      {
        q: 'How do I block someone?',
        a: 'Click the three dots menu on any profile or in a conversation and select "Block User". Blocked users cannot see your profile or contact you.'
      },
      {
        q: 'Is my personal information safe?',
        a: 'Yes, we take privacy seriously. Your personal information is encrypted and never shared. We comply with GDPR and other privacy regulations. See our Privacy Policy for details.'
      }
    ]
  }
];

export default function Help() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({
    email: '',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    // Simulate sending - in production, this would call an edge function
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('Message sent! We\'ll get back to you within 24 hours.');
    setContactForm({ email: '', subject: '', message: '' });
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <div className="container py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            How can we help you?
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            Find answers to common questions or contact our support team for personalized assistance.
          </p>
          
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-12">
          {faqCategories.map((category) => (
            <a
              key={category.id}
              href={`#${category.id}`}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-center"
            >
              <category.icon className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">{category.title}</span>
            </a>
          ))}
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8 mb-16">
          {(searchQuery ? filteredCategories : faqCategories).map((category) => (
            <section key={category.id} id={category.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">{category.title}</h2>
              </div>
              
              <Accordion type="single" collapsible className="bg-card rounded-xl border border-border">
                {category.questions.map((item, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`${category.id}-${index}`}
                    className="border-border"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-secondary/50">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
          
          {searchQuery && filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No results found for "{searchQuery}"
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </div>
          )}
        </div>

        {/* Contact Form */}
        <section className="bg-card rounded-xl border border-border p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-teal" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Still need help?</h2>
              <p className="text-sm text-muted-foreground">
                Contact our support team and we'll get back to you within 24 hours.
              </p>
            </div>
          </div>
          
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="What's this about?"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                  required
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Describe your issue or question..."
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                required
                rows={5}
                className="bg-background resize-none"
              />
            </div>
            <Button type="submit" disabled={sending} className="w-full md:w-auto">
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </section>

        {/* Footer Links */}
        <div className="mt-12 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            You can also review our policies:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/terms" className="text-primary hover:underline flex items-center gap-1">
              Terms of Service <ChevronRight className="w-3 h-3" />
            </Link>
            <Link to="/privacy" className="text-primary hover:underline flex items-center gap-1">
              Privacy Policy <ChevronRight className="w-3 h-3" />
            </Link>
            <Link to="/guidelines" className="text-primary hover:underline flex items-center gap-1">
              Community Guidelines <ChevronRight className="w-3 h-3" />
            </Link>
            <Link to="/cookies" className="text-primary hover:underline flex items-center gap-1">
              Cookie Policy <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
      
      {user && <MobileNav />}
    </div>
  );
}
