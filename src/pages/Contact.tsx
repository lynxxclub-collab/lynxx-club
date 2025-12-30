import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Bug,
  ArrowRight,
  Heart,
} from "lucide-react";
import { toast } from "sonner";

const contactReasons = [
  { value: "general", label: "General Inquiry", icon: MessageSquare },
  { value: "support", label: "Technical Support", icon: Bug },
  { value: "billing", label: "Billing & Credits", icon: CreditCard },
  { value: "safety", label: "Safety Concern", icon: Shield },
  { value: "feedback", label: "Feedback & Suggestions", icon: HelpCircle },
  { value: "partnership", label: "Partnership Inquiry", icon: Mail },
];

export default function Contact() {
  const { user, profile } = useAuth();

  const [formData, setFormData] = useState({
    name: profile?.name || "",
    email: profile?.email || "",
    reason: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reason) {
      toast.error("Please select a reason for contacting us");
      return;
    }

    if (!formData.subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (formData.message.trim().length < 20) {
      toast.error("Please provide more details in your message (at least 20 characters)");
      return;
    }

    setSubmitting(true);

    // Simulate sending - in production, this would call an edge function
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSubmitted(true);
    toast.success("Message sent successfully!");
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-transparent to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10">
          <Header />

          <div className="container py-12 max-w-2xl">
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/10 border border-green-500/20 mb-8">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Message{" "}
                <span className="bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">Sent!</span>
              </h1>
              <p className="text-white/50 mb-8 max-w-md mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Thank you for reaching out. Our team typically responds within 24 hours during business days. We'll get
                back to you at <strong className="text-white">{formData.email}</strong>.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => setSubmitted(false)}
                  className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 text-white"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Send Another Message
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Link to="/help">Visit Help Center</Link>
                </Button>
              </div>
            </div>
          </div>

          {user && <MobileNav />}
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-rose-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
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

        <div className="container py-12">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
                <Mail className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Get in Touch
                </span>
              </div>
              <h1
                className="text-4xl md:text-5xl font-bold text-white mb-4"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Contact{" "}
                <span className="bg-gradient-to-r from-rose-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                  Us
                </span>
              </h1>
              <p className="text-white/50 max-w-md mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Have a question or need assistance? We're here to help. Fill out the form below and we'll get back to
                you soon.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Contact Info */}
              <div className="lg:col-span-1 space-y-6">
                {/* Quick Help */}
                <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6">
                  <h3 className="font-semibold text-white mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Quick Help
                  </h3>
                  <p className="text-sm text-white/50 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Before contacting us, you might find your answer in our resources:
                  </p>
                  <div className="space-y-3">
                    <Link
                      to="/help"
                      className="flex items-center gap-3 text-sm text-white/70 hover:text-rose-400 transition-colors group"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                        <HelpCircle className="w-4 h-4 text-purple-400" />
                      </div>
                      Help Center & FAQs
                    </Link>
                    <Link
                      to="/safety"
                      className="flex items-center gap-3 text-sm text-white/70 hover:text-rose-400 transition-colors group"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                        <Shield className="w-4 h-4 text-green-400" />
                      </div>
                      Safety Guidelines
                    </Link>
                    <Link
                      to="/guidelines"
                      className="flex items-center gap-3 text-sm text-white/70 hover:text-rose-400 transition-colors group"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                        <MessageSquare className="w-4 h-4 text-amber-400" />
                      </div>
                      Community Guidelines
                    </Link>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6">
                  <h3 className="font-semibold text-white mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Contact Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-rose-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          Email
                        </p>
                        <a
                          href="mailto:support@lynxxclub.com"
                          className="text-sm text-white/50 hover:text-rose-400 transition-colors"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          support@lynxxclub.com
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          Response Time
                        </p>
                        <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          Within 24 hours (business days)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          Location
                        </p>
                        <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          Highland, Michigan, USA
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency */}
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6">
                  <h3 className="font-semibold text-red-400 mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Emergency?
                  </h3>
                  <p className="text-sm text-white/50 mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    If you're in immediate danger, contact emergency services.
                  </p>
                  <Link
                    to="/safety"
                    className="inline-flex items-center gap-1 text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    View Safety Resources
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2">
                <form
                  onSubmit={handleSubmit}
                  className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 md:p-8 space-y-6"
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-white/70 text-sm"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Your Name *
                      </Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        required
                        maxLength={100}
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-white/70 text-sm"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        required
                        maxLength={255}
                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Reason for Contact *
                    </Label>
                    <Select value={formData.reason} onValueChange={(value) => handleChange("reason", value)}>
                      <SelectTrigger
                        className="h-12 bg-white/5 border-white/10 text-white rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <SelectValue placeholder="Select a reason..." className="text-white/30" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1f] border-white/10">
                        {contactReasons.map((reason) => (
                          <SelectItem
                            key={reason.value}
                            value={reason.value}
                            className="text-white/70 focus:bg-white/10 focus:text-white"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
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
                    <Label
                      htmlFor="subject"
                      className="text-white/70 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Subject *
                    </Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your inquiry"
                      value={formData.subject}
                      onChange={(e) => handleChange("subject", e.target.value)}
                      required
                      maxLength={200}
                      className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="message"
                      className="text-white/70 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Message *
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Please provide as much detail as possible..."
                      value={formData.message}
                      onChange={(e) => handleChange("message", e.target.value)}
                      required
                      rows={6}
                      maxLength={2000}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-rose-400/50 focus:ring-rose-400/20 resize-none"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    />
                    <p className="text-xs text-white/30 text-right" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {formData.message.length}/2000 characters
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
                    <p className="text-sm text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      By submitting this form, you agree to our{" "}
                      <Link to="/privacy" className="text-rose-400 hover:text-rose-300 transition-colors">
                        Privacy Policy
                      </Link>
                      . We'll only use your information to respond to your inquiry.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500 hover:from-rose-400 hover:via-purple-400 hover:to-rose-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.01] active:scale-[0.99] bg-[length:200%_100%] hover:bg-right disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </div>
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
              <div
                className="flex flex-wrap justify-center gap-4 text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <Link to="/about" className="text-white/40 hover:text-rose-400 transition-colors">
                  About Us
                </Link>
                <span className="text-white/20">•</span>
                <Link to="/terms" className="text-white/40 hover:text-rose-400 transition-colors">
                  Terms of Service
                </Link>
                <span className="text-white/20">•</span>
                <Link to="/privacy" className="text-white/40 hover:text-rose-400 transition-colors">
                  Privacy Policy
                </Link>
              </div>
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
