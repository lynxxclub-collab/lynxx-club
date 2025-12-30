import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import TopGiftersList from './TopGiftersList';
import TopGiftersBottomSheet from './TopGiftersBottomSheet';
import { useTopGifters, TimeWindow } from '@/hooks/useTopGifters';
import { Trophy, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface TopGiftersModuleProps {
  creatorId: string;
  creatorName: string;
  showDaily?: boolean;
}

export default function TopGiftersModule({ 
  creatorId, 
  creatorName,
  showDaily = true 
}: TopGiftersModuleProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TimeWindow>('weekly');
  const [expanded, setExpanded] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  
  const { gifters, loading } = useTopGifters(creatorId, activeTab, expanded ? 10 : 3);

  const handleViewMore = () => {
    if (isMobile) {
      setShowBottomSheet(true);
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <>
      <Card className="bg-white/[0.02] border-amber-500/20 overflow-hidden">
        {/* Header with gradient accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center animate-crown-glow">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <CardTitle className="text-lg text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Top Gifters
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TimeWindow)}>
            <TabsList className={cn(
              "grid w-full bg-white/[0.02] border border-white/10 mb-4",
              showDaily ? "grid-cols-3" : "grid-cols-2"
            )}>
              <TabsTrigger 
                value="weekly" 
                className="text-xs data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
              >
                Weekly
              </TabsTrigger>
              {showDaily && (
                <TabsTrigger 
                  value="daily" 
                  className="text-xs data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
                >
                  Daily
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="alltime" 
                className="text-xs data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
              >
                All-Time
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              </div>
            ) : (
              <>
                <TabsContent value="weekly" className="mt-0">
                  <TopGiftersList gifters={gifters} showAll={expanded} compact={!expanded} />
                </TabsContent>
                {showDaily && (
                  <TabsContent value="daily" className="mt-0">
                    <TopGiftersList gifters={gifters} showAll={expanded} compact={!expanded} />
                  </TabsContent>
                )}
                <TabsContent value="alltime" className="mt-0">
                  <TopGiftersList gifters={gifters} showAll={expanded} compact={!expanded} />
                </TabsContent>
              </>
            )}
          </Tabs>

          {/* View more button */}
          {gifters.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewMore}
              className="w-full mt-3 text-amber-400/70 hover:text-amber-400 hover:bg-amber-500/10"
            >
              {expanded ? 'Show Less' : 'View Top 10'}
              <ChevronDown className={cn(
                "w-4 h-4 ml-1 transition-transform",
                expanded && "rotate-180"
              )} />
            </Button>
          )}

          {gifters.length === 0 && !loading && (
            <p className="text-center text-xs text-white/30 mt-2">
              Send a gift to appear on the leaderboard!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mobile Bottom Sheet */}
      <TopGiftersBottomSheet
        open={showBottomSheet}
        onOpenChange={setShowBottomSheet}
        creatorId={creatorId}
        creatorName={creatorName}
        showDaily={showDaily}
        defaultTab={activeTab}
      />
    </>
  );
}
