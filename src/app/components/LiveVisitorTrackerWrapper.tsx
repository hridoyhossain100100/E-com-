"use client";

import dynamic from "next/dynamic";

const LiveVisitorTracker = dynamic(() => import("./LiveVisitorTracker"), { ssr: false });

export default function LiveVisitorTrackerWrapper() {
    return <LiveVisitorTracker />;
}
