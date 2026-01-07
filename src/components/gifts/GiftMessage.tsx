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

const MESSAGE_STYLES = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

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
    <>
      <style>{MESSAGE_STYLES}</style>
      <div className={cn(
        "flex gap-2 mb-4 group", // Added mb-4 for spacing
        isSender ? "justify-end" : "justify-start"
      )}>
        <div className={cn(
          "relative max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4 overflow-hidden transition-all duration-300",
          animationType === 'ultra'
            ? "bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-amber-500/30 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
            : animationType === 'premium'
              ? "bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-purple-500/30 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
              : "bg-gradient-to-br from-rose-500/20 via-pink-500/15 to-rose-500/20 border border-rose-500/30 shadow-md"
        )}>
          {/* Shimmer effect for premium/ultra */}
          {animationType !== 'standard' && (
            <div 
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: `linear-gradient(
                  105deg,
                  transparent 40%,
                  ${animationType === 'ultra' ? 'rgba(251, 191, 36, 0.5)' : 'rgba(168, 85, 247, 0.5)'} 50%,
                  transparent 60%
                )`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s infinite'
              }}
            />
          )}
          
          <div className="relative flex items-start gap-3">
            {/* Gift emoji with glow */}
            <div className="relative shrink-0">
              <span 
                className={cn(
                  "text-3xl sm:text-4xl block",
                  animationType === 'ultra' && "animate-float"
                )}
                style={{ animationDuration: '3s' }}
              >
                {gift?.emoji || '🎁'}
              </span>
              {animationType !== 'standard' && (
                <div 
                  className={cn(
                    "absolute inset-0 blur-xl -z-10 rounded-full",
                    animationType === 'ultra' ? "bg-amber-400/50" : "bg-purple-400/50"
                  )}
                />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm sm:text-base tracking-wide">
                  {gift?.name || 'Gift'}
                </span>
                {animationType === 'ultra' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 uppercase tracking-wider font-bold">
                    Ultra
                  </span>
                )}
              </div>
              
              {transaction.message && (
                <p className="text-sm text-white/90 mt-1 leading-relaxed break-words">
                  "{transaction.message}"
                </p>
              )}
              
              <p className="text-[10px] sm:text-xs text-white/40 mt-1.5 font-mono uppercase">
                {transaction.created_at ? format(new Date(transaction.created_at), 'h:mm a') : ''}
              </p>
            </div>
          </div>

          {/* Thank you reaction display */}
          {transaction.thank_you_reaction && (
            <div className="absolute -bottom-2 -right-2 text-2xl drop-shadow-lg animate-fade-in">
              {transaction.thank_you_reaction}
            </div>
          )}
        </div>

        {/* Reaction picker for recipient */}
        {isRecipient && !transaction.thank_you_reaction && (
          <div className="flex items-end pb-1">
            {showReactions ? (
              <div className="flex gap-1.5 bg-[#18181b] border border-white/10 rounded-full px-2 py-1.5 shadow-xl backdrop-blur-md animate-fade-in">
                {THANK_YOU_REACTIONS.map((reaction) => (
                  <button
                    key={reaction}
                    onClick={() => handleReaction(reaction)}
                    className="text-xl hover:scale-125 transition-transform p-1 active:scale-95"
                    aria-label={`React with ${reaction}`}
                  >
                    {reaction}
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => setShowReactions(true)}
                className={cn(
                  "text-[10px] sm:text-xs text-white/40 hover:text-rose-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5",
                  "border border-transparent hover:border-white/10"
                )}
              >
                Say thanks
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}