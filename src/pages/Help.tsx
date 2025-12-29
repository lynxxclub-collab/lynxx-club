import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "🚀",
    color: "purple",
    questions: [
      {
        q: "How do I create an account?",
        a: 'Click "Sign Up" in the top right, choose whether you want to be a Seeker (pay for dates) or Earner (get paid for dates), then complete your profile with photos and bio. You must be 18+ to join.',
      },
      {
        q: "What's the difference between Seeker and Earner?",
        a: "Seekers purchase credits to initiate conversations and book dates. Earners receive payment (70% of credits spent) for responding to messages and going on dates. You can only be one or the other, not both.",
      },
      {
        q: "Can I switch from Seeker to Earner?",
        a: "Yes, but only ONCE. Go to Settings → Account Type → Switch Account Type. There's a 7-day waiting period and your credit/earnings balances will be converted. After switching once, you cannot switch again.",
      },
      {
        q: "How do I verify my account?",
        a: "Go to Settings → Verification. Upload a government ID and take a selfie. Verification typically takes 1-2 hours. Verified users get a blue checkmark badge.",
      },
    ],
  },
  {
    id: "credits-payment",
    title: "Credits & Payment",
    icon: "💳",
    color: "amber",
    questions: [
      {
        q: "How do credits work?",
        a: "Credits are the platform token used for all interactions. Different credit packs offer different bonuses. We intentionally do not show per-credit dollar values because pricing varies by pack. See our Pricing FAQ for details.",
      },
      {
        q: "How much do messages cost?",
        a: "Text messages cost 5 credits. Image unlocks cost 10 credits. The Earner receives 70% of the credit value, and Lynxx Club keeps 30% as a platform fee.",
      },
      {
        q: "How much do video dates cost?",
        a: "Video dates cost 200-900 credits depending on duration and the Earner's custom rates. Earners set their own rates within the 200-900 credit range. See our Pricing FAQ for more details.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards (Visa, Mastercard, American Express, Discover) processed securely through Stripe. We do NOT store your card information.",
      },
      {
        q: "Are credits refundable?",
        a: "Generally no. Credits are non-refundable once purchased. However, we may issue refunds for technical errors, fraudulent activity by the other party, or Terms violations (reviewed case-by-case).",
      },
      {
        q: "How do I check my credit balance?",
        a: "Your credit balance is displayed in the top right corner of every page (💎 icon). Click on it to see transaction history and buy more credits.",
      },
    ],
  },
  {
    id: "for-earners",
    title: "For Earners",
    icon: "💰",
    color: "green",
    questions: [
      {
        q: "How much can I earn?",
        a: "You earn 70% of credits spent on interactions with you. Text message = $0.35, Image = $0.70, Video dates = 70% of your set rate (200-900 credits). Top earners make $2,000-$5,000/month.",
      },
      {
        q: "When can I withdraw my earnings?",
        a: "New earnings are held for 48 hours, then become available for withdrawal. Minimum withdrawal is $25. Payouts are processed weekly every Friday via Stripe Connect to your bank account.",
      },
      {
        q: "How do I set up withdrawals?",
        a: "Go to Dashboard → Earnings → Withdraw. First time, you'll connect your bank account via Stripe Connect. After setup, you can request withdrawals anytime (minimum $25, processed weekly on Fridays).",
      },
      {
        q: "Can I set my own rates?",
        a: "You can set custom rates for video dates within the 200-900 credit range. Message rates are fixed by the platform (5 credits text, 10 credits image) to maintain quality standards.",
      },
      {
        q: "Do I have to report this income on my taxes?",
        a: "YES. You are responsible for reporting all earnings to the IRS. We will send you a 1099 form if you earn over $600 in a calendar year. Consult a tax professional for guidance.",
      },
      {
        q: "What if someone is rude or inappropriate?",
        a: "You can block and report any user. Go to their profile → Report. We review all reports within 24 hours. Inappropriate behavior results in warnings, suspension, or permanent bans.",
      },
    ],
  },
  {
    id: "messaging",
    title: "Messaging",
    icon: "💬",
    color: "blue",
    questions: [
      {
        q: "How do I start a conversation?",
        a: 'Browse profiles → Click on someone you like → Click "Send Message" → Type your message → Click Send. You\'ll be charged 5 credits per text message sent.',
      },
      {
        q: "Can I send photos?",
        a: "Yes! Click the photo icon in the message box. Image unlocks cost 10 credits. Max 5MB per image, only JPG/PNG/WebP allowed.",
      },
      {
        q: "Why didn't they respond?",
        a: "Earners are not required to respond to every message. They may be busy, offline, or not interested. Be patient and respectful. If you don't get a response in 24 hours, consider messaging someone else.",
      },
      {
        q: "Can I get a refund if they don't respond?",
        a: "No. Credits are charged when you SEND a message, not when you receive a response. This is stated in our Terms of Service.",
      },
      {
        q: "How do I know if they read my message?",
        a: "Read receipts show when messages are seen (blue checkmarks). Earners can disable read receipts in their settings.",
      },
    ],
  },
  {
    id: "video-dates",
    title: "Video Dates",
    icon: "📹",
    color: "rose",
    questions: [
      {
        q: "How do I book a video date?",
        a: 'From a conversation → Click "📹 Book Video Date" → Choose duration (30 or 60 min) → Select date & time → Confirm. Credits are reserved but not charged until the date completes.',
      },
      {
        q: "What happens during a video date?",
        a: 'At the scheduled time, both users click "Join Call" in their Upcoming Dates page. You\'ll enter a private video room for the duration booked. The call automatically ends when time expires.',
      },
      {
        q: "What if I need to cancel?",
        a: "You can cancel up to 1 hour before the scheduled time. Reserved credits will be refunded. Cancellations within 1 hour are charged 50%. No-shows are charged 100%.",
      },
      {
        q: "Are video dates recorded?",
        a: "NO. We do not record video dates. Only metadata (duration, participants, date/time) is stored for billing purposes.",
      },
      {
        q: "What if the call quality is bad?",
        a: "Video quality depends on both users' internet connections. For best results, use WiFi and close other apps. If there are technical issues, contact support for a potential refund.",
      },
      {
        q: "Can I extend a video date?",
        a: "Not during the call. If you're enjoying the conversation, you can book another date for immediately after, or continue via text messages.",
      },
    ],
  },
  {
    id: "safety",
    title: "Safety & Privacy",
    icon: "🛡️",
    color: "teal",
    questions: [
      {
        q: "Is Lynxx Club safe?",
        a: "We prioritize safety with ID verification, user reporting, fraud detection, and moderation. However, you are responsible for your own safety. Always meet in public, tell someone where you're going, and trust your instincts.",
      },
      {
        q: "How do I report someone?",
        a: 'Click the "⚠️ Report" button on their profile or in messages → Select reason (harassment, scam, inappropriate, fake profile) → Add details → Submit. We review all reports within 24 hours.',
      },
      {
        q: "What happens when I report someone?",
        a: "Our team reviews the report and any evidence (screenshots, messages). Depending on severity, we may warn, suspend (7-30 days), or permanently ban the user. You'll be notified of the outcome.",
      },
      {
        q: "Can I block someone?",
        a: "Yes. Go to their profile → Block User. They won't be able to message you or see your profile. You won't see them in search results.",
      },
      {
        q: "Is my personal information safe?",
        a: "We use bank-level encryption and never sell your data. Payment info is handled by Stripe (we never see your card number). Read our Privacy Policy for full details.",
      },
      {
        q: "Should I meet someone in person?",
        a: "Only if you feel comfortable. We recommend: (1) Complete at least 2 video dates first, (2) Always meet in public, (3) Tell a friend where you're going, (4) Use our check-in feature. See our Safety Tips for more.",
      },
    ],
  },
  {
    id: "account",
    title: "Account Settings",
    icon: "⚙️",
    color: "orange",
    questions: [
      {
        q: "How do I change my password?",
        a: "Settings → Security → Change Password. Enter current password, then new password (minimum 12 characters, must include uppercase, lowercase, number, and special character).",
      },
      {
        q: "How do I update my profile?",
        a: "Settings → Edit Profile. You can change photos, bio, preferences, and rates (Earners). Profile changes are reviewed and may take up to 24 hours to appear.",
      },
      {
        q: "Can I pause my account?",
        a: "Yes. Settings → Pause Account → Select reason → Confirm. Your profile will be hidden, but data is preserved for 2 years. You can reactivate anytime. First reactivation includes 500 bonus credits!",
      },
      {
        q: "How do I delete my account?",
        a: "Settings → Delete Account → Enter password → Confirm. This is PERMANENT. All unused credits are forfeited. Earners should withdraw available earnings first. Data is deleted within 30 days (except financial records kept for 7 years).",
      },
      {
        q: "Why was my account suspended?",
        a: "Accounts are suspended for Terms violations (harassment, fraud, inappropriate content, etc.). Check your email for details. Suspensions are typically 7-30 days. Repeated violations result in permanent bans.",
      },
    ],
  },
  {
    id: "technical",
    title: "Technical Issues",
    icon: "🔧",
    color: "slate",
    questions: [
      {
        q: "The site is not loading. What do I do?",
        a: "Try: (1) Refresh the page, (2) Clear browser cache/cookies, (3) Try a different browser, (4) Check your internet connection, (5) If still broken, contact support with your browser and device info.",
      },
      {
        q: "I can't log in. Help!",
        a: 'Try: (1) Reset password using "Forgot Password", (2) Check email for verification link, (3) Clear cookies and try again, (4) Make sure Caps Lock is off, (5) Contact support if still stuck.',
      },
      {
        q: "My messages aren't sending.",
        a: "Check: (1) Do you have enough credits? (2) Is your internet connection stable? (3) Refresh the page, (4) Try logging out and back in. If problem persists, contact support.",
      },
      {
        q: "Video calls aren't working.",
        a: "Check: (1) Grant camera/microphone permissions, (2) Use Chrome, Firefox, or Safari (not Internet Explorer), (3) Close other apps using camera, (4) Use WiFi instead of mobile data, (5) Try a different device.",
      },
      {
        q: "Which browsers are supported?",
        a: "We support: Chrome (recommended), Firefox, Safari, and Edge. Internet Explorer is NOT supported. For best experience, keep your browser updated to the latest version.",
      },
    ],
  },
];

