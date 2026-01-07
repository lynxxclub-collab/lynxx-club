import { Heart, Gift, Star, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FoundLoveCardProps {
  onShare: () => void;
}

export default function FoundLoveCard({ onShare }: FoundLoveCardProps) {
  return (
    <Card 
      className="rounded-2xl bg-[#0a0a0f] border border-rose-500/20 overflow-hidden relative shadow-sm"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Ambient Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          {/* Icon Box */}
          <div className="relative w-full sm:w-auto flex justify-center sm:justify-start">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20 ring-4 ring-[#0a0a0f]">
              <Heart className="w-7 h-7 text-white fill-white/20" />
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-3 sm:space-y-4 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Found Someone Special?
            </h3>
            
            <p className="text-sm text-white/60 leading-relaxed">
              Share your success story and earn:
            </p>
            
            <ul className="space-y-2.5">
              <li className="flex items-center gap-3 text-sm justify-center sm:justify-start">
                <div className="w-6 h-6 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0">
                  <Gift className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <span className="text-white/80">$25 Amazon gift card (each)</span>
              </li>
              <li className="flex items-center gap-3 text-sm justify-center sm:justify-start">
                <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                </div>
                <span className="text-white/80">6 months Alumni Access (free)</span>
              </li>
              <li className="flex items-center gap-3 text-sm justify-center sm:justify-start">
                <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                </div>
                <span className="text-white/80">Featured in our success stories</span>
              </li>
            </ul>
            
            <Button 
              onClick={onShare}
              className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/20"
            >
              Share Your Story
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
