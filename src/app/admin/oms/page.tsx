'use client';

import { useState, useEffect } from 'react';
import { sendOrderToPathao } from '@/app/actions/pathaoIntegration';
import type { DeliveryDetails } from '@/app/actions/pathaoIntegration';
import { Loader2, Send, Package, RefreshCw, X, Truck, CheckCircle2, Clock, PackageCheck, MapPin } from 'lucide-react';

// ─── Order Type ─────────────────────────────────────────────────────────────
interface OrderProduct {
    name: string;
    quantity: number;
    price: number;
}

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
    pathaoStatus?: string;
    products?: OrderProduct[];
    createdAt: string;
}

// ─── Timeline Steps ─────────────────────────────────────────────────────────
const TIMELINE_STEPS = [
    { key: 'Pickup_Pending', label: 'Accepted', icon: CheckCircle2 },
    { key: 'Picked', label: 'Picked', icon: PackageCheck },
    { key: 'In_Transit', label: 'In Transit', icon: Truck },
    { key: 'Out_For_Delivery', label: 'Out for Delivery', icon: MapPin },
    { key: 'Delivered', label: 'Delivered', icon: Package },
];

function getTimelineIndex(pathaoStatus?: string): number {
    if (!pathaoStatus) return 0;
    const idx = TIMELINE_STEPS.findIndex(s => s.key === pathaoStatus);
    return idx >= 0 ? idx : 0;
}

export default function OMSDashboard() {
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Modal state
    const [modalOrder, setModalOrder] = useState<OrderItem | null>(null);
    const [modalData, setModalData] = useState<DeliveryDetails>({
        itemWeight: 0.5,
        deliveryType: 48,
        specialInstruction: '',
        itemDescription: '',
        amountToCollect: 0,
        itemQuantity: 1,
    });

    // Timeline expand state
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

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

    // ─── Open Modal ─────────────────────────────────────────────────────────
    const openModal = (order: OrderItem) => {
        const totalQty = order.products?.reduce((s, p) => s + (p.quantity || 1), 0) || 1;
        const desc = order.products?.map(p => `${p.name} x${p.quantity}`).join(', ') || `Order #${order.orderNumber}`;
        const amount = order.paymentMethod === 'cod' ? order.totalAmount : 0;

        setModalData({
            itemWeight: 0.5,
            deliveryType: 48,
            specialInstruction: `Order #${order.orderNumber} | Payment: ${order.paymentMethod.toUpperCase()}`,
            itemDescription: desc,
            amountToCollect: amount,
            itemQuantity: totalQty,
        });
        setModalOrder(order);
    };

    // ─── Submit Modal ───────────────────────────────────────────────────────
    const handleModalSubmit = async () => {
        if (!modalOrder) return;
        setProcessingId(modalOrder._id);
        setModalOrder(null); // close modal

        try {
            const result = await sendOrderToPathao(modalOrder._id, modalData);
            if (result?.success) {
                showToast('success', `✅ Order sent to Pathao! CN: ${result.consignmentId}${result.deliveryFee ? ` | Fee: ৳${result.deliveryFee}` : ''}`);
                setOrders((prev) =>
                    prev.map((o) =>
                        o._id === modalOrder._id ? { ...o, status: 'confirmed', consignmentId: result.consignmentId, pathaoStatus: 'Pickup_Pending' } : o
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
                                    <tr key={order._id} className="group">
                                        {/* Row */}
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
                                            {/* Timeline toggle */}
                                            {order.consignmentId && (
                                                <button
                                                    onClick={() => setExpandedOrderId(expandedOrderId === order._id ? null : order._id)}
                                                    className="text-[11px] text-blue-500 hover:text-blue-700 mt-1 underline"
                                                >
                                                    {expandedOrderId === order._id ? 'Hide Timeline' : 'View Timeline'}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">৳{order.totalAmount}</td>
                                        <td className="px-6 py-4 text-right">
                                            {!order.consignmentId ? (
                                                <button
                                                    onClick={() => openModal(order)}
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

                {/* ── Expanded Timeline Section ──────────────────────────────── */}
                {expandedOrderId && (() => {
                    const order = orders.find(o => o._id === expandedOrderId);
                    if (!order || !order.consignmentId) return null;
                    const activeIdx = getTimelineIndex(order.pathaoStatus);

                    return (
                        <div className="border border-gray-200 rounded-xl shadow-sm bg-white p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <Truck className="w-5 h-5 text-gray-700" />
                                <h2 className="text-lg font-bold text-gray-900">
                                    Delivery Timeline — #{order.orderNumber}
                                </h2>
                                <span className="ml-auto text-xs text-gray-400 font-mono">
                                    CN: {order.consignmentId}
                                </span>
                            </div>

                            {/* Timeline */}
                            <div className="flex items-center justify-between relative">
                                {/* Background line */}
                                <div className="absolute top-6 left-8 right-8 h-0.5 bg-gray-200 z-0" />
                                <div
                                    className="absolute top-6 left-8 h-0.5 bg-red-500 z-10 transition-all duration-500"
                                    style={{ width: `${(activeIdx / (TIMELINE_STEPS.length - 1)) * (100 - 10)}%` }}
                                />

                                {TIMELINE_STEPS.map((step, idx) => {
                                    const Icon = step.icon;
                                    const isCompleted = idx <= activeIdx;
                                    const isCurrent = idx === activeIdx;
                                    return (
                                        <div key={step.key} className="flex flex-col items-center relative z-20 flex-1">
                                            <div
                                                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                                                    ${isCurrent ? 'border-red-500 bg-red-50 text-red-600 shadow-lg shadow-red-100' :
                                                        isCompleted ? 'border-green-500 bg-green-50 text-green-600' :
                                                            'border-gray-200 bg-white text-gray-300'}`}
                                            >
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className={`mt-2 text-xs font-semibold text-center ${isCurrent ? 'text-red-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                                                {step.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* ─── Send to Pathao Modal ────────────────────────────────────────── */}
            {modalOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/60">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Send to Pathao</h3>
                                <p className="text-xs text-gray-500">Order #{modalOrder.orderNumber} — {modalOrder.customerName}</p>
                            </div>
                            <button onClick={() => setModalOrder(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                            {/* Delivery Type */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delivery Type</label>
                                <select
                                    value={modalData.deliveryType}
                                    onChange={e => setModalData({ ...modalData, deliveryType: Number(e.target.value) })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                                >
                                    <option value={48}>Normal Delivery</option>
                                    <option value={12}>On-Demand Delivery</option>
                                </select>
                            </div>

                            {/* Weight + Quantity Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Total Weight (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={modalData.itemWeight}
                                        onChange={e => setModalData({ ...modalData, itemWeight: parseFloat(e.target.value) || 0.5 })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={modalData.itemQuantity}
                                        onChange={e => setModalData({ ...modalData, itemQuantity: parseInt(e.target.value) || 1 })}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                                    />
                                </div>
                            </div>

                            {/* Amount to Collect */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount to Collect (৳)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={modalData.amountToCollect}
                                    onChange={e => setModalData({ ...modalData, amountToCollect: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    {modalOrder.paymentMethod === 'cod' ? 'COD order — customer will pay on delivery' : 'Prepaid — already paid via ' + modalOrder.paymentMethod.toUpperCase()}
                                </p>
                            </div>

                            {/* Item Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item Description & Price</label>
                                <input
                                    type="text"
                                    value={modalData.itemDescription}
                                    onChange={e => setModalData({ ...modalData, itemDescription: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black outline-none"
                                />
                            </div>

                            {/* Special Instructions */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Special Instructions</label>
                                <textarea
                                    rows={3}
                                    value={modalData.specialInstruction}
                                    onChange={e => setModalData({ ...modalData, specialInstruction: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black outline-none resize-none"
                                    placeholder="e.g. Handle with care, fragile items..."
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50/60">
                            <button
                                onClick={() => setModalOrder(null)}
                                className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleModalSubmit}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow"
                            >
                                <Send className="w-4 h-4" />
                                Send to Pathao
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
