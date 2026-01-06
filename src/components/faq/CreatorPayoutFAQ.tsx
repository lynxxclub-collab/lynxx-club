import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ChevronDown, Zap } from 'lucide-react';

interface CreatorPayoutFAQProps {
  showTitle?: boolean;
  currentBalance?: number; // Passed in to enable real-time context highlighting
}

const MINIMUM_PAYOUT = 25;

export default function CreatorPayoutFAQ({ 
  showTitle = true,
  currentBalance = 0 
}: CreatorPayoutFAQProps) {
  
  // Determine if user needs to see the minimum payout advice
  const isNearMinimum = currentBalance < MINIMUM_PAYOUT && currentBalance > 0;

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="flex items-center gap-3 text-xl font-bold text-white">
          <div className="p-2 bg-rose-500/20 rounded-lg">
            <DollarSign className="w-5 h-5 text-rose-400" />
          </div>
          <span>Earnings & Payouts</span>
        </div>
      )}
      
      <Accordion type="single" collapsible className="w-full space-y-3">
        
        {/* Minimum Payout - Conditionally Highlighted */}
        <AccordionItem 
          value="minimum-payout" 
          className={cn(
            "border border-white/10 rounded-xl bg-white/5 overflow-hidden transition-all",
            isNearMinimum && "border-rose-500/50 bg-rose-500/5 shadow-[0_0_20px_-5px_rgba(244,63,94,0.15)]"
          )}
        >
          <AccordionTrigger className="hover:no-underline px-5 py-4 text-left flex-1">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white">Is there a minimum payout?</span>
              {isNearMinimum && (
                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px] uppercase font-bold">
                  Relevant Now
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-white/50 shrink-0" />
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0 text-sm text-white/70 leading-relaxed">
            <p>
              Yes. Creators must earn at least <strong className="text-white">${MINIMUM_PAYOUT}</strong> before a payout is issued.
            </p>
            {isNearMinimum && (
              <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10 flex items-start gap-3">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/80">
                  You're almost there! You need <strong>${(MINIMUM_PAYOUT - currentBalance).toFixed(2)}</strong> more to qualify.
                </p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="how-earn" className="border border-white/10 rounded-xl bg-white/5 overflow-hidden">
          <AccordionTrigger className="hover:no-underline px-5 py-4 text-left flex-1">
            <span className="text-sm font-semibold text-white">How do creators earn money?</span>
            <ChevronDown className="h-4 w-4 text-white/50 shrink-0" />
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0 text-sm text-white/70 leading-relaxed">
            <p>
              Creators earn <strong className="text-teal-400">70%</strong> of credits spent on their content. The platform retains <strong className="text-purple-400">30%</strong> to support operations, safety, and secure payment processing.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="processing-delay" className="border border-white/10 rounded-xl bg-white/5 overflow-hidden">
          <AccordionTrigger className="hover:no-underline px-5 py-4 text-left flex-1">
            <span className="text-sm font-semibold text-white">Is there a processing delay?</span>
            <ChevronDown className="h-4 w-4 text-white/50 shrink-0" />
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0 text-sm text-white/70 leading-relaxed">
            <p>
              Yes. Earnings become available after a <strong>48-hour processing period</strong>. This ensures security and prevents fraudulent activity before funds are released to your bank account.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="payout-schedule" className="border border-white/10 rounded-xl bg-white/5 overflow-hidden">
          <AccordionTrigger className="hover:no-underline px-5 py-4 text-left flex-1">
            <span className="text-sm font-semibold text-white">When are payouts sent?</span>
            <ChevronDown className="h-4 w-4 text-white/50 shrink-0" />
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0 text-sm text-white/70 leading-relaxed">
            <p>
              Payouts are sent <strong>weekly, every Friday</strong>. As long as you've met the minimum balance threshold, your earnings will be automatically deposited.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="set-prices" className="border border-white/10 rounded-xl bg-white/5 overflow-hidden">
          <AccordionTrigger className="hover:no-underline px-5 py-4 text-left flex-1">
            <span className="text-sm font-semibold text-white">Can I set my own prices?</span>
            <ChevronDown className="h-4 w-4 text-white/50 shrink-0" />
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0 text-sm text-white/70 leading-relaxed">
            <p>
              Yes! You can set your video rates within the platform's allowed range (<strong className="text-white">200 – 900 credits</strong>). Text and image costs are standardized to ensure a consistent experience for seekers.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="receive-payouts" className="border border-white/10 rounded-xl bg-white/5 overflow-hidden">
          <AccordionTrigger className="hover:no-underline px-5 py-4 text-left flex-1">
            <span className="text-sm font-semibold text-white">How do I receive payouts?</span>
            <ChevronDown className="h-4 w-4 text-white/50 shrink-0" />
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0 text-sm text-white/70 leading-relaxed">
            <p>
              You connect a bank account through our secure <strong>Stripe Connect</strong> integration. Funds are sent directly to your linked bank account on payout day. We do not charge any withdrawal fees.
            </p>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}