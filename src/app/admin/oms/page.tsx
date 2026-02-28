'use client';

import { useState, useEffect } from 'react';
import { sendOrderToPathao } from '@/app/actions/pathaoIntegration';
import { Loader2, Send, Package, RefreshCw } from 'lucide-react';

// ─── Order Type ─────────────────────────────────────────────────────────────
interface OrderItem {
    _id: string;
    orderNumber: number;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    totalAmount: number;
    paymentMethod: string;
    status: string;
    consignmentId?: string;
    createdAt: string;
}

export default function OMSDashboard() {
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    // ─── Fetch Orders ───────────────────────────────────────────────────────
    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || data);
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Toast Helper ───────────────────────────────────────────────────────
    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 6000);
    };

    // ─── Send to Pathao Handler ─────────────────────────────────────────────
    const handleSendToPathao = async (orderId: string) => {
        setProcessingId(orderId);
        try {
            const result = await sendOrderToPathao(orderId);
            if (result?.success) {
                showToast('success', `✅ Order sent to Pathao! Consignment: ${result.consignmentId}${result.deliveryFee ? ` | Fee: ৳${result.deliveryFee}` : ''}`);
                setOrders((prev) =>
                    prev.map((o) =>
                        o._id === orderId ? { ...o, status: 'confirmed', consignmentId: result.consignmentId } : o
                    )
                );
            } else {
                showToast('error', `❌ Failed: ${result?.error}`);
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            showToast('error', `❌ Unexpected error: ${msg}`);
        } finally {
            setProcessingId(null);
        }
    };

    // ─── Status Badge Colors ───────────────────────────────────────────────
    const statusStyles: Record<string, string> = {
        pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        confirmed: 'bg-purple-50 text-purple-700 border-purple-200',
        shipped: 'bg-blue-50 text-blue-700 border-blue-200',
        delivered: 'bg-green-50 text-green-700 border-green-200',
    };

    // ─── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-black rounded-lg">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Order Management</h1>
                            <p className="text-sm text-gray-500">Send orders to Pathao Courier</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchOrders}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-gray-700"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* ── Toast Notification ──────────────────────────────────────── */}
                {toast && (
                    <div
                        className={`fixed top-6 right-6 z-50 max-w-md p-4 rounded-lg shadow-xl text-sm font-medium text-white transition-all animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                            }`}
                    >
                        {toast.message}
                    </div>
                )}

                {/* ── Data Table ──────────────────────────────────────────────── */}
                <div className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/80 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-600">Order</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Customer</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Payment</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Amount</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                            <p className="text-sm">Loading orders...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                                        <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                        <p>No orders found.</p>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order._id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-900">#{order.orderNumber}</span>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {new Date(order.createdAt).toLocaleDateString('en-BD', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{order.customerName}</div>
                                            <div className="text-xs text-gray-400">{order.customerPhone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="uppercase text-xs font-semibold tracking-wider text-gray-500">
                                                {order.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${statusStyles[order.status] || 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}
                                            >
                                                {order.status}
                                            </span>
                                            {order.consignmentId && (
                                                <div className="text-[11px] text-gray-400 mt-1 font-mono">
                                                    CN: {order.consignmentId}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">৳{order.totalAmount}</td>
                                        <td className="px-6 py-4 text-right">
                                            {!order.consignmentId ? (
                                                <button
                                                    onClick={() => handleSendToPathao(order._id)}
                                                    disabled={processingId === order._id}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                                                >
                                                    {processingId === order._id ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Sending...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="w-4 h-4" />
                                                            Send to Pathao
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <a
                                                    href={`https://merchant.pathao.com/tracking?consignment_id=${order.consignmentId}&phone=${order.customerPhone}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium border border-gray-200 rounded-lg transition-all shadow-sm"
                                                >
                                                    Track Order
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
