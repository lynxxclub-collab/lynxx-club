import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  Sparkles,
  MessageCircle,
  Image as ImageIcon,
  Video,
  Shield,
  Info,
  AlertCircle,
  ChevronDown,
  Gem,
  DollarSign
} from "lucide-react";

interface PricingFAQProps {
  showTitle?: boolean;
}

export default function PricingFAQ({ showTitle = true }: PricingFAQProps) {
  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="flex items-center gap-3 text-xl font-bold text-white">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <HelpCircle className="w-6 h-6 text-purple-400" />
          </div>
          <span>Pricing FAQ</span>
        </div>
      )}

      <Accordion type="single" collapsible className="w-full space-y-3">
        
        {/* Question 1: How credits work */}
        <AccordionItem 
          value="how-credits-work" 
          className="border border-white/10 rounded-xl bg-white/5 overflow-hidden"
        >
          <AccordionTrigger className="hover:no-underline px-5 py-4 text-left">
            <div className="flex items-center gap-4 text-white font-medium">
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
              How do credits work?
            </div>
            <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0 text-sm text-white/70 leading-relaxed">
            Credits are the platform's currency for interaction. They can be purchased in packs with bonuses. Once bought, they are used consistently across all features like messaging and video calls.
          </AccordionContent>
        </AccordionItem>

        {/* Question 2: Why messages cost */}
        <AccordionItem 
          value="why-messages-cost" 
          className="border border-white/10 rounded-xl bg-white/5 overflow-hidden"
        >
          <AccordionTrigger className="hover:no-underline px-5 py-4 text-left">
            <div className="flex items-center gap-4 text-white font-medium">
              <Shield className="w-5 h-5 text-teal-400 shrink-0" />
              Why do messages cost credits?
            </div>
            <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0 text-sm text-white/70 leading-relaxed">
            Paid messaging ensures interactions are intentional and helps prevent spam. This model supports creators fairly and keeps the community focused on genuine connections.
          </AccordionContent>
        </AccordionItem>

        {/* Question 3: Costs (Visual Cards) */}
        <AccordionItem 
          value="interaction-costs" 
          className="border border-white/10 rounded-xl bg-white/5 overflow-hidden"
        >
          <AccordionTrigger className="hover:no-underline px-5 py-4 text-left">
            <div className="flex items-center gap-4 text-white font-medium">
              <DollarSign className="w-5 h-5 text-amber-400 shrink-0" />
              How much does it cost to interact?
            </div>
            <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0">
            <div className="grid grid-cols-2 gap-3 mt-2">
              {/* Text Card */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                </div>
                <div className="font-bold text-white text-lg">5</div>
                <div className="text-xs text-white/50 uppercase tracking-wide">Text</div>
              </div>

              {/* Image Card */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="font-bold text-white text-lg">10</div>
                <div className="text-xs text-white/50 uppercase tracking-wide">Image</div>
              </div>

              {/* Video Card */}
              <div className="col-span-2 p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-purple-500/10 border border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                    <Video className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-white text-lg">200 - 900</div>
                    <div className="text-xs text-white/50 uppercase tracking-wide">Video Call</div>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-white/10 text-white/70 border-none text-[10px]">
                  Depends on Creator
                </Badge>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Question 4: No dollar values */}
        <AccordionItem 
          value="no-dollar-values" 
          className="border border-white/10 rounded-xl bg-white/5 overflow-hidden"
        >
          <AccordionTrigger className="hover:no-underline px-5 py-4 text-left">
            <div className="flex items-center gap-4 text-white font-medium">
              <Info className="w-5 h-5 text-white/50 shrink-0" />
              Why don't you show dollar values per credit?
            </div>
            <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0 text-sm text-white/70 leading-relaxed">
            Credits are a platform token. Since credit packs offer different bonuses, a single "dollar value" isn't accurate. The cost in credits is consistent, but the value depends on the pack you choose.
          </AccordionContent>
        </AccordionItem>

        {/* Question 5: Refunds */}
        <AccordionItem 
          value="refunds" 
          className="border border-white/10 rounded-xl bg-white/5 overflow-hidden"
        >
          <AccordionTrigger className="hover:no-underline px-5 py-4 text-left">
            <div className="flex items-center gap-4 text-white font-medium">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              Are credits refundable?
            </div>
            <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0 text-sm text-white/70 leading-relaxed">
            Credits are non-refundable once purchased or spent. If you experience a technical issue or billing error, please contact Support and we will review your case immediately.
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  );
}