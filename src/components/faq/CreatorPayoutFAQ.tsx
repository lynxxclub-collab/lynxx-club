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
        <div className="flex items-center gap-2 text-lg font-semibold">
          <DollarSign className="w-5 h-5 text-primary" />
          Creator Payout FAQ
        </div>
      )}
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="how-earn">
          <AccordionTrigger className="text-left">
            How do creators earn money?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Creators earn 70% of credits spent on their content. The platform retains 30% to support operations, safety, and payments.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="payout-schedule">
          <AccordionTrigger className="text-left">
            When are payouts sent?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Payouts are sent weekly, every Friday.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="minimum-payout">
          <AccordionTrigger className="text-left">
            Is there a minimum payout?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Yes. Creators must earn at least $25 before a payout is issued.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="processing-delay">
          <AccordionTrigger className="text-left">
            Is there a processing delay?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Yes. Earnings become available after a 48-hour processing period for security and fraud prevention.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="receive-payouts">
          <AccordionTrigger className="text-left">
            How do I receive payouts?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Creators connect a bank account through our secure payout partner. Funds are sent directly to your bank on payout day.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="set-prices">
          <AccordionTrigger className="text-left">
            Can creators set their own prices?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Creators can set video prices within the allowed range (200–900 credits). Text and image costs are standardized to keep the experience consistent for users.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
