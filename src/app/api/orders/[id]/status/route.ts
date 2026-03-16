import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid order ID' }, { status: 400 });
        }

        const body = await req.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json({ message: 'Status is required' }, { status: 400 });
        }

        const order = await Order.findByIdAndUpdate(id, { status }, { new: true });

        if (!order) {
            return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }

        return NextResponse.json(order);

    } catch (error: unknown) {
        return NextResponse.json(
            { message: 'Failed to update order status', error: (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}
