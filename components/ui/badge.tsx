import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'maroon' | 'olive' }>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "border-primary bg-primary text-primary-foreground",
      secondary: "border-border bg-muted text-foreground",
      destructive: "border-[#ba1a1a] bg-[#ba1a1a] text-white",
      outline: "border-border bg-transparent text-foreground",
      maroon: "border-[#a03e3d] bg-[#a03e3d] text-white",
      olive: "border-[#1f2f00] bg-[#1f2f00] text-white",
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
