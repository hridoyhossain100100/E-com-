import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();
        const { orderId } = await params;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return NextResponse.json({ message: 'Invalid order ID' }, { status: 400 });
        }

        const order = await Order.findById(orderId).lean();
        if (!order) {
            return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }

        // Just return the raw JSON to match existing Express behavior, 
        // the frontend is responsible for rendering this into a receipt
        return NextResponse.json({
            ...order,
            date: order.createdAt.toLocaleDateString()
        });

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Failed to generate invoice', error: error?.message },
            { status: 500 }
        );
    }
}
