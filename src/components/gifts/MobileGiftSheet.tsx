import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { useGifts, useSendGift } from '@/hooks/useGifts';
import { cn } from '@/lib/utils';

interface MobileGiftSheetProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  conversationId?: string | null;
}

export default function MobileGiftSheet({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName,
  conversationId 
}: MobileGiftSheetProps) {
  const { gifts, loading } = useGifts();
  const { sendGift, sending } = useSendGift();
  
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const selectedGift = gifts.find(g => g.id === selectedGiftId);

  const handleSend = async () => {
    if (!selectedGiftId) return;
    
    const result = await sendGift(recipientId, selectedGiftId, conversationId || null, message);
    
    if (result.success) {
      onClose();
      setSelectedGiftId(null);
      setMessage('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f] rounded-t-3xl z-50 border-t border-white/10 max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0a0a0f]">
              <div>
                <h2 className="text-lg font-bold text-white">Send to {recipientName}</h2>
                <p className="text-xs text-muted-foreground">Choose a gift</p>
              </div>
              <button onClick={onClose} className="p-2 bg-white/5 rounded-full">
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Gift Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="aspect-square bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4 pb-24">
                  {gifts.map((gift) => (
                    <button
                      key={gift.id}
                      onClick={() => setSelectedGiftId(gift.id)}
                      className={cn(
                        "relative aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all border-2",
                        selectedGiftId === gift.id
                          ? "border-rose-500 bg-rose-500/10"
                          : "border-transparent bg-white/5 hover:bg-white/10"
                      )}
                    >
                      {/* Seasonal Badge */}
                      {gift.is_seasonal && (
                        <div className="absolute top-1 right-1 text-[10px] bg-amber-500 text-black font-bold px-1 rounded">NEW</div>
                      )}
                      
                      <span className="text-3xl mb-1">{gift.emoji}</span>
                      <span className="text-[10px] text-white/80 text-center leading-tight">{gift.name}</span>
                      <span className="text-[10px] font-bold text-rose-400 mt-1">{gift.credits_cost}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer / Message Input */}
            <div className="p-4 bg-[#0a0a0f] border-t border-white/10 pb-8">
              <div className="mb-3">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message (optional)..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 resize-none h-16"
                  maxLength={100}
                />
              </div>

              <button
                onClick={handleSend}
                disabled={!selectedGiftId || sending}
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all",
                  selectedGiftId 
                    ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/20" 
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                )}
              >
                {sending ? (
                  <>Sending...</>
                ) : (
                  <>
                    Send {selectedGift?.emoji} <Send size={18} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
