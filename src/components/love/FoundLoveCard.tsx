import { Heart, Gift, Star, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FoundLoveCardProps {
  onShare: () => void;
}

export default function FoundLoveCard({ onShare }: FoundLoveCardProps) {
  return (
    <Card className="bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-red-500/10 border-pink-500/20 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400/20 to-transparent rounded-full blur-2xl" />
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0">
            <Heart className="w-7 h-7 text-white fill-white" />
          </div>
          
          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-display font-bold text-foreground">
              Found Someone Special?
            </h3>
            
            <p className="text-sm text-muted-foreground">
              Share your success story and earn:
            </p>
            
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Gift className="w-4 h-4 text-teal" />
                <span>$25 Amazon gift card (each)</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-gold" />
                <span>6 months Alumni Access (free)</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Heart className="w-4 h-4 text-pink-500" />
                <span>Featured in our success stories</span>
              </li>
            </ul>
            
            <Button 
              onClick={onShare}
              className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white"
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
