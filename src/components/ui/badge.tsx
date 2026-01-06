import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-white/20 bg-white/10 text-white hover:bg-white/15", // Neutral Dark Badge
        secondary: "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80", // Subtle Badge
        destructive: "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200", // Error Badge
        outline: "text-white/60 border-white/20 hover:bg-white/5 hover:text-white", // Outline Badge
        seeker: "border-purple-500/30 bg-purple-500/10 text-purple-300 backdrop-blur-sm", // Seeker Role
        earner: "border-amber-500/30 bg-amber-500/10 text-amber-300 backdrop-blur-sm", // Earner Role
        featured: "border-rose-500/30 bg-rose-500/10 text-rose-300 backdrop-blur-sm shadow-[0_0_10px_rgba(244,63,94,0.2)]", // Featured Badge
        success: "border-green-500/30 bg-green-500/10 text-green-300", // Success
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-300", // Warning
        pending: "border-amber-500/30 bg-amber-500/10 text-amber-300", // Pending
        processing: "border-blue-500/30 bg-blue-500/10 text-blue-300", // Processing
        completed: "border-green-500/30 bg-green-500/10 text-green-300", // Completed
        failed: "border-red-500/30 bg-red-500/10 text-red-300", // Failed
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div 
      className={cn(badgeVariants({ variant }), className)} 
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      {...props} 
    />
  );
}

export { Badge, badgeVariants };