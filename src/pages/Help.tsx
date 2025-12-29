import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------- Types -------------------- */
type Question = { q: string; a: string };
type Category = {
  id: string;
  title: string;
  icon: string;
  color: string;
  questions: Question[];
};

/* -------------------- Data -------------------- */
const categories: Category[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "🚀",
    color: "purple",
    questions: [
      {
        q: "How do I create an account?",
        a: 'Click "Sign Up" in the top right, choose Seeker or Earner, and complete your profile. You must be 18 or older to join.',
      },
      {
        q: "What’s the difference between Seeker and Earner?",
        a: "Seekers use credits to start conversations and book video dates. Earners earn from interactions on their profile. You can only be one account type at a time.",
      },
      {
        q: "Can I switch account types?",
        a: "Yes, you may switch account types once from your account settings. After switching, you cannot switch again.",
      },
      {
        q: "How do I verify my account?",
        a: "Go to Settings → Verification and follow the instructions. Verified profiles display a badge.",
      },
    ],
  },
  {
    id: "credits",
    title: "Credits & Payments",
    icon: "💳",
    color: "amber",
    questions: [
      {
        q: "How do credits work?",
        a: "Credits are used for all interactions on Lynxxclub. Prices are shown in credits before you spend. We do not display a fixed dollar value per credit.",
      },
      {
        q: "How much do messages cost?",
        a: "Text messages cost 5 credits. Image unlocks cost 10 credits.",
      },
      {
        q: "How much do video dates cost?",
        a: "Video dates range from 200 to 900 credits depending on the Earner’s set rate and duration.",
      },
      {
        q: "What payment methods are accepted?",
        a: "All major credit cards are accepted and securely processed through Stripe. We do not store card details.",
      },
      {
        q: "Are credits refundable?",
        a: "Credits are generally non-refundable. If you experience a technical issue, contact support for review.",
      },
    ],
  },
  {
    id: "earners",
    title: "For Earners",
    icon: "💰",
    color: "green",
    questions: [
      {
        q: "How much can I earn?",
        a: "Earners receive 70% of paid interactions. Text messages earn $0.35, image unlocks earn $0.70, and video dates pay based on your set rate (200–900 credits). Earnings vary by activity and demand.",
      },
      {
        q: "When are payouts processed?",
        a: "Earnings become available after a 48-hour processing period. Payouts are processed weekly every Friday via Stripe Connect once you reach $25.",
      },
      {
        q: "How do I set up payouts?",
        a: "Go to Dashboard → Earnings and connect your bank account through Stripe Connect. Eligible earnings are paid automatically each Friday.",
      },
      {
        q: "Do I have to report this income?",
        a: "Yes. You are responsible for reporting your earnings. Stripe may issue tax forms if you meet reporting thresholds. Consult a tax professional.",
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
        a: "Browse profiles, select someone you like, click Send Message, and send your first text. Each text message costs 5 credits.",
      },
      {
        q: "Can I send photos?",
        a: "Yes. Images appear blurred and locked by default. Click to unlock an image for 10 credits. If you don’t unlock it, no credits are spent.",
      },
      {
        q: "Why didn’t they respond?",
        a: "Earners may be offline or unavailable. If an earner does not respond within 12 hours, the message is not charged and no earnings are paid.",
      },
      {
        q: "Can I get a refund if they don’t respond?",
        a: "Refunds aren’t needed. Messages not responded to within 12 hours are automatically not charged.",
      },
      {
        q: "How do I know if they read my message?",
        a: "Blue checkmarks indicate a message has been seen. Earners may disable read receipts.",
      },
    ],
  },
  {
    id: "video",
    title: "Video Dates",
    icon: "📹",
    color: "rose",
    questions: [
      {
        q: "How do I book a video date?",
        a: "From a conversation, click Book Video Date, select a duration and time, and confirm.",
      },
      {
        q: "Are video dates recorded?",
        a: "No. Video dates are never recorded.",
      },
      {
        q: "What if I need to cancel?",
        a: "Cancellation policies are shown at booking. Late cancellations or no-shows may result in charges.",
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
        q: "Is Lynxxclub safe?",
        a: "We provide reporting tools, verification options, and moderation. Always trust your instincts and practice safe online behavior.",
      },
      {
        q: "How do I report someone?",
        a: "Open the user’s profile or chat and select Report. Our team reviews reports promptly.",
      },
      {
        q: "Can I block someone?",
        a: "Yes. Blocking prevents messaging and profile visibility.",
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
        a: "Go to Settings → Security → Change Password.",
      },
      {
        q: "How do I delete my account?",
        a: "Settings → Delete Account. This action is permanent and cannot be undone.",
      },
    ],
  },
];

/* -------------------- Component -------------------- */
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden pb-20 md:pb-0">
      <Header />

      <div className="container max-w-4xl py-12 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-200">Support Center</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Help Center</h1>
          <p className="text-white/50">Find answers to common questions</p>
        </div>

        <div className="mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <Input
              placeholder="Search help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-white/[0.03] border-white/10 text-white"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <div key={category.id} className="rounded-xl border border-white/10 bg-white/[0.02]">
              <button
                onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                className="w-full p-6 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="text-lg font-semibold text-white">{category.title}</span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-white/50 transition-transform",
                    openCategory === category.id && "rotate-180",
                  )}
                />
              </button>

              {openCategory === category.id && (
                <div className="px-6 pb-6 space-y-4">
                  {category.questions.map((item, i) => (
                    <div key={i}>
                      <h3 className="text-white font-medium">{item.q}</h3>
                      <p className="text-white/50">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-white/40">
          <Link to="/terms">Terms</Link> • <Link to="/privacy">Privacy</Link>
        </div>
      </div>

      {user && <MobileNav />}
    </div>
  );
}
