import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DollarSign } from 'lucide-react';

interface CreatorPayoutFAQProps {
  showTitle?: boolean;
}

export default function CreatorPayoutFAQ({ showTitle = true }: CreatorPayoutFAQProps) {
  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <DollarSign className="w-5 h-5 text-purple-400" />
          Creator Payout FAQ
        </div>
      )}
      
      <Accordion type="single" collapsible className="w-full space-y-2">
        <AccordionItem value="how-earn" className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]">
          <AccordionTrigger 
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            How do creators earn money?
          </AccordionTrigger>
          <AccordionContent 
            className="text-white/60 pb-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Creators earn 70% of credits spent on their content. The platform retains 30% to support operations, safety, and payments.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="payout-schedule" className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]">
          <AccordionTrigger 
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            When are payouts sent?
          </AccordionTrigger>
          <AccordionContent 
            className="text-white/60 pb-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Payouts are sent weekly, every Friday.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="minimum-payout" className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]">
          <AccordionTrigger 
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Is there a minimum payout?
          </AccordionTrigger>
          <AccordionContent 
            className="text-white/60 pb-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Yes. Creators must earn at least $25 before a payout is issued.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="processing-delay" className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]">
          <AccordionTrigger 
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Is there a processing delay?
          </AccordionTrigger>
          <AccordionContent 
            className="text-white/60 pb-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Yes. Earnings become available after a 48-hour processing period for security and fraud prevention.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="receive-payouts" className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]">
          <AccordionTrigger 
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            How do I receive payouts?
          </AccordionTrigger>
          <AccordionContent 
            className="text-white/60 pb-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Creators connect a bank account through our secure payout partner. Funds are sent directly to your bank on payout day.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="set-prices" className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]">
          <AccordionTrigger 
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Can creators set their own prices?
          </AccordionTrigger>
          <AccordionContent 
            className="text-white/60 pb-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Creators can set video prices within the allowed range (200–900 credits). Text and image costs are standardized to keep the experience consistent for users.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
