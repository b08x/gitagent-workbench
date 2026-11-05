import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'amber' | 'green' | 'success' | 'maroon' | 'olive' }>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "border-primary bg-primary text-primary-foreground font-bold",
      secondary: "border-border bg-muted text-foreground font-bold",
      amber: "border-[#853b06]/50 bg-[#853b06]/10 text-[#78350f] dark:text-[#fde68a] dark:border-[#fde68a]/40 dark:bg-[#fde68a]/10 font-bold",
      maroon: "border-[#853b06]/50 bg-[#853b06]/10 text-[#78350f] dark:text-[#fde68a] dark:border-[#fde68a]/40 dark:bg-[#fde68a]/10 font-bold",
      green: "border-[#14532d]/50 bg-[#14532d]/10 text-[#14532d] dark:text-[#86efac] dark:border-[#86efac]/40 dark:bg-[#86efac]/10 font-bold",
      success: "border-[#14532d]/50 bg-[#14532d]/10 text-[#14532d] dark:text-[#86efac] dark:border-[#86efac]/40 dark:bg-[#86efac]/10 font-bold",
      olive: "border-[#14532d]/50 bg-[#14532d]/10 text-[#14532d] dark:text-[#86efac] dark:border-[#86efac]/40 dark:bg-[#86efac]/10 font-bold",
      destructive: "border-[#7f1d1d]/50 bg-[#7f1d1d]/10 text-[#7f1d1d] dark:text-[#fca5a5] dark:border-[#fca5a5]/40 dark:bg-[#fca5a5]/10 font-bold",
      outline: "border-border bg-transparent text-foreground font-bold",
    }
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-none border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase transition-none select-none",
          variants[variant] || variants.default,
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
