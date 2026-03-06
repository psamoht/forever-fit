"use client"

import * as React from "react"
import { AArrowDown, AArrowUp, Type } from "lucide-react"

import { Button } from "@/components/ui/button"

export function FontSizeToggle() {
    // Read initial font size from html data attribute, default to 'normal'
    const [fontSize, setFontSize] = React.useState<"normal" | "large" | "xlarge">("normal")

    React.useEffect(() => {
        // Hydrate from localStorage or html root
        const savedSize = localStorage.getItem("app-font-size") as "normal" | "large" | "xlarge" | null
        if (savedSize) {
            handleSetSize(savedSize)
        } else {
            const htmlSize = document.documentElement.getAttribute("data-text-size") as "normal" | "large" | "xlarge" | null
            if (htmlSize) setFontSize(htmlSize)
        }
    }, [])

    const handleSetSize = (size: "normal" | "large" | "xlarge") => {
        setFontSize(size)
        document.documentElement.setAttribute("data-text-size", size)
        localStorage.setItem("app-font-size", size)
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetSize("normal")}
                    className={`flex-1 rounded-xl h-10 font-medium ${fontSize === 'normal' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-slate-500'}`}
                >
                    <Type size={16} className="mr-2" />
                    Normal
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetSize("large")}
                    className={`flex-1 rounded-xl h-10 font-medium text-lg ${fontSize === 'large' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-slate-500'}`}
                >
                    <AArrowUp size={20} className="mr-2" />
                    Groß
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetSize("xlarge")}
                    className={`flex-1 rounded-xl h-10 font-medium text-xl ${fontSize === 'xlarge' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-slate-500'}`}
                >
                    <AArrowUp size={24} className="mr-2" />
                    Max
                </Button>
            </div>
            {fontSize !== 'normal' && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center">
                    Textgröße wurde für bessere Lesbarkeit vergrößert.
                </p>
            )}
        </div>
    )
}
