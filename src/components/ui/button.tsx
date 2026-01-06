import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f12] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20", // Primary Brand Color
        destructive: "bg-rose-600 text-white hover:bg-rose-700", // Destructive Brand Color
        outline: "border border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white", // Dark Outline
        secondary: "bg-white/10 text-white hover:bg-white/15", // Dark Secondary
        ghost: "text-white/70 hover:bg-white/5 hover:text-white", // Dark Ghost
        link: "text-rose-400 underline-offset-4 hover:text-rose-300", // Dark Link
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        style={{ fontFamily: "'DM Sans', sans-serif" }}
        {...props} 
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };