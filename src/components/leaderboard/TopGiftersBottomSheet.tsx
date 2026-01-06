I have refactored the `TopGiftersBottomSheet` component to be strictly **Mobile First** and consistent with your **Dark Theme**.

### Key Improvements:
1.  **Mobile UX Architecture:** Restructured the layout into a Flexbox column. The **Header and Tabs are now fixed at the top**, while the **Content List scrolls independently** inside the remaining space. This prevents the user from losing access to the "Daily/Weekly" toggles when scrolling through a long list of names.
2.  **Visual Polish:**
    *   **Tabs:** Redesigned the `TabsList` to use a pill-shaped design with a dark background and active Amber state, matching the premium "Leaderboard" aesthetic.
    *   **Typography:** Applied `'DM Sans'` throughout.
    *   **Safe Area:** Added padding for the bottom safe area (`pb-[env(safe-area-inset-bottom)]`) to ensure the list isn't hidden by the iPhone home indicator.
3.  **Performance:** Integrated the `ScrollArea` component (from your stack) to ensure smooth, native-feeling scrolling on both mobile and desktop.

Here is the optimized code:

```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import TopGiftersList from './TopGiftersList';
import { useTopGifters, TimeWindow } from '@/hooks/useTopGifters';
import { Trophy, Loader2, Crown } from 'lucide-react';
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
      <DrawerContent 
        className="bg-[#0a0a0f] border-t border-amber-500/20 max-h-[85vh] pb-[env(safe-area-inset-bottom)]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Fixed Header */}
        <DrawerHeader className="border-b border-white/5 pb-4 px-6 shrink-0 z-10 bg-[#0a0a0f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Crown className="w-5 h-5 text-white fill-white/20" />
                </div>
              </div>
              <div>
                <DrawerTitle className="text-white text-lg font-semibold leading-tight">
                  Top Gifters
                </DrawerTitle>
                <p className="text-xs text-amber-400/80 font-medium">
                  {creatorName}
                </p>
              </div>
            </div>
          </div>
        </DrawerHeader>

        {/* Main Content Area with Flex Layout */}
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Fixed Tabs Bar */}
          <div className="px-6 py-4 shrink-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-sm">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TimeWindow)} className="w-full">
              <TabsList 
                className={`grid w-full bg-black/40 border border-white/5 h-10 p-1 ${
                  showDaily ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                <TabsTrigger 
                  value="weekly" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/20 text-white/60 hover:text-white transition-all duration-200 text-xs font-medium rounded-md"
                >
                  Weekly
                </TabsTrigger>
                {showDaily && (
                  <TabsTrigger 
                    value="daily" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/20 text-white/60 hover:text-white transition-all duration-200 text-xs font-medium rounded-md"
                  >
                    Daily
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="alltime" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/20 text-white/60 hover:text-white transition-all duration-200 text-xs font-medium rounded-md"
                >
                  All-Time
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 px-6">
            <div className="py-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    <div className="absolute inset-0 blur-xl bg-amber-500/20" />
                  </div>
                  <p className="text-xs text-white/40 mt-4">Loading rankings...</p>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TimeWindow)} className="w-full">
                  <TabsContent value="weekly" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                    <TopGiftersList gifters={gifters} showAll />
                  </TabsContent>
                  {showDaily && (
                    <TabsContent value="daily" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                      <TopGiftersList gifters={gifters} showAll />
                    </TabsContent>
                  )}
                  <TabsContent value="alltime" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                    <TopGiftersList gifters={gifters} showAll />
                  </TabsContent>
                </Tabs>
              )}
              
              {/* Legend / Footer */}
              <div className="mt-8 pt-4 border-t border-white/5 text-center pb-6">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">
                  Rankings based on total credits gifted
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
```