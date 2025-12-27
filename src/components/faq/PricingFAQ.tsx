import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

interface PricingFAQProps {
  showTitle?: boolean;
}

export default function PricingFAQ({ showTitle = true }: PricingFAQProps) {
  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center gap-2 text-lg font-semibold">
          <HelpCircle className="w-5 h-5 text-primary" />
          Pricing FAQ
        </div>
      )}
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="how-credits-work">
          <AccordionTrigger className="text-left">
            How do credits work?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Credits are used to interact on Lynxx Club. Different credit packs offer different amounts, but credits are always spent the same way across the platform.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="why-messages-cost">
          <AccordionTrigger className="text-left">
            Why do messages cost credits?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Paid messaging keeps conversations intentional, supports creators, and helps prevent spam. This is how Lynxx Club stays engaging and creator-driven.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="interaction-costs">
          <AccordionTrigger className="text-left">
            How much does it cost to interact?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <ul className="space-y-2">
              <li><strong>Text message:</strong> 5 credits</li>
              <li><strong>Image unlock:</strong> 10 credits</li>
              <li><strong>Video:</strong> 200–900 credits, set by the creator</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="no-dollar-values">
          <AccordionTrigger className="text-left">
            Why don't you show dollar values per credit?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Credits are a platform token. Showing dollar values per interaction can be misleading because different packs offer different bonuses and pricing.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="refunds">
          <AccordionTrigger className="text-left">
            Are credits refundable?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            Credits are non-refundable once purchased or spent. If you experience a technical issue, contact support and we'll review it.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
