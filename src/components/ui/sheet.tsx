// src/components/ui/sheet.tsx
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Dark-only sheet (Radix Dialog under the hood)
 * - Explicit children typing (fixes TS error)
 * - Better dark styling + borders + blur
 * - Side variants + size variants
 * - Safer focus rings + close button UX
 */

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50",
      "bg-black/70 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

const sheetVariants = cva(
  cn(
    "fixed z-50",
    "flex flex-col",
    "border border-white/10",
    "bg-[#0a0a0f] text-white",
    "shadow-2xl shadow-black/50",
    "outline-none",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:duration-300 data-[state=open]:duration-500",
    // smoother on mobile
    "will-change-transform",
  ),
  {
    variants: {
      side: {
        right: cn(
          "inset-y-0 right-0 h-full",
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        ),
        left: cn(
          "inset-y-0 left-0 h-full",
          "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        ),
        top: cn(
          "inset-x-0 top-0 w-full",
          "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        ),
        bottom: cn(
          "inset-x-0 bottom-0 w-full",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        ),
      },
      size: {
        sm: "w-[88vw] sm:w-[420px]",
        md: "w-[92vw] sm:w-[520px]",
        lg: "w-[96vw] sm:w-[640px]",
        xl: "w-[96vw] sm:w-[760px]",
      },
      // for top/bottom
      height: {
        auto: "",
        sm: "max-h-[55vh]",
        md: "max-h-[70vh]",
        lg: "max-h-[85vh]",
        full: "h-full max-h-none",
      },
    },
    defaultVariants: {
      side: "right",
      size: "md",
      height: "full",
    },
  },
);

type SheetContentProps = React.PropsWithChildren<
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> &
    VariantProps<typeof sheetVariants> & {
      /** show/hide default close button */
      showClose?: boolean;
    }
>;

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", size = "md", height = "full", showClose = true, className, children, ...props }, ref) => {
    const isVertical = side === "top" || side === "bottom";

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={ref}
          className={cn(
            sheetVariants({ side, size, height }),
            isVertical ? "rounded-t-2xl border-x-0" : "rounded-l-2xl",
            // nicer padding defaults; allow override in className
            "p-0",
            className,
          )}
          {...props}
        >
          {/* Header area padding helper */}
          <div className="relative flex-1 overflow-hidden">
            {showClose && (
              <SheetPrimitive.Close
                aria-label="Close"
                className={cn(
                  "absolute right-4 top-4 z-10",
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                  "bg-white/5 border border-white/10 text-white/70",
                  "hover:bg-white/10 hover:text-white",
                  "focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]",
                  "transition",
                )}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </SheetPrimitive.Close>
            )}

            {/* Content wrapper: you control padding inside your sheet screens */}
            {children}
          </div>
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "px-6 pt-6 pb-4",
      "border-b border-white/10",
      "bg-gradient-to-b from-white/[0.03] to-transparent",
      "flex flex-col gap-2",
      className,
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "px-6 py-4",
      "border-t border-white/10",
      "bg-gradient-to-t from-white/[0.03] to-transparent",
      "flex flex-col-reverse sm:flex-row sm:justify-end gap-2",
      className,
    )}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-white", className)} {...props} />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-white/60", className)} {...props} />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};