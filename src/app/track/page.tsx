"use client";

import { useState } from "react";
import axios from "axios";
import { Search, Truck, CheckCircle, PackageOpen, Loader2 } from "lucide-react";

const STATUS_STEPS = ["pending", "confirmed", "shipped", "delivered"];

export default function TrackOrderPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<any[] | null>(null);
    const [error, setError] = useState("");

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError("");
        setOrders(null);

        try {
            const res = await axios.get(`/api/orders/track?query=${encodeURIComponent(query.trim())}`);
            setOrders(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const getProgressIndex = (status: string) => Math.max(0, STATUS_STEPS.indexOf(status));

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">

            <div className="max-w-3xl mx-auto space-y-8">
                {/* Search Box */}
                <div className="glass-card p-6 sm:p-10 text-center" style={{ transform: "none" }}>
                    <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <PackageSearchIcon className="w-8 h-8 text-violet-400" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">Track Your Order</h1>
                    <p className="text-gray-400 text-sm mb-8">Enter your Phone Number or Order ID (#) to check the delivery status.</p>

                    <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="e.g. 01712345678 or 15"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary rounded-xl px-6">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Track"}
                        </button>
                    </form>
                    {error && <div className="text-red-400 bg-red-500/10 p-3 rounded-xl mt-4 max-w-md mx-auto text-sm">{error}</div>}
                </div>

                {/* Results */}
                {orders && orders.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold text-gray-300">Found {orders.length} Order(s)</h2>
                        {orders.map((order, idx) => {
                            const currentStep = getProgressIndex(order.status);
                            return (
                                <div key={order._id} className="glass-card p-6 sm:p-8" style={{ transform: "none" }}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 pb-6 border-b border-white/5">
                                        <div>
                                            <h3 className="font-bold text-xl mb-1">Order #{order.orderNumber}</h3>
                                            <p className="text-sm text-gray-400">{new Date(order.date).toLocaleString()}</p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-sm text-gray-400 mb-1">Total Amount</p>
                                            <p className="font-bold text-lg text-violet-400">৳{order.totalAmount.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative mb-10 pt-4 px-2 sm:px-6">
                                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-800 -translate-y-1/2 rounded-full hidden sm:block"></div>
                                        <div className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 rounded-full transition-all duration-1000 hidden sm:block" style={{ width: `${(currentStep / 3) * 100}%` }}></div>

                                        <div className="flex flex-col sm:flex-row justify-between relative z-10 gap-6 sm:gap-0">
                                            {[
                                                { id: "pending", label: "Order Placed", icon: PackageOpen },
                                                { id: "confirmed", label: "Confirmed", icon: Search },
                                                { id: "shipped", label: "Shipped", icon: Truck },
                                                { id: "delivered", label: "Delivered", icon: CheckCircle }
                                            ].map((step, i) => {
                                                const isActive = i <= currentStep;
                                                const isCurrent = i === currentStep;
                                                return (
                                                    <div key={step.id} className="flex sm:flex-col items-center gap-4 sm:gap-2 relative group">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-500 shadow-lg ${isActive ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-gray-800 text-gray-500 border border-gray-700"}`}>
                                                            <step.icon className="w-5 h-5" />
                                                        </div>
                                                        <div className="sm:text-center sm:absolute sm:top-12 sm:w-24 sm:-ml-7">
                                                            <p className={`text-sm font-medium ${isActive ? "text-gray-200" : "text-gray-500"}`}>{step.label}</p>
                                                            {isCurrent && <p className="text-xs text-emerald-400 mt-0.5 animate-pulse hidden sm:block">Current Status</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="bg-white/5 rounded-xl p-4 mt-6">
                                        <p className="text-sm font-medium text-gray-400 mb-3">Items in this order:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {order.products.map((p: any, i: number) => (
                                                <span key={i} className="text-sm px-3 py-1.5 bg-black/20 rounded-lg text-gray-300">
                                                    {p.quantity} × {p.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {orders && orders.length === 0 && (
                    <div className="text-center p-8">
                        <p className="text-gray-400">Order not found.</p>
                    </div>
                )}
            </div>
        </div >
    );
}

function PackageSearchIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
            <circle cx="17" cy="18" r="3" />
            <path d="m21 22-1.5-1.5" />
        </svg>
    );
}
