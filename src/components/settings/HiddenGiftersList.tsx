import { useHiddenGifters } from '@/hooks/useTopGifters';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, Loader2, UserX, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface HiddenGiftersListProps {
  creatorId: string;
}

export default function HiddenGiftersList({ creatorId }: HiddenGiftersListProps) {
  const { hiddenGifters, loading, unhideGifter } = useHiddenGifters(creatorId);

  const handleUnhide = async (hiddenId: string, gifterName: string) => {
    const { error } = await unhideGifter(hiddenId);
    if (error) {
      toast.error('Failed to unhide user');
    } else {
      toast.success(`${gifterName} can now appear on your leaderboard`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
      </div>
    );
  }

  if (hiddenGifters.length === 0) {
    return (
      <div className={cn(
        "flex items-center justify-center gap-3 py-8 px-4 rounded-xl border border-dashed",
        "bg-white/[0.02] border-white/10"
      )}>
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          <UserX className="w-5 h-5 text-white/30" />
        </div>
        <p className="text-sm text-white/40 font-medium">No hidden users</p>
      </div>
    );
  }

  return (
    <div 
      className="space-y-2"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {hiddenGifters.map((hidden) => (
        <div 
          key={hidden.id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
            "bg-[#0f0f12] border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
          )}
        >
          <Avatar className="w-10 h-10 border border-white/10 bg-white/5">
            <AvatarImage src={hidden.gifter_photo || undefined} />
            <AvatarFallback className="bg-white/10 text-white/70 text-xs font-bold">
              {hidden.gifter_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white/90 font-medium truncate block">
              {hidden.gifter_name}
            </span>
            <span className="text-[10px] text-white/30 uppercase tracking-wide">
              Hidden from leaderboard
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUnhide(hidden.id, hidden.gifter_name)}
            className={cn(
              "h-9 px-3 text-xs font-bold rounded-lg transition-colors",
              "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
            )}
          >
            <EyeOff className="w-3.5 h-3.5 mr-1.5" />
            Unhide
          </Button>
        </div>
      ))}
    </div>
  );
}