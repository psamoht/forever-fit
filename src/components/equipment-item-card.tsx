"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Check, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EquipmentItemCardProps {
    id: string;
    name: string;
    iconUrl: string;
    isActive: boolean;
    isCustom: boolean;
    onToggle: () => void;
    onDelete: () => void;
}

export function EquipmentItemCard({
    id,
    name,
    iconUrl,
    isActive,
    isCustom,
    onToggle,
    onDelete
}: EquipmentItemCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);

    const handleTouchStart = () => {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            setShowMenu(true);
        }, 600); // 600ms = long press
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const handleClick = () => {
        if (isLongPress.current) return;
        onToggle();
    };

    // Right click for desktop testing
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setShowMenu(true);
    };

    return (
        <>
            <Card
                className={cn(
                    "p-4 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer relative overflow-hidden group select-none touch-none",
                    isActive
                        ? "border-2 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/20 shadow-md scale-[1.02]"
                        : "border-border bg-card dark:bg-muted/50 opacity-60 grayscale hover:opacity-80 hover:grayscale-0"
                )}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
            >
                {isActive && (
                    <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1 text-white animate-in zoom-in shadow-sm">
                        <Check size={14} strokeWidth={3} />
                    </div>
                )}

                <div className="h-20 w-20 flex items-center justify-center p-2 group-hover:drop-shadow-md transition-all">
                    <img src={iconUrl} alt={name} className="object-contain w-full h-full" />
                </div>

                <div>
                    <h3 className={cn("font-bold leading-tight text-sm text-center", isActive ? "text-foreground" : "text-muted-foreground")}>
                        {name}
                    </h3>
                </div>
            </Card>

            <Dialog open={showMenu} onOpenChange={setShowMenu}>
                <DialogContent className="max-w-xs rounded-2xl bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>{name} verwalten</DialogTitle>
                        <DialogDescription>
                            Möchtest du dieses Gerät entfernen?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 mt-4">
                        <Button variant="destructive" onClick={() => { onDelete(); setShowMenu(false); }} className="w-full gap-2 justify-start">
                            <Trash2 size={18} /> Löschen
                        </Button>
                        <Button variant="ghost" onClick={() => setShowMenu(false)}>Abbrechen</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
