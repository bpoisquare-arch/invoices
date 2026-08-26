"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-white select-none", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "space-y-3",
        month_caption: "flex justify-center pt-1 relative items-center mb-1",
        caption_label: "text-xs font-bold text-slate-800 tracking-tight",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 border-slate-200 absolute left-1"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 border-slate-200 absolute right-1"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-slate-400 rounded-md w-8 font-semibold text-[10px] text-center uppercase tracking-wider",
        week: "flex w-full mt-1.5",
        day: cn(
          "relative p-0 text-center text-xs focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-slate-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-medium text-xs text-slate-700 aria-selected:opacity-100 hover:bg-[#009D9E]/10 hover:text-[#009D9E] rounded-lg transition-colors"
        ),
        selected:
          "bg-[#003D5C] text-white hover:bg-[#002b40] hover:text-white focus:bg-[#003D5C] focus:text-white font-bold rounded-lg shadow-2xs",
        today: "bg-slate-100 text-[#009D9E] font-bold",
        outside:
          "day-outside text-slate-300 aria-selected:bg-slate-100/50 aria-selected:text-slate-400",
        disabled: "text-slate-300 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
