import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-[2rem] border border-border/50 bg-card/80 text-card-foreground shadow-xl shadow-black/5 dark:shadow-black/20 backdrop-blur-sm",
            className
        )}
        {...props}
    />
))
Card.displayName = "Card"

export { Card }
