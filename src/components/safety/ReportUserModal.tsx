import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Flag, AlertTriangle, ShieldAlert } from "lucide-react";

interface ReportUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

const REPORT_REASONS = [
  { value: "inappropriate", label: "Inappropriate messages", icon: "💬", color: "purple" },
  { value: "harassment", label: "Harassment or bullying", icon: "😠", color: "red" },
  { value: "scam", label: "Scam attempt", icon: "🚨", color: "amber" },
  { value: "fake", label: "Fake profile", icon: "🎭", color: "blue" },
  { value: "other", label: "Other", icon: "📝", color: "gray" },
];

export default function ReportUserModal({ open, onOpenChange, userId, userName }: ReportUserModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!user || !reason) {
      toast.error("Please select a reason");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_id: userId,
        reason,
        description: description.trim() || null,
      });

      if (error) throw error;

      toast.success("Report submitted. Our team will review it.");
      onOpenChange(false);
      setReason("");
      setDescription("");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0f] border-white/10 p-0 overflow-hidden">
        {/* Top gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-500 via-rose-500 to-red-500" />

        <div className="p-6">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-xl text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Report <span className="text-red-400">{userName}</span>
                </DialogTitle>
                <DialogDescription className="text-white/50 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Help us keep Lynxx Club safe
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <div
                  key={r.value}
                  className={`flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer ${
                    reason === r.value
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                  onClick={() => setReason(r.value)}
                >
                  <RadioGroupItem
                    value={r.value}
                    id={r.value}
                    className="border-white/30 text-red-400 data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500"
                  />
                  <Label
                    htmlFor={r.value}
                    className="flex-1 cursor-pointer flex items-center gap-3 text-white/70"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span className="text-lg">{r.icon}</span>
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="space-y-2">
              <Label className="text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Additional details (optional)
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more context about what happened..."
                rows={3}
                className="bg-white/[0.02] border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-red-500/50 focus:ring-red-500/20 resize-none"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-white/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                False reports may result in action against your account. Only report genuine violations.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !reason}
              className="bg-red-500 hover:bg-red-400 text-white rounded-xl disabled:opacity-50"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Report
            </Button>
          </div>
        </div>

        {/* Font import */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
