import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  {
    id: 'getting-started',
    title: '🚀 Getting Started',
    icon: '🚀',
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Click "Sign Up" in the top right, choose whether you want to be a Seeker (pay for dates) or Earner (get paid for dates), then complete your profile with photos and bio. You must be 18+ to join.'
      },
      {
        q: "What's the difference between Seeker and Earner?",
        a: 'Seekers purchase credits to initiate conversations and book dates. Earners receive payment (70% of credits spent) for responding to messages and going on dates. You can only be one or the other, not both.'
      },
      {
        q: 'Can I switch from Seeker to Earner?',
        a: "Yes, but only ONCE. Go to Settings → Account Type → Switch Account Type. There's a 7-day waiting period and your credit/earnings balances will be converted. After switching once, you cannot switch again."
      },
      {
        q: 'How do I verify my account?',
        a: 'Go to Settings → Verification. Upload a government ID and take a selfie. Verification typically takes 1-2 hours. Verified users get a blue checkmark badge.'
      }
    ]
  },
  {
    id: 'credits-payment',
    title: '💳 Credits & Payment',
    icon: '💳',
    questions: [
      {
        q: 'How much do credits cost?',
        a: '1 credit = $0.10 USD. We offer packages: Starter ($50/500cr), Popular ($100/1100cr +10%), Premium ($200/2400cr +20%), VIP ($500/6500cr +30%). Credits never expire but are non-refundable.'
      },
      {
        q: 'How much do messages cost?',
        a: 'Text messages cost 20 credits ($2.00). Image messages cost 40 credits ($4.00). The Earner receives 70% of the value, and Lynxx Club keeps 30% as a platform fee.'
      },
      {
        q: 'How much do video dates cost?',
        a: "Video dates cost 250-600 credits depending on duration and the Earner's custom rates. 30-minute dates typically cost 250-350 credits ($25-$35). 60-minute dates cost 400-600 credits ($40-$60). Earners set their own video date rates."
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) processed securely through Stripe. We do NOT store your card information.'
      },
      {
        q: 'Are credits refundable?',
        a: 'Generally no. Credits are non-refundable once purchased. However, we may issue refunds for technical errors, fraudulent activity by the other party, or Terms violations (reviewed case-by-case).'
      },
      {
        q: 'How do I check my credit balance?',
        a: 'Your credit balance is displayed in the top right corner of every page (💎 icon). Click on it to see transaction history and buy more credits.'
      }
    ]
  },
  {
    id: 'for-earners',
    title: '💰 For Earners',
    icon: '💰',
    questions: [
      {
        q: 'How much can I earn?',
        a: 'You earn 70% of credits spent on interactions with you. Text message = $1.40, Image = $2.80, Video dates = $17.50-$42 depending on your rates. Top earners make $2,000-$5,000/month.'
      },
      {
        q: 'When can I withdraw my earnings?',
        a: "Earnings are held in escrow for 3 days, then become available for withdrawal. Minimum withdrawal is $20. Withdrawals are processed via Stripe Connect within 2-3 business days to your bank account."
      },
      {
        q: 'How do I set up withdrawals?',
        a: "Go to Dashboard → Earnings → Withdraw. First time, you'll connect your bank account via Stripe Connect. After setup, you can request withdrawals anytime (minimum $20)."
      },
      {
        q: 'Can I set my own rates?',
        a: 'You can set custom rates for video dates (30min: 250-350 credits, 60min: 400-600 credits). Message rates are fixed by the platform to maintain quality standards.'
      },
      {
        q: 'Do I have to report this income on my taxes?',
        a: 'YES. You are responsible for reporting all earnings to the IRS. We will send you a 1099 form if you earn over $600 in a calendar year. Consult a tax professional for guidance.'
      },
      {
        q: 'What if someone is rude or inappropriate?',
        a: 'You can block and report any user. Go to their profile → Report. We review all reports within 24 hours. Inappropriate behavior results in warnings, suspension, or permanent bans.'
      }
    ]
  },
  {
    id: 'messaging',
    title: '💬 Messaging',
    icon: '💬',
    questions: [
      {
        q: 'How do I start a conversation?',
        a: 'Browse profiles → Click on someone you like → Click "Send Message" → Type your message → Click Send. You\'ll be charged 20 credits per text message sent.'
      },
      {
        q: 'Can I send photos?',
        a: 'Yes! Click the photo icon in the message box. Image messages cost 40 credits (2x text messages). Max 5MB per image, only JPG/PNG/WebP allowed.'
      },
      {
        q: "Why didn't they respond?",
        a: "Earners are not required to respond to every message. They may be busy, offline, or not interested. Be patient and respectful. If you don't get a response in 24 hours, consider messaging someone else."
      },
      {
        q: "Can I get a refund if they don't respond?",
        a: 'No. Credits are charged when you SEND a message, not when you receive a response. This is stated in our Terms of Service.'
      },
      {
        q: 'How do I know if they read my message?',
        a: 'Read receipts show when messages are seen (blue checkmarks). Earners can disable read receipts in their settings.'
      }
    ]
  },
  {
    id: 'video-dates',
    title: '📹 Video Dates',
    icon: '📹',
    questions: [
      {
        q: 'How do I book a video date?',
        a: 'From a conversation → Click "📹 Book Video Date" → Choose duration (30 or 60 min) → Select date & time → Confirm. Credits are reserved but not charged until the date completes.'
      },
      {
        q: 'What happens during a video date?',
        a: "At the scheduled time, both users click \"Join Call\" in their Upcoming Dates page. You'll enter a private video room for the duration booked. The call automatically ends when time expires."
      },
      {
        q: 'What if I need to cancel?',
        a: 'You can cancel up to 1 hour before the scheduled time. Reserved credits will be refunded. Cancellations within 1 hour are charged 50%. No-shows are charged 100%.'
      },
      {
        q: 'Are video dates recorded?',
        a: 'NO. We do not record video dates. Only metadata (duration, participants, date/time) is stored for billing purposes.'
      },
      {
        q: 'What if the call quality is bad?',
        a: "Video quality depends on both users' internet connections. For best results, use WiFi and close other apps. If there are technical issues, contact support for a potential refund."
      },
      {
        q: 'Can I extend a video date?',
        a: "Not during the call. If you're enjoying the conversation, you can book another date for immediately after, or continue via text messages."
      }
    ]
  },
  {
    id: 'safety',
    title: '🛡️ Safety & Privacy',
    icon: '🛡️',
    questions: [
      {
        q: 'Is Lynxx Club safe?',
        a: 'We prioritize safety with ID verification, user reporting, fraud detection, and moderation. However, you are responsible for your own safety. Always meet in public, tell someone where you\'re going, and trust your instincts.'
      },
      {
        q: 'How do I report someone?',
        a: 'Click the "⚠️ Report" button on their profile or in messages → Select reason (harassment, scam, inappropriate, fake profile) → Add details → Submit. We review all reports within 24 hours.'
      },
      {
        q: 'What happens when I report someone?',
        a: "Our team reviews the report and any evidence (screenshots, messages). Depending on severity, we may warn, suspend (7-30 days), or permanently ban the user. You'll be notified of the outcome."
      },
      {
        q: 'Can I block someone?',
        a: "Yes. Go to their profile → Block User. They won't be able to message you or see your profile. You won't see them in search results."
      },
      {
        q: 'Is my personal information safe?',
        a: 'We use bank-level encryption and never sell your data. Payment info is handled by Stripe (we never see your card number). Read our Privacy Policy for full details.'
      },
      {
        q: 'Should I meet someone in person?',
        a: "Only if you feel comfortable. We recommend: (1) Complete at least 2 video dates first, (2) Always meet in public, (3) Tell a friend where you're going, (4) Use our check-in feature. See our Safety Tips for more."
      }
    ]
  },
  {
    id: 'account',
    title: '⚙️ Account Settings',
    icon: '⚙️',
    questions: [
      {
        q: 'How do I change my password?',
        a: 'Settings → Security → Change Password. Enter current password, then new password (minimum 12 characters, must include uppercase, lowercase, number, and special character).'
      },
      {
        q: 'How do I update my profile?',
        a: 'Settings → Edit Profile. You can change photos, bio, preferences, and rates (Earners). Profile changes are reviewed and may take up to 24 hours to appear.'
      },
      {
        q: 'Can I pause my account?',
        a: 'Yes. Settings → Pause Account → Select reason → Confirm. Your profile will be hidden, but data is preserved for 2 years. You can reactivate anytime. First reactivation includes 500 bonus credits!'
      },
      {
        q: 'How do I delete my account?',
        a: 'Settings → Delete Account → Enter password → Confirm. This is PERMANENT. All unused credits are forfeited. Earners should withdraw available earnings first. Data is deleted within 30 days (except financial records kept for 7 years).'
      },
      {
        q: 'Why was my account suspended?',
        a: 'Accounts are suspended for Terms violations (harassment, fraud, inappropriate content, etc.). Check your email for details. Suspensions are typically 7-30 days. Repeated violations result in permanent bans.'
      }
    ]
  },
  {
    id: 'technical',
    title: '🔧 Technical Issues',
    icon: '🔧',
    questions: [
      {
        q: 'The site is not loading. What do I do?',
        a: 'Try: (1) Refresh the page, (2) Clear browser cache/cookies, (3) Try a different browser, (4) Check your internet connection, (5) If still broken, contact support with your browser and device info.'
      },
      {
        q: "I can't log in. Help!",
        a: 'Try: (1) Reset password using "Forgot Password", (2) Check email for verification link, (3) Clear cookies and try again, (4) Make sure Caps Lock is off, (5) Contact support if still stuck.'
      },
      {
        q: "My messages aren't sending.",
        a: 'Check: (1) Do you have enough credits? (2) Is your internet connection stable? (3) Refresh the page, (4) Try logging out and back in. If problem persists, contact support.'
      },
      {
        q: "Video calls aren't working.",
        a: 'Check: (1) Grant camera/microphone permissions, (2) Use Chrome, Firefox, or Safari (not Internet Explorer), (3) Close other apps using camera, (4) Use WiFi instead of mobile data, (5) Try a different device.'
      },
      {
        q: 'Which browsers are supported?',
        a: 'We support: Chrome (recommended), Firefox, Safari, and Edge. Internet Explorer is NOT supported. For best experience, keep your browser updated to the latest version.'
      }
    ]
  }
];

