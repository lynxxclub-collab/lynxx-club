import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { GiftTransaction } from '@/hooks/useGifts';
import { format } from 'date-fns';

interface GiftMessageProps {
  transaction: GiftTransaction;
  onReact?: (transactionId: string, reaction: string) => void;
}

const THANK_YOU_REACTIONS = ['❤️', '😘', '👀', '👑'];

export default function GiftMessage({ transaction, onReact }: GiftMessageProps) {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  
  const isRecipient = user?.id === transaction.recipient_id;
  const isSender = user?.id === transaction.sender_id;
  
  const gift = transaction.gift;
  const animationType = (gift?.animation_type || 'standard') as 'standard' | 'premium' | 'ultra';

  const handleReaction = (reaction: string) => {
    onReact?.(transaction.id, reaction);
    setShowReactions(false);
  };

  return (
    <div className={cn(
      "flex gap-2",
      isSender ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "relative max-w-[80%] rounded-2xl p-4 overflow-hidden",
        animationType === 'ultra'
          ? "bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-amber-500/30 border border-amber-500/40"
          : animationType === 'premium'
            ? "bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-purple-500/30 border border-purple-500/40"
            : "bg-gradient-to-br from-rose-500/20 via-pink-500/15 to-rose-500/20 border border-rose-500/30"
      )}>
        {/* Shimmer effect for premium/ultra */}
        {animationType !== 'standard' && (
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(
                105deg,
                transparent 40%,
                ${animationType === 'ultra' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(168, 85, 247, 0.4)'} 50%,
                transparent 60%
              )`,
              animation: 'shimmer 3s infinite'
            }}
          />
        )}
        
        <div className="relative flex items-center gap-3">
          {/* Gift emoji with glow */}
          <div className="relative">
            <span 
              className={cn(
                "text-4xl",
                animationType === 'ultra' && "animate-float"
              )}
              style={{ animationDuration: '3s' }}
            >
              {gift?.emoji || '🎁'}
            </span>
            {animationType !== 'standard' && (
              <div 
                className={cn(
                  "absolute inset-0 blur-xl -z-10",
                  animationType === 'ultra' ? "bg-amber-400/40" : "bg-purple-400/40"
                )}
              />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">
                {gift?.name || 'Gift'}
              </span>
              {animationType === 'ultra' && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300">
                  ✨ Premium
                </span>
              )}
            </div>
            
            {transaction.message && (
              <p className="text-sm text-white/80 mt-1 italic">
                "{transaction.message}"
              </p>
            )}
            
            <p className="text-xs text-white/40 mt-1">
              {format(new Date(transaction.created_at), 'h:mm a')}
            </p>
          </div>
        </div>

        {/* Thank you reaction */}
        {transaction.thank_you_reaction && (
          <div className="absolute -bottom-2 -right-2 text-xl animate-pulse">
            {transaction.thank_you_reaction}
          </div>
        )}
      </div>

      {/* Reaction picker for recipient */}
      {isRecipient && !transaction.thank_you_reaction && (
        <div className="flex items-end">
          {showReactions ? (
            <div className="flex gap-1 bg-[#1a1a1f] border border-white/10 rounded-full px-2 py-1 animate-fade-in">
              {THANK_YOU_REACTIONS.map((reaction) => (
                <button
                  key={reaction}
                  onClick={() => handleReaction(reaction)}
                  className="text-lg hover:scale-125 transition-transform p-1"
                >
                  {reaction}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setShowReactions(true)}
              className="text-xs text-white/40 hover:text-white/60 transition-colors px-2 py-1"
            >
              Say thanks
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
