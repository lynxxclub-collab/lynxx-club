// RoleSelectionStep.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCreatorCap } from "@/hooks/useCreatorCap";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard, Wallet, ArrowRight, Check, AlertCircle, Loader2 } from "lucide-react";
import LaunchBonusModal from "@/components/launch/LaunchBonusModal";
import CreatorApplicationForm from "@/components/onboarding/CreatorApplicationForm";

interface Props {
  onComplete: () => void;
}

function SeekerCard({
  selected,
  loading,
  onSelect,
}: {
  selected: boolean;
  loading: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className={`relative p-6 rounded-xl border-2 transition-all duration-300 text-left group ${
        selected
          ? "border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/20"
          : "border-white/10 bg-white/[0.02] hover:border-rose-500/50 hover:bg-white/[0.05]"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="mb-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
          <CreditCard className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-display font-semibold mb-2 text-white">I Want to Date</h3>
        <p className="text-white/60 text-sm leading-relaxed">
          Browse profiles and pay for quality conversations with interesting people.
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-white/60">
          <ArrowRight className="w-3 h-3 text-rose-400" />
          Browse premium profiles
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <ArrowRight className="w-3 h-3 text-rose-400" />
          Pay with credits to message
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <ArrowRight className="w-3 h-3 text-rose-400" />
          Book video dates
        </div>
      </div>

      <div className="mt-4 px-3 py-1.5 bg-rose-500/20 rounded-full text-xs text-rose-300 font-medium inline-block">
        🎁 First 100 get 100 bonus credits!
      </div>
    </button>
  );
}

function EarnerCard({
  selected,
  loading,
  isCapped,
  spotsRemaining,
  onSelect,
}: {
  selected: boolean;
  loading: boolean;
  isCapped: boolean;
  spotsRemaining: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className={`relative p-6 rounded-xl border-2 transition-all duration-300 text-left group ${
        selected
          ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20"
          : "border-white/10 bg-white/[0.02] hover:border-purple-500/50 hover:bg-white/[0.05]"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="mb-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rose-500 to-purple-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-display font-semibold mb-2 text-white">I Want to Earn</h3>
        <p className="text-white/60 text-sm leading-relaxed">
          Get paid to chat and go on dates. Set your rates and earn on your terms.
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-white/60">
          <ArrowRight className="w-3 h-3 text-purple-400" />
          Earn money per message
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <ArrowRight className="w-3 h-3 text-purple-400" />
          Set your own rates
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <ArrowRight className="w-3 h-3 text-purple-400" />
          Withdraw anytime
        </div>
      </div>

      {isCapped ? (
        <div className="mt-4 px-3 py-1.5 bg-purple-500/20 rounded-full text-xs text-purple-300 font-medium inline-flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Application required
        </div>
      ) : (
        <div className="mt-4 px-3 py-1.5 bg-purple-500/20 rounded-full text-xs text-purple-300 font-medium inline-block">
          ⭐ {spotsRemaining} spots left — get featured!
        </div>
      )}
    </button>
  );
}

export default function RoleSelectionStep({ onComplete }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { is_capped, spots_remaining, loading: capLoading } = useCreatorCap();

  const [selectedRole, setSelectedRole] = useState<"seeker" | "earner" | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [bonusType, setBonusType] = useState<"seeker" | "earner">("seeker");
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  // If user already has an application, redirect
  useEffect(() => {
    const checkExistingApplication = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("creator_applications")
        .select("id, status")
        .eq("user_id", user.id)
        .single();

      if (data?.status === "pending" || data?.status === "approved") {
        navigate("/application-status");
      }
    };

    checkExistingApplication();
  }, [user?.id, navigate]);

  const handleSelect = async (role: "seeker" | "earner") => {
    if (!user?.id) {
      toast.error("Please sign in to continue");
      return;
    }

    // Earner cap reached -> show application
    if (role === "earner" && is_capped) {
      setShowApplicationForm(true);
      return;
    }

    setSelectedRole(role);
    setLoading(true);

    try {
      // Check launch bonus eligibility
      const { count, error: countError } = await supabase
        .from("launch_promotions")
        .select("*", { count: "exact", head: true })
        .eq("user_type", role);

      if (countError) throw countError;

      const isEligible = role === "seeker" ? (count || 0) < 100 : (count || 0) < 50;

      if (isEligible) {
        if (role === "seeker") {
          // 100 bonus credits
          const { error: upErr } = await supabase
            .from("profiles")
            .update({
              user_type: "seeker",
              onboarding_step: 3,
              credit_balance: 100,
            })
            .eq("id", user.id);

          if (upErr) throw upErr;

          const { error: promoErr } = await supabase.from("launch_promotions").insert({
            user_id: user.id,
            user_type: "seeker",
            promotion_type: "launch_bonus_100",
            bonus_credits: 100,
          });

          if (promoErr) throw promoErr;

          setBonusType("seeker");
          setShowBonusModal(true);
          return;
        }

        // Earner: featured 30 days
        const featuredUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error: upErr } = await supabase
          .from("profiles")
          .update({
            user_type: "earner",
            onboarding_step: 3,
            featured_until: featuredUntil,
            is_featured: true,
          })
          .eq("id", user.id);

        if (upErr) throw upErr;

        const { error: promoErr } = await supabase.from("launch_promotions").insert({
          user_id: user.id,
          user_type: "earner",
          promotion_type: "launch_featured_30d",
          featured_until: featuredUntil,
        });

        if (promoErr) throw promoErr;

        setBonusType("earner");
        setShowBonusModal(true);
        return;
      }

      // No bonus: just update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          user_type: role,
          onboarding_step: 3,
        })
        .eq("id", user.id);

      if (error) {
        if (error.message?.includes("Creator cap reached")) {
          toast.error("Creator spots are full. Please apply instead.");
          setShowApplicationForm(true);
          return;
        }
        throw error;
      }

      onComplete();
    } catch (err: any) {
      console.error("Role selection error:", err);
      toast.error("Something went wrong. Please try again.");
      setSelectedRole(null);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowBonusModal(false);
    onComplete();
  };

  const handleApplicationSubmitted = () => {
    navigate("/application-status");
  };

  if (showApplicationForm) {
    return <CreatorApplicationForm onSubmitted={handleApplicationSubmitted} />;
  }

  if (capLoading) {
    return (
      <Card className="bg-white/[0.02] backdrop-blur-xl border-white/10">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white/[0.02] backdrop-blur-xl border-white/10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
            Choose your path
          </CardTitle>
          <CardDescription className="text-white/60">This determines how you'll use Lynxx Club</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <SeekerCard
              selected={selectedRole === "seeker"}
              loading={loading}
              onSelect={() => handleSelect("seeker")}
            />

            <EarnerCard
              selected={selectedRole === "earner"}
              loading={loading}
              isCapped={is_capped}
              spotsRemaining={spots_remaining}
              onSelect={() => handleSelect("earner")}
            />
          </div>

          <p className="text-center text-xs text-white/40 mt-6">
            You can only choose one role. This cannot be changed later.
          </p>
        </CardContent>
      </Card>

      <LaunchBonusModal open={showBonusModal} onClose={handleModalClose} bonusType={bonusType} />
    </>
  );
}

