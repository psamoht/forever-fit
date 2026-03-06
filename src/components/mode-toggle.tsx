"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ModeToggle() {
    const { setTheme, theme } = useTheme()

    return (
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme("light")}
                className={`rounded-full h-8 w-8 ${theme === 'light' ? 'bg-white shadow-sm text-yellow-500' : 'text-slate-500'}`}
            >
                <Sun size={16} />
                <span className="sr-only">Light</span>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme("dark")}
                className={`rounded-full h-8 w-8 ${theme === 'dark' ? 'bg-slate-950 shadow-sm text-blue-400' : 'text-slate-500'}`}
            >
                <Moon size={16} />
                <span className="sr-only">Dark</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme("system")}
                className={`rounded-full h-8 px-3 text-xs font-medium ${theme === 'system' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-slate-500'}`}
            >
                Auto
            </Button>
        </div>
    )
}
