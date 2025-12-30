import { useHiddenGifters } from '@/hooks/useTopGifters';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, Loader2, UserX } from 'lucide-react';
import { toast } from 'sonner';

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
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
      </div>
    );
  }

  if (hiddenGifters.length === 0) {
    return (
      <div className="flex items-center gap-3 py-4 px-3 rounded-lg bg-white/[0.02] border border-white/5">
        <UserX className="w-5 h-5 text-white/30" />
        <p className="text-sm text-white/40">No hidden users</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hiddenGifters.map((hidden) => (
        <div 
          key={hidden.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5"
        >
          <Avatar className="w-8 h-8 border border-white/10">
            <AvatarImage src={hidden.gifter_photo || undefined} />
            <AvatarFallback className="bg-white/10 text-white/50 text-sm">
              {hidden.gifter_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <span className="flex-1 text-sm text-white/70 truncate">
            {hidden.gifter_name}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUnhide(hidden.id, hidden.gifter_name)}
            className="h-7 px-2 text-white/40 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4 mr-1" />
            Unhide
          </Button>
        </div>
      ))}
    </div>
  );
}
