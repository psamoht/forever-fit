"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ChatInterface } from "@/components/chat-interface";

export function CoachFAB() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    className="fixed bottom-6 right-6 h-14 px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 z-50 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                    aria-label="Frag Coach Theo"
                >
                    <MessageCircle size={24} />
                    <span className="font-bold text-lg">Coach Theo</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md h-[80vh] sm:h-[600px] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Frag Coach Theo</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                    <ChatInterface onComplete={() => setOpen(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
