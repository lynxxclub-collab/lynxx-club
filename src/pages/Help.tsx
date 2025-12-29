import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Question = { q: string; a: string };
type Category = {
  id: string;
  title: string;
  icon: string;
  color: string;
  questions: Question[];
};

const categories: Category[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "🚀",
    color: "purple",
    questions: [
      {
        q: "How do I create an account?",
        a: 'Click "Sign Up" in the top right, choose whether you want to be a Seeker or an Earner, then complete your profile with photos and bio. You must be 18+ to join.',
      },
      {
        q: "What's the difference between Seeker and Earner?",
        a: "Seekers purchase credits to initiate conversations and book video dates. Earners earn from paid interactions on their profile. You can only be one account type at a time.",
      },
      {
        q: "Can I switch from Seeker to Earner?",
        a: "You may switch account type once from Settings → Account Type. After switching once, you cannot switch again.",
      },
      {
        q: "How do I verify my account?",
        a: "Go to Settings → Verification and follow the steps. Verified users display a badge on their profile.",
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
        a: "Credits are the platform token used for interactions on Lynxxclub. Prices are shown in credits before you spend. We do not display a fixed dollar value per credit.",
      },
      {
        q: "How much do messages cost?",
        a: "Text messages cost 5 credits. Image unlocks cost 10 credits.",
      },
      {
        q: "How much do video dates cost?",
        a: "Video dates range from 200–900 credits depending on duration and the Earner’s set rates.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept major credit cards processed securely through Stripe. We do not store your card information.",
      },
      {
        q: "Are credits refundable?",
        a: "Credits are generally non-refundable once purchased. If you experience a technical issue, contact support for review.",
      },
      {
        q: "How do I check my credit balance?",
        a: "Your credit balance appears in the top right corner of the site (💎). Click it to view your history or buy more credits.",
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
        a: "Earners receive 70% of paid interactions. Text messages earn $0.35 per paid message, image unlocks earn $0.70 per unlock, and video dates pay out based on your set rate (200–900 credits). Earnings vary based on availability, responsiveness, and demand.",
      },
      {
        q: "When can I withdraw my earnings?",
        a: "Earnings become available after a 48-hour processing period. Once available, creators who meet the $25 minimum are included in the weekly payout processed every Friday via Stripe Connect.",
      },
      {
        q: "How do I set up withdrawals?",
        a: "Go to Dashboard → Earnings and complete payout setup. The first time, you’ll securely connect your bank account through Stripe Connect. After setup, eligible earnings are automatically paid out weekly every Friday (minimum $25).",
      },
      {
        q: "Can I set my own rates?",
        a: "You can set custom rates for video dates within the 200–900 credit range. Message rates are standardized by the platform (5 credits text, 10 credits image) for consistency.",
      },
      {
        q: "Do I have to report this income on my taxes?",
        a: "Yes. You are responsible for reporting your earnings in accordance with applicable tax laws. If required, Stripe may issue tax forms for creators who meet reporting thresholds during a calendar year. We recommend consulting a qualified tax professional for guidance.",
      },
      {
        q: "What if someone is rude or inappropriate?",
        a: "You can block and report any user. Go to their profile → Report. We review reports as quickly as possible. Violations may result in warnings, suspension, or permanent bans.",
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
        a: "Browse profiles, click on someone you’re interested in, and select Send Message. Type your message and send it to start the conversation. Each text message costs 5 credits.",
      },
      {
        q: "Can I send photos?",
        a: "Yes. Images are shared in a blurred, locked state. Click an image to unlock it for 10 credits. If you don’t unlock it, no credits are spent. Images must be JPG, PNG, or WebP and under 5MB.",
      },
      {
        q: "Why didn’t they respond?",
        a: "Earners may be offline or unavailable. If an earner does not respond within 12 hours, the message does not count as a paid interaction. You are not charged, and the earner does not receive earnings for that message. If they reply later, the conversation continues normally.",
      },
      {
        q: "Can I get a refund if they don’t respond?",
        a: "Refunds aren’t necessary for unanswered messages. Messages not responded to within 12 hours are not charged. Credit purchases are otherwise non-refundable.",
      },
      {
        q: "How do I know if they read my message?",
        a: "Blue checkmarks indicate a message has been seen. Earners may disable read receipts, so not all messages will show a read indicator.",
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
        a: 'From a conversation → Click "📹 Book Video Date" → Choose duration → Select date & time → Confirm. Any required credits will be clearly shown before you confirm.',
      },
      {
        q: "What happens during a video date?",
        a: 'At the scheduled time, both users click "Join Call" in their Upcoming Dates page. You’ll enter a private video room for the duration booked. The call automatically ends when time expires.',
      },
      {
        q: "What if I need to cancel?",
        a: "Cancellation rules are shown at checkout when you book. If you cancel within the allowed window, any reserved credits are released. Late cancellations or no-shows may be charged based on the policy shown when booked.",
      },
      {
        q: "Are video dates recorded?",
        a: "No. We do not record video dates.",
      },
      {
        q: "What if the call quality is bad?",
        a: "Call quality depends on both users’ internet connections. For best results, use Wi-Fi and close other apps. If you experience technical issues, contact support and we’ll review it.",
      },
      {
        q: "Can I extend a video date?",
        a: "Not during the call. If you’re enjoying the conversation, you can book another date or continue via chat.",
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
        a: "We prioritize safety with reporting tools, verification options, and moderation. Always trust your instincts and follow common-sense safety practices.",
      },
      {
        q: "How do I report someone?",
        a: 'Click the "Report" option on their profile or in messages → Select a reason → Add details → Submit. We review reports as quickly as possible.',
      },
      {
        q: "What happens when I report someone?",
        a: "We review the report and any relevant evidence. Depending on severity, we may warn, suspend, or permanently ban the user.",
      },
      {
        q: "Can I block someone?",
        a: "Yes. Go to their profile → Block User. They won’t be able to message you, and you won’t see each other in discovery.",
      },
      {
        q: "Is my personal information safe?",
        a: "We use strong security controls and never sell your data. Payment info is handled by Stripe (we never see your full card number). Read our Privacy Policy for details.",
      },
      {
        q: "Should I meet someone in person?",
        a: "Only if you feel comfortable. We recommend starting with in-app chat and video dates first, and always meeting in public if you choose to meet offline.",
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
        a: "Settings → Security → Change Password.",
      },
      {
        q: "How do I update my profile?",
        a: "Settings → Edit Profile. You can update photos, bio, and preferences. Some changes may take time to appear depending on review settings.",
      },
      {
        q: "Can I pause my account?",
        a: "Yes. Settings → Pause Account. Your profile will be hidden until you reactivate.",
      },
      {
        q: "How do I delete my account?",
        a: "Settings → Delete Account → Confirm. This is permanent. Unused credits are forfeited. Earners should complete payout setup for any eligible earnings.",
      },
      {
        q: "Why was my account suspended?",
        a: "Accounts may be suspended for violations of our Terms or Community Guidelines. Check your email for details.",
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
        a: "Try: (1) Refresh, (2) Clear cache/cookies, (3) Try a different browser, (4) Check your internet connection. If it persists, contact support with device + browser info.",
      },
      {
        q: "I can't log in. Help!",
        a: 'Try: (1) Reset password using "Forgot Password", (2) Check your email for verification links, (3) Clear cookies and try again. If still stuck, contact support.',
      },
      {
        q: "My messages aren't sending.",
        a: "Check: (1) You have enough credits, (2) Your connection is stable, (3) Refresh the page, (4) Log out and back in. If it continues, contact support.",
      },
      {
        q: "Video calls aren't working.",
        a: "Check: (1) Camera/mic permissions, (2) Use Chrome/Firefox/Safari/Edge, (3) Close other apps using camera, (4) Use Wi-Fi, (5) Try another device.",
      },
      {
        q: "Which browsers are supported?",
        a: "We support Chrome (recommended), Firefox, Safari, and Edge. Keep your browser updated for best results.",
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
      amber: {
        border: "border-amber-500/30",
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        badge: "bg-amber-500",
      },
      green: {
        border: "border-green-500/30",
        bg: "bg-green-500/10",
        text: "text-green-400",
        badge: "bg-green-500",
      },
      blue: {
        border: "border-blue-500/30",
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        badge: "bg-blue-500",
      },
      rose: {
        border: "border-rose-500/30",
        bg: "bg-rose-500/10",
        text: "text-rose-400",
        badge: "bg-rose-500",
      },
      teal: {
        border: "border-teal-500/30",
        bg: "bg-teal-500/10",
        text: "text-teal-400",
        badge: "bg-teal-500",
      },
      orange: {
        border: "border-orange-500/30",
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        badge: "bg-orange-500",
      },
      slate: {
        border: "border-slate-500/30",
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        badge: "bg-slate-500",
      },
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
