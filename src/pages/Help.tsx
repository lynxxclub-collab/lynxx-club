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
        a: "Earners may be offline or unavailable. If an earner does not respond within 12 hours, the message does not count as a paid interaction. You are not charged, and the earner does not receive earnings. If they reply later, the conversation continues normally.",
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
    const colors: Record<string, any> = {
      blue: {
        border: "border-blue-500/30",
        badge: "bg-blue-500",
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20 md:pb-0 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)
            `,
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
              <span className="text-sm font-medium text-purple-200">Support Center</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Help <span className="text-purple-400">Center</span>
            </h1>
            <p className="text-xl text-white/50">Find answers to common questions</p>
          </div>

          {/* Search */}
          <div className="mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <Input
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 bg-white/[0.03] border-white/10 text-white pl-12 rounded-xl"
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
                    "rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden",
                    openCategory === category.id && colors.border,
                  )}
                >
                  <button
                    onClick={() => setOpenCategory(openCategory === category.id ? null : category.id)}
                    className="w-full p-6 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{category.icon}</span>
                      <h2 className="text-xl font-bold text-white">{category.title}</h2>
                      <span className={cn("px-3 py-1 rounded-full text-sm text-white", colors.badge)}>
                        {category.questions.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-6 h-6 text-white/50 transition-transform",
                        openCategory === category.id && "rotate-180",
                      )}
                    />
                  </button>

                  {openCategory === category.id && (
                    <div className="px-6 pb-6 space-y-6">
                      {category.questions.map((item, index) => (
                        <div key={index} className="border-l-4 border-blue-500/30 pl-4">
                          <h3 className="text-lg font-semibold text-white mb-2">{item.q}</h3>
                          <p className="text-white/50">{item.a}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-white/40">
            <Link to="/terms" className="hover:text-purple-400">
              Terms
            </Link>{" "}
            •{" "}
            <Link to="/privacy" className="hover:text-purple-400">
              Privacy
            </Link>
          </div>
        </div>

        {user && <MobileNav />}
      </div>
    </div>
  );
}
