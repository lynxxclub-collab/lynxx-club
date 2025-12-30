import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TopGiftersList from './TopGiftersList';
import { useTopGifters, TimeWindow } from '@/hooks/useTopGifters';
import { Trophy, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface TopGiftersBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName: string;
  showDaily?: boolean;
  defaultTab?: TimeWindow;
}

export default function TopGiftersBottomSheet({
  open,
  onOpenChange,
  creatorId,
  creatorName,
  showDaily = true,
  defaultTab = 'weekly'
}: TopGiftersBottomSheetProps) {
  const [activeTab, setActiveTab] = useState<TimeWindow>(defaultTab);
  
  const { gifters, loading } = useTopGifters(creatorId, activeTab, 10);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#0a0a0f] border-t border-amber-500/20 max-h-[85vh]">
        <DrawerHeader className="border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <DrawerTitle className="text-white font-semibold">
              Top Gifters for {creatorName}
            </DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TimeWindow)}>
            <TabsList className={`grid w-full ${showDaily ? 'grid-cols-3' : 'grid-cols-2'} bg-white/[0.02] border border-amber-500/20 mb-4`}>
              <TabsTrigger 
                value="weekly" 
                className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
              >
                Weekly
              </TabsTrigger>
              {showDaily && (
                <TabsTrigger 
                  value="daily" 
                  className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
                >
                  Daily
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="alltime" 
                className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
              >
                All-Time
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : (
              <>
                <TabsContent value="weekly" className="mt-0">
                  <TopGiftersList gifters={gifters} showAll />
                </TabsContent>
                {showDaily && (
                  <TabsContent value="daily" className="mt-0">
                    <TopGiftersList gifters={gifters} showAll />
                  </TabsContent>
                )}
                <TabsContent value="alltime" className="mt-0">
                  <TopGiftersList gifters={gifters} showAll />
                </TabsContent>
              </>
            )}
          </Tabs>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <p className="text-xs text-white/40 text-center">
              Rankings based on total credits gifted. Updates in real-time.
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
