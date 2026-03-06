import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    variant?: "default" | "secondary" | "outline" | "ghost" | "destructive"
    size?: "default" | "lg" | "icon" | "sm"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        // Ensure children are passed explicitly if we destructure them, but here we don't.
        // However, sticking to self-closing with spread props can be flaky with some parsers.
        // Let's destructure children to be safe.
        const { children, ...rest } = props;

        return (
            <Comp
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
                    {
                        // Default: Primary Green Gradient-ish feel
                        "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 hover:-translate-y-0.5": variant === "default",

                        // Destructive
                        "bg-red-500 text-white hover:bg-red-600 shadow-sm": variant === "destructive",

                        // Secondary: Warm Clay
                        "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",

                        // Outline: Classic
                        "border-2 border-primary/20 bg-transparent text-primary hover:bg-primary/5": variant === "outline",

                        // Ghost
                        "hover:bg-primary/5 text-primary-foreground": variant === "ghost",

                        // Sizes
                        "h-14 px-8 text-lg": size === "default",
                        "h-16 px-10 text-xl": size === "lg",
                        "h-14 w-14": size === "icon",
                        "h-9 px-4 text-sm": size === "sm",
                    },
                    className
                )}
                ref={ref}
                {...rest}
            >
                {children}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button }
