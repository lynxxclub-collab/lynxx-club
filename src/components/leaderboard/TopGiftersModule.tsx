import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import TopGiftersList from './TopGiftersList';
import TopGiftersBottomSheet from './TopGiftersBottomSheet';
import { useTopGifters, TimeWindow } from '@/hooks/useTopGifters';
import { Trophy, ChevronDown, Loader2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface TopGiftersModuleProps {
  creatorId: string;
  creatorName: string;
  showDaily?: boolean;
}

const MODULE_STYLES = `
  @keyframes crown-glow {
    0% { box-shadow: 0 0 5px rgba(251, 191, 36, 0.2); }
    50% { box-shadow: 0 0 15px rgba(251, 191, 36, 0.6); }
    100% { box-shadow: 0 0 5px rgba(251, 191, 36, 0.2); }
  }
`;

export default function TopGiftersModule({ 
  creatorId, 
  creatorName,
  showDaily = true 
}: TopGiftersModuleProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<TimeWindow>('weekly');
  const [expanded, setExpanded] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  
  // Fetch 3 items by default, 10 if expanded (desktop)
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
      <style>{MODULE_STYLES}</style>
      <Card className="rounded-2xl bg-[#0a0a0f] border border-white/10 overflow-hidden shadow-sm">
        {/* Top decorative gradient line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        
        <CardHeader className="pb-3 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center animate-crown-glow shadow-lg shadow-amber-500/20">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <CardTitle 
                className="text-lg text-white font-semibold"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Top Gifters
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-4 sm:px-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TimeWindow)} className="w-full">
            <TabsList 
              className={cn(
                "grid w-full bg-black/40 border border-white/5 h-9 p-1 mb-4",
                showDaily ? "grid-cols-3" : "grid-cols-2"
              )}
            >
              <TabsTrigger 
                value="weekly" 
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/20 text-white/60 hover:text-white transition-all duration-200 text-xs font-medium rounded-md"
              >
                Weekly
              </TabsTrigger>
              {showDaily && (
                <TabsTrigger 
                  value="daily" 
                  className="data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/20 text-white/60 hover:text-white transition-all duration-200 text-xs font-medium rounded-md"
                >
                  Daily
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="alltime" 
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/20 text-white/60 hover:text-white transition-all duration-200 text-xs font-medium rounded-md"
              >
                All-Time
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <div className="absolute inset-0 blur-xl bg-amber-500/20" />
                </div>
                <p className="text-xs text-white/40 mt-3">Loading rankings...</p>
              </div>
            ) : (
              <>
                <TabsContent value="weekly" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <TopGiftersList gifters={gifters} showAll={expanded} compact={!expanded} />
                </TabsContent>
                {showDaily && (
                  <TabsContent value="daily" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                    <TopGiftersList gifters={gifters} showAll={expanded} compact={!expanded} />
                  </TabsContent>
                )}
                <TabsContent value="alltime" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
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
              className="w-full mt-3 h-9 text-xs font-medium text-amber-400/80 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              {expanded ? 'Show Less' : 'View Top 10'}
              <ChevronDown className={cn(
                "w-4 h-4 ml-1 transition-transform duration-300",
                expanded && "rotate-180"
              )} />
            </Button>
          )}

          {gifters.length === 0 && !loading && (
            <div className="text-center py-6 px-2">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 mb-2">
                <Crown className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-xs text-white/40 font-medium">
                Send a gift to appear on the leaderboard!
              </p>
            </div>
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
```
