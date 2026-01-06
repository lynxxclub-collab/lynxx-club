import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4", // Updated to rounded-xl
  {
    variants: {
      variant: {
        default: "bg-[#0f0f12] border-white/10 text-white", // Explicit Dark Theme colors
        destructive: "bg-rose-500/10 border-rose-500/20 text-rose-300 [&>svg]:text-rose-400", // Rose accent for errors
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div 
    ref={ref} 
    role="alert" 
    className={cn(alertVariants({ variant }), className)} 
    style={{ fontFamily: "'DM Sans', sans-serif" }}
    {...props} 
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 
      ref={ref} 
      className={cn("mb-1 font-semibold leading-none tracking-tight text-white", className)} {...props} 
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn("text-sm leading-relaxed text-white/60", className)} {...props} 
    />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };