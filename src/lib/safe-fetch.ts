/**
 * safe-fetch.ts
 * A global circuit-breaker utility for frontend API calls.
 * Designed specifically to prevent infinite loops from spamming the Google Cloud API
 * in the event of unforeseen React useEffect bugs or backend cascade failures.
 */

interface EndpointRecord {
    count: number;
    lastReset: number;
    isTripped: boolean;
}

// Store the metrics in memory. This resets on full page reload,
// but perfectly protects against fast loop spamming within a session SPA state.
const endpointMetrics: Record<string, EndpointRecord> = {};

// Configuration for the Circuit Breaker
const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
const MAX_REQUESTS_PER_WINDOW = 15; // If a single endpoint is hit >15 times in 10s, trip the breaker.
const TRIP_DURATION_MS = 60000; // 1 minute cool-down once tripped

/**
 * A drop-in replacement for the native browser `fetch` API.
 * Tracks outbound requests by URL and forcefully blocks them if a loop is detected.
 *
 * @param url The endpoint URL
 * @param options Native Fetch API options
 * @returns Promise<Response>
 * @throws Error if the circuit breaker is tripped
 */
export async function safeFetch(url: string | URL | Request, options?: RequestInit): Promise<Response> {
    const urlString = typeof url === 'string' ? url : (url instanceof URL ? url.toString() : url.url);
    
    // Only monitor local /api/ routes to avoid interfering with external resources
    if (!urlString.startsWith('/api/')) {
        return fetch(url, options);
    }

    const now = Date.now();
    let record = endpointMetrics[urlString];

    if (!record) {
        record = { count: 0, lastReset: now, isTripped: false };
        endpointMetrics[urlString] = record;
    }

    // 1. Check if we are currently in a tripped state (cool-down)
    if (record.isTripped) {
        if (now - record.lastReset > TRIP_DURATION_MS) {
            // Cool-down period over. Reset and allow.
            console.log(`[Circuit Breaker] Cool-down expired for ${urlString}. Restoring connection.`);
            record.isTripped = false;
            record.count = 0;
            record.lastReset = now;
        } else {
            // Still in cool-down. Block immediately.
            console.error(`[Circuit Breaker] BLOCKED: Request to ${urlString} blocked to prevent API loop. Wait ${Math.ceil((TRIP_DURATION_MS - (now - record.lastReset))/1000)}s.`);
            
            // Create a fake 429 Too Many Requests response to fail safely without touching the network
            return new Response(
                JSON.stringify({ error: "Client-side circuit breaker activated. Too many requests.", success: false }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }
    }

    // 2. Check window expiration
    if (now - record.lastReset > RATE_LIMIT_WINDOW_MS) {
        // Window expired, reset count
        record.count = 0;
        record.lastReset = now;
    }

    // 3. Increment request count
    record.count++;

    // 4. Trip logic
    if (record.count > MAX_REQUESTS_PER_WINDOW) {
        console.error(`[Circuit Breaker] TRIPPED! Endpoint ${urlString} requested ${record.count} times in ${RATE_LIMIT_WINDOW_MS}ms. Disconnecting for ${TRIP_DURATION_MS}ms.`);
        record.isTripped = true;
        record.lastReset = now; // Start the cool-down timer from now
        
        return new Response(
            JSON.stringify({ error: "Client-side circuit breaker activated. Too many requests.", success: false }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // 5. Normal fetch execution
    return fetch(url, options);
}
