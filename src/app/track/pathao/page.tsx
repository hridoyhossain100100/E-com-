"use client";

import { useState } from "react";
import axios from "axios";
import { Search, MapPin, Truck, CheckCircle, PackageOpen, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ThemeProvider } from "next-themes";
import Navbar from "@/app/components/Navbar";

// Define the steps and their corresponding Pathao statuses
const STATUS_STEPS = [
    { id: "pending", label: "Pending", icons: [PackageOpen], pathaoStatus: "Pending" },
    { id: "picked", label: "Picked Up", icons: [Truck], pathaoStatus: "Picked" },
    { id: "in_transit", label: "In Transit", icons: [MapPin], pathaoStatus: ["In Transit", "Out for Delivery"] },
    { id: "delivered", label: "Delivered", icons: [CheckCircle], pathaoStatus: "Delivered", success: true },
    { id: "returned", label: "Returned", icons: [AlertCircle], pathaoStatus: ["Returned", "Return in progress"], error: true },
    { id: "cancelled", label: "Cancelled", icons: [AlertCircle], pathaoStatus: "Cancelled", error: true }
];


export default function PathaoTrackingPage() {
    const [consignmentId, setConsignmentId] = useState("");
    const [loading, setLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [trackingData, setTrackingData] = useState<Record<string, any> | null>(null);
    const [error, setError] = useState("");

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!consignmentId.trim()) return;

        setLoading(true);
        setError("");
        setTrackingData(null);

        try {
            const res = await axios.get(`/api/track/pathao?consignment_id=${encodeURIComponent(consignmentId.trim())}`);
            
            if (res.data?.success && res.data?.data?.order_status) {
                 setTrackingData(res.data.data);
            } else {
                 throw new Error("Invalid response format from tracking API");
            }
        } catch (err: unknown) {
             const error = err as { response?: { data?: { message?: string } }; message?: string };
             setError(error.response?.data?.message || error.message || "Something went wrong while tracking your order.");
        } finally {
            setLoading(false);
        }
    };

    // Calculate current step based on the Pathao status
    const getProgressIndex = (currentStatus: string) => {
         const index = STATUS_STEPS.findIndex(step => {
              if (Array.isArray(step.pathaoStatus)) {
                  return step.pathaoStatus.includes(currentStatus);
              }
              return step.pathaoStatus === currentStatus;
         });
         
         // If status not found, default to pending (index 0)
         if (index === -1) {
              // Special cases for partial matches or unknown statuses
              const lowerStatus = currentStatus.toLowerCase();
              if (lowerStatus.includes('return') || lowerStatus.includes('cancel') || lowerStatus.includes('fail')) {
                   return STATUS_STEPS.findIndex(s => s.id === (lowerStatus.includes('return') ? 'returned' : 'cancelled'));
              }
              return 0;
         }
         return index;
    };

    return (
        <ThemeProvider attribute="class" defaultTheme="dark">
            <Navbar />
            <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 pt-24">
                <div className="max-w-3xl mx-auto space-y-8">
                    
                    {/* Header & Back button */}
                    <div className="flex items-center gap-4 mb-2">
                         <Link href="/track" className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                             <ArrowLeft className="w-5 h-5" />
                         </Link>
                         <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                             <Truck className="w-8 h-8 text-red-500" />
                             Pathao Courier Tracking
                         </h1>
                    </div>

                    {/* Search Box */}
                    <div className="glass-card p-6 sm:p-10 text-center" style={{ transform: "none" }}>
                        <p className="text-gray-400 text-sm mb-8">Enter your <strong>Consignment ID</strong> provided by Pathao to check the delivery status.</p>

                        <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={consignmentId}
                                    onChange={e => setConsignmentId(e.target.value)}
                                    placeholder="e.g. REDX12345678"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                    required
                                />
                            </div>
                            <button type="submit" disabled={loading} className="btn-primary bg-red-600 hover:bg-red-700 rounded-xl px-6">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Track"}
                            </button>
                        </form>
                        {error && <div className="text-red-400 bg-red-500/10 p-3 rounded-xl mt-4 max-w-md mx-auto text-sm flex items-center justify-center gap-2">
                            <AlertCircle className="w-4 h-4"/>
                            {error}
                        </div>}
                    </div>

                    {/* Results */}
                    {trackingData && (
                        <div className="glass-card p-6 sm:p-8" style={{ transform: "none" }}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-white/5 gap-4">
                                 <div>
                                      <p className="text-sm text-gray-400 mb-1">Consignment ID</p>
                                      <h3 className="font-bold text-xl">{trackingData.consignment_id}</h3>
                                 </div>
                                 <div className="text-left sm:text-right">
                                      <p className="text-sm text-gray-400 mb-1">Status</p>
                                      <span className="inline-block px-3 py-1 bg-red-500/10 text-red-400 font-medium rounded-lg">
                                           {trackingData.order_status}
                                      </span>
                                 </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                                 <div className="bg-white/5 rounded-xl p-4">
                                      <div className="flex items-start gap-3">
                                           <div className="p-2 bg-white/10 rounded-lg shrink-0">
                                               <PackageOpen className="w-5 h-5 text-gray-300"/>
                                           </div>
                                           <div>
                                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Recipient Name</p>
                                                <p className="text-sm font-medium">{trackingData.recipient_name || "N/A"}</p>
                                           </div>
                                      </div>
                                 </div>
                                 <div className="bg-white/5 rounded-xl p-4">
                                      <div className="flex items-start gap-3">
                                           <div className="p-2 bg-white/10 rounded-lg shrink-0">
                                               <MapPin className="w-5 h-5 text-gray-300"/>
                                           </div>
                                           <div>
                                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Delivery Address</p>
                                                <p className="text-sm font-medium line-clamp-2" title={trackingData.recipient_address}>{trackingData.recipient_address || "N/A"}</p>
                                                {trackingData.recipient_city && <p className="text-xs text-gray-500 mt-1">{trackingData.recipient_zone}, {trackingData.recipient_city}</p>}
                                           </div>
                                      </div>
                                 </div>
                            </div>

                            {/* Status Timeline */}
                            <div className="relative">
                                 <h4 className="text-base font-semibold mb-6">Tracking Timeline</h4>
                                 <div className="space-y-6">
                                     {/* This is a visual representation based on Pathao status strings. 
                                         In a real-world scenario with detailed logs from Pathao, this would iterate over those logs. 
                                         Here, we create a pseudo-timeline for visual effect based on current state. */}
                                     
                                     {(() => {
                                         const currentIndex = getProgressIndex(trackingData.order_status);
                                         const isErrorState = STATUS_STEPS[currentIndex]?.error;
                                         
                                         // Filter out error steps if not in error state, and vice versa
                                         const visibleSteps = STATUS_STEPS.filter((step, i) => {
                                             if (isErrorState) {
                                                 // Keep steps up to the error (assuming it happened after pickup)
                                                 return i <= 1 || step.id === STATUS_STEPS[currentIndex].id;
                                             } else {
                                                 return !step.error;
                                             }
                                         });

                                         const relativeCurrentIndex = visibleSteps.findIndex(s => s.id === STATUS_STEPS[currentIndex].id);

                                         return visibleSteps.map((step, i) => {
                                             const isActive = i <= relativeCurrentIndex;
                                             const isCurrent = i === relativeCurrentIndex;
                                             const Icon = step.icons[0];
                                             
                                             let dotColor = isActive ? "bg-red-500" : "bg-gray-700";
                                             const textColor = isActive ? "text-gray-200" : "text-gray-500";
                                             
                                             if (isCurrent && step.error) {
                                                 dotColor = "bg-orange-500";
                                             } else if (isCurrent && step.success) {
                                                 dotColor = "bg-emerald-500";
                                             }

                                             return (
                                                 <div key={step.id} className="flex gap-4 relative">
                                                     {/* Connecting line */}
                                                     {i < visibleSteps.length - 1 && (
                                                         <div className={`absolute left-[19px] top-10 bottom-[-24px] w-0.5 ${isActive && !isCurrent ? "bg-red-500/50" : "bg-gray-800"}`}></div>
                                                     )}
                                                     
                                                     {/* Timeline Dot/Icon */}
                                                     <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-300 ${dotColor} ${isActive ? 'text-white' : 'text-gray-400 border border-gray-600'}`}>
                                                        <Icon className="w-5 h-5" />
                                                     </div>
                                                     
                                                     {/* Content */}
                                                     <div className="pt-2 pb-2">
                                                         <p className={`text-sm font-semibold ${textColor}`}>{step.label}</p>
                                                         {isCurrent && (
                                                             <p className="text-xs text-gray-400 mt-1">
                                                                 Current Status: <span className="text-white">{trackingData.order_status}</span>
                                                             </p>
                                                         )}
                                                     </div>
                                                 </div>
                                             );
                                         });
                                     })()}
                                 </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </ThemeProvider>
    );
}
