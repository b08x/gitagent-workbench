import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'amber' | 'green' | 'success' | 'maroon' | 'olive' }>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "border-primary bg-primary text-primary-foreground",
      secondary: "border-border bg-muted text-foreground",
      amber: "border-[#b45309] bg-[#b45309]/10 text-[#b45309]",
      maroon: "border-[#b45309] bg-[#b45309]/10 text-[#b45309]",
      green: "border-[#1f6a38] bg-[#1f6a38]/10 text-[#1f6a38]",
      success: "border-[#1f6a38] bg-[#1f6a38]/10 text-[#1f6a38]",
      olive: "border-[#1f6a38] bg-[#1f6a38]/10 text-[#1f6a38]",
      destructive: "border-[#b91c1c] bg-[#b91c1c]/10 text-[#b91c1c]",
      outline: "border-border bg-transparent text-foreground",
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
