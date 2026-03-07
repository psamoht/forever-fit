"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useProfile } from "./profile-provider";

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { profile } = useProfile();

    // Track Page Views
    useEffect(() => {
        if (!profile?.id || !pathname) return;

        // Optionally ignore heatmap mode so we don't log the admin
        if (typeof window !== 'undefined' && window.location.search.includes('heatmap=true')) return;

        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: profile.id,
                type: 'page_view',
                description: `Viewed ${pathname}`,
                metadata: { path: pathname }
            }),
        }).catch(() => { });
    }, [pathname, profile?.id]);

    // Track Global Button Clicks
    useEffect(() => {
        if (!profile?.id) return;

        const handleClick = (e: MouseEvent) => {
            if (typeof window !== 'undefined' && window.location.search.includes('heatmap=true')) return;

            // Find the closest button or anchor tag
            const target = e.target as HTMLElement;
            const interactiveEl = target.closest('button, a, [role="button"]') as HTMLElement;

            if (interactiveEl) {
                // Try to get a meaningful identifier for the button
                let identifier = interactiveEl.getAttribute('data-telemetry-id') ||
                    interactiveEl.id ||
                    interactiveEl.getAttribute('aria-label') ||
                    interactiveEl.innerText?.trim()?.slice(0, 30);

                // Fallback to classname if nothing else
                if (!identifier && interactiveEl.className) {
                    identifier = `class: ${interactiveEl.className.slice(0, 30)}`;
                }

                if (identifier) {
                    // Standardize text to avoid massive duplicate logs for similar buttons
                    const cleanIdentifier = identifier.replace(/[\n\r]/g, ' ').trim();

                    fetch('/api/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: profile.id,
                            type: 'button_click',
                            description: `Clicked [${cleanIdentifier}] on ${window.location.pathname}`,
                            metadata: {
                                buttonText: cleanIdentifier,
                                path: window.location.pathname
                            }
                        }),
                    }).catch(() => { });
                }
            }
        };

        document.addEventListener('click', handleClick, { capture: true });
        return () => document.removeEventListener('click', handleClick, { capture: true });
    }, [profile?.id]);

    return <>{children}</>;
}
