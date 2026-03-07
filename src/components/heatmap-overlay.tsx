"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface ClickData {
    identifier: string;
    count: number;
    lastClicked: Date;
}

export function HeatmapOverlay() {
    const [isActive, setIsActive] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [clicks, setClicks] = useState<ClickData[]>([]);

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const heatmapActive = params.get('heatmap') === 'true';
        const uId = params.get('userId');

        setIsActive(heatmapActive);
        if (uId) setUserId(uId);

        if (heatmapActive) {
            fetchClickData(uId);

            // Allow parent iframe to tell us to refresh data (e.g. when changing user filter)
            const handleMessage = (event: MessageEvent) => {
                if (event.data?.type === 'UPDATE_HEATMAP_FILTER') {
                    const newUserId = event.data.userId;
                    setUserId(newUserId);
                    fetchClickData(newUserId);
                }
            };
            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }
    }, []);

    const fetchClickData = async (filterUserId: string | null) => {
        let query = supabase
            .from('user_activities')
            .select('metadata, created_at')
            .eq('activity_type', 'button_click');

        if (filterUserId) {
            query = query.eq('user_id', filterUserId);
        }

        const { data, error } = await query;
        if (error || !data) {
            console.error("Heatmap fetch error:", error);
            return;
        }

        const clickMap = new Map<string, ClickData>();

        data.forEach(activity => {
            const btnText = activity.metadata?.buttonText;
            const path = activity.metadata?.path;

            // Only show clicks for the current page
            if (btnText && path === window.location.pathname) {
                const existing = clickMap.get(btnText);
                const dt = new Date(activity.created_at);
                if (existing) {
                    existing.count += 1;
                    if (dt > existing.lastClicked) existing.lastClicked = dt;
                } else {
                    clickMap.set(btnText, { identifier: btnText, count: 1, lastClicked: dt });
                }
            }
        });

        setClicks(Array.from(clickMap.values()));
    };

    // Render badges onto the screen
    useEffect(() => {
        if (!isActive || clicks.length === 0) return;

        // Give the DOM a moment to render the actual app elements before we overlay
        const timeoutId = setTimeout(() => {
            document.querySelectorAll('.heatmap-badge-overlay').forEach(e => e.remove());

            clicks.forEach(clickData => {
                // We need to find the DOM element that matches this click identifier.
                // It was based on data-telemetry-id, id, aria-label, or text content.
                let targetEl: HTMLElement | null = null;

                // First try exact text match (most common)
                const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
                for (const btn of buttons) {
                    const btnHtml = btn as HTMLElement;
                    if (
                        btnHtml.getAttribute('data-telemetry-id') === clickData.identifier ||
                        btnHtml.id === clickData.identifier ||
                        btnHtml.getAttribute('aria-label') === clickData.identifier ||
                        btnHtml.innerText?.trim()?.slice(0, 30).replace(/[\n\r]/g, ' ').trim() === clickData.identifier ||
                        (btnHtml.className && `class: ${btnHtml.className.slice(0, 30)}` === clickData.identifier)
                    ) {
                        targetEl = btnHtml;
                        break;
                    }
                }

                if (targetEl) {
                    // Create overlay badge
                    const rect = targetEl.getBoundingClientRect();
                    const badge = document.createElement('div');
                    badge.className = 'heatmap-badge-overlay absolute flex flex-col items-center pointer-events-none z-[9999]';

                    // Position slightly top-right of the element
                    badge.style.top = `${rect.top + window.scrollY - 10}px`;
                    badge.style.left = `${rect.right + window.scrollX - 20}px`;

                    badge.innerHTML = `
                        <div class="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg border-2 border-white animate-pulse">
                            ${clickData.count}
                        </div>
                        <div class="text-[9px] text-red-500 bg-white/90 px-1 rounded shadow-sm whitespace-nowrap mt-1 font-mono">
                            Zuletzt: ${formatDistanceToNow(clickData.lastClicked, { addSuffix: true, locale: de }).replace('vor ', '')}
                        </div>
                    `;
                    document.body.appendChild(badge);

                    // Add a subtle border to the target element
                    targetEl.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.4)';
                }
            });
        }, 1000); // 1s delay to wait for animations/rendering

        return () => clearTimeout(timeoutId);
    }, [isActive, clicks]);

    if (!isActive) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600/95 text-white text-xs px-5 py-2.5 rounded-full font-bold z-[99990] backdrop-blur-md shadow-2xl shadow-red-900/50 border border-white/20 flex items-center gap-3 whitespace-nowrap pointer-events-none transition-all duration-500 animate-in slide-in-from-bottom-8">
            <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white/50"></span>
            </span>
            <span className="tracking-widest uppercase">Admin Heatmap {userId ? `User ${userId.split('-')[0]}` : 'Alle'}</span>
        </div>
    );
}
