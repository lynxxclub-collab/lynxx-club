import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock, Unlock, Gem, Loader2, ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const IMAGE_UNLOCK_COST = 10;

interface ChatImageProps {
  messageId: string;
  content: string; // image path in storage
  senderId: string;
  isUnlocked: boolean; // billed_at !== null means unlocked
  onUnlock?: () => void;
  alt?: string;
}

export default function ChatImage({
  messageId,
  content,
  senderId,
  isUnlocked: initialUnlocked,
  onUnlock,
  alt = "Shared image",
}: ChatImageProps) {
  const { user, profile } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();

  const [isUnlocked, setIsUnlocked] = useState(initialUnlocked);
  const [unlocking, setUnlocking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isSeeker = profile?.user_type === "seeker";
  const isOwnMessage = senderId === user?.id;
  const hasEnoughCredits = (wallet?.credit_balance || 0) >= IMAGE_UNLOCK_COST;

  // Determine if this image should be locked
  // Lock if: seeker viewing + not own message + not yet unlocked (billed)
  const shouldShowLocked = isSeeker && !isOwnMessage && !isUnlocked;

  // Load image URL
  const loadImage = async () => {
    if (!content) return;

    setImageLoading(true);
    try {
      const { data, error } = await supabase.storage.from("chat-images").createSignedUrl(content, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        setImageUrl(data.signedUrl);
      }
    } catch (error) {
      console.error("Error loading image:", error);
      setImageError(true);
    } finally {
      setImageLoading(false);
    }
  };

  // Load image when component mounts or unlocks
  useEffect(() => {
    if (!shouldShowLocked || isUnlocked) {
      loadImage();
    }
  }, [shouldShowLocked, isUnlocked, content]);

  const handleUnlock = async () => {
    if (!user || !isSeeker) return;

    setUnlocking(true);
    setShowConfirm(false);

    try {
      // Check balance again
      const { data: currentWallet } = await supabase
        .from("wallets")
        .select("credit_balance")
        .eq("user_id", user.id)
        .single();

      if (!currentWallet || currentWallet.credit_balance < IMAGE_UNLOCK_COST) {
        toast.error("Insufficient credits");
        setUnlocking(false);
        return;
      }

      // Deduct credits from seeker
      const newBalance = currentWallet.credit_balance - IMAGE_UNLOCK_COST;
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ credit_balance: newBalance })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      // Credit the earner (sender of the image)
      const creditValue = IMAGE_UNLOCK_COST * 0.1; // $1.00
      const earnerAmount = creditValue * 0.7; // $0.70
      const platformFee = creditValue * 0.3;

      const { data: earnerWallet } = await supabase
        .from("wallets")
        .select("available_earnings")
        .eq("user_id", senderId)
        .single();

      if (earnerWallet) {
        await supabase
          .from("wallets")
          .update({
            available_earnings: (earnerWallet.available_earnings || 0) + earnerAmount,
          })
          .eq("user_id", senderId);
      }

      // Mark message as billed/unlocked
      await supabase
        .from("messages")
        .update({
          billed_at: new Date().toISOString(),
          credits_cost: IMAGE_UNLOCK_COST,
          earner_amount: earnerAmount,
          platform_fee: platformFee,
        })
        .eq("id", messageId);

      // Load the image
      await loadImage();

      setIsUnlocked(true);
      refetchWallet();
      onUnlock?.();

      toast.success("Image unlocked!");
    } catch (error: any) {
      console.error("Unlock error:", error);
      toast.error("Failed to unlock image");
    } finally {
      setUnlocking(false);
    }
  };

  // Show locked state
  if (shouldShowLocked) {
    return (
      <>
        <div
          className="relative w-48 h-48 rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => setShowConfirm(true)}
        >
          {/* Blurred placeholder */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-purple-500/30 to-rose-500/30" />

          {/* Pattern overlay for visual interest */}
          <div className="absolute inset-0 opacity-20">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
                backgroundSize: "16px 16px",
              }}
            />
          </div>

          {/* Lock overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <div className="flex items-center gap-1.5 text-white font-medium">
              <Gem className="w-4 h-4 text-amber-400" />
              <span>{IMAGE_UNLOCK_COST} to unlock</span>
            </div>
            <p className="text-white/70 text-xs mt-1">Tap to view</p>
          </div>

          {/* Decorative image icon */}
          <ImageIcon className="absolute top-3 left-3 w-5 h-5 text-white/50" />
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Unlock This Image?
              </DialogTitle>
              <DialogDescription>This photo was shared with you. Unlock it to view the full image.</DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <span className="text-muted-foreground">Cost to unlock</span>
                <div className="flex items-center gap-2">
                  <Gem className="w-5 h-5 text-primary" />
                  <span className="text-xl font-bold">{IMAGE_UNLOCK_COST}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 mt-2">
                <span className="text-muted-foreground">Your balance</span>
                <div className="flex items-center gap-2">
                  <Gem className="w-5 h-5 text-primary" />
                  <span className={cn("text-xl font-bold", !hasEnoughCredits && "text-destructive")}>
                    {wallet?.credit_balance?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              {!hasEnoughCredits && (
                <div className="flex items-center gap-2 p-3 mt-2 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">
                    You need {IMAGE_UNLOCK_COST - (wallet?.credit_balance || 0)} more credits
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleUnlock} disabled={unlocking || !hasEnoughCredits}>
                {unlocking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock for {IMAGE_UNLOCK_COST} Credits
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show loading state
  if (imageLoading) {
    return (
      <div className="w-48 h-48 rounded-lg bg-secondary/50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error state
  if (imageError || !imageUrl) {
    return (
      <div className="w-48 h-48 rounded-lg bg-secondary/50 flex flex-col items-center justify-center gap-2">
        <ImageIcon className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Failed to load</p>
      </div>
    );
  }

  // Show unlocked image
  return (
    <img
      src={imageUrl}
      alt={alt}
      className="max-w-[280px] max-h-[280px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
      onClick={() => window.open(imageUrl, "_blank")}
      onError={() => setImageError(true)}
    />
  );
}
