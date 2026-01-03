import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Coins } from "lucide-react";

interface CreatorPayoutFAQProps {
  showTitle?: boolean;
}

export default function CreatorPayoutFAQ({ showTitle = true }: CreatorPayoutFAQProps) {
  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Coins className="w-5 h-5 text-primary" />
          Creator Payout FAQ
        </div>
      )}

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="how-earn">
          <AccordionTrigger className="text-left">
            How do creators earn?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            When seekers spend credits with you, you receive a <span className="font-medium text-foreground">70% creator share</span>.
            The remaining 30% supports operations, safety, and payment processing.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="when-paid">
          <AccordionTrigger className="text-left">
            When are payouts sent?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Payouts are sent <span className="font-medium text-foreground">weekly on Fridays</span>.
            If Friday is a banking holiday, it may arrive the next business day.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="minimum">
          <AccordionTrigger className="text-left">
            Is there a minimum payout?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Yes — payouts start once your available earnings reach <span className="font-medium text-foreground">$25</span>.
            If you’re under that, it simply rolls into the next payout cycle.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="hold">
          <AccordionTrigger className="text-left">
            Why is there a 48-hour hold?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            For security. Earnings become available after <span className="font-medium text-foreground">48 hours</span> to reduce fraud,
            chargebacks, and disputes.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="how-receive">
          <AccordionTrigger className="text-left">
            How do I get paid?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Connect your bank account in <span className="font-medium text-foreground">Settings → Payouts</span>.
            Payouts are sent to your connected account on payout day.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="prices">
          <AccordionTrigger className="text-left">
            Can I set my own prices?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Yes — you can set your <span className="font-medium text-foreground">video rates</span> within the allowed range{" "}
            <span className="font-medium text-foreground">(200–900 credits)</span>.
            Text and image costs are standardized to keep things simple for everyone.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="missing-payout">
          <AccordionTrigger className="text-left">
            What if my payout didn’t arrive?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            First, confirm your bank details are connected and verified. Then check whether your balance met the $25 minimum and cleared the 48-hour hold.
            If it still looks off, contact support and we’ll help.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}