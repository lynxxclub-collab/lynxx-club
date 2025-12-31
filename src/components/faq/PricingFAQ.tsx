import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface PricingFAQProps {
  showTitle?: boolean;
}

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
        <AccordionItem
          value="how-credits-work"
          className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]"
        >
          <AccordionTrigger
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            How do credits work?
          </AccordionTrigger>
          <AccordionContent className="text-white/60 pb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Credits are used to interact on Lynxx Club. Different credit packs offer different amounts, but credits are
            always spent the same way across the platform.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="why-messages-cost"
          className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]"
        >
          <AccordionTrigger
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Why do messages cost credits?
          </AccordionTrigger>
          <AccordionContent className="text-white/60 pb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Paid messaging keeps conversations intentional, supports creators, and helps prevent spam. This is how Lynxx
            Club stays engaging and creator-driven.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="interaction-costs"
          className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]"
        >
          <AccordionTrigger
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            How much does it cost to interact?
          </AccordionTrigger>
          <AccordionContent className="text-white/60 pb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span>Text message</span>
                <span className="text-purple-400 font-medium">5 Credits</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span>Image unlock</span>
                <span className="text-purple-400 font-medium">10 Credits</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span>Audio or Video call</span>
                <span className="text-purple-400 font-medium">200–900 Credits</span>
              </div>
              <p className="text-white/40 text-sm pt-2">Audio calls are 70% of video rates. Camera always optional.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="audio-video-choice"
          className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]"
        >
          <AccordionTrigger
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Can I choose Audio or Video?
          </AccordionTrigger>
          <AccordionContent className="text-white/60 pb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Yes. Choose before each call. Audio is camera-free — perfect for comfort and privacy.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="no-dollar-values"
          className="border border-white/10 rounded-xl px-4 bg-white/[0.02] data-[state=open]:bg-white/[0.04]"
        >
          <AccordionTrigger
            className="text-left text-white/90 hover:text-white hover:no-underline py-4"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Why don't you show dollar values per credit?
          </AccordionTrigger>
          <AccordionContent className="text-white/60 pb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Credits are a platform token. Showing dollar values per interaction can be misleading because different
            packs offer different bonuses and pricing.
          </AccordionContent>
        </AccordionItem>

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
          <AccordionContent className="text-white/60 pb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Credits are non-refundable once purchased or spent. If you experience a technical issue, contact support and
            we'll review it.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