export default function Help() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const filteredCategories = categories.map(category => ({
    ...category,
    questions: category.questions.filter(q =>
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <div className="container py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Help Center</h1>
          <p className="text-xl text-muted-foreground">Find answers to common questions</p>
        </div>

        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border-border pl-12 py-6 text-lg"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {filteredCategories.map(category => (
            <div key={category.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{category.icon}</span>
                  <h2 className="text-xl md:text-2xl font-bold text-left">{category.title}</h2>
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
                    {category.questions.length}
                  </span>
                </div>
                <ChevronDown 
                  className={cn(
                    "w-6 h-6 transition-transform duration-200",
                    openCategory === category.id && "rotate-180"
                  )}
                />
              </button>
              
              {openCategory === category.id && (
                <div className="px-6 pb-6 space-y-6 animate-fade-in">
                  {category.questions.map((item, index) => (
                    <div key={index} className="border-l-4 border-primary pl-4">
                      <h3 className="text-lg font-semibold mb-2">{item.q}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* No Results */}
        {searchQuery && filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-2xl text-muted-foreground mb-4">No results found for "{searchQuery}"</p>
            <p className="text-muted-foreground mb-6">Try a different search term or browse categories above</p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          </div>
        )}

        {/* Still Need Help */}
        <div className="mt-16 bg-gradient-to-r from-primary/20 to-teal/20 rounded-xl p-8 text-center border border-primary/30">
          <h2 className="text-3xl font-bold mb-4">Still need help?</h2>
          <p className="text-xl text-muted-foreground mb-6">Our support team is here for you</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <a href="mailto:support@lynxxclub.com">
                Contact Support
              </a>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/guidelines">
                View Guidelines
              </Link>
            </Button>
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
            <Link to="/cookies" className="text-primary hover:underline">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
      
      {user && <MobileNav />}
    </div>
  );
}
