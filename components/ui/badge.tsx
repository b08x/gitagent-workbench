import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'amber' | 'green' | 'success' | 'maroon' | 'olive' }>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "border-primary bg-primary text-primary-foreground",
      secondary: "border-border bg-muted text-foreground",
      amber: "border-secondary/40 bg-secondary/10 text-secondary",
      maroon: "border-secondary/40 bg-secondary/10 text-secondary",
      green: "border-success/40 bg-success/10 text-success",
      success: "border-success/40 bg-success/10 text-success",
      olive: "border-success/40 bg-success/10 text-success",
      destructive: "border-destructive/40 bg-destructive/10 text-destructive",
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
