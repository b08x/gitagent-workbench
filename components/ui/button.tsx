import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-sm font-sans font-medium whitespace-nowrap outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primary: Solid fill of Accent Maroon (#a03e3d) or Ink (#171611) with Paper text
        default: "bg-primary text-primary-foreground border-primary hover:bg-[#2c2a25] active:translate-y-px",
        primary: "bg-[#171611] text-[#fcf9f2] border-[#171611] hover:bg-[#2c2a25]",
        maroon: "bg-[#a03e3d] text-[#fcf9f2] border-[#a03e3d] hover:bg-[#741d1f]",
        warm: "bg-[#a03e3d] text-[#fcf9f2] border-[#a03e3d] hover:bg-[#741d1f] font-semibold",
        // Secondary: Transparent background with Ink border and text
        secondary:
          "bg-transparent text-foreground border-border hover:bg-[#f1eee7]",
        outline:
          "border-border bg-transparent text-foreground hover:bg-[#f1eee7]",
        ghost:
          "border-transparent bg-transparent text-foreground hover:bg-[#f1eee7]",
        destructive:
          "bg-[#ba1a1a] text-[#ffffff] border-[#ba1a1a] hover:bg-[#93000a]",
        link: "text-primary underline-offset-4 hover:underline border-none",
        ice: "bg-[#f1eee7] text-foreground border-border hover:bg-[#ebe8e1] font-mono text-xs",
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
