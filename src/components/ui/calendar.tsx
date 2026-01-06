import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-3 pointer-events-auto bg-[#0f0f12] border border-white/10 rounded-xl shadow-lg",
        className
      )}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-bold text-white tracking-tight",
        nav: "space-x-1 flex items-center w-full justify-between px-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 border border-transparent text-white/50 hover:text-white hover:bg-white/5"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 border border-transparent text-white/50 hover:text-white hover:bg-white/5"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-white/40 rounded-md w-9 font-medium text-[0.8rem] uppercase tracking-wide",
        week: "flex w-full mt-2",
        day: cn(
          "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].range_end)]:rounded-r-md [&:has([aria-selected].outside)]:bg-white/[0.02] [&:has([aria-selected])]:bg-rose-500 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-white/70 hover:text-white hover:bg-white/[0.03]"
        ),
        range_end: "range_end",
        selected: "bg-rose-500 text-white hover:bg-rose-600 focus:bg-rose-600", // Rose accent for selected
        today: "border border-rose-500/50 text-rose-400 font-bold", // Highlighted today
        outside: "outside text-white/20 opacity-50 aria-selected:bg-white/[0.02] aria-selected:text-white/40 aria-selected:opacity-30",
        disabled: "text-white/20 opacity-50 pointer-events-none",
        range_middle: "aria-selected:bg-rose-500/10 aria-selected:text-white",
        hidden: "invisible text-transparent",
        ...classNames,
      }}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className="h-4 w-4" {...chevronProps} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };