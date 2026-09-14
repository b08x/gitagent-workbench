import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-sm font-sans font-medium whitespace-nowrap outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Neutral Primary: Solid fill of Carbon Ink with Paper text
        default: "bg-primary text-primary-foreground border-primary hover:bg-primary/90 active:translate-y-px",
        primary: "bg-[#171611] text-[#fcfaf4] border-[#171611] hover:bg-[#2c2a25]",
        // Accent: 10% Amber CTA for primary forward momentum
        amber: "bg-[#b45309] text-white border-[#b45309] hover:bg-[#92400e] active:translate-y-px",
        warm: "bg-[#b45309] text-white border-[#b45309] hover:bg-[#92400e] font-semibold active:translate-y-px",
        maroon: "bg-[#b45309] text-white border-[#b45309] hover:bg-[#92400e]",
        // Neutral Secondary: Transparent background with Ink border and paper hover
        secondary:
          "bg-transparent text-foreground border-border hover:bg-[#f3efe6]",
        outline:
          "border-border bg-transparent text-foreground hover:bg-[#f3efe6]",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-[#f3efe6]",
        // State Warning: Amber alert tone
        warning:
          "bg-[#fef3c7] text-[#78350f] border-[#b45309]/40 hover:bg-[#fde68a]",
        // State Destructive: STRICTLY reserved for Stop, Cancel, Delete, Wipe
        destructive:
          "bg-[#b91c1c] text-white border-[#b91c1c] hover:bg-[#991b1b] active:translate-y-px",
        danger:
          "bg-[#b91c1c] text-white border-[#b91c1c] hover:bg-[#991b1b] active:translate-y-px",
        link: "text-primary underline-offset-4 hover:underline border-none",
        ice: "bg-[#f3efe6] text-foreground border-border hover:bg-[#ede8dc] font-mono text-xs",
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
