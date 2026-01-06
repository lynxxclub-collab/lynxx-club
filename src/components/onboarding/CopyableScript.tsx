import { useState } from "react";
import { Check, Copy, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CopyableScriptProps {
  title: string;
  description: string;
  script: string;
}

export function CopyableScript({ title, description, script }: CopyableScriptProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <div 
      className="group relative"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div 
        onClick={handleCopy}
        className={cn(
          "flex flex-col gap-3 p-4 rounded-xl border",
          "bg-white/[0.03] hover:bg-white/[0.05]",
          "border-white/10 hover:border-rose-500/30",
          "transition-all duration-300 cursor-pointer active:scale-[0.99]",
          "shadow-lg shadow-black/20"
        )}
      >
        {/* Header Section */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold text-sm tracking-tight truncate">
              {title}
            </h4>
            <p className="text-white/40 text-xs mt-0.5 line-clamp-2 leading-relaxed">
              {description}
            </p>
          </div>
          
          {/* Copy Button */}
          <button
            className={cn(
              "p-2 rounded-lg transition-all duration-200 flex-shrink-0",
              copied 
                ? "bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
                : "bg-white/5 text-white/60 border border-white/5 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30"
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Code Display Area */}
        <div className={cn(
            "relative p-3 rounded-lg border border-white/5 bg-[#08080b]/50 backdrop-blur-sm",
            "overflow-hidden transition-colors group-hover:border-white/10"
        )}>
          {/* Subtle Code Icon Background */}
          <div className="absolute top-2 right-2 opacity-5 pointer-events-none">
            <Code className="w-16 h-16 text-white" />
          </div>

          <p className={cn(
            "relative z-10 text-xs sm:text-sm font-mono leading-relaxed break-all",
            "text-rose-200/90"
          )}>
            {script}
          </p>
        </div>
      </div>
    </div>
  );
}