export default function Help() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const filteredCategories = categories
    .map((category) => ({
      ...category,
      questions: category.questions.filter(
        (q) =>
          q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.a.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((category) => category.questions.length > 0);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { border: string; bg: string; text: string; badge: string }> = {
      purple: {
        border: "border-purple-500/30",
        bg: "bg-purple-500/10",
        text: "text-purple-400",
        badge: "bg-purple-500",
      },
      amber: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400", badge: "bg-amber-500" },
      green: { border: "border-green-500/30", bg: "bg-green-500/10", text: "text-green-400", badge: "bg-green-500" },
      blue: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", badge: "bg-blue-500" },
      rose: { border: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-400", badge: "bg-rose-500" },
      teal: { border: "border-teal-500/30", bg: "bg-teal-500/10", text: "text-teal-400", badge: "bg-teal-500" },
      orange: {
        border: "border-orange-500/30",
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        badge: "bg-orange-500",
      },
      slate: { border: "border-slate-500/30", bg: "bg-slate-500/10", text: "text-slate-400", badge: "bg-slate-500" },
    };
    return colors[color] || colors.purple;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-rose-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 -right-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10">
        <Header />

        <div className="container py-12 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Support Center
              </span>
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Help{" "}
              <span className="bg-gradient-to-r from-purple-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
                Center
              </span>
            </h1>
            <p className="text-xl text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Find answers to common questions
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <Input
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 pl-12 text-lg rounded-xl focus:border-purple-500/50 focus:ring-purple-500/20"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            {filteredCategories.map((category) => {
              const colors = getColorClasses(category.color);
              return (
                <div
                  key={category.id}
                  className={cn(
                    "rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden transition-all",
                    openCategory === category.id && colors.border,
                  )}
                >
                  <button
                    onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                    className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{category.icon}</span>
                      <h2
                        className="text-xl md:text-2xl font-bold text-white text-left"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {category.title}
                      </h2>
                      <span
                        className={cn("px-3 py-1 rounded-full text-sm text-white font-medium", colors.badge)}
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {category.questions.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-6 h-6 text-white/50 transition-transform duration-200",
                        openCategory === category.id && "rotate-180",
                      )}
                    />
                  </button>

                  {openCategory === category.id && (
                    <div className="px-6 pb-6 space-y-6">
                      {category.questions.map((item, index) => (
                        <div key={index} className={cn("border-l-4 pl-4", colors.border)}>
                          <h3
                            className="text-lg font-semibold text-white mb-2"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {item.q}
                          </h3>
                          <p className="text-white/50 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {item.a}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* No Results */}
          {searchQuery && filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl text-white/50 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                No results found for "{searchQuery}"
              </p>
              <p className="text-white/40 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Try a different search term or browse categories above
              </p>
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Clear search
              </Button>
            </div>
          )}

          {/* Still Need Help */}
          <div className="mt-16 relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-amber-500/20 rounded-3xl blur-xl opacity-50" />
            <div className="relative rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/10 p-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Still need{" "}
                <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
                  help?
                </span>
              </h2>
              <p className="text-xl text-white/50 mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Our support team is here for you
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <a href="mailto:support@lynxxclub.com">Contact Support</a>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Link to="/guidelines">View Guidelines</Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-12 text-center">
            <div
              className="flex flex-wrap justify-center gap-4 text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Link to="/terms" className="text-white/40 hover:text-rose-400 transition-colors">
                Terms of Service
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/privacy" className="text-white/40 hover:text-rose-400 transition-colors">
                Privacy Policy
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/faq/pricing" className="text-white/40 hover:text-rose-400 transition-colors">
                Pricing FAQ
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/guidelines" className="text-white/40 hover:text-rose-400 transition-colors">
                Community Guidelines
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/safety" className="text-white/40 hover:text-rose-400 transition-colors">
                Safety
              </Link>
            </div>
          </div>
        </div>

        {user && <MobileNav />}
      </div>

      {/* CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
