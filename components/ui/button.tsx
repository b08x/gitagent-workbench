import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-sm font-sans font-medium whitespace-nowrap outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Neutral Primary: Solid fill of Carbon Ink with Paper text (Contrast: 17.5:1)
        default:
          "bg-primary text-primary-foreground text-[#fcfaf4] dark:text-[#151619] border-primary hover:bg-primary/90 font-semibold active:translate-y-px",
        primary:
          "bg-primary text-primary-foreground text-[#fcfaf4] dark:text-[#151619] border-primary hover:bg-primary/90 font-semibold active:translate-y-px",
        // Accent: Warm Amber CTA calibrated for WCAG AAA (Contrast: 8.04:1 vs white text)
        amber:
          "bg-[#853b06] text-white border-[#853b06] hover:bg-[#6e3004] font-semibold active:translate-y-px shadow-xs",
        warm:
          "bg-[#853b06] text-white border-[#853b06] hover:bg-[#6e3004] font-semibold active:translate-y-px shadow-xs",
        maroon:
          "bg-[#853b06] text-white border-[#853b06] hover:bg-[#6e3004] font-semibold shadow-xs",
        // Neutral Secondary & Outline: High contrast ink-on-canvas (Contrast: 17.5:1)
        secondary:
          "bg-transparent text-foreground border-border hover:bg-[#f3efe6] dark:hover:bg-[#252830] font-semibold",
        outline:
          "border-border bg-transparent text-foreground hover:bg-[#f3efe6] dark:hover:bg-[#252830] font-semibold",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-[#f3efe6] dark:hover:bg-[#252830] font-semibold",
        // State Warning: High contrast amber tone (Contrast: 8.78:1 in light, 14.58:1 in dark)
        warning:
          "bg-[#fef3c7] text-[#78350f] border-[#b45309]/50 hover:bg-[#fde68a] dark:bg-[#451a03] dark:text-[#fef3c7] dark:border-[#f59e0b]/50 dark:hover:bg-[#5a2204] font-semibold",
        // State Destructive: Deep carmine red calibrated for WCAG AAA (Contrast: 8.28:1 vs white text)
        destructive:
          "bg-[#991b1b] text-white border-[#991b1b] hover:bg-[#7f1d1d] font-semibold active:translate-y-px shadow-xs",
        danger:
          "bg-[#991b1b] text-white border-[#991b1b] hover:bg-[#7f1d1d] font-semibold active:translate-y-px shadow-xs",
        link:
          "text-primary underline-offset-4 hover:underline border-none font-semibold",
        ice:
          "bg-[#f3efe6] text-foreground border-border hover:bg-[#ede8dc] dark:bg-[#252830] dark:text-foreground dark:hover:bg-[#2d313b] font-mono text-xs font-semibold",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-2 px-4 text-sm",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
