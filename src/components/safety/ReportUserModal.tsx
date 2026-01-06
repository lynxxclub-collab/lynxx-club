import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, ShieldAlert, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <DialogContent 
        className="sm:max-w-md p-0 overflow-hidden bg-[#0f0f12] border-white/10 shadow-2xl"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Top gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />

        <div className="p-6">
          <DialogHeader className="space-y-4 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <ShieldAlert className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white leading-tight">
                  Report <span className="text-red-400">{userName}</span>
                </DialogTitle>
                <DialogDescription className="text-white/60 mt-1 text-sm">
                  Help us keep Lynxx Club safe
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-3">
              {REPORT_REASONS.map((r) => (
                <div
                  key={r.value}
                  className={cn(
                    "flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer group select-none",
                    reason === r.value
                      ? "bg-red-500/10 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                      : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                  )}
                  onClick={() => setReason(r.value)}
                  role="button"
                  tabIndex={0}
                >
                  <RadioGroupItem
                    value={r.value}
                    id={r.value}
                    className="border-white/30 text-red-500 data-[state=checked]:border-red-500 data-[state=checked]:bg-red-500"
                  />
                  <Label
                    htmlFor={r.value}
                    className="flex-1 cursor-pointer flex items-center gap-3 text-white/70 font-medium"
                  >
                    <span className="text-xl">{r.icon}</span>
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="space-y-2">
              <Label className="text-white/80 text-sm font-medium">
                Additional details (optional)
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more context about what happened..."
                rows={3}
                className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-white/20 rounded-xl focus:border-red-500/50 focus:ring-red-500/20 resize-none text-sm"
                maxLength={500}
              />
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-white/60 leading-relaxed">
                False reports may result in action against your account. Only report genuine violations.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl h-11 px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !reason}
              className={cn(
                "bg-red-600 hover:bg-red-500 text-white rounded-xl h-11 px-6 shadow-lg shadow-red-500/20",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:shadow-none"
              )}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : (
                "Submit Report"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}