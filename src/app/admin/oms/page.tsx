'use client';

import { useState, useEffect } from 'react';
import { sendOrderToPathao } from '@/app/actions/pathaoIntegration';
// Assuming lucide-react and standard shadcn UI are available in the project.
import { Loader2, Send } from 'lucide-react';
// We use basic HTML table or basic tailwind classes since we don't know exactly what Shadcn components the user has installed yet.
// We'll build a standard tailwind/shadcn-styled table.

// A simple toast simulation or using context if available. We will implement a custom toast for this file to ensure it works without external dependencies.
// In a real shadcn app, you'd use `import { useToast } from "@/components/ui/use-toast"`

export default function OMSDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            // In a real app we would have an API route to fetch orders. For this demo, let's simulate or fetch via a server action.
            // Assuming there's a `/api/admin/orders` or similar. If not, we'll just display a dummy row if fetch fails.
            const res = await fetch('/api/orders'); // User's standard order fetch endpoint
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || data);
            } else {
                // Fallback to initial dummy data for testing the UI if the fetch fails
                setOrders([
                    {
                        _id: 'dummy_123',
                        orderNumber: 1001,
                        customerName: 'Test Customer',
                        customerPhone: '01711111111',
                        totalAmount: 500,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    }
                ]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const showToast = (type: 'success' | 'error', message: string) => {
        setToastMessage({ type, message });
        setTimeout(() => setToastMessage(null), 5000);
    };

    const handleSendToPathao = async (orderId: string) => {
        setProcessingId(orderId);
        try {
            const result = await sendOrderToPathao(orderId);
            if (result?.success) {
                showToast('success', `Order sent to Pathao! Consignment: ${result.consignmentId}${result.deliveryFee ? ` | Delivery Fee: ৳${result.deliveryFee}` : ''}`);
                // Update local state to show 'shipped'
                setOrders(orders.map(o => o._id === orderId ? { ...o, status: 'shipped', consignmentId: result.consignmentId } : o));
            } else {
                showToast('error', `Failed to send to Pathao: ${result?.error}`);
            }
        } catch (error: any) {
            showToast('error', `An unexpected error occurred: ${error.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Order Management System (OMS)</h1>
                <button onClick={fetchOrders} className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
                    Refresh Orders
                </button>
            </div>

            {toastMessage && (
                <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg text-white font-medium transition-all z-50 ${toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toastMessage.message}
                </div>
            )}

            <div className="border rounded-md shadow-sm bg-white overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                        <tr>
                            <th className="px-6 py-4 font-medium">Order ID</th>
                            <th className="px-6 py-4 font-medium">Customer</th>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Amount</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                        <p>Loading orders...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No orders found.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium">#{order.orderNumber}</td>
                                    <td className="px-6 py-4">
                                        <div>{order.customerName}</div>
                                        <div className="text-xs text-gray-500">{order.customerPhone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${order.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                            order.status === 'shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    'bg-gray-50 text-gray-700 border-gray-200'
                                            }`}>
                                            {order.status}
                                        </span>
                                        {order.consignmentId && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Consignment: {order.consignmentId}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium">৳{order.totalAmount}</td>
                                    <td className="px-6 py-4 text-right">
                                        {(order.status === 'pending' || order.status === 'confirmed') ? (
                                            <button
                                                onClick={() => handleSendToPathao(order._id)}
                                                disabled={processingId === order._id}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                            <span className="text-gray-400 text-sm">Processed</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
