"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";
import { Send, User, Bot, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface Message {
    role: "user" | "model";
    text: string;
}

interface ChatInterfaceProps {
    initialMessage?: string;
    onComplete?: (summary: any) => void;
}

export function ChatInterface({ initialMessage, onComplete }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>(
        initialMessage ? [{ role: "model", text: initialMessage }] : []
    );
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!initialMessage && messages.length === 0) {
            const fetchName = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
                    const name = profile?.display_name || user.user_metadata?.first_name || "Sportler";
                    setMessages([{ role: "model", text: `Hallo ${name}! Wie kann ich dir heute helfen?` }]);
                } else {
                    setMessages([{ role: "model", text: `Hallo! Wie kann ich dir heute helfen?` }]);
                }
            };
            fetchName();
        }
    }, [initialMessage, messages.length]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    history: messages,
                    message: userMsg
                }),
            });

            const data = await response.json();

            if (data.text) {
                setMessages((prev) => [...prev, { role: "model", text: data.text }]);
            }

            if (data.profileData) {
                // Dispatch global event for detached listeners (e.g. Plan Page listening to FAB)
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('coach:action', { detail: data.profileData }));
                }

                if (onComplete) {
                    onComplete(data.profileData);
                }
            } else if (data.assessmentComplete && onComplete) {
                // Fallback for older API behavior if profileData wasn't sent but flag was
                onComplete(data.profileData);
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [...prev, { role: "model", text: "Entschuldigung, ich habe dich nicht ganz verstanden. Könntest du das wiederholen?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background relative">

            {/* Header */}
            <div className="bg-card p-3 border-b border-border flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-full flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                        <User size={22} className="opacity-90 mix-blend-screen" />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground text-base">Coach Theo</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Online</p>
                        </div>
                    </div>
                </div>
                <div className="p-2 bg-secondary rounded-full text-muted-foreground">
                    <Sparkles size={16} />
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "flex w-full animate-in slide-in-from-bottom-2 duration-300",
                            msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                    >
                        <div
                            className={cn(
                                "max-w-[85%] p-3 text-sm relative leading-relaxed",
                                msg.role === "user"
                                    ? "bg-emerald-600 text-white rounded-2xl rounded-tr-sm shadow-sm"
                                    : "bg-card border border-border text-foreground rounded-2xl rounded-tl-sm shadow-sm"
                            )}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start w-full animate-in fade-in">
                        <div className="bg-card border border-border rounded-2xl rounded-tl-sm p-3 shadow-sm flex gap-1 items-center">
                            <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce"></span>
                            <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce delay-100"></span>
                            <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-card border-t border-border">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                    }}
                >
                    <div className="flex gap-2 items-center">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Schreib eine Nachricht..."
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            disabled={isLoading}
                            className="flex-1 h-12 text-sm rounded-xl border-border bg-background text-foreground placeholder:text-muted-foreground focus:bg-background transition-all shadow-inner"
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            className="h-12 w-12 shrink-0 rounded-xl shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            <ArrowRight className="h-6 w-6 text-white" />
                            <span className="sr-only">Senden</span>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
