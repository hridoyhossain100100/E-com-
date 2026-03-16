"use client";

import { useEffect, useRef } from "react";
import axios from "axios";

export default function LiveVisitorTracker() {
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        // Generate or retrieve a persistent sessionId for this browser
        let sessionId = localStorage.getItem("visitor_session_id");
        if (!sessionId) {
            sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem("visitor_session_id", sessionId);
        }

        let isMounted = true;

        const ping = async () => {
            if (!isMounted) return;

            // Cancel any previous in-flight request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                await axios.post(`/api/visitors/ping?t=${Date.now()}`, { sessionId }, {
                    signal: controller.signal,
                    timeout: 10000, // 10 second timeout
                });
            } catch (err: unknown) {
                // Silently ignore abort errors (expected on unmount/navigation)
                if (axios.isCancel(err) || (err instanceof Error && (err.name === 'AbortError' || ('code' in err && (err as Record<string, unknown>).code === 'ERR_CANCELED')))) {
                    return;
                }
                // Only log unexpected errors
                if (isMounted) {
                    console.warn("Live visitor ping failed:", err instanceof Error ? err.message : err);
                }
            }
        };

        // Initial ping
        ping();

        // Ping every 15 seconds to stay "alive" in MongoDB
        const interval = setInterval(ping, 15000);

        return () => {
            isMounted = false;
            clearInterval(interval);
            // Abort any in-flight request on cleanup
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return null;
}
