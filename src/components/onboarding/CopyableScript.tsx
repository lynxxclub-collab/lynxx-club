import { useState } from "react";
import { Check, Copy } from "lucide-react";
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
    <div className="relative group">
      <div 
        className={cn(
          "p-4 rounded-xl bg-white/5 border border-white/10",
          "hover:border-amber-500/30 transition-all cursor-pointer"
        )}
        onClick={handleCopy}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h4 className="text-white font-medium text-sm">{title}</h4>
            <p className="text-white/40 text-xs">{description}</p>
          </div>
          <button
            className={cn(
              "p-2 rounded-lg transition-all",
              copied 
                ? "bg-green-500/20 text-green-400" 
                : "bg-white/5 text-white/60 hover:bg-amber-500/20 hover:text-amber-400"
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-white/80 text-sm font-mono bg-white/5 p-3 rounded-lg">
          {script}
        </p>
      </div>
    </div>
  );
}
