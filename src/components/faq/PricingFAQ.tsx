import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Sparkles } from "lucide-react";

interface PricingFAQProps {
  showTitle?: boolean;
}

const TEXT_COST = 5;
const IMAGE_UNLOCK_COST = 10;
const VIDEO_RANGE = "200–900";

export default function PricingFAQ({ showTitle = true }: PricingFAQProps) {
  return (
    <div className="space-y-4">
      {showTitle && (
        <div
          className="flex items-center gap-2 text-lg font-semibold text-white"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          <HelpCircle className="w-5 h-5 text-purple-400" />
          Pricing FAQ
        </div>
      )}

      <Accordion type="single" collapsible className="w-full space-y-2">
        {/* Credits 101 */}
        <AccordionItem
          value="credits-101"
          className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]"
        >
          <AccordionTrigger
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            How do credits work?
          </AccordionTrigger>
          <AccordionContent
            className="text-white/60 pb-4 space-y-3"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <p>
              Credits are what you use to unlock and interact on Lynxx Club. You can buy packs anytime, and
              credits spend the same way across the platform.
            </p>

            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <Sparkles className="w-4 h-4 text-purple-300" />
                Quick example
              </div>
              <p className="text-white/55 text-sm mt-1">
                A text is <span className="text-white/80 font-medium">{TEXT_COST} credits</span>. An image unlock is{" "}
                <span className="text-white/80 font-medium">{IMAGE_UNLOCK_COST} credits</span>. Video rates vary by creator.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Why pay */}
        <AccordionItem
          value="why-credits"
          className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]"
        >
          <AccordionTrigger
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Why do messages cost credits?
          </AccordionTrigger>
          <AccordionContent
            className="text-white/60 pb-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            It keeps conversations intentional, reduces spam, and supports creators for their time and attention.
          </AccordionContent>
        </AccordionItem>

        {/* Costs */}
        <AccordionItem
          value="costs"
          className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]"
        >
          <AccordionTrigger
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            How much does it cost to interact?
          </AccordionTrigger>
          <AccordionContent
            className="text-white/60 pb-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span>Text message</span>
                <span className="text-purple-400 font-medium">{TEXT_COST} credits</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span>Image unlock</span>
                <span className="text-purple-400 font-medium">{IMAGE_UNLOCK_COST} credits</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Video call</span>
                <span className="text-purple-400 font-medium">{VIDEO_RANGE} credits</span>
              </div>

              <p className="text-xs text-white/45 pt-2">
                Video rates are set by creators within the allowed range, so you’ll see the exact price before you book.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* No $ per credit */}
        <AccordionItem
          value="no-dollar-values"
          className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]"
        >
          <AccordionTrigger
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Why don’t you show dollar values per credit?
          </AccordionTrigger>
          <AccordionContent
            className="text-white/60 pb-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Credits are a platform token, and packs can include bonuses. Showing a fixed “per-credit” dollar value can
            be misleading, so we keep pricing simple: you’ll always see the credit cost before you confirm.
          </AccordionContent>
        </AccordionItem>

        {/* Refunds */}
        <AccordionItem
          value="refunds"
          className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]"
        >
          <AccordionTrigger
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Are credits refundable?
          </AccordionTrigger>
          <AccordionContent
            className="text-white/60 pb-4 space-y-2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <p>Credits are generally non-refundable once purchased or spent.</p>
            <p className="text-white/55 text-sm">
              If something breaks (duplicate charge, failed delivery, or a technical issue), contact support and we’ll
              review it.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}