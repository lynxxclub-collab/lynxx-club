import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertTriangle,
  Shield,
  UserX,
  MessageSquareWarning,
  CreditCard,
  Bug,
  HelpCircle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

const reportTypes = [
  {
    id: "harassment",
    label: "Harassment or Abuse",
    description: "Threatening, bullying, or abusive behavior",
    icon: MessageSquareWarning,
    color: "red",
  },
  {
    id: "scam",
    label: "Scam or Fraud",
    description: "Attempts to steal money or personal information",
    icon: CreditCard,
    color: "amber",
  },
  {
    id: "inappropriate",
    label: "Inappropriate Content",
    description: "Explicit, offensive, or violating content",
    icon: AlertTriangle,
    color: "orange",
  },
  {
    id: "fake_profile",
    label: "Fake Profile",
    description: "Impersonation or misleading profile information",
    icon: UserX,
    color: "purple",
  },
  {
    id: "underage",
    label: "Underage User",
    description: "User appears to be under 18 years old",
    icon: Shield,
    color: "rose",
  },
  {
    id: "technical",
    label: "Technical Issue",
    description: "Bug, error, or platform malfunction",
    icon: Bug,
    color: "blue",
  },
  {
    id: "other",
    label: "Other",
    description: "Something else not listed above",
    icon: HelpCircle,
    color: "gray",
  },
];

export default function Report() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillUserId = searchParams.get("user");

  const [reportType, setReportType] = useState("");
  const [reportedUsername, setReportedUsername] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reportType) {
      toast.error("Please select a report type");
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide details about the issue");
      return;
    }

    if (description.trim().length < 20) {
      toast.error("Please provide more details (at least 20 characters)");
      return;
    }

    setSubmitting(true);

    try {
      // If user is logged in, save to database
      if (user) {
        const { error } = await supabase.from("reports").insert({
          reporter_id: user.id,
          reported_id: prefillUserId || user.id, // Use prefilled user or self for general reports
          reason: reportType,
          description: `${reportedUsername ? `Reported User: ${reportedUsername}\n\n` : ""}${description}${contactEmail ? `\n\nContact Email: ${contactEmail}` : ""}`,
        });

        if (error) throw error;
      }

      setSubmitted(true);
      toast.success("Report submitted successfully");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#0a0a0f] pb-20 md:pb-0">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-transparent to-transparent" />
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-green-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10">
          <Header />

          <div className="container py-12 max-w-2xl">
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/20 border border-green-500/30 mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Report{" "}
                <span className="bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
                  Submitted
                </span>
              </h1>
              <p className="text-white/50 mb-8 max-w-md mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Thank you for helping keep our community safe. Our team will review your report within 24 hours and take
                appropriate action.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate(-1)}
                  className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-400 hover:to-teal-400 text-white rounded-xl"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Go Back
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <Link to="/help">Visit Help Center</Link>
                </Button>
              </div>
            </div>
          </div>

          {user && <MobileNav />}
        </div>

        {/* Font import */}
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
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

        <div className="container py-12 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 mb-4">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold text-white mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Report a{" "}
              <span className="bg-gradient-to-r from-red-400 to-amber-400 bg-clip-text text-transparent">Problem</span>
            </h1>
            <p className="text-white/50 max-w-md mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Help us maintain a safe community by reporting issues. All reports are reviewed within 24 hours.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Report Type Selection */}
            <div className="space-y-4">
              <Label className="text-base font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                What would you like to report?
              </Label>
              <RadioGroup value={reportType} onValueChange={setReportType}>
                <div className="grid gap-3">
                  {reportTypes.map((type) => (
                    <label
                      key={type.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                        reportType === type.id
                          ? "border-red-500/30 bg-red-500/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <RadioGroupItem
                        value={type.id}
                        className="mt-1 border-white/30 text-red-400 data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <type.icon
                            className={`w-4 h-4 ${reportType === type.id ? "text-red-400" : "text-white/40"}`}
                          />
                          <span className="font-medium text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {type.label}
                          </span>
                        </div>
                        <p className="text-sm text-white/50 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
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
              <Label htmlFor="username" className="text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Username of person you're reporting (optional)
              </Label>
              <Input
                id="username"
                placeholder="Enter their username or profile name"
                value={reportedUsername}
                onChange={(e) => setReportedUsername(e.target.value)}
                maxLength={100}
                className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-red-500/50 focus:ring-red-500/20"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
              <p className="text-xs text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Leave blank if reporting a general issue or technical problem.
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Describe the issue *
              </Label>
              <Textarea
                id="description"
                placeholder="Please provide as much detail as possible. Include what happened, when it occurred, and any relevant context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={6}
                maxLength={2000}
                className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-red-500/50 focus:ring-red-500/20 resize-none"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
              <p className="text-xs text-white/40 text-right" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {description.length}/2000 characters
              </p>
            </div>

            {/* Contact Email (for non-logged-in users) */}
            {!user && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Your email address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  maxLength={255}
                  className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-red-500/50 focus:ring-red-500/20"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
                <p className="text-xs text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  We'll use this to follow up on your report if needed.
                </p>
              </div>
            )}

            {/* Privacy Notice */}
            <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
              <p className="font-medium text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Privacy Notice
              </p>
              <p className="text-sm text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Your report is confidential. The reported user will not know who submitted the report. We may contact
                you for additional information if needed.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="submit"
                disabled={submitting || !reportType || !description.trim()}
                className="flex-1 h-12 bg-red-500 hover:bg-red-400 text-white rounded-xl disabled:opacity-50"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1 h-12 border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Cancel
              </Button>
            </div>
          </form>

          {/* Additional Help */}
          <div className="mt-12 text-center">
            <p className="text-sm text-white/40 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Need immediate help?
            </p>
            <div
              className="flex flex-wrap justify-center gap-4 text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <Link to="/safety" className="text-white/50 hover:text-rose-400 transition-colors">
                Safety Tips
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/help" className="text-white/50 hover:text-rose-400 transition-colors">
                Help Center
              </Link>
              <span className="text-white/20">•</span>
              <Link to="/guidelines" className="text-white/50 hover:text-rose-400 transition-colors">
                Community Guidelines
              </Link>
            </div>
          </div>
        </div>

        {user && <MobileNav />}
      </div>

      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}
