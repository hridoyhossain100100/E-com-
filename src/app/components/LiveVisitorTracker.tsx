"use client";

import { useEffect } from "react";
import axios from "axios";

export default function LiveVisitorTracker() {
    useEffect(() => {
        // Generate or retrieve a persistent sessionId for this browser
        let sessionId = localStorage.getItem("visitor_session_id");
        if (!sessionId) {
            sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem("visitor_session_id", sessionId);
        }

        const ping = async () => {
            try {
                // Ensure absolute path in production just in case
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                await axios.post(`${baseUrl}/api/visitors/ping?t=${Date.now()}`, { sessionId });
            } catch (err) {
                console.error("Live visitor ping failed:", err);
            }
        };

        // Initial ping
        ping();

        // Ping every 15 seconds to stay "alive" in MongoDB
        const interval = setInterval(ping, 15000);

        return () => clearInterval(interval);
    }, []);

    return null;
}
