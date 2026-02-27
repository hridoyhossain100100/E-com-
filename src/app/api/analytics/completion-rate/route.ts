import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET() {
    try {
        const { verifyAdmin, unauthorizedResponse } = await import('@/lib/auth');
        const isAdmin = await verifyAdmin();
        if (!isAdmin) return unauthorizedResponse();

        await connectToDatabase();

        const [total, delivered, cancelled] = await Promise.all([
            Order.countDocuments(),
            Order.countDocuments({ status: 'delivered' }),
            Order.countDocuments({ status: 'cancelled' })
        ]);

        return NextResponse.json([
            { name: 'Completed', value: delivered },
            { name: 'Cancelled', value: cancelled },
            { name: 'In Progress', value: total - delivered - cancelled }
        ]);

    } catch (error: any) {
        return NextResponse.json(
            { message: 'Failed to fetch completion rate', error: error?.message },
            { status: 500 }
        );
    }
}
